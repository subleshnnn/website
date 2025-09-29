'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
}

interface ConversationData {
  id: string
  listing_id: string
  listing_owner_id: string
  inquirer_id: string
  listings: {
    title: string
    location: string
  }
  messages: Message[]
}

function formatTime(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function ConversationPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const params = useParams()
  const conversationId = params.id as string

  const [conversation, setConversation] = useState<ConversationData | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (isLoaded && user && conversationId) {
      fetchConversation()
    }
  }, [isLoaded, user, conversationId])

  async function fetchConversation() {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          listing_id,
          listing_owner_id,
          inquirer_id,
          listings!inner (
            title,
            location
          ),
          messages (
            id,
            sender_id,
            content,
            created_at
          )
        `)
        .eq('id', conversationId)
        .single()

      if (error) {
        console.error('Error fetching conversation:', error)
        router.push('/inbox')
        return
      }

      // Check if user is part of this conversation
      if (data.listing_owner_id !== user.id && data.inquirer_id !== user.id) {
        router.push('/inbox')
        return
      }

      // Sort messages by creation time
      data.messages.sort((a: Message, b: Message) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

      setConversation(data)
    } catch (error) {
      console.error('Network error fetching conversation:', error)
      router.push('/inbox')
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage() {
    if (!user || !conversation || !newMessage.trim()) return

    setSending(true)

    try {
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: newMessage.trim()
        })

      if (messageError) {
        console.error('Error sending message:', messageError)
        alert('Failed to send message. Please try again.')
        return
      }

      // Update conversation's last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)

      // Clear the message input
      setNewMessage('')

      // Refresh conversation to show the new message
      fetchConversation()
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

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

  if (!user || !conversation) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <div className="text-center">Conversation not found.</div>
        </div>
      </div>
    )
  }

  const isOwner = conversation.listing_owner_id === user.id

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <main className="px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link href="/inbox" className="text-black hover:text-gray-600 mb-4 inline-block">
              ← Back to Inbox
            </Link>
            <div className="border-b border-gray-200 pb-4">
              <h1 className="text-xl text-black font-medium">
                {conversation.listings.title}
              </h1>
              <p className="text-gray-600">{conversation.listings.location}</p>
              <p className="text-sm text-gray-500 mt-1">
                {isOwner ? 'Inquiry about your listing' : 'Your inquiry'}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
            {conversation.messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              conversation.messages.map((message) => {
                const isMyMessage = message.sender_id === user.id
                return (
                  <div
                    key={message.id}
                    className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isMyMessage
                          ? 'bg-black text-white'
                          : 'bg-gray-200 text-black'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        isMyMessage ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !sending && sendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-black"
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                className="px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}