import request from 'supertest';
import { app } from '../../index';
import { describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import { dbPool } from '../../db';

describe('Geofencing API Integration Tests', () => {
    let adminToken: string;
    let pilotToken: string;

    beforeEach(async () => {
        // Register an ADMIN
        await request(app).post('/api/auth/register').send({
            email: 'admin@utm.test',
            password: 'pass',
            role: 'ADMIN' // Controller defaults to PILOT, so we must manually update the DB to bypass for testing
        });
        await dbPool.query("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@utm.test'");

        const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@utm.test', password: 'pass' });
        adminToken = adminRes.body.token;

        // Register a PILOT
        await request(app).post('/api/auth/register').send({
            email: 'pilot@utm.test',
            password: 'pass'
        });
        const pilotRes = await request(app).post('/api/auth/login').send({ email: 'pilot@utm.test', password: 'pass' });
        pilotToken = pilotRes.body.token;
    });

    describe('GET /api/no-fly-zones', () => {
        it('Should return an empty FeatureCollection when the database has no active restrictions', async () => {
            const res = await request(app).get('/api/no-fly-zones');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);
        });

        it('Should return valid GeoJSON polygons representing active TFRs', async () => {
            // Seed a zone via Admin
            const geojson = {
                type: 'Feature',
                properties: { name: 'Test Zone' },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[-73.0, 40.0], [-73.1, 40.0], [-73.1, 40.1], [-73.0, 40.0]]]
                }
            };
            await request(app).post('/api/no-fly-zones').set('Authorization', `Bearer ${adminToken}`).send({
                zoneId: 'NFZ-TEST',
                geojson: geojson.geometry
            });

            const res = await request(app).get('/api/no-fly-zones');
            expect(res.status).toBe(200);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0].geom.geometry.type).toBe('Polygon');
        });
    });

    describe('POST /api/no-fly-zones', () => {
        const dummyGeom = {
            type: 'Polygon',
            coordinates: [[[-73.0, 40.0], [-73.1, 40.0], [-73.1, 40.1], [-73.0, 40.0]]]
        };

        it('Should reject the request if no Bearer token is provided (403 Forbidden)', async () => {
            const res = await request(app).post('/api/no-fly-zones').send({ zoneId: 'NFZ-1', geojson: dummyGeom });
            expect(res.status).toBe(403);
        });

        it('Should reject the request if the Bearer token belongs to a PILOT role (403 Forbidden)', async () => {
            const res = await request(app).post('/api/no-fly-zones')
                .set('Authorization', `Bearer ${pilotToken}`)
                .send({ zoneId: 'NFZ-1', geojson: dummyGeom });
            expect(res.status).toBe(403);
            expect(res.body.error).toMatch(/Admin privileges required/i);
        });

        it('Should successfully create a new restriction zone if the user token is an ADMIN role (201 Created)', async () => {
            const res = await request(app).post('/api/no-fly-zones')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ zoneId: 'NFZ-ADMIN', geojson: dummyGeom });
            expect(res.status).toBe(201);
            expect(res.body.message).toMatch(/created successfully/i);
        });

        it('Should reject the request if zoneId or geojson are missing (400 Bad Request)', async () => {
            const res = await request(app).post('/api/no-fly-zones')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ zoneId: 'ONLY-ID-NO-GEOM' }); // Missing geojson
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/required/i);
        });

        it('Should handle unique constraint violations for duplicate zoneIds (500 Internal Error / Unique Violation)', async () => {
            // Insert original
            await request(app).post('/api/no-fly-zones')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ zoneId: 'NFZ-DUP', geojson: dummyGeom });

            // Insert duplicate
            const res = await request(app).post('/api/no-fly-zones')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ zoneId: 'NFZ-DUP', geojson: dummyGeom });

            // PostGIS UNIQUE constraint violated
            expect(res.status).toBe(500);
            expect(res.body.error).toMatch(/Internal Server Error/i);
        });
    });
});
