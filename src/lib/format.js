export const STAGES = [
  { id: 'todo', label: 'A Fazer' },
  { id: 'doing', label: 'Em Andamento' },
  { id: 'review', label: 'Em Revisão' },
  { id: 'aprovacao', label: 'Em Aprovação' },
  { id: 'done', label: 'Concluído' },
];

export function stageLabel(id) {
  return STAGES.find((s) => s.id === id)?.label || id;
}

export function stageColorVar(id) {
  if (id === 'todo') return 'var(--border-strong)';
  if (id === 'doing') return 'var(--accent)';
  if (id === 'review') return 'var(--warning)';
  if (id === 'aprovacao') return 'var(--serious)';
  return 'var(--good)';
}

export function teamColorVar(team) {
  if (!team) return 'var(--border-strong)';
  return `var(--team-${(team.slot % 8) + 1})`;
}

export function categoryColorVar(category) {
  if (!category) return 'var(--border-strong)';
  return `var(--category-${(category.slot % 8) + 1})`;
}

export const PERSON_COLOR_COUNT = 8;

// nome de cada cor da paleta --person-N, na ordem — usado nos botõezinhos de
// escolha de cor lá na Administração
export const PERSON_COLOR_NAMES = ['Roxo', 'Verde-água', 'Laranja', 'Azul', 'Rosa', 'Âmbar', 'Ciano', 'Verde'];

// cor do avatar de cada pessoa: se ela tiver uma cor escolhida à mão em
// Administração > Usuários (profile.color_slot), usa essa sempre. Sem
// escolha manual, cai num hash estável do id (sempre a mesma cor pro mesmo
// UUID) — assim ninguém fica sem cor até alguém escolher uma pra ela.
export function personColorVar(person) {
  const id = typeof person === 'string' ? person : person?.id;
  if (!id) return 'var(--text-muted)';
  const slot = typeof person === 'object' ? person.color_slot : null;
  if (slot !== null && slot !== undefined && slot !== '') {
    return `var(--person-${(Number(slot) % PERSON_COLOR_COUNT) + 1})`;
  }
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return `var(--person-${(hash % PERSON_COLOR_COUNT) + 1})`;
}

export function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function daysDiff(a, b) {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((da - db) / 86400000);
}

export function fmtDateShort(dstr) {
  if (!dstr) return '';
  const [, m, d] = dstr.split('-');
  return `${d}/${m}`;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function fmtDateLong(dOrStr) {
  if (!dOrStr) return '';
  const d = typeof dOrStr === 'string' ? new Date(dOrStr) : dOrStr;
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

export function relDays(dstr) {
  const n = daysDiff(dstr, todayStr());
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  if (n === -1) return 'ontem';
  if (n > 1) return `em ${n}d`;
  return `há ${-n}d`;
}

export function monthYearLabel(dOrStr) {
  if (!dOrStr) return '';
  const d = typeof dOrStr === 'string' ? new Date(dOrStr) : dOrStr;
  const label = `${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024; // 15MB por arquivo

export function fmtBytes(n) {
  if (!n && n !== 0) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}

export const MONTHS_LONG = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function pad2(n) { return String(n).padStart(2, '0'); }
function ymd(y, m, d) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; } // m: 0-indexado

// monta as semanas (dom→sáb) de um mês pra visão de calendário — inclui os
// dias de encaixe do mês anterior/seguinte pra fechar a primeira e a última
// semana, do mesmo jeito que um calendário de verdade mostra
export function buildCalendarWeeks(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = firstWeekday; i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    cells.push({ date: ymd(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate(), inMonth: false });
  }
  const todayKey = todayStr();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = ymd(year, month, d);
    cells.push({ date, day: d, inMonth: true, isToday: date === todayKey });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    const [y, m, d] = last.date.split('-').map(Number);
    const nd = new Date(y, m - 1, d + 1);
    cells.push({ date: ymd(nd.getFullYear(), nd.getMonth(), nd.getDate()), day: nd.getDate(), inMonth: false });
  }
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// tipos de conteúdo da área "Conteúdo" (Social Media)
export const CONTENT_FORMATS = [
  { id: 'post', label: 'Post' },
  { id: 'carrossel', label: 'Carrossel' },
  { id: 'story', label: 'Story' },
  { id: 'video', label: 'Vídeo' },
];

export function contentFormatLabel(id) {
  return CONTENT_FORMATS.find((f) => f.id === id)?.label || id;
}

export function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
