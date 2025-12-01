-- Add review_status column to photos table for date mismatch tracking
ALTER TABLE photos
ADD COLUMN review_status VARCHAR(20) DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'date_mismatch'));

-- Update existing photos based on is_approved status
UPDATE photos SET review_status = 'approved' WHERE is_approved = true;
UPDATE photos SET review_status = 'pending' WHERE is_approved = false;

-- Add comment for documentation
COMMENT ON COLUMN photos.review_status IS 'Photo review status: pending (awaiting approval), approved (published), rejected (denied), date_mismatch (uploaded on wrong date, needs admin handling)';
