'use client'

import Navigation from '@/components/Navigation'
import { UserProfile } from '@clerk/nextjs'

// Force dynamic rendering for pages that use Clerk
export const dynamic = 'force-dynamic'

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <UserProfile />
        </div>
      </main>
    </div>
  )
}