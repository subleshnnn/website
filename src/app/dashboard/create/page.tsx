'use client'

import { useUser } from '@clerk/nextjs'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'

const ImageUpload = dynamic(() => import('@/components/ImageUpload'), {
  loading: () => <div className="text-center py-4">Loading image upload...</div>
})

export default function CreateListingPage() {
  const { user } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [imageCaptions, setImageCaptions] = useState<string[]>([])
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [formData, setFormData] = useState({
    listing_type: 'subletting', // 'subletting' or 'looking_for'
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

      const suggestions = data.map((item: any) => item.display_name).slice(0, 5)
      setLocationSuggestions(suggestions)
      setShowSuggestions(suggestions.length > 0)
    } catch (error) {
      console.error('Error fetching location suggestions:', error)
      setLocationSuggestions([])
      setShowSuggestions(false)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
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
    
    const insertData = {
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
      <Navigation />

      <main className="px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">

          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="relative bg-gray-200 rounded-full p-1 flex">
                <div
                  className="absolute top-1 bottom-1 bg-black rounded-full transition-all duration-300 ease-in-out"
                  style={{
                    width: 'calc(50% - 4px)',
                    left: formData.listing_type === 'subletting' ? '4px' : 'calc(50% + 2px)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, listing_type: 'subletting' }))}
                  className={`relative z-10 px-6 py-2 text-lg rounded-full transition-colors duration-300 ${
                    formData.listing_type === 'subletting' ? 'text-white' : 'text-black'
                  }`}
                >
                  Subletting
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, listing_type: 'looking_for' }))}
                  className={`relative z-10 px-6 py-2 text-lg rounded-full transition-colors duration-300 ${
                    formData.listing_type === 'looking_for' ? 'text-white' : 'text-black'
                  }`}
                >
                  Looking For
                </button>
              </div>
            </div>
          </div>

          <div>
            <textarea
              id="description"
              name="description"
              rows={4}
              maxLength={280}
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none text-gray-500 placeholder-gray-400"
              placeholder="Description - Describe your space, amenities, and any special features..."
            />
            <div className="text-sm text-gray-400 mt-1">
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
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none text-gray-500 placeholder-gray-400"
                placeholder="Price ($) - e.g. 1200"
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
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none text-gray-500 placeholder-gray-400"
                placeholder="Location - e.g. Brooklyn, NY"
                autoComplete="off"
              />
              {showSuggestions && locationSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 max-h-60 overflow-y-auto">
                  {locationSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectLocation(suggestion)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
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
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none text-gray-500 placeholder-gray-400"
              placeholder="Contact Email - e.g. artist@example.com"
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
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none text-gray-500"
                title="Available From"
              />
            </div>

            <div>
              <input
                type="date"
                id="available_to"
                name="available_to"
                value={formData.available_to}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none text-gray-500"
                title="Available Until"
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
                className="rounded border-gray-300 text-black focus:outline-none"
              />
              <label htmlFor="dog_friendly" className="text-lg text-gray-500">
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
                className="rounded border-gray-300 text-black focus:outline-none"
              />
              <label htmlFor="cat_friendly" className="text-lg text-gray-500">
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

          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-white text-black border border-black py-3 px-6 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-black text-white py-3 px-6 hover:bg-gray-800 transition-colors disabled:opacity-50"
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