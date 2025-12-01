import { Router } from 'express';
import multer from 'multer';
import {
  getPhotos,
  getPhoto,
  uploadPhoto,
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

// PUT /api/photos/:id - Update photo (visibility, approval, etc.)
router.put('/:id', updatePhoto);

// PUT /api/photos/:id/approve - Approve/reject photo
router.put('/:id/approve', approvePhoto);

// DELETE /api/photos/:id - Delete photo
router.delete('/:id', deletePhoto);

export default router;