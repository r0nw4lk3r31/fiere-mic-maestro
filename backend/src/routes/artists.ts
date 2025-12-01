import { Router } from 'express';
import {
  getArtists,
  getArtist,
  createArtist,
  updateArtist,
  deleteArtist,
  reorderArtists
} from '../controllers/artists';

const router = Router();

// GET /api/artists - Get all artists
router.get('/', getArtists);

// GET /api/artists/:id - Get single artist
router.get('/:id', getArtist);

// POST /api/artists - Create new artist
router.post('/', createArtist);

// PUT /api/artists/:id - Update artist
router.put('/:id', updateArtist);

// DELETE /api/artists/:id - Delete artist
router.delete('/:id', deleteArtist);

// POST /api/artists/reorder - Reorder artists
router.post('/reorder', reorderArtists);

export default router;