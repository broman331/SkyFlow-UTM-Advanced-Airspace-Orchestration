import { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { AuthRepository } from '../repositories/auth.repository';

// Note: In production this MUST be heavily guarded and loaded from .env
const JWT_SECRET = process.env.JWT_SECRET || 'utm_super_secret_dev_key';

export class AuthController {
    private repository: AuthRepository;

    constructor() {
        this.repository = new AuthRepository();
    }

    public register = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                res.status(400).json({ error: 'Email and password required' });
                return;
            }

            // Check if user exists
            const existingUser = await this.repository.findUserByEmail(email);
            if (existingUser) {
                res.status(409).json({ error: 'User already exists' });
                return;
            }

            // Hash password and save
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);

            const newUser = await this.repository.createUser(email, hash, 'PILOT');

            res.status(201).json({ message: 'User registered successfully', user: newUser });
        } catch (error) {
            console.error('Registration Error:', error);
            res.status(500).json({ error: 'Internal server error during registration' });
        }
    };

    public login = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                res.status(400).json({ error: 'Email and password required' });
                return;
            }

            const user = await this.repository.findUserByEmail(email);
            if (!user) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            // Assign Token
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                JWT_SECRET,
                { expiresIn: '12h' }
            );

            res.status(200).json({
                message: 'Login successful',
                token: token,
                user: { id: user.id, email: user.email, role: user.role }
            });
        } catch (error) {
            console.error('Login Error:', error);
            res.status(500).json({ error: 'Internal server error during login' });
        }
    };
}
