'use client'

import { useUser } from '@clerk/nextjs'

// Force dynamic rendering for pages that use Clerk
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Conversation {
  id: string
  listing_id: string
  listing_owner_id: string
  inquirer_id: string
  last_message_at: string | null
  created_at: string
  listings: {
    title: string
    location: string
  }
  messages: Array<{
    content: string
    created_at: string
    sender_id: string
  }>
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default function InboxPage() {
  const { user, isLoaded } = useUser()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchConversations = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          listing_id,
          listing_owner_id,
          inquirer_id,
          last_message_at,
          created_at,
          listings!inner (
            title,
            location
          ),
          messages (
            content,
            created_at,
            sender_id
          )
        `)
        .or(`listing_owner_id.eq.${user.id},inquirer_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching conversations:', error)
        return
      }

      setConversations((data as unknown as Conversation[]) || [])
    } catch (error) {
      console.error('Network error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (isLoaded && user) {
      fetchConversations()
    }
  }, [isLoaded, user, fetchConversations])

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <div className="text-center">Please sign in to view your inbox.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <main className="px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <h1 className="text-2xl text-black mb-8 text-center">Inbox</h1>

        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-500 mb-4">No conversations yet</div>
            <p className="text-gray-400">Messages will appear here when someone contacts you about a listing.</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {conversations.map((conversation) => {
              const lastMessage = conversation.messages?.[conversation.messages.length - 1]
              const isOwner = conversation.listing_owner_id === user.id

              return (
                <Link
                  key={conversation.id}
                  href={`/inbox/${conversation.id}`}
                  className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg text-black font-medium">
                        {conversation.listings.title}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {conversation.listings.location}
                      </p>
                    </div>
                    <div className="text-sm text-gray-400">
                      {formatDate(lastMessage?.created_at || conversation.created_at)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {isOwner ? 'Inquiry about your listing' : 'Your inquiry'}
                    </div>
                    {lastMessage && (
                      <div className="text-sm text-gray-600 max-w-xs truncate">
                        {lastMessage.content}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}