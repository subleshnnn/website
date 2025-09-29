-- Add thumbnail_url column to listing_images table
-- Run this in Supabase SQL Editor

ALTER TABLE listing_images
ADD COLUMN thumbnail_url text;