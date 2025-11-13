'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FONT_SIZES } from '@/lib/constants'
import { useFilters } from '@/contexts/FilterContext'
import { useFont } from '@/contexts/FontContext'
import { DateRangePicker, RangeKeyDict } from 'react-date-range'
import 'react-date-range/dist/styles.css'
import 'react-date-range/dist/theme/default.css'
import { format } from 'date-fns'

const cityColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B195', '#C06C84',
  '#6C5B7B', '#355C7D', '#99B898', '#FECEAB', '#E84A5F'
]

function getCityColor(city: string, index: number): string {
  return cityColors[index % cityColors.length]
}

export default function MobileNavigation() {
  const { filters, setFilters } = useFilters()
  const { fontFamily } = useFont()
  const { isSignedIn, isLoaded, user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const pathname = usePathname()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Check if we're on the home page
  const isHomePage = pathname === '/'

  // Filter state
  const [maxBudget, setMaxBudget] = useState(1000)
  const [cities, setCities] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [listingsCount, setListingsCount] = useState(0)
  const [mySubletCount, setMySubletCount] = useState(0)
  const [favsCount, setFavsCount] = useState(0)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: 'selection'
    }
  ])
  const datePickerButtonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent body scroll when filters or profile menu is open
  useEffect(() => {
    if (filtersOpen || profileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [filtersOpen, profileOpen])

  // Fetch and calculate filtered listings count
  useEffect(() => {
    async function fetchListingsCount() {
      if (!filtersOpen) return

      try {
        const { data, error } = await supabase
          .from('listings')
          .select('id, location, price, property_type')
          .or('listing_type.eq.subletting,listing_type.is.null')

        if (error) {
          console.error('Error fetching listings:', error)
          setListingsCount(0)
          return
        }

        const filteredListings = (data || []).filter((listing) => {
          // City filter
          if (filters.cities && filters.cities.length > 0) {
            const locationLower = listing.location?.toLowerCase() || ''
            const matchesCity = filters.cities.some(city =>
              locationLower.includes(city.toLowerCase())
            )
            if (!matchesCity) return false
          }

          // Type filter
          if (filters.types && filters.types.length > 0) {
            const propertyType = listing.property_type
            if (!propertyType || !filters.types.some(type =>
              propertyType.toLowerCase() === type.toLowerCase()
            )) return false
          }

          // Budget filter
          if (filters.maxBudget > 0 && listing.price > (filters.maxBudget * 100)) return false

          return true
        })

        setListingsCount(filteredListings.length)
      } catch (error) {
        console.error('Error:', error)
        setListingsCount(0)
      }
    }

    fetchListingsCount()
  }, [filtersOpen, filters.cities, filters.types, filters.maxBudget])

  // Fetch user's sublet count and favorites count
  useEffect(() => {
    async function fetchUserCounts() {
      if (!profileOpen || !isSignedIn || !mounted || !isLoaded || !user) return

      try {
        // Fetch user's sublets count
        const { data: subletsData, error: subletsError } = await supabase
          .from('listings')
          .select('id')
          .eq('user_id', user.id)

        if (!subletsError) {
          setMySubletCount(subletsData?.length || 0)
        }

        // Fetch favorites count
        const { data: favsData, error: favsError } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)

        if (!favsError) {
          setFavsCount(favsData?.length || 0)
        }
      } catch (error) {
        console.error('Error fetching user counts:', error)
      }
    }

    fetchUserCounts()
  }, [profileOpen, isSignedIn, mounted, isLoaded, user])

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

  // Close date picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerButtonRef.current && !datePickerButtonRef.current.contains(event.target as Node)) {
        setShowDatePicker(false)
      }
    }

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDatePicker])

  // Sync dateRange with filters
  useEffect(() => {
    if (filters.dateFrom && filters.dateTo) {
      setDateRange([{
        startDate: new Date(filters.dateFrom),
        endDate: new Date(filters.dateTo),
        key: 'selection'
      }])
    }
  }, [filters.dateFrom, filters.dateTo])

  const types = ['All Types', 'Room', 'Studio', 'Apartment']

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

  const handleDateRangeChange = (ranges: RangeKeyDict) => {
    const selection = ranges.selection
    if (!selection || !selection.startDate || !selection.endDate) return

    setDateRange([{
      startDate: selection.startDate,
      endDate: selection.endDate,
      key: 'selection'
    }])

    // Format dates as YYYY-MM-DD for filters
    const formattedStartDate = format(selection.startDate, 'yyyy-MM-dd')
    const formattedEndDate = format(selection.endDate, 'yyyy-MM-dd')

    setDateFrom(formattedStartDate)
    setDateTo(formattedEndDate)
    setFilters({
      cities: filters.cities || [],
      types: filters.types || [],
      maxBudget: filters.maxBudget || 0,
      dateFrom: formattedStartDate,
      dateTo: formattedEndDate
    })
  }

  const getDateRangeLabel = () => {
    if (filters.dateFrom && filters.dateTo) {
      const start = format(new Date(filters.dateFrom), 'MMM d')
      const end = format(new Date(filters.dateTo), 'MMM d')
      return `${start} - ${end}`
    }
    return 'Dates'
  }

  const handleSignOut = async () => {
    await signOut()
    setProfileOpen(false)
    router.push('/')
  }

  const closeMenus = () => {
    setFiltersOpen(false)
    setProfileOpen(false)
  }

  return (
    <>
      {/* All styles consolidated */}
      <style jsx>{`
        .desktop-profile-button {
          transition: padding 0.2s ease;
        }
        .desktop-profile-text {
          max-width: 0;
          overflow: hidden;
          opacity: 0;
          transition: max-width 0.2s ease, opacity 0.2s ease, margin 0.2s ease;
          white-space: nowrap;
        }
        .desktop-profile-button:hover .desktop-profile-text {
          max-width: 100px;
          opacity: 1;
          margin-left: 8px;
        }
        .profile-button {
          transition: width 0.2s ease, padding 0.2s ease;
        }
        .profile-text {
          max-width: 0;
          overflow: hidden;
          opacity: 0;
          transition: max-width 0.2s ease, opacity 0.2s ease, margin 0.2s ease;
          white-space: nowrap;
        }
        @media (min-width: 768px) {
          .profile-button:hover .profile-text {
            max-width: 100px;
            opacity: 1;
            margin-left: 8px;
          }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .date-input {
          position: relative;
        }
        .date-input::-webkit-datetime-edit-text,
        .date-input::-webkit-datetime-edit-month-field,
        .date-input::-webkit-datetime-edit-day-field,
        .date-input::-webkit-datetime-edit-year-field {
          color: transparent;
        }
        .date-input:focus::-webkit-datetime-edit-text,
        .date-input:focus::-webkit-datetime-edit-month-field,
        .date-input:focus::-webkit-datetime-edit-day-field,
        .date-input:focus::-webkit-datetime-edit-year-field,
        .date-input.has-value::-webkit-datetime-edit-text,
        .date-input.has-value::-webkit-datetime-edit-month-field,
        .date-input.has-value::-webkit-datetime-edit-day-field,
        .date-input.has-value::-webkit-datetime-edit-year-field {
          color: black;
        }
        .date-input::before {
          content: attr(data-placeholder);
          position: absolute;
          left: 0.5rem;
          top: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          color: #9ca3af;
          pointer-events: none;
        }
        .date-input:focus::before,
        .date-input.has-value::before {
          display: none;
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
        .date-filter-input::-webkit-calendar-picker-indicator {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }
        .date-filter-input::-webkit-datetime-edit-text,
        .date-filter-input::-webkit-datetime-edit-month-field,
        .date-filter-input::-webkit-datetime-edit-day-field,
        .date-filter-input::-webkit-datetime-edit-year-field {
          color: transparent;
        }
        .date-filter-input:focus::-webkit-datetime-edit-text,
        .date-filter-input:focus::-webkit-datetime-edit-month-field,
        .date-filter-input:focus::-webkit-datetime-edit-day-field,
        .date-filter-input:focus::-webkit-datetime-edit-year-field {
          color: transparent;
        }
      `}</style>

      {/* Global styles for react-date-range - FRESH START */}
      <style jsx global>{`
        /* Hide unwanted UI elements */
        .rdrDateDisplayWrapper,
        .rdrDefinedRangesWrapper,
        .rdrNextPrevButton,
        .rdrMonthName {
          display: none;
        }

        /* Calendar container */
        .rdrCalendarWrapper {
          font-family: ${fontFamily};
          background: white;
        }

        .rdrMonth {
          padding: 12px 16px 16px 16px;
        }

        /* Month/Year dropdowns - left aligned within calendar */
        .rdrMonthAndYearWrapper {
          padding: 16px 0 12px 0 !important;
          display: flex !important;
          justify-content: flex-start !important;
          align-items: center !important;
        }

        .rdrMonthAndYearPickers {
          display: flex !important;
          gap: 0 !important;
          align-items: center !important;
          justify-content: flex-start !important;
          padding-left: 16px !important;
        }

        .rdrMonthPicker,
        .rdrYearPicker {
          position: relative;
        }

        .rdrMonthPicker select,
        .rdrYearPicker select {
          color: #8B4513;
          font-family: ${fontFamily};
          font-weight: 400;
          border: 1px solid #8B4513;
          background: white;
          font-size: 14px;
          padding: 4px 24px 4px 8px;
          border-radius: 8px;
          cursor: pointer;
          appearance: none;
        }

        .rdrMonthPicker::after,
        .rdrYearPicker::after {
          content: '';
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 7px solid #8B4513;
          pointer-events: none;
        }

        /* Week day labels */
        .rdrWeekDay {
          color: #8B4513;
          font-size: 13px;
        }

        /* Disabled dates - lighter text */
        .rdrDayDisabled .rdrDayNumber span,
        .rdrDayPassive .rdrDayNumber span {
          color: #d0d0d0;
        }

        /* Today indicator */
        .rdrDayToday .rdrDayNumber span:after {
          background: #8B4513;
          opacity: 0.3;
        }

        /* Selected start and end dates - brown circles with white text */
        .rdrStartEdge .rdrDayNumber span,
        .rdrEndEdge .rdrDayNumber span {
          background: #8B4513;
          color: white;
          border-radius: 50%;
          width: 2.5em;
          height: 2.5em;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      {/* Desktop buttons and filters - left side */}
      <div className="hidden xl:flex fixed left-4 top-4 z-[101] items-center gap-3">
        {/* Subleshnn button */}
        <Link
          href="/"
          onClick={() => {
            closeMenus()
            setFilters({
              cities: [],
              types: [],
              maxBudget: 0,
              dateFrom: '',
              dateTo: ''
            })
          }}
          className="flex"
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
            textDecoration: 'none'
          }}
        >
          Subleshnn 🌸
        </Link>

        {/* Filters */}
        {/* Cities dropdown */}
        <div className="relative">
          <select
            value={filters.cities && filters.cities.length > 0 ? filters.cities[0] : ''}
            onChange={(e) => {
              const newCities = e.target.value ? [e.target.value] : []
              setFilters({
                cities: newCities,
                types: filters.types || [],
                maxBudget: filters.maxBudget || 0,
                dateFrom: filters.dateFrom || '',
                dateTo: filters.dateTo || ''
              })
            }}
            className="px-3 py-2 focus:outline-none bg-white appearance-none cursor-pointer border"
            style={{
              fontFamily: fontFamily,
              fontSize: FONT_SIZES.base,
              borderColor: '#8B4513',
              color: '#8B4513',
              borderRadius: '8px',
              paddingRight: '32px',
              minWidth: '120px'
            }}
          >
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <div style={{
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '7px solid #8B4513'
            }}></div>
          </div>
        </div>

        {/* Types dropdown - HIDDEN but keeping code intact */}
        <div className="relative hidden">
          <select
            value={filters.types && filters.types.length > 0 ? filters.types[0] : ''}
            onChange={(e) => {
              const newTypes = e.target.value ? [e.target.value] : []
              setFilters({
                cities: filters.cities || [],
                types: newTypes,
                maxBudget: filters.maxBudget || 0,
                dateFrom: filters.dateFrom || '',
                dateTo: filters.dateTo || ''
              })
            }}
            className="px-3 py-2 focus:outline-none bg-white appearance-none cursor-pointer border"
            style={{
              fontFamily: fontFamily,
              fontSize: FONT_SIZES.base,
              borderColor: '#8B4513',
              color: '#8B4513',
              borderRadius: '8px',
              paddingRight: '32px',
              minWidth: '120px'
            }}
          >
            <option value="">All Types</option>
            {types.filter(t => t !== 'All Types').map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#8B4513' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        {/* Date Range Picker */}
        <div className="relative" ref={datePickerButtonRef}>
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="px-3 py-2 focus:outline-none bg-white cursor-pointer border"
            style={{
              fontFamily: fontFamily,
              fontSize: FONT_SIZES.base,
              borderColor: '#8B4513',
              color: '#8B4513',
              borderRadius: '8px',
              minWidth: '160px',
              paddingRight: '32px',
              textAlign: 'left'
            }}
          >
            {getDateRangeLabel()}
          </button>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <div style={{
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '7px solid #8B4513'
            }}></div>
          </div>
          {showDatePicker && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '8px',
                zIndex: 1000,
                backgroundColor: 'white',
                border: '1px solid #8B4513',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
              }}
            >
              <DateRangePicker
                ranges={dateRange}
                onChange={handleDateRangeChange}
                moveRangeOnFirstSelection={false}
                months={1}
                direction="horizontal"
                rangeColors={['#8B4513']}
                weekdayDisplayFormat="EEEEE"
                minDate={new Date()}
              />
            </div>
          )}
        </div>

        {/* Budget dropdown - HIDDEN but keeping code intact */}
        <div className="relative hidden">
          <select
            value={filters.maxBudget || 0}
            onChange={(e) => {
              const newBudget = parseInt(e.target.value)
              setFilters({
                cities: filters.cities || [],
                types: filters.types || [],
                maxBudget: newBudget,
                dateFrom: filters.dateFrom || '',
                dateTo: filters.dateTo || ''
              })
            }}
            className="px-3 py-2 focus:outline-none bg-white appearance-none cursor-pointer border"
            style={{
              fontFamily: fontFamily,
              fontSize: FONT_SIZES.base,
              borderColor: '#8B4513',
              color: '#8B4513',
              borderRadius: '8px',
              paddingRight: '32px',
              minWidth: '120px'
            }}
          >
            {budgetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#8B4513' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
      </div>

      {/* Desktop Profile button - with animated text on hover */}
      <button
        onClick={() => {
          setProfileOpen(!profileOpen)
          setFiltersOpen(false)
        }}
        className="desktop-profile-button hidden xl:flex fixed top-4 z-[101] items-center"
        style={{
          right: 'calc(16px + 60px + 16px)',
          fontFamily: fontFamily,
          fontSize: FONT_SIZES.base,
          color: '#8B4513',
          fontWeight: '500',
          background: 'white',
          border: '1px solid #8B4513',
          borderRadius: '8px',
          cursor: 'pointer',
          padding: '11px 16px',
          height: '48px',
          boxSizing: 'border-box'
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span className="desktop-profile-text">Profile</span>
      </button>

      {/* Desktop profile dropdown menu */}
      {profileOpen && (
        <div
          className="hidden xl:block fixed top-16 z-[102]"
          style={{
            right: 'calc(16px + 60px + 16px)',
            backgroundColor: 'white',
            border: '1px solid #8B4513',
            borderRadius: '4px',
            minWidth: '200px',
            paddingTop: '8px',
            paddingBottom: '8px'
          }}
        >
          {!mounted || !isLoaded ? (
            <div style={{ paddingTop: '8px', paddingBottom: '8px', paddingLeft: '12px', paddingRight: '12px', fontFamily: fontFamily, fontSize: FONT_SIZES.base, color: '#8B4513' }}>
              Loading...
            </div>
          ) : isSignedIn ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setProfileOpen(false)}
                style={{ display: 'block', paddingTop: '8px', paddingBottom: '8px', paddingLeft: '12px', paddingRight: '12px', fontFamily: fontFamily, fontSize: FONT_SIZES.base, color: '#8B4513', textDecoration: 'none' }}
                className="hover:bg-gray-50"
              >
                My Sublets{mySubletCount > 0 ? ` (${mySubletCount})` : ''}
              </Link>
              <Link
                href="/dashboard/create"
                onClick={() => setProfileOpen(false)}
                style={{ display: 'block', paddingTop: '8px', paddingBottom: '8px', paddingLeft: '12px', paddingRight: '12px', fontFamily: fontFamily, fontSize: FONT_SIZES.base, color: '#8B4513', textDecoration: 'none' }}
                className="hover:bg-gray-50"
              >
                Add Sublet (+)
              </Link>
              <Link
                href="/favorites"
                onClick={() => setProfileOpen(false)}
                style={{ display: 'block', paddingTop: '8px', paddingBottom: '8px', paddingLeft: '12px', paddingRight: '12px', fontFamily: fontFamily, fontSize: FONT_SIZES.base, color: '#8B4513', textDecoration: 'none' }}
                className="hover:bg-gray-50"
              >
                Favs{favsCount > 0 ? ` (${favsCount})` : ''}
              </Link>
              <Link
                href="/account"
                onClick={() => setProfileOpen(false)}
                style={{ display: 'block', paddingTop: '8px', paddingBottom: '8px', paddingLeft: '12px', paddingRight: '12px', fontFamily: fontFamily, fontSize: FONT_SIZES.base, color: '#8B4513', textDecoration: 'none' }}
                className="hover:bg-gray-50"
              >
                User Info
              </Link>
              <div style={{ borderTop: '1px solid #8B4513', marginTop: '8px', marginBottom: '8px' }}></div>
              <button
                onClick={handleSignOut}
                style={{ width: '100%', textAlign: 'left', paddingTop: '8px', paddingBottom: '8px', paddingLeft: '12px', paddingRight: '12px', fontFamily: fontFamily, fontSize: FONT_SIZES.base, color: '#8B4513', background: 'none', border: 'none', cursor: 'pointer' }}
                className="hover:bg-gray-50"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/sign-in"
              onClick={() => setProfileOpen(false)}
              style={{ display: 'block', paddingTop: '8px', paddingBottom: '8px', paddingLeft: '12px', paddingRight: '12px', fontFamily: fontFamily, fontSize: FONT_SIZES.base, color: '#8B4513', textDecoration: 'none' }}
              className="hover:bg-gray-50"
            >
              Sign In
            </Link>
          )}
        </div>
      )}

      {/* Spacer for navigation - only on non-home pages */}
      {!isHomePage && <div style={{ height: '80px' }}></div>}

      {/* Subleshnn button - top left, hidden on home page and on desktop xl+ */}
      {!isHomePage && (
        <Link
          href="/"
          onClick={() => {
            closeMenus()
            setFilters({
              cities: [],
              types: [],
              maxBudget: 0,
              dateFrom: '',
              dateTo: ''
            })
          }}
          className="fixed left-4 top-4 z-[101] flex xl:hidden"
          style={{
            fontFamily: fontFamily,
            fontSize: FONT_SIZES.baseMobile,
            color: '#8B4513',
            fontWeight: '500',
            background: 'white',
            border: '1px solid #8B4513',
            borderRadius: '8px',
            cursor: 'pointer',
            padding: '7px 16px',
            textDecoration: 'none'
          }}
        >
          Subleshnn 🌸
        </Link>
      )}

      {/* Profile button with dropdown - top right, adjusted position on home page to not overlap toggle, hidden on desktop xl+ */}
      <div style={{ position: 'relative' }} className="xl:hidden">
        <button
          onClick={() => {
            setProfileOpen(!profileOpen)
            setFiltersOpen(false)
          }}
          onBlur={() => setTimeout(() => setProfileOpen(false), 200)}
          className="profile-button fixed z-[101] flex items-center"
          style={{
            right: isHomePage ? 'calc(16px + 60px + 16px)' : '16px',
            top: '16px',
            fontFamily: fontFamily,
            fontSize: FONT_SIZES.baseMobile,
            color: '#8B4513',
            fontWeight: '500',
            background: 'white',
            border: '1px solid #8B4513',
            borderRadius: '8px',
            cursor: 'pointer',
            padding: '7px 16px',
            height: '48px',
            boxSizing: 'border-box'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span className="profile-text hidden md:inline">Profile</span>
        </button>

        {/* Dropdown menu - shown on both mobile and desktop */}
        {profileOpen && (
          <div
            className="xl:hidden"
            style={{
              position: 'fixed',
              right: isHomePage ? 'calc(16px + 60px + 16px)' : '16px',
              top: '68px',
              backgroundColor: 'white',
              border: '1px solid #8B4513',
              borderRadius: '4px',
              minWidth: '200px',
              zIndex: 102,
              paddingTop: '8px',
              paddingBottom: '8px'
            }}
          >
            {!mounted || !isLoaded ? (
              <div style={{ paddingTop: '8px', paddingBottom: '8px', paddingLeft: '12px', paddingRight: '12px', fontFamily: fontFamily, fontSize: FONT_SIZES.baseMobile, color: '#8B4513' }}>
                Loading...
              </div>
            ) : isSignedIn ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setProfileOpen(false)}
                  style={{ display: 'block', paddingTop: '8px', paddingBottom: '8px', paddingLeft: '12px', paddingRight: '12px', fontFamily: fontFamily, fontSize: FONT_SIZES.baseMobile, color: '#8B4513', textDecoration: 'none' }}
                  className="hover:bg-gray-50"
                >
                  My Sublets{mySubletCount > 0 ? ` (${mySubletCount})` : ''}
                </Link>
                <Link
                  href="/dashboard/create"
                  onClick={() => setProfileOpen(false)}
                  style={{ display: 'block', paddingTop: '8px', paddingBottom: '8px', paddingLeft: '12px', paddingRight: '12px', fontFamily: fontFamily, fontSize: FONT_SIZES.baseMobile, color: '#8B4513', textDecoration: 'none' }}
                  className="hover:bg-gray-50"
                >
                  Add Sublet (+)
                </Link>
                <Link
                  href="/favorites"
                  onClick={() => setProfileOpen(false)}
                  style={{ display: 'block', paddingTop: '8px', paddingBottom: '8px', paddingLeft: '12px', paddingRight: '12px', fontFamily: fontFamily, fontSize: FONT_SIZES.baseMobile, color: '#8B4513', textDecoration: 'none' }}
                  className="hover:bg-gray-50"
                >
                  Favs{favsCount > 0 ? ` (${favsCount})` : ''}
                </Link>
                <Link
                  href="/account"
                  onClick={() => setProfileOpen(false)}
                  style={{ display: 'block', paddingTop: '8px', paddingBottom: '8px', paddingLeft: '12px', paddingRight: '12px', fontFamily: fontFamily, fontSize: FONT_SIZES.baseMobile, color: '#8B4513', textDecoration: 'none' }}
                  className="hover:bg-gray-50"
                >
                  User Info
                </Link>
                <div style={{ borderTop: '1px solid #8B4513', marginTop: '8px', marginBottom: '8px' }}></div>
                <button
                  onClick={handleSignOut}
                  style={{ width: '100%', textAlign: 'left', paddingTop: '8px', paddingBottom: '8px', paddingLeft: '12px', paddingRight: '12px', fontFamily: fontFamily, fontSize: FONT_SIZES.baseMobile, color: '#8B4513', background: 'none', border: 'none', cursor: 'pointer' }}
                  className="hover:bg-gray-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/sign-in"
                onClick={() => setProfileOpen(false)}
                style={{ display: 'block', paddingTop: '8px', paddingBottom: '8px', paddingLeft: '12px', paddingRight: '12px', fontFamily: fontFamily, fontSize: FONT_SIZES.baseMobile, color: '#8B4513', textDecoration: 'none' }}
                className="hover:bg-gray-50"
              >
                Sign In
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Filters Menu - Slide up from bottom */}
      {filtersOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-white z-40"
            onClick={() => setFiltersOpen(false)}
          />

          <div className="fixed left-0 right-0 bottom-0 bg-white z-50 overflow-y-auto scrollbar-hide animate-slide-up xl:left-1/2 xl:-translate-x-1/2 xl:max-w-md xl:rounded-t-lg" style={{ top: '0' }}>

          {/* Filters Menu Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-black">
            <button
              onClick={() => setFiltersOpen(false)}
              className="text-black"
              style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.baseMobile }}
            >
              Cancel
            </button>
            <button
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
              className="text-black"
              style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.baseMobile }}
            >
              Delete filters
            </button>
          </div>

          <div className="px-4 py-4">
            {/* All filter items stacked vertically */}
            <div className="flex flex-col">
              {/* Cities */}
              <div className="mb-4 pb-4 pt-2 border-b border-black">
                <div
                  className="text-black text-left w-full mb-2"
                  style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.baseMobile }}
                >
                  Cities
                </div>
                {cities.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 mb-2">
                    {cities.map((city, index) => (
                      <label
                        key={city}
                        className="flex items-center cursor-pointer"
                        style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.baseMobile }}
                      >
                        <input
                          type="checkbox"
                          checked={(filters.cities || []).includes(city)}
                          onChange={() => toggleCity(city)}
                          className="mr-2"
                        />
                        <span style={{ color: getCityColor(city, index) }}>{city}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Types - HIDDEN but keeping code intact */}
              <div className="mb-4 pb-4 border-b border-black hidden">
                <div
                  className="text-black text-left w-full mb-2"
                  style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.baseMobile }}
                >
                  Type
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 mb-2">
                  {types.map((type) => (
                    <label
                      key={type}
                      className="flex items-center cursor-pointer"
                      style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.baseMobile }}
                    >
                      <input
                        type="checkbox"
                        checked={(filters.types || []).includes(type)}
                        onChange={() => toggleType(type)}
                        className="mr-2"
                      />
                      <span className="text-black">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="mb-4 pb-4 border-b border-black">
                <div
                  className="text-black text-left w-full mb-2"
                  style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.baseMobile }}
                >
                  Dates
                </div>
                <div className="mt-2 mb-2 flex justify-center">
                  <DateRangePicker
                    ranges={dateRange}
                    onChange={handleDateRangeChange}
                    moveRangeOnFirstSelection={false}
                    months={1}
                    direction="horizontal"
                    rangeColors={['#8B4513']}
                    weekdayDisplayFormat="EEEEE"
                    minDate={new Date()}
                  />
                </div>
              </div>

              {/* Budget - HIDDEN but keeping code intact */}
              <div className="mb-4 pb-4 hidden">
                <div
                  className="text-black text-left w-full mb-2"
                  style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.baseMobile }}
                >
                  Price
                </div>
                <select
                  value={maxBudget}
                  onChange={(e) => handleBudgetChange(parseInt(e.target.value))}
                  className="w-full mt-2 border border-gray-400 p-2 text-black mb-2"
                  style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.baseMobile }}
                >
                  {budgetOptions.map((budget) => (
                    <option key={budget.value} value={budget.value}>
                      {budget.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* View Results Button - Fixed at bottom */}
          <div className="fixed bottom-0 left-0 right-0 bg-white p-4">
            <button
              onClick={() => setFiltersOpen(false)}
              className="w-full bg-black text-white py-3 px-4"
              style={{ fontFamily: fontFamily, fontSize: FONT_SIZES.baseMobile }}
            >
              View {listingsCount} Sublet{listingsCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
        </>
      )}

    </>
  )
}
