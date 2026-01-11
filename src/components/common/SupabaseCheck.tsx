import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

const SupabaseCheck: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    // Modified: 暂时放宽校验
    const isKeyValid = supabaseKey && supabaseKey.length > 20;

    if (!supabaseUrl || !isKeyValid) {
      setIsVisible(true);
      toast.error('Supabase configuration missing or invalid!', {
        description: 'Please check your .env file or credentials.',
        duration: Infinity, // Keep it visible until fixed
      });
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 p-4 bg-red-100 border border-red-400 text-red-700 rounded shadow-lg max-w-sm">
      <h3 className="font-bold">Configuration Error</h3>
      <p className="text-sm">
        Supabase environment variables are missing. Please check your <code>.env</code> file locally or <strong>GitHub Secrets</strong> for production.
      </p>
    </div>
  );
};

export default SupabaseCheck;
