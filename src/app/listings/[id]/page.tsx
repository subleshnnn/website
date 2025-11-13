'use client'

import { supabase } from '@/lib/supabase'
import { notFound, useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { FONT_SIZES } from '@/lib/constants'
import { useFont } from '@/contexts/FontContext'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { useResponsiveFontSize } from '@/hooks/useResponsiveFontSize'
import { toPng } from 'html-to-image'

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
  const fontSize = useResponsiveFontSize()
  const { user } = useUser()
  const params = useParams()
  const id = params.id as string
  const [isFavorited, setIsFavorited] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

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

  const downloadImage = async () => {
    if (!cardRef.current) {
      alert('Card not ready. Please try again.')
      return
    }

    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      })

      // Download the image
      const link = document.createElement('a')
      link.download = `subleshnn-${listing.location.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`
      link.href = dataUrl
      link.click()

      // Close the modal after download
      setIsGenerating(false)
    } catch (error) {
      console.error('Error generating image:', error)
      alert('Failed to generate image. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-4" style={{ fontSize: fontSize, fontFamily: fontFamily }}>
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
      <main className="px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8 pt-4">
        <div className="bg-white overflow-hidden border border-gray-400 p-4 sm:p-6 lg:p-8 max-w-4xl relative" style={{ borderRadius: '8px' }}>
          {/* Share Button */}
          <button
            onClick={() => setIsGenerating(true)}
            disabled={isGenerating}
            className="absolute top-4 cursor-pointer hover:opacity-70 transition-opacity"
            style={{
              right: user && listing.user_id === user.id ? '140px' : '80px',
              fontSize: fontSize,
              fontFamily: fontFamily,
              color: '#8B4513',
              opacity: isGenerating ? 0.5 : 1,
              zIndex: 10
            }}
          >
            Share
          </button>

          {/* Edit Button - Only show if user owns this listing */}
          {user && listing.user_id === user.id && (
            <Link
              href={`/dashboard/edit/${listing.id}`}
              className="absolute top-4 right-16 cursor-pointer text-gray-400 hover:text-black transition-colors"
              style={{ fontSize: fontSize, fontFamily: fontFamily, zIndex: 10 }}
            >
              Edit
            </Link>
          )}

          {/* Favorite Heart */}
          <button
            onClick={toggleFavorite}
            className="absolute top-4 right-4 cursor-pointer transition-colors hover:scale-110"
            style={{ fontSize: fontSize, color: isFavorited ? '#ef4444' : '#000000', fontFamily: fontFamily, zIndex: 10 }}
          >
            &lt;3
          </button>

          {/* Listing Information */}
          <div>
            <div>
              <div className="mb-8 text-black" style={{ fontSize: fontSize, fontFamily: fontFamily }}>
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
                {user && listing.user_id !== user.id && (
                  <div style={{ fontSize: fontSize, fontFamily: fontFamily }}>
                    {showContact ? (
                      <div
                        onClick={() => setShowContact(false)}
                        className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                        <span>{listing.contact_email}</span>
                      </div>
                    ) : (
                      <div
                        onClick={() => setShowContact(true)}
                        className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        <span>Show Contact</span>
                      </div>
                    )}
                  </div>
                )}
                {(listing.dog_friendly || listing.cat_friendly) && (
                  <div className="text-amber-700">
                    {listing.dog_friendly && '🐕 friendly '}
                    {listing.cat_friendly && '🐱 friendly'}
                  </div>
                )}
              </div>

              <div className="prose mb-8" style={{ maxWidth: '80ch' }}>
                {listing.description ? (
                  <p className="text-black leading-relaxed" style={{ fontSize: fontSize, fontFamily: fontFamily }}>
                    {listing.description}
                  </p>
                ) : (
                  <p className="text-black" style={{ fontSize: fontSize, fontFamily: fontFamily }}>No description provided</p>
                )}
              </div>
            </div>
          </div>

          {/* Images Section */}
          {sortedImages.length > 0 && (
            <div>
              <div>
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
                        <p className="mt-2 text-black" style={{ fontSize: fontSize, fontFamily: fontFamily }}>{image.caption}</p>
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
              <div>
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

        {/* Card for social media image generation */}
        {isGenerating && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 9998,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div
              ref={cardRef}
              style={{
                width: '800px',
                height: '800px',
                backgroundColor: 'white',
                border: '1px solid #9ca3af',
                borderRadius: '8px',
                padding: '32px',
                fontFamily: fontFamily,
                boxSizing: 'border-box',
                position: 'relative'
              }}
            >
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            fontSize: '60px',
            lineHeight: '80px',
            opacity: 0.25,
            pointerEvents: 'none',
            overflow: 'hidden',
            padding: '20px',
            boxSizing: 'border-box'
          }}>
            {'🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸'}
          </div>

          {/* Image */}
          <div style={{ width: '100%', height: '500px', marginBottom: '24px', overflow: 'hidden', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', position: 'relative', zIndex: 1 }}>
            {sortedImages.length > 0 ? (
              <img
                src={sortedImages[0].image_url}
                alt={listing.location}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ color: '#999', fontSize: '24px' }}>
                No Image
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '28px', fontWeight: '400', color: '#000000', marginBottom: '8px', lineHeight: '1.2' }}>
              {listing.location}
            </div>

            {(listing.available_from || listing.available_to) && (
              <div style={{ fontSize: '28px', color: '#000000', marginBottom: '8px' }}>
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

            <div style={{ fontSize: '28px', color: '#000000', marginBottom: '12px' }}>
              {(listing.price / 100).toFixed(0)} usd
              {(listing.dog_friendly || listing.cat_friendly) && (
                <span style={{ marginLeft: '16px' }}>
                  {listing.dog_friendly && '🐕 '}
                  {listing.cat_friendly && '🐱'}
                </span>
              )}
            </div>

            <div style={{ height: '28px' }}></div>

            <div style={{ fontSize: '28px', fontWeight: '400', color: '#8B4513' }}>
              Check on Subleshnn 🌸🌸🌸🌸🌸🌸🌸🌸
            </div>
          </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={downloadImage}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#8B4513',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: fontSize,
                  fontFamily: fontFamily
                }}
              >
                Save
              </button>
              <button
                onClick={() => setIsGenerating(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'white',
                  color: '#8B4513',
                  border: '1px solid #8B4513',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: fontSize,
                  fontFamily: fontFamily
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}