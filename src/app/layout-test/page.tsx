'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FONT_SIZES, FONT_FAMILY } from '@/lib/constants'

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

    const listingIds = listings.map(l => l.id)
    const { data: images, error: imagesError } = await supabase
      .from('listing_images')
      .select('listing_id, image_url, thumbnail_url, is_primary')
      .in('listing_id', listingIds)

    if (imagesError) {
      console.error('Error fetching images:', imagesError)
      return listings.map(listing => ({ ...listing, listing_images: [] }))
    }

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

export default function LayoutTestPage() {
  const { isSignedIn, isLoaded } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<'column' | 'row'>('column')
  const [profileExpanded, setProfileExpanded] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    setProfileExpanded(false)
    router.push('/')
  }

  // Filter state
  const [selectedView, setSelectedView] = useState('Sublets')
  const [city, setCity] = useState('')
  const [type, setType] = useState('')
  const [maxBudget, setMaxBudget] = useState(1000)
  const [cities, setCities] = useState<string[]>(['All Cities'])

  // Animated colors state for filters
  const colors = ['#60a5fa', '#4ade80', '#f87171', '#c084fc', '#facc15', '#f472b6', '#818cf8', '#fb923c', '#2dd4bf']
  const [cityColor, setCityColor] = useState('#9ca3af')
  const [cityInterval, setCityInterval] = useState<NodeJS.Timeout | null>(null)
  const [typeColor, setTypeColor] = useState('#9ca3af')
  const [typeInterval, setTypeInterval] = useState<NodeJS.Timeout | null>(null)
  const [viewColor, setViewColor] = useState('#9ca3af')
  const [viewInterval, setViewInterval] = useState<NodeJS.Timeout | null>(null)
  const [budgetColor, setBudgetColor] = useState('#9ca3af')
  const [budgetInterval, setBudgetInterval] = useState<NodeJS.Timeout | null>(null)

  // Animation colors for the main link
  const [isAnimating, setIsAnimating] = useState(false)
  const [animatedColor, setAnimatedColor] = useState('')
  const [linkInterval, setLinkInterval] = useState<NodeJS.Timeout | null>(null)

  const startAnimation = () => {
    if (linkInterval) return
    setIsAnimating(true)
    const interval = setInterval(() => {
      setAnimatedColor(colors[Math.floor(Math.random() * colors.length)])
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

  const startFilterAnimation = (
    colorSetter: (c: string) => void,
    intervalSetter: (i: NodeJS.Timeout | null) => void,
    currentInterval: NodeJS.Timeout | null
  ) => {
    if (currentInterval) return

    const interval = setInterval(() => {
      colorSetter(colors[Math.floor(Math.random() * colors.length)])
    }, 100)
    intervalSetter(interval)
  }

  const stopFilterAnimation = (
    colorSetter: (c: string) => void,
    intervalSetter: (i: NodeJS.Timeout | null) => void,
    currentInterval: NodeJS.Timeout | null
  ) => {
    if (currentInterval) {
      clearInterval(currentInterval)
      intervalSetter(null)
      colorSetter('#9ca3af')
    }
  }

  const { data: allListings = [], isLoading } = useQuery({
    queryKey: ['listings'],
    queryFn: getListings,
    staleTime: 5 * 60 * 1000,
  })

  // Filter listings based on current filters
  const listings = allListings.filter((listing) => {
    // City filter
    if (city && city !== 'All Cities') {
      const locationLower = listing.location.toLowerCase()
      const filterCityLower = city.toLowerCase()

      if (!locationLower.includes(filterCityLower)) return false
    }

    // Type filter
    if (type && type !== 'All Types') {
      const propertyType = (listing as unknown as {property_type?: string}).property_type
      if (propertyType && propertyType.toLowerCase() !== type.toLowerCase()) return false
    }

    // Budget filter
    if (listing.price > (maxBudget * 100)) return false

    return true
  })

  useEffect(() => {
    setMounted(true)

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'c' || e.key === 'C') {
        setViewMode('column')
      } else if (e.key === 'r' || e.key === 'R') {
        setViewMode('row')
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Update selectedView based on current pathname
  useEffect(() => {
    if (pathname === '/looking-for') {
      setSelectedView('Requests')
    } else {
      setSelectedView('Sublets')
    }
  }, [pathname])

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

        setCities(['All Cities', ...uniqueCities])
      } catch (error) {
        console.error('Error fetching cities:', error)
      }
    }

    fetchCities()
  }, [])

  const types = [
    'All Types',
    'Room',
    'Studio',
    'Apartment'
  ]

  const budgetOptions = [
    100, 200, 300, 400, 500, 600, 700, 800, 900, 1000
  ]

  const handleCityChange = (newCity: string) => {
    setCity(newCity)
  }

  const handleTypeChange = (newType: string) => {
    setType(newType)
  }

  const handleBudgetChange = (newBudget: number) => {
    setMaxBudget(newBudget)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
        {/* Left Column - Navigation and Description */}
        <div className="fixed left-0 top-0 h-screen w-64 p-4 flex flex-col border-r border-black">
          {/* Logo */}
          <div className="mb-4">
            <Link
              href="/layout-test"
              className="text-black"
              style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base }}
            >
              Subleshnn
            </Link>
          </div>

          {/* Filter Navigation */}
          <div className="flex flex-col gap-1 mb-4">
            {/* City Filter */}
            <div
              className="relative flex justify-between items-center"
              onMouseEnter={() => startFilterAnimation(setCityColor, setCityInterval, cityInterval)}
              onMouseLeave={() => stopFilterAnimation(setCityColor, setCityInterval, cityInterval)}
            >
              <select
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
                className="focus:outline-none text-black bg-transparent appearance-none cursor-pointer flex-1"
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: FONT_SIZES.base,
                  border: 'none',
                }}
              >
                {cities.map((cityOption) => (
                  <option key={cityOption} value={cityOption}>
                    {cityOption}
                  </option>
                ))}
              </select>
              <span
                className="pointer-events-none"
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: FONT_SIZES.base,
                  color: cityColor
                }}
              >
                +
              </span>
            </div>

            {/* Type Filter */}
            <div
              className="relative flex justify-between items-center"
              onMouseEnter={() => startFilterAnimation(setTypeColor, setTypeInterval, typeInterval)}
              onMouseLeave={() => stopFilterAnimation(setTypeColor, setTypeInterval, typeInterval)}
            >
              <select
                value={type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="focus:outline-none text-black bg-transparent appearance-none cursor-pointer flex-1"
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: FONT_SIZES.base,
                  border: 'none',
                }}
              >
                {types.map((typeOption) => (
                  <option key={typeOption} value={typeOption}>
                    {typeOption}
                  </option>
                ))}
              </select>
              <span
                className="pointer-events-none"
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: FONT_SIZES.base,
                  color: typeColor
                }}
              >
                +
              </span>
            </div>

            {/* Sublets/Requests Dropdown */}
            <div
              className="relative flex justify-between items-center"
              onMouseEnter={() => startFilterAnimation(setViewColor, setViewInterval, viewInterval)}
              onMouseLeave={() => stopFilterAnimation(setViewColor, setViewInterval, viewInterval)}
            >
              <select
                value={selectedView}
                onChange={(e) => {
                  const newView = e.target.value
                  setSelectedView(newView)
                  // Keep on same page for now, just update view
                  // Can be changed to navigate to different pages later
                }}
                className="focus:outline-none text-black bg-transparent appearance-none cursor-pointer flex-1"
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: FONT_SIZES.base,
                  border: 'none',
                }}
              >
                <option value="Sublets">Sublets</option>
                <option value="Requests">Requests</option>
              </select>
              <span
                className="pointer-events-none"
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: FONT_SIZES.base,
                  color: viewColor
                }}
              >
                +
              </span>
            </div>

            {/* Budget Filter */}
            <div
              className="relative flex justify-between items-center"
              onMouseEnter={() => startFilterAnimation(setBudgetColor, setBudgetInterval, budgetInterval)}
              onMouseLeave={() => stopFilterAnimation(setBudgetColor, setBudgetInterval, budgetInterval)}
            >
              <select
                value={maxBudget}
                onChange={(e) => handleBudgetChange(parseInt(e.target.value))}
                className="focus:outline-none text-black bg-transparent appearance-none cursor-pointer flex-1"
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: FONT_SIZES.base,
                  border: 'none',
                }}
              >
                {budgetOptions.map((budget) => (
                  <option key={budget} value={budget}>
                    {budget} usd
                  </option>
                ))}
              </select>
              <span
                className="pointer-events-none"
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: FONT_SIZES.base,
                  color: budgetColor
                }}
              >
                +
              </span>
            </div>
          </div>

          {/* Empty line separator */}
          <div className="mb-1"></div>

          {/* User Menu Links */}
          <div className="flex flex-col gap-1">
            {!mounted || !isLoaded ? (
              <div className="text-black" style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base }}>
                Loading...
              </div>
            ) : isSignedIn ? (
              <>
                <button
                  onClick={() => setProfileExpanded(!profileExpanded)}
                  className="text-black text-left"
                  style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base }}
                >
                  Profile
                </button>
                {profileExpanded && (
                  <>
                    <Link
                      href="/dashboard"
                      className="text-black block pl-4"
                      style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base }}
                    >
                      Sublets
                    </Link>
                    <Link
                      href="/dashboard"
                      className="text-black block pl-4"
                      style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base }}
                    >
                      Requests
                    </Link>
                    <Link
                      href="/dashboard/create"
                      className="text-black block pl-4"
                      style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base }}
                    >
                      Add (+)
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="text-black block pl-4 text-left"
                      style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base }}
                    >
                      Logout
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-black block"
                  style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base }}
                >
                  Member Sign In
                </Link>
                <div className="text-black" style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base }}>
                  Invite Only
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column - Listings */}
        <div className="ml-64 flex-1 p-4">
          {listings.length === 0 && !isLoading ? (
            <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
              <p className="text-black" style={{ fontSize: FONT_SIZES.base, fontFamily: FONT_FAMILY }}>
                Seems there is no listings here...
              </p>
            </div>
          ) : (
            <>
              {/* City name at top */}
              {city && city !== 'All Cities' && (
                <div className="text-black mb-8" style={{ fontSize: FONT_SIZES.base, fontFamily: FONT_FAMILY }}>
                  {city}
                </div>
              )}

              <div className={viewMode === 'column' ? 'space-y-24' : 'grid grid-cols-2 md:grid-cols-3 gap-8'}>
                {listings.map((listing) => {
                  const primaryImage = listing.listing_images?.find(img => img.is_primary) || listing.listing_images?.[0]
                  return (
                    <div key={listing.id} className="text-center">
                      <div style={{ height: '100px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                        <div className="text-black" style={{ fontSize: '20px', fontFamily: FONT_FAMILY }}>
                          {listing.location}
                        </div>
                      <div className="text-black" style={{ fontSize: '20px', fontFamily: FONT_FAMILY }}>
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
                      <div className="text-black" style={{ fontSize: '20px', fontFamily: FONT_FAMILY }}>
                        {(listing.price / 100).toFixed(0)} usd
                        {(listing.dog_friendly || listing.cat_friendly) && (
                          <span className="text-amber-700 ml-2">
                            {listing.dog_friendly && '🐕 friendly '}
                            {listing.cat_friendly && '🐱 friendly'}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/listings/${listing.id}`}
                      className="inline-block"
                    >
                      {primaryImage ? (
                        <Image
                          src={primaryImage.thumbnail_url || primaryImage.image_url}
                          alt={`Listing in ${listing.location}`}
                          width={viewMode === 'column' ? 600 : 300}
                          height={viewMode === 'column' ? 600 : 300}
                          className="h-auto w-full"
                          style={{ maxHeight: viewMode === 'column' ? '600px' : '300px', objectFit: 'contain' }}
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
