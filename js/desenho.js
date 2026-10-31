/* ------------------------- folha de desenho -------------------------
   Canvas com caneta, borracha, desfazer e limpar, usado no rascunho das questões
   e na resolução à mão. As regras estão em js/nucleo/desenho.js. O render recria
   a tela inteira, então os traços moram em FOLHAS e o canvas é redesenhado depois
   de cada render. O desenho fica só neste aparelho, nunca no Firestore.
   Script comum, carregado depois do app.js. */
const FOLHAS = new Map(), FOLHA_CFG = {};
const PREFIXO_FOLHA = 'sipc::folha::';
let DESENHANDO = null, ULTIMA_CANETA = null, SALVAR_FOLHAS = new Map();

// Visitante e modo teste não guardam nada, como o resto do estudo.
const guardaFolhas = () => !!S.usuario && !S.modoTeste;
const chaveFolha = chave => PREFIXO_FOLHA + uid() + '::' + chave;
const idFolha = chave => encodeURIComponent(chave).replace(/'/g,'%27');

function obterFolha(chave){
  const c = chaveFolha(chave);
  if(!FOLHAS.has(c)){
    let salvo = null;
    try{ if(guardaFolhas()) salvo = localStorage.getItem(c); }catch(e){}
    FOLHAS.set(c, SIPC.desenho.desserializar(salvo));
  }
  return FOLHAS.get(c);
}
function trocarFolha(chave, f){ FOLHAS.set(chaveFolha(chave), f); agendarSalvarFolha(chave); }
const folhaTemDesenho = chave => SIPC.desenho.temTracos(obterFolha(chave));

function agendarSalvarFolha(chave){
  if(!guardaFolhas()) return;
  clearTimeout(SALVAR_FOLHAS.get(chave));
  SALVAR_FOLHAS.set(chave, setTimeout(() => salvarFolha(chave), 600));
}
function salvarFolha(chave){
  clearTimeout(SALVAR_FOLHAS.get(chave)); SALVAR_FOLHAS.delete(chave);
  const c = chaveFolha(chave), f = FOLHAS.get(c);
  try{
    if(!f || !f.tracos.length) return localStorage.removeItem(c);
    localStorage.setItem(c, SIPC.desenho.serializar(f, Date.now()));
    podarFolhas();
  }catch(e){ try{ podarFolhas(); }catch(x){} avisar('Não coube guardar este desenho no aparelho. Ele continua aqui até você fechar a página.'); }
}
function podarFolhas(){
  const lista = [];
  for(let i = 0; i < localStorage.length; i++){
    const k = localStorage.key(i);
    if(!k.startsWith(PREFIXO_FOLHA)) continue;
    const v = localStorage.getItem(k);
    lista.push({chave:k, tam:v.length, em:SIPC.desenho.instanteSalvo(v)});
  }
  SIPC.desenho.quaisApagar(lista).forEach(k => localStorage.removeItem(k));
}
addEventListener('pagehide', () => [...SALVAR_FOLHAS.keys()].forEach(salvarFolha));

function folhaHTML(chave, altura, rotulo){
  const k = idFolha(chave), cfg = FOLHA_CFG[chave] ||= {ferramenta:'c'};
  const botao = (f, nome) => `<button type="button" class="${cfg.ferramenta===f?'on':''}" aria-pressed="${cfg.ferramenta===f}" onclick="folhaFerramenta('${k}','${f}')">${nome}</button>`;
  return `<div class="folha"><div class="rasc-abas" role="toolbar" aria-label="Ferramentas de desenho">
      ${botao('c','Caneta')}${botao('b','Borracha')}
      <span class="rasc-ferr"><button type="button" data-acao="desfazer" onclick="folhaDesfazer('${k}')">Desfazer</button><button type="button" data-acao="limpar" onclick="folhaLimpar('${k}')">Limpar</button></span></div>
    <canvas class="rasc-tela" data-folha="${k}" width="${SIPC.desenho.LARGURA}" height="${altura}" style="aspect-ratio:${SIPC.desenho.LARGURA}/${altura}" role="img" aria-label="${escHtml(rotulo)}"></canvas></div>`;
}
function folhaFerramenta(k, f){ FOLHA_CFG[decodeURIComponent(k)].ferramenta = f; render(true); }
function folhaDesfazer(k){ const c = decodeURIComponent(k); trocarFolha(c, SIPC.desenho.desfazer(obterFolha(c))); render(true); }
function folhaLimpar(k){ const c = decodeURIComponent(k); trocarFolha(c, SIPC.desenho.limpar(obterFolha(c))); render(true); }

// Um trecho vai do meio de um segmento ao meio do seguinte: é o que deixa a letra sem quinas.
function desenharTrecho(ctx, p, i){
  const meio = (a, b) => (a + b) / 2;
  const x0 = i > 3 ? meio(p[i-6], p[i-3]) : p[i-3], y0 = i > 3 ? meio(p[i-5], p[i-2]) : p[i-2];
  ctx.lineWidth = p[i+2];
  ctx.beginPath(); ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(p[i-3], p[i-2], meio(p[i-3], p[i]), meio(p[i-2], p[i+1]));
  ctx.stroke();
}
function prepararTraco(ctx, t){
  ctx.globalCompositeOperation = t.f === 'b' ? 'destination-out' : 'source-over';
  ctx.strokeStyle = ctx.fillStyle = '#1c2430'; ctx.lineCap = ctx.lineJoin = 'round';
}
function desenharTraco(ctx, t){
  prepararTraco(ctx, t);
  if(t.p.length === 3){ ctx.beginPath(); ctx.arc(t.p[0], t.p[1], t.p[2]/2, 0, 7); ctx.fill(); return; }
  for(let i = 3; i < t.p.length; i += 3) desenharTrecho(ctx, t.p, i);
}
function redesenhar(cv, chave){
  const ctx = cv.getContext('2d');
  ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, cv.width, cv.height);
  obterFolha(chave).tracos.forEach(t => desenharTraco(ctx, t));
  if(DESENHANDO && DESENHANDO.chave === chave) desenharTraco(ctx, DESENHANDO.traco);
  const f = obterFolha(chave), caixa = cv.closest('.folha');
  caixa.querySelector('[data-acao=desfazer]').disabled = !f.passado.length;
  caixa.querySelector('[data-acao=limpar]').disabled = !f.tracos.length;
}

