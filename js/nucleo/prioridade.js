// Prioriza o que os alunos reportam: valor = quanto atrapalha a jornada
// (5 bloqueia … 1 detalhe); esforço = trabalho estimado (1 pouco … 3 muito).
// É uma primeira triagem por palavras; o Victor ajusta no backlog.
export function classificar(tipo, texto, tela) {
  const t = String(texto).toLowerCase();
  const area = /quest|gabarito|alternativ/.test(t) ? 'Questões' : /revis/.test(t) ? 'Revisão'
    : /edital|pdf|planilha|arquivo|matéria/.test(t) ? 'Edital' : /trilha|plano|dia/.test(t) ? 'Plano e trilha'
    : /cor|tela|botão|fonte|layout|escuro|cortad/.test(t) ? 'Visual' : String(tela).split(' · ')[0];
  const esforco = /(cor|texto|botão|fonte|cortad|desalinh|escrit|palavra)/.test(t) ? 1
    : /(nova tela|integra|import|exporta|ia |inteligência|modo|aplicativo|notifica|whatsapp|offline)/.test(t) ? 3 : 2;
  if (tipo === 'melhoria') {
    // ajuste só de aparência vale menos, mesmo citando uma parte importante do app
    const valor = /(visual|\bcor\b|escuro|tema|fonte|ícone)/.test(t) ? 2 : /(quest|revis|plano|trilha|edital|tempo|estudar)/.test(t) ? 4 : 3;
    return { sev: null, area, valor, esforco };
  }
  const sev = /(não (abre|carrega|salva|funciona|aparece)|trav|perdi|sumiu|apag|não consigo|erro|continuou)/.test(t) ? 'alta'
    : /(lent|demor|estranh|errad|desalinh|cortad)/.test(t) ? 'media' : 'baixa';
  return { sev, area, valor: { alta: 5, media: 3, baixa: 2 }[sev], esforco };
}

export function quadrante(i) {
  const alto = i.valor >= 4 || (i.tipo === 'bug' && i.valor >= 3), facil = i.esforco <= 2;
  return alto ? (facil ? 'ja' : 'planejar') : (facil ? 'encaixar' : 'depois');
}

// valor pesa o dobro do esforço; bug ganha um ponto no empate
const pontos = i => i.valor * 2 - i.esforco + (i.tipo === 'bug' ? 1 : 0);
const ORDEM = { ja: 0, planejar: 1, encaixar: 2, depois: 3 };
export function ordenar(itens) {
  return [...itens].sort((a, b) => ORDEM[quadrante(a)] - ORDEM[quadrante(b)] || pontos(b) - pontos(a));
}
