'use client'

import { supabase } from '@/lib/supabase'
import { notFound, useParams } from 'next/navigation'
import ContactButton from '@/components/ContactButton'
import Image from 'next/image'
import { FONT_SIZES } from '@/lib/constants'
import { useFont } from '@/contexts/FontContext'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

// Force dynamic rendering since Navigation uses Clerk hooks
export const dynamic = 'force-dynamic'

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

async function getListing(id: string) {
  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      listing_images (
        id,
        image_url,
        caption,
        is_primary
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

export default function ListingPage() {
  const { fontFamily } = useFont()
  const { user } = useUser()
  const params = useParams()
  const id = params.id as string
  const [isFavorited, setIsFavorited] = useState(false)

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListing(id),
    staleTime: 5 * 60 * 1000,
  })

  // Load favorite status
  useEffect(() => {
    async function checkFavorite() {
      if (!user) return

      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', id)
        .single()

      setIsFavorited(!!data)
    }

    checkFavorite()
  }, [user, id])

  const toggleFavorite = async () => {
    if (!user) return

    if (isFavorited) {
      // Remove favorite
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', id)

      setIsFavorited(false)
    } else {
      // Add favorite
      await supabase
        .from('favorites')
        .insert({ user_id: user.id, listing_id: id })

      setIsFavorited(true)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-4" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
        Loading...
      </div>
    )
  }

  if (!listing) {
    notFound()
  }

  // Sort images - primary first
  interface ImageType {
    id: string
    is_primary: boolean
    image_url: string
    thumbnail_url?: string
    caption?: string
  }

  const sortedImages = listing.listing_images?.sort((a: ImageType, b: ImageType) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    return 0
  }) || []

  return (
    <div className="min-h-screen bg-white">
      <main className="p-4">
        <div className="bg-white overflow-hidden border border-gray-400 p-8 max-w-4xl relative">
          {/* Favorite Heart */}
          <button
            onClick={toggleFavorite}
            className="absolute top-4 right-4 cursor-pointer transition-colors hover:scale-110"
            style={{ fontSize: FONT_SIZES.base, color: isFavorited ? '#ef4444' : '#000000', fontFamily: fontFamily }}
          >
            &lt;3
          </button>

          {/* Listing Information */}
          <div className="px-4 sm:px-6 lg:px-8">
            <div>
              <div className="mb-8 text-black" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
                <div>
                  {listing.location}
                </div>
                {(listing.available_from || listing.available_to) && (
                  <div>
                    {listing.available_from && listing.available_to
                      ? `${formatDate(listing.available_from)} – ${formatDate(listing.available_to)}`
                      : listing.available_from
                      ? `From ${formatDate(listing.available_from)}`
                      : listing.available_to
                      ? `Until ${formatDate(listing.available_to)}`
                      : ''
                    }
                  </div>
                )}
                <div>
                  {(listing.price / 100).toFixed(0)} usd
                </div>
                {(listing.dog_friendly || listing.cat_friendly) && (
                  <div className="text-amber-700">
                    {listing.dog_friendly && '🐕 friendly '}
                    {listing.cat_friendly && '🐱 friendly'}
                  </div>
                )}
                <ContactButton
                  listingId={listing.id}
                  listingOwnerId={listing.user_id}
                  listingTitle={listing.title}
                />
              </div>

              <div className="prose mb-8" style={{ maxWidth: '80ch' }}>
                {listing.description ? (
                  <p className="text-black leading-relaxed" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
                    {listing.description}
                  </p>
                ) : (
                  <p className="text-black" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>No description provided</p>
                )}
              </div>
            </div>
          </div>

          {/* Images Section */}
          {sortedImages.length > 0 && (
            <div>
              <div className="px-4 sm:px-6 lg:px-8">
                <div className="space-y-24">
                  {sortedImages.map((image: ImageType, index: number) => (
                    <div key={image.id} className="relative">
                      <Image
                        src={image.image_url}
                        alt={`Listing image ${index + 1}`}
                        width={600}
                        height={600}
                        className="h-auto"
                        style={{ maxHeight: '600px', objectFit: 'contain' }}
                        priority={index === 0}
                      />
                      {image.caption && (
                        <p className="mt-2 text-black" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>{image.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No Images Placeholder */}
          {sortedImages.length === 0 && (
            <div>
              <div className="px-4 sm:px-6 lg:px-8">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-black text-lg">No images available for this listing</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}