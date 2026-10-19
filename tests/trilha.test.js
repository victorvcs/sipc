import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ritmo, filaDeTopicos, planoDoDia, chaveTopico } from '../js/nucleo/trilha.js';
import { agendar } from '../js/nucleo/revisao.js';

const mats = [
  { nome: 'Dir. Adm', peso: 30, topicos: ['Atos', 'Poderes', 'Licitações', 'Contratos'] },
  { nome: 'Português', peso: 15, topicos: ['Crase', 'Regência'] },
];
test('ritmo: 1h30/dia, 5 dias → 2 tópicos/dia', () => {
  const r = ritmo({ totalTopicos: 6, horas: 1.5, dias: [1,1,1,1,1,0,0].map(Boolean), dataProva: '2026-12-31', hojeISO: '2026-10-19' });
  assert.equal(r.topDia, 2); assert.equal(r.diasEstudo, 3); assert.equal(r.diasCorridos, 5); assert.equal(r.ateProva, 73);
});
test('ritmo nunca menor que 1 tópico/dia', () =>
  assert.equal(ritmo({ totalTopicos: 3, horas: 0.25, dias: [true], dataProva: '2026-12-31', hojeISO: '2026-10-19' }).topDia, 1));
test('fila mistura matérias e prioriza peso no empate', () =>
  assert.deepEqual(filaDeTopicos(mats).slice(0, 3).map(x => x.topico), ['Atos', 'Crase', 'Poderes']));
test('plano: revisões vencidas + novos não estudados', () => {
  const feito = { [chaveTopico('Dir. Adm', 'Atos')]: '2026-10-18' };
  const revisoes = [agendar('Dir. Adm', 'Atos', '2026-10-18')];
  const p = planoDoDia({ materias: mats, feito, revisoes, parcial: {}, hojeISO: '2026-10-19', horas: 1.5 });
  assert.deepEqual(p.revisoes.map(r => r.topico), ['Atos']);
  assert.deepEqual(p.novos.map(n => n.topico), ['Crase', 'Poderes']);
});
test('plano aponta o tópico parcial para continuar', () => {
  const p = planoDoDia({ materias: mats, feito: {}, revisoes: [], parcial: { [chaveTopico('Português', 'Crase')]: { parte: 'questoes' } }, hojeISO: '2026-10-19', horas: 1.5 });
  assert.equal(p.continuar, 'Português::Crase');
});
