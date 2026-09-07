import { useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { fmtBytes, MAX_ATTACHMENT_BYTES } from '../lib/format.js';

export default function RequestModal({ onClose }) {
  const { clients, categories, selectedClientId, createTask, uploadAttachment } = useData();
  const toast = useToast();
  const allMode = selectedClientId === 'ALL';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState('');
  const [requestedDueDate, setRequestedDueDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const tooBig = files.filter((f) => f.size > MAX_ATTACHMENT_BYTES);
    const ok = files.filter((f) => f.size <= MAX_ATTACHMENT_BYTES);
    if (tooBig.length) {
      toast(`Arquivo${tooBig.length > 1 ? 's' : ''} muito grande (máx. 15MB): ${tooBig.map((f) => f.name).join(', ')}`);
    }
    if (ok.length) setPendingFiles((prev) => [...prev, ...ok]);
  }

  function removePendingFile(idx) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!title.trim()) { toast('Dê um título pra sua solicitação.'); return; }
    if (allMode && !clientId) { toast('Selecione pra qual cliente é essa solicitação.'); return; }
    setSaving(true);
    const { data, error } = await createTask({
      title: title.trim(),
      description: description.trim(),
      purpose: purpose.trim(),
      requested_due_date: requestedDueDate || null,
      stage: 'solicitado',
      team_id: null,
      category_id: categoryId || null,
      assignee_id: null,
      priority: 'normal',
      due_date: null,
      ...(allMode ? { client_id: clientId } : {}),
    });
    if (error) {
      setSaving(false);
      toast('Não foi possível enviar: ' + error.message);
      return;
    }
    if (pendingFiles.length && data?.id) {
      const newClientId = allMode ? clientId : selectedClientId;
      let failCount = 0;
      for (const f of pendingFiles) {
        const { error: upErr } = await uploadAttachment(newClientId, data.id, f);
        if (upErr) failCount++;
      }
      if (failCount) toast(`Solicitação enviada, mas ${failCount} anexo${failCount > 1 ? 's' : ''} não subiu${failCount > 1 ? 'ram' : ''}.`);
    }
    setSaving(false);
    toast('Solicitação enviada!');
    onClose();
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <h2>Nova solicitação</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">&times;</button>
        </div>
        <div className="modal-body">
          {allMode && (
            <div className="field">
              <label htmlFor="r-client">Cliente</label>
              <select id="r-client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Selecione o cliente…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="field">
            <label htmlFor="r-title">Título</label>
            <input id="r-title" type="text" value={title}
              placeholder="Ex.: Post pro Dia do Cliente"
              onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label htmlFor="r-desc">Descrição</label>
            <textarea id="r-desc" value={description}
              placeholder="O que você precisa?"
              onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="r-purpose">Propósito</label>
            <textarea id="r-purpose" value={purpose}
              placeholder="Pra que serve isso? Qual o objetivo?"
              onChange={(e) => setPurpose(e.target.value)} style={{ minHeight: 46 }} />
          </div>
          <div className="field">
            <label htmlFor="r-due">Sugestão de prazo</label>
            <input id="r-due" type="date" value={requestedDueDate} onChange={(e) => setRequestedDueDate(e.target.value)} />
          </div>
          {categories.length > 0 && (
            <div className="field">
              <label htmlFor="r-category">Categoria</label>
              <select id="r-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sem categoria</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="field">
            <label>Anexos</label>
            <div className="attachment-list">
              {pendingFiles.map((f, i) => (
                <div className="attachment-item" key={i}>
                  <span className="attachment-name">{f.name}</span>
                  <span className="attachment-size">{fmtBytes(f.size)}</span>
                  <button type="button" className="attachment-remove" onClick={() => removePendingFile(i)} aria-label="Remover anexo">&times;</button>
                </div>
              ))}
              {pendingFiles.length === 0 && <div className="empty-mini">Nenhum anexo ainda.</div>}
            </div>
            <label className="btn btn-ghost attachment-add-btn">
              + Anexar arquivo
              <input type="file" multiple onChange={handleFilesSelected} style={{ display: 'none' }} />
            </label>
          </div>
          <div className="modal-actions">
            <span />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Enviando…' : 'Enviar solicitação'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
