import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registroDaCorrecao, fugiuDoTema, resumoEvolucao, anteriorDe } from '../js/nucleo/discursiva.js';
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

const reg = (id, total, tema = 2, tipo = 'redacao') => ({ id, tipo, total, max: 10, data: '2026-10-31',
  notas: [{ id: 'tema', rot: 'Tema', max: 4, nota: tema }, { id: 'clareza', rot: 'Clareza', max: 2, nota: 1.5 }] });

test('o registro guarda o relatório e não guarda foto', () => {
  const r = registroDaCorrecao(validarCorrecao(correcao), { data: '2026-10-31', tipo: 'redacao', banca: 'FGV', tema: 'LGPD', texto: 'meu texto', foto: 'x' });
  assert.equal(r.tema, 'LGPD');
  assert.equal(r.texto, 'meu texto');
  assert.equal(r.notas.length, 4);
  assert.ok(!('foto' in r));
});
test('resposta enorme da IA é cortada antes de gravar', () => {
  const c = { ...validarCorrecao(correcao), modelo: 'x'.repeat(50000), corrigir: Array(50).fill('y') };
  const r = registroDaCorrecao(c, { data: '', tipo: 'redacao', texto: 'z'.repeat(50000) });
  assert.ok(r.modelo.length <= 8000 && r.texto.length <= 12000 && r.corrigir.length <= 10);
  assert.ok(JSON.stringify(r).length < 200000);
});
test('nota baixa em tema indica fuga do tema', () => {
  assert.equal(fugiuDoTema({ notas: [{ id: 'tema', max: 4, nota: 0 }] }), true);
  assert.equal(fugiuDoTema({ notas: [{ id: 'tema', max: 4, nota: 2 }] }), false);
  assert.equal(fugiuDoTema({}), false);
});
test('sem redação, não há evolução', () => assert.equal(resumoEvolucao([reg('e', 5, 2, 'estrutura')]).qtd, 0));
test('com uma redação, ainda não há comparação', () => {
  const e = resumoEvolucao([reg('a', 6)]);
  assert.equal(e.qtd, 1);
  assert.equal(e.diferenca, null);
});
test('com uma redação, já mostra critérios e o que corrigir', () => {
  const r = { ...reg('a', 6), id: 'r1', corrigir: ['Citar causa raiz', 'Fechar com proposta', 'Rever vírgulas', 'Quarto item'] };
  const e = resumoEvolucao([r]);
  assert.equal(e.criterios.length, 2);
  assert.ok(e.criterios.every(c => c.ultima === c.media));
  assert.deepEqual(e.corrigir, ['Citar causa raiz', 'Fechar com proposta', 'Rever vírgulas']);
  assert.equal(e.idUltima, 'r1');
  assert.deepEqual(resumoEvolucao([{ tipo: 'redacao', nota: 5, max: 10, data: '2026-10-01' }]).corrigir, []);
});
test('compara com a anterior e calcula a média das últimas', () => {
  const e = resumoEvolucao([reg('c', 8), reg('b', 5.5), reg('a', 2)]);
  assert.equal(e.diferenca, 2.5);
  assert.equal(e.media, 5.2);
  assert.deepEqual(e.serie.map(s => s.nota), [2, 5.5, 8]);
});
test('o ponto fraco é o critério com menor aproveitamento', () => {
  assert.equal(resumoEvolucao([reg('a', 6, 1)]).pontoFraco.id, 'tema');
  assert.equal(resumoEvolucao([reg('a', 6, 3.5)]).pontoFraco.id, 'clareza');
});
test('histórico antigo, só com a nota, entra na conta', () => {
  const e = resumoEvolucao([reg('b', 7), { tipo: 'redacao', nota: 5, max: 10 }]);
  assert.equal(e.diferenca, 2);
  assert.equal(e.qtd, 2);
});
test('a anterior de uma correção é a redação seguinte da lista, ignorando estrutura', () => {
  const l = [reg('c', 8), reg('e', 3, 1, 'estrutura'), reg('b', 5), reg('a', 2)];
  assert.equal(anteriorDe(l, l[0]).id, 'b');
  assert.equal(anteriorDe(l, l[3]), null);
  assert.equal(anteriorDe(l, { id: 'nenhuma' }), null);
});
