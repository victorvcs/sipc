/* ------------------------- discursiva e raciocínio lógico -------------------------
   Treino em passos: cola do tema, exercício de estrutura e redação, escrita aqui
   à mão na tela ou em foto do papel. As regras e o material estão em js/nucleo/discursiva.js.
   Tudo que a IA devolve passa por escHtml. Script comum, depois do app.js. */
const novoDC = () => ({tipo:'discursiva', banca:(S.bancas||[])[0]||'', tema:'', enunciado:'', espelho:'', passo:'cola', estr:'cdarf', partes:{}, texto:'', foto:null, fotoNome:'', mao:false, corr:null, ocupado:null, erro:null, ex:null, resposta:'', corrLog:null});
const DC = () => S.dc ??= novoDC();
const temaFGV = () => { const d = DC(); return SIPC.discursiva.ehFGV(d.banca) ? SIPC.discursiva.TEMAS_FGV.find(t=>t.tema===d.tema) || null : null; };
const estruturaAtual = () => SIPC.discursiva.ESTRUTURAS.find(e=>e.id===DC().estr);

function dcCampo(k, v){ DC()[k] = v; }
function dcIr(k, v){ const d = DC(); d[k] = v; d.erro = null; render(true); }
function dcTipo(t){ S.dc = {...novoDC(), banca:DC().banca, tipo:t}; render(true); }
function dcTema(i){ const t = SIPC.discursiva.TEMAS_FGV[i], d = DC(); d.tema = t.tema; d.enunciado = t.enunciado; d.corr = null; d.erro = null; render(true); }
function dcParte(i, v){ DC().partes[i] = v; }

// Recria a imagem no navegador: reduz o tamanho e descarta o resto do arquivo.
async function reduzirFoto(file){
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Use uma foto em JPG, PNG ou WEBP.');
  if(file.size > 15e6) throw new Error('A foto passa de 15 MB.');
  const bmp = await createImageBitmap(file), escala = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width*escala); c.height = Math.round(bmp.height*escala);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close();
  return c.toDataURL('image/jpeg', .8).split(',')[1];
}
async function dcEscolherFoto(input){
  const f = input.files && input.files[0], d = DC(); if(!f) return;
  try{ d.foto = await reduzirFoto(f); d.fotoNome = f.name; d.erro = null; }
  catch(e){ d.foto = null; d.erro = e.message === 'A foto passa de 15 MB.' || /^Use uma foto/.test(e.message) ? e.message : 'Não consegui abrir essa foto. Tente outra em JPG ou PNG.'; }
  render(true);
}
function dcTirarFoto(){ const d = DC(); d.foto = null; d.fotoNome = ''; render(true); }

// A folha à mão vira JPEG só na hora de corrigir e segue pelo mesmo campo da foto.
const NOME_DESENHO = 'Escrito à mão na tela';
const folhaDC = () => 'dc#' + DC().tipo;
function dcModoMao(sim){
  const d = DC(); d.mao = sim;
  if(!sim && d.fotoNome === NOME_DESENHO){ d.foto = null; d.fotoNome = ''; }
  render(true);
}
function dcUsarDesenho(){
  const d = DC(); if(!d.mao) return;
  if(folhaTemDesenho(folhaDC())){ d.foto = folhaParaJPEG(folhaDC(), SIPC.desenho.ALTURA_FOLHA); d.fotoNome = NOME_DESENHO; }
  else if(d.fotoNome === NOME_DESENHO){ d.foto = null; d.fotoNome = ''; }
}

