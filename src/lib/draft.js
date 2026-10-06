// ============================================================
// Rascunho local de formulários (localStorage)
//
// Problema que isso resolve: ao trocar de app no celular (ou de janela no
// computador) e voltar pro painel, o navegador às vezes descarta a aba em
// segundo plano (comum em iPhone) ou o Supabase revalida a sessão de um
// jeito que remonta a tela — nos dois casos, o que a pessoa tava digitando
// num modal (TaskModal/ContentModal/RequestModal) se perdia, porque esse
// texto só existia na memória do componente.
//
// A solução: a cada mudança nos campos, salva uma cópia no localStorage
// (com um pequeno atraso, pra não gravar a cada letra digitada). Se o modal
// reabrir — seja porque a pessoa reabriu o mesmo card, seja porque a página
// recarregou sozinha — o rascunho é recuperado automaticamente. O rascunho
// some assim que a pessoa salva de verdade ou cancela.
// ============================================================

const PREFIX = 'pd_draft_';

export function loadDraft(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveDraft(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(data));
  } catch {
    // localStorage indisponível (modo privado, cota cheia etc.) — sem rascunho, sem crash
  }
}

export function clearDraft(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // noop
  }
}
