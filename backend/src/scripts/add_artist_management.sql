-- Add is_regular column to artists table
ALTER TABLE artists ADD COLUMN IF NOT EXISTS is_regular BOOLEAN DEFAULT false;

-- Create performance_log table
CREATE TABLE IF NOT EXISTS performance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_name TEXT NOT NULL,
  song_description TEXT,
  performed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for performance lookups by date
CREATE INDEX IF NOT EXISTS idx_performance_log_performed_at ON performance_log(performed_at DESC);

-- Create index for artist name lookups
CREATE INDEX IF NOT EXISTS idx_performance_log_artist_name ON performance_log(artist_name);

COMMENT ON TABLE performance_log IS 'Tracks artist performances with timestamps for stats and history';
COMMENT ON COLUMN artists.is_regular IS 'True if artist is saved as a regular, false for one-time QR signups';
