
            import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Key is missing!', { supabaseUrl, supabaseAnonKey });
} else {
  console.log('Supabase client initialized');
}

// 安全初始化：如果缺少配置，创建一个仅打印错误的代理对象，防止应用直接崩溃
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as any, {
      get: () => () => {
        console.error('Supabase client is not initialized. Please check your environment variables.');
        return { data: null, error: { message: 'Supabase configuration missing (VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY)' } };
      }
    });
            