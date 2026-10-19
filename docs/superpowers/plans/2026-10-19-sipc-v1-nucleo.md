# SIPC v1 (núcleo) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o app atual (`index.html`) pela nova jornada validada no protótipo, com conta, banco de dados (Firestore), IA (Firebase AI Logic), feedback dos testadores e uma área de administração para o Victor ver usuários e o backlog.

**Architecture:** Site estático no GitHub Pages, sem build. O `index.html` vira uma casca que carrega módulos ES (`js/…`). A lógica pura (revisão 1-7-30, ritmo, plano do dia, leitura de planilha, validação das respostas da IA, priorização de feedback) fica em módulos sem DOM, testados com `node --test`. A interface é portada do `prototipo.html` (mesmo visual e fluxo), trocando os dados fictícios por dados reais do Firestore e da IA. Um único app Firebase modular (auth + Firestore + App Check + AI Logic), o que elimina o débito "IA em app separado".

**Tech Stack:** HTML/CSS/JS sem framework; Firebase JS SDK 12.17.1 modular via `https://www.gstatic.com/firebasejs/12.17.1/*.js` (app, auth, firestore, app-check, ai); pdf.js 3.11.174, SheetJS 0.18.5, mammoth 1.8.0 e html2canvas 1.4.1 via cdnjs; `marked` 9.1.2 já usado; testes com `node --test` (Node 24).

**Spec:** não há documento de spec separado. A fonte da verdade é: `PRODUCT.md` (regras do produto), `prototipo.html` (fluxo e visual aprovados), `GUIA_ESTILO_BANCAS.md` (padrão das questões) e as decisões abaixo.

## Decisões do Victor (19/10/2026)

- **Escopo v1 = núcleo:** conta, minhas trilhas, setup (PDF/planilha/Word/texto, banca(s), ritmo, quantidade de questões), plano do dia, estudo nas 9 seções gerado pela IA, questões no padrão da banca (A–E e Certo/Errado), revisão 1-7-30, painel, Reportar com backlog priorizado, modo teste, continuar de onde parou, rascunho em texto.
- **Fica para a v1.1:** vídeos (via API do YouTube, chave restrita ao domínio), revisões montadas pelo aluno, rascunho com desenho, alarme por calendário (.ics), mapa visual animado radial (a v1 usa a árvore animada).
- **Dados:** o Victor vê os dados de cada testador. Exige aviso de privacidade e aceite no cadastro.
- **App antigo:** substituir no mesmo link, começando do zero. Os dados antigos ficam no Firestore em `users/{uid}/sipc/*`, sem aparecer.

## Global Constraints

- Plano Spark do Firebase (sem cobrança). Nada que exija Blaze (Cloud Functions, Storage). Imagens de feedback vão como JPEG comprimido dentro do documento (≤ 700 KB).
- Firebase config, `RECAPTCHA_SITE_KEY = '6LdLwPUtAAAAAFuNqGyZsEV2KaRmNOoaZZj1b_wH'` e `IA_MODELO = 'gemini-3.6-flash'` continuam os do `index.html` atual.
- Admin = e-mail `victorvcs@gmail.com` (verificado no token: `request.auth.token.email == 'victorvcs@gmail.com' && request.auth.token.email_verified == true`).
- Revisão fixa em 1-7-30 dias a partir da data de estudo. Lembrei → próxima etapa; Difícil → repete a etapa em N dias; Esqueci → recomeça em 24 h; depois da etapa de 30 dias, consolidado.
- Cada tópico estimado em 40 min (leitura + questões); ritmo = `round(min/dia × 0,7 / 40)` tópicos novos por dia, mínimo 1.
- Questões: padrão da banca do `GUIA_ESTILO_BANCAS.md`; nunca pedir enunciado curto; banca principal com formato "Certo ou Errado" gera blocos C/E.
- Toda interface em português, sem dados inventados apresentados como reais (sem "Concurso TRT" etc.).
- Modo teste: nada é gravado no Firestore enquanto ligado; ao desligar, recarrega o estado real.

---

## Estrutura de arquivos

```
sipc-main/
  index.html                 ← casca nova (carrega css/app.css e js/main.js)
  privacidade.html           ← aviso de privacidade (LGPD) linkado no cadastro
  prototipo.html             ← fica como está (referência)
  legado/app-v0.html         ← o index.html atual, preservado
  css/app.css                ← estilos portados do prototipo.html
  js/
    main.js                  ← boot: auth → carrega usuário → roteia telas
    firebase.js              ← init único: app, auth, db, appCheck, ia
    store.js                 ← Firestore: perfil, trilhas, estado; modo teste; debounce
    nucleo/revisao.js        ← 1-7-30 (puro)
    nucleo/trilha.js         ← ritmo, fila de tópicos, plano do dia (puro)
    nucleo/planilha.js       ← linhas da planilha → matérias (puro)
    nucleo/validar.js        ← valida JSON da IA: edital, conteúdo, questões (puro)
    nucleo/prioridade.js     ← valor/esforço/quadrante do feedback (puro)
    ia.js                    ← chamadas ao Gemini + prompts (edital, conteúdo, questões)
    leitura.js               ← PDF (pdf.js), Word (mammoth), planilha (SheetJS) → texto/linhas
    ui/estado.js             ← estado da tela (S), render(), utilidades (ico, escHtml…)
    ui/entrada.js            ← login, cadastro com aceite, esqueci senha
    ui/setup.js              ← os 5 passos
    ui/hoje.js               ← plano do dia, alerta 1-7-30, continuar de onde parou
    ui/estudo.js             ← 9 seções, mapa em árvore, questões, revisão
    ui/questoes.js           ← render/correção A–E e C/E, rascunho em texto
    ui/painel.js             ← painel de andamento com dados reais
    ui/trilhas.js            ← minhas trilhas
    ui/conta.js              ← perfil, senha, notificação, sair, modo teste
    ui/feedback.js           ← botão Reportar (html2canvas → Firestore)
    ui/admin.js              ← backlog priorizado + usuários (só admin)
  tests/
    revisao.test.js  trilha.test.js  planilha.test.js  validar.test.js  prioridade.test.js
  package.json               ← {"type":"module","scripts":{"test":"node --test tests/"}}
  firestore.rules            ← regras novas
```

## Modelo de dados (Firestore)

```
users/{uid}                         {nome, email, criadoEm, ultimoAcesso, consentimento:{versao:'2026-10-19', em}}
users/{uid}/trilhas/{tid}           {prova:{nome,cargo,semEdital,fonte}, materias:[{nome,peso,faixa,topicos:[string]}],
                                     bancas:[string], ritmo:{horas,dias:[bool×7],dataProva,qtdQuestoes},
                                     criadaEm, atualizadaEm}
users/{uid}/trilhas/{tid}/estado/atual
                                    {feito:{[chaveTopico]:dataISO}, revisoes:[Revisao], parcial:{[chaveTopico]:Parcial},
                                     questoes:[{data, chaveTopico, acertos, total}], minutos:{[dataISO]:n}}
conteudos/{idConteudo}              {banca, materia, topico, conteudo:Conteudo, criadoEm, uid}   ← cache compartilhado
feedback/{fid}                      {uid, email, nome, tipo:'bug'|'melhoria', texto, tela, disp, print:dataURL|null,
                                     valor, esforco, sev, area, status:'novo', criadoEm}
```

