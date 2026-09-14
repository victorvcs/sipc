# SIPC — Sistema Integrado de Preparação para Concursos e Exames

## Resumo do projeto para contextualização acadêmica

## O que é o SIPC

O SIPC nasceu como uma ferramenta pessoal de preparação para um concurso público específico — o concurso DATAPREV 2026, banca FGV — mas foi desenhado desde o início para se generalizar: qualquer pessoa pode cadastrar o edital de qualquer concurso, prova ou processo seletivo e obter, a partir dele, uma trilha de estudo personalizada, com priorização de conteúdo, acompanhamento de progresso, geração de questões e um sistema de revisão espaçada. O sistema roda inteiramente no navegador, sem exigir infraestrutura própria do usuário, e pode ser publicado tanto como uma aplicação de teste local quanto como um serviço com conta e dados persistentes por usuário.

O nome resume a proposta: um sistema que integra, num único fluxo, a leitura do documento normativo de uma prova (o edital, no caso de concursos brasileiros, mas equivalente a um programa de disciplina, um edital de vestibular, uma ementa de certificação profissional ou um currículo escolar em outros contextos), a organização do conteúdo em uma trilha de estudo adaptada ao tempo disponível da pessoa, e o acompanhamento contínuo do que foi aprendido, do que precisa ser revisado e do que ainda falta.

## Fundamentação conceitual

O SIPC não é apenas um checklist digitalizado. Ele materializa, em software, um conjunto de princípios já estabelecidos na literatura de aprendizagem e psicologia cognitiva, aplicando-os a um problema concreto e de alto impacto pessoal: a preparação para uma avaliação classificatória ou eliminatória.

O primeiro princípio é a repetição espaçada, fundamentada na curva do esquecimento descrita por Hermann Ebbinghaus no final do século XIX e retomada por décadas de pesquisa em ciência cognitiva: reter informação de forma duradoura exige revisá-la em intervalos crescentes, não apenas estudá-la uma vez. O sistema implementa isso automaticamente — quando uma pessoa erra uma questão ou marca uma matéria como não dominada, o tópico entra numa fila de revisão com data de retorno calculada, em vez de depender da memória ou da disciplina do estudante para lembrar do que precisa rever.

O segundo princípio é a aprendizagem adaptativa e personalizada, uma linha de pesquisa e prática consolidada em tecnologia educacional que defende que o percurso de estudo deveria se ajustar ao aprendiz — seu tempo disponível, seu ritmo, seu nível prévio de conhecimento em cada tópico — em vez de impor um cronograma único e genérico. O SIPC opera exatamente assim: a etapa de onboarding coleta quanto tempo por dia a pessoa tem disponível e quantos tópicos consegue estudar por sessão, e a partir disso recalcula uma trilha diária inteira, redistribuindo o conteúdo pendente sempre que o ritmo muda ou quando dias são perdidos, sem gerar culpa ou dívida de estudo — apenas reorganizando o que falta a partir de agora.

O terceiro princípio é a priorização por peso e impacto, uma ideia próxima da noção de aprendizagem baseada em domínio (mastery learning) combinada com uma leitura estratégica do próprio instrumento avaliativo: nem todo conteúdo de um edital ou currículo vale o mesmo na nota final. O sistema lê a distribuição de pontos, pesos ou número de questões de cada matéria — quando essa informação está disponível no edital — e usa isso para decidir que tópicos entram primeiro na trilha e quanto tempo cada um recebe, tornando explícito para o estudante o retorno esperado de cada hora de estudo.

O quarto princípio é a autorregulação da aprendizagem (self-regulated learning), campo estudado por autores como Barry Zimmerman: aprendizes que monitoram o próprio progresso, definem metas e ajustam sua estratégia tendem a ter desempenho superior a quem estuda de forma passiva. O SIPC dá suporte visível a esse monitoramento — percentual do edital concluído, sequência de dias seguidos estudando, taxa de acerto em questões, tempo total estudado por matéria — tornando o progresso tangível e a autoavaliação constante, em vez de deixá-la apenas na cabeça do estudante.

## Da preparação para concursos para qualquer tipo de prova

