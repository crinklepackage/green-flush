import { Request, Response, NextFunction } from 'express';
import { isValidStatus } from '../../../../shared/src';
import { ProcessingStatus } from '../../../../shared/src';

/**
 * Middleware to validate status values in request bodies
 * This prevents invalid status values from entering the database
 */
export function validateStatusMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip if no body or not a POST/PUT/PATCH request
  if (!req.body || !['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  // Check for status field in the request body
  if (req.body.status) {
    if (!isValidStatus(req.body.status)) {
      const validStatuses = Object.values(ProcessingStatus).join(', ');
      return res.status(400).json({
        error: 'Invalid status value',
        message: `Status must be one of: ${validStatuses}`,
        providedStatus: req.body.status
      });
    }
  }

  // If we're doing a bulk operation or have nested objects, check those too
  if (req.body.summaries && Array.isArray(req.body.summaries)) {
    for (const summary of req.body.summaries) {
      if (summary.status && !isValidStatus(summary.status)) {
        const validStatuses = Object.values(ProcessingStatus).join(', ');
        return res.status(400).json({
          error: 'Invalid status value in summaries array',
          message: `Status must be one of: ${validStatuses}`,
          providedStatus: summary.status
        });
      }
    }
  }

  // Check for updates object which might contain status
  if (req.body.updates && typeof req.body.updates === 'object' && req.body.updates.status) {
    if (!isValidStatus(req.body.updates.status)) {
      const validStatuses = Object.values(ProcessingStatus).join(', ');
      return res.status(400).json({
        error: 'Invalid status value in updates object',
        message: `Status must be one of: ${validStatuses}`,
        providedStatus: req.body.updates.status
      });
    }
  }

  next();
} 