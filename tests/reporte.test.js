import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limparTexto, empilhar, contexto, podeEnviar, contarEnvio, avisosNovos, fechado, LIM } from '../js/nucleo/reporte.js';

test('limpa e-mail, CPF, telefone e token', () => {
  const t = limparTexto('falhou para ana.souza@gmail.com cpf 123.456.789-09 tel (21) 99876-5432 token AIzaSyD3x9kLmN0pQrStUvWx12');
  assert.ok(!/ana\.souza|123\.456|99876|AIzaSy/.test(t), t);
  assert.equal(t.match(/\[removido\]/g).length, 4);
});
test('mantém texto comum e números curtos', () => {
  assert.equal(limparTexto('Erro 429 na questão 3 de Português'), 'Erro 429 na questão 3 de Português');
  assert.equal(limparTexto('Configuração_do_edital_completa'), 'Configuração_do_edital_completa');
});
test('corta no tamanho máximo', () => assert.equal(limparTexto('x'.repeat(500)).length, LIM.erro));

test('empilhar guarda só os últimos', () => {
  let l = [];
  for (let i = 0; i < 25; i++) l = empilhar(l, i, 20);
  assert.equal(l.length, 20);
  assert.equal(l[0], 5);
  assert.equal(l[19], 24);
});

test('contexto respeita os limites das Regras', () => {
  const rastro = Array.from({ length: 30 }, (_, i) => ({ t: 'x', tipo: 'tela', d: 'y'.repeat(300), tela: 'Hoje' }));
  const erros = Array.from({ length: 8 }, () => ({ t: 'x', msg: 'erro de joao@x.com', tela: 'Hoje', extra: 1 }));
  const c = contexto({ rastro, erros, versao: '1.9' });
  assert.equal(c.rastro.length, 20);
  assert.equal(c.rastro[0].d.length, LIM.detalhe);
  assert.equal(c.erros.length, 5);
  assert.equal(c.erros[0].msg, 'erro de [removido]');
  assert.deepEqual(Object.keys(c.erros[0]), ['t', 'msg', 'tela']);
  assert.equal(c.versao, '1.9');
});

test('limite diário: 10 por dia e zera no dia seguinte', () => {
  let reg = null;
  for (let i = 0; i < 10; i++) { assert.ok(podeEnviar(reg, '2026-11-12').ok); reg = contarEnvio(reg, '2026-11-12'); }
  assert.equal(podeEnviar(reg, '2026-11-12').ok, false);
  assert.ok(podeEnviar(reg, '2026-11-13').ok);
  assert.deepEqual(contarEnvio(reg, '2026-11-13'), { dia: '2026-11-13', n: 1 });
});

test('avisos: só fechados depois da última visita', () => {
  const rs = [
    { id: 'a', status: 'resolvido', resolvidoEm: '2026-11-10T10:00:00Z' },
    { id: 'b', status: 'resolvido', resolvidoEm: '2026-11-12T10:00:00Z' },
    { id: 'c', status: 'nao-vamos', resolvidoEm: { seconds: Date.parse('2026-11-12T11:00:00Z') / 1000 } },
    { id: 'd', status: 'andamento' },
  ];
  assert.deepEqual(avisosNovos(rs, '2026-11-11T00:00:00Z').map(r => r.id), ['b', 'c']);
  assert.deepEqual(avisosNovos(rs, null).map(r => r.id), ['a', 'b', 'c']);
  assert.ok(fechado('nao-vamos') && !fechado('triado'));
});