Embora o protótipo inicial tenha sido construído em torno de um concurso público brasileiro, a estrutura de dados e o fluxo do sistema não têm nenhuma dependência real desse contexto. Um edital de concurso é, do ponto de vista do sistema, apenas uma lista de matérias com pesos relativos e uma data-limite. Essa mesma estrutura descreve igualmente bem o programa de uma disciplina escolar com prova bimestral, o edital de um vestibular ou do ENEM, a ementa de uma certificação profissional (como certificações de tecnologia, contabilidade ou idiomas), ou mesmo um exame de proficiência ou de admissão em qualquer instituição.

Por isso o sistema foi generalizado para permitir que qualquer usuário cadastre seu próprio "edital": pode colar manualmente a lista de matérias e pesos, ou anexar o documento original (em PDF) para que o conteúdo seja extraído automaticamente. A partir desse cadastro, o restante do sistema — trilha, priorização, revisão espaçada, geração de questões de prática, estatísticas de progresso — funciona de forma idêntica, independentemente de o "concurso" ser, na prática, uma prova escolar, um vestibular ou uma certificação profissional.

Essa generalização é o que transforma o SIPC de uma ferramenta de nicho (preparação para um concurso específico) em um objeto de estudo mais amplo: um sistema de apoio à aprendizagem autodirigida para qualquer avaliação estruturada, aplicável tanto a estudantes da educação básica quanto a adultos se preparando para concursos, vestibulares ou certificações profissionais.

## Contribuições e benefícios potenciais

No plano prático, o sistema reduz uma barreira comum na preparação para provas: a dificuldade de transformar um documento normativo extenso (um edital, um currículo, uma ementa) em um plano de estudo executável dia a dia. Essa tradução manual costuma consumir tempo e energia que poderiam ser dedicados ao estudo em si, e é feita de forma inconsistente — cada pessoa organiza seu material de um jeito, sem garantia de que a alocação de tempo reflita o peso real de cada tópico na avaliação final.

No plano pedagógico, o sistema torna operacionais, para qualquer pessoa e sem necessidade de um tutor ou orientador humano, práticas de estudo que a pesquisa em ciência da aprendizagem já indica como eficazes, mas que a maioria dos estudantes não aplica de forma consistente por conta própria: revisão espaçada, priorização por impacto, e monitoramento ativo do próprio progresso. Isso é particularmente relevante em contextos de alta pressão e recursos desiguais, como concursos públicos no Brasil, em que candidatos com menos acesso a cursos preparatórios pagos dependem inteiramente de sua própria capacidade de organização.

No plano acadêmico, o projeto oferece um caso concreto e replicável para investigar perguntas de pesquisa relevantes em tecnologia educacional: até que ponto a personalização automática de uma trilha de estudo, baseada em tempo disponível e peso do conteúdo, afeta a retenção e o desempenho percebido do estudante, quando comparada a um plano de estudo estático ou auto-organizado; que efeito a visibilidade contínua do progresso tem sobre a persistência do estudante ao longo de uma preparação longa; e em que medida um sistema desse tipo consegue se generalizar de fato entre domínios de conteúdo muito diferentes — de uma prova de direito administrativo a uma prova de matemática do ensino médio — sem perda de qualidade na priorização.

## Arquitetura em linhas gerais

Do ponto de vista técnico, o sistema foi implementado como uma aplicação web que roda no navegador, com duas configurações de uso: um modo de teste, em que nada é salvo e a pessoa pode explorar o sistema livremente sem criar conta; e um modo com conta, em que os dados de estudo de cada usuário — matérias, progresso, sessões registradas, resultados de questões — ficam associados à sua identidade e persistem entre sessões e dispositivos, isolados dos dados de qualquer outro usuário. Essa separação foi intencional para permitir tanto demonstrações e uso exploratório quanto uso real e continuado, incluindo por múltiplas pessoas simultaneamente — um requisito relevante caso o sistema venha a ser usado como instrumento de coleta de dados em uma pesquisa com participantes.

## Uso pretendido neste momento

Este resumo foi preparado para servir de material de contextualização — um resumo do projeto, de sua fundamentação e de seus objetivos — a ser usado como apoio na construção e defesa de uma dissertação de mestrado. Ele descreve o estado atual do projeto e a direção de generalização em curso; números de desempenho, resultados empíricos ou validações com usuários ainda não existem e, se vierem a ser produzidos, deverão ser tratados como resultado de pesquisa a ser conduzida, não como afirmação já demonstrada por este documento.
