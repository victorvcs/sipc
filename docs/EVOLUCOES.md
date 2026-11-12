# SIPC — Evoluções do projeto

Cada funcionalidade nova entra aqui com o que faz, o objetivo, o racional e as regras de negócio. O que o aluno lê fica em `js/ajuda.js` (Novidades e Central de ajuda). Pendências ficam em `docs/BACKLOG.md`, e dívidas técnicas em `DEBITO_TECNICO.md`.

## Como versionamos

- **`main` é o que está no ar.** Todo push na `main` publica no GitHub Pages em cerca de 1 minuto.
- **Funcionalidade nova nasce numa branch** (`feature/nome`). Nada vai para a `main` sem o ok do Victor. Desde 31/10/2026 ele testa em produção o que depende de login e do banco.
- **Número da versão:** `1.X` para funcionalidade nova e `1.X.Y` para correção. Fica no rodapé do `index.html`, com a data, e no topo de `NOVIDADES` em `js/ajuda.js`.
- **Tag por versão publicada** (`v1.3`), para voltar a qualquer ponto.
- **Voltar uma publicação:** `git revert <commit>` na `main` e `git push origin main`.

| Versão | Situação | Commit | O que trouxe |
|---|---|---|---|
| 1.0 | publicada | `38ce071` | Primeira versão com alunos |
| 1.1 | publicada | `a350eab` | IA gratuita e estável; versão no rodapé |
| 1.2 | publicada | `6c09c43` | Cargo obrigatório no edital |
| 1.3 | publicada | `bfaae37` | Foco, evolução, cronograma, novidades e ajuda |
| 1.4 | publicada | `7d65903` | Discursiva e raciocínio lógico |
| 1.5 | publicada | `702a4f8` | Escrita e rascunho à mão, inclusive no iPad |
| 1.5.1 | publicada | tag `v1.5.1` | Ajustes de experiência na discursiva e na folha |
| 1.6 | publicada | tag `v1.6` | Histórico de correções, evolução e relatório mais claro |
| 1.7 | publicada | tag `v1.7` | Menu em grupos, seletor de trilha e painel de domínio |
| 1.7.1 | publicada | tag `v1.7.1` | Vídeos sempre dentro da plataforma |
| 1.8 | publicada | tag `v1.8` | Datas em qualquer agenda, retificação, vários arquivos, evolução na 1ª redação, correções |
| 1.8.1 | publicada, em uso | tag `v1.8.1` | Aviso claro e registro do bloqueio do App Check |

---

## v1.1 — IA gratuita e estável

**O que faz.** Usa os modelos Flash-Lite, com um modelo reserva, uma chamada por vez em cada navegador e nova tentativa em falhas passageiras. O painel de admin mostra o código completo do erro.

**Objetivo.** Fazer os alunos conseguirem estudar: havia 31 erros de IA registrados e nenhum tópico concluído por alunos reais.

**Racional.** O Flash barrava ao passar de 5 chamadas e levava de 34 a 41 s. O Flash-Lite aguentou 10 seguidas e levou 9 s. Decisão do Victor: o projeto continua gratuito.

**Regras de negócio.**
- No erro 429, troca para o modelo reserva na hora; acabando as cotas, espera o prazo pedido pela API, até 90 s.
- Prazo maior que 90 s é limite do dia: avisa o aluno em vez de esperar.
- Resposta fora do formato é pedida de novo, e erro definitivo não repete.

**Custo conhecido.** O texto gerado é mais curto.

## v1.2 — Cargo obrigatório

**O que faz.** O edital só é lido depois de o aluno informar o cargo, e a IA traz só as matérias dele e as comuns.

**Objetivo.** Evitar matérias de outros cargos e leituras desnecessárias em editais grandes.

**Regras de negócio.**
- Sem cargo (mínimo de 3 letras), a leitura não começa e nenhuma chamada de IA é feita.
- Cargo que não existe no edital gera aviso próprio, sem repetir a chamada.
- Vestibular ou certificação: informar o curso ou o nome da prova.

