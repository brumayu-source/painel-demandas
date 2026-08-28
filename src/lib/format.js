export const STAGES = [
  { id: 'todo', label: 'A Fazer' },
  { id: 'doing', label: 'Em Andamento' },
  { id: 'review', label: 'Em Revisão' },
  { id: 'done', label: 'Concluído' },
];

export function stageLabel(id) {
  return STAGES.find((s) => s.id === id)?.label || id;
}

export function stageColorVar(id) {
  if (id === 'todo') return 'var(--border-strong)';
  if (id === 'doing') return 'var(--accent)';
  if (id === 'review') return 'var(--warning)';
  return 'var(--good)';
}

export function teamColorVar(team) {
  if (!team) return 'var(--border-strong)';
  return `var(--team-${(team.slot % 8) + 1})`;
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

export function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
