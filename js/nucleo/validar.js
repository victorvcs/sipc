// A IA às vezes erra o formato. O app só aceita o que bate com o esperado e
// devolve sempre o mesmo formato normalizado para as telas.
const exigir = (cond, msg) => { if (!cond) throw new Error(msg); };
const texto = v => typeof v === 'string' && v.trim().length > 0;

export function validarEdital(o) {
  exigir(o && Array.isArray(o.materias) && o.materias.length, 'a IA não devolveu nenhuma matéria');
  const materias = o.materias.filter(m => texto(m.nome)).map(m => ({
    nome: m.nome.trim(), peso: Number(m.peso) > 0 ? Number(m.peso) : 1, faixa: '',
    topicos: (Array.isArray(m.topicos) ? m.topicos : []).map(String).map(t => t.trim()).filter(Boolean),
  }));
  exigir(materias.length, 'a IA não devolveu nenhuma matéria com nome');
  materias.forEach(m => { if (!m.topicos.length) m.topicos = ['Conteúdo geral de ' + m.nome]; });
  return {
    nome: texto(o.nome) ? o.nome.trim() : 'Minha trilha',
    banca: texto(o.banca) ? o.banca.trim() : null,
    dataProva: /^\d{4}-\d{2}-\d{2}$/.test(o.dataProva || '') ? o.dataProva : '',
    materias,
  };
}

// O modelo às vezes devolve {pergunta, resposta} onde se pediu [pergunta, resposta].
// Normaliza os dois jeitos (e descarta itens quebrados) para a tela nunca
// receber um formato que derrube o render. Vale também para o cache, que
// pode ter sido gravado por uma versão antiga ou adulterado.
const par = (x, a, b) => Array.isArray(x) ? x : (x && typeof x === 'object') ? [x[a] ?? Object.values(x)[0], x[b] ?? Object.values(x)[1]] : null;
const listaDeTextos = v => (Array.isArray(v) ? v : v == null ? [] : [v]).filter(i => i != null && typeof i !== 'object').map(String).filter(t => t.trim());

export function validarConteudo(o) {
  for (const k of ['historia', 'resumo5', 'pergunta']) exigir(texto(o?.[k]), 'conteúdo sem ' + k);
  const lista = v => (Array.isArray(v) ? v : []);
  const resumo1 = lista(o.resumo1).map(x => par(x, 'rotulo', 'itens')).filter(p => p && texto(String(p[0] ?? '')))
    .map(([r, i]) => [String(r), listaDeTextos(i)]);
  const flashcards = lista(o.flashcards).map(x => par(x, 'pergunta', 'resposta')).filter(p => p && texto(String(p[0] ?? '')) && texto(String(p[1] ?? '')))
    .map(([q, a]) => [String(q), String(a)]);
  const analogias = listaDeTextos(o.analogias), checklist = listaDeTextos(o.checklist);
  const m = Array.isArray(o.mapa) ? o.mapa : (o.mapa && typeof o.mapa === 'object') ? [o.mapa.centro, o.mapa.ramos] : null;
  exigir(m && texto(m[0]) && Array.isArray(m[1]), 'conteúdo sem mapa');
  const ramos = m[1].map(r => par(r, 'ramo', 'folhas')).filter(r => r && texto(String(r[0] ?? ''))).map(([r, f]) => [String(r), listaDeTextos(f)]).slice(0, 6);
  for (const [k, v] of Object.entries({ resumo1, analogias, checklist, flashcards, mapa: ramos })) exigir(v.length, 'conteúdo sem ' + k);
  return { pergunta: o.pergunta, historia: o.historia, resumo5: o.resumo5, resumo1, analogias, checklist, flashcards,
           mapa: [String(m[0]), ramos], tempo: Math.min(60, Math.max(5, Number(o.tempo) || 15)) };
}

export function validarQuestoes(o, { formato, qtd }) {
  if (formato === 'certoErrado') {
    exigir(Array.isArray(o?.blocos) && o.blocos.length, 'sem blocos de itens');
    const itens = o.blocos.flatMap(b => (b.itens || []).map(i => {
      exigir(texto(i.afirmacao) && typeof i.certo === 'boolean' && texto(i.justificativa), 'item incompleto');
      return { ce: true, base: b.base || '', comando: b.comando || '', enun: i.afirmacao, alts: ['Certo', 'Errado'], c: i.certo ? 0 : 1, just: i.justificativa };
    }));
    exigir(itens.length, 'sem itens');
    return itens.slice(0, qtd);
  }
  const n = formato === 'multipla4' ? 4 : 5;
  exigir(Array.isArray(o?.questoes) && o.questoes.length, 'sem questões');
  return o.questoes.map(q => {
    exigir(texto(q.enunciado), 'questão sem enunciado');
    exigir(Array.isArray(q.alternativas) && q.alternativas.length === n, 'questão com número errado de alternativas');
    exigir(Number.isInteger(q.correta) && q.correta >= 0 && q.correta < n && texto(q.justificativa), 'questão sem gabarito válido');
    return { enun: q.enunciado, alts: q.alternativas.map(String), c: q.correta, just: q.justificativa };
  }).slice(0, qtd);
}
