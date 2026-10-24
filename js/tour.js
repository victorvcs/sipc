/* ------------------------------------------------------------------
   Tour de boas-vindas: na primeira vez que a pessoa chega ao plano de
   hoje, destaca cada parte da tela e explica o que fazer (o que tocar, o
   que marcar e o que é o modo teste). Pode ser revisto em Conta.
   Script comum, carregado depois do app.js: usa S, render, avisar e SIPC.
------------------------------------------------------------------- */
const TOUR_VERSAO = 'v1';

// Cada passo aponta para um elemento da tela; sem alvo, o cartão fica no centro.
function passosDoTour(){
  const semConta = S.visitante;
  return [
    { titulo: 'Bem-vindo ao SIPC', texto: 'Em menos de um minuto, você vê como o SIPC funciona: ele transforma o seu edital num plano de estudo para cada dia. Você só abre e segue a lista.' },
    { alvo: '.plano', titulo: 'Seu plano de hoje', texto: 'Aqui estão as revisões que vencem hoje, os tópicos novos e as questões para fixar. Toque num item para começar. Ele fica marcado quando você termina.' },
    { alvo: '.plano .item:not(.feito)', titulo: 'Como estudar um tópico', texto: 'Cada tópico tem 4 partes: Teoria, Mapa visual, Questões e Revisão. No fim, toque em <b>Concluir o tópico</b>: é isso que agenda as revisões de 24 horas, 7 dias e 30 dias.' },
    { alvo: '.plano', titulo: 'Nas revisões, diga como foi', texto: 'Quando um tópico voltar para revisão, marque <b>Lembrei</b>, <b>Difícil</b> ou <b>Esqueci</b>. O SIPC usa a sua resposta para decidir quando ele volta de novo.' },
    { alvo: '.abas', titulo: 'As outras abas', texto: '<b>Painel</b> mostra se você está no ritmo. <b>Trilha</b> mostra os próximos dias. <b>Revisões</b> mostra o que vai voltar. Em <b>Conta</b> ficam seus dados e o lembrete diário.' },
    { alvo: '.contagem .mt-chave', titulo: semConta ? 'Você está sem conta' : 'Modo teste',
      texto: semConta
        ? 'Sem conta, dá para usar tudo, mas nada fica salvo ao fechar a página. Toque aqui quando quiser criar a sua conta e guardar a trilha.'
        : 'Quer só experimentar? Ligue o <b>Modo teste</b>: enquanto ele estiver ligado, nada do que você fizer é gravado. Ao desligar, seu progresso real volta como estava. Para estudar de verdade, deixe desligado.' },
    { alvo: '.trocar-trilha', titulo: 'Minhas trilhas', texto: 'Vai fazer mais de uma prova? Cada trilha tem o seu edital, o seu ritmo e o seu progresso. Troque ou crie uma nova por aqui.' },
    { alvo: '.reportar', titulo: 'Estamos em beta: conte com você', texto: 'Viu algo errado ou teve uma ideia? Toque em <b>Reportar</b>, em qualquer tela. O print da tela vai junto, e cada retorno entra na lista do que vamos melhorar.' },
  ];
}

