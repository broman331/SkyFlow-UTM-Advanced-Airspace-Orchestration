import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlightPlanner } from './FlightPlanner';
import { useMapStore } from '../../store/useStore';
import * as flightIntentHooks from '../../hooks/useSubmitFlightIntent';

vi.mock('../../hooks/useSubmitFlightIntent', () => ({
    useSubmitFlightIntent: vi.fn(),
}));

describe('FlightPlanner Component', () => {
    let mockSubmitIntent: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSubmitIntent = vi.fn();
        (flightIntentHooks.useSubmitFlightIntent as any).mockReturnValue({
            mutateAsync: mockSubmitIntent,
            isPending: false
        });

        const store = useMapStore.getState();
        store.setPlannedRoute(null); // Reset route
    });

    it('Should display a prompt asking the user to draw a route if plannedRoute is null', () => {
        render(<FlightPlanner />);
        expect(screen.getByText(/Select the Line tool on the map to draw a proposed flight path./i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Submit Flight Intent/i })).not.toBeInTheDocument();
    });

    it('Should render the Submit button if a line is drawn on the map', () => {
        const store = useMapStore.getState();
        store.setPlannedRoute({ geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } });

        render(<FlightPlanner />);
        expect(screen.getByText(/Route Drawn. Ready to evaluate./i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Submit Flight Intent/i })).toBeInTheDocument();
    });

    it('Should display a success message when a flight intent is authorized', async () => {
        const store = useMapStore.getState();
        store.setPlannedRoute({ geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } });
        mockSubmitIntent.mockResolvedValueOnce({ authorized: true });

        render(<FlightPlanner />);
        const submitBtn = screen.getByRole('button', { name: /Submit Flight Intent/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(mockSubmitIntent).toHaveBeenCalled();
            expect(screen.getByText('Flight Authorized! You are cleared to fly.')).toBeInTheDocument();
        });
    });

    it('Should display a specific zone conflict error message if the backend rejects the flight with a 403 status', async () => {
        const store = useMapStore.getState();
        store.setPlannedRoute({ geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } });

        mockSubmitIntent.mockRejectedValueOnce({
            response: {
                status: 403,
                data: { conflictingZone: 'NFZ-RESTRICTED' }
            }
        });

        render(<FlightPlanner />);
        const submitBtn = screen.getByRole('button', { name: /Submit Flight Intent/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText('Flight Rejected! Conflict with: NFZ-RESTRICTED')).toBeInTheDocument();
            // test error background
            const errorElement = screen.getByText('Flight Rejected! Conflict with: NFZ-RESTRICTED');
            expect(errorElement).toHaveStyle({ background: 'rgb(255, 107, 107)' }); // #ff6b6b
        });
    });

    it('Should display generic error message on network failure', async () => {
        const store = useMapStore.getState();
        store.setPlannedRoute({ geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } });

        mockSubmitIntent.mockRejectedValueOnce(new Error('Network Error'));

        render(<FlightPlanner />);
        const submitBtn = screen.getByRole('button', { name: /Submit Flight Intent/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText('An unknown API error occurred.')).toBeInTheDocument();
        });
    });
});
