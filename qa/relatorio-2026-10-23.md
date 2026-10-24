# QA — SIPC v1 — 23/10/2026

## Resumo
Modo: completo. Ambiente: local (http://localhost:5500, IA simulada, modo sem conta) e produção só leitura (https://victorvcs.github.io/sipc/).
12 telas, 18 cenários, 17 executados (CT-18 exige conta real). Bugs: 3 alta, 4 média, 2 baixa (inclui a auditoria de segurança do código).
Veredito: **não publicar a próxima versão antes de corrigir os de alta**. O BUG-01 já está no ar: não abrir a aba Admin até a correção.

## Bugs

### BUG-01 — XSS armazenado na aba Admin (alta, segurança)
- Onde: `js/app.js`, `admBacklog` (`<img src="${i.print}">`, `class="tag ${i.sev}"`, `${i.valor}`) e `admUsuarios` (`${t.questoes}`).
- Passos: 1. Qualquer conta envia um feedback pelo console com `print:'x" onerror="..."'`. 2. O Victor abre Admin.
- Esperado: o campo aparece como imagem inválida, sem executar nada.
- Aconteceu: achado em código pelo security-auditor; não confirmado no app (exigiria conta). O caminho é direto: o valor vem do Firestore e entra no HTML sem escape.
- Sugestão: validar `print` como `data:image/jpeg;base64,...`, escapar `sev`/`valor`/`questoes`, forçar número em `acertoGeral`; schema nas regras de `feedback`.

### BUG-02 — Botão Voltar do navegador sai do app (alta, usabilidade)
- Onde: todo o app (não usa histórico).
- Passos: 1. Abrir um tópico no estudo. 2. Voltar do navegador (ou botão Voltar do Android).
- Esperado: voltar ao Plano de hoje.
- Aconteceu: o navegador sai do SIPC (`about:blank`); sem conta, perde tudo.
- Evidência: CT-06, `page.goBack()` → `about:blank`.
- Sugestão: `history.pushState` ao trocar de tela/vista e `popstate` para voltar dentro do app.

### BUG-03 — `legado/` publicado na mesma origem (alta, segurança)
- Onde: `https://victorvcs.github.io/sipc/legado/dashboard.html` responde 200.
- Esperado: páginas antigas fora do ar.
- Aconteceu: o painel antigo guarda o token do GitHub e a chave da Anthropic no `localStorage` da mesma origem; qualquer XSS lê os dois.
- Sugestão: tirar `legado/`, `prototipo.html` e `docs/` da branch publicada; revogar o token e a chave se já foram usados nesse painel.

### BUG-04 — Peso negativo aceito na matéria (média)
- Onde: setup passo 2, "+ Adicionar matéria que faltou".
- Passos: nome qualquer, peso `-5`, Adicionar.
- Aconteceu: a matéria entra com peso -5 (barra e porcentagem negativas; ordem da fila distorcida).
- Sugestão: aceitar só peso > 0.

### BUG-05 — Data da prova no passado aceita (média)
- Onde: setup passo 4.
- Passos: digitar 01/01/2020.
- Aconteceu: aceita; texto diz "a prova é em 0. Faltam 5 dias".
- Sugestão: recusar data anterior a amanhã e manter a anterior, com aviso.

### BUG-06 — Erro de IA ocupada mostra dica de PDF escaneado (média)
- Onde: setup passo 1, leitura com IA indisponível.
- Aconteceu: mensagem "[503]…" ou "o serviço de IA está ocupado" seguida de "Pode ser um PDF escaneado (imagem)…", que manda o aluno trocar de arquivo sem motivo.
- Sugestão: dica de arquivo só para erro de leitura; para IA ocupada, "Tente de novo em instantes" com botão.

### BUG-07 — Cache compartilhado de conteúdo sem validação (média, segurança)
- Onde: `js/ia.js` (`obterConteudo` não revalida o que vem do cache) e `firestore.rules` (`conteudos` sem schema).
- Aconteceu: achado em código; um documento malformado quebra o tópico para todos.
- Sugestão: `validarConteudo` também no cache (se falhar, gerar de novo); schema e tamanho nas regras.

### BUG-08 — Texto vazio usa `alert()` nativo (baixa)
- Onde: setup, "Organizar com IA" sem texto. Sugestão: mensagem inline como no resto do app.

### BUG-09 — favicon 404 (baixa)
- Onde: todas as páginas. Sugestão: ícone simples em `index.html`.

## Usabilidade
- Passou: validações do cadastro com mensagem específica e foco no campo (CT-11); erros de IA com "Tentar de novo" (CT-15); clique duplo não duplica trilha (CT-05); Reportar sem conta orienta a entrar (CT-12).
- Sem conta, atualizar a página volta à entrada e perde a trilha (CT-08): esperado e avisado no topo, mas vale um `beforeunload` pedindo confirmação quando houver trilha criada.
- Matéria com nome vazio só devolve o foco ao campo, sem mensagem (CT-09).

## Segurança
- No navegador (produção): HTTPS e HSTS ok; `.git` não exposto; sem CSP, `X-Frame-Options` e `nosniff` (o GitHub Pages não permite cabeçalhos; CSP só por `<meta>`); `localStorage` sem dado pessoal (só a última trilha aberta e o reCAPTCHA).
- No app (local): entradas com `"><i>qa</i>`, `<img onerror>`, apóstrofo e `');...//` em edital, cargo, matéria e banca aparecem como texto (CT-02/03/04); conteúdo da IA com `<script>`, `onerror` e `javascript:` é removido (CT-07).
- No código (security-auditor): BUG-01 (crítica), BUG-07 e cota de IA sem limite por usuário (alta), regras sem schema e falsificação de nome/e-mail no feedback, scripts de CDN sem SRI, SheetJS 0.18.5 e pdf.js 3.11 com CVEs conhecidas, print enviado marcado por padrão.
- Esta revisão reduz o risco, mas não substitui um pentest especializado.

## Cobertura
- Testado: fluxo sem conta completo (setup → estudo → questões → revisão → concluir), questões do dia, revisão 1-7-30 com data simulada, painel, trilha, revisões, conta (sem conta), Reportar sem conta, validações do cadastro, erros de IA, XSS por formulário, 375px em 11 telas, rótulos e teclado.
- Não testado: login real (Google/e-mail), gravação e leitura no Firestore, Reportar enviado de verdade, aba Admin com dados reais, troca de senha, lembrete por notificação, upload real de PDF/Word/planilha, IA real em localhost (App Check). Motivo: o agente não cria contas nem usa credenciais; a IA real foi validada só em produção na rodada anterior.

## Testes automatizados
- Unitários: 32 passando (`npm test`), só `js/nucleo/`.
- E2E: não criados nesta rodada. O projeto não tem Playwright; instalar (`npm init playwright@latest`) muda dependências e precisa do ok do Victor. Os roteiros usados ficam como base (fluxo sem conta com IA simulada).

## Reteste após as correções (23/10/2026)
Correções da `qa/decisao-2026-10-23.md` (6 bloqueadores + recomendados) testadas em localhost com IA simulada, modo sem conta. Todos passaram, sem erro de página:
- BUG-01 XSS no admin: `print`, `sev`, `valor` e `questoes` maliciosos não executam nada nem viram imagem; regras novas validam o feedback.
- BUG-02 Voltar do navegador: no estudo volta ao plano de hoje (progresso guardado); no setup volta ao passo anterior.
- BUG-03 `legado/` fora do repositório publicado (cópia em `versoes-anteriores/legado-sipc-main`).
- BUG-04/05: peso ≤ 0 e data passada recusados com mensagem; nenhum dia marcado bloqueia o passo 4.
- BUG-06/08: IA ocupada sem a dica de PDF, com "Tentar de novo"; texto vazio avisado na tela, sem `alert`.
- BUG-07: conteúdo do cache revalidado; formato inesperado da IA normalizado (teste unitário) e, se ainda falhar, tela de erro com saída em vez de congelar.
- BUG-09: favicon.
- Modo teste: gravação na fila é descartada ao trocar de modo (nenhuma escrita real disparada).
- Falha ao ler o estado: mostra erro e não grava nada; ao tentar de novo, abre normalmente.
- Clique duplo em Confirmar grava uma resposta só; cada resposta já entra em "continuar de onde parou".
- Limite diário de IA no modo sem conta; entrada aparece antes de o Firebase carregar; 375px sem rolagem lateral.
- Unitários: 34 passando (`node --test tests/*.test.js`).
- Não testado (exige conta): login real, gravação no Firestore, Reportar enviado, Admin real, migração da trilha do modo sem conta para a conta nova, regras novas no Firestore.
