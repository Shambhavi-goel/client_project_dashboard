import { Request, Response, NextFunction } from 'express';
import { ProjectsService } from './projects.service';
import { AuthUser } from '../../types/express';

export class ProjectsController {
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projects = await ProjectsService.getAll(req.user as AuthUser);
      res.status(200).json({ success: true, data: projects });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await ProjectsService.getById(req.params.id as string, req.user as AuthUser);
      res.status(200).json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await ProjectsService.create(req.body, req.user as AuthUser);
      res.status(201).json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await ProjectsService.update(
        req.params.id as string,
        req.body,
        req.user as AuthUser
      );
      res.status(200).json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ProjectsService.delete(req.params.id as string, req.user as AuthUser);
      res.status(200).json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
