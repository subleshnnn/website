-- Fix listing_images RLS policy
-- Run this in Supabase SQL Editor

-- Drop existing listing_images policies
DROP POLICY IF EXISTS "Authenticated users can manage listing images" ON listing_images;
DROP POLICY IF EXISTS "Users can manage own listing images" ON listing_images;

-- Create new comprehensive policies for listing_images
-- Allow read access for all authenticated users
CREATE POLICY "Authenticated users can view listing images" ON listing_images
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow insert for authenticated users (we'll validate ownership in the app)
CREATE POLICY "Authenticated users can insert listing images" ON listing_images
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow update for authenticated users
CREATE POLICY "Authenticated users can update listing images" ON listing_images
    FOR UPDATE USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Allow delete for authenticated users
CREATE POLICY "Authenticated users can delete listing images" ON listing_images
    FOR DELETE USING (auth.role() = 'authenticated');