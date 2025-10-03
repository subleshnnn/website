'use client'

import { useUser } from '@clerk/nextjs'

// Force dynamic rendering for pages that use Clerk
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { useFont } from '@/contexts/FontContext'

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
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [imageCaptions, setImageCaptions] = useState<string[]>([])
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [formData, setFormData] = useState({
    listing_type: 'subletting', // 'subletting' or 'looking_for'
    property_type: '', // 'room', 'studio', 'apartment'
    description: '',
    price: '',
    location: '',
    contact_email: user?.emailAddresses[0]?.emailAddress || '',
    available_from: '',
    available_to: '',
    dog_friendly: false,
    cat_friendly: false
  })

  async function searchLocations(query: string) {
    if (query.length < 3) {
      setLocationSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      // Using a simple approach with Nominatim (OpenStreetMap) - it's free
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`
      )
      const data = await response.json()

      const suggestions = (data as NominatimResult[]).map(item => item.display_name).slice(0, 5)
      setLocationSuggestions(suggestions)
      setShowSuggestions(suggestions.length > 0)
    } catch (error) {
      console.error('Error fetching location suggestions:', error)
      setLocationSuggestions([])
      setShowSuggestions(false)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    // Handle location autocomplete
    if (name === 'location') {
      searchLocations(value)
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
      contact_email: formData.contact_email,
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
      `}</style>

      <main className="p-4">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">

          <div className="mb-16 flex justify-center gap-8">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, listing_type: 'subletting' }))}
              className={`text-black relative tab-button ${formData.listing_type === 'subletting' ? 'active' : ''}`}
              style={{
                fontFamily: fontFamily,
                fontSize: '24px'
              }}
            >
              Sublets
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, listing_type: 'looking_for' }))}
              className={`text-black relative tab-button ${formData.listing_type === 'looking_for' ? 'active' : ''}`}
              style={{
                fontFamily: fontFamily,
                fontSize: '24px'
              }}
            >
              Requests
            </button>
          </div>

          {/* Property Type Dropdown */}
          <div>
            <select
              id="property_type"
              name="property_type"
              value={formData.property_type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-black focus:outline-none text-black bg-white appearance-none"
              style={{
                fontFamily: fontFamily,
                fontSize: '24px',
                backgroundImage: 'none'
              }}
            >
              <option value="">Select Property Type</option>
              <option value="room">Room</option>
              <option value="studio">Studio</option>
              <option value="apartment">Apartment</option>
            </select>
          </div>

          <div>
            <textarea
              id="description"
              name="description"
              rows={4}
              maxLength={280}
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-black focus:outline-none text-black placeholder-gray-400"
              placeholder="Description"
              style={{
                fontFamily: fontFamily,
                fontSize: '24px'
              }}
            />
            <div className="text-sm text-gray-400 mt-1" style={{ fontFamily: fontFamily }}>
              {formData.description.length}/280 characters
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <input
                type="number"
                id="price"
                name="price"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-black focus:outline-none text-black placeholder-gray-400"
                placeholder="Price (usd)"
                style={{
                  fontFamily: fontFamily,
                  fontSize: '24px'
                }}
              />
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
                className="w-full px-3 py-2 border border-black focus:outline-none text-black placeholder-gray-400"
                placeholder="Location"
                autoComplete="off"
                style={{
                  fontFamily: fontFamily,
                  fontSize: '24px'
                }}
              />
              {showSuggestions && locationSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-black max-h-60 overflow-y-auto">
                  {locationSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectLocation(suggestion)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-black"
                      style={{
                        fontFamily: fontFamily,
                        fontSize: '24px'
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <input
              type="email"
              id="contact_email"
              name="contact_email"
              required
              value={formData.contact_email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-black focus:outline-none text-black placeholder-gray-400"
              placeholder="Contact Email"
              style={{
                fontFamily: fontFamily,
                fontSize: '24px'
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <input
                type="date"
                id="available_from"
                name="available_from"
                value={formData.available_from}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-black focus:outline-none text-black"
                title="Available From"
                style={{
                  fontFamily: fontFamily,
                  fontSize: '24px'
                }}
              />
            </div>

            <div>
              <input
                type="date"
                id="available_to"
                name="available_to"
                value={formData.available_to}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-black focus:outline-none text-black"
                title="Available Until"
                style={{
                  fontFamily: fontFamily,
                  fontSize: '24px'
                }}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="dog_friendly"
                name="dog_friendly"
                checked={formData.dog_friendly}
                onChange={handleInputChange}
                className="rounded border-black text-black focus:outline-none"
              />
              <label htmlFor="dog_friendly" className="text-black" style={{ fontFamily: fontFamily, fontSize: '24px' }}>
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
                className="rounded border-black text-black focus:outline-none"
              />
              <label htmlFor="cat_friendly" className="text-black" style={{ fontFamily: fontFamily, fontSize: '24px' }}>
                🐱 Friendly
              </label>
            </div>
          </div>

          <div>
            <ImageUpload
              images={images}
              onImagesChange={setImages}
              thumbnails={thumbnails}
              onThumbnailsChange={setThumbnails}
              imageCaptions={imageCaptions}
              onImageCaptionsChange={setImageCaptions}
              maxImages={10}
            />
          </div>

          <div className="flex justify-center gap-4 pt-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-red-600 relative action-link"
              style={{ fontSize: '24px', fontFamily: fontFamily }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="text-black relative action-link disabled:opacity-50"
              style={{ fontSize: '24px', fontFamily: fontFamily }}
            >
              {loading ? 'Creating...' : 'Create Listing'}
            </button>
          </div>
        </form>
        </div>
      </main>
    </div>
  )
}