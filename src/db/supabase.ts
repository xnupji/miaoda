
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if key looks valid (starts with eyJ for JWT)
const isKeyValid = supabaseAnonKey && supabaseAnonKey.startsWith('eyJ');

if (!supabaseUrl || !isKeyValid) {
  console.error('Supabase URL is missing or Anon Key is invalid (must start with "eyJ"). Using mock client.');
} else {
  // console.log('Supabase client initialized');
}

const createMockClient = () => {
  const mockError = { message: 'Supabase configuration missing (VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY)' };
  const mockPromiseResult = { data: null, error: mockError };

  // A recursive proxy that can be called as a function, accessed as an object, and awaited
  const chainableProxy: any = new Proxy(() => {}, {
    get: (target, prop) => {
      // Handle Promise.then to allow awaiting
      if (prop === 'then') {
        return (resolve: any) => resolve(mockPromiseResult);
      }
      return chainableProxy;
    },
    apply: (target, thisArg, args) => {
      return chainableProxy;
    }
  });

  return new Proxy({} as any, {
    get: (target, prop) => {
      // Handle specific Auth methods that are expected to return specific structures
      if (prop === 'auth') {
        return {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          getUser: () => Promise.resolve({ data: { user: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signInWithPassword: () => Promise.resolve({ data: null, error: mockError }),
          signUp: () => Promise.resolve({ data: null, error: mockError }),
          signOut: () => Promise.resolve({ error: null }),
        };
      }
      
      // Handle Realtime
      if (prop === 'channel') {
         return () => ({
            on: () => ({ subscribe: () => {} }),
            subscribe: () => {},
            unsubscribe: () => {}
         });
      }
      if (prop === 'removeChannel') {
          return () => {};
      }

      // Default for .from() and other chaining
      return chainableProxy;
    }
  });
};

// Safe initialization: if config is missing/invalid, use mock client to prevent app crash and log spam
export const supabase = (supabaseUrl && isKeyValid) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient();
