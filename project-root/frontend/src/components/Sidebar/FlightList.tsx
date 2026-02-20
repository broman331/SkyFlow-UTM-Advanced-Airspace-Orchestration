import { useMapStore } from '../../store/useStore';
import { useTelemetry } from '../../hooks/useTelemetry';

export const FlightList = () => {
    const { activeDroneId, setActiveDrone } = useMapStore();
    const { data: telemetry, isLoading, error } = useTelemetry();

    if (isLoading) return <div style={{ padding: '1rem', color: '#adb5bd' }}>⌛ Loading telemetry...</div>;
    if (error) return <div style={{ padding: '1rem', color: '#ff4d4f' }}>🚨 Simulation Offline</div>;
    if (!telemetry || telemetry.length === 0) return <div style={{ padding: '1rem', color: '#adb5bd' }}>No active flights detected.</div>;

    return (
        <div style={{ padding: '1rem', flex: 1, overflowY: 'auto', borderTop: '2px solid #212529' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Active Flights
                <span style={{ fontSize: '0.8rem', background: '#495057', padding: '2px 8px', borderRadius: '12px' }}>
                    {telemetry.length}
                </span>
            </h3>

            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {telemetry.map((drone: any) => {
                    let statusColor = '#51cf66';
                    let statusLabel = 'Safe Flight';

                    if (!drone.status.safe) {
                        if (drone.status.conflictingZone?.includes('WARNING_V2V')) {
                            statusColor = '#fd7e14';
                            statusLabel = 'V2V Hazard';
                        } else {
                            statusColor = '#ff4d4f';
                            statusLabel = 'Airspace Breach';
                        }
                    }

                    return (
                        <li
                            key={drone.droneId}
                            onClick={() => setActiveDrone(drone.droneId)}
                            style={{
                                background: activeDroneId === drone.droneId ? '#495057' : '#2b3035',
                                padding: '12px', borderRadius: '6px',
                                cursor: 'pointer', borderLeft: `4px solid ${statusColor}`,
                                display: 'flex', flexDirection: 'column', gap: '4px'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong>{drone.droneId}</strong>
                                <span style={{ fontSize: '0.75rem', color: statusColor, fontWeight: 'bold' }}>
                                    {statusLabel}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#ced4da' }}>
                                Alt: {drone.altitude}m | Spd: {drone.speed}m/s
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
