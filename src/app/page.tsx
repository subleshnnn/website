'use client'

import Navigation from '@/components/Navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'

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

function HomePageContent() {
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['listings'],
    queryFn: getListings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return (
    <>
      {listings.length === 0 && !isLoading ? (
        <div className="py-12">
          <div className="mb-4">
            <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg text-gray-900 mb-2">No listings yet</h3>
          <p className="text-gray-500 mb-4">Artist spaces will appear here once members start sharing.</p>
          <p className="text-lg text-gray-400">This is an invite-only community for artists.</p>
        </div>
      ) : (
        <div className="space-y-24">
          {listings.map((listing) => {
            const primaryImage = listing.listing_images?.find(img => img.is_primary) || listing.listing_images?.[0]
            return (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="block text-center"
              >
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
                  {(listing.dog_friendly || listing.cat_friendly) && (
                    <span className="text-amber-700 ml-2">
                      {listing.dog_friendly && '🐕 friendly '}
                      {listing.cat_friendly && '🐱 friendly'}
                    </span>
                  )}
                </div>
                {primaryImage ? (
                  <Image
                    src={primaryImage.thumbnail_url || primaryImage.image_url}
                    alt={`Listing in ${listing.location}`}
                    width={400}
                    height={400}
                    className="h-auto w-full"
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
            )
          })}
        </div>
      )}
    </>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <main className="px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Descriptive text block */}
        <div className="text-left mb-16">
          <p className="text-4xl" style={{ fontFamily: 'Cerial, sans-serif' }}>
            <span className="text-blue-400">Subleshnn</span>{' '}
            <span className="text-green-400">is</span>{' '}
            <span className="text-red-400">for</span>{' '}
            <span className="text-purple-400">us</span>{' '}
            <span className="text-yellow-400">traveling</span>{' '}
            <span className="text-pink-400">people</span>{' '}
            <span className="text-indigo-400">who</span>{' '}
            <span className="text-orange-400">for</span>{' '}
            <span className="text-teal-400">this</span>{' '}
            <span className="text-gray-400">or</span>{' '}
            <span className="text-blue-500">that</span>{' '}
            <span className="text-green-500">reason</span>{' '}
            <span className="text-red-500">need</span>{' '}
            <span className="text-purple-500">a</span>{' '}
            <span className="text-yellow-500">place</span>{' '}
            <span className="text-pink-500">to</span>{' '}
            <span className="text-indigo-500">stay.</span>{' '}
            <span className="text-orange-500">Look</span>{' '}
            <span className="text-teal-500">for</span>{' '}
            <span className="text-gray-500">free,</span>{' '}
            <span className="text-blue-300">post</span>{' '}
            <span className="text-green-300">for</span>{' '}
            <span className="text-red-300">a</span>{' '}
            <span className="text-purple-300">dollar.</span>{' '}
            <span className="text-yellow-300">Sign</span>{' '}
            <span className="text-pink-300">up</span>{' '}
            <span className="text-indigo-300">here</span>
          </p>
        </div>

        <HomePageContent />
      </main>
    </div>
  )
}