'use client'

export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { useUser } from '@clerk/nextjs'
import { FONT_SIZES } from '@/lib/constants'
import { useFont } from '@/contexts/FontContext'

function formatDate(dateString: string, includeYear: boolean = true, includeMonth: boolean = true) {
  const date = new Date(dateString)
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    ...(includeMonth && { month: 'short' }),
    ...(includeYear && { year: 'numeric' })
  }
  return date.toLocaleDateString('en-GB', options)
}

async function getFavoriteListings(userId: string) {
  try {
    // First get favorite listing IDs
    const { data: favorites, error: favError } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', userId)

    if (favError || !favorites || favorites.length === 0) {
      return []
    }

    const listingIds = favorites.map(f => f.listing_id)

    // Then fetch the actual listings
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select(`
        id,
        location,
        price,
        property_type,
        available_from,
        available_to,
        dog_friendly,
        cat_friendly,
        created_at
      `)
      .in('id', listingIds)
      .order('created_at', { ascending: false })

    if (listingsError) {
      console.error('Error fetching listings:', listingsError)
      return []
    }

    // Fetch images separately
    const { data: images } = await supabase
      .from('listing_images')
      .select('listing_id, image_url, thumbnail_url, is_primary')
      .in('listing_id', listingIds)

    // Combine listings with images
    const listingsWithImages = listings.map(listing => ({
      ...listing,
      listing_images: images?.filter(img => img.listing_id === listing.id) || []
    }))

    return listingsWithImages
  } catch (error) {
    console.error('Network error:', error)
    return []
  }
}

export default function FavoritesPage() {
  const { fontFamily } = useFont()
  const { user } = useUser()

  const { data: listings = [], isLoading, refetch } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: () => getFavoriteListings(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const removeFavorite = async (listingId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) return

    await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId)

    refetch()
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <main className="p-4">
          <p className="text-black" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
            Please sign in to view your favorites
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="p-4">
        {listings.length === 0 && !isLoading ? (
          <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)', marginTop: '-10vh' }}>
            <p className="text-black" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
              No favorites yet...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map((listing) => {
              const primaryImage = listing.listing_images?.find((img) => img.is_primary) || listing.listing_images?.[0]
              return (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="block border border-gray-400 p-4 relative"
                >
                  <div className="flex gap-4 items-start">
                    {primaryImage && (
                      <div className="flex-shrink-0">
                        <Image
                          src={primaryImage.thumbnail_url || primaryImage.image_url}
                          alt={`Listing in ${listing.location}`}
                          width={88}
                          height={88}
                          className="object-cover"
                          style={{ width: '88px', height: '88px' }}
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-1 flex-1" style={{ marginTop: '-2px' }}>
                      <div style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily, lineHeight: '1.2' }}>
                        <span className="text-black">{listing.location}</span>
                        {listing.property_type && (
                          <span className="text-gray-500"> {listing.property_type}</span>
                        )}
                      </div>
                      <div className="text-gray-500" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily, lineHeight: '1.2' }}>
                        {(listing.available_from || listing.available_to) &&
                          (() => {
                            if (listing.available_from && listing.available_to) {
                              const fromDate = new Date(listing.available_from)
                              const toDate = new Date(listing.available_to)
                              const sameYear = fromDate.getFullYear() === toDate.getFullYear()
                              const sameMonth = fromDate.getMonth() === toDate.getMonth() && sameYear

                              if (sameMonth) {
                                return `${fromDate.getDate()} – ${formatDate(listing.available_to)}`
                              } else if (sameYear) {
                                return `${formatDate(listing.available_from, false)} – ${formatDate(listing.available_to)}`
                              } else {
                                return `${formatDate(listing.available_from)} – ${formatDate(listing.available_to)}`
                              }
                            } else if (listing.available_from) {
                              return `From ${formatDate(listing.available_from)}`
                            } else if (listing.available_to) {
                              return `Until ${formatDate(listing.available_to)}`
                            }
                            return ''
                          })()
                        }
                      </div>
                      <div className="text-gray-500" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily, lineHeight: '1.2' }}>
                        {(listing.price / 100).toFixed(0)} usd
                        {(listing.dog_friendly || listing.cat_friendly) && (
                          <span className="ml-2" style={{ display: 'inline-flex', gap: '10px' }}>
                            {listing.dog_friendly && <span>🐕</span>}
                            {listing.cat_friendly && <span>🐱</span>}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => removeFavorite(listing.id, e)}
                      className="absolute top-4 right-4 cursor-pointer transition-colors hover:scale-110"
                      style={{ fontSize: FONT_SIZES.base, color: '#ef4444', fontFamily: fontFamily }}
                    >
                      &lt;3
                    </button>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