`chaveTopico = materia + '::' + topico`. `Revisao = {chave, materia, topico, estudadoEm, etapa:0|1|2, proxima:dataISO|null, consolidado:bool, historico:[{data,resultado}]}`.

---

### Task 1: Base do projeto, testes e preservação do app antigo

**Files:**
- Create: `package.json`, `tests/sanidade.test.js`, `legado/app-v0.html` (cópia de `index.html`)

**Interfaces:**
- Produces: comando `npm test` (roda `node --test tests/`).

- [ ] **Step 1: Preservar o app atual**

```bash
cp index.html legado/app-v0.html
```

- [ ] **Step 2: Criar `package.json`** (só para os testes; o GitHub Pages ignora)

```json
{ "name": "sipc", "private": true, "type": "module", "scripts": { "test": "node --test \"tests/**/*.test.js\"" } }
```

- [ ] **Step 3: Teste de sanidade**

```js
// tests/sanidade.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
test('ambiente de teste roda', () => assert.equal(1 + 1, 2));
```

- [ ] **Step 4: Rodar** — `npm test` → `# pass 1`.
- [ ] **Step 5: Commit** — `git add package.json tests legado/app-v0.html && git commit -m "Prepara a base da v1 e preserva o app antigo em legado/"`

---

### Task 2: Revisão 1-7-30 (`js/nucleo/revisao.js`)

**Files:** Create `js/nucleo/revisao.js`, `tests/revisao.test.js`

**Interfaces:**
- Produces: `ETAPAS=[1,7,30]`, `somarDias(iso,n)→iso`, `agendar(materia,topico,dataISO)→Revisao`, `avaliar(rev,resultado,hojeISO)→Revisao` (resultado ∈ `'lembrei'|'dificil'|'esqueci'`), `vencidas(revs,hojeISO)→Revisao[]`, `datasDeVolta(dataISO)→[iso,iso,iso]`.

- [ ] **Step 1: Testes**

```js
// tests/revisao.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { somarDias, agendar, avaliar, vencidas, datasDeVolta } from '../js/nucleo/revisao.js';

test('somarDias atravessa mês', () => assert.equal(somarDias('2026-10-30', 3), '2026-11-02'));
test('agendar: volta em 24h', () => {
  const r = agendar('Português', 'Crase', '2026-10-19');
  assert.deepEqual([r.chave, r.etapa, r.proxima, r.consolidado], ['Português::Crase', 0, '2026-10-20', false]);
});
test('datasDeVolta = 1, 7 e 30 dias', () =>
  assert.deepEqual(datasDeVolta('2026-10-19'), ['2026-10-20', '2026-10-26', '2026-11-18']));
test('lembrei na etapa 0 → etapa 1, 7 dias após o estudo', () => {
  const r = avaliar(agendar('P', 'C', '2026-10-19'), 'lembrei', '2026-10-20');
  assert.deepEqual([r.etapa, r.proxima], [1, '2026-10-26']);
});
test('lembrei atrasado nunca agenda no passado', () => {
  const r = avaliar(agendar('P', 'C', '2026-10-01'), 'lembrei', '2026-10-15');
  assert.equal(r.proxima, '2026-10-16');
});
test('lembrei na etapa 2 → consolidado', () => {
  let r = agendar('P', 'C', '2026-10-01');
  r = avaliar(r, 'lembrei', '2026-10-02'); r = avaliar(r, 'lembrei', '2026-10-08'); r = avaliar(r, 'lembrei', '2026-10-31');
  assert.deepEqual([r.consolidado, r.proxima], [true, null]);
});
test('difícil repete a etapa', () => {
  const r = avaliar({ ...agendar('P', 'C', '2026-10-01'), etapa: 1 }, 'dificil', '2026-10-08');
  assert.deepEqual([r.etapa, r.proxima], [1, '2026-10-15']);
});
test('esqueci recomeça em 24h a partir de hoje', () => {
  const r = avaliar({ ...agendar('P', 'C', '2026-10-01'), etapa: 2 }, 'esqueci', '2026-10-31');
  assert.deepEqual([r.etapa, r.estudadoEm, r.proxima], [0, '2026-10-31', '2026-11-01']);
});
test('vencidas inclui atrasadas e exclui consolidadas', () => {
  const a = agendar('P', 'A', '2026-10-10'), b = { ...agendar('P', 'B', '2026-10-10'), consolidado: true, proxima: null };
  assert.deepEqual(vencidas([a, b], '2026-10-19').map(r => r.topico), ['A']);
});
```

- [ ] **Step 2: Rodar** — `npm test` → FAIL (módulo não existe).
- [ ] **Step 3: Implementar**

```js
// js/nucleo/revisao.js
// Revisão do SIPC: todo tópico volta 1, 7 e 30 dias depois de estudado.
export const ETAPAS = [1, 7, 30];

export function somarDias(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const maior = (a, b) => (a > b ? a : b);

export function agendar(materia, topico, dataISO) {
  return { chave: materia + '::' + topico, materia, topico, estudadoEm: dataISO, etapa: 0,
           proxima: somarDias(dataISO, ETAPAS[0]), consolidado: false, historico: [] };
}
export function datasDeVolta(dataISO) { return ETAPAS.map(n => somarDias(dataISO, n)); }

export function avaliar(rev, resultado, hojeISO) {
  const r = { ...rev, historico: [...(rev.historico || []), { data: hojeISO, resultado, etapa: rev.etapa }] };
  const amanha = somarDias(hojeISO, 1);
  if (resultado === 'esqueci') return { ...r, etapa: 0, estudadoEm: hojeISO, proxima: amanha, consolidado: false };
  if (resultado === 'dificil') return { ...r, proxima: somarDias(hojeISO, ETAPAS[r.etapa]) };
  if (r.etapa >= ETAPAS.length - 1) return { ...r, consolidado: true, proxima: null };
  const etapa = r.etapa + 1;
  return { ...r, etapa, proxima: maior(somarDias(r.estudadoEm, ETAPAS[etapa]), amanha) };
}
export function vencidas(revs, hojeISO) {
  return revs.filter(r => !r.consolidado && r.proxima && r.proxima <= hojeISO);
}
```

- [ ] **Step 4: Rodar** — `npm test` → todos PASS.
- [ ] **Step 5: Commit** — `git commit -am "Revisão 1-7-30 como módulo testado"` (incluindo os arquivos novos com `git add`).

---

### Task 3: Ritmo, fila de tópicos e plano do dia (`js/nucleo/trilha.js`)

**Files:** Create `js/nucleo/trilha.js`, `tests/trilha.test.js`

**Interfaces:**
- Consumes: `vencidas`, `somarDias` (Task 2).
- Produces: `MIN_TOPICO=40`; `chaveTopico(materia,topico)`; `ritmo({totalTopicos,horas,dias,dataProva,hojeISO})→{topDia,diasEstudo,diasCorridos,ateProva,folga}`; `filaDeTopicos(materias)→[{materia,topico,peso}]`; `planoDoDia({materias,feito,revisoes,parcial,hojeISO,horas})→{revisoes:Revisao[],novos:[{materia,topico}],continuar:string|null}`.

