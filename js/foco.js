/* ------------------------- cronômetro de foco -------------------------
   O aluno liga ao começar a estudar e pausa quando vai fazer outra coisa. Fica
   visível em todas as telas da trilha, fora do #app, para o render não zerar o
   relógio. As contas estão em js/nucleo/foco.js; o tempo vai para S.E.foco
   (segundos por dia), separado de S.E.minutos, que é a estimativa do plano.
   Script comum, carregado depois do app.js. */
let FOCO = null;
let focoPausouSozinho = false, focoUltimaGravacao = 0, focoBlocoDesde = 0;

const focoEstado = () => FOCO ??= SIPC.foco.focoVazio();
const focoRodando = () => focoEstado().desde != null;

function creditarFoco(seg){
  if(!seg) return;
  const d = S.E.foco = S.E.foco || {}, hoje = hojeISO();
  d[hoje] = (d[hoje]||0) + seg;
  salvarE();
}
function iniciarFoco(){ FOCO = SIPC.foco.iniciar(focoEstado(), Date.now()); focoUltimaGravacao = focoBlocoDesde = Date.now(); focoPausouSozinho = false; desenharFoco(); }
function pausarFoco(){
  const { foco, seg } = SIPC.foco.pausar(focoEstado(), Date.now());
  FOCO = foco; creditarFoco(seg); desenharFoco();
}
function encerrarFoco(){
  pausarFoco();
  const seg = FOCO.sessaoSeg, txt = SIPC.foco.relogio(seg);
  FOCO = SIPC.foco.focoVazio(); focoPausouSozinho = false; desenharFoco();
  if(seg){ ev('foco-sessao', txt); avisar('Sessão de foco encerrada: ' + txt + ' registrados no seu Painel.'); }
  if(S.aba === 'painel' && !S.vista) render(true);
}

const ICO_PLAY = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>';
const ICO_PAUSA = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';

function desenharFoco(){
  const el = document.getElementById('focoPill'); if(!el) return;
  el.hidden = S.tela !== 'app';
  if(el.hidden) return;
  const rodando = focoRodando(), seg = SIPC.foco.decorridoSeg(focoEstado(), Date.now());
  if(!rodando && !seg){ el.className = 'foco'; el.innerHTML = `<button class="foco-btn" onclick="iniciarFoco()">${ICO_PLAY} Iniciar foco</button>`; return; }
  el.className = 'foco ' + (rodando ? 'on' : 'pausado');
  el.innerHTML = `<span class="foco-relogio num" id="focoRelogio" role="timer" aria-label="Tempo de foco nesta sessão">${SIPC.foco.relogio(seg)}</span>
    ${focoPausouSozinho ? '<span class="foco-dica">pausado ao sair da página</span>' : ''}
    <button class="foco-btn" onclick="${rodando?'pausarFoco':'iniciarFoco'}()">${rodando?ICO_PAUSA+' Pausar':ICO_PLAY+' Continuar'}</button>
    ${rodando ? '' : '<button class="foco-btn fraco" onclick="encerrarFoco()">Encerrar</button>'}`;
}
// O render chama: ao sair da trilha, o tempo fecha antes de S.E mudar.
function focoAoRenderizar(){ if(S.tela !== 'app' && focoRodando()) pausarFoco(); desenharFoco(); }

setInterval(()=>{
  if(!S || !focoRodando()) return;
  if(Date.now() - focoUltimaGravacao >= SIPC.foco.INTERVALO_GRAVACAO_MS){
    const { foco, seg } = SIPC.foco.fecharTrecho(focoEstado(), Date.now());
    FOCO = foco; focoUltimaGravacao = Date.now(); creditarFoco(seg);
  }
  // Bloco longo sem parar rende menos: sugere a pausa, sem interromper nada.
  if(Date.now() - focoBlocoDesde >= SIPC.evolucao.PAUSA_SUGERIDA_SEG * 1000){ focoBlocoDesde = Date.now(); avisar('50 minutos de foco. Que tal uma pausa de 10 minutos? Água, alongar, olhar para longe.'); }
  const r = document.getElementById('focoRelogio');
  if(r) r.textContent = SIPC.foco.relogio(SIPC.foco.decorridoSeg(focoEstado(), Date.now()));
}, 1000);

// Saiu da página para fazer outra coisa: o cronômetro para sozinho e só volta
// quando o aluno mandar, para o tempo registrado ser só de estudo.
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState === 'hidden' && S && focoRodando()){ pausarFoco(); focoPausouSozinho = true; desenharFoco(); }
});

function blocoFoco(){
  const hoje = hojeISO(), d = S.E.foco || {}, soma = (de, ate) => horasTxt(Math.round(SIPC.foco.somaFoco(d, de, ate) / 60));
  return `<section class="bloco"><h3>Tempo de foco</h3>
    <p class="dim" style="font-size:13px;margin:0 0 12px">Só o tempo que você cronometrou, com as pausas de fora.</p>
    <div class="foco-totais">
      <div><span class="num">${soma(hoje, hoje)}</span><small>hoje</small></div>
      <div><span class="num">${soma(somar(hoje,-6), hoje)}</span><small>7 dias</small></div>
      <div><span class="num">${soma()}</span><small>no total</small></div>
    </div></section>`;
}

/* evolução: mostra o avanço contra a meta e o edital, sem premiar o desgaste */
function blocoEvolucao(){
  const E = SIPC.evolucao, seg = (S.E.foco||{})[hojeISO()] || 0, st = E.statusDia(seg, S.horas);
  const min = s => horasTxt(Math.round(s / 60)), cob = cobertura(), ganhos = E.diasGanhos(S.E.foco, S.horas), marco = E.proximoMarco(cob);
  const faltamTop = marco ? Math.max(1, Math.ceil(totalTopicos() * marco / 100) - Object.keys(S.E.feito).length) : 0;
  const frase = {
    comecar: 'Inicie o foco para contar seu tempo de hoje. Meta: ' + min(st.meta) + '.',
    andamento: 'Faltam ' + min(st.faltaSeg) + ' para a meta de hoje.',
    meta: 'Meta de hoje cumprida. Quer ir além? Até ' + min(st.limite) + ' ainda conta como avanço.',
    extra: 'Você passou da meta em ' + min(st.extraSeg) + ' e está adiantando o plano.',
    descanso: 'Ótimo dia. Daqui em diante o melhor é descansar: o tempo extra de hoje já foi contado e o sono também fixa o que você estudou.',
  }[st.estado];
  return `<div class="bloco evolucao"><h3>Sua evolução</h3>
    <div class="ev-topo"><b class="num">${st.pct}%</b><span class="dim">da meta de hoje</span></div>
    <div class="barra-dia"><i style="width:${st.pct}%"></i></div>
    <p class="ev-frase ${st.estado==='descanso'?'descanso':''}" role="status">${escHtml(frase)}</p>
    <ul class="ev-lista">
      <li><span>Dias adiantados</span><b class="num">${String(ganhos).replace('.',',')}</b></li>
      <li><span>Edital coberto</span><b class="num">${cob}%</b></li>
      ${marco ? `<li><span>Próximo marco: ${marco}%</span><b class="num">${faltamTop} ${faltamTop===1?'tópico':'tópicos'}</b></li>` : ''}
    </ul>
    <div class="ev-marcos" aria-label="Marcos do edital">${E.MARCOS.map(m=>`<span class="${cob>=m?'on':''}">${m}%</span>`).join('')}</div>
  </div>`;
}
