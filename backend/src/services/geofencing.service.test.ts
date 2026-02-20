import { GeofencingService } from './geofencing.service';
import * as turf from '@turf/turf';
import { NFZ, DroneTelemetry } from '../shared/types';

describe('GeofencingService', () => {
    let geofencingService: GeofencingService;

    beforeEach(() => {
        geofencingService = new GeofencingService();
    });

    const sampleNFZ: NFZ = {
        zoneId: 'zone-1',
        zoneName: 'Downtown Restricted',
        zoneType: 'STATIC',
        // Polygon covering Roughly Central Park bounds (example coordinates)
        geom: turf.polygon([[
            [-73.9818, 40.7680],
            [-73.9580, 40.8000],
            [-73.9490, 40.7960],
            [-73.9730, 40.7640],
            [-73.9818, 40.7680]
        ]]),
        maxAltitude: 0 // Ground to space
    };

    it('should detect when a drone enters a No-Fly Zone', () => {
        const telemetry: DroneTelemetry = {
            droneId: 'drone-123',
            // Inside Central Park
            currentPos: turf.point([-73.9650, 40.7800]),
            timestamp: new Date(),
            altitude: 50
        };

        const status = geofencingService.isCurrentPositionSafe(telemetry, [sampleNFZ]);

        expect(status.safe).toBe(false);
        expect(status.conflictingZone).toBe('zone-1');
    });

    it('should authorize a drone flying outside a No-Fly Zone', () => {
        const telemetry: DroneTelemetry = {
            droneId: 'drone-123',
            // Outside Central Park (e.g. New Jersey side)
            currentPos: turf.point([-74.0200, 40.7800]),
            timestamp: new Date(),
            altitude: 50
        };

        const status = geofencingService.isCurrentPositionSafe(telemetry, [sampleNFZ]);

        expect(status.safe).toBe(true);
    });
});
