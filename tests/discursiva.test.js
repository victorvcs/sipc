import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESTRUTURAS, TEMAS_FGV, CRITERIOS_FGV, ehFGV, textoDaEstrutura, validarCorrecao, validarExercicioLogico, validarCorrecaoLogico, somarHistorico, HISTORICO_MAX } from '../js/nucleo/discursiva.js';

const correcao = { criterios: { tema: { nota: 3, comentario: 'ok' }, tecnico: { nota: 2 }, clareza: { nota: 1.5 }, linguagem: { nota: 1 } }, bem: ['Boa estrutura'], corrigir: ['Citar causa raiz'] };

test('os critérios somam 10 pontos', () => assert.equal(CRITERIOS_FGV.reduce((t, c) => t + c.max, 0), 10));
test('tem os 10 exercícios do material e o C-D-A-R-F', () => {
  assert.equal(ESTRUTURAS.length, 11);
  assert.equal(new Set(ESTRUTURAS.map(e => e.id)).size, 11);
});
test('todo tema traz enunciado, riscos e fechamento', () => {
  assert.equal(TEMAS_FGV.length, 6);
  for (const t of TEMAS_FGV) assert.ok(t.enunciado && t.riscos.length >= 2 && t.fechamento, t.tema);
});
test('reconhece a FGV', () => { assert.ok(ehFGV('FGV')); assert.ok(!ehFGV('Cebraspe')); });
test('estrutura vira texto só com o que foi preenchido', () =>
  assert.equal(textoDaEstrutura(ESTRUTURAS[0], ['a', '', 'c']), 'Conceito: a\nAplicação: c'));
test('correção soma as notas', () => {
  const c = validarCorrecao(correcao);
  assert.equal(c.total, 7.5);
  assert.equal(c.max, 10);
});
test('nota fora da faixa é limitada ao máximo do critério', () => {
  const c = validarCorrecao({ ...correcao, criterios: { ...correcao.criterios, tema: { nota: 9 } } });
  assert.equal(c.notas[0].nota, 4);
});
test('nota é arredondada em meio ponto', () => {
  const c = validarCorrecao({ ...correcao, criterios: { ...correcao.criterios, tema: { nota: 2.74 } } });
  assert.equal(c.notas[0].nota, 2.5);
});
test('correção sem nota é recusada', () => assert.throws(() => validarCorrecao({ bem: ['x'] }), /sem nota/));
test('correção sem comentários é recusada', () => assert.throws(() => validarCorrecao({ ...correcao, bem: [], corrigir: [] }), /sem comentários/));
test('erro de língua incompleto é descartado', () => {
  const c = validarCorrecao({ ...correcao, lingua: [{ trecho: 'usuario', correcao: 'usuário', tipo: 'acento' }, { trecho: 'x' }] });
  assert.equal(c.lingua.length, 1);
});
test('exercício de lógico exige enunciado e resolução', () => {
  assert.throws(() => validarExercicioLogico({ enunciado: 'x' }), /resolução/);
  assert.equal(validarExercicioLogico({ enunciado: 'x', resolucao: 'y' }).resolucao, 'y');
});
test('correção de lógico exige o resultado', () => {
  assert.throws(() => validarCorrecaoLogico({ comentario: 'x' }));
  assert.equal(validarCorrecaoLogico({ acertou: false, erros: ['passo 2', 3] }).erros.length, 1);
});
test('histórico mantém só os mais recentes', () => {
  const l = Array.from({ length: HISTORICO_MAX }, (_, i) => i);
  const n = somarHistorico(l, 'novo');
  assert.equal(n.length, HISTORICO_MAX);
  assert.equal(n[0], 'novo');
});
