import { useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function RequestModal({ onClose }) {
  const { clients, selectedClientId, createTask } = useData();
  const toast = useToast();
  const allMode = selectedClientId === 'ALL';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState('');
  const [requestedDueDate, setRequestedDueDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) { toast('Dê um título pra sua solicitação.'); return; }
    if (allMode && !clientId) { toast('Selecione pra qual cliente é essa solicitação.'); return; }
    setSaving(true);
    const { error } = await createTask({
      title: title.trim(),
      description: description.trim(),
      purpose: purpose.trim(),
      requested_due_date: requestedDueDate || null,
      stage: 'solicitado',
      team_id: null,
      assignee_id: null,
      priority: 'normal',
      due_date: null,
      ...(allMode ? { client_id: clientId } : {}),
    });
    setSaving(false);
    if (error) { toast('Não foi possível enviar: ' + error.message); return; }
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
