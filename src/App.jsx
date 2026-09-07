import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { DataProvider } from './context/DataContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { supabaseConfigured } from './lib/supabase.js';
import Login from './pages/Login.jsx';
import AppShell from './components/AppShell.jsx';

function Gate() {
  const { session, profile } = useAuth();

  if (session === undefined) return <div className="centered-msg">Carregando…</div>;
  if (session === null) return <Login />;
  // só mostra a tela cheia de "carregando" na primeira vez (profile ainda
  // null). O Supabase revalida a sessão sozinho toda vez que a aba volta a
  // ficar em foco (troca de app no celular, troca de janela no computador) —
  // sem essa checagem, cada revalidação em segundo plano desmontava o
  // DataProvider/AppShell inteiro (resetando filtros, seleção de cliente
  // etc.), dando a impressão de que a página tinha recarregado do zero.
  if (!profile) return <div className="centered-msg">Carregando seu perfil…</div>;

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
