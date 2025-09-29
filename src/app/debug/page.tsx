'use client'

import { useUser } from '@clerk/nextjs'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugPage() {
  const { user } = useUser()
  const [testResult, setTestResult] = useState('')
  const [loading, setLoading] = useState(false)

  async function testConnection() {
    setLoading(true)
    setTestResult('Testing...')

    try {
      // Test 1: Basic connection
      console.log('DEBUG: Testing Supabase connection...')
      const { data, error } = await supabase.from('listings').select('count')
      
      console.log('DEBUG: Connection test result:', { data, error })
      
      if (error) {
        setTestResult(`❌ Connection failed: ${error.message}`)
        return
      }

      // Test 2: Test insert
      const testData = {
        user_id: user?.id || 'test-user',
        title: 'Test Listing',
        description: 'Test description',
        price: 100000, // $1000 in cents
        location: 'Test Location',
        contact_email: 'test@example.com'
      }

      console.log('DEBUG: Testing insert with:', testData)
      
      const { data: insertData, error: insertError } = await supabase
        .from('listings')
        .insert(testData)
        .select()

      console.log('DEBUG: Insert test result:', { insertData, insertError })

      if (insertError) {
        setTestResult(`❌ Insert failed: ${insertError.message}`)
        return
      }

      setTestResult(`✅ All tests passed! Created test listing with ID: ${insertData?.[0]?.id}`)

    } catch (error) {
      console.error('DEBUG: Catch error:', error)
      setTestResult(`❌ Network error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Page</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-4">User Info</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify({
                isLoaded: !!user,
                userId: user?.id,
                email: user?.emailAddresses[0]?.emailAddress,
              }, null, 2)}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Environment</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm">
              Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
              {'\n'}Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Database Test</h2>
            <button
              onClick={testConnection}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Database Connection'}
            </button>
            
            {testResult && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <a href="/dashboard" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}