// Partes da IA que não dependem do Firebase (e por isso têm teste).

export const slug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);

// O mesmo tópico na mesma banca vira o mesmo documento: quem estuda depois
// lê o que já foi gerado em vez de gastar cota da IA de novo.
export const idConteudo = (banca, materia, topico) => `${slug(banca) || 'geral'}__${slug(materia)}__${slug(topico)}`;

// Gemini: o raciocínio interno sai do mesmo orçamento de maxOutputTokens e
// consome ~2x o tamanho da resposta; pedir o tamanho "nu" corta a resposta.
export const orcamento = maxTokens => Math.max(8000, (maxTokens || 2000) * 4);

// A camada gratuita responde 503 sem capacidade e 429 ao estourar a cota do
// minuto. Queda de rede e erro 5xx também passam sozinhos. Nada disso é erro
// de código, e repetir resolve.
export const erroTemporario = e => /\b(500|502|503|504|429)\b|overloaded|unavailable|resource.?exhausted|quota|deadline|failed to fetch|load failed|networkerror/i.test(String(e?.message));

export const erroDeCota = e => e?.customErrorData?.status === 429 || /\b429\b|resource.?exhausted|quota/i.test(String(e?.message));

// Camada gratuita: limite de 5 chamadas para o projeto inteiro, numa janela
// curta (medido em 31/10/2026; ver DEBITO_TECNICO, item 1). Repetir em segundos só gasta a cota: espera o que a API pediu ou
// a janela de 1 minuto. Prazo maior que isso é o limite do dia: não adianta esperar.
const ESPERA_MAX_COTA = 90000;
export function esperaAntesDeRepetir(e, tentativa) {
  if (!erroDeCota(e)) return 1500 * tentativa;
  const detalhe = e?.customErrorData?.errorDetails?.find?.(d => d?.retryDelay)?.retryDelay;
  const m = String(detalhe || '').match(/([\d.]+)s/) || String(e?.message).match(/retry in ([\d.]+)\s*s/i);
  const espera = m ? Math.round(Number(m[1]) * 1000) + 1000 : 61000;
  return espera > ESPERA_MAX_COTA ? null : espera;
}

// O que vai para o registro de uso: o SDK põe a URL antes do status, e o corte
// por tamanho escondia justamente a causa.
export function resumoErro(e) {
  const c = e?.causa || e;
  const bruto = String(c?.message ?? c);
  const status = c?.customErrorData?.status || bruto.match(/\[(\d{3})\b/)?.[1];
  const msg = bruto.replace(/^AI:\s*/, '').replace(/Error fetching from \S+\s*(\[[^\]]*\]\s*)?/, '').split('\n')[0].trim();
  return ((status ? `[${status}] ` : '') + (c?.code ? c.code + ': ' : '') + msg).slice(0, 150);
}

// Repete o que passa sozinho. Cada modelo tem a própria cota gratuita: se um
// estourou, o próximo responde na hora; a espera só vem quando acabaram todos.
export async function comTentativas({ modelos, chamar, tentativas = 4, dormir = ms => new Promise(r => setTimeout(r, ms)) }) {
  let i = 0, ultimo = null, esperas = 0;
  for (let t = 1; t <= tentativas; t++) {
    try {
      return await chamar(modelos[i]);
    } catch (e) {
      const invalida = !!e.respostaInvalida;
      if (!erroTemporario(e) && !invalida) throw e;
      ultimo = new Error(invalida ? 'a IA devolveu uma resposta incompleta; tente de novo' : 'o serviço de IA está ocupado; tente de novo em instantes');
      ultimo.causa = e;
      if (t === tentativas) break;
      if (erroDeCota(e) && i < modelos.length - 1) { i++; continue; }
      const espera = esperaAntesDeRepetir(e, ++esperas);
      if (espera === null) break;
      await dormir(espera);
      if (erroDeCota(e)) i = 0;
    }
  }
  throw ultimo;
}

// Roda uma tarefa por vez: sem isto, abrir um tópico dispara conteúdo e
// questões juntos e o próprio aluno estoura a cota do minuto.
export function criarFila() {
  let ultima = Promise.resolve();
  return tarefa => {
    const vez = ultima.then(tarefa, tarefa);
    ultima = vez.catch(() => {});
    return vez;
  };
}

// Aceita JSON puro ou cercado por texto/markdown.
export function extrairJSON(txt) {
  const m = String(txt).match(/\{[\s\S]*\}/);
  if (!m) throw new Error('a IA respondeu sem JSON');
  return JSON.parse(m[0]);
}

// O modelo "equilibra" o gabarito do jeito mais literal possível (A,B,C,D,E,A…).
// Embaralhar aqui tira o padrão sem depender do prompt. Recebe a questão já
// normalizada ({alts, c}); Certo/Errado não se embaralha.
export function embaralhar(q, aleatorio = Math.random) {
  if (q.ce) return q;
  const itens = q.alts.map((t, i) => ({ t, i, certa: i === q.c }));
  for (let i = itens.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [itens[i], itens[j]] = [itens[j], itens[i]];
  }
  // A IA cita letras na justificativa mesmo quando o prompt proíbe: troca
  // "alternativa B" pela letra que essa alternativa ganhou depois do embaralho.
  const L = 'ABCDE', novo = q.alts.map((_, i) => itens.findIndex(x => x.i === i));
  const just = String(q.just || '').replace(/\b(alternativas?|letras?|op[cç](?:ão|ões))\s+([A-E])\b|\(([A-E])\)/g, (m, pal, a, b) => {
    const l = a || b, n = novo[L.indexOf(l)];
    if (n === undefined || n < 0) return m;
    return pal ? `${pal} ${L[n]}` : `(${L[n]})`;
  });
  return { ...q, alts: itens.map(x => x.t), c: itens.findIndex(x => x.certa), just };
}
