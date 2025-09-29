'use client'

import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { useState, useEffect, memo } from 'react'

function Navigation() {
  const { isSignedIn, isLoaded } = useUser()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-4xl text-black" style={{ fontFamily: 'Cerial, sans-serif' }}>
              Subleshnn
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden sm:flex items-center justify-center flex-1">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-lg text-black hover:text-white px-3 py-2 cerial-nav-pill">
                Browse
              </Link>
              <Link href="/looking-for" className="text-lg text-black hover:text-white px-3 py-2 cerial-nav-pill">
                Looking For
              </Link>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {!mounted || !isLoaded ? (
              // Show loading state to prevent hydration mismatch
              <div className="hidden sm:block text-lg text-black px-3 py-2">
                Loading...
              </div>
            ) : isSignedIn ? (
              <>
                <Link href="/dashboard" className="hidden sm:block text-lg text-black hover:text-white px-3 py-2 cerial-nav-pill">
                  Profile
                </Link>
                <Link
                  href="/dashboard/create"
                  className="hidden sm:flex items-center justify-center w-12 h-12 bg-white border border-black rounded-full hover:bg-black hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
                  </svg>
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-black hover:text-gray-600 sm:hidden"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-lg text-black hover:text-white px-3 py-2 cerial-nav-pill"
                >
                  Member Sign In
                </Link>
                <div className="text-lg text-black">
                  Invite Only
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Menu background */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white">
          {/* Navigation bar replica with black line */}
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center h-16">
              <Link href="/" className="text-4xl text-black" style={{ fontFamily: 'Cerial, sans-serif' }}>
                Subleshnn
              </Link>
            </div>
          </div>
          <div className="border-b border-black"></div>
          
          {/* Centered menu items */}
          <div className="flex items-center justify-center h-full -mt-16">
            <div className="text-center space-y-8">
              {!mounted || !isLoaded ? (
                <div className="text-lg text-black">Loading...</div>
              ) : isSignedIn ? (
                <>
                  <Link 
                    href="/dashboard" 
                    className="block text-black hover:text-black transition-colors text-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    My Listings
                  </Link>
                  <Link 
                    href="/account" 
                    className="block text-black hover:text-black transition-colors text-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Account
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    href="/sign-in" 
                    className="block text-black hover:text-black transition-colors text-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Member Sign In
                  </Link>
                  <div className="text-lg text-black">
                    Invite Only
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Menu close button */}
      {isMobileMenuOpen && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-black hover:text-black"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </nav>
  )
}

export default memo(Navigation)