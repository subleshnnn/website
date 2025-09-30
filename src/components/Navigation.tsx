'use client'

import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { useState, useEffect, memo } from 'react'
import { supabase } from '@/lib/supabase'
import { FONT_SIZES, FONT_FAMILY } from '@/lib/constants'
import { useRouter, usePathname } from 'next/navigation'

// Global styles for underline links
if (typeof window !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    .nav-link {
      position: relative;
    }
    .nav-link::after {
      content: '';
      position: absolute;
      bottom: 2px;
      left: 0;
      right: 0;
      height: 1px;
      background-color: transparent;
    }
    .nav-link:hover::after {
      background-color: currentColor;
    }
  `
  document.head.appendChild(style)
}

interface NavigationProps {
  onFiltersChange?: (filters: { city: string, type: string, maxBudget: number }) => void
}

function Navigation({ onFiltersChange }: NavigationProps = {}) {
  const { isSignedIn, isLoaded } = useUser()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Filter state
  const [selectedView, setSelectedView] = useState('Sublets')
  const [city, setCity] = useState('')
  const [type, setType] = useState('')
  const [maxBudget, setMaxBudget] = useState(1000)
  const [cities, setCities] = useState<string[]>(['All Cities'])

  // Animated colors state
  const colors = ['text-blue-400', 'text-green-400', 'text-red-400', 'text-purple-400', 'text-yellow-400', 'text-pink-400', 'text-indigo-400', 'text-orange-400', 'text-teal-400']
  const [cityColor, setCityColor] = useState('text-gray-400')
  const [cityInterval, setCityInterval] = useState<NodeJS.Timeout | null>(null)
  const [typeColor, setTypeColor] = useState('text-gray-400')
  const [typeInterval, setTypeInterval] = useState<NodeJS.Timeout | null>(null)
  const [viewColor, setViewColor] = useState('text-gray-400')
  const [viewInterval, setViewInterval] = useState<NodeJS.Timeout | null>(null)
  const [budgetColor, setBudgetColor] = useState('text-gray-400')
  const [budgetInterval, setBudgetInterval] = useState<NodeJS.Timeout | null>(null)

  const startAnimation = (
    colorSetter: (c: string) => void,
    intervalSetter: (i: NodeJS.Timeout | null) => void,
    currentInterval: NodeJS.Timeout | null
  ) => {
    if (currentInterval) return // Already animating

    const interval = setInterval(() => {
      colorSetter(colors[Math.floor(Math.random() * colors.length)])
    }, 100)
    intervalSetter(interval)
  }

  const stopAnimation = (
    colorSetter: (c: string) => void,
    intervalSetter: (i: NodeJS.Timeout | null) => void,
    currentInterval: NodeJS.Timeout | null
  ) => {
    if (currentInterval) {
      clearInterval(currentInterval)
      intervalSetter(null)
      colorSetter('text-gray-400')
    }
  }

  useEffect(() => {
    setMounted(true)
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

        // Extract just city names from full addresses
        const uniqueCities = Array.from(new Set(data.map(item => {
          if (!item.location) return null

          // Try to extract city name from various address formats
          const location = item.location

          // If it contains commas, take the first part (likely city name)
          if (location.includes(',')) {
            return location.split(',')[0].trim()
          }

          // If it's already just a city name, use as is
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

  const handleFilterChange = () => {
    if (onFiltersChange) {
      onFiltersChange({
        city: city === 'All Cities' ? '' : city,
        type: type === 'All Types' ? '' : type,
        maxBudget
      })
    }
  }

  const handleCityChange = (newCity: string) => {
    setCity(newCity)
    setTimeout(() => {
      if (onFiltersChange) {
        onFiltersChange({
          city: newCity === 'All Cities' ? '' : newCity,
          type: type === 'All Types' ? '' : type,
          maxBudget
        })
      }
    }, 0)
  }

  const handleTypeChange = (newType: string) => {
    setType(newType)
    setTimeout(() => {
      if (onFiltersChange) {
        onFiltersChange({
          city: city === 'All Cities' ? '' : city,
          type: newType === 'All Types' ? '' : newType,
          maxBudget
        })
      }
    }, 0)
  }

  const handleBudgetChange = (newBudget: number) => {
    setMaxBudget(newBudget)
    setTimeout(() => {
      if (onFiltersChange) {
        onFiltersChange({
          city: city === 'All Cities' ? '' : city,
          type: type === 'All Types' ? '' : type,
          maxBudget: newBudget
        })
      }
    }, 0)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-black" style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base }}>
              Subleshnn
            </Link>
          </div>

          {/* Desktop menu with integrated filters - hide at 1100px */}
          <div className="hidden xl:flex items-center justify-center flex-1">
            <div className="flex items-center space-x-6">
              {/* City Filter */}
              <div
                className="relative inline-block"
                style={{ zIndex: 100 }}
                onMouseEnter={() => startAnimation(setCityColor, setCityInterval, cityInterval)}
                onMouseLeave={() => stopAnimation(setCityColor, setCityInterval, cityInterval)}
              >
                <select
                  value={city}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="px-2 py-1 focus:outline-none text-black bg-transparent appearance-none cursor-pointer"
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: FONT_SIZES.base,
                    border: 'none',
                    paddingRight: '20px',
                    position: 'relative'
                  }}
                >
                  {cities.map((cityOption) => (
                    <option key={cityOption} value={cityOption}>
                      {cityOption}
                    </option>
                  ))}
                </select>
                <span className={`absolute pointer-events-none ${cityColor}`} style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base, right: '-0.5ch', top: 'calc(50% + 2px)', transform: 'translateY(-50%)' }}>
                  +
                </span>
              </div>

              {/* Type Filter */}
              <div
                className="relative inline-block"
                style={{ zIndex: 100 }}
                onMouseEnter={() => startAnimation(setTypeColor, setTypeInterval, typeInterval)}
                onMouseLeave={() => stopAnimation(setTypeColor, setTypeInterval, typeInterval)}
              >
                <select
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="px-2 py-1 focus:outline-none text-black bg-transparent appearance-none cursor-pointer"
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: FONT_SIZES.base,
                    border: 'none',
                    paddingRight: '20px',
                    position: 'relative'
                  }}
                >
                  {types.map((typeOption) => (
                    <option key={typeOption} value={typeOption}>
                      {typeOption}
                    </option>
                  ))}
                </select>
                <span className={`absolute pointer-events-none ${typeColor}`} style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base, right: '-0.5ch', top: 'calc(50% + 2px)', transform: 'translateY(-50%)' }}>
                  +
                </span>
              </div>

              {/* Sublets/Requests Dropdown */}
              <div
                className="relative inline-block"
                style={{ zIndex: 100 }}
                onMouseEnter={() => startAnimation(setViewColor, setViewInterval, viewInterval)}
                onMouseLeave={() => stopAnimation(setViewColor, setViewInterval, viewInterval)}
              >
                <select
                  value={selectedView}
                  onChange={(e) => {
                    const newView = e.target.value
                    setSelectedView(newView)
                    if (newView === 'Requests') {
                      router.push('/looking-for')
                    } else {
                      router.push('/')
                    }
                  }}
                  className="px-2 py-1 focus:outline-none text-black bg-transparent appearance-none cursor-pointer"
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: FONT_SIZES.base,
                    border: 'none',
                    paddingRight: '20px',
                    position: 'relative'
                  }}
                >
                  <option value="Sublets">Sublets</option>
                  <option value="Requests">Requests</option>
                </select>
                <span className={`absolute pointer-events-none ${viewColor}`} style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base, right: '-0.5ch', top: 'calc(50% + 2px)', transform: 'translateY(-50%)' }}>
                  +
                </span>
              </div>

              {/* Budget Filter */}
              <div
                className="relative inline-block"
                style={{ zIndex: 100 }}
                onMouseEnter={() => startAnimation(setBudgetColor, setBudgetInterval, budgetInterval)}
                onMouseLeave={() => stopAnimation(setBudgetColor, setBudgetInterval, budgetInterval)}
              >
                <select
                  value={maxBudget}
                  onChange={(e) => handleBudgetChange(parseInt(e.target.value))}
                  className="px-2 py-1 focus:outline-none text-black bg-transparent appearance-none cursor-pointer"
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: FONT_SIZES.base,
                    border: 'none',
                    paddingRight: '20px',
                    position: 'relative'
                  }}
                >
                  {budgetOptions.map((budget) => (
                    <option key={budget} value={budget}>
                      {budget} usd
                    </option>
                  ))}
                </select>
                <span className={`absolute pointer-events-none ${budgetColor}`} style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base, right: '-0.5ch', top: 'calc(50% + 2px)', transform: 'translateY(-50%)' }}>
                  +
                </span>
              </div>
            </div>
          </div>


          {/* Right side */}
          <div className="flex items-center space-x-4">
            {!mounted || !isLoaded ? (
              // Show loading state to prevent hydration mismatch
              <div className="hidden sm:block text-lg text-black px-3 py-2">
                Loading...
              </div>
            ) : isSignedIn ? (
              <>
                <Link href="/dashboard" className="hidden xl:block text-black nav-link" style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base }}>
                  Profile
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-black hover:text-gray-600 xl:hidden flex flex-col items-end"
                  style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base }}
                >
                  <div style={{ marginBottom: '-28px' }}>—</div>
                  <div style={{ marginBottom: '-28px' }}>—</div>
                  <div>—</div>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-black nav-link"
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
      </div>
      
      {/* Full screen menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white">
          {/* Navigation bar replica with black line */}
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Link href="/" className="text-black" style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base }}>
                Subleshnn
              </Link>
            </div>
          </div>
          <div className="border-b border-black"></div>

          {/* Menu items - vertical list aligned left */}
          <div className="flex flex-col pb-16">
            {/* City Filter */}
            <div className="relative px-4 sm:px-6 lg:px-8 border-b border-black flex items-center" style={{ height: '64px' }}>
              <select
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
                className="py-1 focus:outline-none text-black bg-transparent appearance-none cursor-pointer w-full"
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: FONT_SIZES.base,
                  border: 'none',
                  paddingLeft: 0,
                  paddingRight: 0
                }}
              >
                {cities.map((cityOption) => (
                  <option key={cityOption} value={cityOption}>
                    {cityOption}
                  </option>
                ))}
              </select>
              <span className="absolute pointer-events-none text-gray-400 right-4 sm:right-6 lg:right-8" style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base, top: '50%', transform: 'translateY(-50%)' }}>
                +
              </span>
            </div>

            {/* Type Filter */}
            <div className="relative px-4 sm:px-6 lg:px-8 border-b border-black flex items-center" style={{ height: '64px' }}>
              <select
                value={type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="py-1 focus:outline-none text-black bg-transparent appearance-none cursor-pointer w-full"
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: FONT_SIZES.base,
                  border: 'none',
                  paddingLeft: 0,
                  paddingRight: 0
                }}
              >
                {types.map((typeOption) => (
                  <option key={typeOption} value={typeOption}>
                    {typeOption}
                  </option>
                ))}
              </select>
              <span className="absolute pointer-events-none text-gray-400 right-4 sm:right-6 lg:right-8" style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base, top: '50%', transform: 'translateY(-50%)' }}>
                +
              </span>
            </div>

            {/* Sublets/Requests */}
            <div className="relative px-4 sm:px-6 lg:px-8 border-b border-black flex items-center" style={{ height: '64px' }}>
              <select
                value={selectedView}
                onChange={(e) => {
                  const newView = e.target.value
                  setSelectedView(newView)
                  if (newView === 'Requests') {
                    router.push('/looking-for')
                  } else {
                    router.push('/')
                  }
                  setIsMobileMenuOpen(false)
                }}
                className="py-1 focus:outline-none text-black bg-transparent appearance-none cursor-pointer w-full"
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: FONT_SIZES.base,
                  border: 'none',
                  paddingLeft: 0,
                  paddingRight: 0
                }}
              >
                <option value="Sublets">Sublets</option>
                <option value="Requests">Requests</option>
              </select>
              <span className="absolute pointer-events-none text-gray-400 right-4 sm:right-6 lg:right-8" style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base, top: '50%', transform: 'translateY(-50%)' }}>
                +
              </span>
            </div>

            {/* Budget Filter */}
            <div className="relative px-4 sm:px-6 lg:px-8 border-b border-black flex items-center" style={{ height: '64px' }}>
              <select
                value={maxBudget}
                onChange={(e) => handleBudgetChange(parseInt(e.target.value))}
                className="py-1 focus:outline-none text-black bg-transparent appearance-none cursor-pointer w-full"
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: FONT_SIZES.base,
                  border: 'none',
                  paddingLeft: 0,
                  paddingRight: 0
                }}
              >
                {budgetOptions.map((budget) => (
                  <option key={budget} value={budget}>
                    {budget} usd
                  </option>
                ))}
              </select>
              <span className="absolute pointer-events-none text-gray-400 right-4 sm:right-6 lg:right-8" style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base, top: '50%', transform: 'translateY(-50%)' }}>
                +
              </span>
            </div>

            {/* User menu items */}
            {!mounted || !isLoaded ? (
              <div className="px-4 sm:px-6 lg:px-8 text-black flex items-center" style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base, height: '64px' }}>Loading...</div>
            ) : isSignedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="px-4 sm:px-6 lg:px-8 border-b border-black text-black transition-colors flex items-center"
                  style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base, height: '64px' }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  href="/dashboard/create"
                  className="px-4 sm:px-6 lg:px-8 text-black transition-colors flex items-center"
                  style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base, height: '64px' }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Add Sublet (+)
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="px-4 sm:px-6 lg:px-8 text-black transition-colors flex items-center"
                  style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base, height: '64px' }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Member Sign In
                </Link>
                <div className="px-4 sm:px-6 lg:px-8 text-black flex items-center" style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base, height: '64px' }}>
                  Invite Only
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Menu close button */}
      {isMobileMenuOpen && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-black hover:text-black"
            style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.base }}
          >
            X
          </button>
        </div>
      )}
    </nav>
  )
}

export default memo(Navigation)