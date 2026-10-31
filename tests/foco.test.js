import { test } from 'node:test';
import assert from 'node:assert/strict';
import { focoVazio, iniciar, pausar, fecharTrecho, decorridoSeg, relogio, somaFoco, TRECHO_MAX_SEG } from '../js/nucleo/foco.js';

test('conta o tempo enquanto está rodando', () => {
  const f = iniciar(focoVazio(), 1000);
  assert.equal(decorridoSeg(f, 31000), 30);
});
test('pausar devolve os segundos e para de contar', () => {
  const { foco, seg } = pausar(iniciar(focoVazio(), 0), 45000);
  assert.equal(seg, 45);
  assert.equal(decorridoSeg(foco, 999000), 45);
});
test('retomar soma com o que já tinha', () => {
  const a = pausar(iniciar(focoVazio(), 0), 10000).foco;
  assert.equal(decorridoSeg(iniciar(a, 50000), 70000), 30);
});
test('iniciar duas vezes não reinicia o trecho', () => {
  const f = iniciar(focoVazio(), 1000);
  assert.equal(iniciar(f, 9000).desde, 1000);
});
test('gravar no meio não conta o mesmo trecho duas vezes', () => {
  const a = fecharTrecho(iniciar(focoVazio(), 0), 30000);
  const b = fecharTrecho(a.foco, 60000);
  assert.equal(a.seg + b.seg, 60);
});
test('computador que dormiu não vira horas de estudo', () => {
  assert.equal(pausar(iniciar(focoVazio(), 0), 8 * 3600 * 1000).seg, TRECHO_MAX_SEG);
});
test('relógio', () => {
  assert.equal(relogio(65), '01:05');
  assert.equal(relogio(3725), '1:02:05');
});
test('soma por período', () => {
  const d = { '2026-10-30': 60, '2026-10-31': 30 };
  assert.equal(somaFoco(d), 90);
  assert.equal(somaFoco(d, '2026-10-31', '2026-10-31'), 30);
});
