# SIPC — Backlog de funcionalidades

Pedidos do Victor ainda não implementados. O que já foi feito está em `docs/EVOLUCOES.md`, e as dívidas técnicas em `DEBITO_TECNICO.md`.

Atualizado em 08/11/2026. Os itens 4, 8, 9 e 10 e a parte sem servidor do item 2 entraram na v1.8 (ver `docs/EVOLUCOES.md`).

## 1. Estrutura de outras bancas

**Pedido.** Identificar o que cada banca pede a partir de provas discursivas corrigidas.

**Limite.** A busca na internet da IA não existe no plano gratuito. O caminho é reunir o material de cada banca e guardar no app, como foi feito na FGV.

## 2. Avisos com o site fechado

E-mail ou push automático exigem envio agendado fora do navegador, e o Firebase só oferece isso no plano pago. Hoje quem avisa é a agenda do Google do aluno.

Pedido do Victor em 31/10/2026, na aba Datas: dar mais opções de aviso para cada data, como notificação no navegador, Google Agenda, Outlook e e-mail. WhatsApp ele mesmo considerou improvável, e e-mail já bastaria. **Feito na v1.8:** botão do Outlook e arquivo de calendário (.ics) para qualquer agenda, com alarme. **Continua pendente:** e-mail e push com o site fechado, que dependem do plano pago.

## 3. Editar a trilha depois de criada

Mudar a carga horária e o edital sem recriar a trilha (reporte do Rodolfo). A retificação ainda não altera a data da prova usada no plano.

## 5. Rever "Trilha" e "Minhas trilhas"

Pedido do Victor em 31/10/2026, ao ver as duas telas na v1.7: a trilha de cada concurso (Minhas trilhas) e a trilha da semana (item Trilha do menu) usam o mesmo nome e se confundem. Elas precisam virar uma coisa só, e falta decidir se a visão dos próximos dias faz sentido como tela própria. É uma revisão de usabilidade, com a decisão ainda em aberto.

## 6. Mapa visual mais rico

Pedido do Victor em 31/10/2026, ao ver o Mapa visual de um tópico: o mapa só com caixas de texto está pobre. A ideia é usar imagens, ilustrações ou outras representações gráficas, vindas de algum recurso ou API.

**Limite.** O projeto segue no plano gratuito, então a fonte precisa ser gratuita, ter licença de uso clara e não inventar conteúdo.

## 7. Visão geral do concurso

Pedido do Victor em 31/10/2026, ao anexar um edital: depois da leitura, mostrar um resumo do concurso e do cargo. Salário e benefícios saem do próprio edital. Candidatos por vaga, com referência no concurso anterior, editais passados e progressão na carreira, com o salário em cada nível, entram só quando forem públicos.

**Limite.** O que vem do edital já está ao alcance da leitura atual. O resto depende de fonte externa, e a busca na internet da IA não existe no plano gratuito. A IA não pode inventar: dado sem fonte citada fica de fora, e simulação aparece como estimativa.

## 11. Central de ajuda com prints e guias

Pedido do Victor em 31/10/2026, na Central de ajuda: hoje cada assunto é só uma lista de passos. Cada seção e funcionalidade deve ter prints do sistema e a opção "Me guiar", que mostra na tela como funciona.

**Prints sempre atuais.** Quando o sistema mudar, os prints precisam ser atualizados automaticamente. O caminho a avaliar é um script com dados de exemplo que refaz as imagens antes de cada publicação.

## 14. Reportar 2.0 (planejado para a v1.9)

Pedido do Victor em 12/11/2026: trazer para o SIPC as melhorias do padrão de reporte que virou base de todos os projetos. São elas: impacto perguntado ao aluno; versão, rastro e erros presos ao reporte; dados pessoais fora do print; status completo e ajuste da prioridade no Admin; "Meus reportes" com aviso de resolvido; prazo para o print; e limite de envios. Plano em `docs/superpowers/plans/2026-11-12-sipc-v1.9-reportar.md`, com decisões pendentes.

## 13. Seção de simulado

Pedido do Victor em 31/10/2026: o SIPC também precisa ter uma seção de simulado. O pedido chegou incompleto, então formato, duração e resultado ainda serão definidos com ele.
