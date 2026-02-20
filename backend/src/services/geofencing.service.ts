import booleanIntersects from '@turf/boolean-intersects';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import distance from '@turf/distance';
import { point } from '@turf/helpers';
import { Feature, LineString } from 'geojson';
import { NFZ, FlightIntent, DroneTelemetry } from '../shared/types';

export class GeofencingService {
    /**
     * Evaluates if a planned flight route intersects with any No-Fly Zones.
     * Based on ED-269 U-space constraints.
     */
    public isRouteClear(route: Feature<LineString>, zones: NFZ[]): boolean {
        for (const zone of zones) {
            // Check if any point of the LineString intersects the polygon
            const intersection = booleanIntersects(route, zone.geom);
            if (intersection) {
                return false; // Route intersects a restricted zone
            }
        }
        return true; // Clear
    }

    /**
     * Evaluates if a drone's current live telemetry point is violating a No-Fly Zone.
     */
    public isCurrentPositionSafe(telemetry: DroneTelemetry, activeNFZs: NFZ[], activeDrones?: DroneTelemetry[]): { safe: boolean, conflictingZone?: string } {
        const currentPos = point(telemetry.currentPos.geometry.coordinates);

        // Check Static/Dynamic No-Fly Zones
        for (const nfz of activeNFZs) {
            if (booleanPointInPolygon(currentPos, nfz.geom)) {
                return { safe: false, conflictingZone: nfz.zoneId };
            }
        }

        // Check Vehicle-to-Vehicle (V2V) Proximity
        if (activeDrones && activeDrones.length > 0) {
            for (const otherDrone of activeDrones) {
                // Don't compare against itself
                if (otherDrone.droneId === telemetry.droneId) continue;

                const otherPos = point(otherDrone.currentPos.geometry.coordinates);
                const distKm = distance(currentPos, otherPos, { units: 'kilometers' });

                // If within 50 meters (0.05 km), flag a proximity warning
                if (distKm < 0.05) {
                    return { safe: false, conflictingZone: `WARNING_V2V (Proximity to ${otherDrone.droneId})` };
                }
            }
        }

        return { safe: true };
    }
}
