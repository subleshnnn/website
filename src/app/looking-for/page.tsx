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
    // Fetch requests (looking_for listings)
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
      .eq('listing_type', 'looking_for')
      .order('created_at', { ascending: false })
      .limit(12)

    if (listingsError) {
      console.error('Error fetching listings:', listingsError)
      return []
    }

    if (!listings || listings.length === 0) {
      return []
    }

    // Fetch images separately for all listings
    const listingIds = listings.map(l => l.id)
    const { data: images } = await supabase
      .from('listing_images')
      .select('id, listing_id, image_url, thumbnail_url, is_primary')
      .in('listing_id', listingIds)

    // Map images to listings
    const listingsWithImages = listings.map(listing => ({
      ...listing,
      listing_images: images?.filter(img => img.listing_id === listing.id) || []
    }))

    return listingsWithImages
  } catch (error) {
    console.error('Error:', error)
    return []
  }
}

interface ListingImage {
  id: string
  listing_id?: string
  image_url: string
  thumbnail_url?: string
  is_primary: boolean
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
  listing_images: ListingImage[]
}

export default function LookingForPage() {
  const { filters, setFilters } = useFilters()
  const { fontFamily } = useFont()
  const { viewMode, setViewMode } = useViewMode()

  const { data: allListings = [], isLoading } = useQuery<ListingData[]>({
    queryKey: ['looking-for-listings'],
    queryFn: getListings,
    staleTime: 5 * 60 * 1000,
  })

  // Filter listings based on current filters
  const listings = allListings.filter((listing) => {
    if (filters.city && filters.city !== 'All Cities') {
      const listingCity = listing.location.includes(',')
        ? listing.location.split(',')[0].trim()
        : listing.location.trim()
      if (listingCity !== filters.city) return false
    }

    if (filters.type && filters.type !== 'All Types') {
      if (listing.property_type && listing.property_type !== filters.type.toLowerCase()) return false
    }

    if (filters.maxBudget > 0 && listing.price > (filters.maxBudget * 100)) return false

    return true
  })

  const removeFilter = (filterType: 'city' | 'type' | 'budget' | 'dateFrom' | 'dateTo') => {
    if (filterType === 'city') {
      setFilters({ ...filters, city: 'All Cities' })
    } else if (filterType === 'type') {
      setFilters({ ...filters, type: 'All Types' })
    } else if (filterType === 'budget') {
      setFilters({ ...filters, maxBudget: 0 })
    } else if (filterType === 'dateFrom') {
      setFilters({ ...filters, dateFrom: '' })
    } else if (filterType === 'dateTo') {
      setFilters({ ...filters, dateTo: '' })
    }
  }

  return (
    <div className="p-4">
      {/* View Mode Toggle */}
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
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-gray-500" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
          Search:
        </span>
        <span className="text-black" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
          Requests
        </span>
        {(filters.city !== 'All Cities' || filters.type !== 'All Types' || filters.maxBudget > 0 || filters.dateFrom || filters.dateTo) && (
          <>
          {filters.city && filters.city !== 'All Cities' && (
            <>
              <span className="text-gray-500" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
                &gt;
              </span>
              <div className="group inline-flex items-center text-black transition-all" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
                <span>{filters.city}</span>
                <span className="opacity-0 group-hover:opacity-100 text-red-600 cursor-pointer transition-all overflow-hidden group-hover:w-auto group-hover:ml-1" style={{ fontSize: FONT_SIZES.base, width: '0px' }} onClick={() => removeFilter('city')}>
                  ×
                </span>
              </div>
            </>
          )}
          {filters.type && filters.type !== 'All Types' && (
            <>
              <span className="text-gray-500" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
                &gt;
              </span>
              <div className="group inline-flex items-center text-black transition-all" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
                <span>{filters.type}</span>
                <span className="opacity-0 group-hover:opacity-100 text-red-600 cursor-pointer transition-all overflow-hidden group-hover:w-auto group-hover:ml-1" style={{ fontSize: FONT_SIZES.base, width: '0px' }} onClick={() => removeFilter('type')}>
                  ×
                </span>
              </div>
            </>
          )}
          {filters.maxBudget > 0 && (
            <>
              <span className="text-gray-500" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
                &gt;
              </span>
              <div className="group inline-flex items-center text-black transition-all" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
                <span>under {filters.maxBudget} usd</span>
                <span className="opacity-0 group-hover:opacity-100 text-red-600 cursor-pointer transition-all overflow-hidden group-hover:w-auto group-hover:ml-1" style={{ fontSize: FONT_SIZES.base, width: '0px' }} onClick={() => removeFilter('budget')}>
                  ×
                </span>
              </div>
            </>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <>
              <span className="text-gray-500" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
                &gt;
              </span>
              <div className="group inline-flex items-center text-black transition-all" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
                <span>
                  {filters.dateFrom && filters.dateTo
                    ? `${formatDate(filters.dateFrom, false, true)} - ${formatDate(filters.dateTo)}`
                    : filters.dateFrom
                    ? `from ${formatDate(filters.dateFrom)}`
                    : `to ${formatDate(filters.dateTo)}`}
                </span>
                <span
                  onClick={() => {
                    if (filters.dateFrom && filters.dateTo) {
                      setFilters({ ...filters, dateFrom: '', dateTo: '' })
                    } else if (filters.dateFrom) {
                      removeFilter('dateFrom')
                    } else {
                      removeFilter('dateTo')
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 text-red-600 cursor-pointer transition-all overflow-hidden group-hover:w-auto group-hover:ml-1"
                  style={{ fontSize: FONT_SIZES.base, width: '0px' }}
                >
                  ×
                </span>
              </div>
            </>
          )}
          </>
        )}
        {(filters.city !== 'All Cities' || filters.type !== 'All Types' || filters.maxBudget > 0 || filters.dateFrom || filters.dateTo) && (
          <span
            onClick={() => setFilters({ city: 'All Cities', type: 'All Types', maxBudget: 0, dateFrom: '', dateTo: '' })}
            className="text-red-600 cursor-pointer ml-2"
            style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}
          >
            ×
          </span>
        )}
      </div>

      {listings.length === 0 && !isLoading ? (
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)', marginTop: '-10vh' }}>
          <p className="text-black" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
            Seems there is no requests here...
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
                          alt={`Request in ${listing.location}`}
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
                      <div className="text-black" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily, lineHeight: '1.2' }}>
                        {(listing.price / 100).toFixed(0)} usd
                      </div>
                      <div style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily, lineHeight: '1.2' }}>
                        {(listing.available_from || listing.available_to) ? (
                          <span className="text-black">
                            {listing.available_from && listing.available_to
                              ? `${formatDate(listing.available_from, false, true)} – ${formatDate(listing.available_to)}`
                              : listing.available_from
                              ? `From ${formatDate(listing.available_from)}`
                              : listing.available_to
                              ? `Until ${formatDate(listing.available_to)}`
                              : ''}
                          </span>
                        ) : (
                          <span className="text-gray-500">Dates flexible</span>
                        )}
                      </div>
                      <div className="flex gap-2" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
                        {listing.dog_friendly && <span className="text-gray-500">🐕 friendly</span>}
                        {listing.cat_friendly && <span className="text-gray-500">🐱 friendly</span>}
                      </div>
                      <div className="text-amber-700" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
                        Request
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col justify-between">
                    <div>
                      <div style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily, lineHeight: '1.2' }}>
                        <span className="text-black">{listing.location}</span>
                        {listing.property_type && (
                          <span className="text-gray-500"> {listing.property_type}</span>
                        )}
                      </div>
                      <div className="text-black" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily, lineHeight: '1.2' }}>
                        {(listing.price / 100).toFixed(0)} usd
                      </div>
                      <div style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily, lineHeight: '1.2' }}>
                        {(listing.available_from || listing.available_to) ? (
                          <span className="text-black">
                            {listing.available_from && listing.available_to
                              ? `${formatDate(listing.available_from, false, true)} – ${formatDate(listing.available_to)}`
                              : listing.available_from
                              ? `From ${formatDate(listing.available_from)}`
                              : listing.available_to
                              ? `Until ${formatDate(listing.available_to)}`
                              : ''}
                          </span>
                        ) : (
                          <span className="text-gray-500">Dates flexible</span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-1" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
                        {listing.dog_friendly && <span className="text-gray-500">🐕 friendly</span>}
                        {listing.cat_friendly && <span className="text-gray-500">🐱 friendly</span>}
                      </div>
                      <div className="text-amber-700 mt-1" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
                        Request
                      </div>
                    </div>
                    {primaryImage && (
                      <div className="mt-4">
                        <Image
                          src={primaryImage.thumbnail_url || primaryImage.image_url}
                          alt={`Request in ${listing.location}`}
                          width={352}
                          height={264}
                          className="object-cover w-full"
                          style={{ maxHeight: '264px' }}
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
    </div>
  )
}
