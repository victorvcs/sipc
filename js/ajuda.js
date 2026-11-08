/* ------------------------- novidades e central de ajuda -------------------------
   Toda funcionalidade nova entra nas duas listas, na mesma publicação:
   NOVIDADES diz o que mudou (a mais recente primeiro) e AJUDA ensina a usar.
   Script comum, carregado depois do app.js. */
const NOVIDADES = [
  {versao:'1.8', data:'08/11/2026', itens:[
    ['Datas em qualquer agenda', 'Na aba Datas, cada data vai para o Google Agenda ou para o Outlook. Se você usa outra agenda, como a do iPhone, baixe o arquivo com todas as datas: a agenda avisa na véspera, mesmo com o SIPC fechado.'],
    ['Lembrete de retificação', 'Dois dias antes de cada data do edital, o SIPC lembra você de conferir se saiu retificação.'],
    ['Vários arquivos de uma vez', 'Se o concurso tem edital, cronograma e anexos separados, mande todos juntos na aba Datas. O SIPC junta as datas.'],
    ['Datas do edital protegidas', 'As datas lidas do edital não podem mais ser apagadas por engano. Só as datas que você adicionou têm o botão de remover.'],
    ['Detalhes já na primeira redação', 'A aba Discursiva mostra a nota por critério, o ponto para focar e o que corrigir desde a primeira redação.'],
    ['Aviso de questões a menos', 'Se a IA entregar menos questões do que o pedido, o SIPC avisa e você pode gerar de novo.'],
  ]},
  {versao:'1.7.1', data:'31/10/2026', itens:[
    ['Vídeos dentro do SIPC', 'A busca agora tenta de outras formas antes de desistir, e os vídeos aparecem também em tópicos que ficavam sem nenhum. Se não houver vídeo, o aviso fica aqui mesmo, sem mandar você para o YouTube.'],
  ]},
  {versao:'1.7', data:'31/10/2026', itens:[
    ['Menu novo', 'As seções agora ficam em grupos: Estudar, Acompanhar e Geral. No computador, o menu fica na lateral. No celular, fica em uma barra embaixo, e o resto está em Mais.'],
    ['Trocar de trilha ficou mais fácil', 'Toque no nome da prova para trocar de trilha ou criar uma nova.'],
    ['Domínio por matéria', 'O Painel mostra cada tópico como um quadrado, do que falta estudar ao que já está consolidado, e o próximo tópico de cada matéria.'],
  ]},
  {versao:'1.6', data:'31/10/2026', itens:[
    ['Cronograma lido melhor', 'O SIPC procura as datas no edital inteiro, e o Painel mostra as próximas. Se a sua aba Datas está vazia, envie o edital de novo por lá.'],
    ['Menu mais completo', 'Novidades, Ajuda e Minhas trilhas agora ficam no menu principal. Novidades traz prints, e cada função tem um guia que mostra o caminho na tela.'],
    ['Sua evolução na redação', 'Cada correção fica guardada na sua conta. A aba Discursiva mostra a nota de cada redação, a média, a comparação com a anterior e o critério para focar.'],
    ['Relatório mais claro', 'A correção compara com a redação anterior, avisa quando o texto foge do tema e traz primeiro o que corrigir. Dá para reabrir as correções antigas.'],
  ]},
  {versao:'1.5.1', data:'31/10/2026', itens:[
    ['Discursiva mais fácil de usar', 'Trocar entre Discursiva e Raciocínio lógico não apaga mais o que você escreveu, e a correção aparece na tela ao terminar.'],
    ['Folha melhor no celular', 'Traço mais legível, ferramentas em uma linha e botões flutuantes fora do caminho enquanto você escreve.'],
  ]},
  {versao:'1.5', data:'31/10/2026', itens:[
    ['Escrita à mão na tela', 'Resolva o raciocínio lógico e escreva a redação com o dedo, o mouse ou a Apple Pencil, que entende a pressão. A IA corrige como se fosse a foto do papel.'],
    ['Desenho no rascunho', 'O rascunho das questões agora tem caneta, borracha e desfazer, para contas e tabelas-verdade. O desenho fica guardado só neste aparelho.'],
  ]},
  {versao:'1.4', data:'31/10/2026', itens:[
    ['Treino de discursiva', 'Cola do tema, 11 exercícios de estrutura e redação com correção por critérios, nota e versão modelo. Escreva no app ou mande a foto do papel.'],
    ['Raciocínio lógico', 'Gere um exercício, resolva no app ou no papel e a IA mostra onde foi o erro.'],
  ]},
  {versao:'1.3', data:'31/10/2026', itens:[
    ['Cronômetro de foco', 'Ligue ao começar a estudar e pause quando for fazer outra coisa. O Painel mostra as horas de hoje, da semana e o total.'],
    ['Cronograma do concurso', 'A aba Datas guarda inscrição, prova e outras datas do edital, avisa quando estão perto e manda para a sua agenda do Google.'],
    ['Sua evolução', 'A tela Hoje mostra a meta do dia, os dias que você adiantou e os marcos do edital. Passar da meta conta até um limite saudável.'],
    ['Novidades e ajuda', 'Este espaço: o que mudou no SIPC e como usar cada parte.'],
  ]},
  {versao:'1.2', data:'31/10/2026', itens:[
    ['Cargo obrigatório no edital', 'Você informa o cargo e a IA lê só as matérias dele, sem misturar as dos outros.'],
  ]},
  {versao:'1.1', data:'31/10/2026', itens:[
    ['IA mais rápida e estável', 'Conteúdo e questões saem em segundos, com menos erros de "serviço ocupado".'],
  ]},
];

