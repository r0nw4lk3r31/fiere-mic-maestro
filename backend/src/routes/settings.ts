import { Router } from 'express';
import { getSetting, updateSetting } from '../controllers/settings';

const router = Router();

// GET /api/settings/:key - Get a setting by key
router.get('/:key', getSetting);

// PUT /api/settings/:key - Update a setting
router.put('/:key', updateSetting);

export default router;
