import request from 'supertest';
import { app } from '../../index';
import { describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import { dbPool } from '../../db';

describe('Telemetry & Flight Intent API Integration Tests', () => {
    let adminToken: string;
    let pilotToken: string;

    // Geometry bounds around New York Coordinates
    const NFZ_GEOM = {
        type: 'Polygon',
        coordinates: [[[-73.99, 40.76], [-73.97, 40.76], [-73.97, 40.78], [-73.99, 40.78], [-73.99, 40.76]]]
    };

    beforeEach(async () => {
        // Pilot setup
        await request(app).post('/api/auth/register').send({ email: 'pilot@utm.test', password: 'pass' });
        const pilotRes = await request(app).post('/api/auth/login').send({ email: 'pilot@utm.test', password: 'pass' });
        pilotToken = pilotRes.body.token;

        // Admin setup
        await request(app).post('/api/auth/register').send({ email: 'admin@utm.test', password: 'pass' });
        await dbPool.query("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@utm.test'");
        const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@utm.test', password: 'pass' });
        adminToken = adminRes.body.token;

        // Create an active NFZ via Admin
        await request(app).post('/api/no-fly-zones')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ zoneId: 'NFZ-RESTRICTED', geojson: NFZ_GEOM });
    });

    describe('POST /api/flight-intent', () => {
        it('Should reject unauthorized requests (no token)', async () => {
            const res = await request(app).post('/api/flight-intent').send({
                flightId: 'FL-TEST',
                pilotId: 'pilot-1',
                plannedRoute: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[-74.0, 40.7], [-74.1, 40.8]] } },
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString()
            });
            expect(res.status).toBe(403);
        });

        it('Should return { authorized: true } (200 OK) if the proposed LineString does NOT intersect any active No-Fly Zones', async () => {
            // Outside NFZ_GEOM bounds
            const res = await request(app).post('/api/flight-intent')
                .set('Authorization', `Bearer ${pilotToken}`)
                .send({
                    flightId: 'FL-SAFE',
                    pilotId: 'pilot-1',
                    plannedRoute: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[-74.0, 40.7], [-74.1, 40.8]] } },
                    startTime: new Date().toISOString(),
                    endTime: new Date().toISOString()
                });
            expect(res.status).toBe(200);
            expect(res.body.authorized).toBe(true);
        });

        it('Should return { authorized: false } (403 Forbidden) if the intended path intersects an Admin-created TFR', async () => {
            // Crosses the NFZ bounds explicitly
            const res = await request(app).post('/api/flight-intent')
                .set('Authorization', `Bearer ${pilotToken}`)
                .send({
                    flightId: 'FL-DANGER',
                    pilotId: 'pilot-1',
                    plannedRoute: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[-74.0, 40.77], [-73.95, 40.77]] } }, // Direct hit horizontally
                    startTime: new Date().toISOString(),
                    endTime: new Date().toISOString()
                });
            expect(res.status).toBe(403);
            expect(res.body.authorized).toBe(false);
            expect(res.body.reason).toMatch(/intersects/i);
        });

        it('Should reject flight intents with missing or malformed geometry components (500/400 Error)', async () => {
            const res = await request(app).post('/api/flight-intent')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    flightId: 'FL-BAD',
                    // pilotId is missing, plannedRoute is malformed (not a valid GeoJSON Feature)
                    plannedRoute: { type: 'NotGeoJSON' }
                });
            // Turf will likely throw an exception on malformed objects caught by the 500 block, or explicit validation if added
            expect(res.status).toBeGreaterThanOrEqual(400); // Expecting a rejection
        });
    });

    describe('POST /api/telemetry', () => {
        it('Should update live current position for valid incoming pings (200 OK)', async () => {
            const res = await request(app).post('/api/telemetry')
                .set('Authorization', `Bearer ${pilotToken}`)
                .send({
                    droneId: 'DRONE-LIVE-1',
                    currentPos: { type: 'Feature', geometry: { type: 'Point', coordinates: [-74.00, 40.70] } },
                    timestamp: new Date().toISOString(),
                    altitude: 100
                });
            expect(res.status).toBe(200);
            expect(res.body.safe).toBe(true);
        });

        it('NFZ Breach Simulation: Should return 409 Conflict if provided live coordinate falls inside a No-Fly Zone', async () => {
            const res = await request(app).post('/api/telemetry')
                .set('Authorization', `Bearer ${pilotToken}`)
                .send({
                    droneId: 'DRONE-LIVE-2',
                    currentPos: { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.98, 40.77] } }, // Center of NFZ
                    timestamp: new Date().toISOString(),
                    altitude: 100
                });
            expect(res.status).toBe(409);
            expect(res.body.safe).toBe(false);
            expect(res.body.alert).toMatch(/Conflict Detected|restricted airspace/i);
        });

        it('V2V Conflict Simulation: Two drones near each other trigger WARNING_V2V', async () => {
            // Drone 1
            await request(app).post('/api/telemetry')
                .set('Authorization', `Bearer ${pilotToken}`)
                .send({
                    droneId: 'DRONE-A',
                    currentPos: { type: 'Feature', geometry: { type: 'Point', coordinates: [-74.00, 40.50] } },
                    timestamp: new Date().toISOString(),
                    altitude: 100
                });

            // Drone 2 perfectly colliding in proximity (same coordinates)
            const res = await request(app).post('/api/telemetry')
                .set('Authorization', `Bearer ${pilotToken}`)
                .send({
                    droneId: 'DRONE-B',
                    currentPos: { type: 'Feature', geometry: { type: 'Point', coordinates: [-74.00, 40.50] } },
                    timestamp: new Date().toISOString(),
                    altitude: 100
                });
            expect(res.status).toBe(409);
            expect(res.body.safe).toBe(false);
            expect(res.body.conflictingZone).toMatch(/WARNING_V2V/i);
        });

        it('Should reject telemetry with missing properties (Bad Request / Internal Error)', async () => {
            const res = await request(app).post('/api/telemetry')
                .set('Authorization', `Bearer ${pilotToken}`)
                .send({
                    // Missing droneId and currentPos
                    altitude: 100
                });
            expect(res.status).toBeGreaterThanOrEqual(400); // Usually 400 or 500 depending on explicit validation
        });
    });

    describe('GET /api/telemetry', () => {
        it('Should return an array of active drone positions', async () => {
            // Seed a drone
            await request(app).post('/api/telemetry')
                .set('Authorization', `Bearer ${pilotToken}`)
                .send({
                    droneId: 'DRONE-TRACK',
                    currentPos: { type: 'Feature', geometry: { type: 'Point', coordinates: [-74.50, 41.50] } },
                    timestamp: new Date().toISOString(),
                    altitude: 100
                });

            const res = await request(app).get('/api/telemetry')
                .set('Authorization', `Bearer ${pilotToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            const trackedDrone = res.body.find((d: any) => d.droneId === 'DRONE-TRACK');
            expect(trackedDrone).toBeDefined();
            expect(trackedDrone.altitude).toBe(100);
            expect(trackedDrone.status.safe).toBe(true);
        });
    });
});
