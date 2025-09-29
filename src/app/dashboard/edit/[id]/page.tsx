'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import dynamic from 'next/dynamic'
import { supabase, type Listing } from '@/lib/supabase'

interface ListingImage {
  id: string
  image_url: string
  thumbnail_url?: string
  caption: string | null
  is_primary: boolean
}

const ImageUpload = dynamic(() => import('@/components/ImageUpload'), {
  loading: () => <div className="text-center py-4">Loading image upload...</div>
})

export default function EditListingPage() {
  const { user } = useUser()
  const router = useRouter()
  const params = useParams()
  const listingId = params.id as string
  
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [listing, setListing] = useState<Listing | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [imageCaptions, setImageCaptions] = useState<string[]>([])
  const [formData, setFormData] = useState({
    listing_type: 'subletting',
    description: '',
    price: '',
    location: '',
    contact_email: '',
    available_from: '',
    available_to: '',
    dog_friendly: false,
    cat_friendly: false
  })

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
        description: data.description || '',
        price: (data.price / 100).toString(),
        location: data.location,
        contact_email: data.contact_email,
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

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !listing) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from('listings')
        .update({
          title: `${formData.location} - ${new Date().toLocaleDateString()}`,
          listing_type: formData.listing_type,
          description: formData.description,
          price: Math.round(parseFloat(formData.price) * 100),
          location: formData.location,
          contact_email: formData.contact_email,
          available_from: formData.available_from || null,
          available_to: formData.available_to || null,
          dog_friendly: formData.dog_friendly,
          cat_friendly: formData.cat_friendly
        })
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
        <Navigation />
        <div className="px-4 sm:px-6 lg:px-8 py-8">
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

            <div>
              <input
                type="text"
                id="location"
                name="location"
                required
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none text-gray-500 placeholder-gray-400"
                placeholder="Location - e.g. Brooklyn, NY"
              />
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
              onClick={() => router.push('/dashboard')}
              className="flex-1 bg-white text-black border border-black py-3 px-6 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-black text-white py-3 px-6 hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Listing'}
            </button>
          </div>
        </form>
        </div>
      </main>
    </div>
  )
}