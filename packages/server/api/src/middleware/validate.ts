import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'

type ValidationSchema = {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
};

export const validateRequest = (schema: ValidationSchema | z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // If it's a simple schema (for backwards compatibility)
      if ('parseAsync' in schema) {
        req.body = await (schema as z.ZodSchema).parseAsync(req.body);
        next();
        return;
      }

      // Otherwise, it's a ValidationSchema object
      const validationSchema = schema as ValidationSchema;
      
      // Validate body if schema provided
      if (validationSchema.body) {
        req.body = await validationSchema.body.parseAsync(req.body);
      }
      
      // Validate query if schema provided
      if (validationSchema.query) {
        req.query = await validationSchema.query.parseAsync(req.query);
      }
      
      // Validate params if schema provided
      if (validationSchema.params) {
        req.params = await validationSchema.params.parseAsync(req.params);
      }
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
        return;
      }
      next(error);
    }
  };
}; 