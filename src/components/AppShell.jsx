import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import BoardView from '../pages/BoardView.jsx';
import ListView from '../pages/ListView.jsx';
import OverviewView from '../pages/OverviewView.jsx';
import AdminView from '../pages/AdminView.jsx';

export default function AppShell() {
  const { role } = useAuth();
  const { clients, clientsLoading, selectedClientId } = useData();
  const [view, setView] = useState(role === 'viewer' ? 'overview' : 'board');
  const [activeTeamIds, setActiveTeamIds] = useState(null);
  const [search, setSearch] = useState('');
  const [openNewSignal, setOpenNewSignal] = useState(false);

  if (clientsLoading) {
    return <div className="centered-msg">Carregando…</div>;
  }

  if (!clients.length) {
    return (
      <div className="centered-msg" style={{ flexDirection: 'column', gap: 10, textAlign: 'center', padding: 24 }}>
        <div>Nenhum cliente cadastrado ainda para o seu usuário.</div>
        {role === 'admin' ? (
          <div style={{ fontSize: 13 }}>Vá em Administração → Clientes para criar o primeiro.</div>
        ) : (
          <div style={{ fontSize: 13 }}>Peça para um admin te dar acesso a um cliente.</div>
        )}
      </div>
    );
  }

  return (
    <div id="shell-root">
      <Sidebar
        view={view}
        setView={setView}
        activeTeamIds={activeTeamIds}
        setActiveTeamIds={setActiveTeamIds}
        onNewTask={() => { setView((v) => (v === 'admin' ? 'board' : v)); setOpenNewSignal(true); }}
      />
      <div id="main">
        <Topbar view={view} search={search} setSearch={setSearch} />
        <div id="content" key={selectedClientId}>
          {view === 'board' && (
            <BoardView
              activeTeamIds={activeTeamIds}
              search={search}
              openNewSignal={openNewSignal}
              onConsumeNewSignal={() => setOpenNewSignal(false)}
            />
          )}
          {view === 'list' && (
            <ListView
              activeTeamIds={activeTeamIds}
              search={search}
              openNewSignal={openNewSignal}
              onConsumeNewSignal={() => setOpenNewSignal(false)}
            />
          )}
          {view === 'overview' && <OverviewView />}
          {view === 'admin' && <AdminView />}
        </div>
      </div>
    </div>
  );
}
