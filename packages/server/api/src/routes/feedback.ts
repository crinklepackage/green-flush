import express, { Router } from 'express';
import { validateRequest } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { CreateFeedbackSchema, UpdateFeedbackSchema } from '@wavenotes-new/shared';
import { DatabaseService } from '../lib/database';

/*
  Purpose:
  - POST /feedback: Submit user feedback
  - GET /feedback: Get user's own feedback (authenticated)
  - GET /admin/feedback: Get all feedback (admin only)
  - GET /admin/feedback/:id: Get a specific feedback entry (admin only)
  - PATCH /admin/feedback/:id: Update feedback status, notes, etc. (admin only)
*/

export function feedbackRoutes(db: DatabaseService) {
  const router = Router();

  // Submit feedback - authenticated users only
  router.post('/', 
    authMiddleware, 
    validateRequest({ body: CreateFeedbackSchema }),
    async (req, res, next) => {
      try {
        const userId = req.user.id;
        
        const feedback = await db.createFeedback({
          user_id: userId,
          feedback_type: req.body.feedback_type,
          feedback_text: req.body.feedback_text,
          summary_id: req.body.summary_id,
          podcast_id: req.body.podcast_id,
          page_url: req.body.page_url,
          browser_info: req.body.browser_info,
          tags: req.body.tags
        });

        res.status(201).json(feedback);
      } catch (error) {
        next(error);
      }
    }
  );

  // Get user's own feedback
  router.get('/',
    authMiddleware,
    async (req, res, next) => {
      try {
        const userId = req.user.id;
        const feedback = await db.getFeedback({ user_id: userId });
        res.json(feedback);
      } catch (error) {
        next(error);
      }
    }
  );

  // ADMIN ROUTES
  
  // Get all feedback (admin only)
  router.get('/admin',
    authMiddleware,
    adminMiddleware,
    async (req, res, next) => {
      try {
        const { filter, sort } = req.query;
        
        // Build filters
        let filters = {};
        if (filter && filter !== 'all') {
          if (filter === 'new') {
            filters = { status: 'new' };
          } else {
            filters = { feedback_type: filter };
          }
        }

        // Build sort options
        let sortOptions = {};
        if (sort === 'oldest') {
          sortOptions = { submitted_at: 1 };
        } else if (sort === 'priority') {
          sortOptions = { priority: 1 };
        } else {
          sortOptions = { submitted_at: -1 }; // newest first (default)
        }

        const feedback = await db.getFeedback(filters, sortOptions);
        res.json(feedback);
      } catch (error) {
        next(error);
      }
    }
  );

  // Get single feedback by ID (admin only)
  router.get('/admin/:id',
    authMiddleware,
    adminMiddleware,
    async (req, res, next) => {
      try {
        const feedback = await db.getFeedbackById(req.params.id);
        
        if (!feedback) {
          return res.status(404).json({ message: 'Feedback not found' });
        }
        
        res.json(feedback);
      } catch (error) {
        next(error);
      }
    }
  );

  // Update feedback (admin only)
  router.patch('/admin/:id',
    authMiddleware,
    adminMiddleware,
    validateRequest({ body: UpdateFeedbackSchema }),
    async (req, res, next) => {
      try {
        const feedback = await db.updateFeedback(req.params.id, {
          status: req.body.status,
          admin_notes: req.body.admin_notes,
          priority: req.body.priority,
          tags: req.body.tags
        });
        
        res.json(feedback);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
} 