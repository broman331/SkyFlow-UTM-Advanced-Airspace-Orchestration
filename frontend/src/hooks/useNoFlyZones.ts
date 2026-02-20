import { useQuery } from '@tanstack/react-query';
import { fetchNoFlyZones } from '../services/api';

export const useNoFlyZones = () => {
    return useQuery({
        queryKey: ['noFlyZones'],
        queryFn: fetchNoFlyZones,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
};
