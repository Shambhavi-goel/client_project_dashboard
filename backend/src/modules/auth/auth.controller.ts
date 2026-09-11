import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { config } from '../../config';
import { UnauthorizedError } from '../../middleware/errorHandler';

const REFRESH_COOKIE_NAME = 'cpd_refresh_token';

const isProduction = config.nodeEnv === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, accessToken, refreshToken } = await AuthService.login(req.body);

      res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);

      res.status(200).json({
        success: true,
        data: {
          user,
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Prioritize HttpOnly cookie; fallback to request body if client provides it
      const rawToken = req.cookies[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

      if (!rawToken) {
        throw new UnauthorizedError('No refresh token provided');
      }

      const { user, accessToken, refreshToken: newRefreshToken } = await AuthService.refresh(rawToken);

      res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, cookieOptions);

      res.status(200).json({
        success: true,
        data: {
          user,
          accessToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = req.cookies[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

      if (rawToken) {
        await AuthService.logout(rawToken);
      }

      res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);

      res.status(200).json({
        success: true,
        message: 'Successfully logged out',
      });
    } catch (error) {
      next(error);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const newUser = await AuthService.register(req.body);
      res.status(201).json({
        success: true,
        data: {
          user: newUser,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, accessToken, refreshToken } = await AuthService.signup(req.body);

      res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);

      res.status(201).json({
        success: true,
        data: {
          user,
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
