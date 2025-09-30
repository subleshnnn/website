'use client'

// Force dynamic rendering since Navigation uses Clerk hooks
export const dynamic = 'force-dynamic'

import Navigation from '@/components/Navigation'
import FilterBar from '@/components/FilterBar'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { FONT_SIZES, FONT_FAMILY } from '@/lib/constants'
import { useUser } from '@clerk/nextjs'

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

async function getListings(): Promise<ListingData[]> {
  try {
    // First fetch listings without images to avoid timeout
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select(`
        id,
        location,
        price,
        available_from,
        available_to,
        dog_friendly,
        cat_friendly,
        created_at
      `)
      .or('listing_type.eq.subletting,listing_type.is.null')
      .order('created_at', { ascending: false })
      .limit(12)

    if (listingsError) {
      console.error('Error fetching listings:', listingsError)
      return []
    }

    if (!listings || listings.length === 0) {
      return []
    }

    // Then fetch images separately to avoid join timeout
    const listingIds = listings.map(l => l.id)
    const { data: images, error: imagesError } = await supabase
      .from('listing_images')
      .select('listing_id, image_url, thumbnail_url, is_primary')
      .in('listing_id', listingIds)

    if (imagesError) {
      console.error('Error fetching images:', imagesError)
      console.error('Images error details:', JSON.stringify(imagesError, null, 2))
      console.error('Listing IDs:', listingIds)
      // Return listings without images rather than failing completely
      return listings.map(listing => ({ ...listing, listing_images: [] }))
    }

    // Combine listings with their images
    const listingsWithImages = listings.map(listing => ({
      ...listing,
      listing_images: images?.filter(img => img.listing_id === listing.id) || []
    }))

    return listingsWithImages
  } catch (networkError) {
    console.error('Network error fetching listings:', networkError)
    return []
  }
}

interface ListingData {
  id: string
  location: string
  price: number
  property_type?: string
  available_from?: string
  available_to?: string
  dog_friendly?: boolean
  cat_friendly?: boolean
  created_at: string
  listing_images: Array<{
    image_url: string
    thumbnail_url?: string
    is_primary: boolean
  }>
}

function HomePageContent({ filters }: { filters: { city: string, type: string, maxBudget: number } }) {

  const { data: allListings = [], isLoading } = useQuery({
    queryKey: ['listings'],
    queryFn: getListings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Filter listings based on current filters
  const listings = allListings.filter((listing) => {
    // City filter - check if the filter city appears anywhere in the location string (case-insensitive)
    if (filters.city && filters.city !== 'All Cities') {
      const locationLower = listing.location.toLowerCase()
      const filterCityLower = filters.city.toLowerCase()

      // Check if the location contains the filter city as a whole word
      if (!locationLower.includes(filterCityLower)) return false
    }

    // Type filter (skip if property_type field doesn't exist yet)
    if (filters.type && filters.type !== 'All Types') {
      const propertyType = (listing as unknown as {property_type?: string}).property_type
      if (propertyType && propertyType.toLowerCase() !== filters.type.toLowerCase()) return false
    }

    // Budget filter
    if (listing.price > (filters.maxBudget * 100)) return false

    return true
  })

  return (
    <>
      {listings.length === 0 && !isLoading ? (
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)', marginTop: '-10vh' }}>
          <p className="text-black" style={{ fontSize: FONT_SIZES.base, fontFamily: FONT_FAMILY }}>
            Seems there is no listings here...
          </p>
        </div>
      ) : (
        <div className="space-y-24">
          {listings.map((listing) => {
            const primaryImage = listing.listing_images?.find(img => img.is_primary) || listing.listing_images?.[0]
            return (
              <div key={listing.id} className="text-center">
                <div className="text-black" style={{ fontSize: FONT_SIZES.base, fontFamily: FONT_FAMILY }}>
                  {listing.location}
                </div>
                <div className="text-black" style={{ fontSize: FONT_SIZES.base, fontFamily: FONT_FAMILY }}>
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
                <div className="text-black mb-4" style={{ fontSize: FONT_SIZES.base, fontFamily: FONT_FAMILY }}>
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
                  {primaryImage ? (
                    <Image
                      src={primaryImage.thumbnail_url || primaryImage.image_url}
                      alt={`Listing in ${listing.location}`}
                      width={400}
                      height={400}
                      className="h-auto"
                      style={{ maxHeight: '400px', objectFit: 'contain' }}
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                      priority={false}
                      quality={75}
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                  ) : (
                    <div className="bg-gray-200 flex items-center justify-center" style={{ height: '300px' }}>
                      <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

export default function HomePage() {
  const { isSignedIn } = useUser()
  const [filters, setFilters] = useState({
    city: '',
    type: '',
    maxBudget: 5000
  })
  const [mounted, setMounted] = useState(false)

  // Random color on each page load
  const colors = [
    'text-blue-400', 'text-green-400', 'text-red-400', 'text-purple-400',
    'text-yellow-400', 'text-pink-400', 'text-indigo-400', 'text-orange-400',
    'text-teal-400', 'text-blue-500', 'text-green-500', 'text-red-500',
    'text-purple-500', 'text-yellow-500', 'text-pink-500', 'text-indigo-500',
    'text-orange-500', 'text-teal-500'
  ]
  const [randomColor] = useState(() => colors[Math.floor(Math.random() * colors.length)])

  // Animation colors for the link
  const animationColors = ['#60a5fa', '#4ade80', '#f87171', '#c084fc', '#facc15', '#f472b6', '#818cf8', '#fb923c', '#2dd4bf']
  const [isAnimating, setIsAnimating] = useState(false)
  const [animatedColor, setAnimatedColor] = useState('')
  const [linkInterval, setLinkInterval] = useState<NodeJS.Timeout | null>(null)

  const startAnimation = () => {
    if (linkInterval) return
    setIsAnimating(true)
    const interval = setInterval(() => {
      setAnimatedColor(animationColors[Math.floor(Math.random() * animationColors.length)])
    }, 200)
    setLinkInterval(interval)
  }

  const stopAnimation = () => {
    if (linkInterval) {
      clearInterval(linkInterval)
      setLinkInterval(null)
      setIsAnimating(false)
      setAnimatedColor('')
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Navigation onFiltersChange={setFilters} />

      <main className="px-4 sm:px-6 lg:px-8 py-8 pt-20">
        {/* Descriptive text block */}
        <div className="text-left mb-16">
          {mounted && (
            <p className={randomColor} style={{ fontSize: FONT_SIZES.base, fontFamily: FONT_FAMILY }}>
              For us traveling people who for this or that reason need a place to stay. Look for free, post for a dollar.{' '}
              {isSignedIn ? (
                <Link
                  href="/dashboard/create"
                  style={{
                    borderBottom: '1px solid currentColor',
                    paddingBottom: '2px',
                    ...(isAnimating && { color: animatedColor })
                  }}
                  onMouseEnter={startAnimation}
                  onMouseLeave={stopAnimation}
                >
                  Add Your Sublet (+)
                </Link>
              ) : (
                <Link
                  href="/sign-up"
                  style={{
                    borderBottom: '1px solid currentColor',
                    paddingBottom: '2px',
                    ...(isAnimating && { color: animatedColor })
                  }}
                  onMouseEnter={startAnimation}
                  onMouseLeave={stopAnimation}
                >
                  Sign up here
                </Link>
              )}
            </p>
          )}
        </div>

        <HomePageContent filters={filters} />
      </main>
    </div>
  )
}