## v1.3 — Cronômetro de foco

**O que faz.** Cronometra o estudo, com iniciar, pausar, continuar e encerrar, em todas as telas da trilha. O Painel mostra hoje, 7 dias e o total.

**Objetivo.** O aluno saber quantas horas estudou de verdade.

**Racional.** O app só tinha uma estimativa por tópico concluído (`S.E.minutos`). O foco é medido e fica separado, em `S.E.foco`.

**Regras de negócio.**
- Saiu da página, pausa sozinho e só volta quando o aluno mandar.
- Grava a cada 30 s, então uma queda perde no máximo isso.
- Trecho acima de 2 minutos sem gravar é limitado, para o computador que dormiu não virar horas de estudo.

## v1.3 — Sua evolução (gamificação)

**O que faz.** Em Hoje, mostra a meta do dia, os dias adiantados, o edital coberto e os marcos de 10, 25, 50, 75 e 100%.

**Objetivo.** Estimular a estudar mais, mostrando o avanço em relação ao plano, sem levar ao desgaste.

**Racional.** Premiar horas sem limite premiaria o excesso, por isso o extra tem teto.

**Regras de negócio.**
- Meta do dia: as horas que o aluno combinou.
- O extra conta até 1,5 vez a meta, com teto de 6 horas por dia. Quem combinou mais que isso tem a própria meta como limite.
- Dias adiantados: tempo extra válido dividido pela meta do dia.
- Ao chegar no limite, o app recomenda descansar.
- A cada 50 minutos de foco, sugere uma pausa.

## v1.3 — Cronograma do concurso

**O que faz.** A aba Datas guarda as datas lidas do edital, avisa quando estão perto e envia para a agenda do Google.

**Objetivo.** O candidato não perder inscrição, isenção, prova e resultado.

**Racional.** Avisar com o site fechado exigiria plano pago. A agenda do próprio aluno resolve isso de graça.

**Regras de negócio.**
- A IA copia só datas escritas no texto. Data "a definir" fica de fora.
- Aviso em Hoje e no lembrete para datas a até 7 dias. Período aberto conta até o último dia.
- Retificação: as datas lidas são trocadas pelas novas, e as adicionadas pelo aluno ficam.
- A retificação não altera a data da prova usada no plano.

## v1.3 — Novidades e Central de ajuda

**O que faz.** Mostra o que mudou em cada versão e ensina a usar cada parte.

**Regra de trabalho.** Toda funcionalidade publicada entra em `NOVIDADES` e em `AJUDA`, em `js/ajuda.js`, e neste arquivo.

## v1.4 — Treino de discursiva

**O que faz.** O aluno informa banca e tema, lê a cola, treina a estrutura e escreve a redação no app ou manda a foto do papel. A IA dá nota por critério, o que corrigir, os erros de português e uma versão modelo.

**Objetivo.** Ensinar a escrever em passos: primeiro estrutura e ideias, depois o texto completo.

**Racional.** O método vem do material do Victor: C-D-A-R-F, 10 estruturas e os critérios de correção. A busca na internet da IA não existe no plano gratuito (erro 429 em 31/10/2026), então a estrutura da banca vem desse material ou do espelho que o aluno colar. Assim a IA não inventa critério de banca.

**Regras de negócio.**
- Critérios: tema (4), domínio técnico (3), clareza (2) e linguagem (1), somando 10.
- A nota é limitada ao máximo do critério, em meios pontos, e aparece como estimativa.
- O espelho colado tem prioridade sobre os demais critérios.
- A cola pronta existe para 6 temas de TI no Judiciário, na FGV. Os demais usam critérios gerais.
- A foto é recriada no navegador (até 1600 px, JPEG), enviada à IA e não é guardada.
- O histórico guarda só tema, nota e data, nunca o texto, por causa do limite do documento.

## v1.4 — Raciocínio lógico

