import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from './AuthContext.jsx';

const DataContext = createContext(null);
const SELECTED_CLIENT_KEY = 'pd_selected_client_id';

export function DataProvider({ children }) {
  const { user, isEditorOrAdmin } = useAuth();

  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [selectedClientId, setSelectedClientIdState] = useState(
    () => localStorage.getItem(SELECTED_CLIENT_KEY) || null
  );
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [assignableProfiles, setAssignableProfiles] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  const setSelectedClientId = useCallback((id) => {
    setSelectedClientIdState(id);
    if (id) localStorage.setItem(SELECTED_CLIENT_KEY, id);
    else localStorage.removeItem(SELECTED_CLIENT_KEY);
  }, []);

  // ---------- clients ----------
  const reloadClients = useCallback(async () => {
    const { data, error } = await supabase.from('clients').select('*').order('name');
    if (!error) setClients(data || []);
    return { data, error };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setClientsLoading(true);
    reloadClients().then(() => { if (!cancelled) setClientsLoading(false); });

    const channel = supabase
      .channel('clients-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => reloadClients())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user, reloadClients]);

  // pick a default selected client once the list loads ('ALL' — visão de
  // todos os clientes — continua válido mesmo não estando na lista)
  useEffect(() => {
    if (clientsLoading || !clients.length) return;
    const stillValid = selectedClientId === 'ALL' || clients.some((c) => c.id === selectedClientId);
    if (!stillValid) setSelectedClientId(clients[0].id);
  }, [clients, clientsLoading, selectedClientId, setSelectedClientId]);

  // ---------- teams ----------
  // clientId === 'ALL' → sem filtro de cliente (a RLS já limita aos clientes
  // que a pessoa pode ver; junta times de todos eles)
  const reloadTeams = useCallback(async (clientId) => {
    if (!clientId) { setTeams([]); return; }
    let q = supabase.from('teams').select('*').order('slot');
    if (clientId !== 'ALL') q = q.eq('client_id', clientId);
    const { data, error } = await q;
    if (!error) setTeams(data || []);
  }, []);

  useEffect(() => {
    if (!selectedClientId) return;
    reloadTeams(selectedClientId);
    const filter = selectedClientId === 'ALL' ? undefined : `client_id=eq.${selectedClientId}`;
    const channel = supabase
      .channel('teams-changes-' + selectedClientId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', ...(filter ? { filter } : {}) },
        () => reloadTeams(selectedClientId)
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [selectedClientId, reloadTeams]);

  // ---------- tasks ----------
  const reloadTasks = useCallback(async (clientId) => {
    if (!clientId) { setTasks([]); return; }
    let q = supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (clientId !== 'ALL') q = q.eq('client_id', clientId);
    const { data, error } = await q;
    if (!error) setTasks(data || []);
  }, []);

  useEffect(() => {
    if (!selectedClientId) { setTasksLoading(false); return; }
    let cancelled = false;
    setTasksLoading(true);
    reloadTasks(selectedClientId).then(() => { if (!cancelled) setTasksLoading(false); });

    const filter = selectedClientId === 'ALL' ? undefined : `client_id=eq.${selectedClientId}`;
    const channel = supabase
      .channel('tasks-changes-' + selectedClientId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', ...(filter ? { filter } : {}) },
        () => reloadTasks(selectedClientId)
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [selectedClientId, reloadTasks]);

  // ---------- categorias (globais — mesma lista pra todos os clientes) ----------
  const reloadCategories = useCallback(async () => {
    const { data, error } = await supabase.from('categories').select('*').order('slot');
    if (!error) setCategories(data || []);
    return { data, error };
  }, []);

  useEffect(() => {
    if (!user) return;
    reloadCategories();
    const channel = supabase
      .channel('categories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => reloadCategories())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, reloadCategories]);

  const createCategory = useCallback(async (name) => {
    const slot = categories.length;
    const { error } = await supabase.from('categories').insert({ name, slot });
    if (!error) reloadCategories();
    return { error };
  }, [categories.length, reloadCategories]);

  const renameCategory = useCallback(async (id, name) => {
    const { error } = await supabase.from('categories').update({ name }).eq('id', id);
    if (!error) reloadCategories();
    return { error };
  }, [reloadCategories]);

  const removeCategory = useCallback(async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) reloadCategories();
    return { error };
  }, [reloadCategories]);

  // ---------- assignable profiles (admin + editor) ----------
  const reloadProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['admin', 'editor'])
      .order('name');
    if (!error) setAssignableProfiles(data || []);
  }, []);

  useEffect(() => {
    if (!user) return;
    reloadProfiles();
  }, [user, reloadProfiles]);

  // ---------- mutations ----------
  const createTask = useCallback(
    async (fields) => {
      if (!selectedClientId) return { error: new Error('Nenhum cliente selecionado') };
      // em "Todos os clientes" não dá pra assumir um client_id — quem chama
      // (TaskModal/RequestModal) precisa mandar fields.client_id explícito
      if (selectedClientId === 'ALL' && !fields.client_id) {
        return { error: new Error('Selecione um cliente para essa demanda') };
      }
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          client_id: selectedClientId === 'ALL' ? undefined : selectedClientId,
          created_by: user?.id ?? null,
          ...fields,
        })
        .select()
        .single();
      if (!error) reloadTasks(selectedClientId);
      return { data, error };
    },
    [selectedClientId, user, reloadTasks]
  );

  const updateTask = useCallback(
    async (id, fields) => {
      const { error } = await supabase.from('tasks').update(fields).eq('id', id);
      if (!error) reloadTasks(selectedClientId);
      return { error };
    },
    [selectedClientId, reloadTasks]
  );

  const deleteTask = useCallback(
    async (id) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (!error) reloadTasks(selectedClientId);
      return { error };
    },
    [selectedClientId, reloadTasks]
  );

  const createTeam = useCallback(
    async (name) => {
      if (!selectedClientId) return { error: new Error('Nenhum cliente selecionado') };
      const slot = teams.length;
      const { error } = await supabase.from('teams').insert({ client_id: selectedClientId, name, slot });
      if (!error) reloadTeams(selectedClientId);
      return { error };
    },
    [selectedClientId, teams.length, reloadTeams]
  );

  const renameTeam = useCallback(
    async (id, name) => {
      const { error } = await supabase.from('teams').update({ name }).eq('id', id);
      if (!error) reloadTeams(selectedClientId);
      return { error };
    },
    [selectedClientId, reloadTeams]
  );

  const removeTeam = useCallback(
    async (id) => {
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (!error) reloadTeams(selectedClientId);
      return { error };
    },
    [selectedClientId, reloadTeams]
  );

  const createClient = useCallback(async (name) => {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'cliente';
    const { data, error } = await supabase
      .from('clients')
      .insert({ name, slug: slug + '-' + Math.random().toString(36).slice(2, 6) })
      .select()
      .single();
    if (!error) { await reloadClients(); }
    return { data, error };
  }, [reloadClients]);

  const renameClient = useCallback(async (id, name) => {
    const { error } = await supabase.from('clients').update({ name }).eq('id', id);
    if (!error) reloadClients();
    return { error };
  }, [reloadClients]);

  const removeClient = useCallback(async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (!error) reloadClients();
    return { error };
  }, [reloadClients]);

  // ---------- anexos ----------
  const listAttachments = useCallback(async (taskId) => {
    const { data, error } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at');
    return { data: data || [], error };
  }, []);

  const uploadAttachment = useCallback(
    async (clientId, taskId, file) => {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
      const path = `${clientId}/${taskId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from('attachments').upload(path, file);
      if (upErr) return { error: upErr };
      const { data, error } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          client_id: clientId,
          file_name: file.name,
          storage_path: path,
          size_bytes: file.size,
          content_type: file.type,
          uploaded_by: user?.id ?? null,
        })
        .select()
        .single();
      return { data, error };
    },
    [user]
  );

  const deleteAttachment = useCallback(async (att) => {
    await supabase.storage.from('attachments').remove([att.storage_path]);
    const { error } = await supabase.from('task_attachments').delete().eq('id', att.id);
    return { error };
  }, []);

  const downloadAttachment = useCallback(async (att) => {
    const { data, error } = await supabase.storage.from('attachments').download(att.storage_path);
    if (error) return { error };
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = att.file_name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { error: null };
  }, []);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  const value = {
    clients,
    clientsLoading,
    selectedClient,
    selectedClientId,
    setSelectedClientId,
    teams,
    tasks,
    tasksLoading,
    assignableProfiles,
    canWrite: isEditorOrAdmin,
    createTask,
    updateTask,
    deleteTask,
    createTeam,
    renameTeam,
    removeTeam,
    createClient,
    renameClient,
    removeClient,
    reloadProfiles,
    listAttachments,
    uploadAttachment,
    deleteAttachment,
    downloadAttachment,
    categories,
    createCategory,
    renameCategory,
    removeCategory,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData precisa estar dentro de <DataProvider>');
  return ctx;
}
