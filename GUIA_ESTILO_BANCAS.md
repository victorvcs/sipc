# SIPC — Guia de estilo de questões por banca

Este guia orienta a IA do SIPC na hora de **gerar questões inéditas no padrão de cada banca**. Ele descreve a *estrutura* das questões, nunca o texto delas: o SIPC não copia questões de provas nem de agregadores (QConcursos e similares). Questão real só aparece quando vem de prova oficial publicada pela banca, sempre com a fonte.

Fontes da análise (18/10/2026):
- **FGV:** prova objetiva da ALEMA, Técnico de Gestão Administrativa (Analista de Sistemas), tipo 1, publicada pela própria FGV em conhecimento.fgv.br, com 57 questões analisadas.
- **Cebraspe:** prova do CAU/BR 2024 (Analista Técnico), com cerca de 120 itens em 25 blocos.
- **Perfis de banca** publicados por cursos preparatórios (Gran, Estratégia, Alfacon, Direção, QConcursos/Folha): percepção de mercado, não regra oficial.

---

## FGV — múltipla escolha (A a E)

**Tamanho:** enunciados de 45 a 150 palavras. Em Língua Portuguesa, um texto-base longo (centenas de palavras) é compartilhado por várias questões. Questão curta e seca não é o padrão.

**Estruturas recorrentes**

1. **Caso concreto com personagens e dados.** Uma situação com pessoas nomeadas, órgão ou empresa e números ("Os irmãos F., G., H. e I. começaram o mês com dívidas…"), terminando em *"Assim, é correto concluir que"*. As alternativas são afirmações completas que o candidato precisa verificar.
2. **Afirmativas I a V** (cerca de 30% da prova analisada): lista de afirmativas sobre a norma ou o conceito, com distorções sutis em algumas (um advérbio, uma exceção trocada, "ainda quando manifestamente ilegais"). Fecha com *"Assinale: (A) se somente as afirmativas I, II e V estiverem corretas…"* ou *"Está correto o que se afirma em"*.
3. **Cenário técnico com dados reais (TI):** bloco de IP, requisitos, trecho de código ("Analise o código a seguir"), tabela. As alternativas trazem **veredito + justificativa**: *"A alocação foi feita de forma incorreta, pois o endereço da terceira sub-rede é…"*.
4. **Português sobre o texto:** reescrita ("Se colocados em ordem direta, os versos…"), substituição de termos, coesão, pontuação. As alternativas são versões reescritas do trecho.
5. **Direito:** caso concreto em vez de lei seca, muitas vezes com jurisprudência; às vezes mistura matérias.

**Comandos típicos:** "Assinale a opção que…", "É correto afirmar que…", "Analise as afirmativas a seguir", "Considere as seguintes afirmativas", "Assinale a alternativa INCORRETA / EXCETO".

**Alternativas:** cinco, paralelas no formato, próximas entre si. As erradas são plausíveis: troca de conceito vizinho, regra da lei antiga, exceção aplicada como regra, cálculo com um passo esquecido.

---

## Cebraspe — itens Certo/Errado

**Estrutura:** blocos. Cada bloco abre com um **texto-base** ou uma **situação hipotética** e pede *"julgue os itens a seguir"*. A prova analisada tem cerca de 5 itens por bloco.

1. **Situação hipotética:** *"Determinada autarquia federal pretende firmar contrato… A partir dessa situação hipotética, julgue os itens que se seguem."* ou *"Maria apresentou pedido administrativo perante a repartição onde seu marido João exerce cargo em comissão…"*.
2. **Itens curtos, uma afirmação cada.** O candidato julga cada um isoladamente.
3. **Português:** os itens citam trechos do texto entre aspas e cobram referente de pronome ("o vocábulo 'que' apresenta o mesmo referente nas duas ocorrências"), concordância e sua justificativa, valor de conjunções, manutenção da correção ou do sentido após reescrita.
4. **Raciocínio lógico:** enigma narrativo (depoimentos, quem mente) seguido de itens sobre a situação e sobre a forma simbólica das proposições.
5. **Informática:** "Com relação a [ferramenta], julgue os itens" e afirmações sobre funcionalidades concretas.

**Onde está o erro:** palavra absoluta ("sempre", "nunca", "exclusivamente", "apenas"); troca pequena de um termo; afirmação **parcialmente** verdadeira (para o Cebraspe, parcialmente certo é errado); justificativa errada para uma conclusão certa.

**Pontuação:** em geral um item errado anula um certo, e o branco vale zero. Confirmar sempre no edital.

---

## Como o SIPC usa este guia

- O edital informa a banca (ou as bancas prováveis); cada questão gerada segue o bloco correspondente deste guia.
- O prompt de geração recebe: banca, formato (A–E, A–D ou Certo/Errado), tópico e **a teoria que o aluno acabou de estudar**. A questão cobra essa teoria dentro do contexto da banca.
- **Nunca** pedir "enunciados curtos" (o prompt atual de `gerarQuestoesAPI` pede isso e precisa ser invertido). O orçamento de tokens deve comportar enunciados longos e blocos de itens.
- Outras bancas (FCC, Vunesp, Cesgranrio, IBFC, AOCP, Quadrix…) ainda não foram analisadas em prova real. Até lá, a IA usa o formato informado no edital e a descrição geral da banca, e o app indica que o estilo é aproximado.