**O que faz.** Gera um exercício, recebe a resolução em texto ou foto e mostra se acertou, onde errou e o que treinar.

**Regras de negócio.**
- A correção compara com a resolução guardada ao gerar o exercício.
- A resolução só aparece depois de o aluno enviar a dele.
- A IA pode errar conta: a Central de ajuda orienta conferir a resolução.

## v1.5 — Escrita e rascunho à mão

**O que faz.** Uma folha de desenho com caneta, borracha, desfazer e limpar. Na Redação e no Raciocínio lógico, ela é alternativa à foto do papel. No Rascunho das questões, é a aba Desenhar, ao lado do texto. Funciona com Apple Pencil, dedo e mouse.

**Objetivo.** Deixar o aluno resolver matemática e raciocínio lógico e treinar a redação à mão, como na prova, sem precisar de papel e câmera.

**Racional.** Os portais costumam usar folha livre, teclado de fórmulas, reconhecimento de escrita ou foto para a IA. Teclado de fórmulas é lento para rascunhar, e reconhecimento de escrita é serviço pago. A folha livre com imagem para a IA não tem custo novo: o `gemini-3.5-flash-lite` já lê imagem e o campo `foto` de `DC()` já existia. Decisão do Victor: o desenho fica no aparelho do aluno, sem custo e sem depender do plano Blaze.

**Regras de negócio.**
- O desenho nunca vai para o Firestore, cujo documento tem limite de 1 MB. Fica no `localStorage`, por usuário, em `sipc::folha::<uid>::<chave>`.
- Visitante e modo teste não guardam: o desenho some ao recarregar.
- Guardam-se até 40 folhas e 3 milhões de caracteres; ao passar disso, saem as mais antigas.
- Na correção, a folha vira JPEG em fundo branco, de 1200 por 1600, e preenche `foto`. O quadriculado é só visual.
- O rascunho das questões não vai para a IA.
- Só a caneta varia o traço com a pressão; mouse e dedo têm largura fixa.
- Se a caneta foi usada há menos de 60 s, o toque é tratado como palma e ignorado. Se a palma encostou primeiro, a caneta descarta o risco dela.
- Limpar pode ser desfeito, até 50 passos. O histórico do desfazer não sobrevive a recarregar a página.
- Um novo exercício de raciocínio lógico limpa a folha dele.

**Custo conhecido.** O desenho não acompanha o aluno para outro aparelho. Se isso for pedido, a opção gratuita é um documento por desenho no Firestore, mais mudança nas regras do banco.

## v1.5.1 — Ajustes de experiência

**O que faz.** Corrige problemas vistos na revisão de UX das telas da 1.4 e da 1.5.

**Objetivo.** Evitar perda de trabalho e deixar a escrita à mão confortável no celular.

**Racional.** Revisão do código e das capturas em 375px; ainda sem teste com alunos. Decisão do Victor: publicar sem o teste em localhost, porque o login real só pode ser testado no site no ar.

**Regras de negócio.**
- Trocar entre Discursiva e Raciocínio lógico mantém o trabalho de cada um; só a banca é compartilhada.
- Enunciado e espelho ficam recolhidos quando vazios e abertos quando têm conteúdo.
- Em telas de até 820 px, os botões de foco e Reportar somem enquanto a folha está visível. O cronômetro continua contando.
- Em tela estreita, o traço engrossa até 2,4 vezes.
- Desfazer e Limpar ficam desativados quando não têm efeito.

## v1.6 — Evolução na redação

**O que faz.** Guarda cada correção de redação e de estrutura na conta do aluno, mostra a evolução na aba Discursiva e permite reabrir os relatórios. O relatório compara com a redação anterior, avisa quando o texto foge do tema e traz primeiro o que corrigir.

**Objetivo.** Pedido do Victor: guardar o feedback e os indicadores no banco, para o aluno ver a evolução de uma redação para a próxima.

