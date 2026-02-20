import { Feature, Polygon, LineString, Point } from 'geojson';

export interface NFZ {
  zoneId: string;
  zoneName: string;
  zoneType: 'STATIC' | 'DYNAMIC' | 'NOTAM';
  geom: Feature<Polygon>;
  maxAltitude: number;
}

export interface FlightIntent {
  flightId: string;
  pilotId: string;
  plannedRoute: Feature<LineString>;
  startTime: Date;
  endTime: Date;
}

export interface DroneTelemetry {
  droneId: string;
  currentPos: Feature<Point>;
  timestamp: Date;
  altitude: number;
}
