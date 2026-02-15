import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    // Try to parse JSON error response and extract the message
    try {
      const json = JSON.parse(text);
      if (json.message) {
        throw new Error(json.message);
      }
    } catch (e) {
      // If parsing fails or no message, fall through
      if (e instanceof Error && e.message !== text) {
        throw e; // Re-throw if it's our parsed error
      }
    }
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Add detailed logging for debugging
  console.log(`[apiRequest] ${method} ${url} starting`);
  
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    
    console.log(`[apiRequest] ${method} ${url} response status:`, res.status);
    
    if (!res.ok) {
      console.error(`[apiRequest] ${method} ${url} error status:`, res.status);
      try {
        // Clone the response so we can both log it and return it
        const errorClone = res.clone();
        const errorText = await errorClone.text();
        console.error(`[apiRequest] ${method} ${url} error body:`, errorText);
      } catch (cloneError) {
        console.error(`[apiRequest] ${method} ${url} error body could not be read:`, cloneError);
      }
    } else {
      console.log(`[apiRequest] ${method} ${url} successful`);
    }
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`[apiRequest] ${method} ${url} exception:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    console.log(`[queryFn] Fetching ${queryKey[0]}`);
    
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });
      
      console.log(`[queryFn] ${queryKey[0]} response status:`, res.status);
      
      if (res.status === 401) {
        console.warn(`[queryFn] ${queryKey[0]} received unauthorized (401) response`);
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
      }
      
      if (!res.ok) {
        try {
          // Clone the response so we can both log it and use it
          const errorClone = res.clone();
          const errorText = await errorClone.text();
          console.error(`[queryFn] ${queryKey[0]} error body:`, errorText);
        } catch (cloneError) {
          console.error(`[queryFn] ${queryKey[0]} error body could not be read:`, cloneError);
        }
      }
      
      await throwIfResNotOk(res);
      const data = await res.json();
      console.log(`[queryFn] ${queryKey[0]} data:`, data);
      return data;
    } catch (error) {
      console.error(`[queryFn] ${queryKey[0]} exception:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // Changed from Infinity to 5 minutes for better data freshness
      // Specific queries can override this with their own staleTime
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Recommended staleTime values for different query types:
 *
 * - Events: 1 * 60 * 1000 (1 minute) - frequently updated
 * - User profile: 10 * 60 * 1000 (10 minutes) - rarely changes
 * - Settings: 5 * 60 * 1000 (5 minutes) - occasionally updated
 * - Booking links: 5 * 60 * 1000 (5 minutes) - moderate updates
 * - Calendar integrations: 10 * 60 * 1000 (10 minutes) - rarely changes
 * - Organizations/Teams: 15 * 60 * 1000 (15 minutes) - very rarely changes
 *
 * Override in specific queries like:
 * useQuery({ queryKey: ['/api/events'], staleTime: 1 * 60 * 1000 })
 */
