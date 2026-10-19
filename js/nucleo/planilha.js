// Planilha não precisa de IA: acha as colunas pelo nome (Matéria, Tópicos,
// Peso ou Chance de cair, Faixa) e monta as matérias. Recebe as abas já lidas
// (pelo SheetJS no navegador), para poder ser testada sem DOM.
const semAcento = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const BANCAS = ['FGV', 'Cebraspe', 'FCC', 'Vunesp', 'Cesgranrio', 'IBFC', 'Instituto AOCP', 'Quadrix', 'IDECAN', 'Consulplan', 'Fundatec', 'IADES'];

export function dividirTopicos(txt) {
  return String(txt || '').split(/[;\n•]|,(?![^(]*\))/).map(t => t.trim().replace(/\.$/, '')).filter(Boolean)
    .map(t => t.charAt(0).toUpperCase() + t.slice(1));
}

export function planilhaParaEdital(abas) {
  let melhor = null, todoTexto = '';
  for (const aba of abas) {
    const linhas = aba.linhas;
    todoTexto += ' ' + linhas.map(r => r.join(' ')).join(' ');
    const hi = linhas.findIndex(r => r.some(c => /^(materia|disciplina)s?\b/.test(semAcento(c).trim())));
    if (hi < 0) continue;
    const h = linhas[hi].map(semAcento), col = re => h.findIndex(c => re.test(c));
    const c = { m: col(/^(materia|disciplina)/), t: col(/topico|assunto|conteudo/), p: col(/peso|pontos|questoes|valor/),
                ch: col(/chance|probab|incidencia|relevancia/), f: col(/faixa|prioridade|grupo|bloco|modulo/) };
    const dados = linhas.slice(hi + 1).filter(r => String(r[c.m] ?? '').trim());
    if (!melhor || dados.length > melhor.dados.length) melhor = { linhas, hi, c, dados };
  }
  if (!melhor || !melhor.dados.length) throw new Error('não achei uma coluna "Matéria" com conteúdo');

  const { linhas, hi, c, dados } = melhor, mats = [];
  const num = v => { const n = parseFloat(String(v).replace('%', '').replace(',', '.')); return isNaN(n) ? null : n; };
  for (const r of dados) {
    const nome = String(r[c.m]).trim();
    let m = mats.find(x => semAcento(x.nome) === semAcento(nome));
    if (!m) { m = { nome, peso: 1, topicos: [], faixa: c.f >= 0 ? String(r[c.f] ?? '').trim() : '' }; mats.push(m); }
    if (c.t >= 0) dividirTopicos(r[c.t]).forEach(t => { if (!m.topicos.includes(t)) m.topicos.push(t); });
    if (c.p >= 0 && num(r[c.p]) !== null) m.peso = num(r[c.p]);
    else if (c.ch >= 0 && num(r[c.ch]) !== null) { const v = num(r[c.ch]); m.peso = Math.round(v <= 1 ? v * 100 : v); m.chance = true; }
  }
  mats.forEach(m => { if (!m.topicos.length) m.topicos = ['Conteúdo geral de ' + m.nome]; });
  mats.sort((a, b) => b.peso - a.peso);

  const titulo = linhas.slice(0, hi).map(r => r.find(x => String(x).trim())).filter(Boolean)[0] || '';
  const [nome, ...resto] = String(titulo).split(/\s+[–—-]\s+/);
  const txt = semAcento(todoTexto);
  const aDefinir = /banca (ainda )?nao (foi )?definida|banca a definir|sem banca/.test(txt);
  const banca = aDefinir ? null : BANCAS.find(b => new RegExp('\\b' + semAcento(b) + '\\b').test(txt)) || null;
  return {
    materias: mats.map(({ chance, ...m }) => m),
    prova: {
      nome: nome || 'Minha trilha', cargo: resto.join(' – '), banca, bancaADefinir: aDefinir || !banca,
      semEdital: /edital (ainda )?nao (foi )?publicado|edital ainda nao|sem edital|antes do edital/.test(txt),
      pesoTipo: mats.some(m => m.chance) ? 'chance' : (c.p >= 0 ? 'pontos' : 'igual'),
    },
  };
}