- [ ] **Step 1: Testes**

```js
// tests/trilha.test.js
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
```

- [ ] **Step 2: Rodar** → FAIL.
- [ ] **Step 3: Implementar**

```js
// js/nucleo/trilha.js
import { vencidas } from './revisao.js';
export const MIN_TOPICO = 40; // leitura + questões; vídeos entram na v1.1
export const chaveTopico = (materia, topico) => materia + '::' + topico;

export function ritmo({ totalTopicos, horas, dias, dataProva, hojeISO }) {
  const topDia = Math.max(1, Math.round((horas * 60 * 0.7) / MIN_TOPICO));
  const porSemana = dias.filter(Boolean).length || 1;
  const diasEstudo = Math.ceil(totalTopicos / topDia);
  const diasCorridos = Math.ceil((diasEstudo * 7) / porSemana);
  const ateProva = Math.max(0, Math.round((new Date(dataProva + 'T12:00:00Z') - new Date(hojeISO + 'T12:00:00Z')) / 86400000));
  return { topDia, diasEstudo, diasCorridos, ateProva, folga: ateProva - diasCorridos };
}
// Espalha os tópicos de cada matéria pelo ciclo; no empate, a de maior peso vem antes.
export function filaDeTopicos(materias) {
  const fila = [];
  materias.forEach(m => m.topicos.forEach((t, j) => fila.push({ materia: m.nome, topico: t, peso: m.peso, k: (j + 0.5) / m.topicos.length })));
  return fila.sort((a, b) => a.k - b.k || b.peso - a.peso).map(({ k, ...x }) => x);
}
export function planoDoDia({ materias, feito, revisoes, parcial, hojeISO, horas }) {
  const rev = vencidas(revisoes, hojeISO);
  const emRev = new Set(rev.map(r => r.chave));
  const { topDia } = ritmo({ totalTopicos: 1, horas, dias: [true], dataProva: hojeISO, hojeISO });
  const novos = filaDeTopicos(materias)
    .filter(x => !feito[chaveTopico(x.materia, x.topico)] && !emRev.has(chaveTopico(x.materia, x.topico)))
    .slice(0, topDia).map(({ materia, topico }) => ({ materia, topico }));
  const continuar = Object.keys(parcial || {})[0] || null;
  return { revisoes: rev, novos, continuar };
}
```

- [ ] **Step 4: Rodar** → PASS. Ajustar o teste de ritmo se o cálculo divergir só por arredondamento documentado (não mudar a fórmula da Global Constraints).
- [ ] **Step 5: Commit** — "Ritmo, fila de tópicos e plano do dia testados".

---

### Task 4: Leitura de planilha (`js/nucleo/planilha.js`) e validação das respostas da IA (`js/nucleo/validar.js`)

**Files:** Create `js/nucleo/planilha.js`, `js/nucleo/validar.js`, `tests/planilha.test.js`, `tests/validar.test.js`

**Interfaces:**
- Produces: `planilhaParaEdital(abas:[{nome, linhas:any[][]}]) → {materias:[{nome,peso,faixa,topicos}], prova:{nome,cargo,semEdital,bancaADefinir,pesoTipo}}` (lança `Error('não achei uma coluna "Matéria"')`); `validarEdital(obj)`, `validarConteudo(obj)`, `validarQuestoes(obj,{formato,qtd})` → objeto normalizado ou lança `Error` com a razão.

- [ ] **Step 1: Testes**

```js
// tests/planilha.test.js
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
  assert.deepEqual(r.materias.map(m => [m.nome, m.peso, m.faixa, m.topicos.length]), [['LGPD', 98, 'Núcleo', 3], ['Língua Inglesa', 50, 'Complementar', 1]]);
  assert.deepEqual([r.prova.nome, r.prova.semEdital, r.prova.bancaADefinir, r.prova.pesoTipo], ['Concurso ANPD', true, true, 'chance']);
});
test('sem coluna Matéria → erro claro', () =>
  assert.throws(() => planilhaParaEdital([{ nome: 'x', linhas: [['a', 'b']] }]), /Matéria/));
```

```js
// tests/validar.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarConteudo, validarQuestoes, validarEdital } from '../js/nucleo/validar.js';

test('conteúdo exige as 9 partes', () => {
  assert.throws(() => validarConteudo({ historia: 'x' }), /resumo1/);
  const ok = { historia: 'h', resumo1: [['O que é', ['a']]], resumo5: '<p>t</p>', mapa: ['Crase', [['Quando', ['a']]]],
    analogias: ['x'], checklist: ['c'], flashcards: [['p', 'r']], pergunta: 'q' };
  assert.equal(validarConteudo(ok).historia, 'h');
});
test('questões A–E: 5 alternativas e gabarito válido', () => {
  const q = { questoes: [{ enunciado: 'e', alternativas: ['a','b','c','d','e'], correta: 2, justificativa: 'j' }] };
  assert.equal(validarQuestoes(q, { formato: 'multipla5', qtd: 1 }).length, 1);
  assert.throws(() => validarQuestoes({ questoes: [{ enunciado: 'e', alternativas: ['a'], correta: 0, justificativa: 'j' }] }, { formato: 'multipla5', qtd: 1 }), /alternativas/);
});
test('questões C/E: blocos com itens', () => {
  const q = { blocos: [{ base: 'b', comando: 'c', itens: [{ afirmacao: 'a', certo: true, justificativa: 'j' }] }] };
  const r = validarQuestoes(q, { formato: 'certoErrado', qtd: 1 });
  assert.deepEqual([r[0].ce, r[0].c, r[0].alts], [true, 0, ['Certo', 'Errado']]);
});
test('edital precisa de matérias', () => assert.throws(() => validarEdital({ materias: [] }), /matéria/));
```

- [ ] **Step 2: Rodar** → FAIL.
- [ ] **Step 3: Implementar** `planilha.js` portando `lerPlanilha` do `prototipo.html` (função `lerPlanilha`, linhas ~770–830), trocando a leitura do `XLSX` por receber `abas` já lidas. Código:

