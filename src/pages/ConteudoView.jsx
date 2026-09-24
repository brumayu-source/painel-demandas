import { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import {
  contentFormatLabel, contentStatusLabel, contentStatusColorVar, personColorVar, initials,
  MONTHS_LONG, WEEKDAYS_SHORT, buildCalendarWeeks,
} from '../lib/format.js';
import { IconPlay, IconContent, IconChevronLeft, IconChevronRight } from '../components/icons.jsx';
import ContentModal from '../components/ContentModal.jsx';

export default function ConteudoView({ activeTeamIds, activeAssigneeIds, activeClientIds, activeCategoryIds, search }) {
  const { tasks, clients, assignableProfiles, selectedClientId, canWrite, attachmentsByTask, getAttachmentUrl } = useData();
  const allMode = selectedClientId === 'ALL';
  const [openTask, setOpenTask] = useState(undefined); // undefined = fechado, null = novo, obj = editar
  const [thumbByTask, setThumbByTask] = useState({});
  const [cal, setCal] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [showArchived, setShowArchived] = useState(false);

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

  // conteúdo é um ambiente separado das demandas — então os arquivados dele
  // também ficam aqui dentro, não na aba Arquivadas geral
  const archivedContentTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (!t.content_format) return false;
      if (!t.archived) return false;
      if (activeTeamIds !== null && t.team_id && !activeTeamIds.includes(t.team_id)) return false;
      if (activeAssigneeIds !== null && t.assignee_id && !activeAssigneeIds.includes(t.assignee_id)) return false;
      if (activeClientIds !== null && !activeClientIds.includes(t.client_id)) return false;
      if (activeCategoryIds !== null && t.category_id && !activeCategoryIds.includes(t.category_id)) return false;
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, activeTeamIds, activeAssigneeIds, activeClientIds, activeCategoryIds, search]);

  // gera a miniatura (primeira imagem) de cada item, conforme os anexos chegam
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = {};
      for (const t of [...contentTasks, ...archivedContentTasks]) {
        const atts = attachmentsByTask[t.id] || [];
        const first = atts.find((a) => (a.content_type || '').startsWith('image/'));
        const key = first ? first.id : null;
        if (!first || thumbByTask[t.id + ':' + key]) continue;
        const url = await getAttachmentUrl(first);
        if (url) next[t.id + ':' + key] = url;
      }
      if (!cancelled && Object.keys(next).length) setThumbByTask((prev) => ({ ...prev, ...next }));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentsByTask, contentTasks, archivedContentTasks]);

  function thumbFor(t) {
    const atts = attachmentsByTask[t.id] || [];
    const first = atts.find((a) => (a.content_type || '').startsWith('image/'));
    if (!first) return { url: null, count: 0 };
    return { url: thumbByTask[t.id + ':' + first.id] || null, count: atts.filter((a) => (a.content_type || '').startsWith('image/')).length };
  }

  const byDate = useMemo(() => {
    const map = {};
    contentTasks.forEach((t) => { if (t.due_date) (map[t.due_date] = map[t.due_date] || []).push(t); });
    return map;
  }, [contentTasks]);

  const noDate = useMemo(() => contentTasks.filter((t) => !t.due_date), [contentTasks]);

  const weeks = useMemo(() => buildCalendarWeeks(cal.year, cal.month), [cal]);

  function goMonth(delta) {
    setCal(({ year, month }) => {
      let m = month + delta;
      let y = year;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      return { year: y, month: m };
    });
  }

  function goToday() {
    const d = new Date();
    setCal({ year: d.getFullYear(), month: d.getMonth() });
  }

  const monthLabel = `${MONTHS_LONG[cal.month].charAt(0).toUpperCase()}${MONTHS_LONG[cal.month].slice(1)} de ${cal.year}`;

  return (
    <div>
      <div className="content-toolbar">
        <div className="cal-nav">
          <button type="button" onClick={() => goMonth(-1)} aria-label="Mês anterior"><IconChevronLeft /></button>
          <span className="cal-month-label">{monthLabel}</span>
          <button type="button" onClick={() => goMonth(1)} aria-label="Próximo mês"><IconChevronRight /></button>
          <button type="button" className="btn btn-ghost" style={{ padding: '5px 12px' }} onClick={goToday}>Hoje</button>
        </div>
        {canWrite && <button className="btn btn-primary" onClick={() => setOpenTask(null)}>+ Novo conteúdo</button>}
      </div>

      <div className="content-legend">
        <span><span className="legend-dot" style={{ background: 'var(--warning)' }} /> Aguardando aprovação</span>
        <span><span className="legend-dot" style={{ background: 'var(--critical)' }} /> Ajuste solicitado</span>
        <span><span className="legend-dot" style={{ background: 'var(--good)' }} /> Aprovado</span>
      </div>

      {contentTasks.length === 0 && (
        <div style={{ margin: '4px 0 18px', color: 'var(--text-muted)', fontSize: 12.5 }}>
          Nenhum conteúdo ainda{canWrite ? ' — clique em "+ Novo conteúdo" pra criar um post, carrossel, story ou vídeo.' : '.'}
        </div>
      )}

      <div className="cal-wrap">
        <div className="cal-grid">
          {WEEKDAYS_SHORT.map((w) => <div key={w} className="cal-weekday-head">{w}</div>)}
          {weeks.map((week, wi) => week.map((cell) => {
            const items = byDate[cell.date] || [];
            return (
              <div key={wi + '-' + cell.date} className={`cal-cell${cell.inMonth ? '' : ' out'}${cell.isToday ? ' today' : ''}`}>
                <div className="cal-day-num">{cell.day}</div>
                {items.map((t) => (
                  <CalItem key={t.id} task={t} thumb={thumbFor(t)} onClick={() => setOpenTask(t)} />
                ))}
              </div>
            );
          }))}
        </div>
      </div>

      {noDate.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div className="side-section-label" style={{ padding: '0 0 8px', color: 'var(--text-muted)' }}>
            Sem data de postagem definida
          </div>
          <div className="content-grid">
            {noDate.map((t) => {
              const { url, count } = thumbFor(t);
              const client = allMode ? clients.find((c) => c.id === t.client_id) : null;
              const assignee = assignableProfiles.find((p) => p.id === t.assignee_id);
              return (
                <ContentCard key={t.id} task={t} thumbUrl={url} imgCount={count} client={client} assignee={assignee}
                  onClick={() => setOpenTask(t)} />
              );
            })}
          </div>
        </div>
      )}

      {archivedContentTasks.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <button
            type="button"
            className="side-section-label"
            style={{ padding: '0 0 8px', color: 'var(--text-muted)', background: 'none', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? '▾' : '▸'} Arquivados ({archivedContentTasks.length})
          </button>
          {showArchived && (
            <div className="content-grid">
              {archivedContentTasks.map((t) => {
                const { url, count } = thumbFor(t);
                const client = allMode ? clients.find((c) => c.id === t.client_id) : null;
                const assignee = assignableProfiles.find((p) => p.id === t.assignee_id);
                return (
                  <ContentCard key={t.id} task={t} thumbUrl={url} imgCount={count} client={client} assignee={assignee}
                    onClick={() => setOpenTask(t)} />
                );
              })}
            </div>
          )}
        </div>
      )}

      {openTask !== undefined && (
        <ContentModal task={openTask} onClose={() => setOpenTask(undefined)} />
      )}
    </div>
  );
}

