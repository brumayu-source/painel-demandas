import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { IconBoard, IconList, IconChart, IconGear, IconChevron, IconSignOut, IconClose, IconInbox, IconArchive } from './icons.jsx';
import { initials, personColorVar, categoryColorVar } from '../lib/format.js';

export default function Sidebar({
  view, setView,
  activeTeamIds, setActiveTeamIds,
  activeAssigneeIds, setActiveAssigneeIds,
  activeClientIds, setActiveClientIds,
  activeCategoryIds, setActiveCategoryIds,
  onNewTask, open, onClose,
}) {
  const { profile, role, isAdmin, canWrite, signOut } = useAuth();
  const { clients, selectedClient, selectedClientId, setSelectedClientId, teams, categories, tasks, assignableProfiles } = useData();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const allMode = selectedClientId === 'ALL';

  const activeCounts = {};
  teams.forEach((t) => { activeCounts[t.id] = tasks.filter((x) => x.team_id === t.id && x.stage !== 'done').length; });

  const assigneeCounts = {};
  assignableProfiles.forEach((p) => { assigneeCounts[p.id] = tasks.filter((x) => x.assignee_id === p.id && x.stage !== 'done').length; });

  const clientCounts = {};
  clients.forEach((c) => { clientCounts[c.id] = tasks.filter((x) => x.client_id === c.id && x.stage !== 'done').length; });

  const categoryCounts = {};
  categories.forEach((c) => { categoryCounts[c.id] = tasks.filter((x) => x.category_id === c.id && x.stage !== 'done').length; });

  const clientById = (id) => clients.find((c) => c.id === id);

  const solicitacoesCount = tasks.filter((t) => t.stage === 'solicitado').length;
  const archivedCount = tasks.filter((t) => t.archived).length;

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

  function toggleAssignee(id) {
    if (activeAssigneeIds === null) {
      setActiveAssigneeIds(assignableProfiles.map((p) => p.id).filter((x) => x !== id));
    } else {
      const has = activeAssigneeIds.includes(id);
      let next = has ? activeAssigneeIds.filter((x) => x !== id) : [...activeAssigneeIds, id];
      if (next.length === assignableProfiles.length) next = null;
      setActiveAssigneeIds(next);
    }
  }

  function toggleClient(id) {
    if (activeClientIds === null) {
      setActiveClientIds(clients.map((c) => c.id).filter((x) => x !== id));
    } else {
      const has = activeClientIds.includes(id);
      let next = has ? activeClientIds.filter((x) => x !== id) : [...activeClientIds, id];
      if (next.length === clients.length) next = null;
      setActiveClientIds(next);
    }
  }

  function toggleCategory(id) {
    if (activeCategoryIds === null) {
      setActiveCategoryIds(categories.map((c) => c.id).filter((x) => x !== id));
    } else {
      const has = activeCategoryIds.includes(id);
      let next = has ? activeCategoryIds.filter((x) => x !== id) : [...activeCategoryIds, id];
      if (next.length === categories.length) next = null;
      setActiveCategoryIds(next);
    }
  }

  return (
    <div id="sidebar" className={open ? 'mobile-open' : ''}>
      <div className="brand">
        <div className="brand-mark">u</div>
        <div className="brand-text">
          <div className="brand-title">umê</div>
          <div className="brand-sub">painel de demandas</div>
        </div>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Fechar menu">
          <IconClose />
        </button>
      </div>

      {clients.length > 0 && (
        <div className="client-switcher">
          <button className="client-switcher-btn" onClick={() => setSwitcherOpen((v) => !v)}>
            <span style={{ flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {allMode ? 'Todos os clientes' : selectedClient?.name || 'Selecione um cliente'}
            </span>
            <IconChevron />
          </button>
          {switcherOpen && (
            <div className="client-switcher-list">
              {clients.length > 1 && (
                <button
                  className={`client-switcher-item${allMode ? ' active' : ''}`}
                  onClick={() => { setSelectedClientId('ALL'); setActiveClientIds?.(null); setSwitcherOpen(false); }}
                >
                  Todos os clientes
                </button>
              )}
              {clients.map((c) => (
                <button
                  key={c.id}
                  className={`client-switcher-item${c.id === selectedClientId ? ' active' : ''}`}
                  onClick={() => { setSelectedClientId(c.id); setActiveClientIds?.(null); setSwitcherOpen(false); }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button className="side-btn-new" disabled={!canWrite} onClick={() => { onNewTask(); onClose?.(); }}>
        + Nova demanda
      </button>

      <nav className="side-nav">
        <NavItem active={view === 'board'} onClick={() => { setView('board'); onClose?.(); }} icon={<IconBoard />} label="Quadro"
          count={tasks.filter((t) => t.stage !== 'done').length} />
        <NavItem active={view === 'list'} onClick={() => { setView('list'); onClose?.(); }} icon={<IconList />} label="Lista" count={tasks.length} />
        <NavItem active={view === 'overview'} onClick={() => { setView('overview'); onClose?.(); }} icon={<IconChart />} label="Painel" />
        <NavItem active={view === 'solicitacoes'} onClick={() => { setView('solicitacoes'); onClose?.(); }} icon={<IconInbox />} label="Solicitações"
          count={solicitacoesCount} />
        <NavItem active={view === 'archived'} onClick={() => { setView('archived'); onClose?.(); }} icon={<IconArchive />} label="Arquivadas"
          count={archivedCount} />
        {isAdmin && (
          <NavItem active={view === 'admin'} onClick={() => { setView('admin'); onClose?.(); }} icon={<IconGear />} label="Administração" />
        )}
      </nav>

      {allMode && (
        <>
          <div className="side-section-label">Clientes</div>
          <div className="team-filter-list">
            {clients.map((c) => {
              const on = activeClientIds === null || activeClientIds.includes(c.id);
              return (
                <button key={c.id} className={`team-filter-item${on ? '' : ' off'}`} onClick={() => toggleClient(c.id)}>
                  <span className="tname">{c.name}</span>
                  <span className="tcount mono">{clientCounts[c.id] || 0}</span>
                </button>
              );
            })}
            {clients.length === 0 && <div className="empty-mini" style={{ padding: '6px 10px' }}>Nenhum cliente ainda.</div>}
          </div>
        </>
      )}

      <div className="side-section-label">Times</div>
      <div className="team-filter-list">
        {teams.map((t) => {
          const on = activeTeamIds === null || activeTeamIds.includes(t.id);
          const c = allMode ? clientById(t.client_id) : null;
          return (
            <button key={t.id} className={`team-filter-item${on ? '' : ' off'}`} onClick={() => toggleTeam(t.id)}>
              <span className="team-dot" style={{ background: `var(--team-${(t.slot % 8) + 1})` }} />
              <span className="tname">{t.name}{c && <span className="tname-sub"> · {c.name}</span>}</span>
              <span className="tcount mono">{activeCounts[t.id] || 0}</span>
            </button>
          );
        })}
        {teams.length === 0 && <div className="empty-mini" style={{ padding: '6px 10px' }}>Nenhum time ainda.</div>}
      </div>

      {categories.length > 0 && (
        <>
          <div className="side-section-label">Categorias</div>
          <div className="team-filter-list">
            {categories.map((c) => {
              const on = activeCategoryIds === null || activeCategoryIds.includes(c.id);
              return (
                <button key={c.id} className={`team-filter-item${on ? '' : ' off'}`} onClick={() => toggleCategory(c.id)}>
                  <span className="team-dot" style={{ background: categoryColorVar(c) }} />
                  <span className="tname">{c.name}</span>
                  <span className="tcount mono">{categoryCounts[c.id] || 0}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="side-section-label">Responsável</div>
      <div className="team-filter-list">
        {assignableProfiles.map((p) => {
          const on = activeAssigneeIds === null || activeAssigneeIds.includes(p.id);
          return (
            <button key={p.id} className={`team-filter-item${on ? '' : ' off'}`} onClick={() => toggleAssignee(p.id)}>
              <span className="avatar" style={{ width: 18, height: 18, fontSize: 8.5, background: personColorVar(p.id, p.name), color: '#fff' }}>{initials(p.name)}</span>
              <span className="tname">{p.name}</span>
              <span className="tcount mono">{assigneeCounts[p.id] || 0}</span>
            </button>
          );
        })}
        {assignableProfiles.length === 0 && <div className="empty-mini" style={{ padding: '6px 10px' }}>Ninguém ainda.</div>}
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
