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
// minuto. Nenhum dos dois é erro de código, e repetir resolve.
export const erroTemporario = e => /\b(503|429)\b|overloaded|unavailable|resource.?exhausted|quota/i.test(String(e?.message));

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
