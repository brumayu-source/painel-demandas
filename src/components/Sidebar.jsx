import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { IconBoard, IconList, IconChart, IconGear, IconChevron, IconSignOut } from './icons.jsx';

export default function Sidebar({ view, setView, activeTeamIds, setActiveTeamIds, onNewTask }) {
  const { profile, role, isAdmin, canWrite, signOut } = useAuth();
  const { clients, selectedClient, selectedClientId, setSelectedClientId, teams, tasks } = useData();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const activeCounts = {};
  teams.forEach((t) => { activeCounts[t.id] = tasks.filter((x) => x.team_id === t.id && x.stage !== 'done').length; });

  function toggleTeam(id) {
    if (activeTeamIds === null) {
      setActiveTeamIds(teams.map((t) => t.id).filter((x) => x !== id));
    } else {
      const has = activeTeamIds.includes(id);
      let next = has ? activeTeamIds.filter((x) => x !== id) : [...activeTeamIds, id];
      if (next.length === teams.length) next = null;
      setActiveTeamIds(next);
    }
  }

  return (
    <div id="sidebar">
      <div className="brand">
        <div className="brand-mark">PD</div>
        <div className="brand-text">
          <div className="brand-title">Painel de Demandas</div>
          <div className="brand-sub">Caruma</div>
        </div>
      </div>

      {clients.length > 0 && (
        <div className="client-switcher">
          <button className="client-switcher-btn" onClick={() => setSwitcherOpen((v) => !v)}>
            <span style={{ flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedClient?.name || 'Selecione um cliente'}
            </span>
            <IconChevron />
          </button>
          {switcherOpen && (
            <div className="client-switcher-list">
              {clients.map((c) => (
                <button
                  key={c.id}
                  className={`client-switcher-item${c.id === selectedClientId ? ' active' : ''}`}
                  onClick={() => { setSelectedClientId(c.id); setSwitcherOpen(false); }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button className="side-btn-new" disabled={!canWrite} onClick={onNewTask}>
        + Nova demanda
      </button>

      <nav className="side-nav">
        <NavItem active={view === 'board'} onClick={() => setView('board')} icon={<IconBoard />} label="Quadro"
          count={tasks.filter((t) => t.stage !== 'done').length} />
        <NavItem active={view === 'list'} onClick={() => setView('list')} icon={<IconList />} label="Lista" count={tasks.length} />
        <NavItem active={view === 'overview'} onClick={() => setView('overview')} icon={<IconChart />} label="Painel" />
        {isAdmin && (
          <NavItem active={view === 'admin'} onClick={() => setView('admin')} icon={<IconGear />} label="Administração" />
        )}
      </nav>

      <div className="side-section-label">Times</div>
      <div className="team-filter-list">
        {teams.map((t) => {
          const on = activeTeamIds === null || activeTeamIds.includes(t.id);
          return (
            <button key={t.id} className={`team-filter-item${on ? '' : ' off'}`} onClick={() => toggleTeam(t.id)}>
              <span className="team-dot" style={{ background: `var(--team-${(t.slot % 8) + 1})` }} />
              <span className="tname">{t.name}</span>
              <span className="tcount mono">{activeCounts[t.id] || 0}</span>
            </button>
          );
        })}
        {teams.length === 0 && <div className="empty-mini" style={{ padding: '6px 10px' }}>Nenhum time ainda.</div>}
      </div>

      <div className="side-footer">
        <div className="side-whoami">{profile?.name} · {roleLabel(role)}</div>
        <button className="side-signout" onClick={signOut}><IconSignOut /> Sair</button>
      </div>
    </div>
  );
}

function roleLabel(role) {
  if (role === 'admin') return 'admin';
  if (role === 'editor') return 'editor';
  return 'visualização';
}

function NavItem({ active, onClick, icon, label, count }) {
  return (
    <button className={`side-link${active ? ' active' : ''}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {count != null && <span className="count mono">{count}</span>}
    </button>
  );
}
