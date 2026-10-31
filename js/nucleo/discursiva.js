// Método da discursiva (material do Victor, FGV). Os dados e as validações
// ficam aqui, sem tela, por isso têm teste. A busca na internet do Gemini não
// existe no plano gratuito (429 em 31/10/2026): a estrutura vem deste material
// ou do espelho que o aluno colar, nunca da memória da IA.

const exigir = (cond, msg) => { if (!cond) throw new Error(msg); };
const textos = v => (Array.isArray(v) ? v : []).filter(x => typeof x === 'string' && x.trim()).map(x => x.trim());

export const CRITERIOS_FGV = [
  { id: 'tema', rot: 'Atendimento ao tema', max: 4 },
  { id: 'tecnico', rot: 'Domínio técnico do conteúdo', max: 3 },
  { id: 'clareza', rot: 'Clareza, estrutura e coesão', max: 2 },
  { id: 'linguagem', rot: 'Linguagem formal e adequação', max: 1 },
];

const parte = (rot, modelo) => ({ rot, modelo });
export const ESTRUTURAS = [
  { id: 'cdarf', nome: 'C-D-A-R-F (a base de tudo)', partes: [
    parte('Conceito', 'O que é o tema, em uma ou duas ideias.'), parte('Desdobramento', 'Como funciona e para que serve.'),
    parte('Aplicação', 'Onde isso aparece no órgão da prova.'), parte('Risco 1', 'O que dá errado sem isso.'),
    parte('Risco 2', 'Outro efeito da falha.'), parte('Fechamento', 'Uma frase que amarra tudo.')] },
  { id: 'classica', nome: 'Clássica FGV', partes: [
    parte('Introdução', 'O tema abordado refere-se a ____, sendo relevante no contexto de ____. Essa abordagem é essencial para garantir ____.'),
    parte('Conceitos', 'Conceitualmente, ____ consiste em ____. Além disso, ____ relaciona-se a ____, o que contribui para ____.'),
    parte('Aplicação', 'Na prática, essa abordagem permite ____, possibilitando ____ e ____.'),
    parte('Riscos', 'A ausência ou falha nesse contexto pode resultar em ____ e ____, comprometendo ____.'),
    parte('Fechamento', 'Assim, a adoção adequada de ____ é fundamental para assegurar ____.')] },
  { id: 'comparacao', nome: 'Com comparação', partes: [
    parte('Introdução', 'O tema em análise envolve ____, frequentemente comparado a ____ no âmbito de ____.'),
    parte('Comparação conceitual', 'Enquanto ____ caracteriza-se por ____, ____ apresenta como principal aspecto ____.'),
    parte('Aplicação', 'No contexto institucional, essa distinção permite ____, favorecendo ____.'),
    parte('Riscos', 'A não observância dessa diferenciação pode acarretar ____ e ____.'),
    parte('Fechamento', 'Dessa forma, compreender essas diferenças é essencial para ____.')] },
  { id: 'causa', nome: 'Causa e consequência', partes: [
    parte('Introdução', 'O tema refere-se a ____, o qual exerce impacto direto sobre ____.'),
    parte('Causa', 'Isso ocorre porque ____, o que leva a ____.'),
    parte('Consequência', 'Como consequência, observa-se ____, bem como ____.'),
    parte('Riscos', 'Caso esse aspecto não seja adequadamente considerado, podem surgir ____ e ____.'),
    parte('Fechamento', 'Portanto, torna-se indispensável ____.')] },
  { id: 'enumeracao', nome: 'Enumeração lógica', partes: [
    parte('Introdução', 'O tema em questão envolve ____, sendo possível analisá-lo sob diferentes perspectivas.'),
    parte('Primeiro aspecto', 'Em primeiro lugar, ____ destaca-se por ____.'),
    parte('Segundo aspecto', 'Ademais, ____ contribui para ____.'),
    parte('Terceiro aspecto', 'Por fim, ____ permite ____.'),
    parte('Fechamento', 'Assim, a conjugação desses aspectos resulta em ____.')] },
  { id: 'tecnica', nome: 'Técnica e objetiva', partes: [
    parte('Introdução', 'Trata-se de ____, elemento relevante para ____.'),
    parte('Conceituação', 'Sob o ponto de vista técnico, ____ corresponde a ____.'),
    parte('Aplicação', 'Na prática institucional, isso possibilita ____.'),
    parte('Riscos', 'A inobservância desse fator pode gerar ____.'),
    parte('Fechamento', 'Desse modo, sua correta aplicação é essencial para ____.')] },
  { id: 'problema', nome: 'Problema e solução', partes: [
    parte('Introdução', 'O tema aborda ____, frequentemente associado a ____.'),
    parte('Problema', 'A ausência de ____ resulta em ____.'),
    parte('Solução', 'Nesse sentido, ____ surge como solução para ____.'),
    parte('Benefícios', 'Com isso, obtém-se ____ e ____.'),
    parte('Fechamento', 'Logo, a adoção de ____ é fundamental para ____.')] },
  { id: 'contraponto', nome: 'Com contraponto', partes: [
    parte('Introdução', 'Embora ____ seja amplamente utilizado, observa-se ____.'),
    parte('Contraponto', 'Por outro lado, ____ apresenta vantagens como ____.'),
    parte('Análise', 'Essa diferença impacta diretamente ____.'),
    parte('Riscos', 'Ignorar esse contraponto pode resultar em ____.'),
    parte('Fechamento', 'Assim, a análise equilibrada desses aspectos é essencial para ____.')] },
  { id: 'temporal', nome: 'Progressão temporal', partes: [
    parte('Introdução', 'Inicialmente, ____ era compreendido como ____.'),
    parte('Evolução', 'Com o tempo, passou a incorporar ____.'),
    parte('Cenário atual', 'Atualmente, observa-se ____.'),
    parte('Riscos', 'A não adaptação a esse cenário pode acarretar ____.'),
    parte('Fechamento', 'Portanto, torna-se necessário ____.')] },
  { id: 'impacto', nome: 'Impacto institucional', partes: [
    parte('Introdução', 'O tema analisado possui impacto direto sobre ____.'),
    parte('Contextualização', 'Isso se deve ao fato de ____.'),
    parte('Impactos positivos', 'Quando corretamente aplicado, resulta em ____.'),
    parte('Impactos negativos', 'Em sentido oposto, sua ausência gera ____.'),
    parte('Fechamento', 'Dessa forma, sua adoção é indispensável para ____.')] },
  { id: 'enxuta', nome: 'Enxuta (pouco tempo)', partes: [
    parte('Introdução', 'O tema refere-se a ____.'),
    parte('Desenvolvimento', 'Esse conceito envolve ____, permitindo ____.'),
    parte('Riscos', 'A falta desse elemento pode resultar em ____.'),
    parte('Fechamento', 'Assim, sua correta aplicação é essencial para ____.')] },
];