const AJUDA = [
  ['Como começar', ['Crie sua conta ou entre com o Google.', 'Mande o edital e informe o seu cargo. A IA separa matérias, pesos e assuntos.', 'Confira as matérias, a banca e diga quantas horas por dia você tem.', 'Pronto: a aba Hoje mostra o que estudar em cada dia.']],
  ['Encontrar cada seção', ['No computador, o menu fica na lateral, em três grupos: Estudar, Acompanhar e Geral.', 'No celular, Hoje, Trilha, Revisões e Painel ficam na barra de baixo. Discursiva, Datas e o resto ficam em Mais.', 'Para trocar de trilha ou criar uma nova, toque no nome da prova.']],
  ['Domínio por matéria', ['No Painel, cada quadrado é um tópico.', 'A estudar: você ainda não concluiu o tópico. Estudado: concluiu. Firme: concluiu e acertou 70% ou mais das questões. Consolidado: passou por todas as revisões.', 'Toque em Estudar para abrir o próximo tópico da matéria.']],
  ['Plano de hoje', ['Abra cada item da lista e siga até o fim.', 'Faltou um dia? O plano se reorganiza a partir de hoje, sem acumular.', 'Saiu no meio? Use "Continuar de onde parou".']],
  ['Estudar um tópico', ['Cada tópico traz história, resumos, mapa mental, analogias, vídeos e flashcards.', 'Depois vêm as questões no estilo da sua banca, com a justificativa de cada alternativa.', 'Ao concluir, o tópico volta para revisão em 1, 7 e 30 dias.']],
  ['Cronômetro de foco', ['Toque em "Iniciar foco", no canto inferior esquerdo, ao começar a estudar.', 'Vai fazer outra coisa? Toque em "Pausar". Se você sair da página, ele pausa sozinho.', 'Use "Continuar" para retomar e "Encerrar" ao terminar a sessão.', 'As horas aparecem no Painel, em Tempo de foco.']],
  ['Sua evolução', ['Em Hoje, o quadro Sua evolução compara o seu foco cronometrado com a meta do dia.', 'Estudar além da meta adianta o plano e soma em "Dias adiantados".', 'O extra conta até 1,5 vez a meta, com teto de 6 horas por dia. Depois disso o melhor é descansar.', 'A cada 50 minutos de foco, o SIPC sugere uma pausa.']],
  ['Treino de discursiva', ['Na aba Discursiva, informe a banca e o tema. Na FGV, há 6 temas de TI no Judiciário com a cola pronta.', 'Passo 1: leia a cola do tema.', 'Passo 2: treine só a estrutura, começando pelo C-D-A-R-F (Conceito, Desdobramento, Aplicação, Riscos e Fechamento).', 'Passo 3: escreva a redação no app, à mão na tela ou mande a foto do papel.', 'A correção mostra a nota por critério, o que corrigir, os erros de português e uma versão modelo. A nota é uma estimativa, não a da banca.', 'Tem o espelho da banca? Cole no campo próprio: a correção segue o que ele pede.']],
  ['Sua evolução na redação', ['Cada correção de redação e de estrutura fica guardada na sua conta, em qualquer aparelho.', 'Desde a primeira redação, a aba Discursiva mostra a nota por critério, o critério para focar e o que corrigir na próxima.', 'A partir da segunda, aparecem também a média das últimas 5 e a diferença para a anterior.', 'Em "Correções guardadas", toque em Ver para reabrir o relatório completo.', 'A foto e o desenho não são guardados: só as notas, o feedback, o seu texto e o que a IA leu na imagem.']],
  ['Escrever e desenhar à mão', ['Na redação e no raciocínio lógico, toque em "Escrever na tela". A folha é corrigida como a foto do papel: não precisa enviar antes.', 'Nas questões, abra o Rascunho e toque em Desenhar. Esse desenho não vai para a IA.', 'Use caneta, borracha, Desfazer e Limpar. No iPad, a Apple Pencil engrossa o traço com a pressão e a palma apoiada é ignorada.', 'Para rolar a página, arraste fora da folha.', 'O desenho fica só neste aparelho e os mais antigos saem quando o espaço acaba. Em outro aparelho ele não aparece.']],
  ['Raciocínio lógico', ['Na aba Discursiva, escolha Raciocínio lógico e informe o assunto.', 'Resolva digitando, à mão na tela ou no papel, com a foto.', 'A IA mostra se acertou, em qual passo errou e o que treinar. Confira a resolução: a IA também pode errar.']],
  ['Cronograma do concurso', ['Na aba Datas ficam as datas lidas do edital. Confira sempre no edital original.', 'Toque em Google ou Outlook para levar a data à sua agenda. Para outra agenda (iPhone, celular), toque em "Baixar todas para qualquer agenda" e abra o arquivo. A agenda avisa mesmo com o SIPC fechado.', 'Dois dias antes de cada data do edital, o SIPC lembra você de conferir se saiu retificação.', 'Saiu retificação? Em "Saiu retificação?", mande o arquivo novo ou cole só o cronograma. Se o edital e o cronograma são arquivos separados, mande até 5 de uma vez.', 'Para incluir um compromisso seu, use "Adicionar uma data". Ele não é apagado nas retificações, e só as datas que você adicionou podem ser removidas.']],
  ['Lembretes', ['Em Conta, escolha o horário e ative a notificação do navegador.', 'O aviso chega enquanto o SIPC estiver aberto em alguma aba.']],
  ['Reportar um problema ou ideia', ['Toque em Reportar, no canto inferior direito.', 'Conte o que aconteceu. O print da tela ajuda a resolver mais rápido.']],
];

