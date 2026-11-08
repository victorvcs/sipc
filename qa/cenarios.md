# SIPC — Cenários de QA

Base para a regressão: a cada rodada, atualize os resultados em vez de recomeçar.
Prioridade = impacto × probabilidade. Última rodada: 23/10/2026 (v1, commit cdabc18).

## Mapa de telas (app de uma página só, sem rotas na URL)

| Tela (`S.tela` / aba) | O que é | Perfil | Ações / formulários | Risco |
|---|---|---|---|---|
| `entrada` | Google, cadastro, login, esqueci senha, sem conta | anônimo | e-mail, senha, nome, aceite | alto |
| `aceite` | aceite do aviso de privacidade no 1º login Google | logado | checkbox | médio |
| `assist` (5 passos) | edital → matérias → banca → ritmo → pronto | todos | upload PDF/Word/planilha, texto colado, matérias, bancas, datas | alto |
| `app` · Hoje | plano do dia, continuar, alerta | todos | abrir item | alto |
| `app` · estudo | 9 seções (IA), mapa, questões, revisão 1-7-30 | todos | responder, corrigir, Esqueci/Difícil/Lembrei, rascunho | alto |
| `app` · questões do dia | quiz dos tópicos da semana | todos | confirmar, próxima | médio |
| `app` · Painel / Trilha / Revisões | indicadores e agenda | todos | links para estudar | médio |
| `app` · Conta | nome, senha, lembrete, modo teste, sair | logado | formulários | médio |
| `app` · Admin | backlog e usuários | admin | atualizar, filtros | alto (dados pessoais) |
| `trilhas` | minhas trilhas | todos | abrir, excluir, nova | médio |
| diálogo Reportar | bug/melhoria com print | logado | texto, tipo, print | médio |
| `privacidade.html` | aviso LGPD | público | — | baixo |

**Fluxos principais**
1. Sem conta: entrada → sem conta → edital (texto) → matérias → banca → ritmo → pronto → Hoje → estudo → questões → revisão → concluir.
2. Conta nova: entrada → cadastro (aceite) → setup → Hoje.
3. Volta no dia seguinte: login → Hoje (revisão 24h) → estudo → Lembrei.
4. Feedback: qualquer tela → Reportar → enviado → Admin vê.

## Cenários

| ID | Prioridade | Cenário | Esperado | Resultado |
|---|---|---|---|---|
| CT-01 | alta | Fluxo 1 completo, sem conta, com IA simulada | chega ao Hoje, estudo conclui, revisão agendada para amanhã | passou (reteste 23/10) |
| CT-02 | alta | Texto colado com `"><i>qa</i>`, emoji e acentos no edital e no cargo | aparece como texto, nada interpretado como HTML | passou (reteste 23/10) |
| CT-03 | alta | Matéria nova com nome `<img src=x onerror=...>` e com apóstrofo | aparece escapada; botões da matéria funcionam | passou (reteste 23/10) |
| CT-04 | alta | Banca digitada com `');alert(1);//` | aparece como texto; remover funciona | passou (reteste 23/10) |
| CT-05 | alta | Clique duplo em "Começar hoje" | cria só 1 trilha | passou (reteste 23/10) |
| CT-06 | alta | Botão Voltar do navegador dentro do app | não perde o trabalho nem sai do app sem aviso | passou (reteste 23/10) |
| CT-07 | alta | Conteúdo da IA com `<script>`, `onerror`, `javascript:` | removido antes de renderizar | passou (reteste 23/10) |
| CT-08 | média | Atualizar (F5) no meio do setup e do estudo, sem conta | aviso claro de que nada é salvo | passou (reteste 23/10) |
| CT-09 | média | Matéria com nome vazio / duplicado; remover todas as matérias | bloqueia com mensagem; Continuar desabilitado | passou (reteste 23/10) |
| CT-10 | média | Data da prova no passado ou apagada | recusada ou corrigida | passou (reteste 23/10) |
| CT-11 | média | Cadastro: e-mail inválido, senha curta, sem aceite | mensagem específica em cada caso | passou (reteste 23/10) |
| CT-12 | média | Reportar sem conta | pede login, não quebra | passou (reteste 23/10) |
| CT-13 | média | Teclado: Tab pelos botões, Enter em itens, Esc no diálogo | tudo alcançável, foco visível | passou (reteste 23/10) |
| CT-14 | média | 375px: entrada, setup, Hoje, estudo, questões, painel | sem rolagem lateral, nada cortado | passou (reteste 23/10) |
| CT-15 | média | Erro da IA (simulado) na leitura, no conteúdo e nas questões | mensagem humana + "Tentar de novo" | passou (reteste 23/10) |
| CT-16 | média | Produção: headers, `.git`, source maps, dados no localStorage | nada sensível exposto | parcial: `.git` ok; `legado/` sai do ar ao publicar; sem CSP (risco aceito) |
| CT-17 | baixa | favicon, título, idioma da página | sem 404 no console | passou (reteste 23/10) |
| CT-18 | alta | Login real, gravação no Firestore, Reportar real, Admin real | dados persistem; Admin só para o Victor | passou com a conta do Victor (24/10): perfil, aceite, trilha, sessões e Reportar no Firestore; reporte visível no Admin |

## v1.8 (08/11/2026, branch `feature/v1.8`)

Executados em localhost:5502, sem conta, com trilha de exemplo injetada e IA simulada (a IA real dá 403 em localhost sem o token de depuração do App Check).

| ID | Prioridade | Cenário | Esperado | Resultado |
|---|---|---|---|---|
| CT-19 | alta | Datas: X em data do edital e em data do aluno; chamar `removerData` direto numa data do edital | X só na data do aluno; a do edital não sai | passou |
| CT-20 | alta | Datas: botões Google e Outlook | links com título, dia inteiro e fim exclusivo; texto diferente para data do aluno | passou (após corrigir BUG-02) |
| CT-21 | alta | Baixar .ics | `text/calendar`, só datas futuras, alarme na véspera e de retificação só nas do edital | passou (4 eventos, 7 alarmes) |
| CT-22 | média | Lembrete de retificação 2 dias antes | nota na aba Datas, no aviso de Hoje e no lembrete do navegador | passou (nota e aviso; notificação do navegador não testada) |
| CT-23 | alta | Vários arquivos (2 válidos + 1 sem texto); 6 arquivos | uma chamada de IA com a lista; 6 recusados com mensagem | passou |
| CT-24 | média | Discursiva com uma redação | critérios, ponto fraco, até 3 itens a corrigir, botão abre a correção | passou |
| CT-25 | média | IA entrega 8 de 10 questões | aviso "Vieram 8 de 10" com gerar de novo | passou |
| CT-26 | média | Alerta de Novidades da versão nova | lista o que a v1.8 trouxe | passou (após corrigir BUG-01) |
| CT-27 | média | Datas em 375px | sem rolagem lateral | passou |
| CT-28 | baixa | privacidade.html cita o YouTube | seção com links dos termos | passou |
| CT-29 | média | Admin: apagar vídeos vencidos | botão aparece; apaga só os vencidos | parcial: botão e função existem; exclusão real não testada (precisa login de admin) |
