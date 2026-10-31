import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nivelDoTopico, resumoDosNiveis } from '../js/nucleo/dominio.js';

test('tópico não estudado fica a estudar', () => {
  assert.equal(nivelDoTopico({ feito: false }), 'novo');
  assert.equal(nivelDoTopico(), 'novo');
});
test('estudar sem questões não basta para ficar firme', () => {
  assert.equal(nivelDoTopico({ feito: true }), 'estudado');
});
test('acerto abaixo de 70% continua como estudado', () => {
  assert.equal(nivelDoTopico({ feito: true, acertos: 6, total: 10 }), 'estudado');
});
test('acerto de 70% ou mais deixa o tópico firme', () => {
  assert.equal(nivelDoTopico({ feito: true, acertos: 7, total: 10 }), 'firme');
});
test('questões sem estudar o tópico não contam', () => {
  assert.equal(nivelDoTopico({ feito: false, acertos: 10, total: 10 }), 'novo');
});
test('consolidado vale mesmo com acerto baixo', () => {
  assert.equal(nivelDoTopico({ feito: true, consolidado: true, acertos: 1, total: 10 }), 'consolidado');
});
test('resumo conta cada nível', () => {
  assert.deepEqual(resumoDosNiveis(['novo', 'novo', 'firme']), { novo: 2, estudado: 0, firme: 1, consolidado: 0 });
});