let TOUR = null; // {i, passos}
const chaveTourLocal = () => 'sipc::tour::' + TOUR_VERSAO + '::' + (S.usuario ? S.usuario.uid : 'visitante');
function tourJaVisto(){
  if(S.perfil && S.perfil.tour === TOUR_VERSAO) return true;
  try{ return !!localStorage.getItem(chaveTourLocal()); }catch(e){ return false; }
}
function marcarTourVisto(){
  try{ localStorage.setItem(chaveTourLocal(), '1'); }catch(e){}
  if(S.usuario && !S.modoTeste){ S.perfil = {...(S.perfil||{}), tour: TOUR_VERSAO}; SIPC.store.salvarPerfil(S.usuario.uid, {tour: TOUR_VERSAO}).catch(()=>{}); }
}
// Chamado ao abrir uma trilha: só na primeira vez, e só no plano de hoje.
function talvezTour(){ if(!TOUR && !tourJaVisto() && S.tela==='app' && !S.vista && S.aba==='hoje') iniciarTour(); }
function iniciarTour(){
  if(S.tela !== 'app') return;
  S.vista = null; S.aba = 'hoje'; render(); window.scrollTo(0,0);
  TOUR = {i:0, passos: passosDoTour(), voltarFoco: document.activeElement};
  desenharTour();
}
function fecharTour(){
  if(window.evento && TOUR) evento('tour', 'até o passo ' + (TOUR.i+1) + ' de ' + TOUR.passos.length);
  marcarTourVisto();
  const el = document.getElementById('tour'); if(el) el.remove();
  removeEventListener('resize', desenharTour); removeEventListener('scroll', posicionarTour, true);
  const foco = TOUR && TOUR.voltarFoco; TOUR = null;
  if(foco && foco.focus) try{ foco.focus(); }catch(e){}
}
function irTour(d){
  if(!TOUR) return;
  const i = TOUR.i + d;
  if(i >= TOUR.passos.length) return fecharTour();
  TOUR.i = Math.max(0, i); desenharTour();
}
function alvoDoPasso(p){
  if(!p.alvo) return null;
  const el = document.querySelector(p.alvo);
  if(!el) return null;
  const b = el.getBoundingClientRect();
  return b.width && b.height ? el : null;
}
function desenharTour(){
  if(!TOUR) return;
  const p = TOUR.passos[TOUR.i], n = TOUR.passos.length, ultimo = TOUR.i === n-1;
  let el = document.getElementById('tour');
  if(!el){
    el = document.createElement('div'); el.id = 'tour'; el.setAttribute('data-sem-print', '');
    document.body.appendChild(el);
    addEventListener('resize', desenharTour); addEventListener('scroll', posicionarTour, true);
  }
  el.innerHTML = `<div class="tour-furo"></div>
    <div class="tour-cartao" role="dialog" aria-modal="true" aria-labelledby="tourTitulo" aria-describedby="tourTexto">
      <span class="tour-passo num">${TOUR.i+1} de ${n}</span>
      <h2 id="tourTitulo">${p.titulo}</h2>
      <p id="tourTexto">${p.texto}</p>
      <div class="tour-pontos" aria-hidden="true">${TOUR.passos.map((_,k)=>`<i class="${k===TOUR.i?'on':''}"></i>`).join('')}</div>
      <div class="tour-acoes">
        <button class="btn link" onclick="fecharTour()">${ultimo ? 'Fechar' : 'Pular o tour'}</button>
        <span>${TOUR.i ? '<button class="btn sec" onclick="irTour(-1)">Voltar</button>' : ''}
        <button class="btn" id="tourProximo" onclick="irTour(1)">${ultimo ? 'Começar a estudar' : 'Próximo'}</button></span>
      </div>
    </div>`;
  const alvo = alvoDoPasso(p);
  if(alvo) alvo.scrollIntoView({block:'center', behavior:'instant'});
  posicionarTour();
  document.getElementById('tourProximo').focus();
}
// Recorta o destaque em volta do alvo e põe o cartão embaixo dele (ou em cima, se não couber).
function posicionarTour(){
  if(!TOUR) return;
  const el = document.getElementById('tour'); if(!el) return;
  const furo = el.querySelector('.tour-furo'), cartao = el.querySelector('.tour-cartao');
  const alvo = alvoDoPasso(TOUR.passos[TOUR.i]);
  if(!alvo){
    furo.classList.add('sem-alvo'); furo.removeAttribute('style'); cartao.classList.add('centro'); cartao.removeAttribute('style'); return;
  }
  furo.classList.remove('sem-alvo'); cartao.classList.remove('centro');
  const b = alvo.getBoundingClientRect(), m = 6;
  Object.assign(furo.style, {top:(b.top-m)+'px', left:(b.left-m)+'px', width:(b.width+2*m)+'px', height:(b.height+2*m)+'px'});
  // A largura vem antes da medida: com outra largura o texto quebra diferente e a altura muda.
  const larg = Math.min(380, innerWidth - 32);
  cartao.style.width = larg + 'px';
  const alt = cartao.offsetHeight;
  let top = b.bottom + 14;
  if(top + alt > innerHeight - 12) top = Math.max(12, b.top - alt - 14);
  if(top + alt > innerHeight - 12) top = Math.max(12, innerHeight - alt - 12); // alvo enorme: cartão fica por cima
  const left = Math.min(Math.max(16, b.left + b.width/2 - larg/2), innerWidth - larg - 16);
  Object.assign(cartao.style, {top: top+'px', left: left+'px', width: larg+'px'});
}
document.addEventListener('keydown', e => {
  if(!TOUR) return;
  if(e.key === 'Escape'){ e.preventDefault(); fecharTour(); }
  else if(e.key === 'ArrowRight'){ e.preventDefault(); irTour(1); }
  else if(e.key === 'ArrowLeft'){ e.preventDefault(); irTour(-1); }
  else if(e.key === 'Tab'){ // o foco fica dentro do cartão enquanto o tour está aberto
    const bts = [...document.querySelectorAll('#tour button')]; if(!bts.length) return;
    const i = bts.indexOf(document.activeElement);
    e.preventDefault(); bts[(i + (e.shiftKey ? -1 : 1) + bts.length) % bts.length].focus();
  }
});
