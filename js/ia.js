// Tudo que pede algo ao Gemini (Firebase AI Logic). Quem protege a cota é o
// App Check; não há chave de API do aluno em lugar nenhum.
import { ia, getGenerativeModel, IA_MODELO } from './firebase.js';
import { validarEdital, validarConteudo, validarQuestoes } from './nucleo/validar.js';
import { idConteudo, orcamento, erroTemporario, extrairJSON, embaralhar } from './nucleo/iautil.js';
import { lerConteudo, gravarConteudo } from './store.js';

const TENTATIVAS = 4; // em teste real vieram dois 503 seguidos antes do acerto

export async function gerarJSON({ system, user, maxTokens }) {
  const cfg = { model: IA_MODELO, generationConfig: { maxOutputTokens: orcamento(maxTokens), responseMimeType: 'application/json' } };
  if (system) cfg.systemInstruction = system;
  const modelo = getGenerativeModel(ia, cfg);
  let ultimo = null;
  for (let t = 1; t <= TENTATIVAS; t++) {
    try {
      const txt = (await modelo.generateContent(user)).response.text();
      if (!txt || !txt.trim()) throw new Error('a IA devolveu uma resposta vazia');
      return extrairJSON(txt);
    } catch (e) {
      if (!erroTemporario(e)) throw e;
      ultimo = new Error('o serviço de IA está ocupado; tente de novo em instantes');
      if (t < TENTATIVAS) await new Promise(r => setTimeout(r, 1500 * t));
    }
  }
  throw ultimo;
}

/* ---------- edital ---------- */

export async function extrairEdital(texto, filtroCargo = '') {
  const filtro = filtroCargo.trim();
  const o = await gerarJSON({
    maxTokens: 8000,
    user:
      'Você recebe o texto de um edital ou programa de prova (concurso, vestibular, certificação ou disciplina). Extraia:\n' +
      '- "nome": nome curto da prova, como aparece no texto; se o texto não disser, "";\n' +
      '- "banca": banca ou instituição organizadora, se constar, senão "";\n' +
      '- "dataProva": data da prova objetiva no formato AAAA-MM-DD, se constar, senão "";\n' +
      '- "formatoQuestoes": "certoErrado" se os itens forem julgados como CERTO ou ERRADO (típico do Cebraspe), ' +
      '"multipla4" se forem 4 alternativas (A a D), "multipla5" se forem 5 (A a E). Na dúvida, "multipla5";\n' +
      '- "materias": as disciplinas cobradas, cada uma com "nome", "peso" e "topicos".\n' +
      'Peso: pontos da matéria na prova (nº de questões × valor de cada questão). Quando o edital só der o total de um bloco ' +
      'sem separar por matéria, divida os pontos do bloco igualmente entre as matérias dele. Só use 1 quando não houver informação nenhuma.\n' +
      'Tópicos: os assuntos do conteúdo programático daquela matéria, na ordem do edital, cada um curto (até ~90 caracteres), sem numeração. ' +
      'Não invente nada que não está no texto. Se uma matéria tiver mais de 40 itens, agrupe os vizinhos até ficar com no máximo 40.\n' +
      (filtro
        ? 'O edital pode ter vários cargos/áreas. Considere SOMENTE: "' + filtro + '" (e as matérias comuns a todos).\n'
        : 'Se houver vários cargos/áreas com conteúdos diferentes, use as matérias comuns e as do primeiro cargo listado.\n') +
      'Responda SOMENTE com JSON: {"nome":"","banca":"","dataProva":"","formatoQuestoes":"multipla5","materias":[{"nome":"","peso":1,"topicos":[""]}]}\n\nTEXTO:\n' + texto,
  });
  const edital = validarEdital(o);
  edital.formatoQuestoes = ['certoErrado', 'multipla4', 'multipla5'].includes(o.formatoQuestoes) ? o.formatoQuestoes : 'multipla5';
  return edital;
}

/* ---------- conteúdo nas 9 seções ---------- */

const SISTEMA_CONTEUDO =
  'Você é um professor de cursinho preparatório que escreve material de estudo em português do Brasil, claro e correto. ' +
  'Nunca invente lei, artigo, súmula, norma, data, número ou fato: na dúvida, explique o conceito sem citar a fonte. ' +
  'Responda SOMENTE com JSON válido.';

export async function obterConteudo({ banca, materia, topico, uid, prova = '' }) {
  const id = idConteudo(banca, materia, topico);
  const salvo = await lerConteudo(id).catch(() => null);
  if (salvo?.json) return { id, ...JSON.parse(salvo.json), doCache: true };

  const o = await gerarJSON({
    system: SISTEMA_CONTEUDO,
    maxTokens: 5000,
    user:
      `Escreva o material de estudo do tópico "${topico}" da matéria "${materia}"` +
      (banca ? `, para quem vai fazer prova da banca ${banca}` : '') + (prova ? ` (${prova})` : '') + '.\n' +
      'Devolva um JSON com exatamente estes campos:\n' +
      '- "pergunta": uma pergunta curta que desperte a curiosidade sobre o tópico;\n' +
      '- "historia": storytelling real sobre a origem ou o porquê do tema, 2 ou 3 parágrafos em HTML (<p>, <b>, <i>);\n' +
      '- "resumo1": resumo de 1 minuto, lista de 4 a 6 pares [rótulo, [itens curtos]];\n' +
      '- "resumo5": resumo de 5 minutos em HTML, com seções <h3> numeradas ("1. ..."), <p>, <b>, e uma <table> quando houver comparação; ' +
      'termine com uma seção "Como a banca cobra";\n' +
      '- "mapa": mapa mental [centro, [[ramo, [folhas]]]], até 5 ramos com até 5 folhas, frases de 2 a 5 palavras;\n' +
      '- "analogias": 4 ou 5 analogias em HTML, cada uma começando pelo termo em <b>, ex.: "<b>X = Y:</b> explicação";\n' +
      '- "checklist": 5 ou 6 frases curtas no formato "situação → conclusão" para revisar em 30 segundos;\n' +
      '- "flashcards": 5 pares [pergunta, resposta curta];\n' +
      '- "tempo": minutos estimados para estudar (número entre 10 e 30).',
  });
  const conteudo = validarConteudo(o);
  // O Firestore não guarda lista dentro de lista (mapa, resumo1, flashcards):
  // o conteúdo vai como texto JSON.
  await gravarConteudo(id, { json: JSON.stringify(conteudo), banca: banca || '', materia, topico, uid, modelo: IA_MODELO, criadoEm: new Date().toISOString() })
    .catch(() => {}); // outro aluno pode ter gravado no mesmo instante; o conteúdo já está em mãos
  return { id, ...conteudo, doCache: false };
}

