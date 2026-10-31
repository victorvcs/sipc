import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  folhaVazia, adicionar, limpar, desfazer, temTracos, novoTraco, somarPonto, larguraDoPonto, aoEncostar,
  toqueBloqueado, serializar, desserializar, instanteSalvo, quaisApagar, LARGURA_CANETA, LARGURA_BORRACHA,
  MAX_DESFAZER, TOQUE_BLOQUEADO_MS,
} from '../js/nucleo/desenho.js';

const traco = (f = 'c') => ({ f, p: [1, 2, 4] });

test('desfazer tira o último traço e não passa da folha vazia', () => {
  let f = adicionar(adicionar(folhaVazia(), traco()), traco());
  f = desfazer(f);
  assert.equal(f.tracos.length, 1);
  assert.equal(desfazer(desfazer(f)).tracos.length, 0);
});
test('limpar também pode ser desfeito', () => {
  const f = limpar(adicionar(folhaVazia(), traco()));
  assert.equal(f.tracos.length, 0);
  assert.equal(desfazer(f).tracos.length, 1);
});
test('limpar folha vazia não cria passo de desfazer', () => {
  assert.equal(limpar(folhaVazia()).passado.length, 0);
});
test('o desfazer guarda um número limitado de passos', () => {
  let f = folhaVazia();
  for (let i = 0; i < MAX_DESFAZER + 10; i++) f = adicionar(f, traco());
  assert.equal(f.passado.length, MAX_DESFAZER);
});
test('só borracha não conta como folha com conteúdo', () => {
  assert.equal(temTracos(adicionar(folhaVazia(), traco('b'))), false);
  assert.equal(temTracos(adicionar(folhaVazia(), traco('c'))), true);
  assert.equal(temTracos(null), false);
});
test('a pressão da caneta muda a largura, dentro dos limites', () => {
  assert.ok(larguraDoPonto('c', 'pen', 1) > larguraDoPonto('c', 'pen', 0.1));
  assert.equal(larguraDoPonto('c', 'pen', 5), larguraDoPonto('c', 'pen', 1));
  assert.ok(larguraDoPonto('c', 'pen', 0) > 0);
});
test('mouse e dedo ficam com a largura fixa, mesmo informando pressão', () => {
  assert.equal(larguraDoPonto('c', 'mouse', 0.5), LARGURA_CANETA);
  assert.equal(larguraDoPonto('c', 'touch', 1), LARGURA_CANETA);
});
test('a borracha tem largura própria', () => {
  assert.equal(larguraDoPonto('b', 'pen', 0.2), LARGURA_BORRACHA);
});
test('ponto colado no anterior é ignorado', () => {
  const t = novoTraco('c');
  assert.equal(somarPonto(t, 10, 10, 4), true);
  assert.equal(somarPonto(t, 10.5, 10.5, 4), false);
  assert.equal(somarPonto(t, 20, 10, 4), true);
  assert.deepEqual(t.p, [10, 10, 4, 20, 10, 4]);
});
test('sem caneta, mouse e dedo desenham', () => {
  assert.equal(aoEncostar('mouse', null, null, 1000), 'desenhar');
  assert.equal(aoEncostar('touch', null, null, 1000), 'desenhar');
});
test('depois da caneta, o toque é tratado como palma', () => {
  assert.equal(aoEncostar('touch', null, 1000, 2000), 'ignorar');
  assert.equal(aoEncostar('touch', 'pen', 1000, 2000), 'ignorar');
});
test('o dedo volta a valer depois do tempo de bloqueio', () => {
  assert.equal(toqueBloqueado(0, TOQUE_BLOQUEADO_MS - 1), true);
  assert.equal(aoEncostar('touch', null, 0, TOQUE_BLOQUEADO_MS), 'desenhar');
});
test('a caneta substitui a palma que encostou primeiro', () => {
  assert.equal(aoEncostar('pen', 'touch', null, 1000), 'trocar');
});
test('segundo ponteiro não interrompe o traço atual', () => {
  assert.equal(aoEncostar('mouse', 'touch', null, 1000), 'ignorar');
  assert.equal(aoEncostar('pen', 'pen', 1000, 1000), 'ignorar');
});
test('serializar e ler de volta mantém os traços e o instante', () => {
  const texto = serializar(adicionar(folhaVazia(), traco()), 12345);
  assert.equal(instanteSalvo(texto), 12345);
  assert.deepEqual(desserializar(texto).tracos, [traco()]);
});
test('dado corrompido vira folha vazia', () => {
  assert.deepEqual(desserializar(null), folhaVazia());
  assert.deepEqual(desserializar('1|{quebrado'), folhaVazia());
  assert.deepEqual(desserializar('1|{"a":1}'), folhaVazia());
});
test('traço inválido é descartado na leitura', () => {
  const texto = '1|' + JSON.stringify([traco(), { f: 'x', p: [] }, { f: 'c', p: [1, 2] }, { f: 'c', p: ['a', 2, 3] }]);
  assert.deepEqual(desserializar(texto).tracos, [traco()]);
});
test('dentro dos limites nada é apagado', () => {
  assert.deepEqual(quaisApagar([{ chave: 'a', tam: 10, em: 1 }], 2, 100), []);
});
test('passando da quantidade, sai a folha mais antiga', () => {
  const l = [{ chave: 'nova', tam: 1, em: 3 }, { chave: 'velha', tam: 1, em: 1 }, { chave: 'meio', tam: 1, em: 2 }];
  assert.deepEqual(quaisApagar(l, 2, 100), ['velha']);
});
test('passando do tamanho, saem as antigas até caber', () => {
  const l = [{ chave: 'a', tam: 50, em: 1 }, { chave: 'b', tam: 50, em: 2 }, { chave: 'c', tam: 50, em: 3 }];
  assert.deepEqual(quaisApagar(l, 10, 60), ['a', 'b']);
});
