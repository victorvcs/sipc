import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizar, custo, maisNovo } from '../js/nucleo/metricasdev.js';

const base = {
  gerado_em: '2026-11-12T15:52:52.475Z', projeto: 'SIPC', sessoes: 16, dias_ativos: 6, inicio: '2026-11-05', fim: '2026-11-12',
  horas_claude: 2.5, horas_manuais: 1.5, horas_por_categoria: { planejamento: 1, desenvolvimento: 2, correcao: 'x', outra: 9 },
  tokens: { entrada: 10, cache_1h: 20, cache_lido: 30, saida: 40 }, tokens_total: 100, custo_usd: 50,
  semanas: { '2026-11-02': { horas: { desenvolvimento: 1 }, tokens: 5, custo_usd: 2 }, 'lixo': {} },
  titulos: ['não deve passar'],
};

test('aceita o arquivo do SIPC e guarda só os campos conhecidos', () => {
  const m = normalizar(JSON.stringify(base));
  assert.equal(m.sessoes, 16);
  assert.equal(m.horasPorCategoria.correcao, 0);
  assert.equal(m.horasPorCategoria.outra, undefined);
  assert.deepEqual(Object.keys(m.semanas), ['2026-11-02']);
  assert.equal(m.titulos, undefined);
  assert.equal(m.tokens.cache1h, 20);
});
test('recusa arquivo de outro projeto, sem data ou inválido', () => {
  assert.throws(() => normalizar({ ...base, projeto: 'Credenciado Mais' }), /não do SIPC/);
  assert.throws(() => normalizar({ ...base, gerado_em: 'ontem' }), /gerado_em/);
  assert.throws(() => normalizar('{quebrado'), /JSON válido/);
});
test('números negativos ou absurdos viram 0 ou o teto', () => {
  const m = normalizar({ ...base, horas_claude: -5, custo_usd: 1e20 });
  assert.equal(m.horasClaude, 0);
  assert.equal(m.custoUsd, 1e7);
});
test('custo pelo valor da hora, com e sem tokens', () => {
  const m = normalizar(base);
  assert.deepEqual(custo(m, { valorHora: 180, dolar: 5, comTokens: false }), { horas: 4, maoDeObra: 720, tokensReais: 250, total: 720 });
  assert.equal(custo(m, { valorHora: 180, dolar: 5, comTokens: true }).total, 970);
  assert.equal(custo(m).maoDeObra, 720); // padrão R$ 180
});
test('só substitui o salvo se o arquivo for mais novo', () => {
  const m = normalizar(base);
  assert.equal(maisNovo(m, null), true);
  assert.equal(maisNovo(m, { geradoEm: '2026-11-13T00:00:00Z' }), false);
  assert.equal(maisNovo(m, { geradoEm: '2026-11-01T00:00:00Z' }), true);
});
