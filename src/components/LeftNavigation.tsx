'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FONT_SIZES } from '@/lib/constants'
import { useFilters } from '@/contexts/FilterContext'
import { useFont } from '@/contexts/FontContext'

const cityColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B195', '#C06C84',
  '#6C5B7B', '#355C7D', '#99B898', '#FECEAB', '#E84A5F'
]

function getCityColor(city: string, index: number): string {
  return cityColors[index % cityColors.length]
}

export default function LeftNavigation() {
  const { filters, setFilters } = useFilters()
  const { fontFamily } = useFont()
  const { isSignedIn, isLoaded } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [profileExpanded, setProfileExpanded] = useState(false)

  // Filter state
  const [maxBudget, setMaxBudget] = useState(0)
  const [cities, setCities] = useState<string[]>([])
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const datePickerRef = useRef<HTMLDivElement>(null)
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const cityDropdownRef = useRef<HTMLDivElement>(null)
  const typeDropdownRef = useRef<HTMLDivElement>(null)

  // Animated colors state for filters
  const colors = ['#60a5fa', '#4ade80', '#f87171', '#c084fc', '#facc15', '#f472b6', '#818cf8', '#fb923c', '#2dd4bf']
  const [cityColor, setCityColor] = useState('#000000')
  const [cityInterval, setCityInterval] = useState<NodeJS.Timeout | null>(null)
  const [typeColor, setTypeColor] = useState('#000000')
  const [typeInterval, setTypeInterval] = useState<NodeJS.Timeout | null>(null)
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false)
      }
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false)
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setShowTypeDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])


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

  const toggleCity = (city: string) => {
    const currentCities = filters.cities || []
    const newCities = currentCities.includes(city)
      ? currentCities.filter(c => c !== city)
      : [...currentCities, city]

    setFilters({
      cities: newCities,
      types: filters.types || [],
      maxBudget,
      dateFrom,
      dateTo
    })
  }

  const toggleType = (type: string) => {
    const currentTypes = filters.types || []
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type]

    setFilters({
      cities: filters.cities || [],
      types: newTypes,
      maxBudget,
      dateFrom,
      dateTo
    })
  }

  const handleBudgetChange = (newBudget: number) => {
    setMaxBudget(newBudget)
    setFilters({
      cities: filters.cities || [],
      types: filters.types || [],
      maxBudget: newBudget,
      dateFrom,
      dateTo
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
            setMaxBudget(0)
            setDateFrom('')
            setDateTo('')
            setFilters({
              cities: [],
              types: [],
              maxBudget: 0,
              dateFrom: '',
              dateTo: ''
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
          ref={cityDropdownRef}
          className="relative flex justify-between items-center"
          onMouseEnter={() => startFilterAnimation(setCityColor, setCityInterval, cityInterval)}
          onMouseLeave={() => stopFilterAnimation(setCityColor, setCityInterval, cityInterval)}
        >
          <button
            onClick={() => setShowCityDropdown(!showCityDropdown)}
            className="flex-1 text-left text-black bg-transparent cursor-pointer"
            style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}
          >
            All Cities
          </button>
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

          {/* City Dropdown */}
          {showCityDropdown && (
            <div className="absolute left-64 top-0 bg-white border border-gray-400 z-50" style={{ width: '300px', maxHeight: '400px', overflowY: 'auto' }}>
              {cities.map((cityOption, index) => (
                <label
                  key={cityOption}
                  className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}
                >
                  <input
                    type="checkbox"
                    checked={(filters.cities || []).includes(cityOption)}
                    onChange={() => toggleCity(cityOption)}
                    className="mr-2"
                  />
                  <span style={{ color: getCityColor(cityOption, index) }}>{cityOption}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Type Filter */}
        <div
          ref={typeDropdownRef}
          className="relative flex justify-between items-center"
          onMouseEnter={() => startFilterAnimation(setTypeColor, setTypeInterval, typeInterval)}
          onMouseLeave={() => stopFilterAnimation(setTypeColor, setTypeInterval, typeInterval)}
        >
          <button
            onClick={() => setShowTypeDropdown(!showTypeDropdown)}
            className="flex-1 text-left text-black bg-transparent cursor-pointer"
            style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}
          >
            All Types
          </button>
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

          {/* Type Dropdown */}
          {showTypeDropdown && (
            <div className="absolute left-64 top-0 bg-white border border-gray-400 z-50" style={{ width: '300px' }}>
              {types.map((typeOption) => (
                <label
                  key={typeOption}
                  className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.base }}
                >
                  <input
                    type="checkbox"
                    checked={(filters.types || []).includes(typeOption)}
                    onChange={() => toggleType(typeOption)}
                    className="mr-2"
                  />
                  <span className="text-black">{typeOption}</span>
                </label>
              ))}
            </div>
          )}
        </div>


        {/* Dates Filter */}
        <div ref={datePickerRef} className="relative flex justify-between items-center">
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
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  setFilters({
                    cities: filters.cities || [],
                    types: filters.types || [],
                    maxBudget,
                    dateFrom: e.target.value,
                    dateTo
                  })
                }}
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
                onChange={(e) => {
                  setDateTo(e.target.value)
                  setFilters({
                    cities: filters.cities || [],
                    types: filters.types || [],
                    maxBudget,
                    dateFrom,
                    dateTo: e.target.value
                  })
                }}
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
        </div>

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
