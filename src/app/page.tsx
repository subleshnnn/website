'use client'

// Force dynamic rendering since Navigation uses Clerk hooks
export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { FONT_SIZES } from '@/lib/constants'
import { useFilters } from '@/contexts/FilterContext'
import { useFont } from '@/contexts/FontContext'
import { useViewMode } from '@/contexts/ViewModeContext'

function formatDate(dateString: string, includeYear: boolean = true, includeMonth: boolean = true) {
  const date = new Date(dateString)
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    ...(includeMonth && { month: 'short' }),
    ...(includeYear && { year: 'numeric' })
  }
  return date.toLocaleDateString('en-GB', options)
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
        property_type,
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
  listing_images?: Array<{
    image_url: string
    thumbnail_url?: string
    is_primary: boolean
  }>
}

function HomePageContent({ filters, viewMode }: { filters: { city: string, type: string, maxBudget: number }, viewMode: 'column' | 'row' }) {
  const { fontFamily } = useFont()
  const { setFilters } = useFilters()
  const { setViewMode } = useViewMode()

  const { data: allListings = [], isLoading } = useQuery({
    queryKey: ['listings'],
    queryFn: getListings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const removeFilter = (filterType: 'city' | 'type' | 'budget') => {
    if (filterType === 'city') {
      setFilters({ ...filters, city: 'All Cities' })
    } else if (filterType === 'type') {
      setFilters({ ...filters, type: 'All Types' })
    } else if (filterType === 'budget') {
      setFilters({ ...filters, maxBudget: 0 })
    }
  }

  // Filter listings based on current filters
  const listings = allListings.filter((listing) => {
    // City filter - check if the filter city appears anywhere in the location string (case-insensitive)
    if (filters.city && filters.city !== '' && filters.city !== 'All Cities') {
      const locationLower = listing.location.toLowerCase()
      const filterCityLower = filters.city.toLowerCase()

      // Check if the location contains the filter city as a whole word
      if (!locationLower.includes(filterCityLower)) return false
    }

    // Type filter (skip if property_type field doesn't exist yet)
    if (filters.type && filters.type !== '' && filters.type !== 'All Types') {
      const propertyType = (listing as unknown as {property_type?: string}).property_type
      if (propertyType && propertyType.toLowerCase() !== filters.type.toLowerCase()) return false
    }

    // Budget filter - only apply if maxBudget > 0
    if (filters.maxBudget > 0 && listing.price > (filters.maxBudget * 100)) return false

    return true
  })

  return (
    <>
      {/* View Mode Switcher - fixed position */}
      <button
        onClick={() => setViewMode(viewMode === 'column' ? 'row' : 'column')}
        className="text-black fixed bg-white z-10"
        style={{
          fontFamily: fontFamily,
          fontSize: FONT_SIZES.base,
          transition: 'transform 0.3s ease',
          top: '16px',
          right: '16px'
        }}
      >
        <span style={{
          display: 'inline-block',
          transition: 'transform 0.3s ease',
          transform: viewMode === 'row' ? 'rotate(90deg)' : 'rotate(0deg)'
        }}>
          (-)
        </span>
      </button>

      {/* Active filters displayed on one line */}
      {(filters.city !== 'All Cities' || filters.type !== 'All Types' || filters.maxBudget > 0) && (
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="text-gray-500" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
            Search:
          </span>
          {filters.city && filters.city !== 'All Cities' && (
            <div className="group relative inline-flex items-center text-black" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
              <span>{filters.city}</span>
              <button
                onClick={() => removeFilter('city')}
                className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 cursor-pointer"
                style={{ fontSize: FONT_SIZES.base }}
              >
                ×
              </button>
            </div>
          )}
          {filters.type && filters.type !== 'All Types' && (
            <div className="group relative inline-flex items-center text-black" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
              <span>{filters.type}</span>
              <button
                onClick={() => removeFilter('type')}
                className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 cursor-pointer"
                style={{ fontSize: FONT_SIZES.base }}
              >
                ×
              </button>
            </div>
          )}
          {filters.maxBudget > 0 && (
            <div className="group relative inline-flex items-center text-black" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
              <span>under {filters.maxBudget} usd</span>
              <button
                onClick={() => removeFilter('budget')}
                className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 cursor-pointer"
                style={{ fontSize: FONT_SIZES.base }}
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}

      {listings.length === 0 && !isLoading ? (
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)', marginTop: '-10vh' }}>
          <p className="text-black" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
            Seems there is no listings here...
          </p>
        </div>
      ) : (
        <>
          <div className={viewMode === 'column' ? 'space-y-4' : 'flex flex-wrap gap-4'} style={{ paddingRight: '60px' }}>
          {listings.map((listing) => {
            const primaryImage = listing.listing_images?.find(img => img.is_primary) || listing.listing_images?.[0]
            return (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="block border border-gray-400 p-4"
                style={viewMode === 'row' ? { aspectRatio: '1/1', display: 'flex', flexDirection: 'column', width: '420px', height: '420px' } : {}}
              >
                {viewMode === 'column' ? (
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
                                // Same month and year: "5 – 20 Jan 2025"
                                return `${fromDate.getDate()} – ${formatDate(listing.available_to)}`
                              } else if (sameYear) {
                                // Same year, different month: "25 Sept – 2 Oct 2025"
                                return `${formatDate(listing.available_from, false)} – ${formatDate(listing.available_to)}`
                              } else {
                                // Different year: "25 Sept 2024 – 2 Jan 2025"
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
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="flex flex-col gap-1 mb-2" style={{ minHeight: '88px' }}>
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
                    {primaryImage && (
                      <div className="w-full overflow-hidden flex justify-start items-start" style={{ height: 'calc(100% - 88px - 0.5rem)' }}>
                        <Image
                          src={primaryImage.thumbnail_url || primaryImage.image_url}
                          alt={`Listing in ${listing.location}`}
                          width={300}
                          height={300}
                          className="object-contain h-full"
                          style={{ height: '100%', objectFit: 'contain', objectPosition: 'left top' }}
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                )}
              </Link>
            )
          })}
          </div>
        </>
      )}
    </>
  )
}

export default function HomePage() {
  const { filters } = useFilters()
  const { viewMode } = useViewMode()

  return (
    <div className="min-h-screen bg-white">
      <main className="p-4">
        <HomePageContent filters={filters} viewMode={viewMode} />
      </main>
    </div>
  )
}