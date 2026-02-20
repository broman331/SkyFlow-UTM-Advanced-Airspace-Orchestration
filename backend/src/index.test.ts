import request from 'supertest';
import * as indexModule from './index';
const app = indexModule.app;
import * as turf from '@turf/turf';

// Mock the DB connection pool to avoid hangs
jest.mock('./db', () => ({
  dbPool: {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    connect: jest.fn()
  }
}));

// Mock the repository to return consistent test data since DB is mocked
jest.mock('./repositories/geofencing.repository', () => {
  return {
    GeofencingRepository: jest.fn().mockImplementation(() => ({
      initSchema: jest.fn().mockResolvedValue(true),
      seedMockNFZ: jest.fn().mockResolvedValue(true),
      fetchActiveNFZs: jest.fn().mockResolvedValue([
        {
          zoneId: 'mock-zone',
          zoneName: 'Central Park Restricted',
          zoneType: 'STATIC',
          geom: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [-73.98, 40.76],
                [-73.97, 40.76],
                [-73.97, 40.77],
                [-73.98, 40.77],
                [-73.98, 40.76]
              ]]
            }
          },
          maxAltitude: 400
        }
      ])
    }))
  };
});

describe('Geofencing API', () => {
  it('POST /api/flight-intent should approve valid routes', async () => {
    // Valid route completely outside JFK activeNFZ (e.g. up in Albany)
    const validIntent = {
      flightId: 'flight-1',
      pilotId: 'pilot-1',
      plannedRoute: turf.lineString([[-73.76, 42.65], [-73.75, 42.66]]),
      startTime: new Date(),
      endTime: new Date()
    };
    const res = await request(app).post('/api/flight-intent').send(validIntent);
    expect(res.status).toBe(200);
    expect(res.body.authorized).toBe(true);
  });

  it('POST /api/flight-intent should reject conflicting routes', async () => {
    // Route intersecting mock JFK polygon 
    const invalidIntent = {
      flightId: 'flight-2',
      pilotId: 'pilot-1',
      plannedRoute: turf.lineString([[-73.975, 40.755], [-73.975, 40.775]]),
      startTime: new Date(),
      endTime: new Date()
    };
    const res = await request(app).post('/api/flight-intent').send(invalidIntent);
    expect(res.status).toBe(403);
    expect(res.body.authorized).toBe(false);
  });
});
