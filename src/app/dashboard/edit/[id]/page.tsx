'use client'

import { useUser } from '@clerk/nextjs'

// Force dynamic rendering for pages that use Clerk
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import dynamicImport from 'next/dynamic'
import { supabase, type Listing } from '@/lib/supabase'

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
  
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [listing, setListing] = useState<Listing | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [imageCaptions, setImageCaptions] = useState<string[]>([])
  const [formData, setFormData] = useState({
    listing_type: 'subletting',
    property_type: '',
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
        property_type: (data as unknown as {property_type?: string}).property_type || '',
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

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
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
      const updateData: Record<string, unknown> = {
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

      <main className="px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">

          <div className="mb-16 flex justify-center gap-8">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, listing_type: 'subletting' }))}
              className={`text-black relative tab-button ${formData.listing_type === 'subletting' ? 'active' : ''}`}
              style={{
                fontFamily: 'Cerial, sans-serif',
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
                fontFamily: 'Cerial, sans-serif',
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
                fontFamily: 'Cerial, sans-serif',
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
                fontFamily: 'Cerial, sans-serif',
                fontSize: '24px'
              }}
            />
            <div className="text-sm text-gray-400 mt-1" style={{ fontFamily: 'Cerial, sans-serif' }}>
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
                  fontFamily: 'Cerial, sans-serif',
                  fontSize: '24px'
                }}
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
                className="w-full px-3 py-2 border border-black focus:outline-none text-black placeholder-gray-400"
                placeholder="Location"
                style={{
                  fontFamily: 'Cerial, sans-serif',
                  fontSize: '24px'
                }}
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
              className="w-full px-3 py-2 border border-black focus:outline-none text-black placeholder-gray-400"
              placeholder="Contact Email"
              style={{
                fontFamily: 'Cerial, sans-serif',
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
                  fontFamily: 'Cerial, sans-serif',
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
                  fontFamily: 'Cerial, sans-serif',
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
              <label htmlFor="dog_friendly" className="text-black" style={{ fontFamily: 'Cerial, sans-serif', fontSize: '24px' }}>
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
              <label htmlFor="cat_friendly" className="text-black" style={{ fontFamily: 'Cerial, sans-serif', fontSize: '24px' }}>
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
              onClick={() => router.push('/dashboard')}
              className="text-red-600 relative action-link"
              style={{ fontSize: '24px', fontFamily: 'Cerial, sans-serif' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="text-black relative action-link disabled:opacity-50"
              style={{ fontSize: '24px', fontFamily: 'Cerial, sans-serif' }}
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