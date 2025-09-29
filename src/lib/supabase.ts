import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
})

// Types for our database
export type Listing = {
  id: string
  user_id: string
  title: string
  description: string
  price: number
  location: string
  contact_email: string
  available_from: string
  available_to: string
  created_at: string
}

export type ListingImage = {
  id: string
  listing_id: string
  image_url: string
  is_primary: boolean
}