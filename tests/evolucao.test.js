import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusDia, diasGanhos, limiteSeg, proximoMarco, marcosAlcancados } from '../js/nucleo/evolucao.js';

const h = n => n * 3600;

test('estados do dia para quem combinou 2 horas', () => {
  assert.equal(statusDia(0, 2).estado, 'comecar');
  assert.equal(statusDia(h(1), 2).estado, 'andamento');
  assert.equal(statusDia(h(2), 2).estado, 'meta');
  assert.equal(statusDia(h(2.5), 2).estado, 'extra');
  assert.equal(statusDia(h(3), 2).estado, 'descanso');
});
test('quanto falta e quanto passou da meta', () => {
  assert.equal(statusDia(h(1), 2).faltaSeg, h(1));
  assert.equal(statusDia(h(2.5), 2).extraSeg, h(0.5));
});
test('limite é 1,5 vez a meta, com teto de 6 horas', () => {
  assert.equal(limiteSeg(2), h(3));
  assert.equal(limiteSeg(5), h(6));
});
test('quem combinou mais que o teto não é punido', () => {
  assert.equal(limiteSeg(8), h(8));
  assert.equal(statusDia(h(8), 8).estado, 'meta');
});
test('estudar 3 h com meta de 2 h ganha meio dia', () =>
  assert.equal(diasGanhos({ a: h(3) }, 2), 0.5));
test('hora além do limite não ganha nada', () =>
  assert.equal(diasGanhos({ a: h(12) }, 2), 0.5));
test('sem meta não quebra', () => {
  assert.equal(diasGanhos({ a: 100 }, 0), 0);
  assert.equal(statusDia(100, 0).pct, 0);
});
test('marcos do edital', () => {
  assert.equal(proximoMarco(30), 50);
  assert.equal(proximoMarco(100), null);
  assert.deepEqual(marcosAlcancados(30), [10, 25]);
});
