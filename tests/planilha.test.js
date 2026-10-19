import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planilhaParaEdital } from '../js/nucleo/planilha.js';

const abas = [{ nome: 'Matérias', linhas: [
  ['Concurso ANPD – Especialista em Regulação'],
  ['Cenário hipotético: Edital ainda não publicado. Banca ainda não definida.'],
  ['Faixa', 'Matéria', 'Tópicos-chave', 'Chance de cair'],
  ['Núcleo', 'LGPD', 'Conceitos, princípios, bases legais', 0.98],
  ['Complementar', 'Língua Inglesa', 'Interpretação de texto', 0.5],
] }];
test('lê matérias, tópicos, chance e avisos da planilha', () => {
  const r = planilhaParaEdital(abas);
  assert.deepEqual(r.materias.map(m => [m.nome, m.peso, m.faixa, m.topicos.length]),
    [['LGPD', 98, 'Núcleo', 3], ['Língua Inglesa', 50, 'Complementar', 1]]);
  assert.deepEqual([r.prova.nome, r.prova.semEdital, r.prova.bancaADefinir, r.prova.pesoTipo],
    ['Concurso ANPD', true, true, 'chance']);
});
test('peso em pontos e banca citada', () => {
  const r = planilhaParaEdital([{ nome: 'x', linhas: [['Prova FGV 2027'], ['Disciplina', 'Peso', 'Assuntos'], ['Português', 15, 'Crase; Regência']] }]);
  assert.deepEqual([r.materias[0].peso, r.materias[0].topicos, r.prova.banca, r.prova.pesoTipo], [15, ['Crase', 'Regência'], 'FGV', 'pontos']);
});
test('sem coluna Matéria → erro claro', () =>
  assert.throws(() => planilhaParaEdital([{ nome: 'x', linhas: [['a', 'b']] }]), /Matéria/));
