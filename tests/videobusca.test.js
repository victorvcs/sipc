import { test } from 'node:test';
import assert from 'node:assert/strict';
import { topicoCurto, tentativasBusca, selecionarVideos, selecionarAberto } from '../js/nucleo/videobusca.js';

test('topicoCurto corta no primeiro separador', () => {
  assert.equal(topicoCurto('Conceitos de produtividade, eficiência, eficácia e competitividade'), 'Conceitos de produtividade');
  assert.equal(topicoCurto('1.2 Atos administrativos: espécies'), 'Atos administrativos');
  assert.equal(topicoCurto('Controle (interno e externo)'), 'Controle');
});

test('topicoCurto limita a 6 palavras', () => {
  assert.equal(topicoCurto('um dois três quatro cinco seis sete oito'), 'um dois três quatro cinco seis');
});

test('tentativasBusca vai do específico ao amplo, com no máximo 3 buscas', () => {
  const t = tentativasBusca('Administração', 'Conceitos de produtividade, eficiência');
  assert.deepEqual(t, ['Conceitos de produtividade, eficiência Administração aula concurso',
    'Conceitos de produtividade, eficiência aula concurso', 'Conceitos de produtividade aula concurso']);
});

test('tentativasBusca não repete busca igual', () => {
  assert.equal(new Set(tentativasBusca('Direito', 'Crase')).size, tentativasBusca('Direito', 'Crase').length);
});

const v = (seg, views) => ({ id: 'x', seg, views });

test('selecionarVideos fica entre 3 e 30 minutos, do mais visto para o menos visto', () => {
  const r = selecionarVideos([v(100, 900), v(600, 10), v(900, 50), v(4000, 800)]);
  assert.deepEqual(r.map(x => x.views), [50, 10]);
});

test('selecionarAberto aceita aula longa e descarta vídeo curtíssimo', () => {
  const r = selecionarAberto([v(30, 900), v(4000, 800), v(9000, 700)]);
  assert.deepEqual(r.map(x => x.views), [800]);
});

test('seleção traz no máximo 5 vídeos', () => {
  assert.equal(selecionarVideos(Array.from({ length: 8 }, (_, i) => v(600, i))).length, 5);
});

test('cache de vídeos vale por no máximo 30 dias', async () => {
  const { periodoVideos, videosVencidos } = await import('../js/nucleo/videobusca.js');
  const agora = Date.parse('2026-11-08T12:00:00Z'), dia = 86400000;
  assert.equal(videosVencidos(new Date(agora - 29 * dia).toISOString(), agora), false);
  assert.equal(videosVencidos(new Date(agora - 31 * dia).toISOString(), agora), true);
  assert.equal(videosVencidos(undefined, agora), true);
  assert.notEqual(periodoVideos(agora), periodoVideos(agora + 30 * dia));
  assert.equal(periodoVideos(agora), periodoVideos(agora + 1000));
});
