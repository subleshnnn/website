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
import { useState, useEffect } from 'react'

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

function HomePageContent({ filters, viewMode }: { filters: { city: string, type: string, maxBudget: number, dateFrom: string, dateTo: string }, viewMode: 'column' | 'row' }) {
  const { fontFamily } = useFont()
  const { setFilters } = useFilters()
  const { setViewMode } = useViewMode()
  const [widgetExpanded, setWidgetExpanded] = useState(false)
  const [cities, setCities] = useState<string[]>([])
  const [citiesDropdownOpen, setCitiesDropdownOpen] = useState(false)
  const [typesDropdownOpen, setTypesDropdownOpen] = useState(false)
  const [priceDropdownOpen, setPriceDropdownOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  const { data: allListings = [], isLoading } = useQuery({
    queryKey: ['listings'],
    queryFn: getListings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Fetch unique cities from database
  useEffect(() => {
    async function fetchCities() {
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('location')
          .not('location', 'is', null)

        if (error) {
          console.error('Error fetching cities:', error)
          return
        }

        const uniqueCities = Array.from(new Set(data.map(item => {
          if (!item.location) return null
          const location = item.location
          if (location.includes(',')) {
            return location.split(',')[0].trim()
          }
          return location.trim()
        })))
          .filter(Boolean)
          .sort()

        setCities(uniqueCities as string[])
      } catch (error) {
        console.error('Error fetching cities:', error)
      }
    }

    fetchCities()
  }, [])

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

  const types = ['Room', 'Studio', 'Apartment']
  const budgetOptions = [
    { value: 0, label: 'All' },
    { value: 100, label: '100 usd' },
    { value: 200, label: '200 usd' },
    { value: 300, label: '300 usd' },
    { value: 400, label: '400 usd' },
    { value: 500, label: '500 usd' },
    { value: 600, label: '600 usd' },
    { value: 700, label: '700 usd' },
    { value: 800, label: '800 usd' },
    { value: 900, label: '900 usd' },
    { value: 1000, label: '1000 usd' }
  ]

  return (
    <>
      {/* Subleshnn button - top left, clickable */}
      <button
        onClick={() => setWidgetExpanded(!widgetExpanded)}
        className="fixed z-10"
        style={{
          fontFamily: fontFamily,
          fontSize: FONT_SIZES.base,
          color: '#8B4513',
          fontWeight: '500',
          background: 'white',
          border: '1px solid #8B4513',
          borderRadius: widgetExpanded ? '8px 8px 0 0' : '8px',
          borderBottom: widgetExpanded ? 'none' : '1px solid #8B4513',
          cursor: 'pointer',
          padding: '7px 16px',
          top: '16px',
          left: '16px',
          height: '48px',
          boxSizing: 'border-box'
        }}
      >
        Subleshnn 🌸
      </button>

      {/* Expanded filter panel */}
      {widgetExpanded && (
        <div
          className="fixed z-10"
          style={{
            top: '64px',
            left: '16px',
            background: 'white',
            border: '1px solid #8B4513',
            borderTop: 'none',
            borderRadius: '0 8px 8px 8px',
            padding: '16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}
        >
          {/* Cities dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setCitiesDropdownOpen(!citiesDropdownOpen)
                setTypesDropdownOpen(false)
                setPriceDropdownOpen(false)
              }}
              style={{
                fontFamily: fontFamily,
                fontSize: FONT_SIZES.base,
                color: '#8B4513',
                fontWeight: '500',
                background: 'white',
                border: '1px solid #8B4513',
                borderRadius: citiesDropdownOpen ? '4px 4px 0 0' : '4px',
                cursor: 'pointer',
                padding: '7px 16px',
                minWidth: '120px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>Cities</span>
              <span style={{ marginLeft: '8px' }}>▼</span>
            </button>
            {citiesDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: 'white',
                  border: '1px solid #8B4513',
                  borderTop: 'none',
                  borderRadius: '0 0 4px 4px',
                  minWidth: '120px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 100
                }}
              >
                {cities.map((city) => (
                  <div
                    key={city}
                    style={{
                      padding: '8px 12px',
                      fontFamily: fontFamily,
                      fontSize: FONT_SIZES.base,
                      color: '#8B4513',
                      cursor: 'pointer'
                    }}
                    className="hover:bg-gray-50"
                  >
                    {city}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Types dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setTypesDropdownOpen(!typesDropdownOpen)
                setCitiesDropdownOpen(false)
                setPriceDropdownOpen(false)
              }}
              style={{
                fontFamily: fontFamily,
                fontSize: FONT_SIZES.base,
                color: '#8B4513',
                fontWeight: '500',
                background: 'white',
                border: '1px solid #8B4513',
                borderRadius: typesDropdownOpen ? '4px 4px 0 0' : '4px',
                cursor: 'pointer',
                padding: '7px 16px',
                minWidth: '120px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>Type</span>
              <span style={{ marginLeft: '8px' }}>▼</span>
            </button>
            {typesDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: 'white',
                  border: '1px solid #8B4513',
                  borderTop: 'none',
                  borderRadius: '0 0 4px 4px',
                  minWidth: '120px',
                  zIndex: 100
                }}
              >
                {types.map((type) => (
                  <div
                    key={type}
                    style={{
                      padding: '8px 12px',
                      fontFamily: fontFamily,
                      fontSize: FONT_SIZES.base,
                      color: '#8B4513',
                      cursor: 'pointer'
                    }}
                    className="hover:bg-gray-50"
                  >
                    {type}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dates */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
              style={{
                fontFamily: fontFamily,
                fontSize: FONT_SIZES.base,
                color: '#8B4513',
                border: '1px solid #8B4513',
                borderRadius: '4px',
                padding: '7px 12px',
                minWidth: '120px'
              }}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
              style={{
                fontFamily: fontFamily,
                fontSize: FONT_SIZES.base,
                color: '#8B4513',
                border: '1px solid #8B4513',
                borderRadius: '4px',
                padding: '7px 12px',
                minWidth: '120px'
              }}
            />
          </div>

          {/* Price dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setPriceDropdownOpen(!priceDropdownOpen)
                setCitiesDropdownOpen(false)
                setTypesDropdownOpen(false)
              }}
              style={{
                fontFamily: fontFamily,
                fontSize: FONT_SIZES.base,
                color: '#8B4513',
                fontWeight: '500',
                background: 'white',
                border: '1px solid #8B4513',
                borderRadius: priceDropdownOpen ? '4px 4px 0 0' : '4px',
                cursor: 'pointer',
                padding: '7px 16px',
                minWidth: '120px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>Price</span>
              <span style={{ marginLeft: '8px' }}>▼</span>
            </button>
            {priceDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: 'white',
                  border: '1px solid #8B4513',
                  borderTop: 'none',
                  borderRadius: '0 0 4px 4px',
                  minWidth: '120px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 100
                }}
              >
                {budgetOptions.map((option) => (
                  <div
                    key={option.value}
                    style={{
                      padding: '8px 12px',
                      fontFamily: fontFamily,
                      fontSize: FONT_SIZES.base,
                      color: '#8B4513',
                      cursor: 'pointer'
                    }}
                    className="hover:bg-gray-50"
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* View button */}
          <button
            onClick={() => setWidgetExpanded(false)}
            style={{
              fontFamily: fontFamily,
              fontSize: FONT_SIZES.base,
              color: 'white',
              fontWeight: '500',
              background: '#8B4513',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              padding: '7px 16px'
            }}
          >
            View
          </button>
        </div>
      )}

      {/* View Mode Switcher - fixed position, styled like profile button */}
      <button
        onClick={() => setViewMode(viewMode === 'column' ? 'row' : 'column')}
        className="fixed z-10"
        style={{
          fontFamily: fontFamily,
          fontSize: FONT_SIZES.base,
          color: '#8B4513',
          fontWeight: '500',
          background: 'white',
          border: '1px solid #8B4513',
          borderRadius: '8px',
          cursor: 'pointer',
          padding: '7px 16px',
          top: '16px',
          right: '16px',
          height: '48px',
          boxSizing: 'border-box'
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

      {listings.length === 0 && !isLoading ? (
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)', marginTop: '-10vh' }}>
          <p className="text-black" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily }}>
            Seems there is no listings here...
          </p>
        </div>
      ) : (
        <>
          <div className={viewMode === 'column' ? 'space-y-4' : ''} style={{
            paddingTop: '80px',
            ...(viewMode === 'row' && {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
              gap: '16px'
            })
          }}>
          {listings.map((listing) => {
            const primaryImage = listing.listing_images?.find(img => img.is_primary) || listing.listing_images?.[0]
            return (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="block border border-gray-400 p-4"
                style={viewMode === 'row' ? { aspectRatio: '1/1', display: 'flex', flexDirection: 'column', borderRadius: '8px' } : { borderRadius: '8px' }}
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
                      {(listing.available_from || listing.available_to) && (
                        <div className="text-gray-500" style={{ fontSize: FONT_SIZES.base, fontFamily: fontFamily, lineHeight: '1.2' }}>
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