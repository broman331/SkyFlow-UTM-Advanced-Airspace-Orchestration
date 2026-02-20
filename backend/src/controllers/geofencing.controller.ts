import { Request, Response } from 'express';
import { GeofencingService } from '../services/geofencing.service';
import { GeofencingRepository } from '../repositories/geofencing.repository';
import { FlightIntent, DroneTelemetry } from '../shared/types';

export class GeofencingController {
    private service: GeofencingService;
    private repository: GeofencingRepository;

    // In-memory store to hold active drones for the frontend map to render
    private activeDrones: Map<string, any> = new Map();

    constructor() {
        this.service = new GeofencingService();
        this.repository = new GeofencingRepository();
    }

    // POST /api/flight-intent
    public submitFlightIntent = async (req: Request, res: Response): Promise<void> => {
        try {
            const intent: FlightIntent = req.body;
            const activeNFZs = await this.repository.fetchActiveNFZs();

            const isClear = this.service.isRouteClear(intent.plannedRoute, activeNFZs);

            if (isClear) {
                res.status(200).json({ authorized: true });
            } else {
                res.status(403).json({ authorized: false, reason: 'Route intersects No-Fly Zone' });
            }
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error processing flight intent' });
        }
    };

    // POST /api/telemetry
    public checkTelemetry = async (req: Request, res: Response): Promise<void> => {
        try {
            const telemetry: DroneTelemetry = req.body;
            const activeNFZs = await this.repository.fetchActiveNFZs();

            // Pass all known drone points down for V2V checking
            const allDrones = Array.from(this.activeDrones.values());
            const status = this.service.isCurrentPositionSafe(telemetry, activeNFZs, allDrones);

            // Update in-memory tracker
            this.activeDrones.set(telemetry.droneId, {
                ...telemetry,
                status: status
            });

            if (status.safe) {
                res.status(200).json({ safe: true });
            } else {
                res.status(409).json({
                    safe: false,
                    alert: 'Conflict Detected',
                    conflictingZone: status.conflictingZone
                });
            }
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error checking telemetry' });
        }
    }

    // GET /api/telemetry
    public getAllTelemetry = async (req: Request, res: Response): Promise<void> => {
        res.status(200).json(Array.from(this.activeDrones.values()));
    }

    // GET /api/no-fly-zones
    public getNoFlyZones = async (req: Request, res: Response): Promise<void> => {
        try {
            const zones = await this.repository.fetchActiveNFZs();
            res.status(200).json(zones);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error fetching NFZs' });
        }
    }

    // POST /api/no-fly-zones
    public createNoFlyZone = async (req: Request, res: Response): Promise<void> => {
        try {
            const { zoneId, geojson } = req.body;
            if (!zoneId || !geojson) {
                res.status(400).json({ error: 'zoneId and geojson required' });
                return;
            }

            await this.repository.insertNoFlyZone(zoneId, geojson);

            // Re-fetch the updated NFZs into the active memory cache for fast Turf checking
            const activeNFZs = await this.repository.fetchActiveNFZs();

            res.status(201).json({ message: 'No-Fly Zone Created successfully', zones: activeNFZs.length });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error creating NFZ' });
        }
    }
}
