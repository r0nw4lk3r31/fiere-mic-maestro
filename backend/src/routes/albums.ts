import { Router } from 'express';
import {
  getAlbums,
  getAlbum,
  createAlbum,
  updateAlbum,
  deleteAlbum
} from '../controllers/albums';

const router = Router();

// GET /api/albums - Get all active albums
router.get('/', getAlbums);

// GET /api/albums/:id - Get single album
router.get('/:id', getAlbum);

// POST /api/albums - Create new album
router.post('/', createAlbum);

// PUT /api/albums/:id - Update album
router.put('/:id', updateAlbum);

// DELETE /api/albums/:id - Delete album (soft delete)
router.delete('/:id', deleteAlbum);

export default router;