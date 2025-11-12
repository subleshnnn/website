'use client'

import { useUser } from '@clerk/nextjs'

// Force dynamic rendering for pages that use Clerk
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { supabase, type Listing } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { FONT_SIZES } from '@/lib/constants'
import { useFont } from '@/contexts/FontContext'
import { useResponsiveFontSize } from '@/hooks/useResponsiveFontSize'

function formatDate(dateString: string, includeYear: boolean = true, includeMonth: boolean = true) {
  const date = new Date(dateString)
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    ...(includeMonth && { month: 'short' }),
    ...(includeYear && { year: 'numeric' })
  }
  return date.toLocaleDateString('en-GB', options)
}

export default function DashboardPage() {
  const { fontFamily } = useFont()
  const fontSize = useResponsiveFontSize()
  const { user, isLoaded } = useUser()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUserListings = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          id,
          listing_type,
          price,
          location,
          property_type,
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

      setListings((data as unknown as Listing[]) || [])
    } catch (error) {
      console.error('Network error fetching user listings:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (isLoaded && user) {
      fetchUserListings()
    }
  }, [isLoaded, user, fetchUserListings])

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black" style={{ fontFamily: fontFamily, fontSize: fontSize }}>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <style jsx>{`
        .tab-button::after {
          content: '';
          position: absolute;
          bottom: 2px;
          left: 0;
          right: 0;
          height: 1px;
          background-color: transparent;
        }
        .tab-button.active::after {
          background-color: black;
        }
        .tab-button:hover::after {
          background-color: black;
        }
        .action-link::after {
          content: '';
          position: absolute;
          bottom: 2px;
          left: 0;
          right: 0;
          height: 1px;
          background-color: transparent;
        }
        .action-link:hover::after {
          background-color: currentColor;
        }
      `}</style>
      <main className="p-4 sm:p-6 lg:p-8 xl:pt-4">
        <div>
        {listings.length === 0 ? (
          <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
            <div className="text-black" style={{ fontSize: fontSize, fontFamily: fontFamily }}>
              No listings yet
            </div>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
              gap: '16px'
            }}>
              {listings.map((listing) => {
                const listingWithExtras = listing as unknown as Listing & {
                  listing_type?: string
                  property_type?: string
                  dog_friendly?: boolean
                  cat_friendly?: boolean
                  listing_images?: Array<{
                    image_url: string
                    thumbnail_url?: string
                    is_primary: boolean
                  }>
                }
                const primaryImage = listingWithExtras.listing_images?.find((img) => img.is_primary) || listingWithExtras.listing_images?.[0]
                return (
                  <div key={listing.id} className="border border-gray-400 p-4 flex flex-col" style={{ borderRadius: '8px', aspectRatio: '1/1' }}>
                    <div className="flex flex-col gap-1 mb-2" style={{ minHeight: '88px' }}>
                      <div className="flex items-start justify-between" style={{ fontSize: fontSize, fontFamily: fontFamily, lineHeight: '1.2' }}>
                        <span className="text-black">{listing.location}</span>
                        {listingWithExtras.property_type && (
                          <span className="text-gray-500 ml-2">{listingWithExtras.property_type}</span>
                        )}
                      </div>
                      {(listing.available_from || listing.available_to) && (
                        <div className="text-gray-500" style={{ fontSize: fontSize, fontFamily: fontFamily, lineHeight: '1.2' }}>
                          {(() => {
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
                          })()}
                        </div>
                      )}
                      <div className="flex items-center justify-between" style={{ fontSize: fontSize, fontFamily: fontFamily, lineHeight: '1.2' }}>
                        <div className="text-gray-500">
                          {(listing.price / 100).toFixed(0)} usd
                          {(listingWithExtras.dog_friendly || listingWithExtras.cat_friendly) && (
                            <span className="ml-2" style={{ display: 'inline-flex', gap: '10px' }}>
                              {listingWithExtras.dog_friendly && <span>🐕</span>}
                              {listingWithExtras.cat_friendly && <span>🐱</span>}
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/dashboard/edit/${listing.id}`}
                          className="text-black min-[500px]:hidden"
                          style={{ fontSize: fontSize, fontFamily: fontFamily }}
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                    {primaryImage && (
                      <div className="w-full overflow-hidden flex-1 flex items-start justify-start">
                        <Image
                          src={primaryImage.thumbnail_url || primaryImage.image_url}
                          alt={`Listing in ${listing.location}`}
                          width={400}
                          height={400}
                          className="w-full h-full"
                          style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'left top' }}
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="hidden min-[500px]:flex gap-4 mt-4">
                      <Link
                        href={`/dashboard/edit/${listing.id}`}
                        className="text-black"
                        style={{ fontSize: fontSize, fontFamily: fontFamily }}
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => deleteListing(listing.id)}
                        className="text-red-600"
                        style={{ fontSize: fontSize, fontFamily: fontFamily }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
        </div>
      </main>
    </div>
  )
}