**Racional.** Antes só a nota ficava na trilha, em `S.E.discursivas`. Um documento por correção, em `users/{uid}/redacoes/{id}`, não pesa no limite de 1 MB do estado, acompanha o aluno em qualquer trilha e não exige mudança nas regras: esse caminho já é só do dono e do admin.

**Regras de negócio.**
- Guarda notas por critério, feedback, versão modelo, texto digitado e transcrição, com limite de tamanho por campo. Foto e desenho não são guardados.
- A evolução conta só redações; exercício de estrutura aparece na lista, mas fica fora das médias.
- A média usa as últimas 5 redações; a série mostra as últimas 8; a lista traz as últimas 10.
- O ponto fraco é o critério com o menor aproveitamento médio, proporcional à nota máxima dele.
- Nota de tema de até 25% do máximo gera o aviso de texto fora do tema. É uma regra do app, não da banca.
- Falha ao gravar não esconde a correção: o aluno vê o aviso e pode tentar de novo.
- As notas guardadas na trilha pela v1.4 continuam contando, sem detalhes.
- Visitante e modo teste não gravam no banco.

### Cronograma, novidades e guias (também na v1.6)

**O que faz.** Procura as datas no edital inteiro, mostra as próximas no Painel, transforma as Novidades em alerta e aba do menu principal, com prints, e cria guias passo a passo, abertos pela aba Novidades e pela Ajuda.

**Racional.** Pedido do Victor ao ver a aba Datas vazia num edital com cronograma e o aviso de novidade misturado aos cartões do plano. Datas em DD/MM/AAAA eram descartadas sem aviso, e só os últimos 150 mil caracteres do edital iam para a IA. Os guias reaproveitam o cartão do tour.

**Regras de negócio.**
- Data em DD/MM/AAAA é convertida; data inválida continua fora.
- Se a leitura do edital vier sem datas, uma segunda chamada usa só o começo do arquivo e a vizinhança de cada data, até 40 mil caracteres. Sem data no texto, a IA não é chamada. Falha nessa etapa não impede criar a trilha.
- A IA não calcula data; só completa o ano quando o cronograma ou o edital o informa.
- O alerta aparece uma vez por versão e neste aparelho, depois do tour de boas-vindas. Ver ou dispensar encerra o alerta.
- Terminar um guia não marca o tour de boas-vindas como visto.
- Os prints de `img/novidades` usam dados de exemplo.

### Navegação e fim do modo teste (também na v1.6)

**O que faz.** Novidades, Ajuda e Minhas trilhas entram no menu principal, e os atalhos do topo saem. A chave de Modo teste deixa de existir.

**Racional.** Decisão do Victor: o acesso às trilhas no topo da tela estava estranho, e o modo teste perdeu o sentido porque ele testa em produção.

**Regras de negócio.**
- O mecanismo interno `S.modoTeste` continua só para quem usa o app sem conta: nada vai para o banco.
- A aba atual é centralizada no menu ao renderizar, para não ficar cortada no celular.

## v1.7 — Novo visual: menu e painel de domínio

**O que faz.** Troca as abas horizontais por um menu em grupos (Estudar, Acompanhar e Geral), com barra lateral a partir de 1024px e barra inferior com a folha Mais abaixo disso. Minhas trilhas vira um seletor com o nome da prova. O Painel passa a destacar o domínio por matéria, com um quadrado por tópico e o próximo tópico de cada matéria.

**Objetivo.** Pedido do Victor: o acesso às trilhas estava estranho e a interface precisava ficar mais amigável. Ele escolheu combinar a navegação de Linear e Notion com o painel da Khan Academy.

**Racional.** Onze itens em abas horizontais não escalam e escondiam seções no celular. O seletor separa "Minhas trilhas" de "Trilha", que tinham nomes parecidos. Sequências e cadeados ao estilo Duolingo ficaram de fora porque contrariam o princípio de não gerar culpa por dias perdidos. As regras dos níveis estão em `js/nucleo/dominio.js`, com testes.

