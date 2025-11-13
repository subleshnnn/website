'use client'

import { useUser } from '@clerk/nextjs'

// Force dynamic rendering for pages that use Clerk
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import { supabase, type Listing } from '@/lib/supabase'
import { useFont } from '@/contexts/FontContext'
import { useResponsiveFontSize } from '@/hooks/useResponsiveFontSize'

interface NominatimResult {
  display_name: string
  [key: string]: unknown
}

interface ListingImage {
  id: string
  image_url: string
  thumbnail_url?: string
  caption: string | null
  is_primary: boolean
}

const ImageUpload = dynamicImport(() => import('@/components/ImageUpload'), {
  loading: () => <div className="text-center py-4">Loading image upload...</div>
})

export default function EditListingPage() {
  const { user } = useUser()
  const router = useRouter()
  const params = useParams()
  const listingId = params.id as string
  const { fontFamily } = useFont()
  const fontSize = useResponsiveFontSize()

  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [listing, setListing] = useState<Listing | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [imageCaptions, setImageCaptions] = useState<string[]>([])
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [locationSearchQuery, setLocationSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    listing_type: 'subletting',
    property_type: '',
    description: '',
    price: '',
    location: '',
    contact_method: 'email',
    contact_info: '',
    available_from: '',
    available_to: '',
    dog_friendly: false,
    cat_friendly: false
  })

  // Location search function
  const searchLocations = useCallback(async (query: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`
      )
      const data = await response.json()

      const suggestions = (data as NominatimResult[])
        .map(item => item.display_name.split(',')[0].trim())
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
    }, 300)

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

    checkScrollNeed()
    window.addEventListener('resize', checkScrollNeed)
    const timeout = setTimeout(checkScrollNeed, 100)

    return () => {
      window.removeEventListener('resize', checkScrollNeed)
      clearTimeout(timeout)
      document.body.style.overflow = ''
    }
  }, [])

  const fetchListing = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          listing_images (
            id,
            image_url,
            thumbnail_url,
            caption,
            is_primary
          )
        `)
        .eq('id', listingId)
        .single()

      if (error) {
        console.error('Error fetching listing:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        console.error('Error message:', error.message)
        console.error('Error code:', error.code)
        alert(`Error fetching listing: ${error.message}`)
        router.push('/dashboard')
        return
      }

      if (!data) {
        alert('Listing not found')
        router.push('/dashboard')
        return
      }

      // Check if user owns this listing
      if (user && data.user_id !== user.id) {
        alert('You can only edit your own listings')
        router.push('/dashboard')
        return
      }

      setListing(data)
      
      // Sort images by primary first, then by creation order
      const sortedImages = (data.listing_images as ListingImage[])?.sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1
        if (!a.is_primary && b.is_primary) return 1
        return 0
      }) || []

      setImages(sortedImages.map(img => img.image_url))
      setThumbnails(sortedImages.map(img => img.thumbnail_url || img.image_url))
      setImageCaptions(sortedImages.map(img => img.caption || ''))
      
      setFormData({
        listing_type: data.listing_type || 'subletting',
        property_type: (data as unknown as {property_type?: string}).property_type || '',
        description: data.description || '',
        price: (data.price / 100).toString(),
        location: data.location,
        contact_method: (data as unknown as {contact_method?: string}).contact_method || 'email',
        contact_info: (data as unknown as {contact_info?: string}).contact_info || data.contact_email || '',
        available_from: data.available_from || '',
        available_to: data.available_to || '',
        dog_friendly: data.dog_friendly || false,
        cat_friendly: data.cat_friendly || false
      })
    } catch (error) {
      console.error('Error:', error)
      alert('Error loading listing')
      router.push('/dashboard')
    } finally {
      setFetchLoading(false)
    }
  }, [listingId, user, router])

  useEffect(() => {
    console.log('🔄 useEffect triggered with listingId:', listingId)
    if (listingId) {
      console.log('📥 Fetching listing...')
      fetchListing()
    }
  }, [listingId, fetchListing])

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
    if (!user || !listing) return

    setLoading(true)

    try {
      const updateData: Record<string, unknown> = {
        title: `${formData.location} - ${new Date().toLocaleDateString()}`,
        listing_type: formData.listing_type,
        description: formData.description,
        price: Math.round(parseFloat(formData.price) * 100),
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
        updateData.property_type = formData.property_type
      }

      const { error } = await supabase
        .from('listings')
        .update(updateData)
        .eq('id', listingId)

      if (error) {
        console.error('Error updating listing:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        console.error('Error message:', error.message)
        console.error('Error code:', error.code)
        alert(`Error updating listing: ${error.message || 'Please try again.'}`)
        return
      }

      // Update images - delete all existing and recreate
      const { error: deleteError } = await supabase
        .from('listing_images')
        .delete()
        .eq('listing_id', listingId)

      if (deleteError) {
        console.error('Error deleting existing images:', deleteError)
        console.error('Delete error details:', JSON.stringify(deleteError, null, 2))
      }

      // Add new images
      if (images.length > 0) {
        const imageInserts = images.map((imageUrl, index) => ({
          listing_id: listingId,
          image_url: imageUrl,
          thumbnail_url: thumbnails[index] || imageUrl, // Use thumbnail if available, fallback to full image
          caption: imageCaptions[index] || null,
          is_primary: index === 0 // First image is primary
        }))

        console.log('Attempting to insert images:', imageInserts)

        const { error: imageError } = await supabase
          .from('listing_images')
          .insert(imageInserts)

        if (imageError) {
          console.error('Error updating images:', imageError)
          console.error('Image error details:', JSON.stringify(imageError, null, 2))
          console.error('Image error message:', imageError.message)
          console.error('Image error code:', imageError.code)
          alert(`Listing updated but failed to save images: ${imageError.message}`)
        }
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Error:', error)
      alert('Error updating listing. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="p-4">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  if (!listing) {
    return null
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
            onClick={() => router.push('/dashboard')}
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
            {loading ? 'Updating...' : 'Update Listing'}
          </button>
        </div>
      </div>
    </div>
  )
}