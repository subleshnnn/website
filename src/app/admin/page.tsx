'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import { supabase } from '@/lib/supabase'

interface Invitation {
  id: string
  email: string
  invited_by: string
  status: 'pending' | 'used'
  created_at: string
  used_at?: string
}

export default function AdminPage() {
  const { user } = useUser()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [tableExists, setTableExists] = useState(false)

  // Simple admin check - you can modify this to check for specific admin users
  const isAdmin = user?.emailAddresses[0]?.emailAddress === 'akhmetovtimur@gmail.com'

  useEffect(() => {
    if (isAdmin) {
      fetchInvitations()
    }
  }, [isAdmin])

  async function fetchInvitations() {
    try {
      console.log('DEBUG: Fetching invitations...')
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('DEBUG: Invitations result:', { data, error })

      if (error) {
        console.error('Error fetching invitations:', error)
        if (error.code === 'PGRST116') {
          console.log('DEBUG: Table does not exist')
          setTableExists(false)
        }
        return
      }

      console.log('DEBUG: Successfully fetched invitations:', data)
      setInvitations(data || [])
      setTableExists(true)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setFetchLoading(false)
    }
  }

  async function sendInvitationEmail(email: string, inviteCode: string) {
    try {
      console.log('DEBUG: Sending email to:', email, 'with code:', inviteCode)
      
      const response = await fetch('/api/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          inviteCode
        })
      })

      const result = await response.json()
      console.log('DEBUG: Email API response:', result)

      if (!response.ok) {
        console.error('Email API error:', result)
        return false
      }

      return true
    } catch (error) {
      console.error('Error sending email:', error)
      return false
    }
  }

  async function deleteInvitation(invitationId: string, email: string) {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId)

      if (error) {
        console.error('Error deleting invitation:', error)
        alert('Error deleting invitation. Please try again.')
        return
      }

      // Remove from local state
      setInvitations(invitations.filter(invite => invite.id !== invitationId))
      alert(`✅ Invitation for ${email} has been deleted.`)
    } catch (error) {
      console.error('Error:', error)
      alert('Error deleting invitation')
    }
  }

  async function clearAllInvitations() {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (using a condition that's always true)

      if (error) {
        console.error('Error clearing invitations:', error)
        alert('Error clearing invitations. Please try again.')
        return
      }

      setInvitations([])
      alert(`✅ All invitations have been deleted.`)
    } catch (error) {
      console.error('Error:', error)
      alert('Error clearing invitations')
    }
  }

  async function sendInvitation() {
    if (!newEmail.trim() || !user) return

    setLoading(true)

    try {
      const inviteCode = Math.random().toString(36).substring(2, 15)
      
      const { error } = await supabase
        .from('invitations')
        .insert({
          email: newEmail.trim().toLowerCase(),
          invite_code: inviteCode,
          invited_by: user.id,
          status: 'pending'
        })

      if (error) {
        console.error('Error creating invitation:', error)
        alert('Error creating invitation. You may need to create the invitations table first.')
        return
      }

      // Send email invitation
      const emailSent = await sendInvitationEmail(newEmail, inviteCode)
      
      if (emailSent) {
        alert(`✅ Invitation email sent successfully to ${newEmail}!`)
      } else {
        alert(`⚠️ Invitation created but email failed to send. You can manually invite ${newEmail} with this link:\nhttp://localhost:3000/sign-up?invite=${inviteCode}`)
      }
      
      setNewEmail('')
      fetchInvitations()
    } catch (error) {
      console.error('Error:', error)
      alert('Error creating invitation')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p>Please sign in to access admin features.</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p>You don&apos;t have admin access to this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Admin Panel</h1>
          <p className="text-gray-600">Manage invitations to the artist community</p>
        </div>

        {/* Create Invitation */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Send Invitation</h2>
          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
            <p className="text-blue-800 text-sm">
              <strong>Testing Mode:</strong> Currently, emails can only be sent to your email address (akhmetovtimur@gmail.com) due to Resend&apos;s free tier restrictions. 
              To send to other emails, you&apos;ll need to verify a domain at resend.com/domains.
            </p>
          </div>
          <div className="flex gap-4">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="akhmetovtimur@gmail.com (or any email for testing)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendInvitation}
              disabled={loading || !newEmail.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Invitation Email'}
            </button>
          </div>
        </div>

        {/* Setup Instructions - only show if table doesn't exist */}
        {!tableExists && !fetchLoading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Setup Required</h3>
            <p className="text-yellow-700 mb-4">To enable the invitation system, run this SQL in Supabase:</p>
            <pre className="bg-yellow-100 p-4 rounded text-sm overflow-x-auto">
{`CREATE TABLE invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    invited_by TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_invitations_code ON invitations(invite_code);
CREATE INDEX idx_invitations_email ON invitations(email);`}
            </pre>
          </div>
        )}

        {/* Invitations List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Sent Invitations ({invitations.length})
            </h2>
            {invitations.length > 0 && (
              <button
                onClick={clearAllInvitations}
                className="text-red-600 hover:text-red-800 text-sm px-4 py-2 border border-red-300 rounded hover:bg-red-50 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
          
          {fetchLoading ? (
            <div className="text-center py-4">Loading invitations...</div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No invitations sent yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Email</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Sent</th>
                    <th className="text-left py-2">Used</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((invite) => (
                    <tr key={invite.id} className="border-b">
                      <td className="py-3">{invite.email}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-sm ${
                          invite.status === 'used' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invite.status}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-500">
                        {new Date(invite.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-sm text-gray-500">
                        {invite.used_at ? new Date(invite.used_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => deleteInvitation(invite.id, invite.email)}
                          className="text-red-600 hover:text-red-800 text-sm px-3 py-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete invitation"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}