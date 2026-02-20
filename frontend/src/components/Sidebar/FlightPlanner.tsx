import { useState } from 'react';
import { useMapStore } from '../../store/useStore';
import { useSubmitFlightIntent } from '../../hooks/useSubmitFlightIntent';

export const FlightPlanner = () => {
    const { plannedRoute } = useMapStore();
    const { mutateAsync: submitIntent, isPending } = useSubmitFlightIntent();
    const [statusParams, setStatusParams] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    const handleSubmit = async () => {
        if (!plannedRoute) return;

        try {
            setStatusParams(null);
            const intentPayload = {
                flightId: `FLIGHT-${Math.floor(Math.random() * 10000)}`,
                pilotId: 'PILOT-1',
                plannedRoute: plannedRoute.geometry, // Sending the GeoJSON geometry object directly
                startTime: new Date().toISOString(),
                endTime: new Date(Date.now() + 3600000).toISOString() // +1 hour
            };

            const response = await submitIntent(intentPayload);

            if (response.authorized) {
                setStatusParams({ type: 'success', msg: 'Flight Authorized! You are cleared to fly.' });
                // We could creatively wipe the map drawn line here but lets keep it visible for now
            }
        } catch (error: any) {
            if (error.response && error.response.status === 403) {
                setStatusParams({
                    type: 'error',
                    msg: `Flight Rejected! Conflict with: ${error.response.data.conflictingZone}`
                });
            } else {
                setStatusParams({ type: 'error', msg: 'An unknown API error occurred.' });
            }
        }
    };

    return (
        <div style={{ padding: '1rem', borderBottom: '1px solid #495057' }}>
            <h3>Flight Planner</h3>
            {plannedRoute ? (
                <div>
                    <p style={{ color: '#adb5bd', fontSize: '0.9rem' }}>Route Drawn. Ready to evaluate.</p>
                    <button
                        onClick={handleSubmit}
                        disabled={isPending}
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            background: isPending ? '#495057' : '#339af0',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isPending ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        {isPending ? 'Evaluating...' : 'Submit Flight Intent'}
                    </button>
                </div>
            ) : (
                <p style={{ color: '#adb5bd', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    Select the Line tool on the map to draw a proposed flight path.
                </p>
            )}

            {statusParams && (
                <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    background: statusParams.type === 'error' ? '#ff6b6b' : '#51cf66',
                    color: 'white',
                    fontSize: '0.9rem',
                    fontWeight: 'bold'
                }}>
                    {statusParams.msg}
                </div>
            )}
        </div>
    );
};
