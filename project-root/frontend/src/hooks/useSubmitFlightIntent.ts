import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitFlightIntent } from '../services/api';

export const useSubmitFlightIntent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: submitFlightIntent,
        onSuccess: () => {
            // In a real app we might invalidate a "flights" query to refetch active flights
            queryClient.invalidateQueries({ queryKey: ['flights'] });
        }
    });
};
