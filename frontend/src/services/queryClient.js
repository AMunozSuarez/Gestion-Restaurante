import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            staleTime: 1000 * 60 * 5, // Los datos se consideran frescos durante 5 minutos
            cacheTime: 1000 * 60 * 10, // Los datos se mantienen en caché durante 10 minutos
        },
    },
});

export default queryClient;