import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictBanner } from './ConflictBanner';
import * as telemetryHooks from '../../hooks/useTelemetry';

vi.mock('../../hooks/useTelemetry', () => ({
    useTelemetry: vi.fn(),
}));

describe('ConflictBanner Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Should return null (hidden) when there are no active drone conflicts', () => {
        (telemetryHooks.useTelemetry as any).mockReturnValue({
            data: [
                { droneId: 'A', status: { safe: true } },
                { droneId: 'B', status: { safe: true } }
            ]
        });

        const { container } = render(<ConflictBanner />);
        expect(container).toBeEmptyDOMElement();
    });

    it('Should render a red warning banner for Restricted Airspace violations', () => {
        (telemetryHooks.useTelemetry as any).mockReturnValue({
            data: [
                { droneId: 'DRONE-X', status: { safe: false, conflictingZone: 'NFZ-RESTRICTED' } }
            ]
        });

        render(<ConflictBanner />);
        expect(screen.getByText(/DRONE-X has triggered a Restricted Airspace Violation: NFZ-RESTRICTED/i)).toBeInTheDocument();
        // Check if color is red
        const banner = screen.getByText(/ALERT/i);
        expect(banner).toHaveStyle('background: rgb(240, 62, 62)'); // #f03e3e converted by jsdom
    });

    it('Should render an orange warning banner for V2V Proximity Warnings', () => {
        (telemetryHooks.useTelemetry as any).mockReturnValue({
            data: [
                { droneId: 'DRONE-Y', status: { safe: false, conflictingZone: 'WARNING_V2V (Proximity)' } }
            ]
        });

        render(<ConflictBanner />);
        expect(screen.getByText(/DRONE-Y has triggered a Proximity Warning: WARNING_V2V/i)).toBeInTheDocument();
        const banner = screen.getByText(/ALERT/i);
        expect(banner).toHaveStyle({ background: 'rgb(253, 126, 20)' }); // #fd7e14
    });
});
