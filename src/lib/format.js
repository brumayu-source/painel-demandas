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

const PERSON_COLOR_COUNT = 8;

// cor fixa por pedido pessoal (ex.: "quero minha cor roxa") — checada pelo
// primeiro nome, sem acento/maiúsculas, antes de cair no hash automático
const PERSON_COLOR_OVERRIDES = {
  gustavo: 'var(--person-gustavo)', // roxo, a pedido dele
};

function normalizeFirstName(name) {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)[0]
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// cor estável por pessoa, sem precisar guardar nada no banco: um hash simples
// do id (sempre o mesmo UUID) escolhe sempre a mesma cor da paleta --person-N.
// se a pessoa tiver uma cor combinada (PERSON_COLOR_OVERRIDES), essa cor
// fixa vale antes do hash — por isso o "name" é opcional, mas vale a pena
// passar sempre que der.
export function personColorVar(id, name) {
  if (!id) return 'var(--text-muted)';
  const override = PERSON_COLOR_OVERRIDES[normalizeFirstName(name)];
  if (override) return override;
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

export function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
