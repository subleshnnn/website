'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface FilterBarProps {
  onFiltersChange?: (filters: {
    city: string
    type: string
    maxBudget: number
  }) => void
}

export default function FilterBar({ onFiltersChange }: FilterBarProps) {
  const [city, setCity] = useState('')
  const [type, setType] = useState('')
  const [maxBudget, setMaxBudget] = useState(5000)
  const [cities, setCities] = useState<string[]>(['All Cities'])

  const types = [
    'All Types',
    'Room',
    'Studio',
    'Apartment'
  ]

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
    setTimeout(handleFilterChange, 0)
  }

  const handleTypeChange = (newType: string) => {
    setType(newType)
    setTimeout(handleFilterChange, 0)
  }

  const handleBudgetChange = (newBudget: number) => {
    setMaxBudget(newBudget)
    setTimeout(handleFilterChange, 0)
  }

  return (
    <div className="bg-white py-4" style={{ paddingTop: 'calc(5rem + 17px)' }}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">

          {/* City Filter */}
          <div className="flex flex-col">
            <select
              value={city}
              onChange={(e) => handleCityChange(e.target.value)}
              className="px-3 py-2 pr-8 border border-black focus:outline-none text-gray-700 bg-white min-w-[120px] appearance-none"
              style={{
                fontFamily: 'Cerial, sans-serif',
                fontSize: '20px',
                backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%23000\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")',
                backgroundPosition: 'right 8px center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '16px'
              }}
            >
              {cities.map((cityOption) => (
                <option key={cityOption} value={cityOption}>
                  {cityOption}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex flex-col">
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="px-3 py-2 pr-8 border border-black focus:outline-none text-gray-700 bg-white min-w-[120px] appearance-none"
              style={{
                fontFamily: 'Cerial, sans-serif',
                fontSize: '20px',
                backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%23000\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")',
                backgroundPosition: 'right 8px center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '16px'
              }}
            >
              {types.map((typeOption) => (
                <option key={typeOption} value={typeOption}>
                  {typeOption}
                </option>
              ))}
            </select>
          </div>

          {/* Budget Slider */}
          <div className="flex items-center gap-4 flex-1 max-w-xs">
            <div className="flex-1 relative flex items-center" style={{ height: '42px' }}>
              <input
                type="range"
                min="100"
                max="5000"
                step="50"
                value={maxBudget}
                onChange={(e) => handleBudgetChange(parseInt(e.target.value))}
                className="w-full appearance-none cursor-pointer slider bg-transparent"
              />
              <style jsx>{`
                .slider {
                  height: 1px;
                  background: linear-gradient(to right, #000 0%, #000 100%);
                }

                .slider::-webkit-slider-thumb {
                  appearance: none;
                  height: 16px;
                  width: 16px;
                  border-radius: 50%;
                  background: #fff;
                  cursor: pointer;
                  border: 1px solid #000;
                  box-shadow: none;
                  transform: translateY(0px);
                }

                .slider::-moz-range-thumb {
                  height: 16px;
                  width: 16px;
                  border-radius: 50%;
                  background: #fff;
                  cursor: pointer;
                  border: 1px solid #000;
                  box-shadow: none;
                  transform: translateY(0px);
                }

                .slider::-webkit-slider-track {
                  height: 1px;
                  background: #000;
                  border-radius: 0;
                }

                .slider::-moz-range-track {
                  height: 1px;
                  background: #000;
                  border-radius: 0;
                  border: none;
                }
              `}</style>
            </div>
            <span className="text-gray-700" style={{ fontFamily: 'Cerial, sans-serif', fontSize: '20px' }}>
              ${maxBudget}
            </span>
          </div>

        </div>
      </div>
    </div>
  )
}