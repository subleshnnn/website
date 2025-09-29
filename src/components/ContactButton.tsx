'use client'

import { useUser } from '@clerk/nextjs'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface ContactButtonProps {
  listingId: string
  listingOwnerId: string
  listingTitle: string
}

export default function ContactButton({ listingId, listingOwnerId, listingTitle }: ContactButtonProps) {
  const { user } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Don't show contact button if user is viewing their own listing
  if (!user || user.id === listingOwnerId) {
    return null
  }

  async function handleContact() {
    if (!user) {
      router.push('/sign-in')
      return
    }

    setLoading(true)

    try {
      // Check if conversation already exists
      const { data: existingConversation, error: fetchError } = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listingId)
        .eq('inquirer_id', user.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking existing conversation:', fetchError)
        alert('Something went wrong. Please try again.')
        return
      }

      if (existingConversation) {
        // Conversation exists, redirect to it
        router.push(`/inbox/${existingConversation.id}`)
        return
      }

      // Create new conversation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          listing_id: listingId,
          listing_owner_id: listingOwnerId,
          inquirer_id: user.id,
          last_message_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (createError) {
        console.error('Error creating conversation:', createError)
        console.error('Error details:', JSON.stringify(createError, null, 2))
        console.error('Error message:', createError.message)
        console.error('Error code:', createError.code)
        alert(`Error creating conversation: ${createError.message || 'Please try again.'}`)
        return
      }

      // Send initial message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: newConversation.id,
          sender_id: user.id,
          content: `Hi! I'm interested in your listing: ${listingTitle}`
        })

      if (messageError) {
        console.error('Error sending initial message:', messageError)
        // Still redirect even if message fails
      }

      // Redirect to the new conversation
      router.push(`/inbox/${newConversation.id}`)

    } catch (error) {
      console.error('Network error:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleContact}
      disabled={loading}
      className="bg-black text-white px-6 py-3 rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50 text-lg"
    >
      {loading ? 'Loading...' : 'Contact Host'}
    </button>
  )
}