async function dcCorrigir(modo){
  const d = DC();
  const texto = modo === 'estrutura' ? SIPC.discursiva.textoDaEstrutura(estruturaAtual(), d.partes) : d.texto.trim();
  if(!d.tema.trim()){ d.erro = 'Escreva o tema primeiro.'; return render(true); }
  if(modo !== 'estrutura') dcUsarDesenho();
  if(modo === 'estrutura' ? !texto : (!texto && !d.foto)){ d.erro = modo === 'estrutura' ? 'Preencha pelo menos uma parte.' : 'Escreva o texto, use a folha à mão ou anexe a foto.'; return render(true); }
  d.ocupado = 'Corrigindo no padrão da banca…'; d.erro = null; d.corr = null; render(true);
  try{
    limiteVisitante();
    const corr = await SIPC.ia.corrigirDiscursiva({banca:d.banca, tema:d.tema, enunciado:d.enunciado, espelho:d.espelho, texto, foto: modo === 'estrutura' ? null : d.foto, modo, estrutura: modo === 'estrutura' ? estruturaAtual().nome : ''});
    d.corr = corr;
    S.E.discursivas = SIPC.discursiva.somarHistorico(S.E.discursivas, {data:hojeISO(), tipo:modo, banca:d.banca, tema:d.tema, nota:corr.total, max:corr.max});
    salvarE(); ev('discursiva-corrigida', d.tema + ' · ' + corr.total + '/' + corr.max);
  }catch(e){ d.erro = mensagemIA(e); }
  d.ocupado = null; render(true);
}
async function dcNovoLogico(){
  const d = DC(); if(!d.tema.trim()){ d.erro = 'Escreva o assunto primeiro.'; return render(true); }
  d.ocupado = 'Preparando o exercício…'; d.erro = null; d.ex = null; d.corrLog = null; d.resposta = ''; d.foto = null; d.fotoNome = ''; trocarFolha(folhaDC(), SIPC.desenho.folhaVazia()); render(true);
  try{ limiteVisitante(); d.ex = await SIPC.ia.gerarExercicioLogico({banca:d.banca, assunto:d.tema}); }
  catch(e){ d.erro = mensagemIA(e); }
  d.ocupado = null; render(true);
}
async function dcCorrigirLogico(){
  const d = DC(); dcUsarDesenho();
  if(!d.resposta.trim() && !d.foto){ d.erro = 'Escreva a sua resolução, use a folha à mão ou anexe a foto.'; return render(true); }
  d.ocupado = 'Conferindo a sua resolução…'; d.erro = null; render(true);
  try{
    limiteVisitante();
    d.corrLog = await SIPC.ia.corrigirLogico({exercicio:d.ex, texto:d.resposta.trim(), foto:d.foto});
    S.E.discursivas = SIPC.discursiva.somarHistorico(S.E.discursivas, {data:hojeISO(), tipo:'logico', banca:d.banca, tema:d.tema, nota:d.corrLog.acertou?1:0, max:1});
    salvarE(); ev('logico-corrigido', d.tema + (d.corrLog.acertou ? ' · acertou' : ' · errou'));
  }catch(e){ d.erro = mensagemIA(e); }
  d.ocupado = null; render(true);
}