/* ---------- questões no padrão da banca ---------- */

// Resumo do GUIA_ESTILO_BANCAS.md (provas oficiais analisadas em 18/10/2026).
export const ESTILO_BANCA = {
  FGV:
    'Padrão FGV: enunciados de 45 a 150 palavras, nunca curtos. Use estas estruturas, variando: ' +
    '(1) caso concreto com pessoas nomeadas por iniciais ou nomes, órgão ou empresa e dados, terminando em "Assim, é correto concluir que"; ' +
    '(2) afirmativas I a V sobre o conceito, com distorções sutis em algumas (um advérbio, uma exceção trocada), fechando com "Está correto o que se afirma em"; ' +
    '(3) em temas técnicos, cenário com dados (tabela, código, números) e alternativas no formato veredito + justificativa ("..., pois ..."); ' +
    '(4) em Português, um trecho de texto e alternativas que reescrevem o trecho. ' +
    'Comandos típicos: "Assinale a opção que...", "É correto afirmar que...", "Assinale a alternativa INCORRETA". ' +
    'Alternativas paralelas no formato e próximas entre si; as erradas são plausíveis (conceito vizinho, regra antiga, exceção aplicada como regra, cálculo com um passo esquecido).',
  Cebraspe:
    'Padrão Cebraspe: blocos. Cada bloco abre com um texto-base ou uma situação hipotética ("Determinada autarquia federal...", "Maria apresentou pedido...") ' +
    'e o comando "A partir dessa situação hipotética, julgue os itens a seguir." Cada item é uma única afirmação curta, julgada isoladamente. ' +
    'O erro está em palavra absoluta (sempre, nunca, exclusivamente, apenas), na troca pequena de um termo, em afirmação parcialmente verdadeira ' +
    '(parcialmente certo é errado) ou em justificativa errada para conclusão certa. Em Português, os itens citam trechos do texto entre aspas. ' +
    'Equilibre itens certos e errados.',
  padrao:
    'Questões de concurso contextualizadas: cada enunciado traz uma situação, um caso ou um trecho para analisar (40 a 120 palavras), nunca pergunta seca de definição. ' +
    'Alternativas paralelas e plausíveis. O estilo desta banca ainda não foi analisado em prova real; siga o padrão geral de concursos.',
};
export const estiloDe = banca => /fgv/i.test(banca || '') ? 'FGV' : /cebraspe|cespe/i.test(banca || '') ? 'Cebraspe' : 'padrao';

const teoriaEmTexto = c => [
  String(c?.resumo5 || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  ...(c?.checklist || []),
].join('\n').slice(0, 6000);

export async function gerarQuestoes({ banca, formato = 'multipla5', materia, topico, conteudo, qtd = 5 }) {
  const ce = formato === 'certoErrado';
  const n = formato === 'multipla4' ? 4 : 5;
  const blocos = Math.max(1, Math.ceil(qtd / 5));
  const formatoJSON = ce
    ? `{"blocos":[{"base":"texto-base ou situação hipotética","comando":"julgue os itens a seguir","itens":[{"afirmacao":"","certo":true,"justificativa":""}]}]} ` +
      `com ${blocos} bloco(s) e ${qtd} itens no total`
    : `{"questoes":[{"enunciado":"","alternativas":[${n} textos sem a letra],"correta":0,"justificativa":""}]} com ${qtd} questões; ` +
      '"correta" é o índice (0 = primeira) e a justificativa explica por que a certa está certa e por que cada errada está errada';
  const o = await gerarJSON({
    system: 'Você elabora questões inéditas de concurso em português do Brasil. Nunca copie questões existentes. ' +
      'Nunca invente lei, artigo, súmula ou número. ' + ESTILO_BANCA[estiloDe(banca)] + ' Responda SOMENTE com JSON válido.',
    maxTokens: 1200 * qtd,
    user:
      `Elabore ${qtd} ${ce ? 'itens Certo/Errado' : `questões de múltipla escolha (${n} alternativas)`} sobre "${topico}" (${materia})` +
      (banca ? `, no padrão da banca ${banca}` : '') + '. ' +
      'As questões cobram a teoria abaixo, que o aluno acabou de estudar, aplicada a situações concretas.\n\n' +
      'TEORIA:\n' + teoriaEmTexto(conteudo) + '\n\nFormato da resposta: ' + formatoJSON,
  });
  return validarQuestoes(o, { formato, qtd }).map(q => embaralhar(q));
}