const CHAVE_VISTA = 'sipc::novidade-vista';
// O que a versão atual permite fazer: alimenta o alerta e o topo da aba Novidades.
const DESTAQUES = [
  {titulo:'Ver o seu domínio em cada matéria', texto:'Cada tópico vira um quadrado no Painel, e cada matéria mostra o próximo tópico para estudar.', img:'img/novidades/dominio.jpg', alt:'Painel com os tópicos de cada matéria em quadrados coloridos por nível', guia:'dominio'},
  {titulo:'Achar tudo no menu novo', texto:'As seções ficam em grupos, e tocar no nome da prova troca de trilha.', img:'img/novidades/menu.jpg', alt:'Menu lateral com a trilha aberta e os grupos Estudar, Acompanhar e Geral', guia:'menu'},
];
// Abre a tela de cada passo. Trocar de tipo de treino não apaga o que o aluno escreveu.
const guiaDC = (tipo, passo, mao) => () => { S.aba = 'discursiva'; if(DC().tipo !== tipo) dcTipo(tipo); const d = DC(); if(passo) d.passo = passo; if(mao != null) d.mao = mao; render(true); };
const GUIAS = {
  dominio:{titulo:'Domínio por matéria', resumo:'Como ler os quadrados e escolher o que estudar.', passos:[
    {abrir:() => { S.aba = 'painel'; render(true); }, alvo:'.dom-legenda', titulo:'Os quatro níveis', texto:'<b>A estudar</b>, <b>Estudado</b>, <b>Firme</b> (70% ou mais de acerto) e <b>Consolidado</b> (passou por todas as revisões).'},
    {alvo:'.dom-qs', titulo:'Cada quadrado é um tópico', texto:'As matérias vêm do maior para o menor peso. Passe o mouse num quadrado para ver o nome do tópico.'},
    {alvo:'.dom-prox', titulo:'O próximo passo', texto:'Cada matéria mostra o próximo tópico. Toque em <b>Estudar</b> para abrir.'},
  ]},
  menu:{titulo:'Menu do SIPC', resumo:'Onde fica cada seção e como trocar de trilha.', passos:[
    {abrir:() => { S.aba = 'hoje'; render(true); }, alvo:'.menu-lateral, .menu-inferior', titulo:'Tudo em um lugar', texto:'No computador, o menu fica na lateral. No celular, fica embaixo, e as outras seções estão em <b>Mais</b>.'},
    {alvo:'.troca-trilha', titulo:'Sua trilha', texto:'Toque no nome da prova para trocar de trilha ou criar uma nova.'},
  ]},
  evolucao:{titulo:'Sua evolução na redação', resumo:'Como corrigir, comparar e reabrir as redações.', passos:[
    {abrir:guiaDC('discursiva'), alvo:'#dcBanca', titulo:'Comece pela banca e pelo tema', texto:'Informe a banca e o tema. Na FGV, há temas prontos, com a cola do assunto.'},
    {abrir:guiaDC('discursiva','redacao'), alvo:'#dcTexto', titulo:'Escreva a redação', texto:'Digite aqui, escreva à mão na tela ou mande a foto do papel. Depois toque em <b>Corrigir a redação</b>.'},
    {titulo:'Leia o relatório', texto:'A correção mostra a nota por critério, o que corrigir primeiro e a comparação com a redação anterior. Ela fica guardada na sua conta.'},
    {alvo:'.dc-evol', titulo:'Veja a sua evolução', texto:'Desde a primeira redação, aparecem a nota por critério e o que corrigir. A partir da segunda, também a média e a comparação. Em <b>Correções guardadas</b>, toque em <b>Ver</b> para reabrir um relatório.'},
  ]},
  mao:{titulo:'Escrever à mão na tela', resumo:'Como usar a folha com caneta, dedo ou mouse.', passos:[
    {abrir:guiaDC('discursiva','redacao',false), alvo:'.dc-modo', titulo:'Escolha como enviar', texto:'Toque em <b>Escrever na tela</b> para abrir a folha. Ela também está no Raciocínio lógico.'},
    {abrir:guiaDC('discursiva','redacao',true), alvo:'.folha .rasc-abas', titulo:'Suas ferramentas', texto:'Caneta, borracha, desfazer e limpar. No iPad, a Apple Pencil engrossa o traço com a pressão e a palma apoiada é ignorada.'},
    {alvo:'canvas[data-folha]', titulo:'Escreva aqui', texto:'Para rolar a página, arraste fora da folha. Ao corrigir, a folha vai para a IA junto com o que você digitou. O desenho fica só neste aparelho.'},
    {titulo:'Rascunho nas questões', texto:'Nas questões, abra o <b>Rascunho</b> e toque em <b>Desenhar</b>. Esse rascunho é só seu e não vai para a IA.'},
  ]},
  datas:{titulo:'Cronograma do concurso', resumo:'Como enviar o edital e receber os avisos.', passos:[
    {abrir:() => { S.aba = 'datas'; render(true); }, alvo:'.datas .bloco', titulo:'Suas datas', texto:'Aqui ficam inscrição, prova, resultado e recursos. Confira sempre com o edital: a leitura pode errar.'},
    {alvo:'#dtArq', titulo:'Está vazio ou saiu retificação?', texto:'Envie o edital (ou até 5 arquivos, se o cronograma vem separado) ou cole o cronograma e toque em <b>Atualizar cronograma</b>. O SIPC procura as datas nos arquivos inteiros.'},
    {alvo:'#dtEvento', titulo:'Falta alguma data?', texto:'Adicione as suas. Elas continuam aqui mesmo depois de uma retificação.'},
    {abrir:() => { S.aba = 'painel'; render(true); }, alvo:'.p-datas', titulo:'No Painel', texto:'As próximas datas também aparecem no Painel. Na aba Datas, use <b>Google</b>, <b>Outlook</b> ou o arquivo para qualquer agenda e receba o aviso com o SIPC fechado.'},
  ]},
  logico:{titulo:'Raciocínio lógico', resumo:'Como gerar um exercício e conferir a resolução.', passos:[
    {abrir:guiaDC('logico'), alvo:'#dcTema', titulo:'Escolha o assunto', texto:'Escreva o assunto e toque em <b>Gerar exercício</b>.'},
    {titulo:'Resolva do seu jeito', texto:'Digite, escreva à mão na tela ou mande a foto do papel. A IA mostra se acertou e em qual passo errou.'},
  ]},
};
function novidadeNaoVista(){ try{ return localStorage.getItem(CHAVE_VISTA) !== NOVIDADES[0].versao; }catch(e){ return false; } }
function marcarNovidadeVista(){ try{ localStorage.setItem(CHAVE_VISTA, NOVIDADES[0].versao); }catch(e){} }

