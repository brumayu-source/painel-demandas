import { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { STAGES, stageColorVar, teamColorVar, categoryColorVar, personColorVar, daysDiff, todayStr, relDays, initials } from '../lib/format.js';
import { IconDots } from '../components/icons.jsx';
import TaskModal from '../components/TaskModal.jsx';

export default function BoardView({ activeTeamIds, activeAssigneeIds, activeClientIds, activeCategoryIds, search, openNewSignal, onConsumeNewSignal }) {
  const { tasks, teams, clients, categories, assignableProfiles, selectedClientId, updateTask, canWrite } = useData();
  const toast = useToast();
  const [modalTask, setModalTask] = useState(undefined); // undefined = closed, null = new, obj = edit
  const [openMenuId, setOpenMenuId] = useState(null);
  const [dragId, setDragId] = useState(null);
  const allMode = selectedClientId === 'ALL';

  useEffect(() => {
    if (openNewSignal) {
      setModalTask(null);
      onConsumeNewSignal();
    }
  }, [openNewSignal, onConsumeNewSignal]);

  const teamById = (id) => teams.find((t) => t.id === id);
  const categoryById = (id) => categories.find((c) => c.id === id);
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
      if (activeCategoryIds !== null && t.category_id && !activeCategoryIds.includes(t.category_id)) return false;
      if (q) {
        const hay = (t.title + ' ' + (t.description || '')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, activeTeamIds, activeAssigneeIds, activeClientIds, activeCategoryIds, search]);

  async function moveTask(id, stage) {
    setOpenMenuId(null);
    const { error } = await updateTask(id, { stage });
    if (error) toast('Não foi possível mover: ' + error.message);
  }

  return (
    <div className="board-cols">
      {STAGES.map((st) => {
        const items = visible.filter((t) => t.stage === st.id);
        return (
          <div
            key={st.id}
            className="board-col"
            onDragOver={(e) => { if (canWrite) e.preventDefault(); }}
            onDrop={(e) => {
              e.preventDefault();
              if (!canWrite || !dragId) return;
              moveTask(dragId, st.id);
              setDragId(null);
            }}
          >
            <div className="board-col-head">
              <span className="stage-dot" style={{ background: stageColorVar(st.id) }} />
              <h3>{st.label}</h3>
              <span className="n mono">{items.length}</span>
            </div>
            <div className="col-drop">
              {items.length === 0 && <div className="empty-col">Nenhuma demanda</div>}
              {items.map((t) => {
                const team = teamById(t.team_id);
                const category = categoryById(t.category_id);
                const assignee = profileById(t.assignee_id);
                const client = allMode ? clientById(t.client_id) : null;
                let due = null;
                if (t.stage !== 'done' && t.due_date) {
                  const d = daysDiff(t.due_date, todayStr());
                  const cls = d < 0 ? 'crit' : d <= 3 ? 'warn' : '';
                  due = <span className={`due-pill ${cls}`}>{d < 0 ? 'atrasada · ' : ''}{relDays(t.due_date)}</span>;
                }
                return (
                  <div
                    key={t.id}
                    className="card"
                    draggable={canWrite}
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={(e) => { if (!e.target.closest('[data-stop]')) setModalTask(t); }}
                  >
                    <div className="card-top">
                      <span className="card-team-bar" style={{ background: teamColorVar(team) }} />
                      <span className="card-title">{t.title}</span>
                      {canWrite && (
                        <button
                          className="card-menu-btn"
                          data-stop
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === t.id ? null : t.id); }}
                        >
                          <IconDots />
                        </button>
                      )}
                    </div>
                    {openMenuId === t.id && (
                      <div className="card-inline-menu" data-stop>
                        {STAGES.filter((s) => s.id !== t.stage).map((s) => (
                          <button key={s.id} style={{ color: 'var(--text-secondary)' }} onClick={() => moveTask(t.id, s.id)}>
                            → {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="card-meta">
                      {client && <span className="client-pill">{client.name}</span>}
                      {team && (
                        <span className="team-tag">
                          <span className="team-dot" style={{ background: teamColorVar(team) }} />
                          {team.name}
                        </span>
                      )}
                      {category && (
                        <span className="team-tag">
                          <span className="team-dot" style={{ background: categoryColorVar(category) }} />
                          {category.name}
                        </span>
                      )}
                      {t.priority === 'alta' && <span className="priority-flag">● alta</span>}
                      {assignee && (
                        <span className="avatar" title={assignee.name} style={{ background: personColorVar(assignee), color: '#fff' }}>
                          {initials(assignee.name)}
                        </span>
                      )}
                      {due}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {modalTask !== undefined && (
        <TaskModal task={modalTask} onClose={() => setModalTask(undefined)} />
      )}
    </div>
  );
}
