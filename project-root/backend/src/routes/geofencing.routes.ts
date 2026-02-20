import { Router } from 'express';
import { GeofencingController } from '../controllers/geofencing.controller';
import { verifyToken, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();
const geofenceController = new GeofencingController();

// Protected Flight Planning
router.post('/flight-intent', verifyToken, geofenceController.submitFlightIntent);

// Protected Live Telemetry
router.post('/telemetry', verifyToken, geofenceController.checkTelemetry);
router.get('/telemetry', verifyToken, geofenceController.getAllTelemetry);

// Map Data
router.get('/no-fly-zones', geofenceController.getNoFlyZones);
router.post('/no-fly-zones', verifyToken, requireAdmin, geofenceController.createNoFlyZone);

export default router;