function abaNovidades(){
  marcarNovidadeVista();
  return `<div class="ajuda">
    <section class="bloco"><h2 style="font-size:20px;margin-bottom:4px">O que você pode fazer agora</h2>
      <p class="dim" style="font-size:14px;margin:0 0 14px">Novidades da versão ${escHtml(NOVIDADES[0].versao)}.</p>
      <div class="nov-destaques">${DESTAQUES.map(d=>`<article class="nov-destaque"><img src="${d.img}" alt="${escHtml(d.alt)}" loading="lazy"><div><h3>${escHtml(d.titulo)}</h3><p>${escHtml(d.texto)}</p><button class="btn sec" onclick="iniciarGuia('${d.guia}')">Me guiar</button></div></article>`).join('')}</div>
    </section>
    <section class="bloco"><h2 style="font-size:20px;margin-bottom:12px">Todas as versões</h2>
      ${NOVIDADES.map(n=>`<div class="nov"><div class="nov-cab"><b>Versão ${escHtml(n.versao)}</b><span class="dim">${escHtml(n.data)}</span></div>
        <ul>${n.itens.map(([t,d])=>`<li><b>${escHtml(t)}.</b> ${escHtml(d)}</li>`).join('')}</ul></div>`).join('')}
    </section>
  </div>`;
}
function abaAjuda(){
  return `<div class="ajuda">
    <section class="bloco"><h2 style="font-size:20px;margin-bottom:4px">Guias</h2>
      <p class="dim" style="font-size:14px;margin:0 0 12px">Conheça cada função passo a passo, na própria tela.</p>
      <ul class="ev-lista">${Object.entries(GUIAS).map(([id,g])=>`<li><span><b>${escHtml(g.titulo)}</b><br><span class="dim">${escHtml(g.resumo)}</span></span><button class="btn link" onclick="iniciarGuia('${id}')">Me guiar</button></li>`).join('')}</ul>
    </section>
    <section class="bloco"><h2 style="font-size:20px;margin-bottom:12px">Central de ajuda</h2>
      ${AJUDA.map(([t,passos])=>`<details class="aj"><summary>${escHtml(t)}</summary><ol>${passos.map(p=>`<li>${escHtml(p)}</li>`).join('')}</ol></details>`).join('')}
    </section>
  </div>`;
}
// Alerta do sistema: aparece uma vez por versão, sem entrar na lista do plano.
function alertaNovidade(){
  if(!novidadeNaoVista() || S.vista || S.aba === 'novidades' || TOUR || !tourJaVisto()) return '';
  return `<aside class="alerta-nov" role="status" aria-label="Novidades do SIPC"><b>Novidades na versão ${escHtml(NOVIDADES[0].versao)}</b>
    <p>A partir de agora, você pode:</p>
    <ul>${DESTAQUES.map(d=>`<li>${escHtml(d.titulo)}</li>`).join('')}</ul>
    <div><button class="btn" onclick="irAba('novidades')">Ver novidades</button><button class="btn link" onclick="dispensarNovidade()">Agora não</button></div></aside>`;
}
function dispensarNovidade(){ marcarNovidadeVista(); render(true); }
