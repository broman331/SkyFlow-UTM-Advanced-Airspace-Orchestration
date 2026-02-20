import { create } from 'zustand';

interface MapState {
    activeDroneId: string | null;
    setActiveDrone: (id: string | null) => void;

    plannedRoute: any | null; // GeoJSON LineString
    setPlannedRoute: (route: any | null) => void;

    auth: { token: string | null, user: any | null };
    setAuth: (token: string | null, user: any | null) => void;
    logout: () => void;
}

// Retrieve any existing token from local storage to keep user logged in on refresh
const storedToken = localStorage.getItem('utm-token');
const storedUser = localStorage.getItem('utm-user');

export const useMapStore = create<MapState>((set) => ({
    activeDroneId: null,
    setActiveDrone: (id) => set({ activeDroneId: id }),

    plannedRoute: null,
    setPlannedRoute: (route) => set({ plannedRoute: route }),

    auth: {
        token: storedToken ? storedToken : null,
        user: storedUser ? JSON.parse(storedUser) : null,
    },
    setAuth: (token, user) => {
        if (token && user) {
            localStorage.setItem('utm-token', token);
            localStorage.setItem('utm-user', JSON.stringify(user));
            set({ auth: { token, user } });
        }
    },
    logout: () => {
        localStorage.removeItem('utm-token');
        localStorage.removeItem('utm-user');
        set({ auth: { token: null, user: null } });
    }
}));
