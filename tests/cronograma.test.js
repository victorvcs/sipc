import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarCronograma, atualizarCronograma, proximasDatas, faltam, datasUrgentes, linkAgenda } from '../js/nucleo/cronograma.js';

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
