'use client'

import { useUser } from '@clerk/nextjs'

// Force dynamic rendering for pages that use Clerk
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { useFont } from '@/contexts/FontContext'
import { useResponsiveFontSize } from '@/hooks/useResponsiveFontSize'

interface NominatimResult {
  display_name: string
  [key: string]: unknown
}

const ImageUpload = dynamicImport(() => import('@/components/ImageUpload'), {
  loading: () => <div className="text-center py-4">Loading image upload...</div>
})

export default function CreateListingPage() {
  const { user } = useUser()
  const router = useRouter()
  const { fontFamily } = useFont()
  const fontSize = useResponsiveFontSize()
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [imageCaptions, setImageCaptions] = useState<string[]>([])
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [locationSearchQuery, setLocationSearchQuery] = useState('')

  // Location search function
  const searchLocations = useCallback(async (query: string) => {
    try {
      // Using a simple approach with Nominatim (OpenStreetMap) - it's free
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`
      )
      const data = await response.json()

      const suggestions = (data as NominatimResult[])
        .map(item => item.display_name.split(',')[0].trim()) // Extract only city name
        .slice(0, 5)
      setLocationSuggestions(suggestions)
      setShowSuggestions(suggestions.length > 0)
    } catch (error) {
      console.error('Error fetching location suggestions:', error)
      setLocationSuggestions([])
      setShowSuggestions(false)
    }
  }, [])

  // Debounced location search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (locationSearchQuery.length >= 3) {
        searchLocations(locationSearchQuery)
      } else {
        setLocationSuggestions([])
        setShowSuggestions(false)
      }
    }, 300) // Wait 300ms after user stops typing

    return () => clearTimeout(timer)
  }, [locationSearchQuery, searchLocations])

  // Prevent scrolling if content fits on screen
  useEffect(() => {
    const checkScrollNeed = () => {
      const contentFitsOnScreen = document.body.scrollHeight <= window.innerHeight
      if (contentFitsOnScreen) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    }

    // Check on mount and when window resizes
    checkScrollNeed()
    window.addEventListener('resize', checkScrollNeed)

    // Recheck after a short delay to account for dynamic content
    const timeout = setTimeout(checkScrollNeed, 100)

    return () => {
      window.removeEventListener('resize', checkScrollNeed)
      clearTimeout(timeout)
      document.body.style.overflow = '' // Reset on unmount
    }
  }, [])
  const [formData, setFormData] = useState({
    listing_type: 'subletting', // 'subletting' or 'looking_for'
    property_type: '', // 'room', 'studio', 'apartment'
    description: '',
    price: '',
    location: '',
    contact_method: 'email', // 'email', 'telegram', 'instagram', 'facebook'
    contact_info: user?.emailAddresses[0]?.emailAddress || '',
    available_from: '',
    available_to: '',
    dog_friendly: false,
    cat_friendly: false
  })

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    // Handle location autocomplete with debouncing
    if (name === 'location') {
      setLocationSearchQuery(value)
    }
  }

  function selectLocation(location: string) {
    setFormData(prev => ({
      ...prev,
      location: location
    }))
    setShowSuggestions(false)
    setLocationSuggestions([])
  }

  function getContactPlaceholder(method: string) {
    switch (method) {
      case 'email':
        return 'your@email.com'
      case 'telegram':
        return '@username'
      case 'instagram':
        return '@username'
      case 'facebook':
        return 'Profile URL or username'
      default:
        return 'Contact info'
    }
  }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      console.log('DEBUG: No user found')
      alert('You must be logged in to create a listing')
      return
    }

    setLoading(true)
    
    console.log('DEBUG: Starting form submission')
    console.log('DEBUG: User ID:', user.id)
    console.log('DEBUG: Form data:', formData)
    
    const insertData: Record<string, unknown> = {
      user_id: user.id,
      title: `${formData.location} - ${new Date().toLocaleDateString()}`,
      listing_type: formData.listing_type,
      description: formData.description,
      price: Math.round(parseFloat(formData.price) * 100), // Convert to cents
      location: formData.location,
      contact_method: formData.contact_method,
      contact_info: formData.contact_info,
      available_from: formData.available_from || null,
      available_to: formData.available_to || null,
      dog_friendly: formData.dog_friendly,
      cat_friendly: formData.cat_friendly
    }

    // Only include property_type if it has a value (for future database compatibility)
    if (formData.property_type) {
      insertData.property_type = formData.property_type
    }
    
    console.log('DEBUG: Insert data:', insertData)
    
    try {
      const { data, error } = await supabase
        .from('listings')
        .insert(insertData)
        .select()

      console.log('DEBUG: Supabase response data:', data)
      console.log('DEBUG: Supabase response error:', error)

      if (error) {
        console.error('Supabase error details:', error)
        alert(`Database error: ${error.message}`)
        return
      }

      // If images were uploaded, save them
      if (images.length > 0 && data && data[0]) {
        const listingId = data[0].id
        
        const imageInserts = images.map((imageUrl, index) => ({
          listing_id: listingId,
          image_url: imageUrl,
          thumbnail_url: thumbnails[index] || imageUrl, // Use thumbnail if available, fallback to full image
          caption: imageCaptions[index] || null,
          is_primary: index === 0 // First image is primary
        }))

        console.log('DEBUG: About to insert images:', imageInserts)
        const { error: imageError } = await supabase
          .from('listing_images')
          .insert(imageInserts)

        if (imageError) {
          console.error('❌ Error saving images:', imageError)
          console.error('❌ Error details:', JSON.stringify(imageError, null, 2))
          alert('Listing created but failed to save images. You can add them later.')
        } else {
          console.log('✅ Images saved successfully!')
        }
      }

      console.log('DEBUG: Listing created successfully!')
      router.push('/dashboard')
    } catch (error) {
      console.error('Catch block error:', error)
      console.error('Error type:', typeof error)
      console.error('Error name:', error instanceof Error ? error.name : 'Unknown')
      console.error('Error message:', error instanceof Error ? error.message : String(error))
      console.error('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

      if (error instanceof TypeError && error.message.includes('fetch')) {
        alert('Network connection error. Please check your internet connection and try again.')
      } else {
        alert(`Database error: ${error instanceof Error ? error.message : String(error)}`)
      }
    } finally {
      setLoading(false)
    }
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
          color: #8B4513;
        }
        .date-input::before {
          content: attr(data-placeholder);
          position: absolute;
          left: 0.5rem;
          top: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          color: #8B4513;
          pointer-events: none;
        }
        .date-input::-webkit-calendar-picker-indicator {
          filter: invert(35%) sepia(50%) saturate(800%) hue-rotate(5deg);
          cursor: pointer;
        }
        .date-input:focus::before,
        .date-input.has-value::before {
          display: none;
        }
      `}</style>

      <main className="p-4 sm:p-6 lg:p-8 xl:pt-4 pb-24">
        <div className="max-w-2xl mx-auto">
          <form id="listing-form" onSubmit={handleSubmit} className="space-y-4">

          <div className="relative">
            <textarea
              id="description"
              name="description"
              rows={4}
              maxLength={280}
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border focus:outline-none placeholder-gray-400"
              placeholder="Description"
              style={{
                fontFamily: fontFamily,
                fontSize: '16px',
                paddingBottom: '32px',
                borderColor: '#8B4513',
                color: '#8B4513',
                borderRadius: '4px'
              }}
            />
            <div className="absolute bottom-3 right-3 text-sm pointer-events-none" style={{ fontFamily: fontFamily, color: '#8B4513' }}>
              {formData.description.length}/280
            </div>
          </div>

          <div className="flex gap-2">
            {/* Property Type Dropdown */}
            <div className="flex-1 relative">
              <select
                id="property_type"
                name="property_type"
                value={formData.property_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border focus:outline-none bg-white appearance-none pr-10"
                style={{
                  fontFamily: fontFamily,
                  fontSize: fontSize,
                  color: formData.property_type ? '#8B4513' : '#9ca3af',
                  borderColor: '#8B4513',
                  borderRadius: '4px'
                }}
              >
                <option value="">Property Type</option>
                <option value="room">Room</option>
                <option value="studio">Studio</option>
                <option value="apartment">Apartment</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#8B4513' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </div>
            </div>

            <div className="flex-1">
              <input
                type="number"
                id="price"
                name="price"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border focus:outline-none placeholder-gray-400"
                placeholder="Price (usd)"
                style={{
                  fontFamily: fontFamily,
                  fontSize: fontSize,
                  borderColor: '#8B4513',
                  color: '#8B4513',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div className="relative">
              <input
                type="text"
                id="location"
                name="location"
                required
                value={formData.location}
                onChange={handleInputChange}
                onFocus={() => formData.location.length >= 3 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full px-3 py-2 border focus:outline-none placeholder-gray-400"
                placeholder="Location"
                autoComplete="off"
                style={{
                  fontFamily: fontFamily,
                  fontSize: fontSize,
                  borderColor: '#8B4513',
                  color: '#8B4513',
                  borderRadius: '4px'
                }}
              />
              {showSuggestions && locationSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border max-h-60 overflow-y-auto" style={{ borderColor: '#8B4513', borderRadius: '4px' }}>
                  {locationSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectLocation(suggestion)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                      style={{
                        fontFamily: fontFamily,
                        fontSize: fontSize,
                        color: '#8B4513'
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
          </div>

          <div className="flex gap-2">
            {/* Contact Method Dropdown */}
            <div className="flex-1 relative">
              <select
                id="contact_method"
                name="contact_method"
                value={formData.contact_method}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border focus:outline-none bg-white appearance-none pr-10"
                style={{
                  fontFamily: fontFamily,
                  fontSize: fontSize,
                  borderColor: '#8B4513',
                  color: '#8B4513',
                  borderRadius: '4px'
                }}
              >
                <option value="email">E-mail</option>
                <option value="telegram">Telegram</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#8B4513' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </div>
            </div>

            {/* Contact Info Input */}
            <div className="flex-1">
              <input
                type="text"
                id="contact_info"
                name="contact_info"
                required
                value={formData.contact_info}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border focus:outline-none placeholder-gray-400"
                placeholder={getContactPlaceholder(formData.contact_method)}
                style={{
                  fontFamily: fontFamily,
                  fontSize: fontSize,
                  borderColor: '#8B4513',
                  color: '#8B4513',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="date"
                id="available_from"
                name="available_from"
                value={formData.available_from}
                onChange={handleInputChange}
                data-placeholder="From"
                className={`date-input w-full border p-2 ${formData.available_from ? 'has-value' : ''}`}
                style={{
                  fontFamily: fontFamily,
                  fontSize: fontSize,
                  borderColor: '#8B4513',
                  color: '#8B4513',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div className="flex-1">
              <input
                type="date"
                id="available_to"
                name="available_to"
                value={formData.available_to}
                onChange={handleInputChange}
                data-placeholder="To"
                className={`date-input w-full border p-2 ${formData.available_to ? 'has-value' : ''}`}
                style={{
                  fontFamily: fontFamily,
                  fontSize: fontSize,
                  borderColor: '#8B4513',
                  color: '#8B4513',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="dog_friendly"
                name="dog_friendly"
                checked={formData.dog_friendly}
                onChange={handleInputChange}
                className="rounded focus:outline-none brown-checkbox"
                style={{ accentColor: '#8B4513' }}
              />
              <label htmlFor="dog_friendly" style={{ fontFamily: fontFamily, fontSize: fontSize, color: '#8B4513' }}>
                🐕 Friendly
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="cat_friendly"
                name="cat_friendly"
                checked={formData.cat_friendly}
                onChange={handleInputChange}
                className="rounded focus:outline-none brown-checkbox"
                style={{ accentColor: '#8B4513' }}
              />
              <label htmlFor="cat_friendly" style={{ fontFamily: fontFamily, fontSize: fontSize, color: '#8B4513' }}>
                🐱 Friendly
              </label>
            </div>
          </div>

          <div className="mt-12">
            <div className="mb-4" style={{ fontFamily: fontFamily, fontSize: fontSize, color: '#8B4513' }}>
              Images
            </div>
            <ImageUpload
              images={images}
              onImagesChange={setImages}
              thumbnails={thumbnails}
              onThumbnailsChange={setThumbnails}
              imageCaptions={imageCaptions}
              onImageCaptionsChange={setImageCaptions}
              maxImages={10}
              fontSize={fontSize}
              fontFamily={fontFamily}
            />
          </div>


        </form>
        </div>
      </main>

      {/* Fixed bottom buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-white py-3 px-4 border"
            style={{
              fontSize: fontSize,
              fontFamily: fontFamily,
              borderColor: '#8B4513',
              color: '#8B4513',
              borderRadius: '4px'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="listing-form"
            disabled={loading}
            className="flex-1 text-white py-3 px-4 disabled:opacity-50"
            style={{
              fontSize: fontSize,
              fontFamily: fontFamily,
              backgroundColor: '#8B4513',
              borderRadius: '4px'
            }}
          >
            {loading ? 'Creating...' : 'Create Listing'}
          </button>
        </div>
      </div>
    </div>
  )
}