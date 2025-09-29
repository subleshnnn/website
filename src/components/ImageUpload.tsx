'use client'

import { useState } from 'react'

interface ImageData {
  url: string
  caption: string
}

interface ImageUploadProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  thumbnails?: string[]
  onThumbnailsChange?: (thumbnails: string[]) => void
  imageCaptions?: string[]
  onImageCaptionsChange?: (captions: string[]) => void
  maxImages?: number
}

// Function to create both full-size and thumbnail
const createImageVersions = (file: File): Promise<{ full: File, thumbnail: File }> => {
  return new Promise((resolve) => {
    const img = new Image()

    img.onload = async () => {
      // Create full-size version (max 1200px, high quality)
      const fullCanvas = document.createElement('canvas')
      const fullCtx = fullCanvas.getContext('2d')

      let fullWidth = img.width
      let fullHeight = img.height
      const maxFull = 1200

      if (fullWidth > maxFull || fullHeight > maxFull) {
        if (fullWidth > fullHeight) {
          fullHeight = (fullHeight * maxFull) / fullWidth
          fullWidth = maxFull
        } else {
          fullWidth = (fullWidth * maxFull) / fullHeight
          fullHeight = maxFull
        }
      }

      fullCanvas.width = fullWidth
      fullCanvas.height = fullHeight
      fullCtx?.drawImage(img, 0, 0, fullWidth, fullHeight)

      // Create thumbnail (700px, 80% quality)
      const thumbCanvas = document.createElement('canvas')
      const thumbCtx = thumbCanvas.getContext('2d')

      let thumbWidth = img.width
      let thumbHeight = img.height
      const maxThumb = 700

      if (thumbWidth > maxThumb || thumbHeight > maxThumb) {
        if (thumbWidth > thumbHeight) {
          thumbHeight = (thumbHeight * maxThumb) / thumbWidth
          thumbWidth = maxThumb
        } else {
          thumbWidth = (thumbWidth * maxThumb) / thumbHeight
          thumbHeight = maxThumb
        }
      }

      thumbCanvas.width = thumbWidth
      thumbCanvas.height = thumbHeight
      thumbCtx?.drawImage(img, 0, 0, thumbWidth, thumbHeight)

      // Convert to files using WebP format for better compression
      const fullBlob = await new Promise<Blob>((res) => fullCanvas.toBlob(res!, 'image/webp', 0.9))
      const thumbBlob = await new Promise<Blob>((res) => thumbCanvas.toBlob(res!, 'image/webp', 0.8))

      const fullFile = new File([fullBlob], file.name.replace(/\.[^/.]+$/, '.webp'), { type: 'image/webp', lastModified: Date.now() })
      const thumbFile = new File([thumbBlob], `thumb_${file.name}`.replace(/\.[^/.]+$/, '.webp'), { type: 'image/webp', lastModified: Date.now() })

      resolve({ full: fullFile, thumbnail: thumbFile })
    }

    img.src = URL.createObjectURL(file)
  })
}