function ligarFolha(cv){
  const chave = decodeURIComponent(cv.dataset.folha), ctx = cv.getContext('2d');
  redesenhar(cv, chave);
  const ponto = e => {
    const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height];
  };
  const somar = e => {
    const t = DESENHANDO.traco, [x, y] = ponto(e);
    if(!SIPC.desenho.somarPonto(t, x, y, SIPC.desenho.larguraDoPonto(t.f, e.pointerType, e.pressure, SIPC.desenho.escalaDoTraco(cv.getBoundingClientRect().width)))) return;
    if(t.p.length > 3){ prepararTraco(ctx, t); desenharTrecho(ctx, t.p, t.p.length - 3); }
  };
  cv.addEventListener('pointerdown', e => {
    const agora = Date.now();
    if(e.pointerType === 'mouse' && e.button !== 0) return;
    if(e.pointerType === 'pen') ULTIMA_CANETA = agora;
    const decisao = SIPC.desenho.aoEncostar(e.pointerType, DESENHANDO && DESENHANDO.tipo, ULTIMA_CANETA, agora);
    if(decisao === 'ignorar') return;
    e.preventDefault();
    DESENHANDO = {chave, id:e.pointerId, tipo:e.pointerType, traco:SIPC.desenho.novoTraco(FOLHA_CFG[chave].ferramenta)};
    if(decisao === 'trocar') redesenhar(cv, chave);
    try{ cv.setPointerCapture(e.pointerId); }catch(err){}
    somar(e);
  });
  cv.addEventListener('pointermove', e => {
    if(!DESENHANDO || DESENHANDO.id !== e.pointerId) return;
    e.preventDefault();
    if(e.pointerType === 'pen') ULTIMA_CANETA = Date.now();
    const juntos = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    (juntos.length ? juntos : [e]).forEach(somar);
  });
  const soltar = e => {
    if(!DESENHANDO || DESENHANDO.id !== e.pointerId) return;
    const {traco, tipo} = DESENHANDO; DESENHANDO = null;
    if(tipo === 'pen') ULTIMA_CANETA = Date.now();
    if(e.type === 'pointerup'){
      trocarFolha(chave, SIPC.desenho.adicionar(obterFolha(chave), traco));
      redesenhar(cv, chave);
    } else redesenhar(cv, chave); // cancelado pelo sistema: em geral é a palma
  };
  cv.addEventListener('pointerup', soltar);
  cv.addEventListener('pointercancel', soltar);
  // O touch-action do CSS impede a rolagem; isto cobre o Safari quando a caneta arrasta a página.
  cv.addEventListener('touchmove', e => e.preventDefault(), {passive:false});
}
// Em tela pequena, os botões flutuantes de foco e reportar cobririam a folha.
let VIGIA_FOLHA = null;
function vigiarFolhas(){
  if(VIGIA_FOLHA) VIGIA_FOLHA.disconnect();
  const folhas = document.querySelectorAll('canvas[data-folha]');
  document.body.classList.remove('folha-visivel');
  if(!folhas.length) return;
  const visiveis = new Set();
  VIGIA_FOLHA = new IntersectionObserver(lista => {
    lista.forEach(i => i.isIntersecting ? visiveis.add(i.target) : visiveis.delete(i.target));
    document.body.classList.toggle('folha-visivel', visiveis.size > 0);
  });
  folhas.forEach(cv => VIGIA_FOLHA.observe(cv));
}
function desenhoAoRenderizar(){
  // O canvas onde ele estava acabou de ser trocado: o traço em curso fica guardado.
  if(DESENHANDO){ const {chave, traco} = DESENHANDO; DESENHANDO = null; if(traco.p.length) trocarFolha(chave, SIPC.desenho.adicionar(obterFolha(chave), traco)); }
  document.querySelectorAll('canvas[data-folha]').forEach(ligarFolha);
  vigiarFolhas();
}

// JPEG em fundo branco: o quadriculado da folha é só CSS e não confunde a IA.
function folhaParaJPEG(chave, altura){
  const c = document.createElement('canvas'); c.width = SIPC.desenho.LARGURA; c.height = altura;
  const ctx = c.getContext('2d');
  obterFolha(chave).tracos.forEach(t => desenharTraco(ctx, t));
  ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', .8).split(',')[1];
}
