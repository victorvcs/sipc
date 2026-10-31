import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slug, idConteudo, orcamento, erroTemporario, erroDeCota, esperaAntesDeRepetir, resumoErro, criarFila, comTentativas, extrairJSON, embaralhar } from '../js/nucleo/iautil.js';
import { validarConteudo } from '../js/nucleo/validar.js';

const semEspera = async () => {};
test('cota no primeiro modelo passa para o reserva sem esperar', async () => {
  const usados = [], esperas = [];
  const r = await comTentativas({ modelos: ['a', 'b'], dormir: async ms => esperas.push(ms),
    chamar: async m => { usados.push(m); if (m === 'a') throw new Error('[429 ] quota'); return 'ok'; } });
  assert.equal(r, 'ok');
  assert.deepEqual(usados, ['a', 'b']);
  assert.deepEqual(esperas, []);
});
test('cota nos dois modelos espera a janela e tenta de novo', async () => {
  let n = 0;
  const esperas = [];
  const r = await comTentativas({ modelos: ['a', 'b'], dormir: async ms => esperas.push(ms),
    chamar: async () => { if (++n < 3) throw new Error('[429 ] quota'); return 'ok'; } });
  assert.equal(r, 'ok');
  assert.deepEqual(esperas, [61000]);
});
test('resposta inválida é repetida', async () => {
  let n = 0;
  const r = await comTentativas({ modelos: ['a'], dormir: semEspera,
    chamar: async () => { if (++n === 1) throw Object.assign(new Error('conteúdo sem mapa'), { respostaInvalida: true }); return 'ok'; } });
  assert.equal(r, 'ok');
});
test('erro definitivo sobe na hora', async () => {
  let n = 0;
  await assert.rejects(comTentativas({ modelos: ['a', 'b'], dormir: semEspera,
    chamar: async () => { n++; throw new Error('[403 ] App Check'); } }), /403/);
  assert.equal(n, 1);
});
test('tentativas esgotadas guardam a causa', async () => {
  await assert.rejects(comTentativas({ modelos: ['a'], tentativas: 2, dormir: semEspera,
    chamar: async () => { throw new Error('[503 ] overloaded'); } }), e => /ocupado/.test(e.message) && /503/.test(e.causa.message));
});
test('mapa com um nível a mais de colchetes é aceito', () => {
  const base = { historia: 'h', resumo5: 'r', pergunta: 'p', resumo1: [['a', ['b']]], analogias: ['x'], checklist: ['y'], flashcards: [['q', 'r']] };
  const c = validarConteudo({ ...base, mapa: [['Centro', [['Ramo', ['Folha']]]]] });
  assert.deepEqual(c.mapa, ['Centro', [['Ramo', ['Folha']]]]);
});

const URL_IA = 'https://firebasevertexai.googleapis.com/v1beta/projects/sipc-estudos/models/gemini-3.6-flash:generateContent';
const erro429 = Object.assign(new Error(`AI: Error fetching from ${URL_IA}: [429 ] You exceeded your current quota. Please retry in 31.2s.`),
  { code: 'fetch-error', customErrorData: { status: 429 } });

test('resumo do erro mostra o status, sem a URL que escondia a causa', () => {
  assert.equal(resumoErro(erro429).startsWith('[429] fetch-error: You exceeded your current quota'), true);
  assert.ok(!resumoErro(erro429).includes('googleapis'));
  assert.ok(resumoErro(erro429).length <= 150);
});
test('resumo usa a causa guardada quando as tentativas acabam', () => {
  const fim = Object.assign(new Error('o serviço de IA está ocupado'), { causa: erro429 });
  assert.match(resumoErro(fim), /^\[429\]/);
});
test('resumo aguenta erro sem status', () =>
  assert.equal(resumoErro(new Error('a IA devolveu uma resposta vazia')), 'a IA devolveu uma resposta vazia'));
