import { test } from 'node:test';
import assert from 'node:assert/strict';
import { somarDias, agendar, avaliar, vencidas, datasDeVolta } from '../js/nucleo/revisao.js';

test('somarDias atravessa mês', () => assert.equal(somarDias('2026-10-30', 3), '2026-11-02'));
test('agendar: volta em 24h', () => {
  const r = agendar('Português', 'Crase', '2026-10-19');
  assert.deepEqual([r.chave, r.etapa, r.proxima, r.consolidado], ['Português::Crase', 0, '2026-10-20', false]);
});
test('datasDeVolta = 1, 7 e 30 dias', () =>
  assert.deepEqual(datasDeVolta('2026-10-19'), ['2026-10-20', '2026-10-26', '2026-11-18']));
test('lembrei na etapa 0 → etapa 1, 7 dias após o estudo', () => {
  const r = avaliar(agendar('P', 'C', '2026-10-19'), 'lembrei', '2026-10-20');
  assert.deepEqual([r.etapa, r.proxima], [1, '2026-10-26']);
});
test('lembrei atrasado nunca agenda no passado', () => {
  const r = avaliar(agendar('P', 'C', '2026-10-01'), 'lembrei', '2026-10-15');
  assert.equal(r.proxima, '2026-10-16');
});
test('lembrei na etapa 2 → consolidado', () => {
  let r = agendar('P', 'C', '2026-10-01');
  r = avaliar(r, 'lembrei', '2026-10-02'); r = avaliar(r, 'lembrei', '2026-10-08'); r = avaliar(r, 'lembrei', '2026-10-31');
  assert.deepEqual([r.consolidado, r.proxima], [true, null]);
});
test('difícil repete a etapa', () => {
  const r = avaliar({ ...agendar('P', 'C', '2026-10-01'), etapa: 1 }, 'dificil', '2026-10-08');
  assert.deepEqual([r.etapa, r.proxima], [1, '2026-10-15']);
});
test('esqueci recomeça em 24h a partir de hoje', () => {
  const r = avaliar({ ...agendar('P', 'C', '2026-10-01'), etapa: 2 }, 'esqueci', '2026-10-31');
  assert.deepEqual([r.etapa, r.estudadoEm, r.proxima], [0, '2026-10-31', '2026-11-01']);
});
test('vencidas inclui atrasadas e exclui consolidadas', () => {
  const a = agendar('P', 'A', '2026-10-10'), b = { ...agendar('P', 'B', '2026-10-10'), consolidado: true, proxima: null };
  assert.deepEqual(vencidas([a, b], '2026-10-19').map(r => r.topico), ['A']);
});
