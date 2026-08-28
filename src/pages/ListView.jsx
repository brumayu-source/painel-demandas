import { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { STAGES, stageLabel, teamColorVar, fmtDateShort, todayStr } from '../lib/format.js';
import TaskModal from '../components/TaskModal.jsx';

export default function ListView({ activeTeamIds, activeAssigneeIds, activeClientIds, search, openNewSignal, onConsumeNewSignal }) {
  const { tasks, teams, clients, assignableProfiles, selectedClientId, canWrite } = useData();
  const [modalTask, setModalTask] = useState(undefined);
  const [sortCol, setSortCol] = useState('due');
  const [sortDir, setSortDir] = useState('asc');
  const allMode = selectedClientId === 'ALL';

  useEffect(() => {
    if (openNewSignal) {
      setModalTask(null);
      onConsumeNewSignal();
    }
  }, [openNewSignal, onConsumeNewSignal]);

  const teamById = (id) => teams.find((t) => t.id === id);
  const profileById = (id) => assignableProfiles.find((p) => p.id === id);
  const clientById = (id) => clients.find((c) => c.id === id);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (t.stage === 'solicitado') return false; // fica só na aba Solicitações, até ser triada
      if (t.archived) return false; // fica só na aba Arquivadas
      if (activeTeamIds !== null && t.team_id && !activeTeamIds.includes(t.team_id)) return false;
      if (activeAssigneeIds !== null && t.assignee_id && !activeAssigneeIds.includes(t.assignee_id)) return false;
      if (activeClientIds !== null && !activeClientIds.includes(t.client_id)) return false;
      if (q) {
        const hay = (t.title + ' ' + (t.description || '')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, activeTeamIds, activeAssigneeIds, activeClientIds, search]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const copy = [...visible];
    copy.sort((a, b) => {
      let va, vb;
      if (sortCol === 'title') { va = a.title.toLowerCase(); vb = b.title.toLowerCase(); }
      else if (sortCol === 'client') { va = clientById(a.client_id)?.name || ''; vb = clientById(b.client_id)?.name || ''; }
      else if (sortCol === 'team') { va = teamById(a.team_id)?.name || ''; vb = teamById(b.team_id)?.name || ''; }
      else if (sortCol === 'assignee') { va = profileById(a.assignee_id)?.name || ''; vb = profileById(b.assignee_id)?.name || ''; }
      else if (sortCol === 'stage') { va = STAGES.findIndex((s) => s.id === a.stage); vb = STAGES.findIndex((s) => s.id === b.stage); }
      else if (sortCol === 'priority') { const pr = { baixa: 0, normal: 1, alta: 2 }; va = pr[a.priority] ?? 1; vb = pr[b.priority] ?? 1; }
      else { va = a.due_date || '9999-99-99'; vb = b.due_date || '9999-99-99'; }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, sortCol, sortDir]);

  function toggleSort(col) {
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  const cols = [
    ['title', 'Tarefa'],
    ...(allMode ? [['client', 'Cliente']] : []),
    ['team', 'Time'], ['assignee', 'Responsável'],
    ['stage', 'Status'], ['due', 'Prazo'], ['priority', 'Prioridade'], ['', ''],
  ];

  if (!sorted.length) {
    return (
      <div className="empty-state">
        <div className="big">🗂️</div>
        <div>Nenhuma demanda encontrada.</div>
        {canWrite && (
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-primary" onClick={() => setModalTask(null)}>+ Nova demanda</button>
          </div>
        )}
        {modalTask !== undefined && <TaskModal task={modalTask} onClose={() => setModalTask(undefined)} />}
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="list-table">
        <thead>
          <tr>
            {cols.map(([id, label]) => (
              <th key={id || 'actions'} className={sortCol === id ? 'sorted' : ''} onClick={() => id && toggleSort(id)}>
                {label}{sortCol === id ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => {
            const team = teamById(t.team_id);
            const assignee = profileById(t.assignee_id);
            const client = allMode ? clientById(t.client_id) : null;
            const overdue = t.stage !== 'done' && t.due_date && t.due_date < todayStr();
            return (
              <tr key={t.id}>
                <td data-label="Tarefa">{t.title}</td>
                {allMode && <td data-label="Cliente">{client ? client.name : '—'}</td>}
                <td data-label="Time">
                  {team ? (
                    <span className="team-tag">
                      <span className="team-dot" style={{ background: teamColorVar(team) }} />
                      {team.name}
                    </span>
                  ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td data-label="Responsável">{assignee ? assignee.name : '—'}</td>
                <td data-label="Status"><span className={`status-badge ${t.stage}`}>{stageLabel(t.stage)}</span></td>
                <td data-label="Prazo" className="tnum" style={overdue ? { color: 'var(--critical)', fontWeight: 600 } : undefined}>
                  {t.due_date ? fmtDateShort(t.due_date) : '—'}
                </td>
                <td data-label="Prioridade">{t.priority === 'alta' ? 'Alta' : t.priority === 'baixa' ? 'Baixa' : 'Normal'}</td>
                <td data-label="" className="row-actions">
                  <button onClick={() => setModalTask(t)}>{canWrite ? 'Editar' : 'Ver'}</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {modalTask !== undefined && <TaskModal task={modalTask} onClose={() => setModalTask(undefined)} />}
    </div>
  );
}
