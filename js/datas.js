/* ------------------------- cronograma do concurso -------------------------
   Datas lidas do edital (inscrição, isenção, prova, resultado). O aluno confere,
   acrescenta as dele e, se sair retificação, manda o arquivo novo ou só o
   cronograma. Avisos dentro do app e no lembrete do navegador; com o app
   fechado, quem avisa é a agenda do Google do próprio aluno.
   Script comum, carregado depois do app.js. */
const dataBR = d => fmtData(dataDe(d), {day:'2-digit', month:'2-digit', year:'numeric'});
const periodoTxt = i => i.fim ? dataBR(i.inicio) + ' a ' + dataBR(i.fim) : dataBR(i.inicio);
function faltaTxt(i){
  const n = SIPC.cronograma.faltam(i, hojeISO());
  const aberto = i.fim && i.inicio <= hojeISO();
  if(n === 0) return aberto ? 'termina hoje' : 'é hoje';
  if(n === 1) return aberto ? 'termina amanhã' : 'é amanhã';
  return (aberto ? 'termina em ' : 'em ') + n + ' dias';
}

async function salvarCronograma(lista){
  S.cronograma = lista;
  const t = S.trilhas.find(x=>x.id===S.trilhaAtual); if(t) t.cronograma = lista;
  if(S.trilhaAtual) await SIPC.store.salvarTrilha(uid(), S.trilhaAtual, {cronograma: JSON.parse(JSON.stringify(lista))});
}
async function removerData(i){
  const lista = S.cronograma.filter((_,k)=>k!==i);
  try{ await salvarCronograma(lista); }catch(e){ avisar('Não consegui salvar: ' + SIPC.traduzir(e)); }
  render(true);
}
async function adicionarData(){
  const v = id => (document.getElementById(id)||{}).value || '';
  const item = {evento:v('dtEvento'), inicio:v('dtInicio'), fim:v('dtFim'), manual:true};
  if(!item.evento.trim() || !item.inicio){ S.dtErro = 'Escreva o nome da data e escolha o dia.'; render(true); return; }
  S.dtErro = null;
  try{ await salvarCronograma(SIPC.cronograma.validarCronograma([...S.cronograma, item])); }catch(e){ avisar('Não consegui salvar: ' + SIPC.traduzir(e)); }
  render(true);
}
// Retificação ou trilha antiga: lê as datas de um arquivo ou de um texto colado.
async function lerDatas(){
  const arq = (document.getElementById('dtArq')||{}).files, colado = (document.getElementById('dtTexto')||{}).value || '';
  if(!(arq && arq[0]) && !colado.trim()){ S.dtErro2 = 'Anexe o arquivo ou cole o cronograma.'; render(true); return; }
  S.dtLendo = true; S.dtErro2 = null; render(true);
  try{
    limiteVisitante();
    const lido = arq && arq[0] ? await SIPC.lerArquivo(arq[0]) : null, texto = lido ? lido.completo || lido.texto : colado;
    if(!texto) throw new Error('Não consegui tirar texto deste arquivo. Use PDF, Word ou cole o cronograma.');
    const novas = await SIPC.ia.extrairCronograma(texto);
    if(!novas.length) throw new Error('Não encontrei datas neste arquivo. Se o cronograma é um documento separado, envie-o ou adicione as datas abaixo. Nada foi alterado.');
    await salvarCronograma(SIPC.cronograma.atualizarCronograma(S.cronograma, novas));
    avisar('Cronograma atualizado com ' + novas.length + ' datas. Confira com o edital.');
  }catch(e){ S.dtErro2 = mensagemIA(e); }
  S.dtLendo = false; render(true);
}