```js
// js/nucleo/planilha.js
const semAcento = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const BANCAS = ['FGV','Cebraspe','FCC','Vunesp','Cesgranrio','IBFC','Instituto AOCP','Quadrix','IDECAN','Consulplan','Fundatec','IADES'];
export function dividirTopicos(txt) {
  return String(txt || '').split(/[;\n•]|,(?![^(]*\))/).map(t => t.trim().replace(/\.$/, '')).filter(Boolean)
    .map(t => t.charAt(0).toUpperCase() + t.slice(1));
}
export function planilhaParaEdital(abas) {
  let melhor = null, todoTexto = '';
  for (const aba of abas) {
    const linhas = aba.linhas;
    todoTexto += ' ' + linhas.map(r => r.join(' ')).join(' ');
    const hi = linhas.findIndex(r => r.some(c => /^(materia|disciplina)s?\b/.test(semAcento(c).trim())));
    if (hi < 0) continue;
    const h = linhas[hi].map(semAcento), col = re => h.findIndex(c => re.test(c));
    const c = { m: col(/^(materia|disciplina)/), t: col(/topico|assunto|conteudo/), p: col(/peso|pontos|questoes|valor/),
                ch: col(/chance|probab|incidencia|relevancia/), f: col(/faixa|prioridade|grupo|bloco|modulo/) };
    const dados = linhas.slice(hi + 1).filter(r => String(r[c.m] ?? '').trim());
    if (!melhor || dados.length > melhor.dados.length) melhor = { linhas, hi, c, dados };
  }
  if (!melhor || !melhor.dados.length) throw new Error('não achei uma coluna "Matéria" com conteúdo');
  const { linhas, hi, c, dados } = melhor, mats = [];
  const num = v => { const n = parseFloat(String(v).replace('%', '').replace(',', '.')); return isNaN(n) ? null : n; };
  for (const r of dados) {
    const nome = String(r[c.m]).trim();
    let m = mats.find(x => semAcento(x.nome) === semAcento(nome));
    if (!m) { m = { nome, peso: 1, topicos: [], faixa: c.f >= 0 ? String(r[c.f] ?? '').trim() : '' }; mats.push(m); }
    if (c.t >= 0) dividirTopicos(r[c.t]).forEach(t => { if (!m.topicos.includes(t)) m.topicos.push(t); });
    if (c.p >= 0 && num(r[c.p]) !== null) m.peso = num(r[c.p]);
    else if (c.ch >= 0 && num(r[c.ch]) !== null) { const v = num(r[c.ch]); m.peso = Math.round(v <= 1 ? v * 100 : v); m.chance = true; }
  }
  mats.forEach(m => { if (!m.topicos.length) m.topicos = ['Conteúdo geral de ' + m.nome]; });
  mats.sort((a, b) => b.peso - a.peso);
  const titulo = linhas.slice(0, hi).map(r => r.find(x => String(x).trim())).filter(Boolean)[0] || '';
  const [nome, ...resto] = String(titulo).split(/\s+[–—-]\s+/);
  const txt = semAcento(todoTexto);
  const aDefinir = /banca (ainda )?nao (foi )?definida|banca a definir|sem banca/.test(txt);
  const banca = aDefinir ? null : BANCAS.find(b => new RegExp('\\b' + semAcento(b) + '\\b').test(txt)) || null;
  return { materias: mats.map(({ chance, ...m }) => m), prova: {
    nome: nome || 'Minha trilha', cargo: resto.join(' – '), banca, bancaADefinir: aDefinir || !banca,
    semEdital: /edital (ainda )?nao (foi )?publicado|edital ainda nao|sem edital|antes do edital/.test(txt),
    pesoTipo: mats.some(m => m.chance) ? 'chance' : (c.p >= 0 ? 'pontos' : 'igual') } };
}
```

`validar.js`:

```js
// js/nucleo/validar.js — a IA erra formato; o app só aceita o que bate com o esperado.
const exigir = (cond, msg) => { if (!cond) throw new Error(msg); };
const texto = v => typeof v === 'string' && v.trim().length > 0;

export function validarEdital(o) {
  exigir(o && Array.isArray(o.materias) && o.materias.length, 'a IA não devolveu nenhuma matéria');
  const materias = o.materias.filter(m => texto(m.nome)).map(m => ({
    nome: m.nome.trim(), peso: Number(m.peso) > 0 ? Number(m.peso) : 1, faixa: '',
    topicos: (Array.isArray(m.topicos) ? m.topicos : []).map(String).map(t => t.trim()).filter(Boolean) }));
  exigir(materias.length, 'a IA não devolveu nenhuma matéria com nome');
  materias.forEach(m => { if (!m.topicos.length) m.topicos = ['Conteúdo geral de ' + m.nome]; });
  return { nome: texto(o.nome) ? o.nome.trim() : 'Minha trilha', banca: texto(o.banca) ? o.banca.trim() : null,
           dataProva: /^\d{4}-\d{2}-\d{2}$/.test(o.dataProva || '') ? o.dataProva : '', materias };
}
export function validarConteudo(o) {
  for (const k of ['historia', 'resumo5', 'pergunta']) exigir(texto(o?.[k]), 'conteúdo sem ' + k);
  for (const k of ['resumo1', 'analogias', 'checklist', 'flashcards']) exigir(Array.isArray(o?.[k]) && o[k].length, 'conteúdo sem ' + k);
  exigir(Array.isArray(o.mapa) && texto(o.mapa[0]) && Array.isArray(o.mapa[1]), 'conteúdo sem mapa');
  return o;
}
export function validarQuestoes(o, { formato, qtd }) {
  if (formato === 'certoErrado') {
    exigir(Array.isArray(o?.blocos) && o.blocos.length, 'sem blocos de itens');
    const itens = o.blocos.flatMap(b => (b.itens || []).map(i => {
      exigir(texto(i.afirmacao) && typeof i.certo === 'boolean' && texto(i.justificativa), 'item incompleto');
      return { ce: true, base: b.base, comando: b.comando, enun: i.afirmacao, alts: ['Certo', 'Errado'], c: i.certo ? 0 : 1, just: i.justificativa };
    }));
    exigir(itens.length, 'sem itens'); return itens.slice(0, qtd);
  }
  const n = formato === 'multipla4' ? 4 : 5;
  exigir(Array.isArray(o?.questoes) && o.questoes.length, 'sem questões');
  return o.questoes.map(q => {
    exigir(texto(q.enunciado), 'questão sem enunciado');
    exigir(Array.isArray(q.alternativas) && q.alternativas.length === n, 'questão com número errado de alternativas');
    exigir(Number.isInteger(q.correta) && q.correta >= 0 && q.correta < n && texto(q.justificativa), 'questão sem gabarito válido');
    return { enun: q.enunciado, alts: q.alternativas.map(String), c: q.correta, just: q.justificativa };
  }).slice(0, qtd);
}
```

- [ ] **Step 4: Rodar** → PASS.
- [ ] **Step 5: Commit** — "Leitura de planilha e validação das respostas da IA".

---

### Task 5: Priorização do feedback (`js/nucleo/prioridade.js`)

**Files:** Create `js/nucleo/prioridade.js`, `tests/prioridade.test.js`

**Interfaces:** Produces `classificar(tipo,texto,tela)→{sev,area,valor,esforco}`, `quadrante(item)→'ja'|'planejar'|'encaixar'|'depois'`, `ordenar(itens)→itens`.

