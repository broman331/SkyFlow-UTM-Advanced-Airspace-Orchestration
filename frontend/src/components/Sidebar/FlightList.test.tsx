import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlightList } from './FlightList';
import * as telemetryHooks from '../../hooks/useTelemetry';
import { useMapStore } from '../../store/useStore';

vi.mock('../../hooks/useTelemetry', () => ({
    useTelemetry: vi.fn(),
}));

describe('FlightList Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        const store = useMapStore.getState();
        store.setActiveDrone(null); // Reset active selection
    });

    it('Should render a loading state when data is fetching', () => {
        (telemetryHooks.useTelemetry as any).mockReturnValue({ isLoading: true });
        render(<FlightList />);
        expect(screen.getByText(/Loading telemetry/i)).toBeInTheDocument();
    });

    it('Should render an error state when the API request fails', () => {
        (telemetryHooks.useTelemetry as any).mockReturnValue({ error: new Error('API Down') });
        render(<FlightList />);
        expect(screen.getByText(/Simulation Offline/i)).toBeInTheDocument();
    });

    it('Should render an empty state message if 0 drones are active', () => {
        (telemetryHooks.useTelemetry as any).mockReturnValue({ data: [] });
        render(<FlightList />);
        expect(screen.getByText(/No active flights detected/i)).toBeInTheDocument();
    });

    it('Should render a list item for each drone provided by the mocked useTelemetry hook', () => {
        (telemetryHooks.useTelemetry as any).mockReturnValue({
            data: [
                { droneId: 'DRONE-1', altitude: 100, speed: 12, status: { safe: true } },
                { droneId: 'DRONE-2', altitude: 120, speed: 10, status: { safe: true } },
            ]
        });

        render(<FlightList />);
        expect(screen.getByText('DRONE-1')).toBeInTheDocument();
        expect(screen.getByText('DRONE-2')).toBeInTheDocument();
        expect(screen.getByText('Active Flights')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument(); // Badge counter
    });

    it('Should apply specialized visual warnings (CSS) to drones marked as safe: false', () => {
        (telemetryHooks.useTelemetry as any).mockReturnValue({
            data: [
                { droneId: 'DRONE-SAFE', altitude: 100, speed: 15, status: { safe: true } },
                { droneId: 'DRONE-BREACH', altitude: 100, speed: 15, status: { safe: false, conflictingZone: 'NFZ-1' } },
                { droneId: 'DRONE-V2V', altitude: 100, speed: 15, status: { safe: false, conflictingZone: 'WARNING_V2V' } },
            ]
        });

        render(<FlightList />);

        // Safe Drone
        expect(screen.getByText('DRONE-SAFE').nextElementSibling).toHaveTextContent('Safe Flight');
        expect(screen.getByText('DRONE-SAFE').nextElementSibling).toHaveStyle({ color: 'rgb(81, 207, 102)' }); // #51cf66

        // Airspace Breach
        expect(screen.getByText('DRONE-BREACH').nextElementSibling).toHaveTextContent('Airspace Breach');
        expect(screen.getByText('DRONE-BREACH').nextElementSibling).toHaveStyle({ color: 'rgb(255, 77, 79)' }); // #ff4d4f

        // V2V Proximity
        expect(screen.getByText('DRONE-V2V').nextElementSibling).toHaveTextContent('V2V Hazard');
        expect(screen.getByText('DRONE-V2V').nextElementSibling).toHaveStyle({ color: 'rgb(253, 126, 20)' }); // #fd7e14
    });

    it('Should allow pilots to click a drone to mark it as the active selection in Zustand', () => {
        (telemetryHooks.useTelemetry as any).mockReturnValue({
            data: [
                { droneId: 'DRONE-TARGET', altitude: 100, speed: 15, status: { safe: true } }
            ]
        });

        render(<FlightList />);

        // Initial state
        expect(useMapStore.getState().activeDroneId).toBeNull();

        // Click interaction
        const droneItem = screen.getByText('DRONE-TARGET');
        fireEvent.click(droneItem);

        // Verify state mutated
        expect(useMapStore.getState().activeDroneId).toBe('DRONE-TARGET');
    });
});
