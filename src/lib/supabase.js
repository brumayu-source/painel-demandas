import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

if (!supabaseConfigured) {
  // eslint-disable-next-line no-console
  console.error(
    'Faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copie .env.example para ' +
      '.env.local (localmente) ou configure as variáveis de ambiente no Vercel.'
  );
}

export const supabase = supabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
