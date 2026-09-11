import { Request, Response, NextFunction } from 'express';
import { TasksService } from './tasks.service';
import { AuthUser } from '../../types/express';
import { TaskFilterQuery } from './tasks.schemas';

export class TasksController {
  static async getProjectTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.projectId as string;
      const filters = req.query as unknown as TaskFilterQuery;
      const tasks = await TasksService.getProjectTasks(projectId, req.user as AuthUser, filters);
      res.status(200).json({ success: true, data: tasks });
    } catch (error) {
      next(error);
    }
  }

  static async getMyTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = req.query as unknown as TaskFilterQuery;
      const tasks = await TasksService.getMyTasks(req.user as AuthUser, filters);
      res.status(200).json({ success: true, data: tasks });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await TasksService.getById(req.params.id as string, req.user as AuthUser);
      res.status(200).json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.projectId as string;
      const task = await TasksService.create(projectId, req.body, req.user as AuthUser);
      res.status(201).json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await TasksService.update(
        req.params.id as string,
        req.body,
        req.user as AuthUser
      );
      res.status(200).json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TasksService.updateStatus(
        req.params.id as string,
        req.body.status,
        req.user as AuthUser
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await TasksService.delete(req.params.id as string, req.user as AuthUser);
      res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
