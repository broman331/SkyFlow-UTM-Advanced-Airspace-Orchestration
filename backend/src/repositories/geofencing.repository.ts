import { dbPool } from '../db';
import { NFZ, FlightIntent, DroneTelemetry } from '../shared/types';
import { feature } from '@turf/helpers';
import { Feature, Polygon } from 'geojson';

export class GeofencingRepository {

    /**
     * Fetches all active No-Fly Zones representing polygons from PostGIS into Turf.js NFZ structured objects
     */
    public async fetchActiveNFZs(): Promise<NFZ[]> {
        const query = `
SELECT
zone_id,
    zone_name,
    zone_type,
    ST_AsGeoJSON(geom):: jsonb as geom_geojson,
        max_altitude 
        FROM no_fly_zones 
        WHERE active_from <= NOW() AND(active_to IS NULL OR active_to > NOW());
`;

        try {
            const result = await dbPool.query(query);
            return result.rows.map(row => ({
                zoneId: row.zone_id,
                zoneName: row.zone_name,
                zoneType: row.zone_type as 'STATIC' | 'DYNAMIC' | 'NOTAM',
                geom: feature(row.geom_geojson) as Feature<Polygon>,
                maxAltitude: row.max_altitude
            }));
        } catch (err) {
            console.error("DB Fetch Error: ", err);
            return [];
        }
    } // Added missing closing brace for fetchActiveNFZs method

    public async insertNoFlyZone(zoneId: string, geojson: any): Promise<void> {
        const query = `
            INSERT INTO no_fly_zones(zone_id, geom, active)
VALUES($1, ST_GeomFromGeoJSON($2), true)
    `;
        try {
            await dbPool.query(query, [zoneId, JSON.stringify(geojson)]);
        } catch (err) {
            console.error('Error inserting No-Fly Zone:', err);
            throw err;
        }
    }
}