function CalItem({ task, thumb, onClick }) {
  return (
    <button type="button" className="cal-item" style={{ borderLeftColor: contentStatusColorVar(task.stage) }}
      onClick={onClick} title={`${task.title} · ${contentStatusLabel(task.stage)}`}>
      {task.content_format === 'video' ? (
        <span className="cal-item-icon"><IconPlay /></span>
      ) : thumb.url ? (
        <img src={thumb.url} alt="" />
      ) : (
        <span className="cal-item-icon"><IconContent /></span>
      )}
      <span className="cal-item-title">{task.title}</span>
      <span className="cal-item-dot" style={{ background: contentStatusColorVar(task.stage) }} />
    </button>
  );
}

function ContentCard({ task, thumbUrl, imgCount, client, assignee, onClick }) {
  return (
    <button className="content-card" onClick={onClick}>
      <div className="content-thumb">
        {task.content_format === 'video' ? (
          <div className="content-thumb-placeholder"><IconPlay /><span>Vídeo</span></div>
        ) : thumbUrl ? (
          <img src={thumbUrl} alt="" />
        ) : (
          <div className="content-thumb-placeholder"><IconContent /><span>Sem arte</span></div>
        )}
        {task.content_format === 'carrossel' && imgCount > 1 && (
          <span className="content-thumb-count">{imgCount} fotos</span>
        )}
        <span className="content-stage-badge" style={{ background: contentStatusColorVar(task.stage) }}>{contentStatusLabel(task.stage)}</span>
      </div>
      <div className="content-card-body">
        <div className="content-card-title">{task.title}</div>
        <div className="content-card-meta">
          <span className="content-format-tag">{contentFormatLabel(task.content_format)}</span>
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
}