- [ ] **Step 1: Testes**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classificar, quadrante, ordenar } from '../js/nucleo/prioridade.js';
test('bug que trava é alto valor', () => assert.equal(classificar('bug', 'o app travou e perdi a questão', 'Questões').sev, 'alta'));
test('melhoria só de cor vale pouco', () => assert.equal(classificar('melhoria', 'mudar a cor do botão de revisão', 'Hoje').valor, 2));
test('quadrantes e ordem', () => {
  const itens = [{ tipo: 'melhoria', valor: 2, esforco: 3 }, { tipo: 'bug', valor: 5, esforco: 2 }, { tipo: 'melhoria', valor: 4, esforco: 3 }];
  assert.deepEqual(itens.map(quadrante), ['depois', 'ja', 'planejar']);
  assert.deepEqual(ordenar(itens).map(i => i.valor), [5, 4, 2]);
});
```

- [ ] **Step 2: Rodar** → FAIL.
- [ ] **Step 3: Implementar** portando `classificar`, `quadrante` e `pontos` do `prototipo.html` (bloco "reportar bug ou melhoria"), recebendo `tela` como parâmetro em vez de ler `REP.tela`:

```js
// js/nucleo/prioridade.js — valor = quanto atrapalha a jornada (1–5); esforço = trabalho estimado (1–3).
export function classificar(tipo, texto, tela) {
  const t = texto.toLowerCase();
  const area = /quest|gabarito|alternativ/.test(t) ? 'Questões' : /revis/.test(t) ? 'Revisão' : /edital|pdf|planilha|arquivo|matéria/.test(t) ? 'Edital'
    : /trilha|plano|dia/.test(t) ? 'Plano e trilha' : /cor|tela|botão|fonte|layout|escuro|cortad/.test(t) ? 'Visual' : String(tela).split(' · ')[0];
  const esforco = /(cor|texto|botão|fonte|cortad|desalinh|escrit|palavra)/.test(t) ? 1
    : /(nova tela|integra|import|exporta|ia |inteligência|modo|aplicativo|notifica|whatsapp|offline)/.test(t) ? 3 : 2;
  if (tipo === 'melhoria') {
    const valor = /(visual|\bcor\b|escuro|tema|fonte|ícone)/.test(t) ? 2 : /(quest|revis|plano|trilha|edital|tempo|estudar)/.test(t) ? 4 : 3;
    return { sev: null, area, valor, esforco };
  }
  const sev = /(não (abre|carrega|salva|funciona|aparece)|trav|perdi|sumiu|apag|não consigo|erro|continuou)/.test(t) ? 'alta'
    : /(lent|demor|estranh|errad|desalinh|cortad)/.test(t) ? 'media' : 'baixa';
  return { sev, area, valor: { alta: 5, media: 3, baixa: 2 }[sev], esforco };
}
export function quadrante(i) {
  const alto = i.valor >= 4 || (i.tipo === 'bug' && i.valor >= 3), facil = i.esforco <= 2;
  return alto ? (facil ? 'ja' : 'planejar') : (facil ? 'encaixar' : 'depois');
}
const pontos = i => i.valor * 2 - i.esforco + (i.tipo === 'bug' ? 1 : 0);
const ORDEM = { ja: 0, planejar: 1, encaixar: 2, depois: 3 };
export function ordenar(itens) { return [...itens].sort((a, b) => ORDEM[quadrante(a)] - ORDEM[quadrante(b)] || pontos(b) - pontos(a)); }
```

- [ ] **Step 4: Rodar** → PASS. **Step 5: Commit** — "Priorização do feedback testada".

---

### Task 6: Firebase único e camada de dados (`js/firebase.js`, `js/store.js`)

**Files:** Create `js/firebase.js`, `js/store.js`

**Interfaces:**
- Produces (`firebase.js`): `app, auth, db, ia` e reexporta do SDK: `onAuthStateChanged, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile, signOut, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, addDoc, query, orderBy, serverTimestamp, getGenerativeModel`.
- Produces (`store.js`): `setModoTeste(bool)`, `modoTeste()`, `carregarPerfil(uid)`, `salvarPerfil(uid,dados)`, `listarTrilhas(uid)`, `criarTrilha(uid,dados)→tid`, `salvarTrilha(uid,tid,dados)`, `excluirTrilha(uid,tid)`, `carregarEstado(uid,tid)`, `salvarEstado(uid,tid,estado)` (debounce 800 ms), `lerConteudo(id)`, `gravarConteudo(id,dados)`, `enviarFeedback(dados)`, `listarFeedback()`, `listarUsuarios()`, `listarTrilhasDe(uid)`.

- [ ] **Step 1: `js/firebase.js`** — portar `firebaseConfig`, `RECAPTCHA_SITE_KEY`, `IA_MODELO` e o bloco App Check (inclusive o token de depuração em localhost) do `index.html` atual (linhas 330–420), agora com imports modulares:

```js
// js/firebase.js — um único app Firebase: login, banco, App Check e IA.
const V = 'https://www.gstatic.com/firebasejs/12.17.1/';
const { initializeApp } = await import(V + 'firebase-app.js');
const A = await import(V + 'firebase-auth.js');
const F = await import(V + 'firebase-firestore.js');
const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import(V + 'firebase-app-check.js');
const { getAI, getGenerativeModel, GoogleAIBackend } = await import(V + 'firebase-ai.js');

export const firebaseConfig = { /* copiar exatamente do index.html atual */ };
export const RECAPTCHA_SITE_KEY = '6LdLwPUtAAAAAFuNqGyZsEV2KaRmNOoaZZj1b_wH';
export const IA_MODELO = 'gemini-3.6-flash';
export const ADMIN_EMAIL = 'victorvcs@gmail.com';

export const app = initializeApp(firebaseConfig);
const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
export let debugToken = null;
if (local) { debugToken = localStorage.getItem('sipc::appcheck-debug') || crypto.randomUUID(); localStorage.setItem('sipc::appcheck-debug', debugToken); self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken; }
initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true });
export const auth = A.getAuth(app);
export const db = F.getFirestore(app);
export const ia = getAI(app, { backend: new GoogleAIBackend() });
export const { onAuthStateChanged, signInWithPopup, signInWithRedirect, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile, signOut } = A;
export const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, addDoc, query, orderBy, serverTimestamp } = F;
export { getGenerativeModel };
```

- [ ] **Step 2: `js/store.js`** com o modo teste embutido (nenhuma escrita quando ligado):

```js
// js/store.js — tudo que toca o Firestore passa por aqui. Com o modo teste
// ligado, as escritas vão para a memória e somem ao desligar.
import { db, doc, getDoc, setDoc, deleteDoc, collection, getDocs, addDoc, query, orderBy, serverTimestamp } from './firebase.js';
let teste = false; const memoria = new Map();
export const modoTeste = () => teste;
export function setModoTeste(on) { teste = on; if (!on) memoria.clear(); }
const ler = async (ref) => teste && memoria.has(ref.path) ? memoria.get(ref.path) : ((await getDoc(ref)).data() ?? null);
const gravar = async (ref, dados) => { if (teste) { memoria.set(ref.path, { ...(memoria.get(ref.path) || {}), ...dados }); return; } await setDoc(ref, dados, { merge: true }); };

