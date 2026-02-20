import { useTelemetry } from '../../hooks/useTelemetry';

export const ConflictBanner = () => {
    const { data: telemetry } = useTelemetry();

    const conflictingDrone = telemetry?.find((drone: any) => !drone.status.safe);

    if (!conflictingDrone) return null;

    const isV2V = conflictingDrone.status.conflictingZone?.includes('WARNING_V2V');

    return (
        <div style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: isV2V ? '#fd7e14' : '#f03e3e',
            color: 'white',
            padding: '1rem 2rem',
            borderRadius: '8px',
            fontWeight: 'bold',
            zIndex: 1000,
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        }}>
            ⚠️ ALERT: Drone {conflictingDrone.droneId} has triggered a {isV2V ? 'Proximity Warning' : 'Restricted Airspace Violation'}: {conflictingDrone.status.conflictingZone}
        </div>
    );
};
