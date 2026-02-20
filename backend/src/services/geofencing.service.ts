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
    public isCurrentPositionSafe(telemetry: DroneTelemetry, activeNFZs: NFZ[], activeDrones?: Iterable<DroneTelemetry>): { safe: boolean, conflictingZone?: string } {
        const currentPos = point(telemetry.currentPos.geometry.coordinates);

        // Check Static/Dynamic No-Fly Zones
        for (const nfz of activeNFZs) {
            if (booleanPointInPolygon(currentPos, nfz.geom)) {
                return { safe: false, conflictingZone: nfz.zoneId };
            }
        }

        // Check Vehicle-to-Vehicle (V2V) Proximity
        if (activeDrones) {
            for (const otherDrone of activeDrones) {
                // Don't compare against itself
                if (otherDrone.droneId === telemetry.droneId) continue;

                const myLng = currentPos.geometry.coordinates[0] || 0;
                const myLat = currentPos.geometry.coordinates[1] || 0;
                const otherLng = otherDrone.currentPos.geometry.coordinates[0] || 0;
                const otherLat = otherDrone.currentPos.geometry.coordinates[1] || 0;

                // Fast spatial bounding box filter (~111 meters per 0.001 deg)
                if (Math.abs(myLat - otherLat) > 0.001 || Math.abs(myLng - otherLng) > 0.001) {
                    continue;
                }

                const otherPos = point([otherLng, otherLat]);
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
