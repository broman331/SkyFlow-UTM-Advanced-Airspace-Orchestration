import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthModal } from './AuthModal';
import * as api from '../../services/api';
import { useMapStore } from '../../store/useStore';

// Mock the API calls
vi.mock('../../services/api', () => ({
    loginUser: vi.fn(),
    registerUser: vi.fn(),
}));

describe('AuthModal Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset Zustand store state before each test
        const store = useMapStore.getState();
        store.logout(); // custom function from our store setting token/user to null
    });

    it('Should strictly render the "Sign In" mode by default', () => {
        render(<AuthModal />);
        expect(screen.getByText('UTM Login')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
        expect(screen.getByText(/Need an account\? Register/i)).toBeInTheDocument();
    });

    it('Should toggle to the "Create Account" view when the secondary button is clicked', async () => {
        render(<AuthModal />);
        const toggleSpan = screen.getByText(/Need an account\? Register/i);
        await userEvent.click(toggleSpan);

        expect(screen.getByText('Pilot Registration')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
        expect(screen.getByText(/Already have an account\? Login/i)).toBeInTheDocument();
    });

    it('Should display validation errors if submitting an empty form (native HTML constraints)', async () => {
        render(<AuthModal />);
        const loginBtn = screen.getByRole('button', { name: /Login/i });

        // Browsers handle HTML5 validation but let's test that loginUser isn't called when clicking a submit button on an invalid form
        fireEvent.click(loginBtn);

        expect(api.loginUser).not.toHaveBeenCalled();
    });

    it('Should call the simulated Login API hook when valid credentials are submitted', async () => {
        render(<AuthModal />);

        // Setup API mock implementation
        (api.loginUser as any).mockResolvedValueOnce({
            token: 'mock-jwt-token',
            user: { email: 'test@utm.com', role: 'PILOT' }
        });

        // Type credentials
        await userEvent.type(screen.getByPlaceholderText('Email Address'), 'test@utm.com');
        await userEvent.type(screen.getByPlaceholderText('Password'), 'password123');

        // Submit form
        const loginBtn = screen.getByRole('button', { name: /Login/i });
        fireEvent.click(loginBtn);

        // Verify API was called with correct payload
        await waitFor(() => {
            expect(api.loginUser).toHaveBeenCalledWith({
                email: 'test@utm.com',
                password: 'password123'
            });
        });

        // Verify Zustand store received setAuth
        const store = useMapStore.getState();
        expect(store.auth.token).toBe('mock-jwt-token');
        expect(store.auth.user.email).toBe('test@utm.com');
    });

    it('Should display server error messages on failed login', async () => {
        render(<AuthModal />);

        // Mock API rejection
        (api.loginUser as any).mockRejectedValueOnce({
            response: { data: { error: 'Invalid credentials' } }
        });

        await userEvent.type(screen.getByPlaceholderText('Email Address'), 'wrong@utm.com');
        await userEvent.type(screen.getByPlaceholderText('Password'), 'wrongpass');

        const loginBtn = screen.getByRole('button', { name: /Login/i });
        fireEvent.click(loginBtn);

        // Verify error renders in the UI
        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
        });
    });
});
