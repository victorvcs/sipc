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

export function validarConteudo(o) {
  for (const k of ['historia', 'resumo5', 'pergunta']) exigir(texto(o?.[k]), 'conteúdo sem ' + k);
  for (const k of ['resumo1', 'analogias', 'checklist', 'flashcards']) exigir(Array.isArray(o?.[k]) && o[k].length, 'conteúdo sem ' + k);
  exigir(Array.isArray(o.mapa) && texto(o.mapa[0]) && Array.isArray(o.mapa[1]), 'conteúdo sem mapa');
  return o;
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