// Temas de TI no Judiciário que o Victor mapeou como os mais prováveis na FGV.
export const TEMAS_FGV = [
  { tema: 'Levantamento e análise de requisitos',
    enunciado: 'Explique a importância do levantamento de requisitos no desenvolvimento de sistemas judiciais, distinguindo requisitos funcionais e não funcionais, e indicando riscos de falhas nessa etapa.',
    conceito: ['Requisitos funcionais: o que o sistema faz (funcionalidades, operações, fluxos).', 'Requisitos não funcionais: como o sistema se comporta (desempenho, segurança, disponibilidade, usabilidade).'],
    aplicacao: ['Sistemas judiciais são críticos e complexos, com múltiplos usuários e grande volume de dados.', 'Exigem precisão, segurança, rastreabilidade e continuidade.'],
    resolve: ['Ambiguidade de escopo.', 'Retrabalho.', 'Desalinhamento entre negócio e TI.'],
    riscos: ['Gargalos e baixa performance.', 'Falhas de acesso e indisponibilidade.', 'Atrasos e aumento de custos.', 'Impacto negativo na prestação jurisdicional.'],
    fechamento: 'Assim, o adequado levantamento e a análise de requisitos são fundamentais para garantir sistemas eficazes e alinhados às necessidades do Poder Judiciário.' },
  { tema: 'LGPD aplicada ao Judiciário',
    enunciado: 'Explique os princípios da finalidade e da necessidade previstos na LGPD e sua aplicação no contexto dos sistemas judiciais, indicando riscos de seu descumprimento.',
    conceito: ['Finalidade: tratamento para propósito legítimo, específico e informado.', 'Necessidade: coleta limitada ao mínimo indispensável.', 'Segurança: medidas técnicas e administrativas para proteger os dados.', 'Controlador decide como e por que tratar; operador trata em nome dele.'],
    aplicacao: ['Sistemas judiciais lidam com dados pessoais e sensíveis.', 'Sigilo processual e controle de acesso por perfil.', 'Uso dos dados apenas para fins jurisdicionais.'],
    resolve: ['Coleta excessiva.', 'Uso indevido de informações.', 'Falta de transparência institucional.'],
    riscos: ['Vazamento de dados sensíveis.', 'Acesso indevido e manipulação de informações.', 'Responsabilização administrativa e judicial.', 'Perda de confiança institucional.'],
    fechamento: 'Assim, a observância da LGPD é essencial para garantir segurança jurídica, proteção dos dados pessoais e confiabilidade na atuação do Poder Judiciário.' },
  { tema: 'Gestão de processos (BPM e BPMN)',
    enunciado: 'Explique a importância da modelagem de processos no Judiciário, destacando os conceitos de AS IS e TO BE.',
    conceito: ['BPM: gestão orientada a processos, para analisar, controlar e melhorar.', 'BPMN: notação gráfica padronizada, que facilita o entendimento entre áreas.', 'AS IS: processo atual. TO BE: processo otimizado.'],
    aplicacao: ['Fluxos cartorários e tramitação processual.', 'Múltiplos usuários, unidades e sistemas.', 'Necessidade de padronização e eficiência.'],
    resolve: ['Ineficiência.', 'Retrabalho.', 'Falta de padronização.'],
    riscos: ['Despadronização de fluxos.', 'Gargalos operacionais e retrabalho.', 'Impacto na prestação jurisdicional.'],
    fechamento: 'Assim, o BPM contribui para maior eficiência e transparência na atuação do Judiciário.' },
  { tema: 'Governança e gestão de TI',
    enunciado: 'Diferencie governança e gestão de TI e explique sua importância no Poder Judiciário, indicando riscos da ausência de governança.',
    conceito: ['Governança: define diretrizes, políticas, prioridades e controles (direcionar e controlar).', 'Gestão: planeja, executa e opera serviços e recursos de TI.'],
    aplicacao: ['Diversos sistemas, unidades e processos críticos.', 'Padronização, segurança e continuidade dos serviços.', 'Suporte à estratégia institucional, com SLAs.'],
    resolve: ['Desalinhamento entre TI e negócio.', 'Falta de padronização.', 'Baixa visibilidade e controle dos sistemas.'],
    riscos: ['Descentralização descontrolada.', 'Gargalos e retrabalho.', 'Uso ineficiente de recursos.', 'Impacto negativo na prestação jurisdicional.'],
    fechamento: 'Assim, a Governança de TI é essencial para assegurar alinhamento estratégico, controle e eficiência na utilização da tecnologia no Poder Judiciário.' },
  { tema: 'Requisitos não funcionais e qualidade de sistemas',
    enunciado: 'Explique a importância dos requisitos não funcionais para a qualidade de sistemas judiciais, indicando riscos de sua inobservância.',
    conceito: ['Atributos de qualidade: desempenho, segurança e disponibilidade.'],
    aplicacao: ['Sistemas críticos, disponíveis 24 horas por dia.', 'Alta demanda e proteção de dados.'],
    resolve: ['Lentidão e indisponibilidade.', 'Falhas de segurança.'],
    riscos: ['Indisponibilidade.', 'Vulnerabilidades.', 'Impacto institucional.'],
    fechamento: 'Assim, os requisitos não funcionais são essenciais para garantir sistemas confiáveis e disponíveis ao Poder Judiciário.' },
  { tema: 'Integração de sistemas e dados',
    enunciado: 'Explique a importância da arquitetura e da integração de sistemas no Poder Judiciário, indicando riscos da ausência de integração.',
    conceito: ['Arquitetura define a estrutura e a organização dos sistemas.', 'Integração permite a troca automática de informações (APIs, interoperabilidade).'],
    aplicacao: ['Múltiplos sistemas e usuários, com grande volume de dados.', 'Integração entre órgãos e compartilhamento seguro.'],
    resolve: ['Trabalho manual repetido.', 'Dados divergentes entre sistemas.'],
    riscos: ['Retrabalho em atividades automatizáveis.', 'Atrasos pela ausência de integração.', 'Inconsistência de dados e falhas de comunicação.'],
    fechamento: 'Arquitetura e integração bem definidas garantem eficiência, segurança e qualidade na prestação jurisdicional.' },
];

