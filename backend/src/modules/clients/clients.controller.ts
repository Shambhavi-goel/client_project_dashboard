import { Request, Response, NextFunction } from 'express';
import { ClientsService } from './clients.service';

export class ClientsController {
  static async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clients = await ClientsService.getAll();
      res.status(200).json({ success: true, data: clients });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await ClientsService.getById(req.params.id as string);
      res.status(200).json({ success: true, data: client });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await ClientsService.create(req.body);
      res.status(201).json({ success: true, data: client });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await ClientsService.update(req.params.id as string, req.body);
      res.status(200).json({ success: true, data: client });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ClientsService.delete(req.params.id as string);
      res.status(200).json({ success: true, message: 'Client deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
