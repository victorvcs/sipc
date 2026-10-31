# SIPC — Evoluções do projeto

Cada funcionalidade nova entra aqui com o que faz, o objetivo, o racional e as regras de negócio. O que o aluno lê fica em `js/ajuda.js` (Novidades e Central de ajuda). Pendências ficam em `docs/BACKLOG.md`, e dívidas técnicas em `DEBITO_TECNICO.md`.

## Como versionamos

- **`main` é o que está no ar.** Todo push na `main` publica no GitHub Pages em cerca de 1 minuto.
- **Funcionalidade nova nasce numa branch** (`feature/nome`). Nada vai para a `main` antes de o Victor testar em `http://localhost:5500`.
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
| 1.5.1 | publicada, em uso | tag `v1.5.1` | Ajustes de experiência na discursiva e na folha |

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
