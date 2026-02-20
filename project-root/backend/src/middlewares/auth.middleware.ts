import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'utm_super_secret_dev_key';

export interface AuthRequest extends Request {
    user?: any;
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const tokenHeader = req.headers['authorization'];
    if (!tokenHeader) {
        res.status(403).json({ error: 'A token is required for authentication' });
        return;
    }

    try {
        const token = tokenHeader.split(' ')[1]; // Format: "Bearer <token>"
        const secret = process.env.JWT_SECRET || 'utm_super_secret_dev_key';
        const decoded = jwt.verify(token as string, secret as string);
        req.user = decoded;
    } catch (err) {
        res.status(401).json({ error: 'Invalid or Expired Token' });
        return;
    }

    return next();
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== 'ADMIN') {
        res.status(403).json({ error: 'Admin privileges required for this action' });
        return;
    }
    return next();
};
