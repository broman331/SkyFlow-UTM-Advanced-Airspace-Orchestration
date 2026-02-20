import axios from 'axios';
import { useMapStore } from '../store/useStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Axios Interceptor to inject JWT Token on every request
apiClient.interceptors.request.use((config) => {
    const token = useMapStore.getState().auth.token;
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export const loginUser = async (credentials: any) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
};

export const registerUser = async (credentials: any) => {
    const response = await apiClient.post('/auth/register', credentials);
    return response.data;
};

export const submitFlightIntent = async (intentPayload: any) => {
    const response = await apiClient.post('/flight-intent', intentPayload);
    return response.data;
};

export const verifyTelemetry = async (telemetry: any) => {
    const response = await apiClient.post('/telemetry', telemetry);
    return response.data;
};

export const fetchNoFlyZones = async () => {
    const response = await apiClient.get('/no-fly-zones');
    return response.data;
};

export const createNoFlyZone = async (payload: { zoneId: string, geojson: any }) => {
    const response = await apiClient.post('/no-fly-zones', payload);
    return response.data;
};

export const fetchAllTelemetry = async () => {
    const response = await apiClient.get('/telemetry');
    return response.data;
};
