'use client'

import { UserProfile } from '@clerk/nextjs'

// Force dynamic rendering for pages that use Clerk
export const dynamic = 'force-dynamic'

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-white">
      <style jsx global>{`
        /* Hide profile image/avatar section */
        .cl-profileSection__profile,
        [data-localization-key="userProfile.profilePage.imageFormTitle"],
        .cl-userProfile-root .cl-profileSection:first-child {
          display: none !important;
        }
        /* Hide avatar in header */
        .cl-userPreview-avatarBox,
        .cl-avatarBox {
          display: none !important;
        }
      `}</style>
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <UserProfile />
        </div>
      </main>
    </div>
  )
}