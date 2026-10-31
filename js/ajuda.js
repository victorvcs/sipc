/* ------------------------- novidades e central de ajuda -------------------------
   Toda funcionalidade nova entra nas duas listas, na mesma publicação:
   NOVIDADES diz o que mudou (a mais recente primeiro) e AJUDA ensina a usar.
   Script comum, carregado depois do app.js. */
const NOVIDADES = [
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
  ['Plano de hoje', ['Abra cada item da lista e siga até o fim.', 'Faltou um dia? O plano se reorganiza a partir de hoje, sem acumular.', 'Saiu no meio? Use "Continuar de onde parou".']],
  ['Estudar um tópico', ['Cada tópico traz história, resumos, mapa mental, analogias, vídeos e flashcards.', 'Depois vêm as questões no estilo da sua banca, com a justificativa de cada alternativa.', 'Ao concluir, o tópico volta para revisão em 1, 7 e 30 dias.']],
  ['Cronômetro de foco', ['Toque em "Iniciar foco", no canto inferior esquerdo, ao começar a estudar.', 'Vai fazer outra coisa? Toque em "Pausar". Se você sair da página, ele pausa sozinho.', 'Use "Continuar" para retomar e "Encerrar" ao terminar a sessão.', 'As horas aparecem no Painel, em Tempo de foco.']],
  ['Sua evolução', ['Em Hoje, o quadro Sua evolução compara o seu foco cronometrado com a meta do dia.', 'Estudar além da meta adianta o plano e soma em "Dias adiantados".', 'O extra conta até 1,5 vez a meta, com teto de 6 horas por dia. Depois disso o melhor é descansar.', 'A cada 50 minutos de foco, o SIPC sugere uma pausa.']],
  ['Treino de discursiva', ['Na aba Discursiva, informe a banca e o tema. Na FGV, há 6 temas de TI no Judiciário com a cola pronta.', 'Passo 1: leia a cola do tema.', 'Passo 2: treine só a estrutura, começando pelo C-D-A-R-F (Conceito, Desdobramento, Aplicação, Riscos e Fechamento).', 'Passo 3: escreva a redação no app, à mão na tela ou mande a foto do papel.', 'A correção mostra a nota por critério, o que corrigir, os erros de português e uma versão modelo. A nota é uma estimativa, não a da banca.', 'Tem o espelho da banca? Cole no campo próprio: a correção segue o que ele pede.']],
  ['Escrever e desenhar à mão', ['Na redação e no raciocínio lógico, toque em "Escrever à mão na tela". A folha é corrigida como a foto do papel: não precisa enviar antes.', 'Nas questões, abra o Rascunho e toque em Desenhar. Esse desenho não vai para a IA.', 'Use caneta, borracha, Desfazer e Limpar. No iPad, a Apple Pencil engrossa o traço com a pressão e a palma apoiada é ignorada.', 'Para rolar a página, arraste fora da folha.', 'O desenho fica só neste aparelho e os mais antigos saem quando o espaço acaba. Em outro aparelho ele não aparece.']],
  ['Raciocínio lógico', ['Na aba Discursiva, escolha Raciocínio lógico e informe o assunto.', 'Resolva digitando, à mão na tela ou no papel, com a foto.', 'A IA mostra se acertou, em qual passo errou e o que treinar. Confira a resolução: a IA também pode errar.']],
  ['Cronograma do concurso', ['Na aba Datas ficam as datas lidas do edital. Confira sempre no edital original.', 'Toque em Agenda para levar a data à sua agenda do Google e ser avisado mesmo com o SIPC fechado.', 'Saiu retificação? Em "Saiu retificação?", mande o arquivo novo ou cole só o cronograma.', 'Para incluir um compromisso seu, use "Adicionar uma data". Ele não é apagado nas retificações.']],
  ['Lembretes', ['Em Conta, escolha o horário e ative a notificação do navegador.', 'O aviso chega enquanto o SIPC estiver aberto em alguma aba.']],
  ['Reportar um problema ou ideia', ['Toque em Reportar, no canto inferior direito.', 'Conte o que aconteceu. O print da tela ajuda a resolver mais rápido.']],
];

const CHAVE_VISTA = 'sipc::novidade-vista';
function novidadeNaoVista(){ try{ return localStorage.getItem(CHAVE_VISTA) !== NOVIDADES[0].versao; }catch(e){ return false; } }
function marcarNovidadeVista(){ try{ localStorage.setItem(CHAVE_VISTA, NOVIDADES[0].versao); }catch(e){} }

function abaAjuda(){
  marcarNovidadeVista();
  return `<div class="ajuda">
    <section class="bloco"><h2 style="font-size:20px;margin-bottom:12px">Novidades</h2>
      ${NOVIDADES.map(n=>`<div class="nov"><div class="nov-cab"><b>Versão ${escHtml(n.versao)}</b><span class="dim">${escHtml(n.data)}</span></div>
        <ul>${n.itens.map(([t,d])=>`<li><b>${escHtml(t)}.</b> ${escHtml(d)}</li>`).join('')}</ul></div>`).join('')}
    </section>
    <section class="bloco"><h2 style="font-size:20px;margin-bottom:12px">Central de ajuda</h2>
      ${AJUDA.map(([t,passos])=>`<details class="aj"><summary>${escHtml(t)}</summary><ol>${passos.map(p=>`<li>${escHtml(p)}</li>`).join('')}</ol></details>`).join('')}
    </section>
  </div>`;
}
function avisoNovidade(){
  if(!novidadeNaoVista()) return '';
  return `<div class="nota">${ico('spark')}<div><b>Novidade na versão ${escHtml(NOVIDADES[0].versao)}:</b> ${escHtml(NOVIDADES[0].itens[0][0])} e mais. <button class="btn link" onclick="irAba('ajuda')">Ver novidades</button></div></div>`;
}
