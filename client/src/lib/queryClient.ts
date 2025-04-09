import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
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
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
