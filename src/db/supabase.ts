
import { createClient } from "@supabase/supabase-js";
import { MANUAL_SUPABASE_ANON_KEY, MANUAL_SUPABASE_URL } from "./credentials";

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 优先使用环境变量，如果不存在或无效，则尝试使用手动配置
const supabaseUrl = envUrl || MANUAL_SUPABASE_URL;
const supabaseAnonKey = (envKey && envKey.startsWith('eyJ')) ? envKey : MANUAL_SUPABASE_ANON_KEY;

// Check if key looks valid (starts with eyJ for JWT)
// Modified: 暂时放宽校验，允许非 eyJ 开头的 Key (用户提供了 sb_publishable 格式)
const isKeyValid = supabaseAnonKey && supabaseAnonKey.length > 20;

if (!supabaseUrl || !isKeyValid) {
  console.error('Supabase URL is missing or Anon Key is too short.');
  console.log('Current URL:', supabaseUrl);
  console.log('Current Key (masked):', supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + '...' : 'undefined');
  console.log('请检查 .env 文件或 src/db/credentials.ts 配置');
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
let client;
try {
  client = (supabaseUrl && isKeyValid) 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createMockClient();
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  client = createMockClient();
}

export const supabase = client;