**Regras de negócio.**
- A estudar: tópico não concluído. Estudado: concluído. Firme: concluído, com questões feitas e acerto de 70% ou mais. Consolidado: passou por todas as revisões.
- As matérias aparecem do maior para o menor peso.
- O menu some nas telas de estudo e de questões, como já acontecia.
- A barra inferior some enquanto a folha de escrita está à vista, para não atrapalhar a caneta.
- O item Revisões mostra quantas vencem hoje.
- Tour e guias usam o primeiro alvo visível, porque o menu muda entre computador e celular.
- Os prints `dominio.jpg` e `menu.jpg` usam dados de exemplo. Os prints antigos seguem válidos: mostram só o conteúdo, sem o menu.

## v1.7.1 — Vídeos sempre dentro da plataforma

Reporte do Victor: no tópico "Conceitos de produtividade, eficiência, eficácia e competitividade", o vídeo não carregou e o app mandou buscar no YouTube.

**Causa.** A busca juntava tópico, matéria e "aula concurso". Com o nome longo de uma matéria, o YouTube voltava vazio. Reproduzido com a chave real em localhost:5500: com "Administração Geral" vieram 5 vídeos; com uma matéria longa de exemplo, nenhum. O nome exato da matéria da trilha do Victor não foi conferido.

**Correção.** Até 3 tentativas, só quando a anterior não acha nada: tópico com matéria, tópico sem matéria e tópico encurtado (`js/nucleo/videobusca.js`, com testes). Se nenhuma tiver aula de 3 a 30 minutos, a duração abre para 1 minuto a 2 horas sobre o que já veio, sem gastar outra busca. O link externo saiu: sem vídeo, o aviso fica no app, e em caso de erro há o botão Tentar de novo.

**Cota.** Um tópico sem resultado gasta até 3 buscas das cerca de 100 diárias, porque o vazio não fica no cache. O resultado encontrado continua no cache compartilhado.

## v1.8 — Datas em qualquer agenda e correções

Primeira versão depois da troca de computador (08/11/2026). Junta quatro pedidos do backlog que cabem no plano gratuito e quatro correções. Escopo aprovado pelo Victor em 08/11/2026.

### Datas: Outlook, arquivo de calendário e retificação (backlog 2 e 9)

**O que faz.** Cada data futura tem os botões Google e Outlook. "Baixar todas para qualquer agenda" gera um arquivo `.ics` com as próximas datas, que abre na agenda do iPhone, do Android ou do Outlook do computador. Dois dias antes de uma data do edital, a aba Datas, o aviso em Hoje e o lembrete do navegador pedem para conferir se saiu retificação.

**Racional.** E-mail e push com o site fechado exigem envio agendado, que o Firebase só tem no plano pago. A agenda do próprio aluno avisa sem servidor: o `.ics` leva um alarme na véspera e, nas datas do edital, outro dois dias antes para a retificação. O WhatsApp ficou de fora (o próprio Victor considerou improvável).

**Regras de negócio** (`js/nucleo/cronograma.js`, com testes).
- O link do Outlook é o de conta pessoal (`outlook.live.com`). Conta de trabalho usa o arquivo `.ics`.
- O arquivo leva só as datas que ainda não passaram. Período (inscrição) vira um evento de vários dias.
- Lembrete de retificação: só datas do edital (não as do aluno), quando faltam 1 ou 2 dias.
- Alarmes do `.ics`: às 9h da véspera e, para a retificação, às 9h de dois dias antes.

### Datas: vários arquivos e exclusão só do que é do aluno (backlog 10 e 8)

**O que faz.** "Saiu retificação?" aceita até 5 arquivos de uma vez. O X de remover aparece só nas datas que o aluno adicionou.

