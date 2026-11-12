import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classificar, quadrante, ordenar } from '../js/nucleo/prioridade.js';

test('bug que trava é alto valor', () =>
  assert.equal(classificar('bug', 'o app travou e perdi a questão', 'Questões').sev, 'alta'));
test('melhoria só de cor vale pouco, mesmo citando revisão', () =>
  assert.equal(classificar('melhoria', 'mudar a cor do botão de revisão', 'Hoje').valor, 2));
test('área cai na tela quando o texto não indica', () =>
  assert.equal(classificar('bug', 'algo estranho', 'Configuração · Ritmo').area, 'Configuração'));
test('impacto escolhido manda na gravidade do bug', () => {
  assert.equal(classificar('bug', 'o app travou', 'Hoje', 'incomoda').sev, 'baixa');
  assert.equal(classificar('bug', 'cor estranha', 'Hoje', 'bloqueia').valor, 5);
  assert.equal(classificar('bug', 'o app travou', 'Hoje', null).sev, 'alta');
});
test('melhoria ignora o impacto', () =>
  assert.equal(classificar('melhoria', 'mudar a cor', 'Hoje', 'bloqueia').valor, 2));
test('quadrantes e ordem', () => {
  const itens = [{ tipo: 'melhoria', valor: 2, esforco: 3 }, { tipo: 'bug', valor: 5, esforco: 2 }, { tipo: 'melhoria', valor: 4, esforco: 3 }];
  assert.deepEqual(itens.map(quadrante), ['depois', 'ja', 'planejar']);
  assert.deepEqual(ordenar(itens).map(i => i.valor), [5, 4, 2]);
});
