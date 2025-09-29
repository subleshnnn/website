-- Add image upload functionality
-- Run this in Supabase SQL Editor

-- Enable RLS on listing_images if not already enabled
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies to create new ones
DROP POLICY IF EXISTS "Anyone can read listing images" ON listing_images;
DROP POLICY IF EXISTS "Authenticated users can manage listing images" ON listing_images;
DROP POLICY IF EXISTS "Users can manage own listing images" ON listing_images;

-- Create new policies for listing_images
CREATE POLICY "Anyone can read listing images" ON listing_images
    FOR SELECT USING (true);

CREATE POLICY "Allow all operations on listing images" ON listing_images 
    FOR ALL USING (true) WITH CHECK (true);