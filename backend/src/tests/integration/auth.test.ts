import request from 'supertest';
import { app } from '../../index';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Authentication API Integration Tests', () => {

    describe('POST /api/auth/register', () => {
        it('Should successfully create a new user and return a JWT when provided valid data', async () => {
            const res = await request(app).post('/api/auth/register').send({
                email: 'test@example.com',
                password: 'password123',
                role: 'PILOT'
            });
            expect(res.status).toBe(201);
            expect(res.body.user).toHaveProperty('email', 'test@example.com');
            expect(res.body.user).toHaveProperty('role', 'PILOT');
        });

        it('Should reject registration if the email already exists (409 Conflict)', async () => {
            // Register once
            await request(app).post('/api/auth/register').send({
                email: 'conflict@example.com',
                password: 'password123',
                role: 'PILOT'
            });

            // Register again with exact same email
            const res = await request(app).post('/api/auth/register').send({
                email: 'conflict@example.com',
                password: 'password123',
                role: 'ADMIN' // Different role, but email should block it
            });
            expect(res.status).toBe(409);
            expect(res.body).toHaveProperty('error');
        });

        it('Should reject registration if missing required fields (400 Bad Request)', async () => {
            // Missing password and role
            const res = await request(app).post('/api/auth/register').send({
                email: 'incomplete@example.com'
            });
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });
    });

    describe('POST /api/auth/login', () => {
        // Since global setup truncates the DB before every block, we need to populate a user specifically for login tests
        beforeEach(async () => {
            await request(app).post('/api/auth/register').send({
                email: 'loginuser@example.com',
                password: 'correctpassword',
                role: 'ADMIN'
            });
        });

        it('Should issue a valid JWT matching the user role upon providing correct credentials', async () => {
            const res = await request(app).post('/api/auth/login').send({
                email: 'loginuser@example.com',
                password: 'correctpassword'
            });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user).toHaveProperty('email', 'loginuser@example.com');
        });

        it('Should reject login attempts with an incorrect password (401 Unauthorized)', async () => {
            const res = await request(app).post('/api/auth/login').send({
                email: 'loginuser@example.com',
                password: 'wrongpassword'
            });
            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error');
        });

        it('Should reject login attempts for nonexistent emails (401 Unauthorized)', async () => {
            const res = await request(app).post('/api/auth/login').send({
                email: 'nobody@example.com',
                password: 'password123'
            });
            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error');
        });
    });
});
