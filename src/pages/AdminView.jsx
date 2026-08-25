import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const TABS = [
  { id: 'users', label: 'Usuários' },
  { id: 'clients', label: 'Clientes' },
  { id: 'teams', label: 'Times' },
];

export default function AdminView() {
  const [tab, setTab] = useState('users');
  return (
    <div>
      <div className="admin-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`admin-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'users' && <UsersTab />}
      {tab === 'clients' && <ClientsTab />}
      {tab === 'teams' && <TeamsTab />}
    </div>
  );
}

function UsersTab() {
  const { clients } = useData();
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [profiles, setProfiles] = useState([]);
  const [profileClients, setProfileClients] = useState([]); // [{profile_id, client_id}]
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [{ data: p, error: e1 }, { data: pc, error: e2 }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('profile_clients').select('*'),
    ]);
    if (e1 || e2) toast('Não foi possível carregar usuários: ' + (e1 || e2).message);
    setProfiles(p || []);
    setProfileClients(pc || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { reload(); }, [reload]);

  async function setRole(profileId, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId);
    if (error) { toast('Não foi possível mudar o papel: ' + error.message); return; }
    reload();
  }

  async function toggleClient(profileId, clientId, assigned) {
    if (assigned) {
      const { error } = await supabase.from('profile_clients').delete().eq('profile_id', profileId).eq('client_id', clientId);
      if (error) { toast('Erro: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('profile_clients').insert({ profile_id: profileId, client_id: clientId });
      if (error) { toast('Erro: ' + error.message); return; }
    }
    reload();
  }

  if (loading) return <div className="empty-mini">Carregando…</div>;

  return (
    <div>
      <div className="banner">
        Para adicionar alguém novo: peça pra pessoa abrir o link do app e entrar com o e-mail dela — o
        cadastro é automático. Assim que ela fizer login pela primeira vez, o nome aparece aqui
        automaticamente (como "viewer", sem acesso a nenhum cliente ainda) — daí é só ajustar o papel e
        os clientes abaixo. (Alternativa: convidar direto pelo Supabase em Authentication → Users → Invite user.)
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Papel</th>
            <th>Clientes (se viewer)</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => {
            const assignedIds = profileClients.filter((pc) => pc.profile_id === p.id).map((pc) => pc.client_id);
            return (
              <tr key={p.id}>
                <td>{p.name}{p.id === currentUser?.id && <span style={{ color: 'var(--text-muted)' }}> (você)</span>}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{p.email}</td>
                <td>
                  <select className="role-select" value={p.role} onChange={(e) => setRole(p.id, e.target.value)}>
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </td>
                <td>
                  {p.role === 'viewer' ? (
                    <div className="client-chip-list">
                      {clients.map((c) => {
                        const on = assignedIds.includes(c.id);
                        return (
                          <button key={c.id} className={`client-chip${on ? ' on' : ''}`} onClick={() => toggleClient(p.id, c.id, on)}>
                            {c.name}
                          </button>
                        );
                      })}
                      {clients.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Nenhum cliente cadastrado</span>}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>vê todos (admin/editor)</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ClientsTab() {
  const { clients, createClient, renameClient, removeClient } = useData();
  const toast = useToast();
  const [newName, setNewName] = useState('');

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    const { error } = await createClient(name);
    if (error) { toast('Não foi possível criar: ' + error.message); return; }
    setNewName('');
  }

  return (
    <div className="settings-list" style={{ maxWidth: 480 }}>
      {clients.map((c) => (
        <div className="settings-row" key={c.id}>
          <input
            type="text"
            defaultValue={c.name}
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== c.name) renameClient(c.id, v); }}
          />
          <button onClick={() => removeClient(c.id)}>Remover</button>
        </div>
      ))}
      {clients.length === 0 && <div className="empty-mini">Nenhum cliente ainda.</div>}
      <div className="add-inline">
        <input type="text" placeholder="Nome do novo cliente" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn btn-ghost" onClick={handleAdd}>+ Adicionar</button>
      </div>
    </div>
  );
}

function TeamsTab() {
  const { selectedClient, teams, createTeam, renameTeam, removeTeam } = useData();
  const toast = useToast();
  const [newName, setNewName] = useState('');

  if (!selectedClient) return <div className="empty-mini">Selecione um cliente na barra lateral primeiro.</div>;

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    const { error } = await createTeam(name);
    if (error) { toast('Não foi possível criar: ' + error.message); return; }
    setNewName('');
  }

  return (
    <div className="settings-list" style={{ maxWidth: 480 }}>
      <p className="sub" style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 0 }}>
        Times de <strong>{selectedClient.name}</strong>
      </p>
      {teams.map((t) => (
        <div className="settings-row" key={t.id}>
          <input
            type="text"
            defaultValue={t.name}
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== t.name) renameTeam(t.id, v); }}
          />
          <button onClick={() => removeTeam(t.id)}>Remover</button>
        </div>
      ))}
      {teams.length === 0 && <div className="empty-mini">Nenhum time ainda.</div>}
      <div className="add-inline">
        <input type="text" placeholder="Nome do novo time" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn btn-ghost" onClick={handleAdd}>+ Adicionar</button>
      </div>
    </div>
  );
}
