import { useQuery } from '@tanstack/react-query';
import { fetchAllTelemetry } from '../services/api';

export const useTelemetry = () => {
    return useQuery({
        queryKey: ['telemetry'],
        queryFn: fetchAllTelemetry,
        refetchInterval: 2000, // Poll every 2 seconds
        staleTime: 1000 // Cache is stale after 1s to ensure snappy updates
    });
};
