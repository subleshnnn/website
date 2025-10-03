'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FONT_SIZES } from '@/lib/constants'
import { useFilters } from '@/contexts/FilterContext'
import { useFont } from '@/contexts/FontContext'
import { useViewMode } from '@/contexts/ViewModeContext'

export default function LeftNavigation() {
  const { setFilters } = useFilters()
  const { fontFamily } = useFont()
  const { viewMode, setViewMode } = useViewMode()
  const { isSignedIn, isLoaded } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [profileExpanded, setProfileExpanded] = useState(false)

  // Filter state
  const [selectedView, setSelectedView] = useState('All Posts')
  const [city, setCity] = useState('All Cities')
  const [type, setType] = useState('All Types')
  const [maxBudget, setMaxBudget] = useState(0)
  const [cities, setCities] = useState<string[]>(['All Cities'])
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  // Animated colors state for filters
  const colors = ['#60a5fa', '#4ade80', '#f87171', '#c084fc', '#facc15', '#f472b6', '#818cf8', '#fb923c', '#2dd4bf']
  const [cityColor, setCityColor] = useState('#000000')
  const [cityInterval, setCityInterval] = useState<NodeJS.Timeout | null>(null)
  const [typeColor, setTypeColor] = useState('#000000')
  const [typeInterval, setTypeInterval] = useState<NodeJS.Timeout | null>(null)
  const [viewColor, setViewColor] = useState('#000000')
  const [viewInterval, setViewInterval] = useState<NodeJS.Timeout | null>(null)
  const [budgetColor, setBudgetColor] = useState('#000000')
  const [budgetInterval, setBudgetInterval] = useState<NodeJS.Timeout | null>(null)

  const handleSignOut = async () => {
    await signOut()
    setProfileExpanded(false)
    router.push('/')
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
      colorSetter('#000000')
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
      setSelectedView('All Posts')
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
    { value: 0, label: 'Price' },
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

  const handleCityChange = (newCity: string) => {
    setCity(newCity)
    setFilters({
      city: newCity,
      type: type,
      maxBudget
    })
  }

  const handleTypeChange = (newType: string) => {
    setType(newType)
    setFilters({
      city: city,
      type: newType,
      maxBudget
    })
  }

  const handleBudgetChange = (newBudget: number) => {
    setMaxBudget(newBudget)
    setFilters({
      city: city,
      type: type,
      maxBudget: newBudget
    })
  }

  return (
    <div className="fixed left-0 top-0 h-screen w-64 p-4 flex flex-col bg-white z-50">
      {/* Logo */}
      <div className="mb-4">
        <Link
          href="/"
          className="text-black"
          style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}
          onClick={() => {
            setCity('All Cities')
            setType('All Types')
            setMaxBudget(0)
            setSelectedView('All Posts')
            setFilters({
              city: 'All Cities',
              type: 'All Types',
              maxBudget: 0
            })
          }}
        >
          Subleshnn
        </Link>
      </div>

      {/* Filter Navigation */}
      <div className="flex flex-col gap-0 mb-4">
        {/* City Filter */}
        <div
          className="relative flex justify-between items-center"
          onMouseEnter={() => startFilterAnimation(setCityColor, setCityInterval, cityInterval)}
          onMouseLeave={() => stopFilterAnimation(setCityColor, setCityInterval, cityInterval)}
        >
          <div className="flex-1 relative">
            <span className="text-black" style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}>
              All Cities
            </span>
            <select
              value={city}
              onChange={(e) => handleCityChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
            >
              {cities.map((cityOption) => (
                <option key={cityOption} value={cityOption}>
                  {cityOption}
                </option>
              ))}
            </select>
          </div>
          <span
            className="pointer-events-none"
            style={{
              fontFamily: fontFamily,
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
          <div className="flex-1 relative">
            <span className="text-black" style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}>
              All Types
            </span>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
            >
              {types.map((typeOption) => (
                <option key={typeOption} value={typeOption}>
                  {typeOption}
                </option>
              ))}
            </select>
          </div>
          <span
            className="pointer-events-none"
            style={{
              fontFamily: fontFamily,
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
          <div className="flex-1 relative">
            <span className="text-black" style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}>
              All Posts
            </span>
            <select
              value={selectedView}
              onChange={(e) => {
                const newView = e.target.value
                setSelectedView(newView)
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
            >
              <option value="All Posts">All Posts</option>
              <option value="Sublets">Sublets</option>
              <option value="Requests">Requests</option>
            </select>
          </div>
          <span
            className="pointer-events-none"
            style={{
              fontFamily: fontFamily,
              fontSize: FONT_SIZES.base,
              color: viewColor
            }}
          >
            +
          </span>
        </div>

        {/* Dates Filter */}
        <div className="relative flex justify-between items-center">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex-1 text-left text-black bg-transparent cursor-pointer"
            style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}
          >
            Dates
          </button>
          <span
            className="pointer-events-none"
            style={{
              fontFamily: fontFamily,
              fontSize: FONT_SIZES.base,
              color: '#000000'
            }}
          >
            +
          </span>
        </div>

        {/* Date Picker Popup */}
        {showDatePicker && (
          <div className="absolute left-64 top-0 bg-white border border-gray-400 p-4 z-50" style={{ width: '300px' }}>
            <div className="mb-4">
              <label className="block text-black mb-2" style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}>
                From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border border-gray-400 p-2 text-black"
                style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}
              />
            </div>
            <div className="mb-4">
              <label className="block text-black mb-2" style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}>
                To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full border border-gray-400 p-2 text-black"
                style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}
              />
            </div>
            <button
              onClick={() => setShowDatePicker(false)}
              className="w-full bg-black text-white p-2 cursor-pointer"
              style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}
            >
              Apply
            </button>
          </div>
        )}

        {/* Budget Filter */}
        <div
          className="relative flex justify-between items-center"
          onMouseEnter={() => startFilterAnimation(setBudgetColor, setBudgetInterval, budgetInterval)}
          onMouseLeave={() => stopFilterAnimation(setBudgetColor, setBudgetInterval, budgetInterval)}
        >
          <div className="flex-1 relative">
            <span className="text-black" style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}>
              Price
            </span>
            <select
              value={maxBudget}
              onChange={(e) => handleBudgetChange(parseInt(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
            >
              {budgetOptions.map((budget) => (
                <option key={budget.value} value={budget.value}>
                  {budget.label}
                </option>
              ))}
            </select>
          </div>
          <span
            className="pointer-events-none"
            style={{
              fontFamily: fontFamily,
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
      <div className="flex flex-col gap-0">
        {!mounted || !isLoaded ? (
          <div className="text-black" style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}>
            Loading...
          </div>
        ) : isSignedIn ? (
          <>
            <Link
              href="/dashboard"
              onClick={() => setProfileExpanded(!profileExpanded)}
              className="text-black block"
              style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}
            >
              Profile
            </Link>
            {profileExpanded && (
              <>
                <Link
                  href="/dashboard/create"
                  className="text-black block pl-4"
                  style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}
                >
                  Add (+)
                </Link>
                <Link
                  href="/favorites"
                  className="text-black block pl-4"
                  style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}
                >
                  Favs
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-black block pl-4 text-left"
                  style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}
                >
                  Logout
                </button>
                <Link
                  href="/account"
                  className="text-black block pl-4"
                  style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}
                >
                  User Info
                </Link>
              </>
            )}
          </>
        ) : (
          <Link
            href="/sign-in"
            className="text-black block"
            style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}
          >
            Sign In
          </Link>
        )}
      </div>
    </div>
  )
}
