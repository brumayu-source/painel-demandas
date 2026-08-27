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

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => chars[n % chars.length]).join('');
}

function UsersTab() {
  const { clients } = useData();
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [profiles, setProfiles] = useState([]);
  const [profileClients, setProfileClients] = useState([]); // [{profile_id, client_id}]
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: generatePassword() });
  const [createBusy, setCreateBusy] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null); // { email, password } — mostrado uma vez só

  const [resettingId, setResettingId] = useState(null);
  const [resetPwd, setResetPwd] = useState('');
  const [rowBusy, setRowBusy] = useState(null);

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

  async function handleCreate() {
    const name = newUser.name.trim();
    const email = newUser.email.trim();
    const password = newUser.password;
    if (!email || !password) { toast('Preencha e-mail e senha.'); return; }
    if (password.length < 6) { toast('A senha precisa ter pelo menos 6 caracteres.'); return; }
    setCreateBusy(true);
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'create', name, email, password },
    });
    setCreateBusy(false);
    if (error || data?.error) {
      toast('Não foi possível criar: ' + (data?.error || error.message));
      return;
    }
    setCreatedCreds({ email, password });
    setNewUser({ name: '', email: '', password: generatePassword() });
    setCreating(false);
    reload();
  }

  async function handleResetPassword(profileId) {
    if (resetPwd.length < 6) { toast('A senha precisa ter pelo menos 6 caracteres.'); return; }
    setRowBusy(profileId);
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'reset_password', userId: profileId, password: resetPwd },
    });
    setRowBusy(null);
    if (error || data?.error) {
      toast('Não foi possível redefinir: ' + (data?.error || error.message));
      return;
    }
    toast('Senha redefinida.');
    setResettingId(null);
    setResetPwd('');
  }

  async function handleDelete(profileId) {
    setRowBusy(profileId);
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'delete', userId: profileId },
    });
    setRowBusy(null);
    if (error || data?.error) {
      toast('Não foi possível remover: ' + (data?.error || error.message));
      return;
    }
    reload();
  }

  if (loading) return <div className="empty-mini">Carregando…</div>;

  return (
    <div>
      <div className="banner">
        Só administradores conseguem criar usuários. Clique em "+ Criar usuário" abaixo, defina uma senha
        (ou use a gerada automaticamente) e repasse o e-mail e a senha pra pessoa por fora do app (WhatsApp,
        por exemplo). A conta entra como "viewer", sem acesso a nenhum cliente ainda — ajuste o papel e os
        clientes na tabela depois de criada.
      </div>

      {createdCreds && (
        <div className="banner" style={{ borderColor: 'var(--accent)', color: 'var(--text-primary)' }}>
          Conta criada! Anote agora — a senha não aparece de novo depois de fechar isto:
          <br />
          <strong>{createdCreds.email}</strong> — senha: <strong>{createdCreds.password}</strong>
          <button className="btn btn-ghost" style={{ marginLeft: 10 }} onClick={() => setCreatedCreds(null)}>
            Ok, anotei
          </button>
        </div>
      )}

      {!creating ? (
        <button className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={() => setCreating(true)}>
          + Criar usuário
        </button>
      ) : (
        <div className="settings-list" style={{ maxWidth: 420, marginBottom: 20, gap: 12 }}>
          <div className="field">
            <label>Nome</label>
            <input
              type="text"
              placeholder="Nome da pessoa"
              value={newUser.name}
              onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>E-mail</label>
            <input
              type="email"
              placeholder="pessoa@empresa.com"
              value={newUser.email}
              onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Senha</label>
              <input
                type="text"
                value={newUser.password}
                onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
              />
            </div>
            <button
              className="btn btn-ghost"
              style={{ alignSelf: 'flex-end' }}
              onClick={() => setNewUser((u) => ({ ...u, password: generatePassword() }))}
            >
              Gerar
            </button>
          </div>
          <div className="add-inline" style={{ margin: 0 }}>
            <button className="btn btn-primary" disabled={createBusy} onClick={handleCreate}>
              {createBusy ? 'Criando…' : 'Criar usuário'}
            </button>
            <button className="btn btn-ghost" onClick={() => setCreating(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Papel</th>
            <th>Clientes (se viewer)</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => {
            const assignedIds = profileClients.filter((pc) => pc.profile_id === p.id).map((pc) => pc.client_id);
            return (
              <tr key={p.id}>
                <td data-label="Nome">{p.name}{p.id === currentUser?.id && <span style={{ color: 'var(--text-muted)' }}> (você)</span>}</td>
                <td data-label="E-mail" style={{ color: 'var(--text-secondary)' }}>{p.email}</td>
                <td data-label="Papel">
                  <select className="role-select" value={p.role} onChange={(e) => setRole(p.id, e.target.value)}>
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </td>
                <td data-label="Clientes (se viewer)">
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
                <td data-label="Ações">
                  {resettingId === p.id ? (
                    <div className="add-inline" style={{ margin: 0 }}>
                      <input
                        type="text"
                        placeholder="Nova senha"
                        value={resetPwd}
                        onChange={(e) => setResetPwd(e.target.value)}
                        style={{
                          width: 120, border: '1px solid var(--border-strong)', borderRadius: 8,
                          padding: '6px 8px', fontSize: 13, background: 'var(--surface)', color: 'var(--text-primary)',
                        }}
                      />
                      <button className="btn btn-ghost" disabled={rowBusy === p.id} onClick={() => handleResetPassword(p.id)}>
                        Salvar
                      </button>
                      <button className="btn btn-ghost" onClick={() => { setResettingId(null); setResetPwd(''); }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => { setResettingId(p.id); setResetPwd(generatePassword()); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}
                      >
                        Redefinir senha
                      </button>
                      {p.id !== currentUser?.id && (
                        <button
                          disabled={rowBusy === p.id}
                          onClick={() => handleDelete(p.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}
                        >
                          Remover
                        </button>
                      )}
                    </div>
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
