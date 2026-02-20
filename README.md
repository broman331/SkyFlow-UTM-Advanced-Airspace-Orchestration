
# SkyFlow UTM: Advanced Airspace Orchestration

## Project Overview

This project is a microservices-based UAS Traffic Management (UTM) system inspired by Unifly. The system is designed to handle the core operational needs for orchestrating drone traffic in shared airspace, focusing heavily on safety, compliance, and real-time monitoring.

The architecture strictly adheres to regulatory standards:
- **ASTM F3411-22A (FAA):** Standard Specification for Remote ID and Tracking. Guides the performance and data models for our Real-time Telemetry Engine.
- **ED-269 (U-space EU):** Minimum Operational Performance Standard for UAS Geo-Fencing. Dictates how our Geofencing Service loads, interprets, and enforces active flight paths against restricted geographical zones (No-Fly Zones).

## Core Architecture

The system utilizes a modern web stack (TypeScript, Node.js, Express, React, Mapbox, PostgreSQL + PostGIS) organized into distinct microservices:

1. **Flight Planning API:** Service to handle flight intent submission, pilot authorization, parsing restriction zones, and providing pre-flight clearance.
2. **Real-time Telemetry Engine:** Ingestion engine for Network Remote ID (Net-RID) telemetry, handling high-throughput, low-latency position updates based on ASTM requirements.
3. **Geofencing Service:** Service to check active flight paths against no-fly zones (ED-269 Geo-awareness) and other active flights in real-time, sending alerts for any conflicts.

## Database (PostGIS)

The core geographical data revolves around GeoJSON structures managed by PostGIS, primarily storing `active_flight_paths` (LineStrings for intended routes, Points for live tracking) and `no_fly_zones` (Polygons representing restricted airspace).

## Features & Capabilities

**1. Flight Intent & Planning Authorization**
- **Interactive Routing:** Pilots can use a web-based dashboard powered by Mapbox GL to visually sketch their intended flight paths using line-drawing tools.
- **Automated Clearance:** Once submitted, the backend Geofencing Service mathematically computes whether the sketched route intersects any known restricted airspace, granting or denying pre-flight authorization instantly.

**2. Real-Time Telemetry Tracking**
- **Network Remote ID Ingestion:** The Express API acts as a high-frequency ingestion engine, accepting live geographical coordinates, altitudes, speeds, and GPS headings from active drones.
- **Live UI Rendering:** The React dashboard continuously polls this engine and renders the active physical location of every flying drone dynamically on the global map.

**3. Dynamic Airspace Geofencing**
- **PostGIS Geographical Storage:** Restricted zones are not hardcoded; they are stored as complex GeoJSON polygons in a PostgreSQL + PostGIS database, allowing for high-performance spatial querying.
- **Temporary Flight Restrictions (TFRs):** System Administrators have access to an exclusive Admin Panel. They can draw custom polygons on the live map and instantly publish them into the database, immediately propagating the restriction to all airborne vehicles and planning pilots.

**4. Vehicle-to-Vehicle (V2V) De-confliction**
- **Proximity Math:** The telemetry engine doesn't just evaluate drones against static buildings/parks; it cross-references every active drone against *each other*.
- **V2V Alerts:** If two drones come within 50 meters of one another, the system triggers a "Proximity Warning," marking the drones orange on the map to prevent mid-air collisions.

**5. Role-Based Access Control (RBAC) & Security**
- **Authentication:** The system is protected by secure JSON Web Tokens (JWT) and `bcrypt` password hashing.
- **Roles:** The application strictly divides capabilities. "PILOTS" can only view airspace and submit routes, whereas "ADMINS" have secure privileges to restrict airspace and manage the global environment.

**6. Swarm Simulation & Emulation**
- **Built-in Simulator:** The backend ships with an isolated worker process capable of generating dynamic, staggered swathes of heterogeneous mock drones to stress test the UI and demonstrate conflict resolution without needing physical hardware.

## Environment & Running Locally

### 1. Configure the Frontend Environment
To run the Mapbox integration, you will need a `.env` file in the `frontend` folder with your Mapbox token:
```env
VITE_MAPBOX_TOKEN=your_mapbox_public_token
```

### 2. Run via Docker Compose (Recommended)
You can spawn the full system (Vite UI on port 5173, Express API on port 3000, and PostGIS Database on port 5432) using Docker:

```bash
docker-compose up --build
```
```env
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

## Quality Assurance & Testing

This project employs a robust multi-tiered testing strategy ensuring stability and high performance, critical for airspace orchestration systems.

### 1. Backend Integration Tests (Jest & Supertest)
The backend tests spin up an isolated PostgreSQL container context (`dbPool`) to test realistic integrations with the Geofencing Controller and Auth pipelines.
- **Run:** `cd backend && npm run test`
- **Focus:** JWT Authentication workflows, Route Conflict intersections using Turf.js, and API validation.

### 2. Frontend Unit & Component Tests (Vitest & React Testing Library)
The frontend components operate under JSDOM environments via Vitest to ensure UI reliability and correct state management rendering.
- **Run:** `cd frontend && npm run test`
- **Focus:** Zustand state store integration, simulated user inputs (drawing on Mapbox), and conditional sidebar rendering logic based on RBAC.

### 3. End-to-End (E2E) UI Testing (Playwright)
Playwright fully navigates through the browser (Chromium) to execute real-life user flights. These scripts assert full system data syncing from PostGIS straight into the React UI.
- **Run:** `cd frontend && npx playwright test` (Ensure backend & db are running first)
- **Focus:** Cross-browser authentication flows, PILOT routing validation over mapcanvas, and dynamic ADMIN Temporary Flight Restrictions (TFRs) publications.

### 4. Load & Stress Testing (Grafana K6)
The architecture has been optimized to handle rapid Net-RID telemetry bursts. We use K6 to simulate large, concurrent drone swarms pinging the server. The tests validate database transaction integrity and throughput capabilities up to exactly 10,000 active broadcasting drones.
- **To Run via Docker:** 
  ```bash
  docker run --rm -i -v "$(pwd):/app" -e API_URL=http://host.docker.internal:3000/api grafana/k6 run /app/k6-stress-test.js
  ```
- **Focus:** Validates `p(95)` request duration latencies, failure rates under 1% threshold, and optimizes V2V proximity computation bounds without degrading the NodeJS Event Loop executing GeoJSON intersections!

---
