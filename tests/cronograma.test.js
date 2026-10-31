import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarCronograma, atualizarCronograma, proximasDatas, faltam, datasUrgentes, linkAgenda, normalizarData, trechoDeDatas } from '../js/nucleo/cronograma.js';

test('descarta data inválida, repetida e sem nome, e ordena', () => {
  const l = validarCronograma([
    { evento: 'Prova', inicio: '2026-12-20' }, { evento: 'Inscrição', inicio: '2026-11-01', fim: '2026-11-30' },
    { evento: 'prova', inicio: '2026-12-20' }, { evento: 'Resultado', inicio: 'a definir' }, { evento: '', inicio: '2026-11-02' }, null,
  ]);
  assert.deepEqual(l.map(i => i.evento), ['Inscrição', 'Prova']);
});
test('aceita lista ausente e fim anterior ao início', () => {
  assert.deepEqual(validarCronograma(undefined), []);
  assert.equal(validarCronograma([{ evento: 'x', inicio: '2026-11-02', fim: '2026-11-01' }])[0].fim, '');
});
test('retificação troca as datas da IA e mantém as do aluno', () => {
  const atual = [{ evento: 'Prova', inicio: '2026-12-20', fim: '', manual: false }, { evento: 'Comprar caneta', inicio: '2026-12-10', fim: '', manual: true }];
  const l = atualizarCronograma(atual, [{ evento: 'Prova', inicio: '2027-01-10' }]);
  assert.deepEqual(l.map(i => [i.evento, i.inicio]), [['Comprar caneta', '2026-12-10'], ['Prova', '2027-01-10']]);
});
test('período aberto continua nas próximas datas', () => {
  const l = validarCronograma([{ evento: 'Inscrição', inicio: '2026-10-01', fim: '2026-11-05' }, { evento: 'Passou', inicio: '2026-10-02' }]);
  assert.deepEqual(proximasDatas(l, '2026-10-31').map(i => i.evento), ['Inscrição']);
});
test('faltam conta até o início, ou até o fim do período aberto', () => {
  assert.equal(faltam({ inicio: '2026-11-03', fim: '' }, '2026-10-31'), 3);
  assert.equal(faltam({ inicio: '2026-10-01', fim: '2026-11-05' }, '2026-10-31'), 5);
});
test('urgentes respeitam a janela', () => {
  const l = validarCronograma([{ evento: 'Perto', inicio: '2026-11-03' }, { evento: 'Longe', inicio: '2026-12-20' }]);
  assert.deepEqual(datasUrgentes(l, '2026-10-31').map(i => i.evento), ['Perto']);
});
test('link da agenda: dia inteiro, com fim exclusivo e texto codificado', () => {
  const u = new URL(linkAgenda({ evento: 'Fim & início', inicio: '2026-11-30', fim: '' }, 'ABDI'));
  assert.equal(u.hostname, 'calendar.google.com');
  assert.equal(u.searchParams.get('dates'), '20261130/20261201');
  assert.equal(u.searchParams.get('text'), 'Fim & início · ABDI');
});

test('aceita a data no formato do edital', () => {
  const [i] = validarCronograma([{ evento: 'Prova', inicio: '12/11/2026', fim: '13.11.2026' }]);
  assert.equal(i.inicio, '2026-11-12');
  assert.equal(i.fim, '2026-11-13');
  assert.equal(normalizarData('2026-11-12'), '2026-11-12');
});
test('o trecho guarda as datas de um edital enorme, mesmo no começo do arquivo', () => {
  const texto = 'EDITAL 1/2026 ANPD. Inscrições de 05/11/2026 a 20/11/2026. ' + 'conteúdo '.repeat(100000);
  const t = trechoDeDatas(texto);
  assert.ok(t.includes('05/11/2026') && t.includes('20/11/2026'));
  assert.ok(t.length < 5000);
});
test('o trecho entende data por extenso e ignora número de lei', () => {
  assert.ok(trechoDeDatas('A prova será em 15 de março de 2027.').includes('15 de março'));
  assert.equal(trechoDeDatas('Lei nº 13.709/2018, artigo 5.'), '');
});
test('texto sem data não gera trecho', () => assert.equal(trechoDeDatas('sem nada aqui'), ''));
