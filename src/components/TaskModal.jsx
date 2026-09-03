import { useEffect, useState } from 'react';
import { STAGES, fmtDateLong, fmtBytes, MAX_ATTACHMENT_BYTES, personColorVar, categoryColorVar } from '../lib/format.js';
import { useData } from '../context/DataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function TaskModal({ task, onClose }) {
  const {
    clients, teams, assignableProfiles, selectedClientId, categories,
    createTask, updateTask, deleteTask, canWrite,
    listAttachments, uploadAttachment, deleteAttachment, downloadAttachment,
  } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const editing = Boolean(task?.id);
  const readOnly = !canWrite;
  const isSolicitacao = task?.stage === 'solicitado';
  const allMode = selectedClientId === 'ALL';
  // viewer só pode anexar na própria solicitação, enquanto ainda não foi triada
  const canAttach = !readOnly || isSolicitacao;

  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [clientId, setClientId] = useState(task?.client_id || '');
  const [teamId, setTeamId] = useState(task?.team_id || '');
  const [categoryId, setCategoryId] = useState(task?.category_id || '');
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id || '');
  const [dueDate, setDueDate] = useState(task?.due_date || '');
  const [stage, setStage] = useState(task?.stage || 'todo');
  const [priority, setPriority] = useState(task?.priority || 'normal');
  const [saving, setSaving] = useState(false);

  const [attachments, setAttachments] = useState([]);
  const [attLoading, setAttLoading] = useState(editing);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploadingNow, setUploadingNow] = useState(false);

  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    listAttachments(task.id).then(({ data }) => { if (!cancelled) { setAttachments(data); setAttLoading(false); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, task?.id]);

  function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const tooBig = files.filter((f) => f.size > MAX_ATTACHMENT_BYTES);
    const ok = files.filter((f) => f.size <= MAX_ATTACHMENT_BYTES);
    if (tooBig.length) {
      toast(`Arquivo${tooBig.length > 1 ? 's' : ''} muito grande (máx. 15MB): ${tooBig.map((f) => f.name).join(', ')}`);
    }
    if (!ok.length) return;
    if (editing) uploadNow(ok);
    else setPendingFiles((prev) => [...prev, ...ok]);
  }

  async function uploadNow(files) {
    setUploadingNow(true);
    let failCount = 0;
    for (const f of files) {
      const { data, error } = await uploadAttachment(task.client_id, task.id, f);
      if (error) failCount++;
      else setAttachments((prev) => [...prev, data]);
    }
    setUploadingNow(false);
    if (failCount) toast(`${failCount} anexo${failCount > 1 ? 's' : ''} não subiu${failCount > 1 ? 'ram' : ''}.`);
  }

  function removePendingFile(idx) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleRemoveAttachment(att) {
    const { error } = await deleteAttachment(att);
    if (error) { toast('Não foi possível remover: ' + error.message); return; }
    setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    toast('Anexo removido.');
  }

  async function handleDownload(att) {
    const { error } = await downloadAttachment(att);
    if (error) toast('Não foi possível baixar: ' + error.message);
  }

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
      category_id: categoryId || null,
      assignee_id: assigneeId || null,
      due_date: dueDate || null,
      stage,
      priority,
      ...(!editing && allMode ? { client_id: clientId } : {}),
    };
    const result = editing ? await updateTask(task.id, fields) : await createTask(fields);
    if (result.error) {
      setSaving(false);
      toast('Não foi possível salvar: ' + result.error.message);
      return;
    }
    if (!editing && pendingFiles.length) {
      const newTaskId = result.data?.id;
      const newClientId = allMode ? clientId : selectedClientId;
      if (newTaskId) {
        let failCount = 0;
        for (const f of pendingFiles) {
          const { error: upErr } = await uploadAttachment(newClientId, newTaskId, f);
          if (upErr) failCount++;
        }
        if (failCount) toast(`Demanda criada, mas ${failCount} anexo${failCount > 1 ? 's' : ''} não subiu${failCount > 1 ? 'ram' : ''}.`);
      }
    }
    setSaving(false);
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
          category_id: snapshot.category_id,
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                {assigneeId && <span className="team-dot" style={{ background: personColorVar(assigneeId, assignableProfiles.find((p) => p.id === assigneeId)?.name), flex: '0 0 auto' }} />}
                <select id="f-assignee" value={assigneeId} disabled={readOnly} onChange={(e) => setAssigneeId(e.target.value)}>
                  <option value="">Sem responsável</option>
                  {assignableProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="field">
            <label htmlFor="f-category">Categoria</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {categoryId && <span className="team-dot" style={{ background: categoryColorVar(categories.find((c) => c.id === categoryId)), flex: '0 0 auto' }} />}
              <select id="f-category" value={categoryId} disabled={readOnly} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sem categoria</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
          <div className="field">
            <label>Anexos</label>
            <div className="attachment-list">
              {editing && attLoading && <div className="empty-mini">Carregando anexos…</div>}
              {editing && !attLoading && attachments.map((att) => (
                <div className="attachment-item" key={att.id}>
                  <span className="attachment-name" onClick={() => handleDownload(att)}>{att.file_name}</span>
                  <span className="attachment-size">{fmtBytes(att.size_bytes)}</span>
                  {(!readOnly || att.uploaded_by === user?.id) && (
                    <button type="button" className="attachment-remove" onClick={() => handleRemoveAttachment(att)} aria-label="Remover anexo">&times;</button>
                  )}
                </div>
              ))}
              {!editing && pendingFiles.map((f, i) => (
                <div className="attachment-item" key={i}>
                  <span className="attachment-name">{f.name}</span>
                  <span className="attachment-size">{fmtBytes(f.size)}</span>
                  <button type="button" className="attachment-remove" onClick={() => removePendingFile(i)} aria-label="Remover anexo">&times;</button>
                </div>
              ))}
              {editing && !attLoading && attachments.length === 0 && <div className="empty-mini">Nenhum anexo ainda.</div>}
              {!editing && pendingFiles.length === 0 && <div className="empty-mini">Nenhum anexo ainda.</div>}
            </div>
            {canAttach && (
              <label className={`btn btn-ghost attachment-add-btn${uploadingNow ? ' disabled' : ''}`}>
                {uploadingNow ? 'Enviando…' : '+ Anexar arquivo'}
                <input type="file" multiple disabled={uploadingNow} onChange={handleFilesSelected} style={{ display: 'none' }} />
              </label>
            )}
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