**Racional.** Há concursos com edital e cronograma em arquivos separados. Uma chamada só de IA para todos poupa a cota: cada arquivo ganha uma parte igual dos 40 mil caracteres, com o próprio começo (que costuma trazer o ano). Decisão do Victor de 31/10: o aluno não exclui as datas do cronograma, só as que ele mesmo adicionou.

**Regras de negócio.**
- Arquivo que não dá para ler é ignorado com aviso, se outro foi lido.
- Se houver conflito entre arquivos, a IA é instruída a ficar com a data do mais recente (a retificação).
- A troca das datas continua a mesma: as do edital são substituídas, as do aluno ficam.

### Evolução já na primeira redação (backlog 4)

**O que faz.** Com uma redação só, "Sua evolução" mostra a nota por critério, o critério para focar e até 3 pontos do que corrigir, com o botão "Ver a correção completa". A partir da segunda, o que corrigir da última redação também aparece.

**Racional.** Pedido do Victor ao ver a v1.7: com uma redação, a aba só mostrava a nota.

### Correções

- **Vídeos por no máximo 30 dias.** As regras da API do YouTube não permitem guardar dados dos vídeos por mais de 30 dias. A chave do cache (`videos/{id}`) passou a ter o período de 30 dias, então a busca é refeita depois do prazo sem mudar as Regras do Firestore. O Admin ganhou "Apagar vídeos com mais de 30 dias" (só o admin apaga). `privacidade.html` passou a citar o YouTube, com os termos e a política do Google. **Custo:** a cada 30 dias os tópicos gastam busca de novo.
- **Questões a menos.** Se a IA entrega menos questões do que o pedido, aparece "Vieram X de N", com "gerar de novo" no tópico. Fecha o item 3 do `DEBITO_TECNICO.md`.
- **`prototipo.html` fora do site.** Decidido em 23/10. Continua no histórico do Git e na pasta `prototipo/` do Drive.
- **Novidades.** O alerta e o topo da aba Novidades destacam a agenda e a primeira redação. Os prints `img/novidades/datas.jpg` e `evolucao.jpg` foram refeitos com dados de exemplo. QA em `qa/relatorio-2026-11-08.md`.

## v1.8.1 — Bloqueio do App Check visível

Reporte do Victor em 08/11/2026: conteúdo e questões não carregavam, um problema que ele achou "surreal". A cota 429 tinha sido tratada na v1.1, mas havia outra causa.

**Causa.** No site publicado (testado no navegador do Claude), a troca do reCAPTCHA pelo token do App Check (`exchangeRecaptchaEnterpriseToken`) voltou **403 "App attestation failed"**. Depois de um 403, o SDK do App Check trava a IA por 24 h naquela página. Recarregar não adianta: cada carga refaz a verificação, leva outro 403 e trava de novo. O app pedia "Recarregue a página" e apagava o IndexedDB, o que não resolvia. Ainda não se sabe quantos alunos passam por isso: o navegador do Claude pode ter tido nota de risco baixa por ser automatizado.

**O que muda.**
- A mensagem explica o que fazer (outro navegador, sem VPN, fora de navegador dentro de app) e manda reportar, sem prometer que recarregar resolve.
- O erro é registrado como `ia-bloqueada`, separado de `ia-erro`. O Admin › Geral ganhou o quadro "Falhas da IA" (últimos 7 dias), com quantas vezes e quais alunos.
- Uma correção (1.8.1) não mostra de novo o alerta de Novidades: o alerta passa a ser por versão de funcionalidade (1.8).
- Regra pura em `erroAppCheck` (`js/nucleo/iautil.js`), com teste.

**O que não muda (depende do console, só o Victor acessa).** A correção de fato é de configuração: rever o limite de risco do reCAPTCHA no App Check (Firebase › App Check › Apps › reCAPTCHA Enterprise) e conferir no Google Cloud se a cota gratuita do reCAPTCHA Enterprise (10 mil avaliações por mês) estourou. O app pede um token de uso único por chamada de IA (`useLimitedUseAppCheckTokens`), então cada chamada gasta uma avaliação.
