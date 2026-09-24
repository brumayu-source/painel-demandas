import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useData } from '../context/DataContext.jsx';
import { contentFormatLabel, stageLabel, stageColorVar, personColorVar, initials } from '../lib/format.js';
import { IconPlay, IconContent } from '../components/icons.jsx';
import ContentModal from '../components/ContentModal.jsx';

export default function ConteudoView({ activeTeamIds, activeAssigneeIds, activeClientIds, activeCategoryIds, search }) {
  const { tasks, clients, assignableProfiles, selectedClientId, canWrite, getAttachmentUrl } = useData();
  const allMode = selectedClientId === 'ALL';
  const [openTask, setOpenTask] = useState(undefined); // undefined = fechado, null = novo, obj = editar
  const [attByTask, setAttByTask] = useState({});
  const [thumbByTask, setThumbByTask] = useState({});

  const contentTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (!t.content_format) return false;
      if (t.archived) return false;
      if (activeTeamIds !== null && t.team_id && !activeTeamIds.includes(t.team_id)) return false;
      if (activeAssigneeIds !== null && t.assignee_id && !activeAssigneeIds.includes(t.assignee_id)) return false;
      if (activeClientIds !== null && !activeClientIds.includes(t.client_id)) return false;
      if (activeCategoryIds !== null && t.category_id && !activeCategoryIds.includes(t.category_id)) return false;
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, activeTeamIds, activeAssigneeIds, activeClientIds, activeCategoryIds, search]);

  // busca os anexos de todo mundo que aparece na grade numa tacada só (em
  // vez de um card ir buscar o próprio, pra não disparar dezenas de queries)
  useEffect(() => {
    let cancelled = false;
    const ids = contentTasks.filter((t) => t.content_format !== 'video').map((t) => t.id);
    if (!ids.length) { setAttByTask({}); return; }
    supabase.from('task_attachments').select('*').in('task_id', ids).order('created_at')
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const grouped = {};
        data.forEach((a) => { (grouped[a.task_id] = grouped[a.task_id] || []).push(a); });
        setAttByTask(grouped);
      });
    return () => { cancelled = true; };
  }, [contentTasks]);

  // gera a miniatura (primeira imagem) de cada card, conforme os anexos chegam
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = {};
      for (const t of contentTasks) {
        if (thumbByTask[t.id]) continue;
        const atts = attByTask[t.id] || [];
        const first = atts.find((a) => (a.content_type || '').startsWith('image/'));
        if (!first) continue;
        const url = await getAttachmentUrl(first);
        if (url) next[t.id] = url;
      }
      if (!cancelled && Object.keys(next).length) setThumbByTask((prev) => ({ ...prev, ...next }));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attByTask, contentTasks]);

  return (
    <div>
      <div className="content-toolbar">
        {canWrite && <button className="btn btn-primary" onClick={() => setOpenTask(null)}>+ Novo conteúdo</button>}
      </div>

      {contentTasks.length === 0 && (
        <div className="empty-state">
          <div className="big">🖼️</div>
          <div>Nenhum conteúdo por aqui ainda.</div>
          {canWrite && <div style={{ fontSize: 12.5, marginTop: 6 }}>Clique em "+ Novo conteúdo" pra criar um post, carrossel, story ou vídeo.</div>}
        </div>
      )}

      <div className="content-grid">
        {contentTasks.map((t) => {
          const atts = attByTask[t.id] || [];
          const imgCount = atts.filter((a) => (a.content_type || '').startsWith('image/')).length;
          const client = allMode ? clients.find((c) => c.id === t.client_id) : null;
          const assignee = assignableProfiles.find((p) => p.id === t.assignee_id);
          return (
            <button key={t.id} className="content-card" onClick={() => setOpenTask(t)}>
              <div className="content-thumb">
                {t.content_format === 'video' ? (
                  <div className="content-thumb-placeholder"><IconPlay /><span>Vídeo</span></div>
                ) : thumbByTask[t.id] ? (
                  <img src={thumbByTask[t.id]} alt="" />
                ) : (
                  <div className="content-thumb-placeholder"><IconContent /><span>Sem arte</span></div>
                )}
                {t.content_format === 'carrossel' && imgCount > 1 && (
                  <span className="content-thumb-count">{imgCount} fotos</span>
                )}
                <span className="content-stage-badge" style={{ background: stageColorVar(t.stage) }}>{stageLabel(t.stage)}</span>
              </div>
              <div className="content-card-body">
                <div className="content-card-title">{t.title}</div>
                <div className="content-card-meta">
                  <span className="content-format-tag">{contentFormatLabel(t.content_format)}</span>
                  {client && <span className="tname-sub">{client.name}</span>}
                  {assignee && (
                    <span className="avatar" title={assignee.name} style={{ width: 18, height: 18, fontSize: 8.5, background: personColorVar(assignee), color: '#fff' }}>
                      {initials(assignee.name)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {openTask !== undefined && (
        <ContentModal task={openTask} onClose={() => setOpenTask(undefined)} />
      )}
    </div>
  );
}
