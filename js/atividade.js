/* ------------------------------------------------------------------
   Registro de uso para o acompanhamento do Victor (aba Admin).
   Cada visita vira uma sessão: início, fim, tempo ATIVO (aba visível e
   com interação nos últimos 2 minutos), tempo por tela e as ações
   principais. Grava no máximo uma vez por minuto, e ao esconder a aba,
   para caber folgado na cota gratuita do Firestore.
   Não registra nada no modo teste nem sem conta: o tour promete que,
   com o modo teste ligado, nada é gravado.
   Script comum, carregado depois do app.js (usa S, SIPC e nomeTelaAtual).
------------------------------------------------------------------- */
const ATIV = { s: null, uid: null, ultimoUso: Date.now(), sujo: false, ultimaGravacao: 0 };
const TICK_SEG = 15, OCIOSO_MS = 120000, NOVA_SESSAO_MS = 30 * 60000, MAX_EVENTOS = 300;

const podeRegistrar = () => !!(window.SIPC && S && S.usuario && !S.modoTeste && !S.visitante);

function novaSessao(){
  return { inicio: new Date().toISOString(), fim: new Date().toISOString(), ativoSeg: 0, telas: {}, eventos: [],
           disp: innerWidth < 700 ? 'Celular' : 'Computador', trilha: (S.prova && S.trilhaAtual) ? String(S.prova.nome).slice(0, 120) : '' };
}
// Garante uma sessão aberta para o usuário atual; abre outra se mudou de conta
// ou se ficou mais de 30 minutos parado.
function sessaoAtual(){
  if(!podeRegistrar()) return null;
  const uid = S.usuario.uid;
  if(!ATIV.s || ATIV.uid !== uid || Date.now() - new Date(ATIV.s.fim).getTime() > NOVA_SESSAO_MS){
    if(ATIV.s && ATIV.sujo) gravarSessao();
    ATIV.s = novaSessao(); ATIV.uid = uid; ATIV.id = 's' + Date.now(); ATIV.sujo = true;
  }
  return ATIV.s;
}
// Ações principais (tipo curto + detalhe), chamadas do app.js.
function evento(tipo, detalhe){
  const s = sessaoAtual(); if(!s) return;
  s.eventos.push({ t: new Date().toISOString(), tipo, d: detalhe == null ? '' : String(detalhe).slice(0, 160), tela: telaParaRegistro() });
  if(s.eventos.length > MAX_EVENTOS) s.eventos.splice(0, s.eventos.length - MAX_EVENTOS);
  s.fim = new Date().toISOString(); ATIV.sujo = true;
}
const telaParaRegistro = () => { try{ return nomeTelaAtual(); }catch(e){ return S.tela; } };
let ultimaTela = null;
// Chamado a cada render: troca de tela vira um evento "tela".
function aoRenderizar(){
  if(!podeRegistrar()) return;
  const t = telaParaRegistro();
  if(t !== ultimaTela){ ultimaTela = t; evento('tela', t); }
}
async function gravarSessao(){
  if(!ATIV.s || !ATIV.uid || !ATIV.sujo) return;
  const uid = ATIV.uid, id = ATIV.id, dados = JSON.parse(JSON.stringify(ATIV.s));
  ATIV.sujo = false; ATIV.ultimaGravacao = Date.now();
  try{ await SIPC.store.salvarSessao(uid, id, dados); }catch(e){ ATIV.sujo = true; } // tenta de novo no próximo minuto
}
['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => addEventListener(ev, () => { ATIV.ultimoUso = Date.now(); }, { passive: true, capture: true }));
// A cada 15 s: soma tempo ativo na tela atual; a cada minuto, grava se mudou algo.
setInterval(() => {
  if(document.visibilityState !== 'visible' || Date.now() - ATIV.ultimoUso > OCIOSO_MS) return;
  const s = sessaoAtual(); if(!s) return;
  const t = telaParaRegistro();
  s.ativoSeg += TICK_SEG; s.telas[t] = (s.telas[t] || 0) + TICK_SEG; s.fim = new Date().toISOString(); ATIV.sujo = true;
  if(Date.now() - ATIV.ultimaGravacao >= 60000) gravarSessao();
}, TICK_SEG * 1000);
addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden') gravarSessao(); });
addEventListener('pagehide', () => { gravarSessao(); });
