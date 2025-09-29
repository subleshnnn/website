'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'
import { supabase, type Listing } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'subletting' | 'looking_for'>('subletting')

  useEffect(() => {
    if (isLoaded && user) {
      fetchUserListings()
    }
  }, [isLoaded, user])

  async function fetchUserListings() {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          id,
          listing_type,
          price,
          location,
          available_from,
          available_to,
          dog_friendly,
          cat_friendly,
          created_at,
          listing_images (
            image_url,
            is_primary
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Error fetching user listings:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        console.error('Error message:', error.message)
        console.error('Error code:', error.code)
        return
      }

      setListings(data || [])
    } catch (error) {
      console.error('Network error fetching user listings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function deleteListing(id: string) {
    if (!confirm('Are you sure you want to delete this listing?')) return

    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id)

    if (!error) {
      setListings(listings.filter(listing => listing.id !== id))
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <main className="px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Tab Navigation */}
        <div className="mb-8 flex justify-center">
          <div className="relative bg-gray-200 rounded-full p-1 flex">
            <div
              className="absolute top-1 bottom-1 bg-black rounded-full transition-all duration-300 ease-in-out"
              style={{
                width: 'calc(50% - 4px)',
                left: activeTab === 'subletting' ? '4px' : 'calc(50% + 2px)'
              }}
            />
            <button
              onClick={() => setActiveTab('subletting')}
              className={`relative z-10 px-6 py-2 text-lg rounded-full transition-colors duration-300 ${
                activeTab === 'subletting' ? 'text-white' : 'text-black'
              }`}
            >
              Subletting
            </button>
            <button
              onClick={() => setActiveTab('looking_for')}
              className={`relative z-10 px-6 py-2 text-lg rounded-full transition-colors duration-300 ${
                activeTab === 'looking_for' ? 'text-white' : 'text-black'
              }`}
            >
              Looking For
            </button>
          </div>
        </div>

        {listings.filter(listing => (listing.listing_type || 'subletting') === activeTab).length === 0 ? (
          <div className="text-center">
            <Link
              href="/dashboard/create"
              className="inline-flex items-center justify-center w-16 h-16 bg-white border border-black rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
              </svg>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-24">
              {listings.filter(listing => (listing.listing_type || 'subletting') === activeTab).map((listing) => {
                const primaryImage = listing.listing_images?.find((img: any) => img.is_primary) || listing.listing_images?.[0]
                return (
                  <div key={listing.id} className="text-center">
                    <div className="text-lg text-black">
                      {listing.location}
                    </div>
                    <div className="text-lg text-black">
                      {(listing.available_from || listing.available_to) && 
                        (listing.available_from && listing.available_to 
                          ? `${formatDate(listing.available_from)} – ${formatDate(listing.available_to)}`
                          : listing.available_from 
                          ? `From ${formatDate(listing.available_from)}`
                          : listing.available_to 
                          ? `Until ${formatDate(listing.available_to)}`
                          : ''
                        )
                      }
                    </div>
                    <div className="text-lg text-black mb-4">
                      ${(listing.price / 100).toFixed(0)}
                    </div>
                    {(listing.dog_friendly || listing.cat_friendly) && (
                      <div className="text-lg text-amber-700 mb-4">
                        {listing.dog_friendly && '🐕 friendly '}
                        {listing.cat_friendly && '🐱 friendly'}
                      </div>
                    )}
                    {primaryImage ? (
                      <Image
                        src={primaryImage.image_url}
                        alt={`Listing in ${listing.location}`}
                        width={400}
                        height={400}
                        className="h-auto w-full mb-4"
                        style={{ maxHeight: '400px', objectFit: 'contain' }}
                        loading="lazy"
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                        priority={false}
                      />
                    ) : (
                      <div className="bg-gray-200 flex items-center justify-center mb-4" style={{ height: '300px' }}>
                        <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex justify-center gap-4">
                      <Link
                        href={`/dashboard/edit/${listing.id}`}
                        className="text-lg text-black hover:underline"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => deleteListing(listing.id)}
                        className="text-lg text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="mt-8 text-center">
              <Link 
                href="/dashboard/create"
                className="inline-flex items-center justify-center w-16 h-16 bg-white border border-black rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
                </svg>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}