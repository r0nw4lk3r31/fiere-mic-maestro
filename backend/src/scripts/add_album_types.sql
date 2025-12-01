-- Add album_type and allow_customer_uploads columns to albums table
ALTER TABLE albums
ADD COLUMN album_type VARCHAR(20) DEFAULT 'event' CHECK (album_type IN ('event', 'gallery')),
ADD COLUMN allow_customer_uploads BOOLEAN DEFAULT true;

-- Update existing albums to be 'event' type
UPDATE albums SET album_type = 'event', allow_customer_uploads = true;

-- Add comment for documentation
COMMENT ON COLUMN albums.album_type IS 'Type of album: event (tied to date, customer uploads) or gallery (admin only, no date requirement)';
COMMENT ON COLUMN albums.allow_customer_uploads IS 'Whether customers can upload photos to this album (typically true for events, false for galleries)';
