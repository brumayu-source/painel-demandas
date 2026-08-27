import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { DataProvider } from './context/DataContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { supabaseConfigured } from './lib/supabase.js';
import Login from './pages/Login.jsx';
import AppShell from './components/AppShell.jsx';

function Gate() {
  const { session, profile, profileLoading } = useAuth();

  if (session === undefined) return <div className="centered-msg">Carregando…</div>;
  if (session === null) return <Login />;
  if (profileLoading || !profile) return <div className="centered-msg">Carregando seu perfil…</div>;

  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  );
}

export default function App() {
  if (!supabaseConfigured) {
    return (
      <div className="centered-msg" style={{ flexDirection: 'column', gap: 10, textAlign: 'center', padding: 24 }}>
        <div>Configuração pendente.</div>
        <div style={{ fontSize: 13, maxWidth: 420 }}>
          Faltam as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Veja o guia de deploy para
          configurá-las (localmente em .env.local, ou nas variáveis de ambiente do Vercel).
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ToastProvider>
  );
}
