import { QueryClient } from "@tanstack/react-query";

// Separate file as I was experiencing some circular dependency issue
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 1000,
    },
  },
});
