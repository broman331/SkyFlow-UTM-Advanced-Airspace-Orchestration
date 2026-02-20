import { useState } from 'react';
import { useMapStore } from '../../store/useStore';
import { createNoFlyZone } from '../../services/api';
import { useQueryClient } from '@tanstack/react-query';

export const AdminPanel = () => {
    const { plannedRoute, auth } = useMapStore();
    const queryClient = useQueryClient();

    const [zoneName, setZoneName] = useState('TEMP_TFR_');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    // Only show to ADMINs
    if (auth.user?.role !== 'ADMIN') {
        return null;
    }

    const handleCreateTFR = async () => {
        if (!plannedRoute || plannedRoute.geometry.type !== 'Polygon') {
            setStatus({ type: 'error', msg: 'Please draw a Polygon on the Map to define the TFR area.' });
            return;
        }

        setLoading(true);
        setStatus(null);

        try {
            await createNoFlyZone({
                zoneId: zoneName + Date.now(),
                geojson: plannedRoute.geometry
            });

            setStatus({ type: 'success', msg: 'TFR Published Successfully!' });

            // Re-fetch the No-Fly Zones to update the map instantly
            queryClient.invalidateQueries({ queryKey: ['nfzs'] });
        } catch (err: any) {
            setStatus({ type: 'error', msg: err?.response?.data?.error || 'Failed to publish TFR' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '1rem', borderTop: '2px solid #212529', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <h3 style={{ margin: 0, color: '#fcc419' }}>⚙️ Admin Panel</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#adb5bd' }}>
                Draw a shape using the Polygon tool on the map, then publish it as a Temporary Flight Restriction (TFR).
            </p>

            <input
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="Zone Prefix"
                style={{ padding: '0.5rem', background: '#212529', color: 'white', border: '1px solid #495057', borderRadius: '4px' }}
            />

            <button
                onClick={handleCreateTFR}
                disabled={loading || !plannedRoute}
                style={{
                    padding: '0.5rem',
                    background: loading ? '#495057' : '#f03e3e',
                    color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold',
                    cursor: loading ? 'not-allowed' : 'pointer'
                }}
            >
                {loading ? 'Publishing...' : 'Publish TFR Polygon'}
            </button>

            {status && (
                <div style={{ fontSize: '0.85rem', color: status.type === 'success' ? '#51cf66' : '#ff4d4f' }}>
                    {status.msg}
                </div>
            )}
        </div>
    );
};
