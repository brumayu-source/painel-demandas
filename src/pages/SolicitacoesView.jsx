import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { fmtDateLong } from '../lib/format.js';
import RequestModal from '../components/RequestModal.jsx';
import TaskModal from '../components/TaskModal.jsx';

export default function SolicitacoesView() {
  const { isAdmin, isEditor } = useAuth();
  const { tasks, clients, selectedClient, selectedClientId } = useData();
  const canTriage = isAdmin || isEditor;
  const allMode = selectedClientId === 'ALL';
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const clientById = (id) => clients.find((c) => c.id === id);

  const solicitacoes = tasks
    .filter((t) => t.stage === 'solicitado')
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return (
    <div>
      <div className="banner">
        {canTriage
          ? 'Pedidos enviados pelo cliente, aguardando você definir time, prioridade e prazo. Clique num card pra triar.'
          : allMode
            ? 'Acompanhe aqui as solicitações enviadas em todos os clientes que você acessa.'
            : `Acompanhe aqui as solicitações enviadas pra ${selectedClient?.name || 'esse cliente'}.`}
      </div>

      <div style={{ marginBottom: 18 }}>
        <button className="btn btn-primary" onClick={() => setNewOpen(true)}>+ Nova solicitação</button>
      </div>

      {solicitacoes.length === 0 && (
        <div className="empty-state">
          <div className="big">📝</div>
          <div>Nenhuma solicitação {canTriage ? 'pendente' : 'enviada ainda'}.</div>
        </div>
      )}

      <div className="request-list">
        {solicitacoes.map((t) => (
          <div
            key={t.id}
            className={`request-card${canTriage ? ' clickable' : ''}`}
            onClick={() => canTriage && setEditing(t)}
          >
            <div className="request-card-head">
              <strong>{t.title}</strong>
              <span className="status-badge solicitado">Aguardando triagem</span>
            </div>
            {allMode && clientById(t.client_id) && <span className="client-pill">{clientById(t.client_id).name}</span>}
            {t.description && <p className="request-desc">{t.description}</p>}
            {t.purpose && <p className="request-purpose"><strong>Propósito:</strong> {t.purpose}</p>}
            {t.requested_due_date && (
              <p className="request-due">Prazo sugerido: {fmtDateLong(t.requested_due_date)}</p>
            )}
          </div>
        ))}
      </div>

      {newOpen && <RequestModal onClose={() => setNewOpen(false)} />}
      {editing && <TaskModal task={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
