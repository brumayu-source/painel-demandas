import { useEffect, useState } from 'react';
import {
  STAGES, CONTENT_FORMATS, contentFormatLabel, contentStatusLabel, contentStatusColorVar,
  fmtDateLong, fmtBytes, MAX_ATTACHMENT_BYTES, personColorVar, categoryColorVar,
} from '../lib/format.js';
import { useData } from '../context/DataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { IconChevronLeft, IconChevronRight } from './icons.jsx';

export default function ContentModal({ task, onClose }) {
  const {
    clients, teams, assignableProfiles, selectedClientId, categories,
    createTask, updateTask, deleteTask, canWrite,
    listAttachments, uploadAttachment, deleteAttachment, getAttachmentUrl,
    listFeedback, submitContentReview,
  } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const editing = Boolean(task?.id);
  const readOnly = !canWrite;
  const allMode = selectedClientId === 'ALL';

  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [clientId, setClientId] = useState(task?.client_id || '');
  const [teamId, setTeamId] = useState(task?.team_id || '');
  const [categoryId, setCategoryId] = useState(task?.category_id || (categories.find((c) => c.name === 'Social Media')?.id || ''));
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id || '');
  const [dueDate, setDueDate] = useState(task?.due_date || '');
  const [stage, setStage] = useState(task?.stage || 'todo');
  const [priority, setPriority] = useState(task?.priority || 'normal');
  const [contentFormat, setContentFormat] = useState(task?.content_format || 'post');
  const [artCopy, setArtCopy] = useState(task?.art_copy || '');
  const [caption, setCaption] = useState(task?.caption || '');
  const [videoUrl, setVideoUrl] = useState(task?.video_url || '');
  const [saving, setSaving] = useState(false);

  const [attachments, setAttachments] = useState([]);
  const [attLoading, setAttLoading] = useState(editing);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploadingNow, setUploadingNow] = useState(false);

  const [feedback, setFeedback] = useState([]);
  const [showAdjustBox, setShowAdjustBox] = useState(false);
  const [adjustMessage, setAdjustMessage] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    listAttachments(task.id).then(({ data }) => { if (!cancelled) { setAttachments(data); setAttLoading(false); } });
    listFeedback(task.id).then(({ data }) => { if (!cancelled) setFeedback(data); });
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
    if (failCount) toast(`${failCount} arquivo${failCount > 1 ? 's' : ''} não subiu${failCount > 1 ? 'ram' : ''}.`);
  }

  function removePendingFile(idx) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleRemoveAttachment(att) {
    const { error } = await deleteAttachment(att);
    if (error) { toast('Não foi possível remover: ' + error.message); return; }
    setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    toast('Arte removida.');
  }

  const effectiveClientId = editing ? task.client_id : (allMode ? clientId : selectedClientId);
  const teamsForClient = teams.filter((t) => t.client_id === effectiveClientId);
  const clientName = clients.find((c) => c.id === task?.client_id)?.name;
  const imageAttachments = attachments.filter((a) => (a.content_type || '').startsWith('image/'));

  async function handleSave() {
    if (!title.trim()) { toast('Dê um título para o conteúdo.'); return; }
    if (!editing && allMode && !clientId) { toast('Selecione o cliente desse conteúdo.'); return; }
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
      content_format: contentFormat,
      art_copy: artCopy.trim(),
      caption: caption.trim(),
      video_url: contentFormat === 'video' ? (videoUrl.trim() || null) : null,
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
        if (failCount) toast(`Conteúdo criado, mas ${failCount} arquivo${failCount > 1 ? 's' : ''} não subiu${failCount > 1 ? 'ram' : ''}.`);
      }
    }
    setSaving(false);
    onClose();
  }

  async function handleDelete() {
    onClose();
    const { error } = await deleteTask(task.id);
    if (error) { toast('Não foi possível excluir: ' + error.message); return; }
    toast('Conteúdo excluído.');
  }

  async function handleArchiveToggle() {
    const next = !task.archived;
    const { error } = await updateTask(task.id, { archived: next });
    if (error) { toast('Não foi possível ' + (next ? 'arquivar' : 'desarquivar') + ': ' + error.message); return; }
    toast(next ? 'Conteúdo arquivado.' : 'Conteúdo desarquivado.');
    onClose();
  }

  async function handleApprove() {
    setReviewSaving(true);
    const { error } = await submitContentReview(task.id, 'approved');
    setReviewSaving(false);
    if (error) { toast('Não foi possível aprovar: ' + error.message); return; }
    toast('Conteúdo aprovado!');
    onClose();
  }

  async function handleRequestChanges() {
    if (!adjustMessage.trim()) { toast('Descreva o que precisa ajustar.'); return; }
    setReviewSaving(true);
    const { error } = await submitContentReview(task.id, 'changes_requested', adjustMessage.trim());
    setReviewSaving(false);
    if (error) { toast('Não foi possível enviar: ' + error.message); return; }
    toast('Pedido de ajuste enviado.');
    onClose();
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <h2>{editing ? (readOnly ? 'Conteúdo' : 'Editar conteúdo') : 'Novo conteúdo'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">&times;</button>
        </div>
        <div className="modal-body">
          {editing && !task.archived && (
            <span className="content-status-pill" style={{ background: contentStatusColorVar(stage) }}>
              {contentStatusLabel(stage)}
            </span>
          )}
          {task?.archived && (
            <div className="callout-solicitacao" style={{ background: 'var(--surface-2)' }}>
              <strong style={{ color: 'var(--text-muted)' }}>Arquivado</strong>
              <p className="hint" style={{ marginTop: 0 }}>Esse conteúdo está arquivado — não aparece na aba Conteúdo. Desarquive pra voltar a mexer nele normalmente.</p>
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
          {readOnly ? (
            <>
              <div className="field">
                <label>Título</label>
                <div style={{ fontSize: 14.5, color: 'var(--text-primary)', fontWeight: 600 }}>{title}</div>
              </div>
              <div className="field">
                <label>Tipo de conteúdo</label>
                <div style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>{contentFormatLabel(contentFormat)}</div>
              </div>

              {contentFormat === 'video' ? (
                videoUrl && (
                  <div className="field">
                    <label>Vídeo</label>
                    <a className="btn btn-ghost" style={{ display: 'inline-block' }} href={videoUrl} target="_blank" rel="noreferrer">
                      Abrir vídeo
                    </a>
                  </div>
                )
              ) : (
                <div className="field">
                  <label>Arte{contentFormat === 'carrossel' ? ' (carrossel)' : ''}</label>
                  {attLoading ? (
                    <div className="empty-mini">Carregando…</div>
                  ) : imageAttachments.length > 0 ? (
                    <ImageCarousel attachments={imageAttachments} getAttachmentUrl={getAttachmentUrl} />
                  ) : (
                    <div className="empty-mini">Nenhuma arte anexada ainda.</div>
                  )}
                </div>
              )}

              {artCopy && (
                <div className="field">
                  <label>Copy da arte</label>
                  <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{artCopy}</div>
                </div>
              )}
              {caption && (
                <div className="field">
                  <label>Legenda</label>
                  <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{caption}</div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="field">
                <label htmlFor="f-title">Título</label>
                <input id="f-title" type="text" value={title}
                  placeholder="Ex.: Reel de bastidores — outubro" onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="field">
                <label>Tipo de conteúdo</label>
                <div className="seg-group">
                  {CONTENT_FORMATS.map((f) => (
                    <SegButton key={f.id} active={contentFormat === f.id} onClick={() => setContentFormat(f.id)}>
                      {f.label}
                    </SegButton>
                  ))}
                </div>
              </div>

              {contentFormat === 'video' ? (
                <div className="field">
                  <label htmlFor="f-video">Link do vídeo (Drive)</label>
                  <input id="f-video" type="url" value={videoUrl}
                    placeholder="https://drive.google.com/…" onChange={(e) => setVideoUrl(e.target.value)} />
                  {videoUrl && (
                    <a className="btn btn-ghost" style={{ marginTop: 8, display: 'inline-block' }} href={videoUrl} target="_blank" rel="noreferrer">
                      Abrir vídeo
                    </a>
                  )}
                </div>
              ) : (
                <div className="field">
                  <label>Arte{contentFormat === 'carrossel' ? ' (carrossel)' : ''}</label>
                  {editing ? (
                    attLoading ? (
                      <div className="empty-mini">Carregando…</div>
                    ) : imageAttachments.length > 0 ? (
                      <ImageCarousel attachments={imageAttachments} getAttachmentUrl={getAttachmentUrl} />
                    ) : (
                      <div className="empty-mini">Nenhuma arte anexada ainda.</div>
                    )
                  ) : (
                    pendingFiles.length === 0 && <div className="empty-mini">Nenhuma arte anexada ainda.</div>
                  )}
                  <div className="attachment-list" style={{ marginTop: 10 }}>
                    {editing && attachments.map((att) => (
                      <div className="attachment-item" key={att.id}>
                        <span className="attachment-name">{att.file_name}</span>
                        <span className="attachment-size">{fmtBytes(att.size_bytes)}</span>
                        <button type="button" className="attachment-remove" onClick={() => handleRemoveAttachment(att)} aria-label="Remover arte">&times;</button>
                      </div>
                    ))}
                    {!editing && pendingFiles.map((f, i) => (
                      <div className="attachment-item" key={i}>
                        <span className="attachment-name">{f.name}</span>
                        <span className="attachment-size">{fmtBytes(f.size)}</span>
                        <button type="button" className="attachment-remove" onClick={() => removePendingFile(i)} aria-label="Remover arte">&times;</button>
                      </div>
                    ))}
                    <label className={`btn btn-ghost attachment-add-btn${uploadingNow ? ' disabled' : ''}`}>
                      {uploadingNow ? 'Enviando…' : '+ Adicionar arte'}
                      <input type="file" accept="image/*" multiple disabled={uploadingNow} onChange={handleFilesSelected} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              )}

              <div className="field">
                <label htmlFor="f-artcopy">Copy da arte</label>
                <textarea id="f-artcopy" value={artCopy}
                  placeholder="Texto que vai dentro da arte…" onChange={(e) => setArtCopy(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="f-caption">Legenda</label>
                <textarea id="f-caption" value={caption}
                  placeholder="Legenda do post…" onChange={(e) => setCaption(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="f-desc">Notas internas</label>
                <textarea id="f-desc" value={description}
                  placeholder="Contexto, links, observações…" onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="f-team">Time</label>
                  <select id="f-team" value={teamId} disabled={allMode && !editing && !clientId} onChange={(e) => setTeamId(e.target.value)}>
                    <option value="">Sem time</option>
                    {teamsForClient.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="f-assignee">Responsável</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {assigneeId && <span className="team-dot" style={{ background: personColorVar(assignableProfiles.find((p) => p.id === assigneeId)), flex: '0 0 auto' }} />}
                    <select id="f-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
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
                  <select id="f-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">Sem categoria</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Status</label>
                <div className="seg-group">
                  {STAGES.map((s) => (
                    <SegButton key={s.id} active={stage === s.id} onClick={() => setStage(s.id)}>
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
                      <SegButton key={id} active={priority === id} onClick={() => setPriority(id)}>
                        {label}
                      </SegButton>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="f-due">Prazo</label>
                  <input id="f-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
            </>
          )}

          {editing && feedback.length > 0 && (
            <div className="field">
              <label>Histórico de aprovação</label>
              <div className="feedback-list">
                {feedback.map((f) => (
                  <div className={`feedback-item ${f.action}`} key={f.id}>
                    <div className="feedback-head">
                      <strong>{f.author_name || 'Alguém'}</strong>
                      <span>{f.action === 'approved' ? 'aprovou' : 'pediu ajuste'} · {fmtDateLong(f.created_at)}</span>
                    </div>
                    {f.message && <p>{f.message}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {editing && !task.archived && task.stage === 'aprovacao' && (
            <div className="field approval-actions">
              <label>Aprovação do cliente</label>
              {!showAdjustBox ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={handleApprove} disabled={reviewSaving}>Aprovar</button>
                  <button className="btn btn-ghost" onClick={() => setShowAdjustBox(true)} disabled={reviewSaving}>Pedir ajuste</button>
                </div>
              ) : (
                <div>
                  <textarea
                    value={adjustMessage}
                    onChange={(e) => setAdjustMessage(e.target.value)}
                    placeholder="O que precisa ajustar?"
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn btn-ghost" onClick={() => { setShowAdjustBox(false); setAdjustMessage(''); }} disabled={reviewSaving}>
                      Cancelar
                    </button>
                    <button className="btn btn-primary" onClick={handleRequestChanges} disabled={reviewSaving || !adjustMessage.trim()}>
                      Enviar pedido de ajuste
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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
                  {editing ? 'Salvar' : 'Criar conteúdo'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageCarousel({ attachments, getAttachmentUrl }) {
  const [index, setIndex] = useState(0);
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const safeIndex = Math.min(index, attachments.length - 1);
  const att = attachments[safeIndex];

  useEffect(() => {
    let cancelled = false;
    if (!att) return;
    setLoading(true);
    getAttachmentUrl(att).then((u) => { if (!cancelled) { setUrl(u); setLoading(false); } });
    return () => { cancelled = true; };
  }, [att, getAttachmentUrl]);

  if (!attachments.length) return null;

  return (
    <div className="image-carousel">
      <div className="image-carousel-viewport">
        {loading && <div className="empty-mini">Carregando…</div>}
        {!loading && url && <img src={url} alt={att?.file_name || ''} />}
        {attachments.length > 1 && (
          <>
            <button type="button" className="carousel-arrow left"
              onClick={() => setIndex((i) => (i - 1 + attachments.length) % attachments.length)} aria-label="Imagem anterior">
              <IconChevronLeft />
            </button>
            <button type="button" className="carousel-arrow right"
              onClick={() => setIndex((i) => (i + 1) % attachments.length)} aria-label="Próxima imagem">
              <IconChevronRight />
            </button>
          </>
        )}
      </div>
      {attachments.length > 1 && (
        <div className="carousel-dots">
          {attachments.map((a, i) => (
            <button type="button" key={a.id} className={`carousel-dot${i === safeIndex ? ' on' : ''}`}
              onClick={() => setIndex(i)} aria-label={`Ver imagem ${i + 1}`} />
          ))}
        </div>
      )}
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
