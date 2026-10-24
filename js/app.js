/* ------------------------------------------------------------------
   SIPC v1 — interface. Portada do prototipo.html (mesmo fluxo e visual),
   agora com conta, Firestore e IA de verdade. É um script comum (não
   módulo) porque o HTML gerado chama as funções direto pelo onclick;
   tudo que fala com o Firebase chega pelo window.SIPC (js/main.js).
------------------------------------------------------------------- */
const ico = (n, c='') => `<svg class="ico ${c}" viewBox="0 0 24 24"><use href="#i-${n}"/></svg>`;
const fmtData = (d, o) => d.toLocaleDateString('pt-BR', o);
function escHtml(s){ return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
const semAcento = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const pad = n => String(n).padStart(2,'0');
// Data de hoje no fuso do aluno. S.hojeFixo existe para testar o 1-7-30 pelo
// console sem esperar os dias passarem (S.hojeFixo='2026-11-01'; render()).
function hojeISO(){ if(S && S.hojeFixo) return S.hojeFixo; const d = new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
const dataDe = iso => new Date(iso+'T12:00:00');
const somar = (iso, n) => SIPC.revisao.somarDias(iso, n);
const diasEntre = (a, b) => Math.round((dataDe(b) - dataDe(a))/86400000);
const dowDe = iso => (dataDe(iso).getDay()+6)%7; // 0 = segunda
function dataMais(n){ return fmtData(dataDe(somar(hojeISO(), n)),{day:'2-digit',month:'2-digit'}); }

// O conteúdo vem da IA e fica num cache que qualquer aluno logado pode criar:
// só passam tags de texto, sem atributos (nada de script, link ou onclick).
const TAGS_OK = new Set(['P','B','I','STRONG','EM','H3','H4','TABLE','THEAD','TBODY','TR','TH','TD','BR','UL','OL','LI','SMALL','CODE']);
function htmlSeguro(html){
  const t = document.createElement('template'); t.innerHTML = String(html || '');
  (function limpar(no){
    [...no.childNodes].forEach(f => {
      if(f.nodeType === 3) return;
      if(f.nodeType === 1 && /^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|TEMPLATE|SVG|MATH)$/i.test(f.tagName)){ f.remove(); return; } // some com o conteúdo
      if(f.nodeType !== 1 || !TAGS_OK.has(f.tagName)){ if(f.nodeType === 1){ limpar(f); f.replaceWith(...f.childNodes); } else f.remove(); return; }
      [...f.attributes].forEach(a => f.removeAttribute(a.name));
      limpar(f);
    });
  })(t.content);
  return t.innerHTML;
}

const BANCAS = [
  {n:'FGV', f:'Múltipla escolha, A a E'}, {n:'Cebraspe', f:'Certo ou Errado'}, {n:'FCC', f:'Múltipla escolha, A a E'},
  {n:'Vunesp', f:'Múltipla escolha, A a E'}, {n:'Cesgranrio', f:'Múltipla escolha, A a E'}, {n:'IBFC', f:'Múltipla escolha'},
  {n:'Instituto AOCP', f:'Múltipla escolha, A a E'}, {n:'Quadrix', f:'Múltipla escolha ou Certo/Errado'}, {n:'IDECAN', f:'Múltipla escolha'},
  {n:'Consulplan', f:'Múltipla escolha'}, {n:'Fundatec', f:'Múltipla escolha'}, {n:'IADES', f:'Múltipla escolha'}
];
const ETAPAS = [{dias:1, rot:'24 horas', curto:'24h'}, {dias:7, rot:'7 dias', curto:'7d'}, {dias:30, rot:'30 dias', curto:'30d'}];
const MIN_REV = [10, 8, 5];

let S; // estado da tela
function estadoInicial(){
  return {
    tela:'carregando', entrada:'inicio', passo:1, usuario:null, perfil:null, visitante:false, modoTeste:false,
    form:{nome:'', email:'', senha:''}, verSenha:false, aceite:false, erroForm:null, linkEnviado:false, ocupado:false,
    trilhas:[], trilhaAtual:null, trilhaCriadaEm:null, resumos:{},
    ...trilhaVazia(),
    aba:'hoje', vista:null, estudo:null, quiz:null, itemAtual:null
  };
}
// Campos da trilha em edição (setup) ou aberta.
function trilhaVazia(){
  return {
    edModo:null, edStatus:'ocioso', edPasso:0, arquivos:[], recusados:[], filtroCargo:'', erroLeitura:null,
    materias:[], abertas:{}, prova:{nome:'Minha trilha', cargo:'', bancaEdital:null, bancaADefinir:false, semEdital:false, pesoTipo:'pontos', fonte:'', data:''},
    novaMat:null, bancas:[], buscaBanca:'', bancaOutra:'', formatoQuestoes:'multipla5',
    horas:1.5, dias:[true,true,true,true,true,false,false], dataProva: somarDiasHoje(120), qtdQuestoes:10,
    E: estadoVazio()
  };
}
function somarDiasHoje(n){ const d = new Date(); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function estadoVazio(){ return {feito:{}, revisoes:[], parcial:{}, questoes:[], minutos:{}, rascunhos:{}, diario:{}}; }
const uid = () => S.usuario ? S.usuario.uid : 'visitante';
const ehAdmin = () => !!(S.usuario && S.usuario.email === SIPC.ADMIN_EMAIL);
// estadoOk só fica verdadeiro depois que o estado da trilha foi lido: gravar
// um estado vazio por falha de rede apagaria semanas de progresso.
function salvarE(){ if(S.trilhaAtual && S.estadoOk){ podarEstado(S.E); SIPC.store.salvarEstado(uid(), S.trilhaAtual, S.E); } }
// O documento do Firestore tem limite de 1 MB. "Continuar de onde parou" guarda
// as questões geradas, e os rascunhos também crescem: fica só o recente.
const MAX_PARCIAIS = 6, LIMITE_ESTADO = 700000;
function podarEstado(E){
  const parc = Object.entries(E.parcial||{}).sort((a,b)=>(b[1].em||0)-(a[1].em||0));
  parc.slice(MAX_PARCIAIS).forEach(([k]) => delete E.parcial[k]);
  if(JSON.stringify(E).length <= LIMITE_ESTADO) return;
  // Ainda grande: rascunhos de levas que não estão mais abertas saem, depois as questões dos parciais antigos.
  const abertos = new Set(Object.values(E.parcial).map(p => p.estudo ? p.estudo.chave+'#'+(p.estudo.geradoEm||0) : null).filter(Boolean));
  Object.keys(E.rascunhos||{}).forEach(k => { if(![...abertos].some(a => k.startsWith(a+'#'))) delete E.rascunhos[k]; });
  for(const [k, p] of parc.slice(1).reverse()){
    if(JSON.stringify(E).length <= LIMITE_ESTADO) break;
    if(p.estudo && E.parcial[k]){ E.parcial[k].estudo.questoes = null; E.parcial[k].estudo.resp = {}; }
  }
}
window.aoErroSalvar = e => avisar('Não consegui salvar seu progresso agora (' + (e && e.message || e) + '). Confira a internet; o que está na tela continua aqui.');

/* ------------------------- cálculo do ritmo ------------------------- */
const totalTopicos = () => S.materias.reduce((a,m)=>a+m.topicos.length,0);
function ritmo(){
  const r = SIPC.trilha.ritmo({totalTopicos: totalTopicos(), horas:S.horas, dias:S.dias, dataProva:S.dataProva, hojeISO:hojeISO()});
  return {...r, totalTop: totalTopicos()};
}

/* ------------------------- assistente (setup) ------------------------- */
const NOMES_PASSO = ['Edital','Matérias','Banca','Ritmo','Pronto'];

function telaAssist(){
  const p = S.passo;
  const barra = NOMES_PASSO.map((n,i)=>`<div class="passo ${i+1<p?'feito':''} ${i+1===p?'atual':''}"><i></i>${n}</div>`).join('');
  let corpo = '', podeSeguir = true, rotuloSeguir = 'Continuar';
  if(p===1){ corpo = passoEdital(); podeSeguir = S.edStatus==='pronto'; }
  if(p===2){ corpo = passoMaterias(); podeSeguir = S.materias.length>0; }
  if(p===3){ corpo = passoBanca(); podeSeguir = S.bancas.length>0; }
  if(p===4){ corpo = passoRitmo(); podeSeguir = S.dias.some(Boolean); }
  if(p===5){ corpo = passoPronto(); rotuloSeguir = S.ocupado ? 'Salvando…' : 'Começar hoje'; podeSeguir = !S.ocupado; }
  return `<div class="wiz">
    <div class="wiz-top"><span class="marca">SIPC</span><span class="dim" style="font-size:13px;display:flex;align-items:center;gap:12px">${chaveTeste()}${S.usuario ? `Olá, ${escHtml(S.usuario.nome)} · ` : ''}Configuração · cerca de 3 min${S.trilhas.length ? ` · <button class="mini" onclick="irTrilhas()">minhas trilhas</button>` : ''}</span></div>
    ${S.visitante ? `<div class="aviso" style="margin-bottom:18px">Sem conta: dá para usar tudo, mas nada é salvo. Crie uma conta quando quiser guardar a trilha.</div>` : ''}
    <div class="passos" role="list" aria-label="Etapas da configuração">${barra}</div>
    <section class="tela" key="${p}">${corpo}</section>
  </div>
  <div class="acoes"><div class="acoes-in">
    ${p>1 ? `<button class="btn sec" onclick="irPasso(${p-1})">Voltar</button>` : '<span></span>'}
    <button class="btn" ${podeSeguir?'':'disabled'} onclick="${p<5?`irPasso(${p+1})`:'comecar()'}">${rotuloSeguir}</button>
  </div></div>`;
}

// Tipos de arquivo aceitos no passo 1: PDF (pdf.js), planilha (SheetJS) e
// Word (mammoth), lidos no próprio navegador.
const TIPOS = {
  pdf:      {rot:'PDF',      ico:'doc',   ext:['pdf'],                     achar:'Encontrando o conteúdo programático'},
  planilha: {rot:'Planilha', ico:'sheet', ext:['xlsx','xls','csv','ods'],  achar:'Lendo as colunas Matéria, Peso e Assunto'},
  doc:      {rot:'Word',     ico:'doc',   ext:['docx','txt'],              achar:'Encontrando a lista de matérias no texto'}
};
const ACEITOS = Object.values(TIPOS).flatMap(t=>t.ext.map(e=>'.'+e)).join(',');
function tipoDe(nome){ const ext = (nome.split('.').pop()||'').toLowerCase(); return Object.keys(TIPOS).find(k=>TIPOS[k].ext.includes(ext)) || null; }
function passosLeitura(){
  if(S.edModo==='texto') return ['Lendo o texto colado','Separando matérias e pesos','Organizando os tópicos de cada matéria'];
  const p = [];
  if(S.arquivos.length>1) p.push(`Juntando ${S.arquivos.length} arquivos`);
  S.arquivos.forEach(a=>{ p.push(`Abrindo ${a.nome}`); p.push(TIPOS[a.tipo].achar); });
  p.push('Separando matérias e pesos','Organizando os tópicos de cada matéria');
  return p;
}
function addArquivos(lista){
  const recusados = [];
  [...lista].forEach(f=>{
    const tipo = tipoDe(f.name);
    if(!tipo){ recusados.push(f.name); return; }
    if(!S.arquivos.some(a=>a.nome===f.name)) S.arquivos.push({nome:f.name, tipo, file:f});
  });
  S.recusados = recusados;
  render(true);
}
function removerArquivo(i){ S.arquivos.splice(i,1); render(true); }

function passoEdital(){
  const passos = passosLeitura();
  let estado = '';
  if(S.edStatus==='lendo' || S.edStatus==='pronto' || S.edStatus==='erro'){
    const fontes = S.edModo==='texto' ? 'do texto colado' : S.arquivos.length>1 ? `de ${S.arquivos.length} arquivos` : 'do arquivo';
    estado = `<div class="leitura" aria-live="polite"><ol>${passos.map((t,i)=>`<li class="${i<S.edPasso?'on':''}">${ico('check')}<span>${escHtml(t)}</span></li>`).join('')}</ol>
      ${S.edStatus==='lendo' && S.edPasso>=passos.length-1 ? '<p class="dim" style="font-size:13px;margin:8px 0 0">A IA ainda está lendo. Edital grande pode levar até um minuto.</p>' : ''}
      ${S.edStatus==='pronto' ? `<div class="achado"><b>Achei ${S.materias.length} matérias e ${totalTopicos()} tópicos ${fontes}.</b><br>${escHtml(S.prova.nome)}${S.prova.cargo?' · '+escHtml(S.prova.cargo):''}${S.prova.bancaEdital?' · banca '+escHtml(S.prova.bancaEdital):' · banca a definir'}${S.prova.semEdital?' · edital ainda não publicado':S.prova.data?' · prova em '+fmtData(dataDe(S.prova.data),{day:'2-digit',month:'2-digit',year:'numeric'}):''}.<br><span style="font-size:13px">A leitura pode errar: confira no próximo passo.</span></div>` : ''}
      ${S.edStatus==='erro' ? `<div class="erro"><b>${S.erroLeitura ? escHtml(S.erroLeitura) : 'Não encontrei a lista de matérias.'}</b>${S.erroIA ? '' : '<br>Pode ser um PDF escaneado (imagem), uma planilha sem a coluna das matérias ou só o aviso de abertura do concurso. Tente o edital completo, outro arquivo, ou cole o trecho do conteúdo programático.'}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">${S.erroIA ? '<button class="btn" onclick="tentarLeituraDeNovo()">Tentar de novo</button>' : ''}<button class="btn sec" onclick="escolherEdital('arquivo')">Anexar outro arquivo</button><button class="btn sec" onclick="escolherEdital('texto')">Colar o texto</button></div>` : ''}
    </div>`;
  }
  const cargo = `<div class="campo-f" style="margin-top:14px"><label class="f" for="edCargo">Seu cargo ou área (só se o edital tiver vários)</label><input type="text" id="edCargo" value="${escHtml(S.filtroCargo)}" oninput="S.filtroCargo=this.value" placeholder="Ex.: Técnico Judiciário — Área Administrativa"></div>`;
  let entrada = '';
  if(S.edStatus==='ocioso' && S.edModo==='arquivo'){
    const lista = S.arquivos.map((a,i)=>`<li class="arq">${ico(TIPOS[a.tipo].ico)}<span class="arq-nome">${escHtml(a.nome)}</span><span class="arq-tipo">${TIPOS[a.tipo].rot}</span>
      <button class="arq-x" onclick="removerArquivo(${i})" aria-label="Remover ${escHtml(a.nome)}">${ico('x')}</button></li>`).join('');
    entrada = `<div class="soltar" id="soltar"
        ondragover="event.preventDefault();this.classList.add('sobre')" ondragleave="this.classList.remove('sobre')"
        ondrop="event.preventDefault();this.classList.remove('sobre');addArquivos(event.dataTransfer.files)">
        ${ico('upload')}<p>Arraste os arquivos aqui ou escolha no computador ou no celular.</p>
        <div class="formatos"><span>${ico('doc')} PDF</span><span>${ico('sheet')} Excel, CSV</span><span>${ico('doc')} Word (.docx), TXT</span></div>
        <label class="btn" for="edArq">Escolher arquivos</label>
        <input type="file" id="edArq" multiple accept="${ACEITOS}" onchange="addArquivos(this.files)" hidden>
      </div>
      ${S.recusados && S.recusados.length ? `<p class="erro" style="margin:12px 0 0">Não consigo ler ${escHtml(S.recusados.join(', '))}. Use PDF, planilha (Excel, CSV) ou documento (Word .docx, TXT).</p>` : ''}
      ${S.arquivos.length ? `<ul class="arqs">${lista}</ul>
        <p class="dim" style="font-size:13px;margin:10px 0 0">Pode juntar mais de um: o edital e a retificação, por exemplo. Se houver uma planilha, as matérias e os pesos vêm dela.</p>
        ${cargo}
        <button class="btn" onclick="lerEdital()">Ler ${S.arquivos.length>1?`os ${S.arquivos.length} arquivos`:'o arquivo'}</button>` : ''}`;
  }
  if(S.edStatus==='ocioso' && S.edModo==='texto'){
    entrada = `<label class="f" for="edTexto">Cole o conteúdo programático</label><textarea id="edTexto" rows="7" placeholder="Cole do jeito que estiver no edital: nomes das matérias, número de questões e assuntos."></textarea>
       ${S.edErroTexto ? `<p class="erro-f" role="alert">${escHtml(S.edErroTexto)}</p>` : ''}
       ${cargo}
       <div style="margin-top:12px"><button class="btn" onclick="lerEdital()">Organizar com IA</button></div>`;
  }
  return `<h1>O que você vai estudar?</h1>
    <p class="lead">Mande o edital ou o programa da prova, do jeito que você tiver. A IA separa as matérias, os pesos e os assuntos, e você confere no próximo passo.</p>
    ${S.edStatus==='ocioso' ? `<div class="escolha">
      <button class="opcao ${S.edModo==='arquivo'?'on':''}" onclick="escolherEdital('arquivo')">${ico('upload')}<b>Anexar arquivo</b><span>PDF do edital, planilha ou documento Word. Pode ser mais de um.</span></button>
      <button class="opcao ${S.edModo==='texto'?'on':''}" onclick="escolherEdital('texto')">${ico('paste')}<b>Colar o texto</b><span>Copie o trecho das matérias de qualquer lugar e cole aqui.</span></button>
    </div>` : ''}
    ${entrada}${estado}`;
}

function passoMaterias(){
  const total = S.materias.reduce((a,m)=>a+m.peso,0) || 1;
  const max = Math.max(1, ...S.materias.map(m=>m.peso));
  const chance = S.prova.pesoTipo==='chance';
  const lista = S.materias.map((m,i)=>`
    <div class="materia ${S.abertas[i]?'aberta':''}">
      <div class="materia-cab" onclick="abrirMateria(${i})" role="button" tabindex="0" aria-expanded="${!!S.abertas[i]}">
        <div><b>${escHtml(m.nome)}</b><div class="meta">${m.faixa?escHtml(m.faixa)+' · ':''}${m.topicos.length} ${m.topicos.length===1?'tópico':'tópicos'}</div></div>
        <div class="peso"><span class="peso-barra"><i style="width:${m.peso/max*100}%"></i></span><span class="num">${chance ? m.peso+'%' : Math.round(m.peso/total*100)+'%'}</span></div>
        ${ico('chev','chev')}
      </div>
      <div class="topicos"><ul>${m.topicos.map((t,j)=>`<li><span>${escHtml(t)}</span><button class="mini" onclick="removerTopico(${i},${j})">remover</button></li>`).join('')}</ul>
        <div style="display:flex;justify-content:space-between;margin-top:6px"><button class="mini" onclick="adicionarTopico(${i})">+ adicionar tópico</button>
        <button class="mini" style="color:var(--danger)" onclick="removerMateria(${i})">remover matéria</button></div></div>
    </div>`).join('');
  const nova = S.novaMat ? `<div class="materia nova">
      <div class="campo-f"><label class="f" for="nmNome">Nome da matéria</label><input type="text" id="nmNome" value="${escHtml(S.novaMat.nome)}" oninput="S.novaMat.nome=this.value" placeholder="Ex.: Língua Inglesa"></div>
      <div class="campo-f"><label class="f" for="nmPeso">${chance?'Chance de cair (%)':'Peso (pontos na prova)'}</label><input type="text" id="nmPeso" inputmode="decimal" value="${escHtml(S.novaMat.peso)}" oninput="S.novaMat.peso=this.value" style="max-width:140px"></div>
      <div class="campo-f"><label class="f" for="nmTop">Tópicos, um por linha (opcional)</label><textarea id="nmTop" rows="3" oninput="S.novaMat.topicos=this.value" placeholder="Interpretação de texto">${escHtml(S.novaMat.topicos)}</textarea></div>
      ${S.novaMat.erro ? `<p class="erro-f" role="alert">${escHtml(S.novaMat.erro)}</p>` : ''}
      <div style="display:flex;gap:8px"><button class="btn" onclick="salvarMateria()">Adicionar</button><button class="btn sec" onclick="S.novaMat=null;render(true)">Cancelar</button></div>
    </div>` : `<button class="btn sec" style="width:100%;margin-top:4px" onclick="S.novaMat={nome:'',peso:'',topicos:''};render(true);setTimeout(()=>document.getElementById('nmNome').focus())">+ Adicionar matéria que faltou</button>`;
  return `<h1>Confira o que foi lido</h1>
    <p class="lead">${chance
      ? 'Sua planilha traz a chance de cada matéria cair: é isso que decide quanto tempo cada uma recebe. Faltou alguma? Adicione no fim da lista.'
      : 'A barra mostra quanto cada matéria vale na nota. É isso que decide quanto tempo cada uma recebe na sua trilha. Faltou alguma? Adicione no fim da lista.'}</p>
    ${S.prova.semEdital ? '<div class="aviso" style="margin-bottom:14px">O edital ainda não saiu. Os pesos vêm da sua planilha; quando o edital for publicado, crie uma trilha nova com ele.</div>' : ''}
    <div class="campo-f"><label class="f" for="pvNome">Nome da trilha</label><input type="text" id="pvNome" value="${escHtml(S.prova.nome)}" oninput="S.prova.nome=this.value" placeholder="Ex.: Concurso do tribunal"></div>
    ${lista}${nova}
    <div class="total"><span>${S.materias.length} matérias · ${totalTopicos()} tópicos</span><span class="num">${chance?'peso = chance de cair':total+' pontos'}</span></div>`;
}
function removerMateria(i){ if(confirm('Remover "'+S.materias[i].nome+'" da trilha?')){ S.materias.splice(i,1); S.abertas={}; render(true); } }
function salvarMateria(){
  const n = S.novaMat, nome = nomeLimpo(n.nome);
  const erro = (msg, campo) => { n.erro = msg; render(true); const el = document.getElementById(campo); if(el) el.focus(); };
  if(!nome) return erro('Dê um nome à matéria.', 'nmNome');
  if(S.materias.some(m=>semAcento(m.nome)===semAcento(nome))) return erro('Já existe uma matéria com esse nome.', 'nmNome');
  const txtPeso = String(n.peso).trim(), lido = parseFloat(txtPeso.replace(',','.'));
  // Peso vazio vale o padrão; zero ou negativo não faz sentido (a matéria sumiria da trilha).
  if(txtPeso && !(lido > 0)) return erro('O peso precisa ser um número maior que zero.', 'nmPeso');
  const peso = lido > 0 ? lido : (S.prova.pesoTipo==='chance' ? 50 : 1);
  const topicos = [...new Set(String(n.topicos).split('\n').map(nomeLimpo).filter(Boolean))];
  S.materias.push({nome, peso, topicos: topicos.length ? topicos : ['Conteúdo geral de '+nome], faixa:'Adicionada por você'});
  S.novaMat = null; S.abertas = {[S.materias.length-1]: true}; render(true);
}

/* Mais de uma banca: concurso cujo edital ainda não saiu, em que se aposta
   em FGV ou Cebraspe, por exemplo. A primeira decide o formato (Cebraspe →
   Certo/Errado); as questões de múltipla escolha alternam entre as demais. */
function bancasTxt(){ return S.bancas.join(' ou ') || 'da banca'; }
function formatoDe(nome){ const b = BANCAS.find(x=>x.n===nome); return b ? b.f : 'Pelo edital (a IA segue o padrão geral de concursos)'; }
function bancaCE(){ return S.bancas.length > 0 && /^Certo/.test(formatoDe(S.bancas[0])); }
function formatoAtual(){ return bancaCE() ? 'certoErrado' : S.formatoQuestoes==='multipla4' ? 'multipla4' : 'multipla5'; }
function bancaPara(k){
  const me = S.bancas.filter(n=>!/^Certo/.test(formatoDe(n)));
  const lista = bancaCE() ? [S.bancas[0]] : me.length ? me : S.bancas;
  return lista[Math.abs(k) % Math.max(1, lista.length)] || '';
}
const hashTxt = s => [...String(s)].reduce((h,c)=>(h*31 + c.charCodeAt(0))|0, 7);

function passoBanca(){
  const q = S.buscaBanca.trim().toLowerCase();
  const extras = S.bancas.filter(n=>!BANCAS.some(b=>b.n===n));
  const lista = BANCAS.filter(b=>!q || b.n.toLowerCase().includes(q));
  const varias = S.bancas.length > 1;
  return `<h1>Qual é a banca?</h1>
    <p class="lead">As questões seguem o jeito da banca: formato, tipo de pegadinha e profundidade. Se o edital ainda não saiu, marque as bancas mais prováveis.</p>
    ${S.prova.bancaADefinir ? `<div class="aviso" style="margin-bottom:14px">${S.prova.fonte==='planilha'?'Sua planilha não diz a banca.':'Não achei a banca no edital.'} Marque uma ou mais bancas prováveis.</div>` : ''}
    <div class="busca">${ico('search')}<input type="text" id="bBusca" placeholder="Buscar banca" value="${escHtml(S.buscaBanca)}" oninput="S.buscaBanca=this.value;render(true)" aria-label="Buscar banca"></div>
    <div class="bancas" role="group" aria-label="Bancas">
      ${lista.map(b=>`<button class="chip ${S.bancas.includes(b.n)?'on':''}" aria-pressed="${S.bancas.includes(b.n)}" onclick="alternarBanca(${BANCAS.indexOf(b)})">${b.n}${b.n===S.prova.bancaEdital?'<small>no edital</small>':''}</button>`).join('')}
      ${extras.map(n=>`<button class="chip on" aria-pressed="true" onclick="removerBancaExtra(${S.bancas.indexOf(n)})">${escHtml(n)}</button>`).join('')}
      ${!lista.length && !extras.length ? '<span class="dim" style="font-size:14px">Nenhuma banca com esse nome na lista.</span>' : ''}
    </div>
    <label class="f" for="bOutra">Não está na lista? Escreva e adicione</label>
    <div style="display:flex;gap:8px">
      <input type="text" id="bOutra" placeholder="Ex.: Instituto Selecon" value="${escHtml(S.bancaOutra)}" oninput="S.bancaOutra=this.value" onkeydown="if(event.key==='Enter')adicionarBancaOutra()">
      <button class="btn sec" onclick="adicionarBancaOutra()">Adicionar</button>
    </div>
    ${S.bancas.length ? `<div class="ficha" style="margin-top:18px"><dl>
      <dt>${varias?'Bancas':'Banca'}</dt><dd>${S.bancas.map(escHtml).join(' ou ')}${varias?' <span class="dim">(a definir)</span>':''}</dd>
      <dt>Formato</dt><dd>${S.bancas.map(n=>`${varias?escHtml(n)+': ':''}${escHtml(formatoDe(n))}`).join('<br>')}</dd>
      <dt>Questões</dt><dd>Inéditas, geradas pela IA no estilo ${varias?'dessas bancas':'da banca'}${varias ? '. A primeira marcada decide o formato; quando a banca for anunciada, é só criar a trilha de novo com ela.' : ''}</dd>
    </dl></div>` : '<p class="aviso" style="margin-top:18px">Escolha pelo menos uma banca. Se ainda não sabe, marque as mais prováveis para o cargo.</p>'}`;
}
function alternarBanca(k){ const n = BANCAS[k].n, i = S.bancas.indexOf(n); if(i>-1) S.bancas.splice(i,1); else S.bancas.push(n); render(true); }
function removerBancaExtra(i){ S.bancas.splice(i,1); render(true); }
function adicionarBancaOutra(){ const n = S.bancaOutra.trim(); if(n && !S.bancas.includes(n)) S.bancas.push(n); S.bancaOutra=''; render(true); }

function passoRitmo(){
  const r = ritmo();
  const nomesDia = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  const total = Math.max(r.ateProva, r.diasCorridos) || 1;
  const pA = r.diasCorridos/total*100, pB = Math.max(0, r.folga)/total*100;
  const fecha = r.folga >= 14;
  const apertado = r.folga >= 0 && r.folga < 14;
  const h = Math.floor(S.horas), m = Math.round((S.horas-h)*60);
  return `<h1>Quanto tempo você tem?</h1>
    <p class="lead">Com isso a trilha distribui os tópicos pelos dias. Dias perdidos não viram dívida: o plano se reorganiza a partir de hoje.</p>
    <div class="campo"><label class="f" for="rHoras">Por dia</label>
      <div class="horas"><input type="range" id="rHoras" min="0.5" max="6" step="0.25" value="${S.horas}" oninput="S.horas=+this.value;render(true)"><span class="num">${h}h${m?pad(m):''}</span></div></div>
    <div class="campo"><span class="f">Dias da semana</span>
      <div class="dias">${nomesDia.map((d,i)=>`<button class="dia ${S.dias[i]?'on':''}" aria-pressed="${S.dias[i]}" onclick="S.dias[${i}]=!S.dias[${i}];render(true)">${d}</button>`).join('')}</div>${S.dias.some(Boolean) ? '' : '<p class="erro-f" role="alert">Marque pelo menos um dia de estudo.</p>'}</div>
    <div class="campo"><span class="f">Questões por tópico</span>
      <p class="dim" style="font-size:13px;margin:0 0 8px">Quantas questões gerar depois de cada tópico. Dá para mudar na hora, a cada estudo.</p>
      ${escolhaQtd(S.qtdQuestoes, 'definirQtdPadrao')}</div>
    <div class="campo"><label class="f" for="rProva">Data da prova</label>
      ${S.prova.semEdital ? `<p class="dim" style="font-size:13px;margin:0 0 8px">Sem edital ainda: coloque uma data estimada.</p>` : ''}<input type="date" id="rProva" value="${S.dataProva}" min="${somar(hojeISO(),1)}" onchange="definirDataProva(this.value)" style="max-width:220px"></div>
    <div class="previsao" aria-live="polite">
      <p>${fecha
        ? `Cada tópico leva uns 40 minutos (leitura e questões). Nesse ritmo você estuda <b>${r.topDia} ${r.topDia===1?'tópico':'tópicos'} por dia</b> e fecha o edital em <b class="num">${r.diasCorridos}</b> dias. Sobram <b class="num">${r.folga}</b> dias só para revisão e questões antes da prova.`
        : apertado
        ? `Dá para fechar o edital, mas sobram só <b class="num">${r.folga}</b> dias para revisar. O ideal é pelo menos duas semanas.`
        : `Nesse ritmo o edital fecha em <b class="num">${r.diasCorridos}</b> dias, mas a prova é em <b class="num">${r.ateProva}</b>. Faltam <b class="num">${-r.folga}</b> dias.`}</p>
      <div class="linha-tempo" aria-hidden="true">
        <span class="a" style="width:${Math.min(pA, r.ateProva/total*100)}%"></span>
        ${r.folga>=0 ? `<span class="b" style="width:${pB}%"></span>` : `<span class="c" style="width:${100 - r.ateProva/total*100}%"></span>`}
      </div>
      <div class="legenda"><span><i style="background:var(--accent)"></i>Conteúdo novo</span>${r.folga>=0?'<span><i style="background:var(--seal)"></i>Só revisão e questões</span>':'<span><i style="background:var(--danger)"></i>Passa da data da prova</span>'}</div>
      ${!fecha ? `<div class="sugestoes">
        <button class="btn sec" onclick="S.horas=Math.min(6,S.horas+0.5);render(true)">Estudar 30 min a mais por dia</button>
        ${!S.dias[5] ? '<button class="btn sec" onclick="S.dias[5]=true;render(true)">Incluir o sábado</button>' : ''}
      </div>` : ''}
    </div>`;
}

function passoPronto(){
  const r = ritmo();
  const h = Math.floor(S.horas), m = Math.round((S.horas-h)*60);
  const banca = S.bancas.join(' ou ') + (S.bancas.length>1 ? ' (a definir)' : '');
  return `<h1>Sua trilha está pronta</h1>
    <p class="lead">A partir de hoje o app monta o plano de cada dia. Você só segue a lista.</p>
    <div class="resumo">
      <div><span>Prova</span><b>${escHtml(S.prova.nome)} · ${fmtData(dataDe(S.dataProva),{day:'2-digit',month:'2-digit',year:'numeric'})}${S.prova.semEdital?' (estimada)':''}</b></div>
      <div><span>${S.bancas.length>1?'Bancas':'Banca'}</span><b>${escHtml(banca)}</b></div>
      <div><span>Conteúdo</span><b>${S.materias.length} matérias · ${r.totalTop} tópicos</b></div>
      <div><span>Ritmo</span><b>${h}h${m?pad(m):''} por dia · ${S.dias.filter(Boolean).length} dias por semana</b></div>
      <div><span>Questões</span><b>${S.qtdQuestoes} por tópico · ${formatoAtual()==='certoErrado'?'Certo ou Errado':formatoAtual()==='multipla4'?'A a D':'A a E'}</b></div>
      <div><span>Edital fechado em</span><b>${r.diasCorridos} dias${r.folga>=0?` · ${r.folga} de revisão`:''}</b></div>
    </div>
    ${S.usuario ? `<p class="dim" style="font-size:14px;margin:0">Tudo fica salvo na sua conta (${escHtml(S.usuario.email)}).${S.modoTeste?' <b>Modo teste ligado: esta trilha não será salva.</b>':''}</p>`
      : `<div class="conta"><p style="margin:0;font-size:14px" class="dim">Você está sem conta: esta trilha some ao fechar a página.</p>
          <button class="btn link" onclick="irEntrada()">Entrar ou criar conta</button></div>`}`;
}

// Data vazia ou que já passou não vale: a trilha toda se calcula até a prova.
function definirDataProva(v){
  if(!v || v <= hojeISO()){ avisar('A data da prova precisa ser depois de hoje. Mantive ' + fmtData(dataDe(S.dataProva),{day:'2-digit',month:'2-digit',year:'numeric'}) + '.'); render(true); return; }
  S.dataProva = v; render(true);
}
function definirQtdPadrao(n){ S.qtdQuestoes = n; render(true); }
function irPasso(n){ S.passo=n; window.scrollTo(0,0); render(); }
function escolherEdital(m){ S.edModo=m; S.edStatus='ocioso'; S.edPasso=0; S.erroLeitura=null; if(m==='arquivo'){ S.arquivos=[]; S.recusados=[]; } render(); }

// Normaliza o nome da banca que a IA leu para a lista (ex.: "CEBRASPE/UnB" → Cebraspe).
function bancaDaLista(txt){
  if(!txt) return null;
  const t = semAcento(txt);
  if(/cespe|cebraspe/.test(t)) return 'Cebraspe';
  const b = BANCAS.find(x => t.includes(semAcento(x.n)));
  return b ? b.n : String(txt).trim();
}

// Erro de IA (ocupada, sem rede, verificação) não é culpa do arquivo: a dica de
// "PDF escaneado" só aparece quando a leitura em si falhou.
const ehErroDeIA = m => /ocupad|503|429|overload|recusou|verifica|conex|network|fetch|limite do modo|incomplet/i.test(String(m));
async function lerEdital(){
  let texto = '';
  if(S.edModo==='texto'){
    texto = (document.getElementById('edTexto')||{}).value || '';
    S.textoColado = texto;
    if(!texto.trim()){ S.edErroTexto = 'Cole o texto do edital primeiro.'; render(true); return; }
  }
  S.edErroTexto = null;
  // Token da leitura: se a pessoa trocar de tela ou começar outra trilha no
  // meio (leva até um minuto), o resultado atrasado é descartado.
  const gen = S.genEdital = (S.genEdital||0) + 1;
  const valendo = () => gen === S.genEdital && S.tela === 'assist' && !S.trilhaAtual;
  S.edStatus='lendo'; S.edPasso=0; S.erroLeitura=null; S.erroIA=false; render();
  const total = passosLeitura().length;
  // Os passos andam enquanto a leitura real acontece; o último só fecha quando ela termina.
  const t = setInterval(()=>{ if(valendo() && S.edStatus==='lendo' && S.edPasso < total-1){ S.edPasso++; render(true); } }, 900);
  try{
    let res;
    if(S.edModo==='texto'){
      limiteVisitante();
      res = deEdital(await SIPC.ia.extrairEdital(texto.slice(-150000), S.filtroCargo), 'texto');
    } else {
      const lidos = [];
      for(const a of S.arquivos){
        if(a.file && a.file.size > 20e6) throw new Error('O arquivo ' + a.nome + ' passa de 20 MB. Use só o trecho do conteúdo programático.');
        try{ lidos.push({a, r: await SIPC.lerArquivo(a.file)}); }
        catch(e){ throw new Error('Não consegui ler ' + a.nome + ': ' + e.message + '.'); }
      }
      const plan = lidos.find(x=>x.r.tipo==='planilha');
      if(plan){
        const p = SIPC.planilhaParaEdital(plan.r.abas);
        res = {materias: p.materias, prova: {...p.prova, bancaEdital: bancaDaLista(p.prova.banca), fonte:'planilha', data:''}};
        if(!p.prova.nome || p.prova.nome==='Minha trilha') res.prova.nome = plan.a.nome.replace(/\.[^.]+$/,'');
      } else {
        limiteVisitante();
        const junto = lidos.map(x=>x.r.texto).join('\n\n').slice(-150000);
        res = deEdital(await SIPC.ia.extrairEdital(junto, S.filtroCargo), 'ia');
      }
    }
    if(!valendo()) return;
    S.materias = limparMaterias(res.materias); S.prova = res.prova; S.abertas = {};
    S.bancas = S.prova.bancaEdital ? [S.prova.bancaEdital] : [];
    if(S.prova.data && S.prova.data > hojeISO()) S.dataProva = S.prova.data;
    S.edPasso = total; S.edStatus='pronto';
  }catch(e){
    if(!valendo()) return;
    S.edStatus='erro'; S.erroLeitura = mensagemIA(e); S.erroIA = ehErroDeIA(S.erroLeitura);
  }finally{ clearInterval(t); if(valendo()) render(); }
}
// Volta ao passo de envio guardando os arquivos e o texto já colados.
function tentarLeituraDeNovo(){ S.edStatus='ocioso'; S.edPasso=0; S.erroLeitura=null; render(); const ta = document.getElementById('edTexto'); if(ta && S.textoColado) ta.value = S.textoColado; }
function deEdital(ed, fonte){
  S.formatoQuestoes = ed.formatoQuestoes || 'multipla5';
  return {materias: ed.materias.map(m=>({...m, faixa:''})), prova: {
    nome: ed.nome || 'Minha trilha', cargo: S.filtroCargo.trim(), bancaEdital: bancaDaLista(ed.banca), bancaADefinir: !ed.banca,
    semEdital:false, pesoTipo:'pontos', fonte, data: ed.dataProva || '', formatoQuestoes: S.formatoQuestoes }};
}
// "::" separa matéria e tópico na chave do progresso; nome repetido faria dois
// tópicos dividirem o mesmo progresso. Os dois saem já na entrada.
const nomeLimpo = s => String(s||'').replace(/::+/g, ':').replace(/\s+/g, ' ').trim();
function limparMaterias(mats){
  const vistas = new Set();
  return mats.map(m => ({...m, nome: nomeLimpo(m.nome)})).filter(m => {
    const k = semAcento(m.nome); if(!m.nome || vistas.has(k)) return false; vistas.add(k); return true;
  }).map(m => {
    const tv = new Set();
    const topicos = (m.topicos||[]).map(nomeLimpo).filter(t => { const k = semAcento(t); if(!t || tv.has(k)) return false; tv.add(k); return true; });
    return {...m, peso: Number(m.peso) > 0 ? Number(m.peso) : 1, topicos: topicos.length ? topicos : ['Conteúdo geral de ' + m.nome]};
  });
}
// O modo sem conta também usa a cota de IA do projeto, que é de todos: um teto
// diário por navegador evita que um curioso esgote a cota dos alunos.
const LIMITE_IA_VISITANTE = 20;
function limiteVisitante(){
  if(!S.visitante) return;
  const k = 'sipc::ia-visitante::' + hojeISO();
  let n = 0; try{ n = +localStorage.getItem(k) || 0; }catch(e){}
  if(n >= LIMITE_IA_VISITANTE) throw new Error('limite do modo sem conta atingido hoje. Crie uma conta (é grátis) para continuar');
  try{ localStorage.setItem(k, String(n+1)); }catch(e){}
}
// Erros da IA em português e, em localhost, o lembrete do token de depuração.
function mensagemIA(e){
  const m = String(e && e.message || e);
  // Depois de um único 403, o App Check trava as tentativas por 24 horas
  // neste navegador. Apagar o registro local libera na próxima carga.
  if(/throttl/i.test(m)){ try{ indexedDB.deleteDatabase('firebase-app-check-database'); }catch(x){} return 'A verificação de segurança da IA falhou uma vez. Recarregue a página e tente de novo.'; }
  if(/app.?check|401|403/i.test(m) && SIPC.debugToken) return 'A IA recusou o acesso em localhost: cadastre o token de depuração do App Check no console do Firebase (' + SIPC.debugToken + ').';
  if(/app.?check|401|403/i.test(m)) return 'A IA recusou o acesso deste navegador. Recarregue a página e tente de novo.';
  if(/\b(503|429)\b|overload/i.test(m)) return 'O serviço de IA está ocupado. Tente de novo em instantes.';
  if(/failed to fetch|network/i.test(m)) return 'Sem conexão com a internet. Confira e tente de novo.';
  return m.charAt(0).toUpperCase() + m.slice(1);
}
function abrirMateria(i){ S.abertas[i]=!S.abertas[i]; render(true); }
function removerTopico(i,j){ S.materias[i].topicos.splice(j,1); if(!S.materias[i].topicos.length) S.materias[i].topicos.push('Conteúdo geral de '+S.materias[i].nome); render(true); }
function adicionarTopico(i){
  const n = nomeLimpo(prompt('Nome do tópico') || '');
  if(n && !S.materias[i].topicos.some(t => semAcento(t)===semAcento(n))){ S.materias[i].topicos.push(n); render(true); }
}

// Dados da trilha como vão para o Firestore (também usado ao guardar a trilha
// do modo sem conta quando a pessoa cria a conta).
function dadosDaTrilha(){
  return JSON.parse(JSON.stringify({
    prova: {...S.prova, formatoQuestoes: S.formatoQuestoes},
    materias: S.materias.map(m=>({nome:m.nome, peso:m.peso, faixa:m.faixa||'', topicos:m.topicos})),
    bancas: S.bancas, ritmo: {horas:S.horas, dias:S.dias, dataProva:S.dataProva, qtdQuestoes:S.qtdQuestoes},
    criadaDia: hojeISO() // criadaEm é UTC; à noite no Brasil já seria "amanhã"
  }));
}
async function comecar(){
  if(S.ocupado) return;
  S.ocupado = true; render(true);
  try{
    const id = await SIPC.store.criarTrilha(uid(), dadosDaTrilha());
    S.trilhas = await SIPC.store.listarTrilhas(uid());
    await abrirTrilha(id);
  }catch(e){ avisar('Não consegui salvar a trilha: ' + mensagemIA(e)); }
  finally{ S.ocupado = false; render(true); }
}

/* ------------------------- plano do dia -------------------------
   Revisões que vencem hoje (1-7-30), os próximos tópicos da fila e as
   questões da semana. O que foi feito hoje continua na lista, marcado. */
const chave = (m, t) => SIPC.trilha.chaveTopico(m, t);
const ultimoHist = r => (r.historico && r.historico.length) ? r.historico[r.historico.length-1] : null;
function revisoesDeHoje(){
  const hoje = hojeISO();
  return S.E.revisoes.filter(r => (!r.consolidado && r.proxima && r.proxima <= hoje) || (ultimoHist(r) && ultimoHist(r).data === hoje))
    .map(r => { const h = ultimoHist(r), feita = !!(h && h.data===hoje);
      return {r, feita, etapa: feita ? h.etapa : r.etapa}; });
}
function topicosParaHoje(){
  const hoje = hojeISO(), emRev = new Set(revisoesDeHoje().map(x=>x.r.chave));
  return SIPC.trilha.filaDeTopicos(S.materias)
    .filter(x => { const c = chave(x.materia, x.topico); return (!S.E.feito[c] || S.E.feito[c]===hoje) && !emRev.has(c); })
    .slice(0, ritmo().topDia);
}
function topicosDaSemana(){
  const desde = somar(hojeISO(), -6);
  return Object.entries(S.E.feito).filter(([,d]) => d >= desde).sort((a,b)=>b[1].localeCompare(a[1])).map(([c])=>c);
}
const quandoFoi = e => e===0 ? 'estudado ontem' : e===1 ? 'estudado há 7 dias' : 'estudado há 30 dias';
function planoDoDia(){
  const hoje = hojeISO(), itens = [];
  revisoesDeHoje().forEach(x => itens.push({id:x.r.chave, tipo:'rev', titulo:x.r.topico, mat:x.r.materia, min:MIN_REV[x.etapa]||5, feito:x.feita,
    extra:'revisão de '+ETAPAS[x.etapa].rot+' · '+(x.r.proxima && x.r.proxima < hoje && !x.feita ? 'atrasada' : quandoFoi(x.etapa)), rev:x.r}));
  topicosParaHoje().forEach(x => { const c = chave(x.materia, x.topico);
    itens.push({id:c, tipo:'est', titulo:x.topico, mat:x.materia, min:SIPC.trilha.MIN_TOPICO, feito: S.E.feito[c]===hoje}); });
  const qid = 'q:'+hoje;
  if(topicosDaSemana().length || (S.E.diario[hoje]||[]).includes(qid))
    itens.push({id:qid, tipo:'q', titulo:`${S.qtdQuestoes} questões ${bancasTxt()}`, mat:'Tópicos desta semana', min:20, feito:(S.E.diario[hoje]||[]).includes(qid)});
  return itens;
}
const ROTULO = {rev:['Revisão','rev'], est:['Estudar','est'], q:['Questões','q']};

function telaApp(){
  const r = ritmo();
  const abas = [['hoje','Hoje'],['painel','Painel'],['trilha','Trilha'],['revisoes','Revisões'],['conta','Conta']];
  if(ehAdmin()) abas.push(['admin','Admin']);
  let corpo = '';
  if(S.vista==='estudo') corpo = vistaEstudo();
  else if(S.vista==='quiz') corpo = vistaQuiz();
  else if(S.aba==='hoje') corpo = abaHoje();
  else if(S.aba==='trilha') corpo = abaTrilha();
  else if(S.aba==='revisoes') corpo = abaRevisoes();
  else if(S.aba==='conta') corpo = abaConta();
  else if(S.aba==='admin') corpo = abaAdmin();
  else corpo = abaPainel();
  return `<div class="app">
    <div class="topo">
      <div><button class="trocar-trilha" onclick="irTrilhas()" title="Minhas trilhas">${ico('list')} Minhas trilhas (${S.trilhas.length})</button><h1>${escHtml(S.prova.nome)}</h1><div class="sub">${S.prova.cargo?escHtml(S.prova.cargo)+' · ':''}banca ${escHtml(bancasTxt())}</div></div>
      <div class="contagem">${chaveTeste()}<span class="num">${r.ateProva}</span>dias até a prova<br><button class="mini" onclick="S.vista=null;S.aba='painel';render()">ver painel</button></div>
    </div>
    ${S.vista ? '' : `<nav class="abas" aria-label="Seções">${abas.map(([k,n])=>`<button class="aba ${S.aba===k?'on':''}" onclick="irAba('${k}')">${n}</button>`).join('')}</nav>`}
    <div class="tela" key="${S.vista||S.aba}">${corpo}</div>
  </div>`;
}
function irAba(k){ S.aba = k; if(k==='admin') carregarAdmin(); render(); }

function semanaAtual(){
  const hoje = hojeISO(), seg = somar(hoje, -dowDe(hoje));
  return [0,1,2,3,4,5,6].map(i => {
    const d = somar(seg, i), estudou = (S.E.minutos[d]||0) > 0;
    const cls = d === hoje ? (estudou ? 's h' : 'h') : d > hoje ? '' : estudou ? 's' : (S.dias[i] && d >= (S.trilhaCriadaEm||hoje).slice(0,10) ? 'x' : '');
    return {d, cls};
  });
}
function diasSeguidos(){
  let n = 0, d = hojeISO();
  if(!(S.E.minutos[d] > 0)) d = somar(d, -1);
  while(S.E.minutos[d] > 0){ n++; d = somar(d, -1); }
  return n;
}
function faltouOntem(){
  const ontem = somar(hojeISO(), -1), criada = (S.trilhaCriadaEm||hojeISO()).slice(0,10);
  return criada < ontem && S.dias[dowDe(ontem)] && !(S.E.minutos[ontem] > 0);
}

function abaHoje(){
  const itens = S._itens = planoDoDia();
  const feitos = itens.filter(i=>i.feito).length;
  const minTotal = itens.reduce((a,i)=>a+i.min,0) || 1;
  const minFeito = itens.filter(i=>i.feito).reduce((a,i)=>a+i.min,0);
  const grupos = [['rev','Revisões de hoje (24h · 7 dias · 30 dias)'],['est','Conteúdo novo'],['q','Para fixar']];
  const parc = S.E.parcial || {};
  const lista = grupos.map(([t,nome])=>{
    const g = itens.map((i,k)=>({i,k})).filter(x=>x.i.tipo===t); if(!g.length) return '';
    return `<li class="grupo">${nome}</li>` + g.map(({i,k})=>`
      <li class="item ${i.feito?'feito':''} ${!i.feito && parc[i.id] ? 'meio' : ''}" onclick="abrirItem(${k})" role="button" tabindex="0">
        <span class="marca-check" aria-hidden="true">${ico('check')}</span>
        <div><div class="tit">${escHtml(i.titulo)}</div>
          <div class="meta-item"><span class="tag ${ROTULO[i.tipo][1]}">${ROTULO[i.tipo][0]}</span><span>${escHtml(i.mat)}</span>${i.extra?`<span>· ${escHtml(i.extra)}</span>`:''}${!i.feito && parc[i.id] ? `<span class="parou">${escHtml(parc[i.id].rot)}</span>` : ''}</div></div>
        <span class="tempo num">${i.min} min</span>
      </li>`).join('');
  }).join('');
  const tudo = itens.length && feitos===itens.length;
  const cont = continuarDeOndeParou();
  const pace = ritmoDoPlano(), cob = cobertura(), ac = acertoGeral();
  const sem = semanaAtual(), seguidos = diasSeguidos();
  const folga = !S.dias[dowDe(hojeISO())];
  return `<div class="hoje">
    <div>
      <div class="dia-cab"><div><h2>Plano de hoje</h2><div class="sub">${fmtData(dataDe(hojeISO()),{weekday:'long',day:'numeric',month:'long'})}</div></div>
        <div class="sub num">${minFeito}/${minTotal} min</div></div>
      <div class="barra-dia"><i style="width:${minFeito/minTotal*100}%"></i></div>
      ${faltouOntem() ? `<div class="nota">${ico('info')}<div><b>Ontem não teve estudo, e tudo bem.</b> O plano foi reorganizado a partir de hoje: nada acumulou.</div></div>` : ''}
      ${folga ? `<div class="nota">${ico('info')}<div><b>Hoje está fora do seu ritmo.</b> Se quiser, adiante a lista abaixo; senão, até o próximo dia de estudo.</div></div>` : ''}
      ${cont ? `<div class="continuar"><div><b>Continuar de onde parou</b><span>${escHtml(cont.titulo)} · ${escHtml(cont.rot)}</span></div><button class="btn" onclick="continuar()">Continuar</button></div>` : ''}
      ${alertaDoDia(itens)}
      ${tudo ? `<div class="nota" style="background:var(--seal-soft);color:#155f37">${ico('check')}<div><b>Plano de hoje concluído.</b> Amanhã já tem o próximo.${proximoTopico() ? ' <button class="btn link" onclick="adiantarTopico()">Adiantar o próximo tópico</button>' : ''}</div></div>` : ''}
      ${!itens.length ? `<div class="nota">${ico('check')}<div><b>Edital todo estudado.</b> Agora é revisão: os tópicos voltam no dia certo.</div></div>` : ''}
      <ul class="plano">${lista}</ul>
    </div>
    <aside class="lado">
      <div class="bloco"><h3>Esta semana</h3>
        <div class="semana">${['S','T','Q','Q','S','S','D'].map((d,i)=>`<div class="${sem[i].cls}">${d}<i></i></div>`).join('')}</div>
        <p class="dim" style="font-size:13px;margin:12px 0 0">${seguidos ? `${seguidos} ${seguidos===1?'dia':'dias seguidos'} estudando.` : 'Comece hoje a sequência.'}</p></div>
      <div class="bloco resumo-painel">
        <div class="p-status ${pace.dias>=0?'ok':''}">${ico(pace.dias>=0?'check':'info')} ${pace.dias>=0?'No ritmo':'Um pouco atrás'}</div>
        <h3 style="margin:8px 0 4px">${pace.texto}</h3>
        <div class="meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${cob}" aria-label="Edital coberto"><i style="width:${Math.max(cob,1)}%"></i></div>
        <p class="dim" style="font-size:13px;margin:6px 0 12px">${cob}% do edital coberto${ac.total ? ` · acerto de ${ac.pct}% nas questões` : ''}</p>
        <button class="btn sec" style="width:100%" onclick="irAba('painel')">Abrir o painel</button></div>
    </aside>
  </div>`;
}
function alertaDoDia(itens){
  const rev = itens.filter(i=>i.tipo==='rev' && !i.feito), novos = itens.filter(i=>i.tipo==='est' && !i.feito);
  if(!rev.length && !novos.length) return '';
  return `<div class="alerta" role="status">
    <div class="alerta-cab">${ico('info')}<b>Seu dia: ${rev.length} ${rev.length===1?'revisão':'revisões'} e ${novos.length} ${novos.length===1?'tópico novo':'tópicos novos'}</b></div>
    ${rev.length ? `<p><span class="dim">Revisar hoje:</span> ${rev.map(r=>`<b>${escHtml(r.titulo)}</b>`).join(' · ')}</p>` : '<p class="dim">Nenhuma revisão vence hoje.</p>'}
    ${novos.length ? `<p><span class="dim">Estudar hoje:</span> ${novos.map(x=>`<b>${escHtml(x.titulo)}</b>`).join(' · ')}. <span class="dim">Voltam amanhã, em ${dataMais(7)} e em ${dataMais(30)}.</span></p>` : ''}
  </div>`;
}
// O mais recente primeiro: o Firestore devolve as chaves de um map em ordem
// alfabética, então a ordem de inserção não vale depois de recarregar.
function continuarDeOndeParou(){
  const e = Object.entries(S.E.parcial||{}).sort((a,b)=>(b[1].em||0)-(a[1].em||0))[0]; if(!e) return null;
  const [id, p] = e;
  return {id, p, rot:p.rot, titulo: p.quiz ? 'Questões do dia' : (p.estudo && p.estudo.topico) || id};
}
function continuar(){
  const c = continuarDeOndeParou(); if(!c) return;
  if(c.p.quiz){ S.itemAtual = c.id; S.quiz = c.p.quiz; S.vista = 'quiz'; window.scrollTo(0,0); render(); return; }
  const E = c.p.estudo; abrirEstudo(E.topico, E.mat, E.rev);
}
// Próximo tópico da fila que ainda não foi estudado nem está no plano de hoje.
function proximoTopico(){
  const noPlano = new Set((S._itens||[]).map(i=>i.id));
  return SIPC.trilha.filaDeTopicos(S.materias).find(x => { const c = chave(x.materia, x.topico); return !S.E.feito[c] && !noPlano.has(c); }) || null;
}
function adiantarTopico(){ const x = proximoTopico(); if(x) abrirEstudo(x.topico, x.materia); }

function abrirItem(k){
  const it = (S._itens||[])[k]; if(!it) return;
  S.itemAtual = it.id;
  if(it.tipo==='rev'){ if(it.feito) return avisar('Esta revisão já foi feita hoje. Ela volta na próxima data.'); abrirEstudo(it.titulo, it.mat, it.rev); return; }
  if(it.tipo==='est'){ if(it.feito) return avisar('Tópico já estudado hoje. Ele volta para revisão amanhã.'); abrirEstudo(it.titulo, it.mat); return; }
  if(it.tipo==='q'){
    if(it.feito) return avisar('Questões do dia já feitas. Amanhã tem mais.');
    const p = S.E.parcial[it.id];
    S.vista = 'quiz';
    if(p && p.quiz) S.quiz = p.quiz; else { S.quiz = {i:0, sel:null, conf:false, res:[], lista:null}; gerarQuestoesDoDia(); }
  }
  window.scrollTo(0,0); render();
}
// Sair solta o estudo e o quiz: uma geração da IA que termine depois vai
// direto para "continuar de onde parou" em vez de cair numa tela fechada.
function sair(){ guardarProgresso(); S.vista=null; S.estudo=null; S.quiz=null; window.scrollTo(0,0); render(); }

/* ------------------------- estudo -------------------------
   Cada tópico segue a estrutura de estudo do Victor, em nove seções:
   storytelling, resumo de 1 minuto, resumo de 5 minutos, mapa visual,
   analogias, questões, gabarito comentado, checklist e flashcards. Na tela
   se agrupam em Teoria, Mapa, Questões e Revisão. A IA gera tudo; o
   conteúdo fica num cache compartilhado (mesmo tópico, mesma banca). */
const CONTEUDO = {}; // banca|chave → {C} | {carregando} | {erro}
// A banca entra na chave: o mesmo tópico em duas trilhas de bancas diferentes tem conteúdo diferente.
const chaveConteudo = E => (S.bancas[0] || '') + '|' + E.chave;
// O que vai para "continuar de onde parou" (sem os estados de carregamento).
const fotoEstudo = E => ({estudo: JSON.parse(JSON.stringify({...E, carregandoQ:false, erroQ:null, retomado:false})), rot:'parou em ' + NOME_PARTE[E.parte], em: Date.now()});
const PARTES = [['teoria','Teoria'],['mapa','Mapa visual'],['questoes','Questões'],['revisao','Revisão']];
const NOME_PARTE = {teoria:'Teoria', mapa:'Mapa visual', questoes:'Questões', revisao:'Revisão'};

function guardarProgresso(){
  if(S.vista==='estudo' && S.estudo && !S.estudo.concluido){
    const E = S.estudo;
    S.E.parcial[E.chave] = fotoEstudo(E);
    salvarE();
  }
  if(S.vista==='quiz' && S.quiz && S.quiz.lista && S.quiz.i < S.quiz.lista.length && (S.quiz.res.length || S.quiz.sel!==null)){
    S.E.parcial[S.itemAtual] = {quiz: JSON.parse(JSON.stringify(S.quiz)), rot:'parou na questão ' + (S.quiz.i+1) + ' de ' + S.quiz.lista.length, em: Date.now()};
    salvarE();
  }
}
function abrirEstudo(topico, mat, rev){
  const c = chave(mat, topico);
  S.itemAtual = c;
  const salvo = S.E.parcial[c] && S.E.parcial[c].estudo;
  if(salvo){ S.estudo = {...salvo, retomado:true}; if(rev) S.estudo.rev = rev; }
  else S.estudo = {chave:c, topico, mat, parte:'teoria', feitas:{}, resp:{}, corrigido:false, flip:{}, rev: rev || null, n:null, questoes:null};
  S.vista = 'estudo'; window.scrollTo(0,0);
  carregarConteudo(S.estudo);
  if(S.estudo.parte==='questoes' && !S.estudo.questoes) gerarQuestoesTopico();
  render();
}
async function carregarConteudo(E){
  const c = chaveConteudo(E);
  if(CONTEUDO[c] && !CONTEUDO[c].erro) return CONTEUDO[c].C ? CONTEUDO[c].C : CONTEUDO[c].prom;
  const prom = (async () => { limiteVisitante(); return SIPC.ia.obterConteudo({banca: S.bancas[0] || '', materia:E.mat, topico:E.topico, uid:uid(), prova:S.prova.nome}); })();
  CONTEUDO[c] = {carregando:true, prom};
  try{ CONTEUDO[c] = {C: await prom}; }
  catch(e){ CONTEUDO[c] = {erro: mensagemIA(e)}; }
  if(S.estudo && chaveConteudo(S.estudo)===c) render(true);
  return CONTEUDO[c].C || null;
}
const conteudoDe = E => CONTEUDO[chaveConteudo(E)];
function tentarConteudoDeNovo(){ delete CONTEUDO[chaveConteudo(S.estudo)]; carregarConteudo(S.estudo); render(true); }
function irParte(p){
  S.estudo.feitas[S.estudo.parte] = true;
  S.estudo.parte = p;
  if(p==='questoes' && !S.estudo.questoes) gerarQuestoesTopico();
  guardarProgresso();
  window.scrollTo(0,0); render();
}
// genQ: trocar a quantidade no meio de uma geração invalida a anterior.
async function gerarQuestoesTopico(forcar){
  const E = S.estudo; if(!E || (E.carregandoQ && !forcar)) return;
  const g = E.genQ = (E.genQ||0) + 1, estado = S.E;
  E.carregandoQ = true; E.erroQ = null; render(true);
  try{
    const C = await carregarConteudo(E);
    if(!C) throw new Error((conteudoDe(E) && conteudoDe(E).erro) || 'sem conteúdo para basear as questões');
    const banca = bancaPara(hashTxt(E.chave));
    limiteVisitante();
    const lista = await SIPC.ia.gerarQuestoes({banca, formato: formatoAtual(), materia:E.mat, topico:E.topico, conteudo:C, qtd: E.n || S.qtdQuestoes});
    if(E.genQ !== g || E.concluido) return;
    // geradoEm identifica esta leva: o rascunho de uma leva antiga não aparece na nova.
    E.questoes = lista.map(q=>({...q, banca})); E.resp = {}; E.corrigido = false; E.geradoEm = Date.now();
    if(S.estudo === E && S.vista === 'estudo') guardarProgresso();
    else if(S.E === estado){ S.E.parcial[E.chave] = fotoEstudo(E); salvarE(); } // saiu antes de terminar: guarda para depois
  }catch(e){ if(E.genQ === g) E.erroQ = mensagemIA(e); }
  finally{ if(E.genQ === g){ E.carregandoQ = false; if(S.estudo===E) render(true); } }
}
function definirQtdTopico(n){ S.estudo.n = n; S.estudo.questoes = null; S.estudo.resp = {}; S.estudo.corrigido = false; gerarQuestoesTopico(true); }
function corrigirTopico(){
  const L = S.estudo.questoes || [];
  if(Object.keys(S.estudo.resp).length < L.length && !confirm('Ainda há questões sem resposta. Corrigir assim mesmo?')) return;
  S.estudo.corrigido = true; S.estudo.feitas.questoes = true;
  guardarProgresso();
  render(true);
  const g = document.getElementById('gabarito'); if(g) g.scrollIntoView({behavior:'smooth', block:'start'});
}
// Cada resposta já vai para o progresso: fechar a aba no meio não perde as respostas.
function responder(k, j){ S.estudo.resp[k] = j; guardarProgresso(); render(true); }

// No enunciado, parágrafos vêm separados por linha em branco; parágrafo que
// começa com ">" é texto-base (citação).
function enunciado(txt){
  return String(txt||'').split(/\n\s*\n/).map(p => p.startsWith('>')
    ? `<blockquote class="texto-base">${p.split('\n').map(l=>escHtml(l.replace(/^>\s?/,''))).join('<br>')}</blockquote>`
    : `<p class="enunciado">${escHtml(p).replace(/\n/g,'<br>')}</p>`).join('');
}
const QTDS = [5, 10, 15, 20];
function escolhaQtd(atual, acao){
  const outra = !QTDS.includes(atual);
  return `<div class="qtd" role="group" aria-label="Quantidade de questões">${QTDS.map(n=>
    `<button class="chip ${atual===n?'on':''}" aria-pressed="${atual===n}" onclick="${acao}(${n})">${n}</button>`).join('')}
    <label class="qtd-outra ${outra?'on':''}">Outra: <input type="number" min="1" max="30" value="${outra?atual:''}" placeholder="—" onchange="${acao}(Math.max(1,Math.min(30,+this.value||${atual})))"></label></div>`;
}
// Fim de uma revisão 1-7-30: como foi lembrar decide a próxima volta.
function avaliacaoRevisao(E){
  const etapa = E.rev.etapa;
  return secao('Como foi lembrar?', `<p class="dim" style="font-size:14px;margin:0 0 4px">Isso decide quando ${escHtml(E.topico)} volta.</p>
    <div class="notas3">
      <button class="btn ruim" onclick="concluirItem('esqueci')">Esqueci<small>recomeça: volta em 24h</small></button>
      <button class="btn sec" onclick="concluirItem('dificil')">Difícil<small>repete em ${ETAPAS[etapa].rot}</small></button>
      <button class="btn ok" onclick="concluirItem('lembrei')">Lembrei<small>${etapa<2 ? 'próxima: em '+ETAPAS[etapa+1].rot : 'tópico consolidado'}</small></button>
    </div>`);
}
function quebrar(txt, max){
  const linhas = []; let l = '';
  String(txt).split(' ').forEach(p => { if((l+' '+p).trim().length > max && l){ linhas.push(l); l = p; } else l = (l+' '+p).trim(); });
  if(l) linhas.push(l); return linhas;
}
// Mapa mental clássico: ramos alternando à direita e à esquerda do centro,
// itens empilhados em coluna ao lado de cada ramo; nada se sobrepõe.
function mapaRadial(mapa, foco){
  const [centro, ramos] = mapa;
  const W = 1120, cx = W/2, LH = 17, GAP = 10, GAPR = 22;
  const lados = [[], []];
  ramos.forEach((r,k) => lados[k%2].push({r, k}));
  const medir = folhas => (folhas||[]).map(f => { const ls = quebrar(f, 32); return {ls, h: 14 + ls.length*LH}; });
  const altLado = lado => lado.reduce((t,{r}) => t + Math.max(40, medir(r[1]).reduce((a,x)=>a+x.h+GAP,0)-GAP) + GAPR, -GAPR);
  const H = Math.max(260, Math.max(...lados.map(altLado)) + 40);
  const cy = H/2;
  let linhas = '', nos = '', ordem = 0;
  const larg = ls => Math.min(300, Math.max(...ls.map(l=>l.length))*7.3 + 28);
  lados.forEach((lado, sIdx) => {
    const dir = sIdx===0 ? 1 : -1;
    let y = cy - altLado(lado)/2;
    lado.forEach(({r:[rot, folhas], k}) => {
      const med = medir(folhas);
      const bloco = Math.max(40, med.reduce((a,x)=>a+x.h+GAP,0)-GAP);
      const by = y + bloco/2, bx = cx + dir*210;
      const apagado = foco!==null && foco!==undefined && foco!==k ? ' apagado' : '';
      const dB = (ordem++)*0.14;
      linhas += `<path class="m-lig${apagado}" pathLength="1" style="animation-delay:${dB}s" d="M${cx+dir*60},${cy} C${cx+dir*130},${cy} ${cx+dir*120},${by} ${bx-dir*55},${by}"/>`;
      let fy = y;
      med.forEach(({ls, h}, j) => {
        const w = larg(ls), x0 = dir>0 ? cx+dir*320 : cx+dir*320 - w, my = fy + h/2;
        const dF = 0.45 + dB + j*0.07;
        linhas += `<path class="m-lig m-fina${apagado}" pathLength="1" style="animation-delay:${dF-.12}s" d="M${bx+dir*55},${by} C${bx+dir*85},${by} ${bx+dir*80},${my} ${dir>0?x0:x0+w},${my}"/>`;
        nos += `<g class="m-folha${apagado}" style="animation-delay:${dF}s"><rect x="${x0}" y="${fy}" width="${w}" height="${h}" rx="${Math.min(15,h/2)}"/>${ls.map((l,i)=>`<text x="${x0+w/2}" y="${fy+7+LH*(i+1)-4}" text-anchor="middle">${escHtml(l)}</text>`).join('')}</g>`;
        fy += h + GAP;
      });
      const wb = Math.min(230, String(rot).length*8 + 34);
      nos += `<g class="m-ramo${apagado}" style="animation-delay:${dB+.22}s" role="button" tabindex="0" onclick="focarRamo(${k})"
        onkeydown="if(event.key==='Enter')focarRamo(${k})" aria-label="Destacar ${escHtml(rot)}">
        <rect x="${bx-wb/2}" y="${by-19}" width="${wb}" height="38" rx="19"/><text x="${bx}" y="${by+5}" text-anchor="middle">${escHtml(rot)}</text></g>`;
      y += bloco + GAPR;
    });
  });
  const cl = quebrar(centro, 18), wc = Math.min(240, Math.max(...cl.map(l=>l.length))*9.5 + 36), hc = 26 + cl.length*20;
  nos += `<g class="m-centro"><rect x="${cx-wc/2}" y="${cy-hc/2}" width="${wc}" height="${hc}" rx="18"/>${cl.map((l,i)=>`<text x="${cx}" y="${cy-hc/2+13+20*(i+1)-5}" text-anchor="middle">${escHtml(l)}</text>`).join('')}</g>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="mapa-radial" role="img" aria-label="Mapa visual de ${escHtml(centro)}">${linhas}${nos}</svg>`;
}
function focarRamo(k){ S.estudo.focoMapa = S.estudo.focoMapa===k ? null : k; render(true); }
function mapaArvoreAnimada(no, nivel=0, cont={i:0}){
  const [rot, filhos] = Array.isArray(no) ? no : [no, null];
  const atraso = (cont.i++)*0.06;
  return `<li style="animation-delay:${atraso}s" class="n${nivel}"><span>${escHtml(rot)}</span>${Array.isArray(filhos) && filhos.length ? `<ul>${filhos.map(f=>mapaArvoreAnimada(f, nivel+1, cont)).join('')}</ul>` : ''}</li>`;
}
function secao(titulo, corpo, extra=''){ return `<div class="secao" ${extra}><h2>${titulo}</h2>${corpo}</div>`; }
function linkVideos(E){
  const q = encodeURIComponent(E.topico + ' ' + E.mat + ' concurso');
  return `<p class="dim" style="font-size:13px;margin:0 0 18px">${ico('play')} Quer ver em vídeo? <a href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">Buscar "${escHtml(E.topico)}" no YouTube</a></p>`;
}

function vistaEstudo(){
  const E = S.estudo, est = conteudoDe(E) || {carregando:true}, C = est.C;
  const partes = `<ol class="partes" aria-label="Partes do estudo">${PARTES.map(([k,n],i)=>
    `<li><button class="${E.parte===k?'on':''} ${E.feitas[k]?'feita':''}" onclick="irParte('${k}')" ${E.parte===k?'aria-current="step"':''}><span class="pn">${E.feitas[k]&&E.parte!==k?ico('check'):i+1}</span>${n}</button></li>`).join('')}</ol>`;
  const cab = `<button class="voltar" onclick="sair()">${ico('back')} Plano de hoje</button>
    <h1>${escHtml(E.topico)}</h1>
    ${E.rev ? `<span class="tag rev" style="margin-bottom:8px">Revisão de ${ETAPAS[E.rev.etapa].rot}</span>` : ''}
    <div class="sub">${escHtml(E.mat)}${C?` · uns ${(+C.tempo||15)+10} min (${+C.tempo||15} de leitura + 10 de questões)`:''} · conteúdo gerado pela IA${S.bancas[0]?' para a banca '+escHtml(S.bancas[0]):''}</div>
    ${partes}
    ${E.retomado ? `<div class="retomada">${ico('info')} Continuando de onde você parou: <b>${NOME_PARTE[E.parte]}</b>.</div>` : ''}
    <button class="btn link parar" onclick="sair()">Parar aqui e continuar depois</button>`;

  if(!C && E.parte!=='questoes'){
    return `<div class="leitor">${cab}
      ${est.erro ? `<div class="erro"><b>Não consegui gerar o conteúdo agora.</b><br>${escHtml(est.erro)}</div>
          <div class="fim-estudo"><button class="btn" onclick="tentarConteudoDeNovo()">Tentar de novo</button></div>`
        : `<div class="carregando">${ico('spark')}<p><b>Gerando o conteúdo de ${escHtml(E.topico)}…</b><br><span class="dim">Storytelling, resumos, mapa, analogias, checklist e flashcards. Leva uns 20 a 40 segundos na primeira vez; depois fica guardado.</span></p></div>`}
      ${E.rev ? avaliacaoRevisao(E) : ''}</div>`;
  }

  let corpo = '';
  if(E.parte==='teoria'){
    corpo = (C.pergunta ? `<p class="lead" style="margin-top:0"><i>${escHtml(C.pergunta)}</i></p>` : '')
      + secao('Storytelling', htmlSeguro(C.historia))
      + secao('Resumo em 1 minuto', `<dl class="r1">${(C.resumo1||[]).map(([t,itens])=>`<dt>${escHtml(t)}</dt><dd>${(Array.isArray(itens)?itens:[itens]).map(escHtml).join(' · ')}</dd>`).join('')}</dl>`)
      + linkVideos(E)
      + secao('Resumo em 5 minutos', htmlSeguro(C.resumo5))
      + secao('Analogias', `<ul class="lista">${(C.analogias||[]).map(x=>`<li>${htmlSeguro(x)}</li>`).join('')}</ul>`)
      + `<div class="fim-estudo"><button class="btn" onclick="irParte('mapa')">Ver o mapa visual</button>
         <button class="btn sec" onclick="lerDepois()">Li a teoria, faço as questões depois</button></div>`;
  }
  if(E.parte==='mapa'){
    const foco = E.focoMapa;
    corpo = secao('Mapa visual — cola rápida', `<p class="dim" style="font-size:14px">O tópico inteiro numa olhada. Toque num ramo para destacá-lo e tente explicar cada um em voz alta antes de seguir.</p>
      <div class="mapa-anim ${foco!==null&&foco!==undefined?'estatico':''}">${mapaRadial(C.mapa, foco)}<ul class="mapa-lista">${mapaArvoreAnimada(C.mapa)}</ul></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sec" onclick="repetirMapa()">Ver a animação de novo</button>${foco!==null&&foco!==undefined?'<button class="btn link" onclick="focarRamo(S.estudo.focoMapa)">Mostrar todos os ramos</button>':''}</div>`)
      + `<div class="fim-estudo"><button class="btn" onclick="irParte('questoes')">Fazer as questões</button><button class="btn sec" onclick="irParte('teoria')">Voltar à teoria</button></div>`;
  }
  if(E.parte==='questoes') corpo = parteQuestoes(E);
  if(E.parte==='revisao'){
    const L = E.questoes || [];
    const ac = L.filter((q,k)=>E.resp[k]===q.c).length;
    const foiMal = E.corrigido && L.length && ac/L.length < .7;
    corpo = secao('Checklist — 30 segundos', `<ul class="check">${(C.checklist||[]).map(x=>`<li>${ico('check')}<span>${escHtml(x)}</span></li>`).join('')}</ul>`)
      + secao('Flashcards', `<p class="dim" style="font-size:14px;margin:0 0 12px">Responda de cabeça e toque para ver.</p><div class="cards">${(C.flashcards||[]).map(([q,a],k)=>
          `<button class="card-f ${E.flip[k]?'virado':''}" onclick="virar(${k})" aria-pressed="${!!E.flip[k]}"><span class="lado-q">${escHtml(q)}</span>${E.flip[k]?`<span class="lado-a">${escHtml(a)}</span>`:'<span class="toque">tocar para ver</span>'}</button>`).join('')}</div>`)
      + secao('Quando este tópico volta', `<p>${!E.corrigido ? 'Faça e corrija as questões para o SIPC registrar seu acerto.' : foiMal
          ? `Você acertou <b class="num">${ac}/${L.length}</b>. Abaixo de 70%, o tópico entra em "Precisa de atenção" no painel.`
          : `Você acertou <b class="num">${ac}/${L.length}</b>.`} ${E.rev ? '' : `Este tópico volta em <b>24 horas</b> (${dataMais(1)}), em <b>7 dias</b> (${dataMais(7)}) e em <b>30 dias</b> (${dataMais(30)}).`}</p>
          ${escadaHTML(E.rev ? E.rev.etapa : 0)}`)
      + (E.rev ? avaliacaoRevisao(E)
        : `<div class="fim-estudo"><button class="btn" onclick="concluirItem()">Concluir o tópico</button>${!E.corrigido?`<button class="btn sec" onclick="irParte('questoes')">Fazer as questões</button>`:''}</div>`);
  }
  return `<div class="leitor">${cab}${corpo}</div>`;
}
function virar(k){ S.estudo.flip[k] = !S.estudo.flip[k]; render(true); }
function repetirMapa(){ S.estudo.focoMapa=null; const m = document.querySelector('.mapa-anim'); if(!m) return; m.classList.remove('repetir'); void m.offsetWidth; m.classList.add('repetir'); }
function lerDepois(){ S.estudo.feitas.teoria = true; S.estudo.parte = 'questoes'; sair(); }
function escadaHTML(atual){ return `<div class="escada" aria-label="Revisões em 24 horas, 7 dias e 30 dias">${ETAPAS.map((e,i)=>`<span class="${i===atual?'on':i<atual?'feita':''}">${e.curto}</span>`).join('')}</div>`; }

function parteQuestoes(E){
  const pedidas = E.n || S.qtdQuestoes;
  const escolha = `<div class="secao" style="padding:14px 18px"><span class="f" style="margin-bottom:8px">Quantas questões agora?</span>${escolhaQtd(pedidas, 'definirQtdTopico')}</div>`;
  if(E.carregandoQ || (!E.questoes && !E.erroQ))
    return escolha + `<div class="carregando">${ico('spark')}<p><b>Gerando ${pedidas} ${formatoAtual()==='certoErrado'?'itens Certo/Errado':'questões'} a partir da teoria…</b><br><span class="dim">No estilo ${escHtml(bancasTxt())}. Leva uns 20 a 60 segundos.</span></p></div>`;
  if(E.erroQ) return escolha + `<div class="erro"><b>Não consegui gerar as questões agora.</b><br>${escHtml(E.erroQ)}</div><div class="fim-estudo"><button class="btn" onclick="gerarQuestoesTopico()">Tentar de novo</button><button class="btn sec" onclick="irParte('revisao')">Pular para a revisão</button></div>`;
  const L = E.questoes;
  const ac = L.filter((q,k)=>E.resp[k]===q.c).length;
  const lista = L.map((q,k)=>{
    const r = E.resp[k], certo = r===q.c;
    const marca = !E.corrigido ? '' : r===undefined ? '<span class="res nada">sem resposta</span>' : certo ? `<span class="res ok">${ico('check')} certo</span>` : `<span class="res nao">${ico('x')} errado</span>`;
    const letras = q.ce ? 'CE' : 'abcde';
    return `<article class="q-item">
      ${q.ce && q.base && (k===0 || L[k-1].base!==q.base) ? `<div class="ce-base"><blockquote class="texto-base">${escHtml(q.base).replace(/\n/g,'<br>')}</blockquote><p class="enunciado"><b>${escHtml(q.comando||'Julgue os itens a seguir.')}</b></p></div>` : ''}
      <div class="q-cab"><b class="num">${k+1}.</b><span class="dim">${q.ce ? 'Item no estilo Cebraspe' : 'Inédita no estilo '+escHtml(q.banca||bancasTxt())}</span>${marca}</div>
      ${enunciado(q.enun)}
      <div class="alts ${q.ce?'alts-ce':''}">${q.alts.map((a,j)=>{
        let cls = r===j ? 'sel' : '';
        if(E.corrigido){ if(j===q.c) cls = 'certa'; else if(r===j) cls = 'errada'; }
        return `<button class="alt ${cls}" ${E.corrigido?'disabled':''} onclick="responder(${k},${j})"><span class="letra">${letras[j]}</span><span>${escHtml(a)}</span></button>`;
      }).join('')}</div>${rascunhoHTML(E.chave+'#'+(E.geradoEm||0)+'#'+k)}</article>`;
  }).join('');
  const gab = E.corrigido ? secao(`Gabarito e comentários <span class="num dim" style="font-size:15px;font-weight:500">· ${ac}/${L.length}</span>`,
    `<ol class="gab">${L.map((q,k)=>`<li class="${E.resp[k]===q.c?'ok':'nao'}"><b>${q.ce ? q.alts[q.c] : 'abcde'[q.c]}</b> — ${escHtml(q.just)}</li>`).join('')}</ol>`, 'id="gabarito"') : '';
  return escolha + `<p class="dim" style="font-size:14px;margin:0 0 12px">${L.length} ${L.length===1?'questão gerada':'questões geradas'} a partir da teoria, no estilo ${escHtml(bancasTxt())}. Responda todas; o gabarito aparece separado depois.</p>
    ${lista}${gab}
    <div class="fim-estudo">${E.corrigido
      ? `<button class="btn" onclick="irParte('revisao')">Ir para a revisão</button><button class="btn sec" onclick="refazerTopico()">Refazer</button>`
      : `<button class="btn" onclick="corrigirTopico()">Corrigir (${Object.keys(E.resp).length}/${L.length} respondidas)</button>`}</div>`;
}
function refazerTopico(){ S.estudo.resp={}; S.estudo.corrigido=false; window.scrollTo(0,0); render(); }

// Fecha o item aberto: grava o estudo, agenda (ou avalia) a revisão 1-7-30 e
// registra o acerto das questões.
function concluirItem(resultado){
  const hoje = hojeISO(), E = S.estudo;
  if(S.vista==='estudo' && E){
    const L = E.questoes || [];
    if(E.corrigido && L.length) S.E.questoes.push({data:hoje, chave:E.chave, acertos: L.filter((q,k)=>E.resp[k]===q.c).length, total:L.length});
    if(E.rev){
      const i = S.E.revisoes.findIndex(r=>r.chave===E.chave);
      if(i>-1){ S.E.minutos[hoje] = (S.E.minutos[hoje]||0) + (MIN_REV[S.E.revisoes[i].etapa]||5); S.E.revisoes[i] = SIPC.revisao.avaliar(S.E.revisoes[i], resultado || 'lembrei', hoje); }
      avisar(resultado==='esqueci' ? 'Sem problema: o tópico volta amanhã.' : resultado==='dificil' ? 'Anotado: a revisão se repete na mesma etapa.' : 'Boa! O tópico avançou na escada de revisão.');
    } else {
      if(!S.E.feito[E.chave]) S.E.feito[E.chave] = hoje; // reestudo não muda a data original
      const ri = S.E.revisoes.findIndex(r=>r.chave===E.chave);
      if(ri < 0) S.E.revisoes.push(SIPC.revisao.agendar(E.mat, E.topico, hoje));
      else if(S.E.revisoes[ri].consolidado && E.corrigido && L.length && L.filter((q,k)=>E.resp[k]===q.c).length/L.length < .7)
        S.E.revisoes[ri] = SIPC.revisao.reabrir(S.E.revisoes[ri], hoje);
      S.E.minutos[hoje] = (S.E.minutos[hoje]||0) + SIPC.trilha.MIN_TOPICO;
    }
    E.concluido = true;
    delete S.E.parcial[E.chave];
    salvarE();
  }
  S.estudo = null; S.vista=null; S.aba='hoje'; window.scrollTo(0,0); render();
}

/* ------------------------- questões do dia -------------------------
   Para fixar: questões sobre os tópicos estudados nos últimos 7 dias.
   Errou um tópico? Ele volta para revisão amanhã. */
async function gerarQuestoesDoDia(){
  const Q = S.quiz, id = S.itemAtual, estado = S.E; Q.carregando = true; Q.erro = null; render(true);
  try{
    const chaves = topicosDaSemana().slice(0, 3);
    if(!chaves.length) throw new Error('nenhum tópico estudado nesta semana ainda');
    const porTopico = Math.ceil(S.qtdQuestoes / chaves.length);
    let lista = [];
    for(const [k, c] of chaves.entries()){
      // Matéria e tópico vêm da revisão (guarda os dois separados), não do split da chave.
      const r = S.E.revisoes.find(x=>x.chave===c), mat = r ? r.materia : c.split('::')[0], topico = r ? r.topico : c.slice(mat.length+2);
      limiteVisitante();
      const C = await SIPC.ia.obterConteudo({banca:S.bancas[0]||'', materia:mat, topico, uid:uid(), prova:S.prova.nome});
      const banca = bancaPara(k);
      limiteVisitante();
      const qs = await SIPC.ia.gerarQuestoes({banca, formato:formatoAtual(), materia:mat, topico, conteudo:C, qtd:porTopico});
      lista = lista.concat(qs.map(q=>({...q, banca, topico, mat, chave:c})));
    }
    Q.lista = lista.slice(0, S.qtdQuestoes);
    if(S.quiz !== Q && S.E === estado){ S.E.parcial[id] = {quiz: JSON.parse(JSON.stringify({...Q, carregando:false})), rot:'questões prontas', em: Date.now()}; salvarE(); }
  }catch(e){ Q.erro = mensagemIA(e); }
  finally{ Q.carregando = false; if(S.quiz===Q) render(true); }
}
function vistaQuiz(){
  const Q = S.quiz;
  const voltar = `<button class="voltar" onclick="sair()">${ico('back')} Plano de hoje</button>`;
  if(Q.carregando || (!Q.lista && !Q.erro)) return `<div class="quiz">${voltar}<div class="carregando">${ico('spark')}<p><b>Gerando ${S.qtdQuestoes} questões dos tópicos desta semana…</b><br><span class="dim">Leva até um minuto.</span></p></div></div>`;
  if(Q.erro) return `<div class="quiz">${voltar}<div class="erro"><b>Não consegui gerar as questões agora.</b><br>${escHtml(Q.erro)}</div><div class="fim-estudo"><button class="btn" onclick="gerarQuestoesDoDia()">Tentar de novo</button></div></div>`;
  const L = Q.lista;
  if(Q.i >= L.length) return placar();
  const q = L[Q.i], letras = q.ce ? 'CE' : 'ABCDE';
  const pontos = L.map((_,k)=>`<i class="${k<Q.res.length?(Q.res[k]?'c':'e'):k===Q.i?'a':''}"></i>`).join('');
  const alts = q.alts.map((a,k)=>{
    let cls = '';
    if(Q.conf){ if(k===q.c) cls='certa'; else if(k===Q.sel) cls='errada'; }
    else if(k===Q.sel) cls='sel';
    const marca = Q.conf && k===q.c ? ico('check') : Q.conf && k===Q.sel ? ico('x') : '';
    return `<button class="alt ${cls}" ${Q.conf?'disabled':''} onclick="S.quiz.sel=${k};render(true)"><span class="letra">${letras[k]}</span><span>${escHtml(a)}</span>${marca}</button>`;
  }).join('');
  const acertou = Q.sel===q.c;
  return `<div class="quiz">
    ${voltar}
    <div class="quiz-cab"><span class="dim" style="font-size:14px">Questão <span class="num">${Q.i+1}</span> de <span class="num">${L.length}</span> · ${escHtml(q.topico)}</span><div class="pontos" aria-hidden="true">${pontos}</div></div>
    <article class="questao">
      <span class="origem ined">${ico('spark')} ${q.ce ? 'Item inédito no estilo Cebraspe · julgue Certo ou Errado' : 'Inédita no estilo '+escHtml(q.banca||bancasTxt())}</span>
      ${q.ce && q.base ? `<blockquote class="texto-base">${escHtml(q.base).replace(/\n/g,'<br>')}</blockquote><p class="enunciado"><b>${escHtml(q.comando||'')}</b></p>` : ''}
      ${enunciado(q.enun)}
      <div class="alts" role="radiogroup">${alts}</div>
      ${rascunhoHTML('dia#'+hojeISO()+'#'+Q.i)}
      ${Q.conf ? `<div class="gabarito ${acertou?'ok':'nao'}" aria-live="polite"><b>${acertou?'Você acertou.':q.ce?`Você errou. O gabarito é ${q.alts[q.c]}.`:`Errado. A resposta é a letra ${letras[q.c]}.`}</b><p>${escHtml(q.just)}</p>
        ${!acertou ? `<div class="fonte">"${escHtml(q.topico)}" volta para revisão amanhã.</div>` : ''}</div>` : ''}
      <div class="quiz-acoes">
        ${Q.conf ? `<button class="btn" onclick="proxima()">${Q.i+1<L.length?'Próxima questão':'Ver resultado'}</button>`
                 : `<button class="btn" ${Q.sel===null?'disabled':''} onclick="confirmar()">Confirmar resposta</button>`}
      </div>
    </article>
  </div>`;
}
function confirmar(){ if(!S.quiz || S.quiz.conf || S.quiz.sel===null) return; S.quiz.conf=true; S.quiz.res.push(S.quiz.sel===S.quiz.lista[S.quiz.i].c); guardarProgresso(); render(true); }
function proxima(){
  S.quiz.i++; S.quiz.sel=null; S.quiz.conf=false;
  if(S.quiz.i >= S.quiz.lista.length) registrarQuiz();
  else guardarProgresso();
  window.scrollTo(0,0); render();
}
function registrarQuiz(){
  const Q = S.quiz, hoje = hojeISO(); if(Q.registrado) return;
  const porChave = {};
  Q.lista.forEach((q,k)=>{ const p = porChave[q.chave] = porChave[q.chave] || {acertos:0, total:0}; p.total++; if(Q.res[k]) p.acertos++; });
  Object.entries(porChave).forEach(([c,p])=>{
    S.E.questoes.push({data:hoje, chave:c, ...p});
    if(p.acertos < p.total){ // errou: a revisão do tópico vem amanhã
      const r = S.E.revisoes.find(x=>x.chave===c);
      const i = S.E.revisoes.indexOf(r);
      if(r && r.consolidado) S.E.revisoes[i] = SIPC.revisao.reabrir(r, hoje); // consolidado que errou volta à escada
      else if(r && (!r.proxima || r.proxima > somar(hoje,1))) r.proxima = somar(hoje,1);
    }
  });
  (S.E.diario[hoje] = (S.E.diario[hoje]||[])).push('q:'+hoje);
  Object.keys(S.E.diario).forEach(d => { if(d < somar(hoje,-7)) delete S.E.diario[d]; });
  S.E.minutos[hoje] = (S.E.minutos[hoje]||0) + 20;
  delete S.E.parcial[S.itemAtual]; delete S.E.parcial['q:'+hoje];
  Q.registrado = true;
  salvarE();
}
function placar(){
  const Q = S.quiz, L = Q.lista, ac = Q.res.filter(Boolean).length;
  const tops = [...new Set(L.filter((q,k)=>!Q.res[k]).map(q=>q.topico))];
  return `<div class="quiz"><div class="questao placar">
    <h2>Resultado</h2><span class="num">${ac}/${L.length}</span>
    <p class="dim">${ac===L.length?'Tudo certo. Os tópicos seguem na revisão no intervalo normal.':'Cada erro vira revisão no momento certo, sem você precisar anotar nada.'}</p>
    ${tops.length ? `<ul>${tops.map(t=>`<li>${ico('info')}<span><b>${escHtml(t)}</b> volta para revisão amanhã</span></li>`).join('')}</ul>` : ''}
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:8px">
      <button class="btn" onclick="S.vista=null;S.aba='hoje';window.scrollTo(0,0);render()">Voltar ao plano de hoje</button>
    </div></div></div>`;
}

/* ------------------------- outras abas ------------------------- */
function abaTrilha(){
  const porDia = ritmo().topDia, hoje = hojeISO();
  const fila = SIPC.trilha.filaDeTopicos(S.materias).filter(x=>!S.E.feito[chave(x.materia,x.topico)]).map(x=>({t:x.topico, m:x.materia}));
  // simula 40 dias: o que se estuda no dia d volta em d+1, d+7 e d+30
  const vence = {};
  S.E.revisoes.filter(r=>!r.consolidado && r.proxima).forEach(r=>{ const i = Math.max(0, diasEntre(hoje, r.proxima)); (vence[i] = vence[i] || []).push({t:r.topico, e:r.etapa}); });
  let pendentes = [];
  const dias = [];
  const hojeNovos = topicosParaHoje().filter(x=>!S.E.feito[chave(x.materia,x.topico)]).map(x=>({t:x.topico, m:x.materia}));
  for(let i=0; i<40; i++){
    const d = somar(hoje, i), estuda = S.dias[dowDe(d)];
    const venceHoje = (vence[i]||[]).concat(pendentes);
    let estudado = null;
    if(estuda || i===0){
      if(i===0){ estudado = hojeNovos; hojeNovos.forEach(h=>{ const k = fila.findIndex(f=>f.t===h.t && f.m===h.m); if(k>-1) fila.splice(k,1); }); }
      else estudado = fila.splice(0, porDia);
      estudado.forEach(x => ETAPAS.forEach((e,k) => (vence[i+e.dias] = vence[i+e.dias] || []).push({t:x.t, e:k})));
      pendentes = [];
    } else pendentes = venceHoje; // revisão de folga passa para o próximo dia de estudo
    if(dias.length < 6){
      const dd = dataDe(d);
      const rot = i===0 ? 'Hoje' : i===1 ? 'Amanhã' : fmtData(dd,{weekday:'long'}).replace(/^./,c=>c.toUpperCase());
      const sub = fmtData(dd,{weekday:'short',day:'2-digit',month:'2-digit'});
      if(estudado) dias.push([rot, sub, estudado, venceHoje]);
      else if(i<=1) dias.push([rot, sub, null, []]);
    }
  }
  return `<p class="dim" style="margin:0 0 14px;font-size:14px">Todo tópico estudado volta em 24 horas, em 7 dias e em 30 dias. As revisões que caem na sua folga passam para o próximo dia de estudo.</p>
    ${dias.map(([dd,sub,novos,revs])=>`<div class="trilha-dia"><div class="d">${dd}<span>${sub}</span></div><div>
      ${novos ? (novos.length ? `<ul>${novos.map(x=>`<li>${escHtml(x.t)} <span class="dim">· ${escHtml(x.m)}</span></li>`).join('')}</ul>` : '<p class="dim" style="margin:0">Só revisão</p>') : '<p class="dim" style="margin:0">Folga: fora do seu ritmo</p>'}
      ${revs.length ? `<p class="trilha-rev"><b>Revisar:</b> ${revs.map(r=>`${escHtml(r.t)} <span class="tag rev">${ETAPAS[r.e].curto}</span>`).join(' ')}</p>` : ''}
    </div></div>`).join('')}`;
}
function abaRevisoes(){
  const itens = S._itens = planoDoDia();
  const rev = itens.map((it,k)=>({it,k})).filter(x=>x.it.tipo==='rev');
  const hoje = hojeISO();
  const proximas = S.E.revisoes.filter(r=>!r.consolidado && r.proxima && r.proxima > hoje).sort((a,b)=>a.proxima.localeCompare(b.proxima));
  const consol = S.E.revisoes.filter(r=>r.consolidado).length;
  return `<div class="rev-grid"><div><h3 class="sub-h" style="margin-top:0">Ciclo 24h · 7 dias · 30 dias</h3><ul class="plano">
    <li class="grupo">Vencem hoje</li>
    ${rev.length ? rev.map(({it,k})=>`<li class="item ${it.feito?'feito':''}" onclick="abrirItem(${k})" role="button" tabindex="0"><span class="marca-check">${ico('check')}</span><div><div class="tit">${escHtml(it.titulo)}</div><div class="meta-item"><span class="tag rev">${escHtml(it.extra)}</span>${escHtml(it.mat)}</div></div>${ico('chev')}</li>`).join('')
      : '<li class="item"><span></span><div class="dim">Nenhuma revisão vence hoje.</div><span></span></li>'}
    <li class="grupo">Próximos dias</li>
    ${proximas.length ? proximas.slice(0,12).map(r=>`<li class="item"><span class="marca-check"></span><div><div class="tit">${escHtml(r.topico)}</div><div class="meta-item"><span class="tag rev">${ETAPAS[r.etapa].curto}</span>${escHtml(r.materia)} · volta em ${fmtData(dataDe(r.proxima),{day:'2-digit',month:'2-digit'})}</div></div><span></span></li>`).join('')
      : '<li class="item"><span></span><div class="dim">Estude um tópico e ele aparece aqui, com as datas de volta.</div><span></span></li>'}
  </ul></div>
  <section class="bloco"><h3>Seu ciclo de revisão</h3>
    <div class="kpis kpis3"><div class="kpi"><span class="k-rot">Em revisão</span><span class="k-val">${S.E.revisoes.length - consol}</span></div>
      <div class="kpi"><span class="k-rot">Consolidados</span><span class="k-val">${consol}</span><span class="k-delta">passaram pelos 30 dias</span></div>
      <div class="kpi"><span class="k-rot">Vencem hoje</span><span class="k-val">${rev.filter(x=>!x.it.feito).length}</span></div></div>
    <p class="dim" style="font-size:13px;margin:12px 0 0">Lembrei leva à próxima etapa; Difícil repete a etapa; Esqueci recomeça em 24 horas.</p>
  </section></div>`;
}

/* ------------------------- painel de andamento -------------------------
   Abre com a pergunta que o aluno tem: estou no ritmo? Linha do realizado
   contra o planejado, indicadores da semana, cobertura por matéria,
   constância em calendário e o que precisa de atenção. Tudo dos dados reais. */
const RAMPA = ['#7fb4f2','#4f94ea','#2a7ae2','#0a60c4','#004a96'];
const criadaISO = () => String(S.trilhaCriadaEm || hojeISO()).slice(0,10);
function diasDeEstudoEntre(a, b){ let n = 0; for(let d = a; d <= b; d = somar(d,1)) if(S.dias[dowDe(d)]) n++; return n; }
function feitosAte(d){ return Object.values(S.E.feito).filter(x => x <= d).length; }
function cobertura(){ return Math.round(Object.keys(S.E.feito).length / Math.max(1, totalTopicos()) * 100); }
// Number(): um documento adulterado com texto no lugar do número viraria concatenação (e HTML) no admin.
function acertoGeral(lista = S.E.questoes){ const t = (lista||[]).reduce((a,q)=>a+(Number(q.total)||0),0), a = (lista||[]).reduce((s,q)=>s+(Number(q.acertos)||0),0); return {total:t, acertos:a, pct: t ? Math.round(a/t*100) : 0}; }
// Compara o que foi estudado com o que o ritmo previa desde a criação da
// trilha (até ontem: o dia de hoje ainda está em andamento).
// Tópicos que o ritmo previa até o começo do dia d.
function planoAte(d){ const antes = somar(d, -1), criada = criadaISO(); return criada <= antes ? diasDeEstudoEntre(criada, antes) * ritmo().topDia : 0; }
function ritmoDoPlano(){
  const top = ritmo().topDia, esperado = planoAte(hojeISO());
  const dias = Math.round((Object.keys(S.E.feito).length - esperado) / top);
  const texto = dias > 0 ? `${dias} ${dias===1?'dia':'dias'} à frente do plano` : dias < 0 ? `${-dias} ${dias===-1?'dia':'dias'} atrás do plano` : 'Em dia com o plano';
  return {dias, texto};
}
function serieSemanas(){
  const criada = criadaISO(), hoje = hojeISO(), total = Math.max(1, totalTopicos()), top = ritmo().topDia;
  const semanas = Math.min(8, Math.max(1, Math.ceil((diasEntre(criada, hoje)+1)/7)));
  const pontos = [];
  for(let k = 0; k <= semanas; k++){
    const d = k === semanas ? hoje : somar(hoje, -7*(semanas-k));
    const dd = d < criada ? criada : d;
    pontos.push({d: dd, real: Math.round(feitosAte(dd)/total*1000)/10, plano: Math.min(100, Math.round(planoAte(dd)/total*1000)/10)});
  }
  return pontos;
}
const pct = v => String(v).replace('.', ',') + '%';
function graficoLinha(P){
  const W = 900, H = 230, pe = 36, pd = 78, pt = 14, pb = 30;
  const max = Math.max(10, Math.ceil(Math.max(...P.map(p=>Math.max(p.real,p.plano)))/10)*10);
  const x = k => pe + k*(W-pe-pd)/Math.max(1,P.length-1);
  const y = v => pt + (1 - v/max)*(H-pt-pb);
  const caminho = arr => arr.map((v,k)=>`${k?'L':'M'}${x(k).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const grade = [0, max/2, max].map(v=>`<line x1="${pe}" x2="${W-pd}" y1="${y(v)}" y2="${y(v)}" class="g-grade"/><text x="${pe-8}" y="${y(v)+4}" class="g-eixo" text-anchor="end">${v}%</text>`).join('');
  const ultimo = P.length-1;
  const rotX = P.map((p,k)=>`<text x="${x(k)}" y="${H-8}" class="g-eixo" text-anchor="middle">${k===ultimo?'hoje':fmtData(dataDe(p.d),{day:'2-digit',month:'2-digit'})}</text>`).join('');
  const alvos = P.map((p,k)=>`<rect x="${x(k)-18}" y="${pt}" width="36" height="${H-pt-pb}" class="g-alvo" tabindex="0" data-tip="${k===ultimo?'Hoje':fmtData(dataDe(p.d),{day:'2-digit',month:'2-digit'})}: ${pct(p.real)} do edital coberto · plano ${pct(p.plano)}"></rect>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="grafico" role="img" aria-label="Edital coberto: realizado ${pct(P[ultimo].real)}, planejado ${pct(P[ultimo].plano)}">
    ${grade}${rotX}
    <path d="${caminho(P.map(p=>p.plano))}" class="g-plano"/>
    <path d="${caminho(P.map(p=>p.real))}" class="g-real"/>
    ${P.map((p,k)=>`<circle cx="${x(k)}" cy="${y(p.real)}" r="${k===ultimo?5:3.5}" class="g-ponto"/>`).join('')}
    <text x="${x(ultimo)+10}" y="${y(P[ultimo].real)-2}" class="g-rot g-rot-real">Você ${pct(P[ultimo].real)}</text>
    <text x="${x(ultimo)+10}" y="${y(P[ultimo].plano)+14}" class="g-rot">Plano ${pct(P[ultimo].plano)}</text>
    ${alvos}
  </svg>`;
}
function calendario(){
  const hoje = hojeISO(), inicio = somar(hoje, -dowDe(hoje) - 7*7), cel = [];
  for(let w=0; w<8; w++) for(let d=0; d<7; d++){
    const dia = somar(inicio, w*7+d), futuro = dia > hoje, min = S.E.minutos[dia] || 0;
    cel.push({w, d, dia, min, fora: !S.dias[d], futuro});
  }
  const nivel = m => m===0 ? -1 : m<30 ? 0 : m<60 ? 1 : m<90 ? 2 : m<120 ? 3 : 4;
  return `<div class="cal" role="img" aria-label="Minutos estudados por dia nas últimas 8 semanas">
    <div class="cal-dias">${['S','T','Q','Q','S','S','D'].map(d=>`<span>${d}</span>`).join('')}</div>
    <div class="cal-grade">${cel.map(c=>{
      const n = nivel(c.min), cor = c.futuro ? 'transparent' : n<0 ? 'var(--surface-2)' : RAMPA[n];
      const tip = c.futuro ? '' : c.min ? `${c.min} min de estudo` : c.fora ? 'Fora do seu ritmo' : 'Sem estudo';
      return `<i style="background:${cor};grid-row:${c.d+1};grid-column:${c.w+1}" ${tip?`tabindex="0" data-tip="${fmtData(dataDe(c.dia),{day:'2-digit',month:'2-digit'})}: ${tip}"`:''}></i>`;
    }).join('')}</div></div>
    <div class="cal-legenda"><span>menos</span>${['var(--surface-2)',...RAMPA].map(c=>`<i style="background:${c}"></i>`).join('')}<span>mais</span></div>`;
}
function minutosEntre(a, b){ let s = 0; for(let d = a; d <= b; d = somar(d,1)) s += S.E.minutos[d] || 0; return s; }
const horasTxt = m => `${Math.floor(m/60)}h${pad(m%60)}`;
function acertoPorChave(){
  const p = {};
  S.E.questoes.forEach(q=>{ const x = p[q.chave] = p[q.chave] || {acertos:0,total:0}; x.acertos += q.acertos; x.total += q.total; });
  return p;
}
function abaPainel(){
  const r = ritmo(), hoje = hojeISO();
  const P = serieSemanas(), cob = cobertura(), pace = ritmoDoPlano(), ac = acertoGeral();
  const restante = totalTopicos() - Object.keys(S.E.feito).length;
  const fim = somar(hoje, Math.ceil(Math.ceil(restante / r.topDia) * 7 / Math.max(1, S.dias.filter(Boolean).length)));
  const sobra = diasEntre(fim, S.dataProva);
  const semana = minutosEntre(somar(hoje,-6), hoje), anterior = minutosEntre(somar(hoje,-13), somar(hoje,-7));
  const ac14 = acertoGeral(S.E.questoes.filter(q=>q.data >= somar(hoje,-13)));
  const porChave = acertoPorChave();
  const mats = S.materias.map(m=>{
    const feitos = m.topicos.filter(t=>S.E.feito[chave(m.nome,t)]).length;
    const qs = Object.entries(porChave).filter(([c])=>c.startsWith(m.nome+'::')).map(([,v])=>v);
    const a = acertoGeral(qs);
    return {m, cob: Math.round(feitos/Math.max(1,m.topicos.length)*100), ac: a.total ? a.pct : null};
  }).sort((a,b)=>b.m.peso-a.m.peso);
  const fracos = S._atencao = Object.entries(porChave).map(([c,v])=>({c, mat:c.split('::')[0], top:c.split('::').slice(1).join('::'), pct: Math.round(v.acertos/v.total*100)}))
    .filter(x=>x.pct < 70).sort((a,b)=>a.pct-b.pct).slice(0,3);
  const revHoje = revisoesDeHoje().filter(x=>!x.feita);
  const itensHoje = S._itens = planoDoDia();
  return `<div class="painel-grid">
    <section class="bloco p-abre">
      <div class="p-status ${pace.dias>=0?'ok':''}">${ico(pace.dias>=0?'check':'info')} ${pace.dias>=0?'No ritmo':'Um pouco atrás'}</div>
      <h2>${pace.dias===0 ? 'Você está em dia com o plano' : 'Você está ' + pace.texto}</h2>
      <p class="dim">${cob}% do edital coberto. ${restante>0 ? `Nesse passo, você fecha o conteúdo em <b>${fmtData(dataDe(fim),{day:'2-digit',month:'2-digit',year:'numeric'})}</b>${sobra>0?`, ${sobra} dias antes da prova, para revisar e fazer questões`:sobra<0?`, ${-sobra} dias depois da prova: vale estudar um pouco mais por dia`:''}.` : 'Edital todo estudado: agora é revisão.'}</p>
      ${graficoLinha(P)}
      <div class="g-legenda"><span><i class="l-real"></i>Realizado</span><span><i class="l-plano"></i>Planejado</span></div>
    </section>

    <section class="kpis" aria-label="Indicadores da semana">
      <div class="kpi"><span class="k-rot">Estudo nos últimos 7 dias</span><span class="k-val">${horasTxt(semana)}</span><span class="k-delta ${semana>anterior?'up':''}">${anterior ? (semana>=anterior ? `${semana-anterior} min a mais que a semana anterior` : `${anterior-semana} min a menos que a semana anterior`) : 'primeira semana'}</span></div>
      <div class="kpi"><span class="k-rot">Acerto nas questões</span><span class="k-val">${ac.total ? ac.pct+'%' : '—'}</span><span class="k-delta">${ac.total ? `${ac.acertos} de ${ac.total} · últimas 2 semanas: ${ac14.total?ac14.pct+'%':'—'}` : 'faça as questões de um tópico'}</span></div>
      <div class="kpi"><span class="k-rot">Revisões hoje</span><span class="k-val">${revHoje.length}</span><span class="k-delta">24h · 7 dias · 30 dias</span></div>
      <div class="kpi"><span class="k-rot">Dias seguidos</span><span class="k-val">${diasSeguidos()}</span><span class="k-delta">${faltouOntem()?'recomeça hoje, sem problema':'dias com estudo registrado'}</span></div>
    </section>

    <section class="bloco p-mat">
      <h3>Por matéria</h3>
      <p class="dim" style="font-size:13px;margin:0 0 12px">Quanto do conteúdo de cada uma você já estudou, da que vale mais para a que vale menos.</p>
      <div class="pm-cab"><span>Matéria</span><span>Coberto</span><span>Acerto</span></div>
      ${mats.map(x=>`<div class="pm-linha" tabindex="0" data-tip="${escHtml(x.m.nome)}: ${x.cob}% coberto${x.ac!==null?' · '+x.ac+'% de acerto':''}">
        <span class="pm-nome">${escHtml(x.m.nome)}<small>${S.prova.pesoTipo==='chance'?'chance '+x.m.peso+'%':'peso '+x.m.peso}</small></span>
        <span class="pm-barra"><span class="peso-barra"><i style="width:${Math.max(x.cob,1.5)}%"></i></span><b>${x.cob}%</b></span>
        <span class="pm-ac">${x.ac===null?'<span class="dim">—</span>':x.ac+'%'}</span></div>`).join('')}
    </section>

    <div class="p-lado">
      <section class="bloco"><h3>Revisões 1-7-30</h3>
        <p class="dim" style="font-size:13px;margin:0 0 10px">O que vence hoje. Revisar no dia certo é o que fixa.</p>
        <ul class="atencao">${itensHoje.map((it,k)=>({it,k})).filter(x=>x.it.tipo==='rev' && !x.it.feito).map(({it,k})=>`<li><div><b>${escHtml(it.titulo)}</b><span class="dim">${escHtml(it.extra)}</span></div>
          <button class="btn sec" onclick="abrirItem(${k})">Revisar</button></li>`).join('') || '<li class="dim">Nenhuma revisão hoje.</li>'}</ul>
        <p class="dim" style="font-size:12px;margin:10px 0 0">O que você estudar hoje volta em ${dataMais(1)}, ${dataMais(7)} e ${dataMais(30)}.</p>
      </section>
      <section class="bloco"><h3>Constância</h3><p class="dim" style="font-size:13px;margin:0 0 12px">Minutos de estudo por dia, nas últimas 8 semanas.</p>${calendario()}</section>
      <section class="bloco"><h3>Precisa de atenção</h3>
        <p class="dim" style="font-size:13px;margin:0 0 10px">Onde você mais erra (abaixo de 70%). Um estudo agora rende mais aqui.</p>
        <ul class="atencao">${fracos.map((x,k)=>`<li><div><b>${escHtml(x.top)}</b><span class="dim">${escHtml(x.mat)} · ${x.pct}% de acerto</span></div>
            <button class="btn sec" onclick="estudarAtencao(${k})">Estudar</button></li>`).join('') || '<li class="dim">Nada abaixo de 70% por enquanto.</li>'}</ul>
      </section>
    </div>
  </div>`;
}
function estudarAtencao(k){ const x = S._atencao[k]; if(!x) return; const rev = S.E.revisoes.find(r=>r.chave===x.c); abrirEstudo(x.top, x.mat, rev && !rev.consolidado ? rev : null); }

/* dica de hover/foco compartilhada pelos gráficos do painel */
(function(){
  const tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role','tooltip'); document.body.appendChild(tip);
  const mostrar = (el, x, y) => { tip.textContent = el.dataset.tip; tip.style.left = Math.min(x+14, innerWidth - tip.offsetWidth - 8)+'px'; tip.style.top = (y+14)+'px'; tip.classList.add('on'); };
  document.addEventListener('mousemove', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if(el) mostrar(el, e.clientX, e.clientY); else tip.classList.remove('on'); });
  document.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if(el){ const b = el.getBoundingClientRect(); mostrar(el, b.left, b.bottom); } });
  document.addEventListener('focusout', () => tip.classList.remove('on'));
})();

/* ------------------------- rascunho por questão -------------------------
   Como a folha de rascunho da prova: texto livre, salvo por questão. (O
   desenho com caneta fica para a v1.1.) */
const RASC_ABERTO = {};
function rascunhoHTML(key){
  const k = encodeURIComponent(key).replace(/'/g,"%27");
  const txt = (S.E.rascunhos||{})[key] || '';
  const aberto = !!RASC_ABERTO[key];
  return `<div class="rasc">
    <button class="rasc-btn ${aberto?'on':''}" onclick="alternarRascunho('${k}')" aria-expanded="${aberto}">
      <svg class="ico" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>
      Rascunho${txt.trim()?' <span class="rasc-salvo">salvo</span>':''}</button>
    ${aberto ? `<div class="rasc-painel"><textarea id="rt_${k}" class="rasc-texto" rows="5" placeholder="Anote o que quiser: contas, a tabela-verdade, as premissas…" oninput="guardarRascunho('${k}',this.value)">${escHtml(txt)}</textarea></div>` : ''}
  </div>`;
}
function alternarRascunho(k){ const key = decodeURIComponent(k); RASC_ABERTO[key] = !RASC_ABERTO[key]; render(true); }
function guardarRascunho(k, v){ (S.E.rascunhos = S.E.rascunhos || {})[decodeURIComponent(k)] = v; salvarE(); }

/* ------------------------- conta e lembretes ------------------------- */
function abaConta(){
  const c = S.usuario, L = (S.perfil && S.perfil.lembrete) || {hora:'19:00', navegador:false};
  const perm = ('Notification' in window) ? Notification.permission : 'indisponivel';
  const perfil = c ? `<section class="bloco">
      <h3>Seus dados</h3>
      <div class="campo-f"><label class="f" for="pfNome">Nome</label><input type="text" id="pfNome" value="${escHtml(c.nome)}"></div>
      <div class="campo-f"><label class="f">E-mail</label><input type="text" value="${escHtml(c.email)}" disabled></div>
      <p class="dim" style="font-size:13px;margin:0 0 10px">Entrou com ${c.via==='Google'?'Google':'e-mail e senha'}.</p>
      <button class="btn sec" onclick="salvarNome()">Salvar nome</button>
      ${S.msgNome ? `<p class="ok-f" role="status" style="margin-top:8px">${escHtml(S.msgNome)}</p>` : ''}
    </section>
    <section class="bloco">
      <h3>Senha</h3>
      ${c.via==='Google' ? '<p class="dim" style="font-size:14px;margin:0">Sua conta usa o login do Google: a senha é a da sua conta Google.</p>' : `
      <form onsubmit="event.preventDefault();trocarSenha()" novalidate>
        <div class="campo-f"><label class="f" for="sAtual">Senha atual</label><input type="password" id="sAtual" autocomplete="current-password"></div>
        <div class="campo-f"><label class="f" for="sNova">Nova senha</label><input type="password" id="sNova" autocomplete="new-password"><p class="dica">Pelo menos 8 caracteres</p></div>
        <div class="campo-f"><label class="f" for="sConf">Repita a nova senha</label><input type="password" id="sConf" autocomplete="new-password"></div>
        ${S.msgSenha ? `<p class="${S.msgSenha.ok?'ok-f':'erro-f'}" role="status">${escHtml(S.msgSenha.t)}</p>` : ''}
        <button class="btn" type="submit">Alterar senha</button>
        <button class="btn link" type="button" onclick="linkSenhaConta()">Esqueci minha senha</button>
      </form>`}
    </section>`
    : `<section class="bloco"><h3>Você está sem conta</h3><p class="dim" style="font-size:14px;margin:0 0 12px">Crie uma conta para salvar sua trilha e continuar no celular ou no computador.</p>
        <button class="btn" onclick="irEntrada()">Entrar ou criar conta</button></section>`;
  return `<div class="conta-grid" data-sem-print>
    ${perfil}
    ${c ? `<section class="bloco lembretes">
      <h3>Lembrete de estudo</h3>
      <p class="dim" style="font-size:14px;margin:0 0 14px">Um aviso por dia no seu horário, com as revisões e os tópicos do dia. Chega enquanto o SIPC estiver aberto em alguma aba.</p>
      <div class="campo-f"><label class="f" for="lmHora">Horário</label><input type="time" id="lmHora" value="${L.hora}" onchange="definirLembrete({hora:this.value})" style="max-width:140px"></div>
      <div class="lm-op">
        <div><b>Notificação do navegador</b><span class="dim">${perm==='granted' ? 'Permitida neste navegador.' : perm==='denied' ? 'Bloqueada: libere nas configurações do navegador.' : perm==='indisponivel' ? 'Este navegador não tem notificações.' : 'Chega mesmo com o SIPC em outra aba.'}</span></div>
        <button class="btn ${L.navegador&&perm==='granted'?'ok':'sec'}" onclick="ativarNotificacao()" ${perm==='denied'||perm==='indisponivel'?'disabled':''}>${L.navegador&&perm==='granted'?'Ativada':'Ativar'}</button>
      </div>
      <div class="fim-estudo" style="margin-top:6px"><button class="btn link" onclick="testarLembrete()">Testar o lembrete agora</button></div>
    </section>` : ''}
    <section class="bloco"><h3>Modo teste</h3><p class="dim" style="font-size:14px;margin:0 0 12px">Para experimentar sem mexer no seu progresso: com ele ligado, nada é gravado. Ao desligar, tudo volta como estava.</p>${chaveTeste()}</section>
    <section class="bloco"><h3>Minhas trilhas</h3><p class="dim" style="font-size:14px;margin:0 0 12px">${S.trilhas.length} ${S.trilhas.length===1?'trilha':'trilhas'} nesta conta.</p><button class="btn sec" onclick="irTrilhas()">Ver minhas trilhas</button></section>
    <section class="bloco"><h3>Privacidade</h3><p class="dim" style="font-size:14px;margin:0 0 12px">O que guardamos, para quê e como pedir a exclusão.</p><a class="btn sec" href="privacidade.html" target="_blank" rel="noopener">Ler o aviso de privacidade</a></section>
    ${c ? `<section class="bloco"><h3>Sessão</h3><button class="btn sec ruim-txt" onclick="sairConta()">Sair da conta</button></section>` : ''}
  </div>`;
}
async function salvarNome(){
  const nome = document.getElementById('pfNome').value.trim(); if(!nome) return;
  try{ await SIPC.atualizarNome(nome); await SIPC.store.salvarPerfil(S.usuario.uid, {nome}); S.usuario.nome = nome; S.msgNome = 'Nome salvo.'; }
  catch(e){ S.msgNome = 'Não consegui salvar: ' + SIPC.traduzir(e); }
  render(true);
}
async function trocarSenha(){
  const a = document.getElementById('sAtual').value, n = document.getElementById('sNova').value, c = document.getElementById('sConf').value;
  S.msgSenha = !a ? {ok:false, t:'Digite a senha atual.'} : n.length < 8 ? {ok:false, t:'A nova senha precisa de pelo menos 8 caracteres.'}
    : n !== c ? {ok:false, t:'As duas senhas novas não são iguais.'} : null;
  if(!S.msgSenha){
    try{ await SIPC.trocarSenha(a, n); S.msgSenha = {ok:true, t:'Senha alterada. Use a nova no próximo login.'}; }
    catch(e){ S.msgSenha = {ok:false, t: SIPC.traduzir(e)}; }
  }
  render(true);
}
async function linkSenhaConta(){
  try{ await SIPC.esqueciSenha(S.usuario.email); S.msgSenha = {ok:true, t:'Enviamos um link para '+S.usuario.email+' para criar uma nova senha.'}; }
  catch(e){ S.msgSenha = {ok:false, t:SIPC.traduzir(e)}; }
  render(true);
}
async function definirLembrete(m){
  const L = {...((S.perfil && S.perfil.lembrete) || {hora:'19:00', navegador:false}), ...m};
  S.perfil = {...(S.perfil||{}), lembrete:L};
  try{ await SIPC.store.salvarPerfil(S.usuario.uid, {lembrete:L}); }catch(e){}
  render(true);
}
async function ativarNotificacao(){
  if(!('Notification' in window)) return;
  const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  await definirLembrete({navegador: p === 'granted'});
  avisar(p === 'granted' ? 'Pronto: todo dia às ' + S.perfil.lembrete.hora + ' o navegador avisa o que estudar.' : 'Sem permissão, o navegador não pode avisar.');
}
function textoLembrete(){
  const it = S.trilhaAtual ? planoDoDia() : [];
  const rev = it.filter(i=>i.tipo==='rev'&&!i.feito).map(i=>i.titulo), novos = it.filter(i=>i.tipo==='est'&&!i.feito).map(i=>i.titulo);
  return 'Revisar: ' + (rev.join(', ') || 'nada') + '. Estudar: ' + (novos.join(', ') || 'nada novo') + '.';
}
function testarLembrete(){
  const corpo = textoLembrete();
  if('Notification' in window && Notification.permission === 'granted'){ try{ new Notification('SIPC · hora de estudar', {body: corpo}); }catch(e){} }
  avisar('SIPC · hora de estudar — ' + corpo);
}
// Confere o horário a cada 30 s enquanto o app está aberto; avisa uma vez por dia.
setInterval(()=>{
  const L = S && S.perfil && S.perfil.lembrete; if(!L || !L.navegador || !('Notification' in window) || Notification.permission!=='granted') return;
  const d = new Date(), agora = pad(d.getHours())+':'+pad(d.getMinutes()), chaveDia = 'sipc::lembrete::'+hojeISO();
  if(agora < L.hora) return; // ">=" e não "===": em segundo plano o navegador atrasa o timer
  try{ if(localStorage.getItem(chaveDia)) return; localStorage.setItem(chaveDia, '1'); }catch(e){}
  try{ new Notification('SIPC · hora de estudar', {body: textoLembrete()}); }catch(e){}
}, 30000);

/* ------------------------- minhas trilhas -------------------------
   Várias trilhas por conta (dois concursos, uma certificação…). Cada uma
   guarda edital, ritmo, banca e progresso, inclusive onde parou. */
function aplicarTrilha(t){
  Object.assign(S, trilhaVazia());
  S.prova = {...S.prova, ...(t.prova||{})};
  S.materias = t.materias || []; S.bancas = t.bancas || [];
  const r = t.ritmo || {};
  S.horas = r.horas || 1.5; S.dias = r.dias || S.dias; S.dataProva = r.dataProva || S.dataProva; S.qtdQuestoes = r.qtdQuestoes || 10;
  S.formatoQuestoes = S.prova.formatoQuestoes || 'multipla5';
  S.trilhaCriadaEm = t.criadaDia || t.criadaEm || null; // criadaDia é a data local; trilhas antigas só têm criadaEm (UTC)
  S.edStatus = 'pronto';
}
let abrindo = 0;
async function abrirTrilha(id){
  const gen = ++abrindo, sessao = S;
  const vale = () => gen === abrindo && S === sessao; // outra abertura, ou saiu da conta, no meio
  await SIPC.store.salvarAgora();
  const t = S.trilhas.find(x=>x.id===id); if(!t || !vale()) return;
  S.tela = 'carregando'; render();
  aplicarTrilha(t);
  S.trilhaAtual = id; S.estadoOk = false;
  let e;
  try{ e = await SIPC.store.carregarEstado(uid(), id); }
  catch(err){
    if(!vale()) return;
    S.erroGeral = 'Não consegui carregar o progresso desta trilha (' + SIPC.traduzir(err) + '). Nada foi alterado: confira a internet e tente de novo.';
    S.tela = 'erro'; render(); return;
  }
  if(!vale()) return;
  S.E = {...estadoVazio(), ...(e||{})}; S.estadoOk = true;
  try{ localStorage.setItem('sipc::ultima-trilha::'+uid(), id); }catch(x){}
  S.tela = 'app'; S.aba = 'hoje'; S.vista = null; S.estudo = null; S.quiz = null;
  window.scrollTo(0,0); render();
}
// Volta para a aba: relê o estado se nada está pendente, para não sobrescrever
// o que foi feito em outro aparelho com a cópia antiga desta aba.
async function releEstado(){
  if(!S.trilhaAtual || !S.estadoOk || S.tela !== 'app' || S.vista || S.modoTeste) return;
  const id = S.trilhaAtual;
  try{ const e = await SIPC.store.carregarEstado(uid(), id); if(e && S.trilhaAtual === id && !S.vista){ S.E = {...estadoVazio(), ...e}; render(true); } }catch(x){}
}
// releEstado e guardarProgresso já são globais (script comum): o main.js os chama direto.
function novaTrilha(){
  SIPC.store.salvarAgora();
  S.genEdital = (S.genEdital||0) + 1; // descarta uma leitura de edital em andamento
  Object.assign(S, trilhaVazia());
  S.trilhaAtual = null; S.trilhaCriadaEm = null; S.tela = 'assist'; S.passo = 1; S.vista = null; S.estudo = null;
  window.scrollTo(0,0); render();
}
async function excluirTrilha(i){
  const t = S.trilhas[i]; if(!t) return;
  if(!confirm('Excluir a trilha "'+t.prova.nome+'" e todo o progresso dela? Não dá para desfazer.')) return;
  try{ await SIPC.store.excluirTrilha(uid(), t.id); }catch(e){ alert('Não consegui excluir: ' + SIPC.traduzir(e)); return; }
  S.trilhas = S.trilhas.filter(x=>x.id!==t.id);
  if(S.trilhaAtual===t.id){ S.trilhaAtual = null; if(!S.trilhas.length) return novaTrilha(); }
  render();
}
async function irTrilhas(){
  guardarProgresso(); await SIPC.store.salvarAgora();
  S.tela = 'trilhas'; window.scrollTo(0,0); render();
  try{ S.trilhas = await SIPC.store.listarTrilhas(uid()); }catch(e){}
  await Promise.all(S.trilhas.map(async t => {
    if(t.id === S.trilhaAtual){ S.resumos[t.id] = S.E; return; }
    try{ S.resumos[t.id] = (await SIPC.store.carregarEstado(uid(), t.id)) || estadoVazio(); }catch(e){ S.resumos[t.id] = estadoVazio(); }
  }));
  if(S.tela==='trilhas') render(true);
}
function resumoTrilha(t){
  const E = S.resumos[t.id] || estadoVazio();
  const top = (t.materias||[]).reduce((a,m)=>a+m.topicos.length,0);
  const feitos = Object.keys(E.feito||{}).length;
  const parcial = Object.values(E.parcial||{}).sort((a,b)=>(b.em||0)-(a.em||0))[0];
  const dias = Math.max(0, diasEntre(hojeISO(), (t.ritmo||{}).dataProva || hojeISO()));
  return {top, feitos, parcial, dias, pct: Math.min(100, Math.round(feitos/Math.max(1,top)*100)), carregado: !!S.resumos[t.id]};
}
function telaTrilhas(){
  const lista = S.trilhas.map((t,i) => { const r = resumoTrilha(t), atual = t.id===S.trilhaAtual;
    return `<article class="trilha-card ${atual?'atual':''}">
      <div class="tc-topo"><div><h2>${escHtml(t.prova.nome)}</h2><span class="dim">${(t.bancas||[]).length ? 'Banca '+escHtml(t.bancas.join(' ou ')) : 'Banca a definir'} · ${(t.materias||[]).length} matérias · ${r.top} tópicos</span></div>
        ${atual ? '<span class="tag est">Aberta agora</span>' : ''}</div>
      <div class="meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${r.pct}" aria-label="Progresso"><i style="width:${Math.max(r.pct,1)}%"></i></div>
      <div class="tc-dados"><span><b class="num">${r.carregado?r.pct+'%':'…'}</b> concluído</span><span><b class="num">${r.dias}</b> dias até a prova</span><span>Criada em ${t.criadaEm ? fmtData(new Date(t.criadaEm),{day:'2-digit',month:'2-digit',year:'numeric'}) : '—'}</span></div>
      ${r.parcial ? `<p class="tc-parou">${ico('info')} <b>${escHtml((r.parcial.estudo && r.parcial.estudo.topico) || 'Questões do dia')}</b> · ${escHtml(r.parcial.rot)}</p>` : ''}
      <div class="fim-estudo" style="margin-top:12px"><button class="btn" onclick="abrirTrilhaIdx(${i})">${r.parcial ? 'Continuar de onde parou' : atual ? 'Voltar para esta trilha' : 'Abrir trilha'}</button>
        <button class="btn link ruim-txt" onclick="excluirTrilha(${i})">Excluir</button></div>
    </article>`; }).join('');
  return `<div class="app">
    <div class="topo"><div><h1>Minhas trilhas</h1><div class="sub">Cada trilha é um edital com seu ritmo, banca e progresso. Pode estudar para mais de uma prova ao mesmo tempo.</div></div>
      <div class="contagem">${chaveTeste()}${S.trilhaAtual ? `<button class="btn sec" onclick="voltarTrilhaAberta()">Voltar à trilha aberta</button>` : ''}</div></div>
    <div class="trilhas-lista">${lista || '<p class="vazio">Nenhuma trilha ainda.</p>'}
      <button class="trilha-nova" onclick="novaTrilha()"><span>+</span><b>Nova trilha</b><span class="dim">Outro concurso, vestibular ou certificação</span></button>
    </div></div>`;
}
function abrirTrilhaIdx(i){ const t = S.trilhas[i]; if(!t) return; if(t.id===S.trilhaAtual) return voltarTrilhaAberta(); abrirTrilha(t.id); }
function voltarTrilhaAberta(){ S.tela = 'app'; S.vista = null; window.scrollTo(0,0); render(); }

/* ------------------------- modo teste -------------------------
   Com o modo teste ligado, tudo acontece normalmente, mas nada vai para o
   banco. Ao desligar, o progresso real é relido e o teste é descartado. */
async function alternarModoTeste(){
  if(S.visitante) return irEntrada();
  if(!S.modoTeste){
    guardarProgresso(); await SIPC.store.salvarAgora();
    SIPC.store.setModoTeste(true); S.modoTeste = true;
    avisar('Modo teste ligado: nada do que você fizer agora é salvo.');
    render();
  } else {
    SIPC.store.setModoTeste(false); S.modoTeste = false;
    try{ S.trilhas = await SIPC.store.listarTrilhas(uid()); }catch(e){}
    if(S.trilhaAtual && S.trilhas.some(t=>t.id===S.trilhaAtual)) await abrirTrilha(S.trilhaAtual);
    else if(S.trilhas.length) await abrirTrilha(S.trilhas[0].id);
    else novaTrilha();
    avisar('Modo teste desligado. O que você fez no teste foi descartado e seu progresso real voltou.');
  }
}
function avisar(txt){
  let t = document.getElementById('lembrete');
  if(!t){ t = document.createElement('div'); t.id = 'lembrete'; t.className = 'lembrete'; t.setAttribute('role','status'); document.body.appendChild(t); }
  t.innerHTML = '<span>' + escHtml(txt) + '</span>'; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(()=>t.classList.remove('on'), 6000);
}
function chaveTeste(){
  if(S.visitante) return `<button class="mt-chave on" onclick="irEntrada()" title="Criar conta para salvar">Sem conta · nada é salvo</button>`;
  if(!S.usuario) return '';
  return `<label class="mt-chave ${S.modoTeste?'on':''}"><input type="checkbox" ${S.modoTeste?'checked':''} onchange="alternarModoTeste()"><span class="mt-trilho"></span>Modo teste</label>`;
}

/* ------------------------- reportar bug ou melhoria -------------------------
   Em qualquer tela o aluno abre "Reportar", diz se é bug ou melhoria,
   escreve e manda o print da tela em que está. Vai para o Firestore já
   classificado por valor e esforço; o Victor vê na aba Admin. */
const SEV_ROT = {alta:'Bloqueia o estudo', media:'Atrapalha', baixa:'Incomoda'};
const QUAD = {
  ja:      {n:'Fazer já',  d:'Muito valor, pouco esforço'},
  planejar:{n:'Planejar',  d:'Muito valor, muito esforço'},
  encaixar:{n:'Encaixar',  d:'Pouco valor, pouco esforço'},
  depois:  {n:'Depois',    d:'Pouco valor, muito esforço'}
};
const ESF_ROT = {1:'pouco esforço', 2:'esforço médio', 3:'muito esforço'};
function nomeTelaAtual(){
  if(S.tela==='assist') return 'Configuração · ' + NOMES_PASSO[S.passo-1];
  if(S.tela==='trilhas') return 'Minhas trilhas';
  if(S.tela==='entrada') return 'Entrada';
  if(S.vista==='estudo') return 'Estudar tópico · ' + ((S.estudo && NOME_PARTE[S.estudo.parte]) || '');
  if(S.vista==='quiz') return 'Questões do dia';
  return {hoje:'Plano de hoje', trilha:'Trilha', revisoes:'Revisões', painel:'Painel', conta:'Conta', admin:'Admin'}[S.aba] || 'App';
}
let REP = null; // rascunho do reporte aberto
const scriptsCarregados = {};
const carregarScript = src => scriptsCarregados[src] ??= new Promise((ok, falha) => {
  const s = document.createElement('script'); s.src = src; s.onload = ok;
  s.onerror = () => { delete scriptsCarregados[src]; falha(new Error('não carregou ' + src)); };
  document.head.appendChild(s);
});
async function abrirReporte(){
  REP = {tipo:null, texto:'', incluirPrint:true, print:null, capturando:true, enviado:null, enviando:false, erro:null,
         tela:nomeTelaAtual(), disp: innerWidth<700 ? 'Celular' : 'Computador',
         quando: new Date().toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(',','')};
  const dlg = document.getElementById('repDlg');
  renderReporte();
  dlg.showModal();
  // O print é da tela como estava ao tocar em Reportar, sem o próprio diálogo.
  // A captura é assíncrona: se o reporte foi fechado ou trocado nesse meio
  // tempo, o resultado é descartado em vez de cair num rascunho que não é dele.
  const meu = REP;
  let print = null;
  try{
    if(typeof html2canvas === 'undefined') await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    const canvas = await html2canvas(document.body, {
      scale: Math.min(1, 900/innerWidth), useCORS:true, logging:false,
      x: scrollX, y: scrollY, width: innerWidth, height: innerHeight,
      ignoreElements: el => el.tagName==='DIALOG' || (el.hasAttribute && el.hasAttribute('data-sem-print'))
    });
    print = printCompacto(canvas);
  }catch(e){}
  if(REP !== meu) return;
  REP.print = print;
  REP.capturando = false;
  renderReporte();
}
// O print vai dentro do documento do Firestore (limite de 1 MB): reduz a
// qualidade e, se precisar, o tamanho até caber em ~700 KB.
function printCompacto(canvas){
  let c = canvas, q = .72, url = c.toDataURL('image/jpeg', q);
  while(url.length > 700000 && q > .35){ q -= .12; url = c.toDataURL('image/jpeg', q); }
  while(url.length > 700000 && c.width > 300){
    const m = document.createElement('canvas'); m.width = Math.round(c.width*.7); m.height = Math.round(c.height*.7);
    m.getContext('2d').drawImage(c, 0, 0, m.width, m.height); c = m; url = c.toDataURL('image/jpeg', q);
  }
  return url.length <= 700000 ? url : null;
}
function fecharReporte(){ document.getElementById('repDlg').close(); REP = null; }
// O evento 'close' chega depois do close(): só zera se o diálogo continuar
// fechado (um Reportar aberto logo em seguida não pode perder o rascunho).
function aoFecharDialogo(dlg){ if(!dlg.open) REP = null; }

async function enviarReporte(){
  const txt = document.getElementById('repTexto').value.trim();
  if(!REP.tipo || !txt || REP.enviando) return;
  const c = SIPC.prioridade.classificar(REP.tipo, txt, REP.tela);
  // Os limites batem com as Regras do Firestore (que recusam o documento inteiro se passar).
  const corta = (v, n) => String(v || '').slice(0, n);
  const item = {uid:S.usuario.uid, email:S.usuario.email, nome:corta(S.usuario.nome,120), tipo:REP.tipo, texto:corta(txt,4000), tela:corta(REP.tela,120), disp:REP.disp,
                trilha: S.prova && S.trilhaAtual ? corta(S.prova.nome,200) : '', print: REP.incluirPrint ? REP.print : null, ...c, area:corta(c.area,60), status:'novo'};
  REP.enviando = true; REP.texto = txt; renderReporte();
  try{ await SIPC.store.enviarFeedback(item); REP.enviado = item; }
  catch(e){ REP.erro = 'Não consegui enviar agora (' + SIPC.traduzir(e) + '). Tente de novo em instantes.'; }
  REP.enviando = false; renderReporte();
}
function renderReporte(){
  const el = document.getElementById('repCorpo');
  if(!REP){ el.innerHTML=''; return; }
  if(!S.usuario){
    el.innerHTML = `<h2>Reportar</h2><p class="lead">Para mandar um bug ou uma ideia, entre na sua conta: assim dá para responder e entender o contexto.</p>
      <div class="rep-acoes"><button class="btn sec" onclick="fecharReporte()">Agora não</button><button class="btn" onclick="fecharReporte();irEntrada()">Entrar ou criar conta</button></div>`;
    return;
  }
  if(REP.enviado){
    const it = REP.enviado, q = SIPC.prioridade.quadrante(it);
    el.innerHTML = `<div class="rep-ok">
      <div class="selo">${ico('check')}</div>
      <h2>Recebido, obrigado</h2>
      <div class="rep-class">${it.tipo==='bug'
        ? `<span class="tag bug">Bug</span><span class="tag ${it.sev}">${SEV_ROT[it.sev]}</span>`
        : `<span class="tag mel">Melhoria</span>`}<span class="tag q-${q}">${QUAD[q].n}</span><span class="tag baixa">${escHtml(it.area)}</span></div>
      <p class="dim" style="font-size:14px;margin:10px auto 0;max-width:42ch">${it.tipo==='bug'
        ? 'Entrou na lista já priorizada: o que mais atrapalha a jornada e dá menos trabalho vem primeiro.'
        : 'Entrou na lista de ideias, ordenada por valor para os alunos e esforço para fazer.'}</p>
      <div class="rep-acoes" style="justify-content:center">
        ${ehAdmin() ? `<button class="btn sec" onclick="fecharReporte();S.tela='app';S.vista=null;irAba('admin')">Ver backlog</button>` : ''}
        <button class="btn" onclick="fecharReporte()">Voltar ao que eu fazia</button>
      </div></div>`;
    return;
  }
  const bug = REP.tipo==='bug', mel = REP.tipo==='melhoria';
  const rotulo = bug ? 'O que aconteceu? O que você esperava que acontecesse?' : mel ? 'O que poderia ser melhor?' : 'Descreva';
  const ph = bug ? 'Ex.: cliquei em Confirmar resposta e nada aconteceu.' : mel ? 'Ex.: queria ver o gabarito de todas as questões no fim.' : 'Escolha acima se é um bug ou uma melhoria.';
  const textoAtual = (document.getElementById('repTexto')||{}).value ?? REP.texto;
  el.innerHTML = `<h2>Reportar</h2>
    <p class="lead">Viu algo errado ou teve uma ideia? Conte aqui. O print desta tela vai junto para entender o contexto.</p>
    <div class="rep-tipos" role="radiogroup" aria-label="Tipo">
      <button class="opcao bug ${bug?'on':''}" role="radio" aria-checked="${bug}" onclick="REP.tipo='bug';renderReporte()">${ico('alert')}<b>Algo deu errado</b><span>Bug: entra com prioridade</span></button>
      <button class="opcao ${mel?'on':''}" role="radio" aria-checked="${mel}" onclick="REP.tipo='melhoria';renderReporte()">${ico('spark')}<b>Tenho uma ideia</b><span>Melhoria: vai para a lista de ideias</span></button>
    </div>
    <label class="f" for="repTexto">${rotulo}</label>
    <textarea id="repTexto" rows="4" maxlength="4000" placeholder="${ph}" ${REP.tipo?'':'disabled'} oninput="REP.texto=this.value;document.getElementById('repEnviar').disabled=!this.value.trim()">${escHtml(textoAtual)}</textarea>
    <div class="rep-print">
      ${REP.capturando ? '<div class="sem">Capturando a tela…</div>' : REP.print ? `<img src="${REP.print}" alt="Print da tela ${escHtml(REP.tela)}">` : '<div class="sem">Não foi possível capturar a tela</div>'}
      <div>
        <label><input type="checkbox" ${REP.incluirPrint?'checked':''} ${REP.print?'':'disabled'} onchange="REP.incluirPrint=this.checked"> Enviar o print desta tela</label>
        <p class="rep-ctx">Vai junto também: tela <b>${escHtml(REP.tela)}</b> · ${REP.disp} · ${REP.quando} · seu e-mail</p>
      </div>
    </div>
    ${REP.erro ? `<p class="erro-f" role="alert">${escHtml(REP.erro)}</p>` : ''}
    <div class="rep-acoes">
      <button class="btn sec" onclick="fecharReporte()">Cancelar</button>
      <button class="btn" id="repEnviar" ${REP.tipo && textoAtual.trim() && !REP.enviando ? '' : 'disabled'} onclick="enviarReporte()">${REP.enviando?'Enviando…':'Enviar'}</button>
    </div>`;
  const ta = document.getElementById('repTexto'); if(REP.tipo && ta && !REP.capturando && !REP.enviando) ta.focus();
}

/* ------------------------- área do administrador -------------------------
   Só para o e-mail do Victor (as Regras do Firestore garantem do lado do
   servidor; esconder a aba é só conveniência). Backlog priorizado e a
   lista de testadores com o andamento de cada trilha. */
let ADM = {aba:'backlog', filtro:'todos', carregando:false, feedback:null, usuarios:null, erro:null};
async function carregarAdmin(forcar){
  if(!ehAdmin() || ADM.carregando || (ADM.feedback && !forcar)) return;
  ADM.carregando = true; ADM.erro = null; render(true);
  try{
    const [fb, us] = await Promise.all([SIPC.store.listarFeedback(), SIPC.store.listarUsuarios()]);
    ADM.feedback = fb;
    await Promise.all(us.map(async u => {
      u.trilhas = [];
      try{
        const ts = await SIPC.store.listarTrilhasDe(u.uid);
        u.trilhas = await Promise.all(ts.map(async t => {
          const e = (await SIPC.store.estadoDe(u.uid, t.id)) || estadoVazio();
          const top = (t.materias||[]).reduce((a,m)=>a+((m.topicos||[]).length),0), ac = acertoGeral(e.questoes||[]);
          const dias = Object.keys(e.minutos||{}).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
          return {nome:t.prova && t.prova.nome, pct: Math.round(Object.keys(e.feito||{}).length/Math.max(1,top)*100), acerto: ac.total ? ac.pct+'%' : '—', questoes: ac.total, ultimoEstudo: dias[dias.length-1] || null};
        }));
      }catch(e){ u.erroTrilhas = true; }
    }));
    ADM.usuarios = us.sort((a,b)=>String(b.ultimoAcesso||'').localeCompare(String(a.ultimoAcesso||'')));
  }catch(e){ ADM.erro = SIPC.traduzir(e); }
  ADM.carregando = false; render(true);
}
// Só aceita a imagem que o próprio app gera; qualquer outra coisa vira "sem print".
const printValido = p => typeof p === 'string' && p.length < 760000 && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(p) ? p : null;
const numero = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const quandoTs = ts => { try{ const d = ts && ts.toDate ? ts.toDate() : ts ? new Date(ts) : null; return d ? d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(',','') : '—'; }catch(e){ return '—'; } };
function abaAdmin(){
  if(!ehAdmin()) return '<p class="vazio">Área restrita.</p>';
  const topo = `<div class="bl-filtro" role="group" aria-label="Área do administrador" style="margin-bottom:16px">${[['backlog','Backlog'],['usuarios','Usuários']].map(([k,n])=>`<button class="chip ${ADM.aba===k?'on':''}" onclick="ADM.aba='${k}';render(true)">${n}</button>`).join('')}
    <button class="chip" onclick="carregarAdmin(true)">${ADM.carregando?'Atualizando…':'Atualizar'}</button></div>`;
  if(ADM.erro) return topo + `<div class="erro"><b>Não consegui ler os dados.</b><br>${escHtml(ADM.erro)}<br>Confira se as Regras novas do Firestore foram publicadas.</div>`;
  if(!ADM.feedback) return topo + `<div class="carregando">${ico('spark')}<p><b>Carregando…</b></p></div>`;
  return topo + (ADM.aba==='usuarios' ? admUsuarios() : admBacklog());
}
function admBacklog(){
  const P = SIPC.prioridade;
  const todos = P.ordenar(ADM.feedback);
  const vis = todos.filter(i=> ADM.filtro==='todos' || i.tipo===ADM.filtro);
  const cont = q => todos.filter(i=>P.quadrante(i)===q).length;
  const card = (i, pos) => { const q = P.quadrante(i); return `<article class="bl-item">
      ${printValido(i.print) ? `<img src="${printValido(i.print)}" alt="Print da tela ${escHtml(i.tela)}" title="Tocar para ampliar" tabindex="0" role="button" onclick="this.classList.toggle('ampliado')">` : '<div class="sem">sem print</div>'}
      <div>
        <div class="bl-meta"><span class="bl-pos num">${pos}</span><span class="tag q-${q}">${QUAD[q].n}</span>
          ${i.tipo==='bug' ? `<span class="tag ${SEV_ROT[i.sev] ? i.sev : 'baixa'}">Bug · ${SEV_ROT[i.sev]||''}</span>` : '<span class="tag mel">Melhoria</span>'}
          <span class="tag baixa">${escHtml(i.area)}</span>${i.modoTeste?'<span>· em modo teste</span>':''}</div>
        <p>${escHtml(i.texto)}</p>
        <div class="bl-meta"><span>Valor <b class="num">${numero(i.valor)}</b>/5</span><span>· ${ESF_ROT[i.esforco]||''}</span><span>· tela ${escHtml(i.tela)}</span><span>· ${escHtml(i.disp)}</span><span>· ${quandoTs(i.criadoEm)}</span><span>· ${escHtml(i.nome||'')} &lt;${escHtml(i.email||'')}&gt;</span></div>
      </div></article>`; };
  return `<div class="backlog" style="padding:0" data-sem-print>
    <h2 style="margin:0 0 6px">Backlog priorizado</h2>
    <div class="sub">Tudo o que os testadores reportam, já classificado e na ordem sugerida: primeiro o que mais atrapalha a jornada e dá menos trabalho.</div>
    <div class="quads">${Object.keys(QUAD).map(q=>`<div class="quad q-${q}"><b>${QUAD[q].n}</b><span>${QUAD[q].d}</span><span class="num">${cont(q)}</span></div>`).join('')}</div>
    <div class="bl-filtro" role="group" aria-label="Filtrar">${[['todos','Tudo'],['bug','Bugs'],['melhoria','Melhorias']].map(([k,n])=>`<button class="chip ${ADM.filtro===k?'on':''}" onclick="ADM.filtro='${k}';render(true)">${n}</button>`).join('')}</div>
    <section class="bl-sec">${vis.map((i,k)=>card(i,k+1)).join('') || '<p class="vazio">Nada reportado ainda.</p>'}</section>
  </div>`;
}
function admUsuarios(){
  const us = ADM.usuarios || [];
  return `<h2 style="margin:0 0 6px">Usuários</h2>
    <p class="dim" style="font-size:14px;margin:0 0 14px">${us.length} ${us.length===1?'conta':'contas'} com cadastro na v1. Dados mostrados conforme o aviso de privacidade aceito no cadastro.</p>
    <div class="adm-tabela" data-sem-print><table>
      <thead><tr><th>Nome</th><th>E-mail</th><th>Cadastro</th><th>Último acesso</th><th>Trilhas</th></tr></thead>
      <tbody>${us.map(u=>`<tr><td>${escHtml(u.nome||'—')}</td><td>${escHtml(u.email||'—')}</td><td>${quandoTs(u.criadoEm)}</td><td>${quandoTs(u.ultimoAcesso)}</td>
        <td>${u.trilhas.length ? u.trilhas.map(t=>`<div><b>${escHtml(t.nome||'—')}</b> · ${numero(t.pct)}% estudado · acerto ${escHtml(t.acerto)}${t.questoes?` (${numero(t.questoes)} questões)`:''}${t.ultimoEstudo?' · estudou em '+fmtData(dataDe(t.ultimoEstudo),{day:'2-digit',month:'2-digit'}):''}</div>`).join('') : '<span class="dim">nenhuma</span>'}</td></tr>`).join('') || '<tr><td colspan="5" class="dim">Ninguém ainda.</td></tr>'}</tbody>
    </table></div>`;
}

/* ------------------------- entrada: conta antes de tudo -------------------------
   Aluno novo cria a conta (aceitando o aviso de privacidade) e cai na
   configuração; quem já tem conta entra direto no plano de hoje; quem só
   quer conhecer usa o modo sem conta (nada é salvo). */
const G_LOGO = `<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;
const AVISO_PRIV = `<a href="privacidade.html" target="_blank" rel="noopener">aviso de privacidade</a>`;
function telaEntrada(){
  const sub = S.entrada || 'inicio';
  let cartao = '';
  if(sub==='inicio'){
    cartao = `<h2>Comece sua jornada</h2>
      <p class="dim" style="font-size:14px;margin:4px 0 18px">Leva uns 3 minutos para deixar sua trilha pronta.</p>
      <div class="conta">
        <button class="btn sec btn-g" onclick="entrarGoogle()" ${S.ocupado?'disabled':''}>${G_LOGO} Continuar com Google</button>
        <button class="btn" onclick="S.entrada='cadastro';S.erroForm=null;render()">Criar conta com e-mail</button>
      </div>
      ${S.erroForm ? `<p class="erro-f" role="alert" style="margin-top:12px">${escHtml(S.erroForm)}</p>` : ''}
      <div class="sep">Já usa o SIPC?</div>
      <button class="btn sec" style="width:100%" onclick="S.entrada='login';S.erroForm=null;render()">Entrar na minha conta</button>
      <button class="btn link" style="width:100%;margin-top:6px" onclick="usarSemConta()">Só quero conhecer, sem conta</button>
      <p class="legal">Ao continuar com o Google você aceita o ${AVISO_PRIV}.</p>`;
  }
  if(sub==='cadastro'){
    cartao = `<button class="voltar" onclick="S.entrada='inicio';S.erroForm=null;render()">${ico('back')} Voltar</button>
      <h2>Criar conta</h2>
      <p class="dim" style="font-size:14px;margin:4px 0 18px">Seu progresso fica salvo e você continua de onde parou, no celular ou no computador.</p>
      <form onsubmit="event.preventDefault();cadastrar()" novalidate>
        <div class="campo-f"><label class="f" for="cNome">Como quer ser chamado</label><input type="text" id="cNome" autocomplete="given-name" value="${escHtml(S.form.nome)}" oninput="S.form.nome=this.value"></div>
        <div class="campo-f"><label class="f" for="cEmail">E-mail</label><input type="email" id="cEmail" autocomplete="email" inputmode="email" value="${escHtml(S.form.email)}" oninput="S.form.email=this.value"></div>
        <div class="campo-f"><label class="f" for="cSenha">Senha</label>
          <div class="senha"><input type="${S.verSenha?'text':'password'}" id="cSenha" autocomplete="new-password" value="${escHtml(S.form.senha)}" oninput="S.form.senha=this.value;render(true)">
          <button type="button" class="mini" onclick="S.verSenha=!S.verSenha;render(true)">${S.verSenha?'ocultar':'mostrar'}</button></div>
          <p class="dica ${S.form.senha.length>=8?'ok':''}">${S.form.senha.length>=8?ico('check'):''} Pelo menos 8 caracteres</p></div>
        <label class="aceite"><input type="checkbox" id="cAceite" ${S.aceite?'checked':''} onchange="S.aceite=this.checked"> <span>Li e aceito o ${AVISO_PRIV}.</span></label>
        ${S.erroForm ? `<p class="erro-f" role="alert">${escHtml(S.erroForm)}</p>` : ''}
        <button class="btn" style="width:100%" type="submit" ${S.ocupado?'disabled':''}>${S.ocupado?'Criando…':'Criar conta e começar'}</button>
      </form>`;
  }
  if(sub==='login'){
    cartao = `<button class="voltar" onclick="S.entrada='inicio';S.erroForm=null;render()">${ico('back')} Voltar</button>
      <h2>Entrar</h2>
      <p class="dim" style="font-size:14px;margin:4px 0 18px">Bom te ver de novo.</p>
      <button class="btn sec btn-g" style="width:100%" onclick="entrarGoogle()" ${S.ocupado?'disabled':''}>${G_LOGO} Entrar com Google</button>
      <div class="sep">ou com e-mail</div>
      <form onsubmit="event.preventDefault();entrar()" novalidate>
        <div class="campo-f"><label class="f" for="lEmail">E-mail</label><input type="email" id="lEmail" autocomplete="email" inputmode="email" value="${escHtml(S.form.email)}" oninput="S.form.email=this.value"></div>
        <div class="campo-f"><label class="f" for="lSenha">Senha</label><input type="password" id="lSenha" autocomplete="current-password" value="${escHtml(S.form.senha)}" oninput="S.form.senha=this.value"></div>
        ${S.erroForm ? `<p class="erro-f" role="alert">${escHtml(S.erroForm)}</p>` : ''}
        ${S.linkEnviado ? `<p class="ok-f" role="status">Se houver uma conta com ${escHtml(S.form.email)}, enviamos um link para criar uma nova senha.</p>` : ''}
        <button class="btn" style="width:100%" type="submit" ${S.ocupado?'disabled':''}>${S.ocupado?'Entrando…':'Entrar'}</button>
      </form>
      <button class="btn link" style="width:100%;margin-top:4px" onclick="esqueciSenha()">Esqueci minha senha</button>`;
  }
  return `<div class="entrada">
    <section class="entrada-texto">
      <span class="marca">SIPC</span>
      <h1>Seu edital vira um plano de estudo para cada dia.</h1>
      <p class="lead">Mande o edital e diga quanto tempo você tem. O SIPC decide o que estudar hoje, gera questões no estilo da sua banca e traz de volta o que você errou na hora certa de revisar.</p>
      <ol class="como">
        <li><b>Edital lido por IA.</b> PDF, planilha ou texto colado: matérias, pesos e assuntos separados para você conferir.</li>
        <li><b>Plano do dia pronto.</b> O que vale mais na prova recebe mais tempo. Faltou um dia? O plano se reorganiza, sem dívida.</li>
        <li><b>Questões e revisão.</b> Gabarito na hora, e cada tópico volta para revisão em 24 horas, 7 e 30 dias.</li>
      </ol>
      <p class="dim" style="font-size:13px">Versão de testes. Achou algo estranho? Use o botão Reportar.</p>
    </section>
    <section class="entrada-cartao" aria-live="polite">${cartao}</section>
  </div>`;
}
function telaAceite(){
  return `<div class="entrada"><section class="entrada-texto"><span class="marca">SIPC</span><h1>Falta um passo.</h1>
      <p class="lead">O SIPC está em fase de testes. Antes de começar, confira como seus dados são usados.</p></section>
    <section class="entrada-cartao"><h2>Aviso de privacidade</h2>
      <p class="dim" style="font-size:14px;margin:4px 0 14px">Guardamos seu nome, e-mail, trilhas, progresso e o que você reportar, para o app funcionar e melhorar. O responsável pela versão de testes pode ver esses dados. Você pode pedir a exclusão a qualquer momento.</p>
      <label class="aceite"><input type="checkbox" ${S.aceite?'checked':''} onchange="S.aceite=this.checked;render(true)"> <span>Li e aceito o ${AVISO_PRIV}.</span></label>
      ${S.erroForm ? `<p class="erro-f" role="alert">${escHtml(S.erroForm)}</p>` : ''}
      <button class="btn" style="width:100%" ${S.aceite && !S.ocupado?'':'disabled'} onclick="aceitarPrivacidade()">Aceitar e continuar</button>
      <button class="btn link" style="width:100%;margin-top:6px" onclick="sairConta()">Sair</button>
    </section></div>`;
}
function telaCarregando(){ return `<div class="tela-cheia"><span class="marca">SIPC</span><p class="dim">Carregando…</p></div>`; }
function telaErro(){ return `<div class="tela-cheia"><span class="marca">SIPC</span><div class="erro" style="max-width:520px"><b>Não consegui abrir seus dados.</b><br>${escHtml(S.erroGeral||'')}</div><div class="fim-estudo"><button class="btn" onclick="location.reload()">Tentar de novo</button><button class="btn sec" onclick="sairConta()">Sair</button></div></div>`; }

const emailValido = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
function erroForm(msg, campo){ S.erroForm = msg; S.linkEnviado = false; S.ocupado = false; render(true); const el = campo && document.getElementById(campo); if(el) el.focus(); }
const CONSENTIMENTO = () => ({versao:'2026-10-19', em:new Date().toISOString()});
async function cadastrar(){
  if(carregando()) return;
  const f = S.form;
  if(!f.nome.trim()) return erroForm('Diga como quer ser chamado.', 'cNome');
  if(!emailValido(f.email)) return erroForm('Esse e-mail não parece completo. Confira se tem @ e o domínio, como nome@gmail.com.', 'cEmail');
  if(f.senha.length < 8) return erroForm('A senha precisa de pelo menos 8 caracteres.', 'cSenha');
  if(!S.aceite) return erroForm('Para criar a conta, marque que leu e aceita o aviso de privacidade.', 'cAceite');
  S.ocupado = true; S.erroForm = null; S.cadastrando = true; render(true);
  try{
    const u = await SIPC.cadastrar({nome:f.nome.trim(), email:f.email.trim(), senha:f.senha});
    await SIPC.store.salvarPerfil(u.uid, {nome:f.nome.trim(), email:u.email, criadoEm:new Date().toISOString(), consentimento:CONSENTIMENTO()});
    S.cadastrando = false; S.form.senha = '';
    await aoMudarLogin(u);
  }catch(e){
    S.cadastrando = false;
    // A conta pode ter sido criada antes da falha (perfil não gravou): segue o login,
    // que leva ao aceite se faltar o consentimento, em vez de "e-mail já em uso" na próxima tentativa.
    if(SIPC.auth.currentUser){ S.ocupado = false; return aoMudarLogin(SIPC.auth.currentUser); }
    erroForm(SIPC.traduzir(e));
  }
}
async function entrar(){
  if(carregando()) return;
  const f = S.form;
  if(!emailValido(f.email)) return erroForm('Digite o e-mail da sua conta.', 'lEmail');
  if(!f.senha) return erroForm('Digite sua senha.', 'lSenha');
  S.ocupado = true; S.erroForm = null; render(true);
  try{ await SIPC.entrarEmail(f.email.trim(), f.senha); S.form.senha = ''; }   // onAuthStateChanged segue o fluxo
  catch(e){ erroForm(SIPC.traduzir(e)); }
}
async function entrarGoogle(){
  if(carregando()) return;
  S.ocupado = true; S.erroForm = null; render(true);
  try{ await SIPC.entrarGoogle(); }
  catch(e){ erroForm(SIPC.traduzir(e)); }
}
async function esqueciSenha(){
  if(!emailValido(S.form.email)) return erroForm('Digite seu e-mail acima e toque de novo em "Esqueci minha senha".', 'lEmail');
  try{ await SIPC.esqueciSenha(S.form.email.trim()); }catch(e){} // não diz se a conta existe
  S.erroForm = null; S.linkEnviado = true; render(true);
}
async function aceitarPrivacidade(){
  S.ocupado = true; render(true);
  try{
    await SIPC.store.salvarPerfil(S.usuario.uid, {nome:S.usuario.nome, email:S.usuario.email, criadoEm:new Date().toISOString(), consentimento:CONSENTIMENTO()});
    S.ocupado = false; await aoMudarLogin(SIPC.auth.currentUser);
  }catch(e){ erroForm('Não consegui salvar o aceite: ' + SIPC.traduzir(e)); }
}
// A tela de entrada aparece antes de o Firebase terminar de carregar.
function carregando(){ if(window.SIPC) return false; avisar('Só um instante: ainda carregando o SIPC.'); return true; }
function usarSemConta(){
  if(carregando()) return;
  S.visitante = true; S.modoTeste = true; SIPC.store.setModoTeste(true);
  novaTrilha();
}
function irEntrada(){ S.tela = 'entrada'; S.entrada = 'inicio'; S.erroForm = null; window.scrollTo(0,0); render(); }
async function sairConta(){
  guardarProgresso(); await SIPC.store.salvarAgora();
  SIPC.store.setModoTeste(false);
  if(S.usuario || SIPC.auth.currentUser) await SIPC.sair();
  marcarLogado(false);
  S = estadoInicial(); S.tela = 'entrada'; render();
}

// Chamado pelo js/main.js a cada mudança de login (e logo ao abrir a página).
window.aoMudarLogin = async function(u){
  if(S.cadastrando) return; // o cadastro grava o perfil e chama de volta
  if(!u){
    marcarLogado(false);
    if(S.visitante) return;
    if(S.usuario){ S = estadoInicial(); }
    S.tela = 'entrada'; render(); return;
  }
  marcarLogado(true);
  if(S.visitante){
    // O que a pessoa montou sem conta vai junto para a conta nova.
    if(S.trilhaAtual && S.estadoOk) S._migrar = {T: dadosDaTrilha(), E: JSON.parse(JSON.stringify(S.E))};
    else if(S.tela === 'assist' && S.materias.length) S._migrar = {setup: JSON.parse(JSON.stringify({passo:S.passo, edStatus:S.edStatus, materias:S.materias, prova:S.prova, bancas:S.bancas, horas:S.horas, dias:S.dias, dataProva:S.dataProva, qtdQuestoes:S.qtdQuestoes, formatoQuestoes:S.formatoQuestoes}))};
    S.visitante = false; S.modoTeste = false; SIPC.store.setModoTeste(false);
    S.trilhaAtual = null; S.estadoOk = false;
  }
  if(S.usuario && S.usuario.uid === u.uid && S.tela !== 'carregando' && S.tela !== 'aceite' && S.tela !== 'entrada') return;
  S.usuario = {uid:u.uid, nome: u.displayName || (u.email||'').split('@')[0], email:u.email || '',
               via: (u.providerData||[]).some(p=>p.providerId==='google.com') ? 'Google' : 'e-mail'};
  S.tela = 'carregando'; S.ocupado = false; render();
  try{
    S.perfil = await SIPC.store.carregarPerfil(u.uid);
    if(!S.perfil || !S.perfil.consentimento){ S.aceite = false; S.tela = 'aceite'; render(); return; }
    if(S.perfil.nome) S.usuario.nome = S.perfil.nome;
    SIPC.store.salvarPerfil(u.uid, {email:S.usuario.email}).catch(()=>{}); // atualiza o último acesso
    S.trilhas = await SIPC.store.listarTrilhas(u.uid);
    if(S._migrar){
      const m = S._migrar; S._migrar = null;
      if(m.T){
        const id = await SIPC.store.criarTrilha(u.uid, m.T);
        SIPC.store.salvarEstado(u.uid, id, m.E); await SIPC.store.salvarAgora();
        S.trilhas = await SIPC.store.listarTrilhas(u.uid);
        await abrirTrilha(id); avisar('A trilha que você montou sem conta agora está salva na sua conta.'); return;
      }
      novaTrilha(); Object.assign(S, m.setup); render(); avisar('Seguimos de onde você parou na configuração.'); return;
    }
    if(!S.trilhas.length) return novaTrilha();
    let ultima = null; try{ ultima = localStorage.getItem('sipc::ultima-trilha::'+u.uid); }catch(e){}
    const t = S.trilhas.find(x=>x.id===ultima) || S.trilhas.slice().sort((a,b)=>String(b.atualizadaEm||'').localeCompare(String(a.atualizadaEm||'')))[0];
    await abrirTrilha(t.id);
  }catch(e){
    S.erroGeral = SIPC.traduzir(e) + (/permission|insufficient/i.test(String(e && e.message)) ? ' (as Regras do Firestore ainda não liberam este acesso)' : '');
    S.tela = 'erro'; render();
  }
};

function marcarLogado(sim){ try{ if(sim) localStorage.setItem('sipc::logado','1'); else localStorage.removeItem('sipc::logado'); }catch(e){} }

/* Botão Voltar do navegador (e do Android): cada tela entra no histórico, e
   voltar navega dentro do app em vez de sair dele. */
const chaveNav = () => S.tela + '/' + (S.tela==='app' ? (S.vista || S.aba) : S.tela==='assist' ? S.passo : S.tela==='entrada' ? S.entrada : '');
function sincronizarHistorico(){
  if(['carregando','erro'].includes(S.tela)) return;
  const k = chaveNav(), atual = history.state && history.state.sipc;
  if(!atual) history.replaceState({sipc:k}, '');
  else if(atual !== k) history.pushState({sipc:k}, '');
}
addEventListener('popstate', () => {
  if(REP){ fecharReporte(); return; }
  if(S.tela==='app' && S.vista) return sair();
  if(S.tela==='app' && S.aba!=='hoje'){ S.aba='hoje'; return render(); }
  if(S.tela==='trilhas' && S.trilhaAtual) return voltarTrilhaAberta();
  if(S.tela==='assist' && S.passo>1) return irPasso(S.passo-1);
  if(S.tela==='entrada' && S.entrada!=='inicio'){ S.entrada='inicio'; S.erroForm=null; return render(); }
  // Na tela inicial de cada fluxo, o próximo Voltar sai do app normalmente.
});

/* render(true) mantém a tela sem reanimar a entrada: só a troca de tela anima */
function render(semAnimar){
  const app = document.getElementById('app');
  const foco = document.activeElement && document.activeElement.id;
  const pos = foco && document.activeElement.selectionStart;
  document.body.classList.toggle('teste', !!S.modoTeste);
  const faixa = S.modoTeste && !S.visitante && ['app','trilhas','assist'].includes(S.tela)
    ? `<div class="mt-faixa" role="status"><b>Modo teste ligado</b>: nada do que você fizer agora é salvo na sua conta. <button onclick="alternarModoTeste()">Desligar</button></div>` : '';
  const telas = {carregando:telaCarregando, erro:telaErro, entrada:telaEntrada, aceite:telaAceite, trilhas:telaTrilhas, assist:telaAssist, app:telaApp};
  let html;
  try{ html = faixa + (telas[S.tela] || telaCarregando)(); }
  catch(e){
    // Um dado inesperado (resposta da IA, documento antigo) não pode congelar a tela.
    console.error(e);
    html = `<div class="tela-cheia"><span class="marca">SIPC</span><div class="erro" style="max-width:520px"><b>Algo deu errado ao mostrar esta tela.</b><br>${escHtml(e && e.message || e)}</div>
      <div class="fim-estudo"><button class="btn" onclick="sairDoErro()">Voltar ao plano de hoje</button><button class="btn sec" onclick="abrirReporte()">Reportar</button></div></div>`;
  }
  app.innerHTML = html;
  document.body.dataset.tela = S.tela;
  document.querySelector('.reportar').hidden = ['carregando','erro'].includes(S.tela);
  if(semAnimar) app.querySelectorAll('.tela').forEach(el=>el.style.animation='none');
  if(foco){ const el = document.getElementById(foco); if(el){ el.focus(); if(pos!=null && el.setSelectionRange) try{ el.setSelectionRange(pos,pos); }catch(e){} } }
  sincronizarHistorico();
}
function sairDoErro(){ if(S.estudo) delete CONTEUDO[chaveConteudo(S.estudo)]; S.vista = null; S.estudo = null; S.quiz = null; if(S.tela==='app') S.aba = 'hoje'; render(); }
addEventListener('unhandledrejection', e => { console.error(e.reason); avisar('Algo não saiu como esperado: ' + ((e.reason && e.reason.message) || e.reason) + '. Se repetir, use o Reportar.'); });
document.addEventListener('keydown', e=>{
  if((e.key==='Enter'||e.key===' ') && e.target.matches('[role=button]')){ e.preventDefault(); e.target.click(); }
});
S = estadoInicial();
// Sem login neste aparelho, a entrada aparece na hora; com login, espera o Firebase confirmar.
try{ if(!localStorage.getItem('sipc::logado')) S.tela = 'entrada'; }catch(e){}
render();
