import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarConteudo, validarQuestoes, validarEdital } from '../js/nucleo/validar.js';

const conteudoOk = { historia: 'h', resumo1: [['O que é', ['a']]], resumo5: '<p>t</p>', mapa: ['Crase', [['Quando', ['a']]]],
  analogias: ['x'], checklist: ['c'], flashcards: [['p', 'r']], pergunta: 'q' };

test('conteúdo exige as partes', () => {
  assert.throws(() => validarConteudo({ historia: 'x' }), /resumo/);
  assert.equal(validarConteudo(conteudoOk).historia, 'h');
});
test('questões A–E: 5 alternativas e gabarito válido', () => {
  const q = { questoes: [{ enunciado: 'e', alternativas: ['a', 'b', 'c', 'd', 'e'], correta: 2, justificativa: 'j' }] };
  assert.deepEqual(validarQuestoes(q, { formato: 'multipla5', qtd: 1 })[0], { enun: 'e', alts: ['a', 'b', 'c', 'd', 'e'], c: 2, just: 'j' });
  assert.throws(() => validarQuestoes({ questoes: [{ enunciado: 'e', alternativas: ['a'], correta: 0, justificativa: 'j' }] },
    { formato: 'multipla5', qtd: 1 }), /alternativas/);
});
test('questões C/E: blocos com itens', () => {
  const q = { blocos: [{ base: 'b', comando: 'c', itens: [{ afirmacao: 'a', certo: false, justificativa: 'j' }] }] };
  const r = validarQuestoes(q, { formato: 'certoErrado', qtd: 1 });
  assert.deepEqual([r[0].ce, r[0].c, r[0].alts, r[0].base], [true, 1, ['Certo', 'Errado'], 'b']);
});
test('qtd limita o total', () => {
  const q = { questoes: Array.from({ length: 4 }, () => ({ enunciado: 'e', alternativas: ['a', 'b', 'c', 'd', 'e'], correta: 0, justificativa: 'j' })) };
  assert.equal(validarQuestoes(q, { formato: 'multipla5', qtd: 2 }).length, 2);
});
test('edital precisa de matérias e normaliza', () => {
  assert.throws(() => validarEdital({ materias: [] }), /matéria/);
  const e = validarEdital({ nome: 'X', banca: 'FGV', dataProva: '2027-03-14', materias: [{ nome: 'Português', peso: '15', topicos: [] }] });
  assert.deepEqual([e.materias[0].peso, e.materias[0].topicos, e.dataProva], [15, ['Conteúdo geral de Português'], '2027-03-14']);
});
