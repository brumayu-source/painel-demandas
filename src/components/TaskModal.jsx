import { useState } from 'react';
import { STAGES, fmtDateLong } from '../lib/format.js';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function TaskModal({ task, onClose }) {
  const { clients, teams, assignableProfiles, selectedClientId, createTask, updateTask, deleteTask, canWrite } = useData();
  const toast = useToast();
  const editing = Boolean(task?.id);
  const readOnly = !canWrite;
  const isSolicitacao = task?.stage === 'solicitado';
  const allMode = selectedClientId === 'ALL';

  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [clientId, setClientId] = useState(task?.client_id || '');
  const [teamId, setTeamId] = useState(task?.team_id || '');
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id || '');
  const [dueDate, setDueDate] = useState(task?.due_date || '');
  const [stage, setStage] = useState(task?.stage || 'todo');
  const [priority, setPriority] = useState(task?.priority || 'normal');
  const [saving, setSaving] = useState(false);

  // qual cliente vale pra filtrar o dropdown de Time: o da própria tarefa
  // (fixo, ao editar) ou o escolhido acima (ao criar em "Todos os clientes")
  const effectiveClientId = editing ? task.client_id : (allMode ? clientId : selectedClientId);
  const teamsForClient = teams.filter((t) => t.client_id === effectiveClientId);
  const clientName = clients.find((c) => c.id === task?.client_id)?.name;

  async function handleSave() {
    if (!title.trim()) { toast('Dê um título para a demanda.'); return; }
    if (!editing && allMode && !clientId) { toast('Selecione o cliente dessa demanda.'); return; }
    setSaving(true);
    const fields = {
      title: title.trim(),
      description: description.trim(),
      team_id: teamId || null,
      assignee_id: assigneeId || null,
      due_date: dueDate || null,
      stage,
      priority,
      ...(!editing && allMode ? { client_id: clientId } : {}),
    };
    const { error } = editing ? await updateTask(task.id, fields) : await createTask(fields);
    setSaving(false);
    if (error) { toast('Não foi possível salvar: ' + error.message); return; }
    onClose();
  }

  async function handleDelete() {
    const snapshot = task;
    onClose();
    const { error } = await deleteTask(task.id);
    if (error) { toast('Não foi possível excluir: ' + error.message); return; }
    toast('Demanda excluída.', {
      actionLabel: 'Desfazer',
      onAction: async () => {
        await createTask({
          title: snapshot.title,
          description: snapshot.description,
          client_id: snapshot.client_id,
          team_id: snapshot.team_id,
          assignee_id: snapshot.assignee_id,
          due_date: snapshot.due_date,
          stage: snapshot.stage,
          priority: snapshot.priority,
        });
      },
    });
  }

  async function handleArchiveToggle() {
    const next = !task.archived;
    const { error } = await updateTask(task.id, { archived: next });
    if (error) { toast('Não foi possível ' + (next ? 'arquivar' : 'desarquivar') + ': ' + error.message); return; }
    toast(next ? 'Demanda arquivada.' : 'Demanda desarquivada.');
    onClose();
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <h2>{isSolicitacao ? 'Triar solicitação' : editing ? (readOnly ? 'Demanda' : 'Editar demanda') : 'Nova demanda'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">&times;</button>
        </div>
        <div className="modal-body">
          {task?.archived && (
            <div className="callout-solicitacao" style={{ background: 'var(--surface-2)' }}>
              <strong style={{ color: 'var(--text-muted)' }}>Arquivada</strong>
              <p className="hint" style={{ marginTop: 0 }}>Essa demanda está arquivada — não aparece no Quadro/Lista. Desarquive pra voltar a mexer nela normalmente.</p>
            </div>
          )}
          {isSolicitacao && (task.purpose || task.requested_due_date) && (
            <div className="callout-solicitacao">
              <strong>Pedido do cliente</strong>
              {task.purpose && <p><strong>Propósito:</strong> {task.purpose}</p>}
              {task.requested_due_date && <p><strong>Prazo sugerido:</strong> {fmtDateLong(task.requested_due_date)}</p>}
              <p className="hint">Preencha time, responsável, prioridade e prazo abaixo e mude o status pra "A Fazer" pra aprovar.</p>
            </div>
          )}
          {editing && allMode && clientName && (
            <div className="field">
              <label>Cliente</label>
              <div style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>{clientName}</div>
            </div>
          )}
          {!editing && allMode && (
            <div className="field">
              <label htmlFor="f-client">Cliente</label>
              <select id="f-client" value={clientId} disabled={readOnly}
                onChange={(e) => { setClientId(e.target.value); setTeamId(''); }}>
                <option value="">Selecione o cliente…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="field">
            <label htmlFor="f-title">Título</label>
            <input id="f-title" type="text" value={title} disabled={readOnly}
              placeholder="Ex.: Roteiro de carrossel — agosto" onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="f-desc">Descrição</label>
            <textarea id="f-desc" value={description} disabled={readOnly}
              placeholder="Detalhes, contexto, links…" onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="f-team">Time</label>
              <select id="f-team" value={teamId} disabled={readOnly || (allMode && !editing && !clientId)} onChange={(e) => setTeamId(e.target.value)}>
                <option value="">Sem time</option>
                {teamsForClient.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-assignee">Responsável</label>
              <select id="f-assignee" value={assigneeId} disabled={readOnly} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Sem responsável</option>
                {assignableProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Status</label>
            <div className="seg-group">
              {STAGES.map((s) => (
                <SegButton key={s.id} active={stage === s.id} disabled={readOnly} onClick={() => setStage(s.id)}>
                  {s.label}
                </SegButton>
              ))}
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Prioridade</label>
              <div className="seg-group">
                {[['baixa', 'Baixa'], ['normal', 'Normal'], ['alta', 'Alta']].map(([id, label]) => (
                  <SegButton key={id} active={priority === id} disabled={readOnly} onClick={() => setPriority(id)}>
                    {label}
                  </SegButton>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="f-due">Prazo</label>
              <input id="f-due" type="date" value={dueDate} disabled={readOnly} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="modal-actions">
            {editing && !readOnly ? (
              <button className="btn btn-danger" onClick={handleDelete}>Excluir</button>
            ) : <span />}
            <div style={{ display: 'flex', gap: 8 }}>
              {editing && !readOnly && (task.stage === 'done' || task.archived) && (
                <button className="btn btn-ghost" onClick={handleArchiveToggle}>
                  {task.archived ? 'Desarquivar' : 'Arquivar'}
                </button>
              )}
              <button className="btn btn-ghost" onClick={onClose}>{readOnly ? 'Fechar' : 'Cancelar'}</button>
              {!readOnly && (
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {editing ? 'Salvar' : 'Criar demanda'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SegButton({ active, disabled, onClick, children }) {
  if (disabled) return <span className={`seg-btn${active ? ' on' : ''}`} style={{ cursor: 'default' }}>{children}</span>;
  return (
    <button type="button" className={`seg-btn${active ? ' on' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}