export const ehFGV = banca => /fgv/i.test(banca || '');

// Junta os campos do exercício de estrutura num texto só para a correção.
export const textoDaEstrutura = (estrutura, respostas) => estrutura.partes
  .map((p, i) => [p.rot, String(respostas?.[i] ?? '').trim()]).filter(([, t]) => t).map(([r, t]) => `${r}: ${t}`).join('\n');

const meioPonto = n => Math.round(n * 2) / 2;

export function validarCorrecao(o, criterios = CRITERIOS_FGV) {
  const notas = criterios.map(c => {
    const n = Number(o?.criterios?.[c.id]?.nota);
    exigir(Number.isFinite(n), 'correção sem nota de ' + c.rot);
    return { ...c, nota: Math.min(c.max, Math.max(0, meioPonto(n))), comentario: String(o.criterios[c.id].comentario ?? '').trim() };
  });
  const bem = textos(o.bem), corrigir = textos(o.corrigir);
  exigir(bem.length || corrigir.length, 'correção sem comentários');
  const lingua = (Array.isArray(o.lingua) ? o.lingua : []).map(l => ({ trecho: String(l?.trecho ?? '').trim(), correcao: String(l?.correcao ?? '').trim(), tipo: String(l?.tipo ?? '').trim() })).filter(l => l.trecho && l.correcao).slice(0, 20);
  return { notas, total: notas.reduce((t, c) => t + c.nota, 0), max: notas.reduce((t, c) => t + c.max, 0), bem, corrigir, lingua,
    modelo: String(o.modelo ?? '').trim(), transcricao: String(o.transcricao ?? '').trim() };
}

