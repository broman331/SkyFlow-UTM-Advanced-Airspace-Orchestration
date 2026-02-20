import axios from 'axios';
import bearing from '@turf/bearing';
import along from '@turf/along';
import length from '@turf/length';
import { lineString, Feature, LineString } from '@turf/helpers';
import jwt from 'jsonwebtoken';

const API_URL = process.env.VITE_API_URL || 'http://127.0.0.1:3000/api';

// Parse CLI arguments: e.g., --drones=10
const args = process.argv.slice(2);
const droneCountArg = args.find(a => a.startsWith('--drones='));
const numDrones = droneCountArg ? parseInt(droneCountArg.split('=')[1] || '3', 10) : 3;

interface DroneProfile {
    id: string;
    speedKph: number;
    altitude: number;
    delayMs: number;
    path: Feature<LineString>;
}

// Fixed Scenarios
const droneSwarm: DroneProfile[] = [
    {
        id: 'drone-sim-1', // Original drone passing through Central Park
        speedKph: 200,
        altitude: 100,
        delayMs: 0,
        path: lineString([[-73.99, 40.75], [-73.96, 40.78]])
    },
    {
        id: 'drone-hunter-2', // Drone 2 intercepts Drone 1's path horizontally
        speedKph: 150,
        altitude: 120,
        delayMs: 3000,
        path: lineString([[-73.95, 40.765], [-74.00, 40.765]])
    },
    {
        id: 'drone-medic-3', // Fast drone that stays clear south of the NFZ
        speedKph: 300,
        altitude: 50,
        delayMs: 5000,
        path: lineString([[-74.01, 40.73], [-73.95, 40.74]])
    }
];

// Generate extra drones if required
if (numDrones > droneSwarm.length) {
    const baseLat = 40.75;
    const baseLng = -73.98;
    for (let i = droneSwarm.length + 1; i <= numDrones; i++) {
        const startLng = baseLng + (Math.random() * 0.1 - 0.05);
        const startLat = baseLat + (Math.random() * 0.1 - 0.05);

        // Random destination within a reasonable radius
        const endLng = startLng + (Math.random() * 0.06 - 0.03);
        const endLat = startLat + (Math.random() * 0.06 - 0.03);

        droneSwarm.push({
            id: `drone-phantom-${i}`,
            speedKph: Math.floor(Math.random() * (250 - 50 + 1) + 50), // 50 to 250 kph
            altitude: Math.floor(Math.random() * (400 - 20 + 1) + 20), // 20 to 400 meters
            delayMs: Math.floor(Math.random() * 15000), // Random spawn delay up to 15s
            path: lineString([[startLng, startLat], [endLng, endLat]])
        });
    }
}

const tickRateMs = 2000;
const token = jwt.sign({ id: 'sim', email: 'sim@utm.local', role: 'PILOT' }, process.env.JWT_SECRET || 'utm_super_secret_dev_key');

console.log(`🛸 Spawning Mock Drone Swarm (${droneSwarm.length} vehicles)...`);

const startDrone = (drone: DroneProfile) => {
    setTimeout(() => {
        const routeLength = length(drone.path, { units: 'kilometers' });
        const distancePerTick = (drone.speedKph * (tickRateMs / 3600000));
        let currentDistance = 0;

        console.log(`🚀 Launched ${drone.id} at ${drone.speedKph}km/h (Alt: ${drone.altitude}m)`);

        setInterval(async () => {
            if (currentDistance > routeLength) {
                currentDistance = 0; // Loop back
            }

            const currentPos = along(drone.path, currentDistance, { units: 'kilometers' });

            const telemetryPayload = {
                droneId: drone.id,
                currentPos: currentPos,
                altitude: drone.altitude,
                heading: bearing(
                    currentPos,
                    along(drone.path, currentDistance + 0.1, { units: 'kilometers' })
                ),
                speed: drone.speedKph,
                timestamp: new Date().toISOString()
            };

            try {
                const response = await axios.post(`${API_URL}/telemetry`, telemetryPayload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log(`✅ [${new Date().toLocaleTimeString()}] ${drone.id} OK:`, response.data);
            } catch (error: any) {
                if (error.response && error.response.status === 409) {
                    const zone = error.response.data.conflictingZone || 'Unknown';
                    const icon = zone.includes('V2V') ? '💥' : '⚠️';
                    console.log(`${icon} [${new Date().toLocaleTimeString()}] ${drone.id} CONFLICT: ${zone}`);
                } else {
                    console.error(`❌ ${drone.id} POST failed:`, error.message);
                }
            }

            currentDistance += distancePerTick;

        }, tickRateMs);
    }, drone.delayMs);
};

// Ignite the swarm
droneSwarm.forEach(drone => startDrone(drone));
