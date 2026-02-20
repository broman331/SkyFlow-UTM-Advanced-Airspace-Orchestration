import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapView } from './MapView';
import * as nfzHooks from '../../hooks/useNoFlyZones';
import * as telemetryHooks from '../../hooks/useTelemetry';

// Mock mapbox-gl entirely to avoid canvas/webgl errors in jsdom
vi.mock('mapbox-gl', () => {
    return {
        default: {
            accessToken: '',
            Map: class {
                addControl = vi.fn();
                on = vi.fn();
                remove = vi.fn();
            }
        }
    };
});

// Mock MapboxDraw
vi.mock('@mapbox/mapbox-gl-draw', () => {
    return {
        default: vi.fn()
    };
});

vi.mock('../../hooks/useNoFlyZones', () => ({
    useNoFlyZones: vi.fn(),
}));

vi.mock('../../hooks/useTelemetry', () => ({
    useTelemetry: vi.fn(),
}));

describe('MapView Component Edge Cases', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (telemetryHooks.useTelemetry as any).mockReturnValue({ data: [] });
    });

    it('Should display a Mapbox Token Missing error overlay if the environmental variable is absent', () => {
        // Set no fly zones mock to normal
        (nfzHooks.useNoFlyZones as any).mockReturnValue({ data: [], isLoading: false });

        // Temporarily clear mapbox token using vitest API
        vi.stubEnv('VITE_MAPBOX_TOKEN', '');

        render(<MapView />);
        expect(screen.getByText('Mapbox Token Missing')).toBeInTheDocument();

        // Restore
        vi.unstubAllEnvs();
    });

    it('Should display a "Fetching NFZs..." loader overlay if the Map is still waiting on No-Fly-Zone coordinates', () => {
        (nfzHooks.useNoFlyZones as any).mockReturnValue({ data: undefined, isLoading: true });
        // Ensure token is mocked if missing in environment test context
        import.meta.env.VITE_MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'mock-token';

        render(<MapView />);
        expect(screen.getByText('Fetching NFZs...')).toBeInTheDocument();
    });
});
