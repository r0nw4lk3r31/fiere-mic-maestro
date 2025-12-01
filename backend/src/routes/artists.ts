import { Router } from 'express';
import {
  getArtists,
  getArtist,
  createArtist,
  updateArtist,
  deleteArtist,
  reorderArtists,
  getRegularArtists,
  markAsPerformed,
  getPerformanceHistory
} from '../controllers/artists';

const router = Router();

// GET /api/artists - Get all artists (playlist)
router.get('/', getArtists);

// GET /api/artists/regulars - Get saved regular artists
router.get('/regulars/list', getRegularArtists);

// GET /api/artists/history - Get performance history
router.get('/history/list', getPerformanceHistory);

// POST /api/artists/reorder - Reorder artists (must be before /:id routes)
router.post('/reorder', reorderArtists);

// POST /api/artists/:id/performed - Mark artist as performed and log
router.post('/:id/performed', markAsPerformed);

// GET /api/artists/:id - Get single artist
router.get('/:id', getArtist);

// POST /api/artists - Create new artist
router.post('/', createArtist);

// PUT /api/artists/:id - Update artist
router.put('/:id', updateArtist);

// DELETE /api/artists/:id - Delete artist
router.delete('/:id', deleteArtist);

export default router;