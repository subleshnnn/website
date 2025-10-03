'use client'

import { supabase, type Listing } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

// Force dynamic rendering since Navigation uses Clerk hooks
export const dynamic = 'force-dynamic'

interface ListingWithImages extends Listing {
  dog_friendly?: boolean
  cat_friendly?: boolean
  listing_images: Array<{
    id: string
    image_url: string
    thumbnail_url?: string
    is_primary: boolean
  }>
}
import Link from 'next/link'
import CityDisplay from '@/components/SwirlImage'

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

async function getLookingForListings(): Promise<ListingWithImages[]> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        listing_images (
          id,
          image_url,
          is_primary
        )
      `)
      .eq('listing_type', 'looking_for')
      .order('created_at', { ascending: false })
      .limit(12)

    if (error) {
      console.error('Error fetching looking for listings:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      console.error('Error message:', error.message)
      console.error('Error code:', error.code)
      return []
    }

    return data || []
  } catch (networkError) {
    console.error('Network error fetching looking for listings:', networkError)
    return []
  }
}

function LookingForPageContent({ filters }: { filters: { city: string, type: string, maxBudget: number } }) {
  const { data: allListings = [], isLoading } = useQuery({
    queryKey: ['looking-for-listings'],
    queryFn: getLookingForListings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Filter listings based on current filters
  const listings = allListings.filter((listing) => {
    // City filter - extract city name from full location for comparison
    if (filters.city && filters.city !== 'All Cities') {
      const listingCity = listing.location.includes(',')
        ? listing.location.split(',')[0].trim()
        : listing.location.trim()

      if (listingCity !== filters.city) return false
    }

    // Type filter (skip if property_type field doesn't exist yet)
    if (filters.type && filters.type !== 'All Types') {
      const propertyType = (listing as unknown as {property_type?: string}).property_type
      if (propertyType && propertyType !== filters.type.toLowerCase()) return false
    }

    // Budget filter
    if (listing.price > (filters.maxBudget * 100)) return false

    return true
  })

  return (
    <>
      {listings.length === 0 && !isLoading && (
        <div className="py-12">
          <div className="mb-4">
            <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg text-gray-900 mb-2">No requests yet</h3>
          <p className="text-gray-500 mb-4">Sublet requests will appear here.</p>
        </div>
      )}
      {listings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-24">
          {listings.map((listing) => {
            const primaryImage = listing.listing_images?.find(img => img.is_primary) || listing.listing_images?.[0]
            return (
              <div key={listing.id} className="text-center">
                <div className="text-black" style={{ fontSize: '20px', fontFamily: 'Cerial, sans-serif' }}>
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
                <div className="text-black mb-4" style={{ fontSize: '20px', fontFamily: 'Cerial, sans-serif' }}>
                  {(listing.price / 100).toFixed(0)} usd
                  {(listing.dog_friendly || listing.cat_friendly) && (
                    <span className="text-amber-700 ml-2">
                      {listing.dog_friendly && '🐕 friendly '}
                      {listing.cat_friendly && '🐱 friendly'}
                    </span>
                  )}
                </div>
                <Link
                  href={`/listings/${listing.id}`}
                  className="inline-block"
                >
                  <CityDisplay
                    location={listing.location}
                    className="h-auto"
                    style={{ maxHeight: '400px' }}
                  />
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

export default function LookingForPage() {
  const [filters, setFilters] = useState({
    city: '',
    type: '',
    maxBudget: 5000
  })

  return (
    <div className="min-h-screen bg-white">
      <main className="p-4">
        <LookingForPageContent filters={filters} />
      </main>
    </div>
  )
}