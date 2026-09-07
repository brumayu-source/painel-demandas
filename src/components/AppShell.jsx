import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import BoardView from '../pages/BoardView.jsx';
import ListView from '../pages/ListView.jsx';
import OverviewView from '../pages/OverviewView.jsx';
import AdminView from '../pages/AdminView.jsx';
import SolicitacoesView from '../pages/SolicitacoesView.jsx';
import ArchivedView from '../pages/ArchivedView.jsx';

export default function AppShell() {
  const { role } = useAuth();
  const { clients, clientsLoading, selectedClientId } = useData();
  const [view, setView] = useState(role === 'viewer' ? 'overview' : 'board');
  const [activeTeamIds, setActiveTeamIds] = useState(null);
  const [activeAssigneeIds, setActiveAssigneeIds] = useState(null);
  const [activeClientIds, setActiveClientIds] = useState(null);
  const [activeCategoryIds, setActiveCategoryIds] = useState(null);
  const [search, setSearch] = useState('');
  const [openNewSignal, setOpenNewSignal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  if (clientsLoading) {
    return <div className="centered-msg">Carregando…</div>;
  }

  // Sem nenhum cliente cadastrado ainda: admin não pode ficar sem saída (sem
  // sidebar não tem como chegar em Administração), então força a tela de
  // administração até existir pelo menos um cliente. Quem não é admin só vê
  // um aviso — mas ainda dentro do shell, com acesso ao "Sair".
  const noClients = !clients.length;
  const isAdmin = role === 'admin';
  const effectiveView = noClients && isAdmin ? 'admin' : view;

  return (
    <div id="shell-root">
      <Sidebar
        view={effectiveView}
        setView={setView}
        activeTeamIds={activeTeamIds}
        setActiveTeamIds={setActiveTeamIds}
        activeAssigneeIds={activeAssigneeIds}
        setActiveAssigneeIds={setActiveAssigneeIds}
        activeClientIds={activeClientIds}
        setActiveClientIds={setActiveClientIds}
        activeCategoryIds={activeCategoryIds}
        setActiveCategoryIds={setActiveCategoryIds}
        onNewTask={() => { setView((v) => (v === 'admin' ? 'board' : v)); setOpenNewSignal(true); }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <div id="main">
        <Topbar view={effectiveView} search={search} setSearch={setSearch} onMenuClick={() => setSidebarOpen(true)} />
        <div id="content" key={selectedClientId}>
          {noClients && !isAdmin && (
            <div className="centered-msg" style={{ flexDirection: 'column', gap: 10, textAlign: 'center', padding: 24 }}>
              <div>Nenhum cliente cadastrado ainda para o seu usuário.</div>
              <div style={{ fontSize: 13 }}>Peça para um admin te dar acesso a um cliente.</div>
            </div>
          )}
          {!noClients && effectiveView === 'board' && (
            <BoardView
              activeTeamIds={activeTeamIds}
              activeAssigneeIds={activeAssigneeIds}
              activeClientIds={activeClientIds}
              activeCategoryIds={activeCategoryIds}
              search={search}
              openNewSignal={openNewSignal}
              onConsumeNewSignal={() => setOpenNewSignal(false)}
            />
          )}
          {!noClients && effectiveView === 'list' && (
            <ListView
              activeTeamIds={activeTeamIds}
              activeAssigneeIds={activeAssigneeIds}
              activeClientIds={activeClientIds}
              activeCategoryIds={activeCategoryIds}
              search={search}
              openNewSignal={openNewSignal}
              onConsumeNewSignal={() => setOpenNewSignal(false)}
            />
          )}
          {!noClients && effectiveView === 'overview' && <OverviewView />}
          {!noClients && effectiveView === 'solicitacoes' && <SolicitacoesView />}
          {!noClients && effectiveView === 'archived' && <ArchivedView />}
          {effectiveView === 'admin' && <AdminView />}
        </div>
      </div>
    </div>
  );
}