const listaHTML = l => `<ul>${l.map(x=>`<li>${escHtml(x)}</li>`).join('')}</ul>`;
function campoFoto(){
  const d = DC();
  const privacidade = 'Não inclua nome, CPF ou outros dados pessoais: a imagem vai para a IA do Google.';
  return `<div class="campo-f"><div class="dc-temas" role="group" aria-label="Como enviar o texto à mão">
      <button type="button" class="chip ${d.mao?'':'on'}" aria-pressed="${!d.mao}" onclick="dcModoMao(false)">Foto do papel</button>
      <button type="button" class="chip ${d.mao?'on':''}" aria-pressed="${d.mao}" onclick="dcModoMao(true)">Escrever à mão na tela</button></div>
    ${d.mao ? `${folhaHTML(folhaDC(), SIPC.desenho.ALTURA_FOLHA, 'Folha para escrever à mão')}
    <p class="dica">Letra grande e clara ajuda a IA a ler. Para rolar a página, arraste fora da folha. ${privacidade}</p>` : `<label class="f" for="dcFoto">Escreveu no papel? Mande a foto</label>
    ${d.foto ? `<p class="dc-foto">Foto pronta: ${escHtml(d.fotoNome)} <button class="btn link" onclick="dcTirarFoto()">Trocar</button></p>` : `<input type="file" id="dcFoto" accept="image/jpeg,image/png,image/webp" onchange="dcEscolherFoto(this)">`}
    <p class="dica">Foto reta, com boa luz, só com o texto. ${privacidade}</p>`}</div>`;
}
function correcaoHTML(c){
  return `<section class="bloco dc-corr" aria-live="polite"><h3>Correção</h3>
    <div class="dc-nota"><b class="num">${String(c.total).replace('.',',')}</b><span class="dim">de ${c.max}. Nota estimada, não é a da banca.</span></div>
    <ul class="dc-crit">${c.notas.map(n=>`<li><div><b>${escHtml(n.rot)}</b>${n.comentario?`<span class="dim">${escHtml(n.comentario)}</span>`:''}</div><span class="num">${String(n.nota).replace('.',',')}/${n.max}</span></li>`).join('')}</ul>
    ${c.bem.length ? `<h4>O que você fez bem</h4>${listaHTML(c.bem)}` : ''}
    ${c.corrigir.length ? `<h4>O que corrigir para subir a nota</h4>${listaHTML(c.corrigir)}` : ''}
    ${c.lingua.length ? `<h4>Língua portuguesa</h4><ul>${c.lingua.map(l=>`<li><s>${escHtml(l.trecho)}</s> → <b>${escHtml(l.correcao)}</b>${l.tipo?` <span class="dim">(${escHtml(l.tipo)})</span>`:''}</li>`).join('')}</ul>` : ''}
    ${c.modelo ? `<details class="aj" open><summary>Versão modelo</summary><p class="dc-texto">${escHtml(c.modelo)}</p></details>` : ''}
    ${c.transcricao ? `<details class="aj"><summary>O que a IA leu na foto</summary><p class="dc-texto">${escHtml(c.transcricao)}</p></details>` : ''}
  </section>`;
}
function passoCola(){
  const t = temaFGV(), d = DC();
  if(!t) return `<section class="bloco"><h3>Antes de escrever</h3>
    <p class="dim" style="font-size:14px;margin:0">${SIPC.discursiva.ehFGV(d.banca) ? 'A cola pronta existe para os temas sugeridos acima.' : 'Ainda não analisamos as provas desta banca.'} Monte a sua própria com o método C-D-A-R-F no próximo passo. Se tiver o espelho de correção, cole abaixo: a correção segue o que ele pede.</p></section>`;
  const b = (r, l) => `<h4>${r}</h4>${listaHTML(l)}`;
  return `<section class="bloco dc-cola"><h3>Cola do tema</h3>
    ${b('Conceito',t.conceito)}${b('Aplicação',t.aplicacao)}${b('O que resolve',t.resolve)}${b('Riscos (cite pelo menos 2)',t.riscos)}
    <h4>Fechamento</h4><p class="dc-texto">${escHtml(t.fechamento)}</p>
    <button class="btn" onclick="dcIr('passo','estrutura')">Treinar a estrutura</button></section>`;
}
function passoEstrutura(){
  const d = DC(), e = estruturaAtual();
  return `<section class="bloco"><h3>Exercício de estrutura</h3>
    <p class="dim" style="font-size:14px;margin:0 0 12px">Só as ideias, sem se preocupar com o texto final. Comece pelo C-D-A-R-F em tópicos e depois varie.</p>
    <div class="campo-f"><label class="f" for="dcEstr">Estrutura</label><select id="dcEstr" onchange="dcIr('estr',this.value);DC().partes={};render(true)">${SIPC.discursiva.ESTRUTURAS.map(x=>`<option value="${x.id}" ${x.id===d.estr?'selected':''}>${escHtml(x.nome)}</option>`).join('')}</select></div>
    ${e.partes.map((p,i)=>`<div class="campo-f"><label class="f" for="dcP${i}">${escHtml(p.rot)}</label><p class="dica" style="margin:0 0 6px">${escHtml(p.modelo)}</p><textarea id="dcP${i}" rows="2" oninput="dcParte(${i},this.value)">${escHtml(d.partes[i]||'')}</textarea></div>`).join('')}
    <div class="fim-estudo"><button class="btn" onclick="dcCorrigir('estrutura')" ${d.ocupado?'disabled':''}>Corrigir a estrutura</button><button class="btn sec" onclick="dcIr('passo','redacao')">Ir para a redação</button></div></section>`;
}
function passoRedacao(){
  const d = DC();
  return `<section class="bloco"><h3>Redação</h3>
    <div class="campo-f"><label class="f" for="dcTexto">Escreva aqui</label><textarea id="dcTexto" rows="12" oninput="dcCampo('texto',this.value)">${escHtml(d.texto)}</textarea></div>
    ${campoFoto()}
    <button class="btn" onclick="dcCorrigir('redacao')" ${d.ocupado?'disabled':''}>Corrigir a redação</button></section>`;
}
function vistaDiscursiva(){
  const d = DC(), fgv = SIPC.discursiva.ehFGV(d.banca);
  return `<section class="bloco">
    <div class="campo-f"><label class="f" for="dcBanca">Banca</label><input type="text" id="dcBanca" value="${escHtml(d.banca)}" oninput="dcCampo('banca',this.value)" onchange="render(true)" placeholder="Ex.: FGV"></div>
    <div class="campo-f"><label class="f" for="dcTema">Tema</label><input type="text" id="dcTema" value="${escHtml(d.tema)}" oninput="dcCampo('tema',this.value)" onchange="render(true)" placeholder="Ex.: LGPD aplicada ao Judiciário"></div>
    ${fgv ? `<div class="dc-temas" role="group" aria-label="Temas sugeridos">${SIPC.discursiva.TEMAS_FGV.map((t,i)=>`<button class="chip ${d.tema===t.tema?'on':''}" onclick="dcTema(${i})">${escHtml(t.tema)}</button>`).join('')}</div>` : ''}
    <div class="campo-f"><label class="f" for="dcEnun">Enunciado (opcional)</label><textarea id="dcEnun" rows="3" oninput="dcCampo('enunciado',this.value)">${escHtml(d.enunciado)}</textarea></div>
    <div class="campo-f"><label class="f" for="dcEsp">Espelho ou critérios da banca (opcional)</label><textarea id="dcEsp" rows="3" oninput="dcCampo('espelho',this.value)" placeholder="Cole o que a banca pede. A correção segue este texto.">${escHtml(d.espelho)}</textarea></div>
    ${fgv ? '' : '<p class="dica">Sem espelho, a correção usa critérios gerais, baseados no modelo FGV.</p>'}
  </section>
  <nav class="bl-filtro" aria-label="Passos">${[['cola','1. Cola'],['estrutura','2. Estrutura'],['redacao','3. Redação']].map(([k,n])=>`<button class="chip ${d.passo===k?'on':''}" onclick="dcIr('passo','${k}')">${n}</button>`).join('')}</nav>
  ${d.passo==='cola' ? passoCola() : d.passo==='estrutura' ? passoEstrutura() : passoRedacao()}`;
}
function vistaLogico(){
  const d = DC(), c = d.corrLog;
  return `<section class="bloco">
    <div class="campo-f"><label class="f" for="dcBanca">Banca</label><input type="text" id="dcBanca" value="${escHtml(d.banca)}" oninput="dcCampo('banca',this.value)"></div>
    <div class="campo-f"><label class="f" for="dcTema">Assunto</label><input type="text" id="dcTema" value="${escHtml(d.tema)}" oninput="dcCampo('tema',this.value)" placeholder="Ex.: Tabela-verdade, porcentagem, sequências"></div>
    <button class="btn" onclick="dcNovoLogico()" ${d.ocupado?'disabled':''}>${d.ex?'Outro exercício':'Gerar exercício'}</button></section>
  ${d.ex ? `<section class="bloco"><h3>Exercício</h3><p class="dc-texto">${escHtml(d.ex.enunciado)}</p>
    <div class="campo-f"><label class="f" for="dcRes">A sua resolução, passo a passo</label><textarea id="dcRes" rows="7" oninput="dcCampo('resposta',this.value)">${escHtml(d.resposta)}</textarea></div>
    ${campoFoto()}
    <button class="btn" onclick="dcCorrigirLogico()" ${d.ocupado?'disabled':''}>Conferir</button></section>` : ''}
  ${c ? `<section class="bloco dc-corr" aria-live="polite"><h3>${c.acertou?'Você acertou':'Ainda não'}</h3>
    ${c.comentario?`<p class="dc-texto">${escHtml(c.comentario)}</p>`:''}
    ${c.erros.length?`<h4>Onde foi o erro</h4>${listaHTML(c.erros)}`:''}
    <h4>Resolução</h4><p class="dc-texto">${escHtml(d.ex.resolucao)}</p>
    ${c.proximoPasso?`<h4>Próximo passo</h4><p class="dc-texto">${escHtml(c.proximoPasso)}</p>`:''}
    ${c.transcricao?`<details class="aj"><summary>O que a IA leu na foto</summary><p class="dc-texto">${escHtml(c.transcricao)}</p></details>`:''}
  </section>` : ''}`;
}
function abaDiscursiva(){
  const d = DC(), hist = (S.E.discursivas||[]).filter(h=>h.tipo!=='logico').slice(0,5);
  return `<div class="discursiva">
    <nav class="abas" aria-label="Tipo de treino" style="margin-bottom:0">${[['discursiva','Discursiva'],['logico','Raciocínio lógico']].map(([k,n])=>`<button class="aba ${d.tipo===k?'on':''}" onclick="dcTipo('${k}')">${n}</button>`).join('')}</nav>
    ${d.tipo==='logico' ? vistaLogico() : vistaDiscursiva()}
    ${d.ocupado ? `<div class="carregando-etapa" role="status"><span class="giro"></span>${escHtml(d.ocupado)}</div>` : ''}
    ${d.erro ? `<p class="erro-f" role="alert">${escHtml(d.erro)}</p>` : ''}
    ${d.tipo==='discursiva' && d.corr ? correcaoHTML(d.corr) : ''}
    ${d.tipo==='discursiva' && hist.length ? `<section class="bloco"><h3>Suas últimas notas</h3><ul class="ev-lista">${hist.map(h=>`<li><span>${escHtml(h.tema)}${h.tipo==='estrutura'?' · estrutura':''}</span><b class="num">${String(h.nota).replace('.',',')}/${h.max}</b></li>`).join('')}</ul></section>` : ''}
  </div>`;
}