function linhaData(i, k, passada){
  return `<li class="data-item ${passada?'passada':''}">
    <div class="data-dia num">${dataBR(i.inicio).slice(0,5)}</div>
    <div class="data-txt"><b>${escHtml(i.evento)}</b><span class="dim">${periodoTxt(i)}${passada?'':' · '+faltaTxt(i)}${i.manual?' · você adicionou':''}</span></div>
    <div class="data-acoes">${passada?'':`<a class="btn sec" href="${escHtml(SIPC.cronograma.linkAgenda(i, S.prova.nome))}" target="_blank" rel="noopener">Agenda</a>`}
      <button class="arq-x" onclick="removerData(${k})" aria-label="Remover ${escHtml(i.evento)}">${ico('x')}</button></div>
  </li>`;
}
function abaDatas(){
  const hoje = hojeISO(), todas = (S.cronograma||[]).map((i,k)=>({i,k})), proximas = SIPC.cronograma.proximasDatas(S.cronograma, hoje);
  const futura = i => proximas.includes(i);
  const lista = todas.filter(x=>futura(x.i)), passadas = todas.filter(x=>!futura(x.i));
  return `<div class="datas">
    <section class="bloco">
      <h2 style="font-size:20px;margin-bottom:6px">Cronograma do concurso</h2>
      <p class="dim" style="font-size:14px;margin:0 0 14px">As datas que você não pode perder. A leitura pode errar: confira sempre no edital. Use <b>Agenda</b> para receber o aviso do Google mesmo com o SIPC fechado.</p>
      ${lista.length ? `<ul class="data-lista">${lista.map(x=>linhaData(x.i,x.k,false)).join('')}</ul>` : `<p class="vazio">${todas.length?'Todas as datas já passaram.':'Nenhuma data ainda. Envie o edital abaixo: eu procuro as datas no arquivo inteiro.'}</p>`}
      ${passadas.length ? `<details class="data-passadas"><summary>Datas que já passaram (${passadas.length})</summary><ul class="data-lista">${passadas.map(x=>linhaData(x.i,x.k,true)).join('')}</ul></details>` : ''}
    </section>
    <section class="bloco">
      <h3>Saiu retificação?</h3>
      <p class="dim" style="font-size:14px;margin:0 0 12px">Mande o edital novo, a retificação ou só o cronograma. As datas lidas são trocadas pelas novas, e as que você adicionou ficam.</p>
      <div class="campo-f"><label class="f" for="dtArq">Arquivo (PDF, Word ou TXT)</label><input type="file" id="dtArq" accept=".pdf,.docx,.txt" ${S.dtLendo?'disabled':''}></div>
      <div class="campo-f"><label class="f" for="dtTexto">Ou cole o cronograma</label><textarea id="dtTexto" rows="4" ${S.dtLendo?'disabled':''}></textarea></div>
      ${S.dtErro2 ? `<p class="erro-f" role="alert">${escHtml(S.dtErro2)}</p>` : ''}
      <button class="btn" onclick="lerDatas()" ${S.dtLendo?'disabled':''}>${S.dtLendo?'Lendo as datas…':'Atualizar cronograma'}</button>
    </section>
    <section class="bloco">
      <h3>Adicionar uma data</h3>
      <div class="campo-f"><label class="f" for="dtEvento">O que acontece</label><input type="text" id="dtEvento" maxlength="160" placeholder="Ex.: Pagar a taxa de inscrição"></div>
      <div class="data-campos">
        <div class="campo-f"><label class="f" for="dtInicio">Dia</label><input type="date" id="dtInicio"></div>
        <div class="campo-f"><label class="f" for="dtFim">Até (opcional)</label><input type="date" id="dtFim"></div>
      </div>
      ${S.dtErro ? `<p class="erro-f" role="alert">${escHtml(S.dtErro)}</p>` : ''}
      <button class="btn sec" onclick="adicionarData()">Adicionar</button>
    </section>
  </div>`;
}

// Aviso na tela de hoje e no lembrete do navegador.
const datasPerto = () => SIPC.cronograma.datasUrgentes(S.cronograma, hojeISO());
function cartaoDatas(){
  const prox = SIPC.cronograma.proximasDatas(S.cronograma, hojeISO()).slice(0,3);
  return `<section class="bloco p-datas"><h3>Próximas datas do concurso</h3>
    ${prox.length ? `<ul class="ev-lista">${prox.map(i=>`<li><span>${escHtml(i.evento)}</span><b class="num">${dataBR(i.inicio).slice(0,5)} · ${escHtml(faltaTxt(i))}</b></li>`).join('')}</ul>` : '<p class="dim" style="font-size:14px;margin:0">Ainda não temos as datas deste concurso.</p>'}
    <button class="btn link" onclick="irAba('datas')">${prox.length?'Ver o cronograma completo':'Enviar o edital ou o cronograma'}</button></section>`;
}
function avisoDatas(){
  const u = datasPerto(); if(!u.length) return '';
  return `<div class="nota">${ico('info')}<div><b>Datas do concurso chegando:</b> ${u.slice(0,3).map(i=>escHtml(i.evento)+' ('+escHtml(faltaTxt(i))+')').join(' · ')}. <button class="btn link" onclick="irAba('datas')">Ver cronograma</button></div></div>`;
}
