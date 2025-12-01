import { Router } from 'express';
import multer from 'multer';
import {
  getPhotos,
  getPhoto,
  uploadPhoto,
  uploadDateMismatchPhoto,
  getDateMismatchPhotos,
  assignDateMismatchPhoto,
  updatePhoto,
  approvePhoto,
  deletePhoto
} from '../controllers/photos';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const router = Router();

// GET /api/photos - Get all photos (with optional filters)
router.get('/', getPhotos);

// GET /api/photos/:id - Get single photo
router.get('/:id', getPhoto);

// POST /api/photos - Upload new photo
router.post('/', upload.single('photo'), uploadPhoto);

// POST /api/photos/date-mismatch - Upload photo with date mismatch
router.post('/date-mismatch', upload.single('photo'), uploadDateMismatchPhoto);

// GET /api/photos/date-mismatch/list - Get all date mismatch photos
router.get('/date-mismatch/list', getDateMismatchPhotos);

// PUT /api/photos/:id/assign - Assign date mismatch photo to album
router.put('/:id/assign', assignDateMismatchPhoto);

// PUT /api/photos/:id - Update photo (visibility, approval, etc.)
router.put('/:id', updatePhoto);

// PUT /api/photos/:id/approve - Approve/reject photo
router.put('/:id/approve', approvePhoto);

// DELETE /api/photos/:id - Delete photo
router.delete('/:id', deletePhoto);

export default router;