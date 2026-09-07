import { useMemo } from 'react';
import { useData } from '../context/DataContext.jsx';
import { STAGES, teamColorVar, daysDiff, todayStr, relDays, fmtDateLong } from '../lib/format.js';

export default function OverviewView() {
  const { tasks, teams } = useData();
  const today = todayStr();

  const workingTasks = useMemo(() => tasks.filter((t) => t.stage !== 'solicitado'), [tasks]);

  const stats = useMemo(() => {
    const active = workingTasks.filter((t) => t.stage !== 'done');
    const done = workingTasks.filter((t) => t.stage === 'done');
    const overdue = active.filter((t) => t.due_date && t.due_date < today);
    const soon = active.filter((t) => t.due_date && t.due_date >= today && daysDiff(t.due_date, today) <= 7);
    const last7 = done.filter((t) => t.completed_at && daysDiff(today, t.completed_at.slice(0, 10)) <= 7);
    const progressPct = workingTasks.length ? Math.round((done.length / workingTasks.length) * 100) : 0;
    return { active, done, overdue, soon, last7, progressPct };
  }, [workingTasks, today]);

  const teamRows = useMemo(() => {
    return teams.map((t) => {
      const tt = tasks.filter((x) => x.team_id === t.id);
      const byStage = {};
      STAGES.forEach((s) => { byStage[s.id] = tt.filter((x) => x.stage === s.id).length; });
      const tOverdue = tt.filter((x) => x.stage !== 'done' && x.due_date && x.due_date < today).length;
      const total = tt.length || 1;
      const pct = tt.length ? Math.round((byStage.done / tt.length) * 100) : 0;
      return { team: t, tt, byStage, tOverdue, total, pct };
    });
  }, [teams, tasks, today]);

  const deadlines = useMemo(() => {
    return [...stats.overdue, ...stats.soon]
      .sort((a, b) => (a.due_date < b.due_date ? -1 : 1))
      .slice(0, 10);
  }, [stats]);

  const history = useMemo(() => {
    return stats.done
      .filter((t) => t.completed_at)
      .sort((a, b) => (a.completed_at < b.completed_at ? 1 : -1))
      .slice(0, 12);
  }, [stats]);

  const teamById = (id) => teams.find((t) => t.id === id);

  return (
    <>
      <div className="stat-grid">
        <StatTile
          label="Demandas ativas"
          value={stats.active.length}
          sub={stats.overdue.length ? `${stats.overdue.length} atrasada${stats.overdue.length === 1 ? '' : 's'}` : 'tudo em dia'}
        />
        <StatTile label="Atrasadas" value={stats.overdue.length} tone={stats.overdue.length ? 'crit' : null} sub="prazo já vencido" />
        <StatTile label="Concluídas (7 dias)" value={stats.last7.length} tone={stats.last7.length ? 'good' : null} sub="últimos 7 dias" />
        <StatTile label="Progresso geral" value={stats.progressPct + '%'} sub={`${stats.done.length} de ${workingTasks.length} concluídas`} />
      </div>

      <div className="panel-grid">
        <div>
          <div className="panel-card">
            <h2>Status por time</h2>
            {teamRows.length === 0 && <div className="empty-mini">Nenhum time cadastrado ainda.</div>}
            {teamRows.map(({ team, tt, byStage, tOverdue, total, pct }) => (
              <div className="team-row" key={team.id}>
                <div className="team-row-head">
                  <span className="team-dot" style={{ background: teamColorVar(team) }} />
                  <span className="tname">{team.name}</span>
                  <span className="pct mono">{pct}%</span>
                </div>
                <div className="stagebar">
                  {STAGES.map((s) => {
                    const n = byStage[s.id];
                    if (!n) return null;
                    return <span key={s.id} className={`s-${s.id}`} style={{ width: Math.round((n / total) * 100) + '%' }} title={String(n)} />;
                  })}
                </div>
                <div className="team-row-foot">
                  <span>{tt.length} demanda{tt.length === 1 ? '' : 's'}</span>
                  {tOverdue > 0 && <span className="crit">{tOverdue} atrasada{tOverdue === 1 ? '' : 's'}</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="panel-card">
            <h2>Histórico de entregas</h2>
            {history.length === 0 && <div className="empty-mini">Nenhuma entrega registrada ainda.</div>}
            {history.map((t) => {
              const team = teamById(t.team_id);
              return (
                <div className="history-item" key={t.id}>
                  <span className="dot" style={{ background: 'var(--good)' }} />
                  <span className="t">{t.title}{team && <span style={{ color: 'var(--text-muted)' }}> · {team.name}</span>}</span>
                  <span className="when">{fmtDateLong(t.completed_at)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="panel-card">
            <h2>Prazos e atrasos</h2>
            {deadlines.length === 0 && <div className="empty-mini">Nenhum prazo próximo ou atrasado.</div>}
            {deadlines.map((t) => {
              const d = daysDiff(t.due_date, today);
              const cls = d < 0 ? 'crit' : d <= 3 ? 'warn' : '';
              const team = teamById(t.team_id);
              return (
                <div className="deadline-item" key={t.id}>
                  <span className="dot" style={{ background: teamColorVar(team) }} />
                  <span className="t">{t.title}</span>
                  <span className={`when ${cls}`}>{d < 0 ? `atrasada · ${-d}d` : relDays(t.due_date)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function StatTile({ label, value, tone, sub }) {
  return (
    <div className="stat-tile">
      <div className="label">{label}</div>
      <div className={`value tnum${tone ? ' ' + tone : ''}`}>{value}</div>
      <div className="sub">{sub}</div>
    </div>
  );
}
