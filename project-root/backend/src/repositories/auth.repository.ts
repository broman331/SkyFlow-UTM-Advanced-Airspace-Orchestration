import { dbPool } from '../db';

export class AuthRepository {
    public async findUserByEmail(email: string): Promise<any> {
        const result = await dbPool.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0];
    }

    public async createUser(email: string, passwordHash: string, role: string = 'PILOT'): Promise<any> {
        const result = await dbPool.query(
            'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
            [email, passwordHash, role]
        );
        return result.rows[0];
    }
}
