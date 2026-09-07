import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { monthYearLabel, fmtDateLong, initials, personColorVar } from '../lib/format.js';
import TaskModal from '../components/TaskModal.jsx';

export default function ArchivedView() {
  const { tasks, teams, clients, assignableProfiles, selectedClientId } = useData();
  const allMode = selectedClientId === 'ALL';
  const [editing, setEditing] = useState(null);

  const teamById = (id) => teams.find((t) => t.id === id);
  const profileById = (id) => assignableProfiles.find((p) => p.id === id);
  const clientById = (id) => clients.find((c) => c.id === id);

  // mesmo cálculo do Painel: % de progresso considera tudo que não é
  // solicitação, arquivado ou não — arquivar uma demanda concluída não faz
  // o número cair, só tira ela do Quadro/Lista do dia a dia
  const workingTasks = useMemo(() => tasks.filter((t) => t.stage !== 'solicitado'), [tasks]);
  const doneCount = useMemo(() => workingTasks.filter((t) => t.stage === 'done').length, [workingTasks]);
  const progressPct = workingTasks.length ? Math.round((doneCount / workingTasks.length) * 100) : 0;

  const archived = useMemo(
    () => tasks
      .filter((t) => t.archived)
      .sort((a, b) => {
        const da = a.completed_at || a.updated_at || a.created_at;
        const db = b.completed_at || b.updated_at || b.created_at;
        return da < db ? 1 : -1;
      }),
    [tasks]
  );

  const groups = useMemo(() => {
    const out = [];
    archived.forEach((t) => {
      const label = monthYearLabel(t.completed_at || t.updated_at || t.created_at);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(t);
      else out.push({ label, items: [t] });
    });
    return out;
  }, [archived]);

  return (
    <div>
      <div className="banner">
        Demandas concluídas que você já arquivou saem do Quadro e da Lista, mas continuam contando no progresso
        geral abaixo — pra manter o histórico organizado sem perder o retrato real de quanto já foi entregue.
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginBottom: 22 }}>
        <StatTile label="Progresso geral" value={progressPct + '%'} sub={`${doneCount} de ${workingTasks.length} concluídas`} />
        <StatTile label="Concluídas (total)" value={doneCount} sub="incluindo arquivadas" />
        <StatTile label="Arquivadas" value={archived.length} sub="fora do dia a dia" />
      </div>

      {archived.length === 0 && (
        <div className="empty-state">
          <div className="big">🗄️</div>
          <div>Nenhuma demanda arquivada ainda.</div>
          <div style={{ fontSize: 12.5, marginTop: 6 }}>
            Abra uma demanda concluída no Quadro ou na Lista e clique em "Arquivar".
          </div>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.label} style={{ marginBottom: 22 }}>
          <div className="side-section-label" style={{ padding: '0 0 8px', color: 'var(--text-muted)' }}>
            {g.label} · {g.items.length} concluída{g.items.length === 1 ? '' : 's'}
          </div>
          <div className="request-list">
            {g.items.map((t) => {
              const team = teamById(t.team_id);
              const assignee = profileById(t.assignee_id);
              const client = allMode ? clientById(t.client_id) : null;
              return (
                <div key={t.id} className="request-card clickable" onClick={() => setEditing(t)}>
                  <div className="request-card-head">
                    <strong>{t.title}</strong>
                    <span className="status-badge done">Concluído</span>
                  </div>
                  <div className="card-meta" style={{ marginTop: 8 }}>
                    {client && <span className="client-pill">{client.name}</span>}
                    {team && (
                      <span className="team-tag">
                        <span className="team-dot" style={{ background: `var(--team-${(team.slot % 8) + 1})` }} />
                        {team.name}
                      </span>
                    )}
                    {assignee && (
                      <span className="avatar" title={assignee.name} style={{ background: personColorVar(assignee), color: '#fff' }}>
                        {initials(assignee.name)}
                      </span>
                    )}
                    {t.completed_at && <span className="request-due" style={{ margin: 0 }}>Concluída em {fmtDateLong(t.completed_at)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {editing && <TaskModal task={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function StatTile({ label, value, sub }) {
  return (
    <div className="stat-tile">
      <div className="label">{label}</div>
      <div className="value tnum">{value}</div>
      <div className="sub">{sub}</div>
    </div>
  );
}