export function validarExercicioLogico(o) {
  exigir(typeof o?.enunciado === 'string' && o.enunciado.trim(), 'exercício sem enunciado');
  exigir(typeof o?.resolucao === 'string' && o.resolucao.trim(), 'exercício sem resolução');
  return { enunciado: o.enunciado.trim(), resposta: String(o.resposta ?? '').trim(), resolucao: o.resolucao.trim() };
}

export function validarCorrecaoLogico(o) {
  exigir(typeof o?.acertou === 'boolean', 'correção sem resultado');
  return { acertou: o.acertou, comentario: String(o.comentario ?? '').trim(), erros: textos(o.erros), proximoPasso: String(o.proximoPasso ?? '').trim(), transcricao: String(o.transcricao ?? '').trim() };
}

// O documento do aluno tem limite: o histórico guarda só o resultado.
export const HISTORICO_MAX = 40;
export const somarHistorico = (lista, item) => [item, ...(lista || [])].slice(0, HISTORICO_MAX);

// Cada correção vira um documento próprio em users/{uid}/redacoes. Os limites
// protegem o documento de uma resposta enorme da IA. Foto e desenho não entram.
export const MAX_CORRECOES = 40;
const corta = (s, n) => String(s ?? '').slice(0, n);
export const registroDaCorrecao = (c, { data, tipo, banca, tema, enunciado, texto }) => ({
  data, tipo, banca: corta(banca, 120), tema: corta(tema, 300), enunciado: corta(enunciado, 3000), texto: corta(texto, 12000),
  total: c.total, max: c.max,
  notas: c.notas.map(({ id, rot, max, nota, comentario }) => ({ id, rot, max, nota, comentario: corta(comentario, 800) })),
  bem: c.bem.slice(0, 10).map(s => corta(s, 800)),
  corrigir: c.corrigir.slice(0, 10).map(s => corta(s, 800)),
  lingua: c.lingua.slice(0, 30).map(l => ({ trecho: corta(l.trecho, 300), correcao: corta(l.correcao, 300), tipo: corta(l.tipo, 80) })),
  modelo: corta(c.modelo, 8000), transcricao: corta(c.transcricao, 12000),
});

// Um quarto da nota de tema, ou menos, indica que o texto respondeu a outra pergunta.
export function fugiuDoTema(c) {
  const n = (c?.notas || []).find(x => x.id === 'tema');
  return !!n && n.nota / n.max <= 0.25;
}

const umaCasa = n => Math.round(n * 10) / 10;
const media = l => umaCasa(l.reduce((t, n) => t + n, 0) / l.length);
const notaDe = h => h.total ?? h.nota; // o histórico da v1.4 guardava só "nota"
const redacoes = lista => (lista || []).filter(h => h.tipo === 'redacao' && h.max > 0);
export const notaEm10 = h => umaCasa(notaDe(h) / h.max * 10);

// lista: da correção mais recente para a mais antiga. Estrutura não entra: é outro tipo de treino.
export function resumoEvolucao(lista) {
  const r = redacoes(lista);
  if (!r.length) return { qtd: 0 };
  const recentes = r.slice(0, 5), comNotas = recentes.filter(h => h.notas);
  const criterios = (comNotas[0]?.notas || []).map(c => ({
    id: c.id, rot: c.rot, max: c.max, ultima: c.nota,
    media: media(comNotas.map(h => h.notas.find(n => n.id === c.id)?.nota).filter(n => n != null)),
  }));
  const ultima = notaEm10(r[0]), anterior = r[1] ? notaEm10(r[1]) : null;
  return {
    qtd: r.length, ultima, anterior, media: media(recentes.map(notaEm10)),
    diferenca: anterior == null ? null : umaCasa(ultima - anterior),
    criterios,
    pontoFraco: criterios.length ? criterios.reduce((a, b) => (b.media / b.max < a.media / a.max ? b : a)) : null,
    serie: r.slice(0, 8).reverse().map(h => ({ data: h.data, nota: notaEm10(h) })),
  };
}

// A redação anterior a c, para comparar a nota dentro do relatório.
export function anteriorDe(lista, c) {
  const r = redacoes(lista), i = r.findIndex(h => h.id === c.id);
  return i >= 0 ? r[i + 1] || null : null;
}