export default function ImageUpload({ images, onImagesChange, thumbnails = [], onThumbnailsChange, imageCaptions = [], onImageCaptionsChange, maxImages = 10 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)


  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])

    console.log('🔍 handleFileSelect called with', files.length, 'files')

    if (files.length === 0) return

    // Check if adding these files would exceed the limit
    if (images.length + files.length > maxImages) {
      alert(`You can only upload a maximum of ${maxImages} images. You currently have ${images.length} images.`)
      return
    }

    setUploading(true)

    try {
      const newImages: string[] = []
      const newThumbnails: string[] = []

      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert(`${file.name} is not an image file`)
          continue
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name} is too large. Maximum size is 5MB.`)
          continue
        }

        // Create both full-size and thumbnail versions using WebP
        const { full, thumbnail } = await createImageVersions(file)

        // Convert both to base64 for storage
        const fullBase64 = await fileToBase64(full)
        const thumbnailBase64 = await fileToBase64(thumbnail)

        console.log('📄 File converted to WebP base64:', {
          fileName: file.name,
          originalSize: file.size,
          originalType: file.type,
          fullSize: full.size,
          thumbnailSize: thumbnail.size,
          fullBase64Length: fullBase64.length,
          thumbnailBase64Length: thumbnailBase64.length,
          compressionRatio: ((file.size - full.size) / file.size * 100).toFixed(1) + '%'
        })

        newImages.push(fullBase64)
        newThumbnails.push(thumbnailBase64)
      }

      // Add new images to existing ones
      onImagesChange([...images, ...newImages])
      // Add new thumbnails to existing ones
      if (onThumbnailsChange) {
        onThumbnailsChange([...thumbnails, ...newThumbnails])
      }
      // Add empty captions for new images
      if (onImageCaptionsChange) {
        const newCaptions = [...imageCaptions, ...Array(newImages.length).fill('')]
        onImageCaptionsChange(newCaptions)
      }
    } catch (error) {
      console.error('Error uploading images:', error)
      alert('Error uploading images. Please try again.')
    } finally {
      setUploading(false)
      // Clear the input
      event.target.value = ''
    }
  }

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setUploading(true)

    const files = Array.from(event.dataTransfer.files)
    
    if (files.length === 0) {
      setUploading(false)
      return
    }
    
    // Check if adding these files would exceed the limit
    if (images.length + files.length > maxImages) {
      alert(`You can only upload a maximum of ${maxImages} images. You currently have ${images.length} images.`)
      setUploading(false)
      return
    }

    try {
      const newImages: string[] = []
      const newThumbnails: string[] = []

      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert(`${file.name} is not an image file`)
          continue
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name} is too large. Maximum size is 5MB.`)
          continue
        }

        // Create both full-size and thumbnail versions using WebP
        const { full, thumbnail } = await createImageVersions(file)

        // Convert both to base64 for storage
        const fullBase64 = await fileToBase64(full)
        const thumbnailBase64 = await fileToBase64(thumbnail)

        console.log('📄 File converted to WebP base64:', {
          fileName: file.name,
          originalSize: file.size,
          originalType: file.type,
          fullSize: full.size,
          thumbnailSize: thumbnail.size,
          fullBase64Length: fullBase64.length,
          thumbnailBase64Length: thumbnailBase64.length,
          compressionRatio: ((file.size - full.size) / file.size * 100).toFixed(1) + '%'
        })

        newImages.push(fullBase64)
        newThumbnails.push(thumbnailBase64)
      }

      // Add new images to existing ones
      onImagesChange([...images, ...newImages])
      // Add new thumbnails to existing ones
      if (onThumbnailsChange) {
        onThumbnailsChange([...thumbnails, ...newThumbnails])
      }
      // Add empty captions for new images
      if (onImageCaptionsChange) {
        const newCaptions = [...imageCaptions, ...Array(newImages.length).fill('')]
        onImageCaptionsChange(newCaptions)
      }
    } catch (error) {
      console.error('Error uploading images:', error)
      alert('Error uploading images. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)
    if (onThumbnailsChange) {
      const newThumbnails = thumbnails.filter((_, i) => i !== index)
      onThumbnailsChange(newThumbnails)
    }
    if (onImageCaptionsChange) {
      const newCaptions = imageCaptions.filter((_, i) => i !== index)
      onImageCaptionsChange(newCaptions)
    }
  }

  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images]
    const [moved] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, moved)
    onImagesChange(newImages)
    if (onThumbnailsChange) {
      const newThumbnails = [...thumbnails]
      const [movedThumbnail] = newThumbnails.splice(fromIndex, 1)
      newThumbnails.splice(toIndex, 0, movedThumbnail)
      onThumbnailsChange(newThumbnails)
    }
    if (onImageCaptionsChange) {
      const newCaptions = [...imageCaptions]
      const [movedCaption] = newCaptions.splice(fromIndex, 1)
      newCaptions.splice(toIndex, 0, movedCaption)
      onImageCaptionsChange(newCaptions)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  const updateCaption = (index: number, caption: string) => {
    if (onImageCaptionsChange) {
      const newCaptions = [...imageCaptions]
      newCaptions[index] = caption
      onImageCaptionsChange(newCaptions)
    }
  }

  return (
    <div 
      className="space-y-4"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
    >
      {/* Upload Button */}
      <div>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id="image-upload"
        />
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={index} className="space-y-2">
              <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden relative group">
                <img
                  src={image}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('❌ Image failed to load for index:', index);
                    console.error('Image source starts with:', image.substring(0, 100));
                    console.error('Full image length:', image.length);
                    console.error('Image data type check:', typeof image);
                    console.error('Is valid data URL:', image.startsWith('data:'));
                  }}
                  onLoad={() => {
                    console.log('✅ Image loaded successfully for index:', index);
                    console.log('Image source starts with:', image.substring(0, 50));
                  }}
                />

                {/* Image Controls */}
                <div className="absolute inset-0 transition-all duration-200">
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black bg-opacity-50">
                    <div className="flex space-x-2">
                      {/* Move Left */}
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => moveImage(index, index - 1)}
                          className="p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
                          title="Move left"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="p-1 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700"
                        title="Delete image"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>

                      {/* Move Right */}
                      {index < images.length - 1 && (
                        <button
                          type="button"
                          onClick={() => moveImage(index, index + 1)}
                          className="p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
                          title="Move right"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cover Badge */}
                {index === 0 && (
                  <div className="absolute top-2 left-2 bg-white text-black text-xs px-2 py-1 rounded">
                    Cover
                  </div>
                )}
              </div>

              {/* Caption Input */}
              {onImageCaptionsChange && (
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Add caption..."
                    value={imageCaptions[index] || ''}
                    onChange={(e) => updateCaption(index, e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          ))}

          {/* Add More Images Button */}
          {images.length < maxImages && (
            <div className="aspect-square flex items-center justify-center">
              <button
                type="button"
                onClick={() => document.getElementById('image-upload')?.click()}
                className="w-12 h-12 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                title="Add more images"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {images.length === 0 && (
        <div
          className="border-2 border-dashed border-gray-300 p-8 text-center text-black hover:bg-gray-100 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onClick={() => document.getElementById('image-upload')?.click()}
        >
          <p className="text-lg text-gray-500 mb-2">Images - Drop here or click to upload</p>
        </div>
      )}
    </div>
  )
}