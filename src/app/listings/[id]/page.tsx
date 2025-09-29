import Navigation from '@/components/Navigation'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import ContactButton from '@/components/ContactButton'
import Image from 'next/image'

// Force dynamic rendering since Navigation uses Clerk hooks
export const dynamic = 'force-dynamic'

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

interface Props {
  params: Promise<{ id: string }>
}

async function getListing(id: string) {
  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      listing_images (
        id,
        image_url,
        caption,
        is_primary
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params
  const listing = await getListing(id)

  if (!listing) {
    notFound()
  }

  // Sort images - primary first
  interface ImageType {
    id: string
    is_primary: boolean
    image_url: string
    thumbnail_url?: string
    caption?: string
  }

  const sortedImages = listing.listing_images?.sort((a: ImageType, b: ImageType) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    return 0
  }) || []

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main className="py-8 pt-24">
        <div className="bg-white overflow-hidden">
          
          {/* Listing Information */}
          <div className="px-4 sm:px-6 lg:px-8 text-center">
            <div>
              <div className="mb-8 text-lg text-black">
                <div>
                  {listing.location}
                </div>
                {(listing.available_from || listing.available_to) && (
                  <div>
                    {listing.available_from && listing.available_to 
                      ? `${formatDate(listing.available_from)} – ${formatDate(listing.available_to)}`
                      : listing.available_from 
                      ? `From ${formatDate(listing.available_from)}`
                      : listing.available_to 
                      ? `Until ${formatDate(listing.available_to)}`
                      : ''
                    }
                  </div>
                )}
                <div>
                  ${(listing.price / 100).toFixed(0)}
                </div>
                {(listing.dog_friendly || listing.cat_friendly) && (
                  <div className="text-amber-700">
                    {listing.dog_friendly && '🐕 friendly '}
                    {listing.cat_friendly && '🐱 friendly'}
                  </div>
                )}
                <ContactButton
                  listingId={listing.id}
                  listingOwnerId={listing.user_id}
                  listingTitle={listing.title}
                />
              </div>

              <div className="prose mb-8 mx-auto" style={{ maxWidth: '80ch' }}>
                {listing.description ? (
                  <p className="text-black leading-relaxed text-lg">
                    {listing.description}
                  </p>
                ) : (
                  <p className="text-black text-lg">No description provided</p>
                )}
              </div>
            </div>
          </div>

          {/* Images Section */}
          {sortedImages.length > 0 && (
            <div>
              <div className="px-4 sm:px-6 lg:px-8 text-center">
                <div className="space-y-24">
                  {sortedImages.map((image: ImageType, index: number) => (
                    <div key={image.id} className="relative">
                      <Image
                        src={image.image_url}
                        alt={`Listing image ${index + 1}`}
                        width={600}
                        height={600}
                        className="h-auto mx-auto"
                        style={{ maxHeight: '600px', objectFit: 'contain' }}
                        priority={index === 0}
                      />
                      {image.caption && (
                        <p className="mt-2 text-lg text-black">{image.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No Images Placeholder */}
          {sortedImages.length === 0 && (
            <div>
              <div className="px-4 sm:px-6 lg:px-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-black text-lg">No images available for this listing</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}