export const carregarPerfil = uid => ler(doc(db, 'users', uid));
export const salvarPerfil = (uid, dados) => gravar(doc(db, 'users', uid), { ...dados, ultimoAcesso: new Date().toISOString() });
export async function listarTrilhas(uid) {
  const reais = (await getDocs(collection(db, 'users', uid, 'trilhas'))).docs.map(d => ({ id: d.id, ...d.data() }));
  if (!teste) return reais;
  const daMemoria = [...memoria].filter(([p]) => p.startsWith(`users/${uid}/trilhas/`) && p.split('/').length === 4).map(([p, v]) => ({ id: p.split('/')[3], ...v }));
  return [...reais.filter(r => !daMemoria.some(m => m.id === r.id)), ...daMemoria];
}
export async function criarTrilha(uid, dados) {
  const id = 't' + Date.now();
  await gravar(doc(db, 'users', uid, 'trilhas', id), { ...dados, criadaEm: new Date().toISOString(), atualizadaEm: new Date().toISOString() });
  return id;
}
export const salvarTrilha = (uid, tid, dados) => gravar(doc(db, 'users', uid, 'trilhas', tid), { ...dados, atualizadaEm: new Date().toISOString() });
export async function excluirTrilha(uid, tid) { if (teste) { memoria.delete(`users/${uid}/trilhas/${tid}`); return; } await deleteDoc(doc(db, 'users', uid, 'trilhas', tid, 'estado', 'atual')); await deleteDoc(doc(db, 'users', uid, 'trilhas', tid)); }
export const carregarEstado = (uid, tid) => ler(doc(db, 'users', uid, 'trilhas', tid, 'estado', 'atual'));
let pendente = null;
export function salvarEstado(uid, tid, estado) {
  clearTimeout(pendente);
  pendente = setTimeout(() => gravar(doc(db, 'users', uid, 'trilhas', tid, 'estado', 'atual'), estado), 800);
}
export const lerConteudo = id => ler(doc(db, 'conteudos', id));
export const gravarConteudo = (id, dados) => gravar(doc(db, 'conteudos', id), dados);
// O feedback sempre chega ao Victor, inclusive em modo teste: é para isso que o modo existe.
export async function enviarFeedback(dados) { await addDoc(collection(db, 'feedback'), { ...dados, modoTeste: teste, criadoEm: serverTimestamp() }); }
export const listarFeedback = async () => (await getDocs(query(collection(db, 'feedback'), orderBy('criadoEm', 'desc')))).docs.map(d => ({ id: d.id, ...d.data() }));
export const listarUsuarios = async () => (await getDocs(collection(db, 'users'))).docs.map(d => ({ uid: d.id, ...d.data() }));
export const listarTrilhasDe = async uid => (await getDocs(collection(db, 'users', uid, 'trilhas'))).docs.map(d => ({ id: d.id, ...d.data() }));
```

- [ ] **Step 3: Verificação manual** em `http://localhost:5500` (servidor `.claude/serve.mjs sipc-main 5500`): no console, `const s = await import('./js/store.js')` não deve lançar erro; com login feito, `await s.criarTrilha(uid, {prova:{nome:'x'}})` cria o documento visível no console do Firebase, e `s.setModoTeste(true)` faz a próxima `criarTrilha` não aparecer no console.
- [ ] **Step 4: Commit** — "App Firebase único e camada de dados com modo teste".

---

### Task 7: Regras do Firestore e aviso de privacidade

**Files:** Modify `firestore.rules`; Create `privacidade.html`

