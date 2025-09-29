import Navigation from '@/components/Navigation'
import { supabase, type Listing } from '@/lib/supabase'

interface ListingWithImages extends Listing {
  dog_friendly?: boolean
  cat_friendly?: boolean
  listing_images: Array<{
    id: string
    image_url: string
    thumbnail_url?: string
    is_primary: boolean
  }>
}
import Link from 'next/link'
import Image from 'next/image'

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

async function getLookingForListings(): Promise<ListingWithImages[]> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        listing_images (
          id,
          image_url,
          is_primary
        )
      `)
      .eq('listing_type', 'looking_for')
      .order('created_at', { ascending: false })
      .limit(12)

    if (error) {
      console.error('Error fetching looking for listings:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      console.error('Error message:', error.message)
      console.error('Error code:', error.code)
      return []
    }

    return data || []
  } catch (networkError) {
    console.error('Network error fetching looking for listings:', networkError)
    return []
  }
}

export default async function LookingForPage() {
  const listings = await getLookingForListings()

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <main className="px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {listings.length === 0 ? (
          <div className="py-12">
            <div className="mb-4">
              <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg text-gray-900 mb-2">No looking for posts yet</h3>
            <p className="text-gray-500 mb-4">People looking for spaces will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-24">
            {listings.map((listing) => {
              const primaryImage = listing.listing_images?.find(img => img.is_primary) || listing.listing_images?.[0]
              return (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="block text-center"
                >
                  <div className="text-lg text-black">
                    {listing.location}
                  </div>
                  <div className="text-lg text-black">
                    {(listing.available_from || listing.available_to) &&
                      (listing.available_from && listing.available_to
                        ? `${formatDate(listing.available_from)} – ${formatDate(listing.available_to)}`
                        : listing.available_from
                        ? `From ${formatDate(listing.available_from)}`
                        : listing.available_to
                        ? `Until ${formatDate(listing.available_to)}`
                        : ''
                      )
                    }
                  </div>
                  <div className="text-lg text-black mb-4">
                    ${(listing.price / 100).toFixed(0)}
                    {(listing.dog_friendly || listing.cat_friendly) && (
                      <span className="text-amber-700 ml-2">
                        {listing.dog_friendly && '🐕 friendly '}
                        {listing.cat_friendly && '🐱 friendly'}
                      </span>
                    )}
                  </div>
                  {primaryImage ? (
                    <Image
                      src={primaryImage.image_url}
                      alt="Listing image"
                      width={400}
                      height={400}
                      className="h-auto w-full"
                      style={{ maxHeight: '400px', objectFit: 'contain' }}
                      priority={false}
                    />
                  ) : (
                    <div className="bg-gray-200 flex items-center justify-center" style={{ height: '300px' }}>
                      <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}