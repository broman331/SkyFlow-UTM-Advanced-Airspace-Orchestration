import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

export const options = {
    scenarios: {
        drone_swarm: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '5s', target: 5000 },  // Ramp-up to 5k
                { duration: '5s', target: 10000 }, // Scale up to 10k
                { duration: '10s', target: 10000 },  // Maintain 10k
                { duration: '5s', target: 0 },     // Ramp-down
            ],
            gracefulRampDown: '10s',
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
        http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
    },
};

export function setup() {
    const adminEmail = `admin_${randomString(8)}@test.com`;
    const password = 'pass';
    const apiUrl = __ENV.API_URL || 'http://localhost:3000/api';

    // Register User
    const regRes = http.post(`${apiUrl}/auth/register`, JSON.stringify({ email: adminEmail, password }), {
        headers: { 'Content-Type': 'application/json' },
    });

    // Auth Login
    const loginRes = http.post(`${apiUrl}/auth/login`, JSON.stringify({ email: adminEmail, password }), {
        headers: { 'Content-Type': 'application/json' },
    });

    const token = loginRes.json('token');

    // We ideally want a Zone created to stress PostGIS
    // But testing raw ingestion throughput first is key for 10k scaling

    return { token, apiUrl };
}

export default function (data) {
    const { token, apiUrl } = data;

    // Simulate Drone telemetry within reasonable bounds
    const lon = (Math.random() * (180 + 180) - 180).toFixed(6);
    const lat = (Math.random() * (90 + 90) - 90).toFixed(6);
    const droneId = `DRONE-K6-${__VU}`;

    const payload = JSON.stringify({
        droneId: droneId,
        currentPos: {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [parseFloat(lon), parseFloat(lat)]
            },
            properties: {}
        },
        altitude: Math.floor(Math.random() * 400),
        timestamp: new Date().toISOString()
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
    };

    const res = http.post(`${apiUrl}/telemetry`, payload, params);

    check(res, {
        'status is 200': (r) => r.status === 200,
    });

    // 3 seconds between telemetry broadcasts
    sleep(3);
}
