import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { Role } from '@prisma/client';

export class UsersController {
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = req.query.role as Role | undefined;
      const users = await UsersService.getAll(role);
      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UsersService.getById(req.params.id as string);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}