- [ ] **Step 1: Regras**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function logado() { return request.auth != null; }
    function dono(uid) { return logado() && request.auth.uid == uid; }
    function admin() { return logado() && request.auth.token.email == 'victorvcs@gmail.com' && request.auth.token.email_verified == true; }

    match /users/{uid} {
      allow read: if dono(uid) || admin();
      allow write: if dono(uid);
      match /{sub=**} {                       // trilhas, estado e os dados antigos (sipc/*)
        allow read: if dono(uid) || admin();
        allow write: if dono(uid);
      }
    }
    match /conteudos/{id} {                   // cache de conteúdo gerado, compartilhado entre alunos
      allow read: if logado();
      allow create: if logado() && request.resource.data.uid == request.auth.uid;
      allow update, delete: if admin();
    }
    match /feedback/{id} {
      allow create: if logado() && request.resource.data.uid == request.auth.uid
                    && request.resource.data.tipo in ['bug', 'melhoria'];
      allow read, update, delete: if admin();
    }
    match /{document=**} { allow read, write: if false; }
  }
}
```

- [ ] **Step 2: `privacidade.html`** (página simples no visual do app) com: quem é o responsável (Victor Catharino, contato victorvcs@gmail.com); o que é coletado (nome, e-mail, trilhas, edital enviado, progresso, respostas, reportes com print da tela); para que (funcionamento do app, melhoria do produto e, de forma anonimizada, pesquisa de mestrado); quem acessa (o próprio aluno e o administrador); onde fica (Google Firebase); como pedir exclusão (e-mail acima); versão `2026-10-19`.
- [ ] **Step 3: Publicar as regras** no console do Firebase (Firestore › Rules › colar › Publicar) — passo do Victor, guiado na execução.
- [ ] **Step 4: Commit** — "Regras novas (trilhas, conteúdos, feedback, admin) e aviso de privacidade".

---

### Task 8: IA — leitura de edital, conteúdo nas 9 seções e questões por banca (`js/ia.js`, `js/leitura.js`)

**Files:** Create `js/ia.js`, `js/leitura.js`

**Interfaces:**
- Consumes: `ia, getGenerativeModel, IA_MODELO` (Task 6); `validarEdital, validarConteudo, validarQuestoes` (Task 4); `lerConteudo, gravarConteudo` (Task 6).
- Produces: `gerarJSON({system,user,maxTokens})→obj` (4 tentativas em 503/429); `extrairEdital(texto,filtroCargo)→edital`; `obterConteudo({banca,materia,topico,uid})→Conteudo` (lê do cache `conteudos/{id}` antes de gerar); `gerarQuestoes({banca,formato,materia,topico,conteudo,qtd})→Questao[]`; `lerArquivo(file)→{tipo:'pdf'|'word'|'planilha', texto?, abas?}`.

- [ ] **Step 1: `leitura.js`** — PDF: portar `editalHandlePdf` do `index.html` atual (pdf.js 3.11.174, ler todas as páginas, se passar de 150 mil caracteres ficar com o final). Word: mammoth `https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js`, `mammoth.extractRawText({arrayBuffer})`. Planilha: SheetJS `XLSX.read` → `abas = wb.SheetNames.map(n => ({nome:n, linhas: XLSX.utils.sheet_to_json(wb.Sheets[n], {header:1, defval:'', raw:true})}))`. Imagem e outros formatos: lançar `Error('formato não suportado: use PDF, planilha ou Word')`.
- [ ] **Step 2: `ia.js`** — `gerarJSON` com `responseMimeType: 'application/json'`, `maxOutputTokens = max(8000, maxTokens*4)` (regra já validada no app atual) e o laço de tentativas portado de `iaGerarTexto`. Prompts:
  - **Edital:** o prompt de `editalExtrairComIA` do `index.html` atual (já devolve nome, banca, dataProva, matérias com peso e tópicos, divisão de blocos), validado por `validarEdital`.
  - **Conteúdo:** system pede JSON com `historia` (storytelling real, 2–3 parágrafos HTML), `resumo1` (lista `[rótulo, [itens]]`), `resumo5` (HTML com `<h3>` numerados e tabela quando houver comparação), `mapa` (`[centro, [[ramo, [folhas]]]]`, até 5 ramos × 5 folhas, frases de 2–5 palavras), `analogias` (4–5, HTML com o termo em `<b>`), `checklist` (5–6), `flashcards` (5 pares), `pergunta`. Contexto: nome da prova, banca e "nunca inventar lei, norma ou fato". `id = slug(banca||'geral') + '__' + slug(materia) + '__' + slug(topico)`; buscar `lerConteudo(id)` antes; gravar após validar.
  - **Questões:** system monta o padrão a partir do `GUIA_ESTILO_BANCAS.md` (texto embutido como constante `ESTILO_BANCA = {FGV:'…', Cebraspe:'…', padrao:'…'}` copiado das seções do guia), recebe a teoria (`resumo5` + `checklist`) e pede `qtd` questões. Formato A–E: `{"questoes":[{"enunciado","alternativas":[5],"correta":0-4,"justificativa"}]}`; Certo/Errado: `{"blocos":[{"base","comando","itens":[{"afirmacao","certo","justificativa"}]}]}`. Embaralhar alternativas A–E após validar (portar `embaralharAlternativas` do `index.html`). `maxTokens` = `1200 * qtd`.
- [ ] **Step 3: Verificação manual** em localhost logado (token de depuração cadastrado): `await (await import('./js/ia.js')).obterConteudo({banca:'FGV',materia:'Língua Portuguesa',topico:'Crase',uid})` devolve objeto com as 9 partes e cria `conteudos/fgv__lingua-portuguesa__crase`; segunda chamada vem do cache (sem chamada à IA, conferir na aba Network). `gerarQuestoes({banca:'Cebraspe',formato:'certoErrado',…,qtd:5})` devolve 5 itens com `ce:true`.
- [ ] **Step 4: Commit** — "IA: leitura de edital, conteúdo nas 9 seções com cache e questões por banca".

---

### Task 9: Casca, estado de tela, entrada (login/cadastro/privacidade) e conta

**Files:** Create `index.html` (substitui), `css/app.css`, `js/main.js`, `js/ui/estado.js`, `js/ui/entrada.js`, `js/ui/conta.js`

**Interfaces:**
- Produces (`ui/estado.js`): `S` (estado da tela), `render(semAnimar?)`, `registrarTela(nome, fn)`, `ico(nome)`, `escHtml(s)`, `fmtData(d, opt)`, `hojeISO()`, `avisar(texto)`.
- Consumes: `store.js`, `firebase.js` (auth).

- [ ] **Step 1: `css/app.css`** — copiar o bloco `<style>` inteiro do `prototipo.html`, removendo apenas as regras de `.painel*` (atalhos do protótipo) e `.faixa` (faixa "Protótipo").
- [ ] **Step 2: `index.html`** — casca: `<head>` com fontes e `css/app.css`; `<body>` com `<main id="app">`, o `<svg>` de símbolos de ícone copiado do protótipo, o botão Reportar e o `<dialog>` do reporte (Task 13); scripts: `marked`, `html2canvas`, e `<script type="module" src="js/main.js">`.
- [ ] **Step 3: `ui/estado.js`** — portar `ico`, `escHtml`, `fmtData`, `enunciado`, `secao`, a função `render` (com preservação de foco) e o roteador por `S.tela` do `prototipo.html`, trocando o `if/else` fixo por `registrarTela`.
- [ ] **Step 4: `ui/entrada.js`** — portar `telaEntrada` do protótipo, ligando: Google → `signInWithPopup(auth, new GoogleAuthProvider())` (fallback `signInWithRedirect` em `auth/popup-blocked`, mensagens de `authTraduzErro` do app atual); cadastro → `createUserWithEmailAndPassword` + `updateProfile({displayName})`; login → `signInWithEmailAndPassword`; esqueci → `sendPasswordResetEmail`. **Cadastro exige o checkbox** "Li e aceito o [aviso de privacidade](privacidade.html)", e grava `consentimento:{versao:'2026-10-19', em}` com `salvarPerfil`. No primeiro login com Google sem consentimento gravado, mostrar uma tela de aceite antes de seguir.
- [ ] **Step 5: `ui/conta.js`** — portar `abaConta` (sem a parte de calendário, que é v1.1): nome editável (`updateProfile` + `salvarPerfil`), troca de senha com `reauthenticateWithCredential` + `updatePassword` (só para contas de e-mail), notificação do navegador no horário (guardar `lembrete:{hora, navegador}` no perfil; checar a cada 30 s como no app atual), modo teste (chave + faixa, portando `alternarModoTeste` e chamando `setModoTeste`), sair (`signOut`).
- [ ] **Step 6: `main.js`** — `onAuthStateChanged`: sem usuário → tela `entrada`; com usuário → `carregarPerfil` (sem consentimento → aceite), `listarTrilhas` → nenhuma: setup; uma ou mais: abrir a última atualizada (`atualizadaEm`).
- [ ] **Step 7: Verificação manual** em localhost: cadastro com e-mail (exige aceite), login com Google, sair, entrar de novo, trocar senha, ligar/desligar modo teste. Conferir `users/{uid}` no console com `consentimento`.
- [ ] **Step 8: Commit** — "Casca nova, login com aceite de privacidade e conta".

---

### Task 10: Setup (5 passos) e Minhas trilhas

**Files:** Create `js/ui/setup.js`, `js/ui/trilhas.js`

**Interfaces:** Consumes `lerArquivo`, `extrairEdital` (Task 8), `planilhaParaEdital` (Task 4), `ritmo` (Task 3), `criarTrilha/salvarTrilha/listarTrilhas/excluirTrilha` (Task 6).

- [ ] **Step 1:** Portar do protótipo `telaAssist`, `passoEdital`, `passoMaterias`, `passoBanca`, `passoRitmo`, `passoPronto`, `escolhaQtd` e auxiliares, removendo `arquivoExemplo`, `provaExemplo` e todo dado fictício. Leitura real: planilha → `planilhaParaEdital`; PDF/Word/texto → `extrairEdital` (filtro de cargo do campo existente). Erros mostram a mensagem do `Error` no bloco `.erro` já existente.
- [ ] **Step 2:** `comecar()` → `criarTrilha(uid, {prova, materias, bancas, ritmo:{horas,dias,dataProva,qtdQuestoes}})` e abre a trilha.
- [ ] **Step 3:** `ui/trilhas.js` portando `telaTrilhas`, com `resumoTrilha` lendo `carregarEstado` de cada trilha; "Nova trilha" abre o setup; "Excluir" chama `excluirTrilha` após `confirm`.
- [ ] **Step 4: Verificação manual:** criar trilha com a planilha `Downloads/anpd-formacao-geral-materias.xlsx` (18 matérias, inclusive Língua Inglesa; banca a definir; edital não publicado); criar segunda trilha colando texto; alternar entre elas; conferir os documentos em `users/{uid}/trilhas`.
- [ ] **Step 5: Commit** — "Setup com leitura real do edital e Minhas trilhas".

---

### Task 11: Hoje, Trilha e Painel com dados reais

**Files:** Create `js/ui/hoje.js`, `js/ui/painel.js`

**Interfaces:** Consumes `planoDoDia, ritmo, filaDeTopicos, chaveTopico` (Task 3), `vencidas, datasDeVolta, ETAPAS` (Task 2), `carregarEstado/salvarEstado` (Task 6).

- [ ] **Step 1:** Portar `abaHoje` e `alertaDoDia` usando `planoDoDia(...)`: grupos "Revisões de hoje (24h · 7 dias · 30 dias)", "Conteúdo novo", "Para fixar" (questões do dia = `qtdQuestoes` sobre os tópicos estudados na semana), "Continuar de onde parou" a partir de `estado.parcial`. Minutos estimados: novo = `MIN_TOPICO`; revisão = 10/8/5 por etapa.
- [ ] **Step 2:** Portar `abaTrilha` (simulação de 40 dias com as revisões 1-7-30) usando `filaDeTopicos` e `estado.feito`.
- [ ] **Step 3:** Portar `abaPainel` trocando os números fixos: cobertura por matéria = tópicos em `feito` ÷ total; acerto = `estado.questoes`; constância = `estado.minutos` (somar minutos estimados ao concluir itens); "à frente/atrás do plano" = tópicos feitos vs. esperado por `ritmo` desde `criadaEm`; "Precisa de atenção" = 3 tópicos com menor acerto. Linha realizado × planejado por semana desde a criação da trilha.
- [ ] **Step 4: Verificação manual:** na trilha ANPD, marcar 2 tópicos estudados → aparecem como revisão de 24h no dia seguinte (testar trocando `hojeISO` pelo console: `S.hojeFixo='2026-10-20'`, suportado por `hojeISO()`); painel atualiza cobertura.
- [ ] **Step 5: Commit** — "Plano do dia, trilha e painel com dados reais".

---

### Task 12: Estudo nas 9 seções, questões e revisão

**Files:** Create `js/ui/estudo.js`, `js/ui/questoes.js`

**Interfaces:** Consumes `obterConteudo, gerarQuestoes` (Task 8), `agendar, avaliar` (Task 2), `salvarEstado` (Task 6).

- [ ] **Step 1:** Portar `vistaEstudo`, `abrirEstudo`, `irParte`, `guardarProgresso`, `avaliacaoRevisao`, `mapaArvoreAnimada` (a v1 usa só a árvore animada) e `escadaHTML`. Teoria: `obterConteudo` com tela de carregamento ("Gerando o conteúdo de Crase…") e botão "Tentar de novo" em erro.
- [ ] **Step 2:** `ui/questoes.js`: portar a parte de questões do estudo (lista completa, corrigir, gabarito separado, blocos C/E com `ce-base`), `vistaQuiz`/`placar` (questões do dia), `escolhaQtd` e o rascunho **só em texto** (`rascunhoHTML` sem a aba Desenhar), guardado em `estado.rascunhos`.
- [ ] **Step 3:** Ao concluir o tópico: `estado.feito[chave]=hojeISO()`, `estado.revisoes.push(agendar(...))`, apagar `estado.parcial[chave]`, registrar acertos em `estado.questoes`, `salvarEstado`. Revisão: botões Esqueci/Difícil/Lembrei → `avaliar(...)` e salvar.
- [ ] **Step 4: Verificação manual:** estudar "Crase" com banca FGV (teoria gerada, questões contextualizadas A–E), trocar a banca da trilha para Cebraspe e conferir blocos C/E; sair na parte Questões e conferir "Continuar de onde parou" depois de recarregar a página.
- [ ] **Step 5: Commit** — "Estudo nas 9 seções com IA, questões por banca e revisão 1-7-30".

---

### Task 13: Reportar e área do administrador

**Files:** Create `js/ui/feedback.js`, `js/ui/admin.js`

**Interfaces:** Consumes `classificar, quadrante, ordenar` (Task 5), `enviarFeedback, listarFeedback, listarUsuarios, listarTrilhasDe` (Task 6), `ADMIN_EMAIL` (Task 6).

- [ ] **Step 1:** Portar `abrirReporte`, `renderReporte`, `enviarReporte` (com a correção da corrida já feita no protótipo), comprimindo o print até ≤ 700 KB (`toDataURL('image/jpeg', q)` reduzindo `q` e a escala). Enviar `{uid, email, nome, tipo, texto, tela, disp, print, ...classificar(...), status:'novo'}`. Funciona também em modo teste.
- [ ] **Step 2:** `ui/admin.js` (aba "Admin" visível só se `auth.currentUser.email === ADMIN_EMAIL`): **Backlog** portando `telaBacklog` com dados de `listarFeedback()` e `ordenar`; **Usuários**: tabela com nome, e-mail, data de cadastro, último acesso, nº de trilhas e, por trilha, % do edital estudado e acerto médio (via `listarTrilhasDe` + `carregarEstado`).
- [ ] **Step 3: Verificação manual:** com uma conta de teste, reportar um bug com print; com a conta do Victor, ver o item no backlog e a conta de teste em Usuários. Conta de teste **não** vê a aba Admin e recebe erro de permissão se tentar `listarFeedback()` no console.
- [ ] **Step 4: Commit** — "Reportar com print e área do administrador".

---

### Task 14: Publicação e verificação online

**Files:** Modify `GUIA_CONFIGURACAO_FIREBASE.md`, `DEBITO_TECNICO.md`

- [ ] **Step 1:** `npm test` → todos PASS.
- [ ] **Step 2:** Victor publica as regras novas (Task 7) no console. Conferir **Authentication › Domínios autorizados** contém `victorvcs.github.io` (login com Google em produção).
- [ ] **Step 3:** Atualizar o guia (estrutura de arquivos, regras, admin) e o débito técnico (item 7 resolvido: um só app Firebase; novos itens: vídeos v1.1, limite diário de IA por usuário, App Check em Firestore/Auth).
- [ ] **Step 4:** `git push origin main`; aguardar o Pages (`gh api repos/victorvcs/sipc/pages/builds/latest`).
- [ ] **Step 5: Verificação online** em `https://victorvcs.github.io/sipc/`: cadastro com aceite, setup com planilha, estudo de um tópico com conteúdo e questões da IA, revisão, reportar, área admin com a conta do Victor. Console sem erros.
- [ ] **Step 6: Commit/push** dos documentos — "Publica a v1 e atualiza guia e débito técnico".

---

## Self-review

- **Cobertura das decisões:** conta e aceite (T7, T9) · minhas trilhas (T10) · setup com PDF/planilha/Word/texto, bancas, ritmo, quantidade (T10) · plano do dia + alerta 1-7-30 + continuar (T11) · estudo 9 seções com IA (T8, T12) · questões A–E e C/E no padrão da banca (T8, T12) · revisão 1-7-30 (T2, T12) · painel real (T11) · reportar + backlog priorizado (T5, T13) · modo teste (T6, T9) · rascunho em texto (T12) · Victor vê dados de cada usuário (T7 regras admin, T13) · começar do zero preservando o antigo (T1, T7) · vídeos e demais itens da v1.1 explicitamente fora.
- **Sem placeholders:** as partes portadas citam a função exata do `prototipo.html`/`index.html` de origem e o que muda nela.
- **Tipos consistentes:** `chaveTopico` = `materia::topico` em T2/T3/T11/T12; `Revisao` com `chave, etapa, proxima, consolidado` em T2/T3/T11/T12; questões normalizadas `{enun, alts, c, just, ce?, base?, comando?}` em T4/T8/T12.
