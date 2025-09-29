-- Artists Rental Site Database Schema
-- Run this in your Supabase SQL Editor (SKIP the JWT secret line)

-- Create listings table
CREATE TABLE listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL, -- Clerk user ID
    title TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL, -- Price in cents
    location TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    available_from DATE,
    available_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create listing images table
CREATE TABLE listing_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;

-- Create policies for listings
-- Everyone can read listings
CREATE POLICY "Anyone can read listings" ON listings
    FOR SELECT USING (true);

-- Users can only insert their own listings
CREATE POLICY "Users can insert own listings" ON listings
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Users can only update their own listings
CREATE POLICY "Users can update own listings" ON listings
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Users can only delete their own listings
CREATE POLICY "Users can delete own listings" ON listings
    FOR DELETE USING (auth.uid()::text = user_id);

-- Create policies for listing_images
-- Everyone can read images
CREATE POLICY "Anyone can read listing images" ON listing_images
    FOR SELECT USING (true);

-- Users can only manage images for their own listings
CREATE POLICY "Users can manage own listing images" ON listing_images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM listings 
            WHERE listings.id = listing_images.listing_id 
            AND listings.user_id = auth.uid()::text
        )
    );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for listings
CREATE TRIGGER update_listings_updated_at
    BEFORE UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_listings_user_id ON listings(user_id);
CREATE INDEX idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX idx_listings_available_dates ON listings(available_from, available_to);
CREATE INDEX idx_listing_images_listing_id ON listing_images(listing_id);
CREATE INDEX idx_listing_images_primary ON listing_images(listing_id, is_primary);