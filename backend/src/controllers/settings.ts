import { Request, Response, NextFunction } from 'express';
import { db } from '../models';
import { settings } from '../models/schema';
import { eq } from 'drizzle-orm';
import { createApiError } from '../middleware/errorHandler';

export const getSetting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;

    const result = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (result.length === 0) {
      return res.json({
        success: true,
        data: null
      });
    }

    res.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    next(createApiError('Failed to fetch setting', 500));
  }
};

export const updateSetting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return next(createApiError('Value is required', 400));
    }

    // Check if setting exists
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    let result;
    if (existing.length > 0) {
      // Update existing
      result = await db
        .update(settings)
        .set({ value: String(value), updated_at: new Date() })
        .where(eq(settings.key, key))
        .returning();
    } else {
      // Create new
      result = await db
        .insert(settings)
        .values({ key, value: String(value) })
        .returning();
    }

    res.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    next(createApiError('Failed to update setting', 500));
  }
};
