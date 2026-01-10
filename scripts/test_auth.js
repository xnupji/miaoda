import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pwlgtiiiapiahtwtvojz.supabase.co';
const supabaseKey = 'sb_publishable_OBcHJSvgjz9K_s09n4UHKA_enjz0h1x';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const username = 'test_user_' + Date.now();
  const password = 'password123';
  const email = `${username}@htpfoom.top`;

  console.log(`Attempting to register user: ${username}`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username,
      }
    }
  });

  if (error) {
    console.error('Registration failed:', error.message);
    console.error('Full Error:', JSON.stringify(error, null, 2));
  } else {
    console.log('Registration successful!');
    console.log('User ID:', data.user?.id);
    
    // Check if session exists (means auto-confirm worked)
    if (data.session) {
        console.log('Session created immediately (Auto-confirm worked)');
    } else {
        console.log('No session created (Email verification might be required)');
    }

    // Try to login
    console.log('Attempting to login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (loginError) {
        console.error('Login failed:', loginError.message);
    } else {
        console.log('Login successful!');
        
        // Check profile
        console.log('Checking profile...');
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
            
        if (profileError) {
            console.error('Profile fetch failed:', profileError.message);
        } else {
            console.log('Profile found:', profile);
        }
    }
  }
}

test();