test('falhas passageiras do servidor e da rede também são temporárias', () => {
  for (const m of ['[500 ] Internal', '[502 ] Bad Gateway', '[504 ] Deadline exceeded', `AI: Error fetching from ${URL_IA}: Failed to fetch`, 'Load failed'])
    assert.ok(erroTemporario(new Error(m)), m);
  assert.ok(!erroTemporario(new Error('[400 ] Bad request')));
  assert.ok(!erroTemporario(new Error('[403 ] App Check')));
});
test('cota: espera o tempo que a API pediu', () => {
  assert.ok(erroDeCota(erro429));
  assert.equal(esperaAntesDeRepetir(erro429, 1), 32200);
});
test('cota: lê o retryDelay dos detalhes', () => {
  const e = Object.assign(new Error('[429 ] quota'), { customErrorData: { status: 429, errorDetails: [{ retryDelay: '20s' }] } });
  assert.equal(esperaAntesDeRepetir(e, 1), 21000);
});
test('cota sem prazo informado cobre a janela de 1 minuto', () =>
  assert.equal(esperaAntesDeRepetir(new Error('[429 ] quota'), 1), 61000));
test('cota com prazo longo não fica esperando (é limite do dia)', () =>
  assert.equal(esperaAntesDeRepetir(new Error('[429 ] quota. Please retry in 3600s.'), 1), null));
test('outros erros temporários crescem a cada tentativa', () => {
  assert.equal(esperaAntesDeRepetir(new Error('[503 ] overloaded'), 2), 3000);
});
test('a fila roda uma tarefa por vez, na ordem', async () => {
  const fila = criarFila(), ordem = [];
  let rodando = 0, pico = 0;
  const tarefa = n => async () => { pico = Math.max(pico, ++rodando); await new Promise(r => setTimeout(r, 5)); ordem.push(n); rodando--; return n; };
  assert.deepEqual(await Promise.all([fila(tarefa(1)), fila(tarefa(2)), fila(tarefa(3))]), [1, 2, 3]);
  assert.deepEqual(ordem, [1, 2, 3]);
  assert.equal(pico, 1);
});
test('uma tarefa que falha não trava a fila', async () => {
  const fila = criarFila();
  await assert.rejects(fila(async () => { throw new Error('x'); }));
  assert.equal(await fila(async () => 'ok'), 'ok');
});

test('id do conteúdo sem acento e com banca padrão', () => {
  assert.equal(idConteudo('FGV', 'Língua Portuguesa', 'Crase'), 'fgv__lingua-portuguesa__crase');
  assert.equal(idConteudo('', 'Direito', 'Atos administrativos'), 'geral__direito__atos-administrativos');
  assert.equal(slug('  Ação — Teste! '), 'acao-teste');
});
test('orçamento de tokens nunca abaixo de 8000', () => {
  assert.equal(orcamento(1000), 8000);
  assert.equal(orcamento(6000), 24000);
});
test('503 e 429 são temporários; outros não', () => {
  assert.ok(erroTemporario(new Error('[503] The model is overloaded')));
  assert.ok(erroTemporario(new Error('429 Resource exhausted')));
  assert.ok(!erroTemporario(new Error('App Check token is invalid')));
});
test('extrai JSON cercado por markdown', () =>
  assert.deepEqual(extrairJSON('```json\n{"a":1}\n```'), { a: 1 }));
test('embaralhar mantém a alternativa certa', () => {
  const q = { enun: 'x', alts: ['a', 'b', 'c', 'd', 'e'], c: 2, just: 'j' };
  for (let k = 0; k < 20; k++) {
    const r = embaralhar(q);
    assert.equal(r.alts[r.c], 'c');
    assert.deepEqual([...r.alts].sort(), q.alts);
  }
  const j = { enun: 'x', alts: ['a', 'b', 'c', 'd', 'e'], c: 1, just: 'A alternativa B está correta; a letra E erra e (C) também.' };
  for (let k = 0; k < 20; k++) {
    const r = embaralhar(j), letra = i => 'ABCDE'[r.alts.indexOf(['a', 'b', 'c', 'd', 'e'][i])];
    assert.equal(r.just, `A alternativa ${letra(1)} está correta; a letra ${letra(4)} erra e (${letra(2)}) também.`);
    assert.equal('ABCDE'[r.c], letra(1));
  }
  const ce = { ce: true, alts: ['Certo', 'Errado'], c: 1 };
  assert.equal(embaralhar(ce), ce);
});
