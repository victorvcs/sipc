import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarCronograma, atualizarCronograma, proximasDatas, faltam, datasUrgentes, linkAgenda, normalizarData, trechoDeDatas } from '../js/nucleo/cronograma.js';

test('descarta data inválida, repetida e sem nome, e ordena', () => {
  const l = validarCronograma([
    { evento: 'Prova', inicio: '2026-12-20' }, { evento: 'Inscrição', inicio: '2026-11-01', fim: '2026-11-30' },
    { evento: 'prova', inicio: '2026-12-20' }, { evento: 'Resultado', inicio: 'a definir' }, { evento: '', inicio: '2026-11-02' }, null,
  ]);
  assert.deepEqual(l.map(i => i.evento), ['Inscrição', 'Prova']);
});
test('aceita lista ausente e fim anterior ao início', () => {
  assert.deepEqual(validarCronograma(undefined), []);
  assert.equal(validarCronograma([{ evento: 'x', inicio: '2026-11-02', fim: '2026-11-01' }])[0].fim, '');
});
test('retificação troca as datas da IA e mantém as do aluno', () => {
  const atual = [{ evento: 'Prova', inicio: '2026-12-20', fim: '', manual: false }, { evento: 'Comprar caneta', inicio: '2026-12-10', fim: '', manual: true }];
  const l = atualizarCronograma(atual, [{ evento: 'Prova', inicio: '2027-01-10' }]);
  assert.deepEqual(l.map(i => [i.evento, i.inicio]), [['Comprar caneta', '2026-12-10'], ['Prova', '2027-01-10']]);
});
test('período aberto continua nas próximas datas', () => {
  const l = validarCronograma([{ evento: 'Inscrição', inicio: '2026-10-01', fim: '2026-11-05' }, { evento: 'Passou', inicio: '2026-10-02' }]);
  assert.deepEqual(proximasDatas(l, '2026-10-31').map(i => i.evento), ['Inscrição']);
});
test('faltam conta até o início, ou até o fim do período aberto', () => {
  assert.equal(faltam({ inicio: '2026-11-03', fim: '' }, '2026-10-31'), 3);
  assert.equal(faltam({ inicio: '2026-10-01', fim: '2026-11-05' }, '2026-10-31'), 5);
});
test('urgentes respeitam a janela', () => {
  const l = validarCronograma([{ evento: 'Perto', inicio: '2026-11-03' }, { evento: 'Longe', inicio: '2026-12-20' }]);
  assert.deepEqual(datasUrgentes(l, '2026-10-31').map(i => i.evento), ['Perto']);
});
test('link da agenda: dia inteiro, com fim exclusivo e texto codificado', () => {
  const u = new URL(linkAgenda({ evento: 'Fim & início', inicio: '2026-11-30', fim: '' }, 'ABDI'));
  assert.equal(u.hostname, 'calendar.google.com');
  assert.equal(u.searchParams.get('dates'), '20261130/20261201');
  assert.equal(u.searchParams.get('text'), 'Fim & início · ABDI');
});

test('aceita a data no formato do edital', () => {
  const [i] = validarCronograma([{ evento: 'Prova', inicio: '12/11/2026', fim: '13.11.2026' }]);
  assert.equal(i.inicio, '2026-11-12');
  assert.equal(i.fim, '2026-11-13');
  assert.equal(normalizarData('2026-11-12'), '2026-11-12');
});
test('o trecho guarda as datas de um edital enorme, mesmo no começo do arquivo', () => {
  const texto = 'EDITAL 1/2026 ANPD. Inscrições de 05/11/2026 a 20/11/2026. ' + 'conteúdo '.repeat(100000);
  const t = trechoDeDatas(texto);
  assert.ok(t.includes('05/11/2026') && t.includes('20/11/2026'));
  assert.ok(t.length < 5000);
});
test('o trecho entende data por extenso e ignora número de lei', () => {
  assert.ok(trechoDeDatas('A prova será em 15 de março de 2027.').includes('15 de março'));
  assert.equal(trechoDeDatas('Lei nº 13.709/2018, artigo 5.'), '');
});
test('texto sem data não gera trecho', () => assert.equal(trechoDeDatas('sem nada aqui'), ''));

test('link do Outlook com dia inteiro e fim exclusivo', async () => {
  const { linkOutlook } = await import('../js/nucleo/cronograma.js');
  const u = new URL(linkOutlook({ evento: 'Prova', inicio: '2026-12-20', fim: '' }, 'TRT'));
  assert.equal(u.hostname, 'outlook.live.com');
  assert.equal(u.searchParams.get('startdt'), '2026-12-20');
  assert.equal(u.searchParams.get('enddt'), '2026-12-21');
  assert.equal(u.searchParams.get('subject'), 'Prova · TRT');
});
test('conferir retificação: só datas do edital, até 2 dias antes', async () => {
  const { conferirRetificacao } = await import('../js/nucleo/cronograma.js');
  const l = validarCronograma([
    { evento: 'Prova', inicio: '2026-11-10' }, { evento: 'Hoje', inicio: '2026-11-08' },
    { evento: 'Longe', inicio: '2026-11-11' }, { evento: 'Minha', inicio: '2026-11-09', manual: true },
  ]);
  assert.deepEqual(conferirRetificacao(l, '2026-11-08').map(i => i.evento), ['Prova']);
  assert.deepEqual(conferirRetificacao(undefined, '2026-11-08'), []);
});
test('arquivo .ics: eventos de dia inteiro, alarmes e texto escapado', async () => {
  const { gerarIcs } = await import('../js/nucleo/cronograma.js');
  const ics = gerarIcs([
    { evento: 'Inscrição; taxa, boleto', inicio: '2026-11-01', fim: '2026-11-30' },
    { evento: 'Comprar caneta', inicio: '2026-12-10', manual: true },
  ], 'TRT', new Date('2026-11-08T12:00:00Z'));
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.match(ics, /DTSTART;VALUE=DATE:20261101\r\nDTEND;VALUE=DATE:20261201/);
  assert.match(ics, /SUMMARY:Inscrição\\; taxa\\, boleto · TRT/);
  assert.equal((ics.match(/BEGIN:VALARM/g) || []).length, 3); // retificação só na data do edital
  const bytes = l => new TextEncoder().encode(l).length;
  assert.ok(ics.split('\r\n').every(l => bytes(l) <= 75));
  const longo = gerarIcs([{ evento: 'Ã'.repeat(150), inicio: '2026-11-01' }]);
  assert.ok(longo.split('\r\n').every(l => bytes(l) <= 75));
  assert.match(longo.replace(/\r\n /g, ''), new RegExp('SUMMARY:' + 'Ã'.repeat(150)));
});

test('vários arquivos: cada um entra com sua parte e o próprio começo', async () => {
  const { juntarTrechos } = await import('../js/nucleo/cronograma.js');
  const edital = 'EDITAL 2027 ' + 'x'.repeat(5000) + ' inscrições de 10/01 a 20/01 ' + 'y'.repeat(5000);
  const crono = 'CRONOGRAMA ANEXO II prova em 15/03/2027';
  const t = juntarTrechos([edital, '', crono, 'sem data nenhuma aqui']);
  assert.match(t, /=== ARQUIVO 1 ===\nEDITAL 2027/);
  assert.match(t, /=== ARQUIVO 2 ===\nCRONOGRAMA ANEXO II/);
  assert.match(t, /10\/01 a 20\/01/);
  assert.equal(juntarTrechos([]), '');
  assert.ok(juntarTrechos([edital, edital], 1000).length <= 1000);
});
