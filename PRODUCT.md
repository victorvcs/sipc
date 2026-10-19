# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pessoas se preparando para uma prova estruturada: principalmente concurseiros adultos com pouco tempo, mas também vestibulandos, ENEM, certificações e provas de disciplina. Usam o celular e o computador na mesma medida (sessões curtas no celular, sessões longas na mesa). O trabalho delas é estudar; organizar o estudo é o custo que o SIPC tira de cima delas.

Público secundário: participantes de pesquisa de mestrado sobre aprendizagem autodirigida, que não podem depender de configuração técnica nenhuma.

## Product Purpose

Transformar o edital (ou programa) de qualquer prova num plano de estudo executável dia a dia, e acompanhar o que foi aprendido, o que precisa ser revisado e o que falta. Sucesso é o aluno abrir o app e saber, sem pensar, o que estudar agora — e chegar à prova tendo coberto o edital na proporção do peso de cada matéria.

## Positioning

Um único fluxo do edital até a revisão: a IA lê o edital (PDF ou texto colado), separa matérias, pesos e tópicos, monta a trilha no tempo disponível, gera conteúdo e questões no estilo da banca escolhida e alimenta a revisão espaçada com os erros. Fundamentado em repetição espaçada, aprendizagem adaptativa, priorização por peso e autorregulação.

## Operating Context

- Configuração inicial: edital (PDF ou texto colado), banca (lista das bancas do mercado ou digitada), horas por dia, período até a prova.
- Ciclo diário: plano do dia em lista (revisões vencidas, tópicos novos, questões) → estudar → gerar questões da banca → responder → ver gabarito → revisar.
- Estudo de um tópico segue a estrutura do material do Victor, em nove seções: storytelling real, resumo em 1 minuto, resumo em 5 minutos, mapa visual (cola rápida), analogias pop/tech, questões sem resposta marcada, gabarito com comentários separado, checklist de 30 segundos e flashcards. Na tela agrupam-se em Teoria, Mapa, Questões e Revisão. Exemplo de referência: "Arquitetura de TI — Aplicações de TI".
- Questões no padrão real da banca: na FGV, enunciado longo e contextualizado (situação concreta com servidor, órgão e problema; texto-base em Português; afirmativas I/II/III) e alternativas que trazem a justificativa. Questão curta e seca não serve. Atenção: o prompt atual de `gerarQuestoesAPI` no `index.html` pede "enunciados e alternativas curtos" e precisa ser invertido.
- O aluno escolhe quantas questões gerar: um padrão no setup (passo do ritmo: 5, 10, 15, 20 ou outro número) e a opção de trocar na hora, a cada estudo.
- Estilo das questões por banca segue o [GUIA_ESTILO_BANCAS.md](GUIA_ESTILO_BANCAS.md) (FGV e Cebraspe analisados em prova real; Cebraspe em blocos Certo/Errado).
- Revisão espaçada fixa em 1-7-30: todo tópico estudado volta em 24 horas, 7 dias e 30 dias. Todo dia o aluno vê o que estudou e o que revisa, no plano do dia, na trilha e no painel. Lembrei → próxima etapa; Esqueci → recomeça em 24 h; depois da de 30 dias, consolidado. (O app publicado ainda usa 1-3-7-15-30-60 e precisa mudar.)
- Revisões montadas pelo aluno: de algumas matérias, de uma matéria inteira ou do edital todo (só depois de concluir), com indicadores de acerto.
- Vídeos por tópico com curadoria: curtos, bem avaliados (visualizações, curtidas, comentários); essenciais contam no tempo do tópico, opcionais são aprofundamento; marcar como assistido.
- O estudo de um tópico guarda onde o aluno parou (parte, respostas, rascunho) e o plano mostra "continuar de onde parou".
- Rascunho por questão: texto livre ou desenho (caneta no tablet), salvo junto da questão.
- Várias trilhas por conta ("Minhas trilhas"), cada uma com edital, banca, ritmo e progresso próprios.
- Modo teste: com ele ligado nada é salvo na conta; ao desligar, o progresso real volta como estava.
- Conta: dados, troca de senha, sair, lembrete diário por notificação do navegador e por evento com alarme no calendário do celular.
- Feedback dentro do app: bug ou melhoria com print da tela, classificados e priorizados por valor (o quanto atrapalha a jornada) e esforço.
- Questões: mistura de questões reais de provas oficiais recentes da banca (com fonte e gabarito oficial, quando a prova pública for encontrada) e questões inéditas calibradas pelo estilo dessas provas.
- Modo teste (sem conta, nada salvo) e modo com conta (dados privados por usuário).

## Capabilities and Constraints

- HTML estático único (`index.html`) no GitHub Pages (`victorvcs.github.io/sipc`), sem backend próprio.
- Firebase: Authentication (e-mail/senha e Google), Firestore (`users/{uid}/sipc/...`), AI Logic com Gemini Developer API no plano Spark, App Check com reCAPTCHA Enterprise. Nenhum usuário configura chave de IA.
- Revisão espaçada por tópico (1-3-7-15-30-60 dias; Esqueci/Difícil/Lembrei).
- Questões hoje só em A–E; formato Certo/Errado em desenvolvimento.
- Não copiar questões de agregadores (QConcursos e similares) — fere os termos deles. Questão real só de prova oficial publicada, sempre com a fonte.
- Indefinido: como localizar provas oficiais de forma confiável (busca com Google Search pelo Gemini é a hipótese).

## Evidence on Hand

Nenhum dado de uso, depoimento ou resultado empírico ainda. O resumo acadêmico (`SIPC_resumo_projeto_mestrado.md`) descreve a fundamentação; números de desempenho não devem ser inventados.

## Product Principles

- O aluno pensa no conteúdo, não na organização: o app sempre propõe o próximo passo.
- Faltar dias não gera dívida nem culpa: o plano se reorganiza a partir de hoje.
- Peso decide tempo: o que vale mais na prova recebe mais estudo, sem abandonar nenhuma matéria.
- Errar é informação: todo erro vira revisão no momento certo.
- Nada de fonte inventada: questão real só com prova oficial citada.

## Accessibility & Inclusion

Uso confortável no celular e no computador; textos e alvos de toque legíveis para sessões longas. Nenhum padrão formal definido além disso.
