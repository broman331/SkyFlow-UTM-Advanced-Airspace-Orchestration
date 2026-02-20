import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminPanel } from './AdminPanel';
import { useMapStore } from '../../store/useStore';
import * as api from '../../services/api';

// Mock dependencies
vi.mock('../../services/api', () => ({
    createNoFlyZone: vi.fn(),
}));

const mockInvalidateQueries = vi.fn();
vi.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({
        invalidateQueries: mockInvalidateQueries
    })
}));

describe('AdminPanel Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        const store = useMapStore.getState();
        store.logout();
        store.setPlannedRoute(null);
    });

    it('Should NOT render if the current Zustand user.role is PILOT or null', () => {
        const store = useMapStore.getState();
        // user is null initially internally by logout
        const { container } = render(<AdminPanel />);
        expect(container).toBeEmptyDOMElement();

        // Switch to pilot
        store.setAuth('token', { role: 'PILOT' });
        const { container: pilotContainer } = render(<AdminPanel />);
        expect(pilotContainer).toBeEmptyDOMElement();
    });

    it('Should render successfully if the Zustand user.role is ADMIN', () => {
        const store = useMapStore.getState();
        store.setAuth('token', { role: 'ADMIN' });

        render(<AdminPanel />);
        expect(screen.getByText('⚙️ Admin Panel')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Publish TFR Polygon/i })).toBeInTheDocument();
    });

    it('Should trigger createNoFlyZone and invalidateQueries when valid polygon is submitted', async () => {
        const store = useMapStore.getState();
        store.setAuth('token', { role: 'ADMIN' });
        store.setPlannedRoute({ geometry: { type: 'Polygon', coordinates: [] } });

        (api.createNoFlyZone as any).mockResolvedValueOnce({});

        render(<AdminPanel />);

        const publishBtn = screen.getByRole('button', { name: /Publish TFR Polygon/i });
        fireEvent.click(publishBtn);

        // Verify API was called
        await waitFor(() => {
            expect(api.createNoFlyZone).toHaveBeenCalled();
            expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['nfzs'] });
            expect(screen.getByText('TFR Published Successfully!')).toBeInTheDocument();
        });
    });

    it('Should return an error message if the drawn shape is not a Polygon', async () => {
        const store = useMapStore.getState();
        store.setAuth('token', { role: 'ADMIN' });
        store.setPlannedRoute({ geometry: { type: 'LineString', coordinates: [] } });

        render(<AdminPanel />);

        const publishBtn = screen.getByRole('button', { name: /Publish TFR Polygon/i });
        fireEvent.click(publishBtn);

        await waitFor(() => {
            expect(screen.getByText(/Please draw a Polygon/i)).toBeInTheDocument();
        });
    });
});
