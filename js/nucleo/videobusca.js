// Regras puras da busca de vídeos. Cada busca gasta 1% da cota diária, então
// são no máximo 3 tentativas, e a duração aberta usa o que já veio delas.
const SEG_MIN = 180, SEG_MAX = 1800;       // 3 a 30 minutos
const ABERTO_MIN = 60, ABERTO_MAX = 7200;  // 1 minuto a 2 horas

// "Conceitos de produtividade, eficiência e eficácia" → "Conceitos de produtividade"
export function topicoCurto(topico) {
  const limpo = String(topico || '').replace(/^[\d.\s)–-]+/, '').trim();
  return limpo.split(/[,;:(]|\s[–-]\s/)[0].trim().split(/\s+/).slice(0, 6).join(' ');
}

// Do mais específico para o mais amplo, sem repetir busca igual. Nome longo de
// matéria zera a busca, então ela sai primeiro; "concurso" mantém o assunto.
export function tentativasBusca(materia, topico) {
  return [...new Set([`${topico} ${materia} aula concurso`, `${topico} aula concurso`, `${topicoCurto(topico)} aula concurso`])];
}

const melhores = (lista, min, max) => lista.filter(v => v.seg >= min && v.seg <= max).sort((a, b) => b.views - a.views).slice(0, 5);
export const selecionarVideos = lista => melhores(lista, SEG_MIN, SEG_MAX);
export const selecionarAberto = lista => melhores(lista, ABERTO_MIN, ABERTO_MAX);
