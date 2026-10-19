import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slug, idConteudo, orcamento, erroTemporario, extrairJSON, embaralhar } from '../js/nucleo/iautil.js';

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
  const ce = { ce: true, alts: ['Certo', 'Errado'], c: 1 };
  assert.equal(embaralhar(ce), ce);
});
