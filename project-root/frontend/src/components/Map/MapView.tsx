import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { useMapStore } from '../../store/useStore';
import { useNoFlyZones } from '../../hooks/useNoFlyZones';
import { useTelemetry } from '../../hooks/useTelemetry';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export const MapView = () => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<mapboxgl.Map | null>(null);
    const { activeDroneId, setPlannedRoute } = useMapStore();
    const { data: noFlyZones, isLoading } = useNoFlyZones();
    const { data: telemetry } = useTelemetry();

    useEffect(() => {
        if (!mapboxgl.accessToken || !mapContainer.current) {
            console.error('Mapbox Token Missing or Container Not Found!');
            return;
        }

        const mapInstance = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [-73.97, 40.78],
            zoom: 10
        });

        const draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: {
                line_string: true,
                polygon: true,
                trash: true
            },
            defaultMode: 'draw_line_string'
        });

        // Add draw controls
        mapInstance.addControl(draw, 'top-left');

        const updateRoute = () => {
            const data = draw.getAll();
            if (data.features.length > 0) {
                // We only care about the last drawn line
                const route = data.features[data.features.length - 1];
                setPlannedRoute(route);
            } else {
                setPlannedRoute(null);
            }
        };

        mapInstance.on('draw.create', updateRoute);
        mapInstance.on('draw.delete', updateRoute);
        mapInstance.on('draw.update', updateRoute);

        mapInstance.on('load', () => {
            setMap(mapInstance);

            // No Fly Zones Layer
            mapInstance.addSource('nfz-source', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });

            mapInstance.addLayer({
                id: 'nfz-layer',
                type: 'fill',
                source: 'nfz-source',
                paint: {
                    'fill-color': '#f03e3e',
                    'fill-opacity': 0.4
                }
            });

            // Live Telemetry Layer
            mapInstance.addSource('drones-source', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });

            mapInstance.addLayer({
                id: 'drones-layer',
                type: 'circle',
                source: 'drones-source',
                paint: {
                    'circle-radius': 8,
                    'circle-color': ['get', 'color'],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff'
                }
            });
        });

        return () => {
            mapInstance.remove();
        };
    }, [setPlannedRoute]);

    // Effect hook to update map source when NFZs change
    useEffect(() => {
        if (map && noFlyZones && map.isSourceLoaded('nfz-source')) {
            const source = map.getSource('nfz-source') as mapboxgl.GeoJSONSource;
            // The DB returns objects like { zoneId, geom: { type: 'Feature', geometry: ... } }
            const features = noFlyZones.map((zone: any) => zone.geom);
            source.setData({
                type: 'FeatureCollection',
                features: features
            });
        }
    }, [map, noFlyZones]);

    // Effect hook to update live telemetry on the map
    useEffect(() => {
        if (map && telemetry && map.isSourceLoaded('drones-source')) {
            const source = map.getSource('drones-source') as mapboxgl.GeoJSONSource;
            const features = telemetry.map((drone: any) => {
                let markerColor = '#51cf66'; // Green = Safe

                if (!drone.status.safe) {
                    if (drone.status.conflictingZone?.includes('WARNING_V2V')) {
                        markerColor = '#fd7e14'; // Orange = Proximity Warning
                    } else {
                        markerColor = '#ff4d4f'; // Red = Restricted Airspace NFZ Violation
                    }
                }

                return {
                    type: 'Feature',
                    properties: {
                        droneId: drone.droneId,
                        color: markerColor
                    },
                    geometry: drone.currentPos.geometry
                };
            });

            source.setData({
                type: 'FeatureCollection',
                features: features
            });
        }
    }, [map, telemetry]);

    // Effect hook to listen to activeDroneId and pan
    useEffect(() => {
        if (activeDroneId && map && telemetry) {
            const activeDrone = telemetry.find((d: any) => d.droneId === activeDroneId);
            if (activeDrone) {
                map.flyTo({
                    center: activeDrone.location.coordinates as [number, number],
                    zoom: 14,
                    speed: 1.2
                });
            }
        }
    }, [activeDroneId, map, telemetry]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {!import.meta.env.VITE_MAPBOX_TOKEN && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 10, background: '#1a1a1a', color: 'white',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '20px', textAlign: 'center'
                }}>
                    <h3>Mapbox Token Missing</h3>
                    <p>Provide a valid public token in <code>frontend/.env</code>:</p>
                    <code style={{ background: '#000', padding: '10px', borderRadius: '4px' }}>
                        VITE_MAPBOX_TOKEN=pk.eyJ1I...
                    </code>
                </div>
            )}

            {isLoading && (
                <div style={{
                    position: 'absolute', top: 10, right: 10, zIndex: 5,
                    background: 'rgba(0,0,0,0.7)', color: 'white', padding: '5px 10px', borderRadius: '4px'
                }}>
                    Fetching NFZs...
                </div>
            )}

            <div
                ref={mapContainer}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};
