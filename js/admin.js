/* ------------------------- área do administrador -------------------------
   Só para o e-mail do Victor (as Regras do Firestore garantem do lado do
   servidor; esconder a aba é só conveniência). Visão geral do uso, lista
   de alunos com a ficha de cada um (trilhas, tempo, sessões e linha do
   tempo do que fez) e o backlog priorizado do Reportar.
   Script comum, carregado depois do app.js. Os dados de uso vêm de
   js/atividade.js (users/{uid}/sessoes). */
let ADM = {aba:'geral', filtro:'todos', carregando:false, feedback:null, usuarios:null, erro:null, ficha:null, carregadoEm:null};

// Data local (AAAA-MM-DD) de um ISO ou Timestamp do Firestore.
const diaLocal = v => { try{ const d = v && v.toDate ? v.toDate() : new Date(v); return isNaN(d) ? null : d.toLocaleDateString('sv-SE'); }catch(e){ return null; } };
const quandoTs = ts => { try{ const d = ts && ts.toDate ? ts.toDate() : ts ? new Date(ts) : null; return d && !isNaN(d) ? d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(',','') : '—'; }catch(e){ return '—'; } };
// Só aceita a imagem que o próprio app gera; qualquer outra coisa vira "sem print".
const printValido = p => typeof p === 'string' && p.length < 760000 && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(p) ? p : null;
const numero = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const duracao = seg => { seg = Math.round(numero(seg)); if(seg < 60) return seg ? seg + ' s' : '0 min'; const m = Math.round(seg/60); return m < 60 ? m + ' min' : Math.floor(m/60) + 'h' + pad(m%60); };
const pctDe = (a, b) => b ? Math.round(a / b * 100) : 0;

async function carregarAdmin(forcar){
  if(!ehAdmin() || ADM.carregando || (ADM.feedback && !forcar)) return;
  ADM.carregando = true; ADM.erro = null; render(true);
  try{
    const [fb, us] = await Promise.all([SIPC.store.listarFeedback(), SIPC.store.listarUsuarios()]);
    ADM.feedback = fb;
    await Promise.all(us.map(async u => {
      u.trilhas = []; u.sessoes = [];
      const [ts, ss] = await Promise.all([
        SIPC.store.listarTrilhasDe(u.uid).catch(() => { u.erroTrilhas = true; return []; }),
        SIPC.store.listarSessoesDe(u.uid).catch(() => []),
      ]);
      u.sessoes = ss;
      u.trilhas = await Promise.all(ts.map(async t => {
        const e = (await SIPC.store.estadoDe(u.uid, t.id).catch(() => null)) || estadoVazio();
        const top = (t.materias||[]).reduce((a,m)=>a+((m.topicos||[]).length),0), ac = acertoGeral(e.questoes||[]);
        const diasEstudo = Object.keys(e.minutos||{}).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d));
        const revisoesFeitas = (e.revisoes||[]).reduce((a,r)=>a+((r.historico||[]).filter(h=>h.resultado!=='reaberto').length),0);
        return {nome: t.prova && t.prova.nome, banca: (t.bancas||[]).join(' ou '), criadaEm: t.criadaDia || t.criadaEm, top, feitos: Object.keys(e.feito||{}).length,
                pct: pctDe(Object.keys(e.feito||{}).length, top), acertos: ac.acertos, questoes: ac.total, acerto: ac.total ? ac.pct + '%' : '—',
                minutosEstudo: Object.values(e.minutos||{}).reduce((a,v)=>a+numero(v),0), minutosPorDia: e.minutos||{}, revisoesFeitas,
                diasEstudo, ultimoEstudo: diasEstudo.sort().slice(-1)[0] || null};
      }));
      // Derivados usados na visão geral, na tabela e na ficha.
      u.tempoSeg = u.sessoes.reduce((a,s)=>a+numero(s.ativoSeg),0);
      const dias = new Set([...u.sessoes.map(s=>diaLocal(s.inicio)), ...u.trilhas.flatMap(t=>t.diasEstudo)].filter(Boolean));
      u.diasAtivos = [...dias].sort();
      u.ultimaAtividade = [...u.sessoes.map(s=>s.fim||s.inicio), u.ultimoAcesso].filter(Boolean).sort().slice(-1)[0] || null;
      u.feitos = u.trilhas.reduce((a,t)=>a+t.feitos,0); u.questoes = u.trilhas.reduce((a,t)=>a+t.questoes,0);
      u.acertos = u.trilhas.reduce((a,t)=>a+t.acertos,0); u.revisoes = u.trilhas.reduce((a,t)=>a+t.revisoesFeitas,0);
      u.minutosEstudo = u.trilhas.reduce((a,t)=>a+t.minutosEstudo,0);
    }));
    ADM.usuarios = us.sort((a,b)=>String(b.ultimaAtividade||'').localeCompare(String(a.ultimaAtividade||'')));
    ADM.carregadoEm = new Date();
  }catch(e){ ADM.erro = SIPC.traduzir(e); }
  ADM.carregando = false; render(true);
}

function abaAdmin(){
  if(!ehAdmin()) return '<p class="vazio">Área restrita.</p>';
  const topo = `<div class="bl-filtro adm-topo" role="group" aria-label="Área do administrador">${[['geral','Visão geral'],['usuarios','Alunos'],['backlog','Reportes'],['dev','Desenvolvimento']].map(([k,n])=>`<button class="chip ${ADM.aba===k && !ADM.ficha?'on':''}" onclick="ADM.aba='${k}';ADM.ficha=null;${k==='dev'?'carregarDev();':''}render(true)">${n}</button>`).join('')}
    ${ADM.aba==='dev' ? '' : `<button class="chip" onclick="carregarAdmin(true)">${ADM.carregando?'Atualizando…':'Atualizar'}</button>
    ${ADM.carregadoEm ? `<span class="dim" style="font-size:12px">dados de ${ADM.carregadoEm.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>` : ''}`}</div>`;
  // A aba Desenvolvimento não depende dos dados dos alunos.
  if(ADM.aba==='dev' && !ADM.ficha) return `<div data-sem-print>${topo}${admDev()}</div>`;
  if(ADM.erro) return topo + `<div class="erro"><b>Não consegui ler os dados.</b><br>${escHtml(ADM.erro)}<br>Confira se as Regras do Firestore foram publicadas e se você entrou com ${escHtml(SIPC.ADMIN_EMAIL)}.</div>`;
  if(!ADM.feedback) return topo + `<div class="carregando">${ico('spark')}<p><b>Carregando os dados dos alunos…</b></p></div>`;
  const corpo = ADM.ficha ? admFicha(ADM.ficha) : ADM.aba==='usuarios' ? admUsuarios() : ADM.aba==='backlog' ? admBacklog() : admGeral();
  return `<div data-sem-print>${topo}${corpo}</div>`;
}

/* ---------- gráficos simples (uma série, cor de destaque, dica no hover) ---------- */
// Barras verticais por dia. pontos: [{rot, valor, dica}]
function barrasDias(pontos, rotuloEixo){
  const max = Math.max(1, ...pontos.map(p=>p.valor));
  return `<div class="adm-barras" role="img" aria-label="${escHtml(rotuloEixo)}">
    ${pontos.map(p=>`<div class="adm-col" tabindex="0" data-tip="${escHtml(p.dica)}"><span class="adm-barra" style="height:${p.valor ? Math.max(3, p.valor/max*100) : 0}%"></span><small>${escHtml(p.rot)}</small></div>`).join('')}
  </div><p class="dim adm-eixo">${escHtml(rotuloEixo)} · máximo ${max}</p>`;
}
// Barras horizontais com rótulo e valor. linhas: [{rot, valor, texto, dica}]
function barrasLinhas(linhas){
  const max = Math.max(1, ...linhas.map(l=>l.valor));
  return `<div class="adm-linhas">${linhas.map(l=>`<div class="adm-linha" tabindex="0" data-tip="${escHtml(l.dica || l.rot)}">
      <span class="adm-rot">${escHtml(l.rot)}</span><span class="adm-trilho"><i style="width:${l.valor ? Math.max(1.5, l.valor/max*100) : 0}%"></i></span><b class="num">${escHtml(l.texto)}</b></div>`).join('')}</div>`;
}
const ultimosDias = n => Array.from({length:n}, (_,i) => somar(hojeISO(), i-n+1));

/* ---------- visão geral ---------- */
function admGeral(){
  const us = ADM.usuarios || [], hoje = hojeISO(), d7 = somar(hoje,-6), d30 = somar(hoje,-29);
  const ativosDesde = d => us.filter(u => u.diasAtivos.some(x => x >= d)).length;
  const ativos7 = us.filter(u => u.diasAtivos.some(x => x >= d7));
  const tempoTotal = us.reduce((a,u)=>a+u.tempoSeg,0), tempo7 = ativos7.reduce((a,u)=>a+u.sessoes.filter(s=>diaLocal(s.inicio)>=d7).reduce((b,s)=>b+numero(s.ativoSeg),0),0);
  const novos7 = us.filter(u => (diaLocal(u.criadoEm)||'') >= d7).length;
  const questoes = us.reduce((a,u)=>a+u.questoes,0), acertos = us.reduce((a,u)=>a+u.acertos,0);
  const reportes = ADM.feedback || [], bugs = reportes.filter(r=>r.tipo==='bug').length;
  const tile = (rot, val, sub) => `<div class="kpi"><span class="k-rot">${rot}</span><span class="k-val">${val}</span><span class="k-delta">${sub}</span></div>`;
  // Funil: cada etapa conta quem chegou até ela.
  const funil = [
    ['Criaram conta', us.length],
    ['Criaram uma trilha', us.filter(u=>u.trilhas.length).length],
    ['Estudaram 1 tópico', us.filter(u=>u.feitos>0).length],
    ['Fizeram 1 revisão', us.filter(u=>u.revisoes>0).length],
    ['Voltaram em outro dia', us.filter(u=>u.diasAtivos.length>=2).length],
  ];
  const dias = ultimosDias(14);
  const atividade = dias.map(d => {
    const n = us.filter(u=>u.diasAtivos.includes(d)).length;
    const min = Math.round(us.reduce((a,u)=>a+u.sessoes.filter(s=>diaLocal(s.inicio)===d).reduce((b,s)=>b+numero(s.ativoSeg),0),0)/60);
    return {rot: d.slice(8), valor: n, dica: `${fmtData(dataDe(d),{weekday:'short',day:'2-digit',month:'2-digit'})}: ${n} ${n===1?'aluno ativo':'alunos ativos'} · ${min} min no app`};
  });
  const telas = {};
  us.forEach(u => u.sessoes.forEach(s => Object.entries(s.telas||{}).forEach(([t,seg]) => { const k = String(t).split(' · ')[0]; telas[k] = (telas[k]||0) + numero(seg); })));
  const topTelas = Object.entries(telas).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const recentes = us.flatMap(u => u.sessoes.flatMap(s => (s.eventos||[]).filter(e=>e.tipo!=='tela').map(e => ({...e, u}))))
    .sort((a,b)=>String(b.t).localeCompare(String(a.t))).slice(0, 15);
  return `<section class="kpis adm-kpis" aria-label="Indicadores">
      ${tile('Contas', us.length, novos7 ? `${novos7} nova${novos7>1?'s':''} nos últimos 7 dias` : 'nenhuma nova em 7 dias')}
      ${tile('Ativos', `${ativosDesde(hoje)} <small>hoje</small>`, `${ativos7.length} em 7 dias · ${ativosDesde(d30)} em 30 dias`)}
      ${tile('Tempo no app', duracao(tempoTotal), ativos7.length ? `${duracao(tempo7/ativos7.length)} por aluno ativo na semana` : 'sem uso na semana')}
      ${tile('Estudo', `${us.reduce((a,u)=>a+u.feitos,0)} <small>tópicos</small>`, `${us.reduce((a,u)=>a+u.revisoes,0)} revisões · ${duracao(us.reduce((a,u)=>a+u.minutosEstudo,0)*60)} estimados`)}
      ${tile('Questões', questoes, questoes ? `${pctDe(acertos,questoes)}% de acerto` : 'nenhuma respondida')}
      ${tile('Reportes', reportes.length, `${bugs} bug${bugs===1?'':'s'} · ${reportes.length-bugs} ideia${reportes.length-bugs===1?'':'s'}`)}
    </section>
    <div class="adm-grade">
      <section class="bloco"><h3>Funil da jornada</h3><p class="dim adm-sub">Quantos alunos chegaram a cada etapa (% sobre quem criou conta).</p>
        ${barrasLinhas(funil.map(([rot,n])=>({rot, valor:n, texto:`${n} · ${pctDe(n, us.length)}%`, dica:`${rot}: ${n} de ${us.length}`})))}</section>
      <section class="bloco"><h3>Alunos ativos por dia</h3><p class="dim adm-sub">Últimos 14 dias. Passe o mouse para ver o tempo no app.</p>${barrasDias(atividade, 'alunos ativos por dia')}</section>
      <section class="bloco"><h3>Onde passam mais tempo</h3><p class="dim adm-sub">Tempo ativo somado por tela.</p>
        ${topTelas.length ? barrasLinhas(topTelas.map(([t,seg])=>({rot:t, valor:seg, texto:duracao(seg)}))) : '<p class="dim">Ainda sem sessões registradas: os dados aparecem conforme os alunos usam o app.</p>'}</section>
      <section class="bloco"><h3>Últimas ações</h3>
        ${recentes.length ? `<ul class="adm-feed">${recentes.map(e=>`<li><span class="dim num">${quandoTs(e.t)}</span><span><b>${escHtml(e.u.nome||e.u.email||'Aluno')}</b> ${escHtml(rotuloEvento(e))}</span></li>`).join('')}</ul>` : '<p class="dim">Nenhuma ação registrada ainda.</p>'}</section>
      ${blocoFalhasIA(us, d7)}
      <section class="bloco"><h3>Vídeos guardados</h3><p class="dim adm-sub">As regras do YouTube permitem guardar os dados dos vídeos por até 30 dias. O app já refaz a busca depois disso; aqui você apaga os registros vencidos. Faça isso uma vez por mês.</p>
        <button class="btn sec" onclick="limparVideosVencidos()" ${ADM.limpandoVideos?'disabled':''}>${ADM.limpandoVideos?'Apagando…':'Apagar vídeos com mais de 30 dias'}</button></section>
    </div>`;
}
// Falhas da IA nos últimos 7 dias, separando o bloqueio do App Check (o navegador
// não passou no reCAPTCHA e a IA não responde mais naquela página) dos outros erros.
function blocoFalhasIA(us, desde){
  const conta = tipo => {
    const quem = us.filter(u => u.sessoes.some(s => (s.eventos||[]).some(e => e.tipo===tipo && diaLocal(e.t) >= desde)));
    const n = us.reduce((a,u)=>a+u.sessoes.reduce((b,s)=>b+(s.eventos||[]).filter(e=>e.tipo===tipo && diaLocal(e.t) >= desde).length,0),0);
    return {quem, n};
  };
  const b = conta('ia-bloqueada'), o = conta('ia-erro');
  const nomes = l => l.slice(0,6).map(u=>escHtml(u.nome||u.email||'Aluno')).join(', ') + (l.length>6 ? ` e mais ${l.length-6}` : '');
  return `<section class="bloco"><h3>Falhas da IA</h3><p class="dim adm-sub">Últimos 7 dias. Bloqueio do App Check: o navegador não passou na verificação do reCAPTCHA e a IA parou de responder para o aluno. Se for frequente, reveja o limite de risco do reCAPTCHA no App Check e a cota do reCAPTCHA Enterprise.</p>
    <ul class="ev-lista">
      <li><span>Bloqueio do App Check</span><b class="num">${b.n} ${b.n===1?'vez':'vezes'} · ${b.quem.length} ${b.quem.length===1?'aluno':'alunos'}</b></li>
      ${b.quem.length ? `<li><span class="dim">${nomes(b.quem)}</span></li>` : ''}
      <li><span>Outros erros (cota, rede, resposta)</span><b class="num">${o.n} ${o.n===1?'vez':'vezes'} · ${o.quem.length} ${o.quem.length===1?'aluno':'alunos'}</b></li>
    </ul></section>`;
}
async function limparVideosVencidos(){
  ADM.limpandoVideos = true; render(true);
  try{ const n = await SIPC.videos.limparVencidos(); avisar(n ? `${n} ${n===1?'registro de vídeo apagado':'registros de vídeo apagados'}.` : 'Nenhum vídeo vencido para apagar.'); }
  catch(e){ avisar('Não consegui apagar: ' + SIPC.traduzir(e)); }
  ADM.limpandoVideos = false; render(true);
}

const ROT_EVENTO = {login:'entrou', 'trilha-criada':'criou a trilha', 'trilha-aberta':'abriu a trilha', 'topico-aberto':'abriu o tópico', 'topico-concluido':'concluiu o tópico',
  revisao:'revisou', 'questoes-dia':'fez as questões do dia', 'edital-lido':'leu o edital', 'edital-erro':'teve erro ao ler o edital', reporte:'mandou um reporte',
  'modo-teste':'ligou o modo teste', tour:'viu o tour', sair:'saiu da conta', 'foco-sessao':'registrou foco', 'discursiva-corrigida':'corrigiu discursiva', 'logico-corrigido':'corrigiu raciocínio lógico', tela:'abriu', 'ia-erro':'teve erro da IA', 'ia-bloqueada':'teve a IA bloqueada pela verificação de segurança (App Check)'};
const rotuloEvento = e => (ROT_EVENTO[e.tipo] || e.tipo) + (e.d ? ': ' + e.d : '');

/* ---------- alunos ---------- */
function admUsuarios(){
  const us = ADM.usuarios || [];
  return `<div class="adm-cab"><div><h2>Alunos</h2><p class="dim adm-sub">${us.length} ${us.length===1?'conta':'contas'}, da atividade mais recente para a mais antiga. Toque num aluno para ver a ficha.</p></div>
      <button class="btn sec" onclick="baixarCsvAlunos()">Baixar planilha (CSV)</button></div>
    <div class="adm-tabela"><table>
      <thead><tr><th>Aluno</th><th>Cadastro</th><th>Última atividade</th><th>Tempo no app</th><th>Dias ativos</th><th>Trilhas e progresso</th><th>Acerto</th></tr></thead>
      <tbody>${us.map((u,i)=>`<tr class="adm-clicavel" tabindex="0" role="button" onclick="abrirFicha(${i})" onkeydown="if(event.key==='Enter')abrirFicha(${i})">
        <td><b>${escHtml(u.nome||'—')}</b><br><span class="dim">${escHtml(u.email||'')}</span></td><td>${quandoTs(u.criadoEm)}</td><td>${quandoTs(u.ultimaAtividade)}</td>
        <td>${duracao(u.tempoSeg)}<br><span class="dim">${u.sessoes.length} ${u.sessoes.length===1?'sessão':'sessões'}</span></td><td class="num">${u.diasAtivos.length}</td>
        <td>${u.trilhas.length ? u.trilhas.map(t=>`<div>${escHtml(t.nome||'—')} · ${numero(t.pct)}% (${numero(t.feitos)}/${numero(t.top)})</div>`).join('') : '<span class="dim">nenhuma</span>'}</td>
        <td>${u.questoes ? pctDe(u.acertos,u.questoes)+'%' : '—'}</td></tr>`).join('') || '<tr><td colspan="7" class="dim">Ninguém ainda.</td></tr>'}</tbody>
    </table></div>`;
}
function abrirFicha(i){ ADM.ficha = (ADM.usuarios||[])[i] || null; window.scrollTo(0,0); render(); }
// Planilha para análise fora do app (Excel/Sheets); ";" e BOM para abrir certo no Excel em português.
function baixarCsvAlunos(){
  const cols = ['nome','email','cadastro','ultima_atividade','tempo_min','sessoes','dias_ativos','trilhas','topicos_estudados','revisoes','questoes','acerto_pct','minutos_estudo'];
  const linha = u => [u.nome, u.email, diaLocal(u.criadoEm)||'', diaLocal(u.ultimaAtividade)||'', Math.round(u.tempoSeg/60), u.sessoes.length, u.diasAtivos.length,
    u.trilhas.map(t=>t.nome).join(' | '), u.feitos, u.revisoes, u.questoes, u.questoes ? pctDe(u.acertos,u.questoes) : '', u.minutosEstudo];
  const esc = v => { const s = String(v ?? ''); return /[";\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; };
  const csv = '﻿' + [cols, ...(ADM.usuarios||[]).map(linha)].map(l=>l.map(esc).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
  a.download = 'sipc-alunos-' + hojeISO() + '.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
}

/* ---------- ficha do aluno ---------- */
function admFicha(u){
  const tile = (rot, val, sub='') => `<div class="kpi"><span class="k-rot">${rot}</span><span class="k-val">${val}</span><span class="k-delta">${sub}</span></div>`;
  const dias = ultimosDias(14).map(d => {
    const seg = u.sessoes.filter(s=>diaLocal(s.inicio)===d).reduce((a,s)=>a+numero(s.ativoSeg),0);
    const est = u.trilhas.reduce((a,t)=>a+numero((t.minutosPorDia||{})[d]),0);
    return {rot: d.slice(8), valor: Math.round(seg/60), dica: `${fmtData(dataDe(d),{weekday:'short',day:'2-digit',month:'2-digit'})}: ${duracao(seg)} no app${est ? ' · ' + est + ' min de estudo marcados' : ''}`};
  });
  const telas = {};
  u.sessoes.forEach(s => Object.entries(s.telas||{}).forEach(([t,seg]) => { const k = String(t).split(' · ')[0]; telas[k] = (telas[k]||0) + numero(seg); }));
  const topTelas = Object.entries(telas).sort((a,b)=>b[1]-a[1]).slice(0,6);
  // Linha do tempo: troca de tela seguida vira uma linha só ("passou por A → B → C").
  const eventos = u.sessoes.flatMap(s => (s.eventos||[]).map(e => ({...e, disp:s.disp}))).sort((a,b)=>String(b.t).localeCompare(String(a.t)));
  const linhas = [];
  for(const e of eventos){
    const ant = linhas[linhas.length-1];
    if(e.tipo==='tela' && ant && ant.tipo==='tela' && diaLocal(ant.t)===diaLocal(e.t)){ ant.caminho.unshift(e.d); continue; }
    linhas.push(e.tipo==='tela' ? {...e, caminho:[e.d]} : e);
    if(linhas.length >= 120) break;
  }
  return `<button class="voltar" onclick="ADM.ficha=null;render()">${ico('back')} Todos os alunos</button>
    <div class="adm-cab"><div><h2>${escHtml(u.nome||'Aluno')}</h2><p class="dim adm-sub">${escHtml(u.email||'')} · cadastro em ${quandoTs(u.criadoEm)} · aceite do aviso de privacidade ${u.consentimento ? 'em ' + quandoTs(u.consentimento.em) : 'não registrado'}</p></div></div>
    <section class="kpis adm-kpis">
      ${tile('Tempo no app', duracao(u.tempoSeg), `${u.sessoes.length} ${u.sessoes.length===1?'sessão':'sessões'}`)}
      ${tile('Dias ativos', u.diasAtivos.length, u.ultimaAtividade ? 'último: ' + quandoTs(u.ultimaAtividade) : '')}
      ${tile('Tópicos estudados', u.feitos, `${u.revisoes} revisões feitas`)}
      ${tile('Questões', u.questoes, u.questoes ? pctDe(u.acertos,u.questoes) + '% de acerto' : 'nenhuma respondida')}
    </section>
    <div class="adm-grade">
      <section class="bloco"><h3>Tempo no app por dia</h3><p class="dim adm-sub">Minutos ativos, últimos 14 dias.</p>${barrasDias(dias, 'minutos ativos por dia')}</section>
      <section class="bloco"><h3>Trilhas</h3>${u.trilhas.length ? u.trilhas.map(t=>`<div class="adm-trilha"><b>${escHtml(t.nome||'—')}</b><span class="dim">${t.banca ? 'Banca ' + escHtml(t.banca) + ' · ' : ''}criada em ${quandoTs(t.criadaEm)}</span>
          <div class="meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${numero(t.pct)}" aria-label="Edital estudado"><i style="width:${Math.max(numero(t.pct),1)}%"></i></div>
          <span class="dim">${numero(t.feitos)} de ${numero(t.top)} tópicos (${numero(t.pct)}%) · ${numero(t.revisoesFeitas)} revisões · acerto ${escHtml(t.acerto)} · último estudo ${t.ultimoEstudo ? fmtData(dataDe(t.ultimoEstudo),{day:'2-digit',month:'2-digit'}) : '—'}</span></div>`).join('') : '<p class="dim">Ainda não criou trilha.</p>'}</section>
      <section class="bloco"><h3>Onde passa mais tempo</h3>${topTelas.length ? barrasLinhas(topTelas.map(([t,seg])=>({rot:t, valor:seg, texto:duracao(seg)}))) : '<p class="dim">Sem sessões registradas.</p>'}</section>
      <section class="bloco"><h3>Sessões</h3>${u.sessoes.length ? `<ul class="adm-feed">${u.sessoes.slice(0,20).map(s=>{
          const tops = Object.entries(s.telas||{}).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([t])=>String(t).split(' · ')[0]);
          return `<li><span class="dim num">${quandoTs(s.inicio)}</span><span><b>${duracao(s.ativoSeg)}</b> ativo · ${escHtml(s.disp||'')}${tops.length ? ' · ' + tops.map(escHtml).join(', ') : ''} · ${(s.eventos||[]).filter(e=>e.tipo!=='tela').length} ações</span></li>`; }).join('')}</ul>` : '<p class="dim">Sem sessões registradas ainda.</p>'}</section>
    </div>
    <section class="bloco"><h3>Linha do tempo</h3><p class="dim adm-sub">O que fez, do mais recente para o mais antigo.</p>
      ${linhas.length ? `<ol class="adm-tempo">${linhas.map(e=>`<li class="${e.tipo==='tela'?'nav':''}"><span class="dim num">${quandoTs(e.t)}</span><span>${e.tipo==='tela' ? 'Passou por ' + e.caminho.map(escHtml).join(' → ') : '<b>' + escHtml(rotuloEvento(e)) + '</b>' + (e.tela ? ' <span class="dim">em ' + escHtml(String(e.tela).split(' · ')[0]) + '</span>' : '')}</span></li>`).join('')}</ol>` : '<p class="dim">Nada registrado ainda. O registro começou nesta versão; o uso anterior aparece só nos números de estudo.</p>'}</section>`;
}

/* ---------- backlog do Reportar (v1.9) ----------
   Status: novo → triado → em andamento → resolvido, ou "não vamos fazer"
   (com motivo, que o aluno vê). Fechados saem da fila e dos quadrantes, mas
   ficam no filtro "Fechados". O Victor ajusta valor, esforço e área; o cálculo
   automático original fica guardado em `auto`. Excluir apaga de vez. */
const fechadoAdm = i => SIPC.reporte.fechado(i.status);
const ST_ADM = {novo:'Novo', triado:'Triado', andamento:'Em andamento', resolvido:'Resolvido', 'nao-vamos':'Não vamos fazer'};
async function salvarReporte(id, campos, msg){
  const i = ADM.feedback.find(x=>x.id===id); if(!i) return;
  try{
    await SIPC.store.atualizarFeedback(id, campos);
    Object.assign(i, campos);
    if('status' in campos) i.resolvidoEm = fechadoAdm(i) ? new Date().toISOString() : null;
    avisar(msg || 'Reporte atualizado.');
  }catch(e){ avisar('Não consegui atualizar: ' + SIPC.traduzir(e)); }
  render(true);
}
function mudarStatus(id, status){
  if(status === 'nao-vamos'){
    const motivo = prompt('Por que não vamos fazer? O aluno vê este motivo em Meus reportes (até 300 caracteres).');
    if(motivo == null || !motivo.trim()){ render(true); return; }
    return salvarReporte(id, {status, motivo: motivo.trim().slice(0,300)}, 'Marcado como "não vamos fazer".');
  }
  return salvarReporte(id, {status}, status==='resolvido' ? 'Marcado como resolvido. O aluno é avisado na próxima vez que entrar.' : 'Status: ' + ST_ADM[status] + '.');
}
const marcarReporte = (id, status) => mudarStatus(id, status); // compatibilidade
function responderReporte(id){
  const i = ADM.feedback.find(x=>x.id===id); if(!i) return;
  const r = prompt('Resposta para o aluno (aparece em Meus reportes, até 500 caracteres):', i.resposta || '');
  if(r == null) return;
  salvarReporte(id, {resposta: r.trim().slice(0,500)}, r.trim() ? 'Resposta salva.' : 'Resposta apagada.');
}
function ajustarReporte(id, campo, valor){
  const v = campo==='area' ? String(valor||'').trim().slice(0,60) : parseInt(valor, 10);
  if(campo==='area' && !v) return;
  salvarReporte(id, {[campo]: v}, 'Prioridade ajustada.');
}
function editarArea(id){
  const i = ADM.feedback.find(x=>x.id===id); if(!i) return;
  const a = prompt('Área do reporte:', i.area || ''); if(a != null) ajustarReporte(id, 'area', a);
}
async function excluirReporte(id){
  const i = ADM.feedback.find(x=>x.id===id); if(!i) return;
  if(!confirm('Excluir de vez o reporte "' + String(i.texto).slice(0,60) + '"? Não dá para desfazer.')) return;
  try{ await SIPC.store.excluirFeedback(id); ADM.feedback = ADM.feedback.filter(x=>x.id!==id); avisar('Reporte excluído.'); }
  catch(e){ avisar('Não consegui excluir: ' + SIPC.traduzir(e)); }
  render(true);
}
// Retenção: o print sai 90 dias depois de fechado; o texto fica.
const DIAS_PRINT = 90;
const printVencido = i => i.print && fechadoAdm(i) && i.resolvidoEm && SIPC.reporte.momento(i.resolvidoEm) < Date.now() - DIAS_PRINT*864e5;
async function apagarPrintsVencidos(){
  ADM.limpandoPrints = true; render(true);
  try{
    const ids = await SIPC.store.apagarPrintsAntigos(ADM.feedback, DIAS_PRINT);
    ADM.feedback.forEach(i => { if(ids.includes(i.id)) i.print = null; });
    avisar(ids.length ? `${ids.length} ${ids.length===1?'print apagado':'prints apagados'}.` : 'Nenhum print vencido.');
  }catch(e){ avisar('Não consegui apagar: ' + SIPC.traduzir(e)); }
  ADM.limpandoPrints = false; render(true);
}
function abrirFichaDe(uid){ const k = (ADM.usuarios||[]).findIndex(u=>u.uid===uid); if(k >= 0) abrirFicha(k); else avisar('Esse aluno não aparece na lista de contas.'); }
const horaCurta = t => { const d = new Date(t); return isNaN(d) ? '' : d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(',',''); };
function admBacklog(){
  const P = SIPC.prioridade, IMP = SIPC.reporte.IMPACTOS;
  const todos = P.ordenar(ADM.feedback), abertos = todos.filter(i=>!fechadoAdm(i));
  const vis = ADM.filtro==='resolvido' ? todos.filter(fechadoAdm) : abertos.filter(i=> ADM.filtro==='todos' || i.tipo===ADM.filtro);
  const cont = q => abertos.filter(i=>P.quadrante(i)===q).length;
  const vencidos = (ADM.feedback||[]).filter(printVencido).length;
  const opts = (n, atual) => Array.from({length:n}, (_,k)=>k+1).map(v=>`<option value="${v}" ${numero(atual)===v?'selected':''}>${v}</option>`).join('');
  const card = (i, pos) => { const q = P.quadrante(i), id = escHtml(i.id), st = i.status || 'novo';
    const ajustado = i.auto && (i.auto.valor !== i.valor || i.auto.esforco !== i.esforco || i.auto.area !== i.area);
    const rastro = Array.isArray(i.rastro) ? i.rastro : [], erros = Array.isArray(i.erros) ? i.erros : [];
    return `<article class="bl-item">
      ${printValido(i.print) ? `<img src="${printValido(i.print)}" alt="Print da tela ${escHtml(i.tela)}" title="Tocar para ampliar" tabindex="0" role="button" onclick="this.classList.toggle('ampliado')">` : '<div class="sem">sem print</div>'}
      <div>
        <div class="bl-meta"><span class="bl-pos num">${pos}</span><span class="tag q-${q}">${QUAD[q].n}</span>
          ${i.tipo==='bug' ? `<span class="tag ${SEV_ROT[i.sev] ? i.sev : 'baixa'}">Bug · ${escHtml(IMP[i.impacto] ? IMP[i.impacto].rot : (SEV_ROT[i.sev]||''))}</span>` : '<span class="tag mel">Melhoria</span>'}
          <span class="tag baixa">${escHtml(i.area)}</span><span class="tag st-${escHtml(st)}">${ST_ADM[st]||st}</span>${i.modoTeste?'<span>· em modo teste</span>':''}</div>
        <p>${escHtml(i.texto)}</p>
        ${i.resposta ? `<p class="rep-resp"><b>Sua resposta:</b> ${escHtml(i.resposta)}</p>` : ''}
        ${st==='nao-vamos' && i.motivo ? `<p class="rep-resp"><b>Motivo:</b> ${escHtml(i.motivo)}</p>` : ''}
        <div class="bl-acoes">
          <label class="bl-campo">Status <select onchange="mudarStatus('${id}', this.value)">${Object.entries(ST_ADM).map(([k,n])=>`<option value="${k}" ${st===k?'selected':''}>${n}</option>`).join('')}</select></label>
          <label class="bl-campo">Valor <select onchange="ajustarReporte('${id}','valor',this.value)">${opts(5, i.valor)}</select></label>
          <label class="bl-campo">Esforço <select onchange="ajustarReporte('${id}','esforco',this.value)">${opts(3, i.esforco)}</select></label>
          <button class="btn link" onclick="editarArea('${id}')">Área</button>
          <button class="btn link" onclick="responderReporte('${id}')">${i.resposta ? 'Editar resposta' : 'Responder ao aluno'}</button>
          <button class="btn link" onclick="abrirFichaDe('${escHtml(i.uid)}')">Ficha do aluno</button>
          <button class="btn link ruim-txt" onclick="excluirReporte('${id}')">Excluir</button></div>
        ${ajustado ? `<p class="dim" style="font-size:12px;margin:4px 0 0">Automático: valor ${numero(i.auto.valor)}, esforço ${numero(i.auto.esforco)}, área ${escHtml(i.auto.area)}</p>` : ''}
        ${rastro.length || erros.length ? `<details class="bl-rastro"><summary>Até o reporte: ${rastro.length} ${rastro.length===1?'ação':'ações'}${erros.length ? ` · <b class="ruim-txt">${erros.length} ${erros.length===1?'erro':'erros'}</b>` : ''}</summary>
          ${erros.length ? `<ol class="erros">${erros.map(e=>`<li><span class="dim num">${horaCurta(e.t)}</span> ${escHtml(e.msg)} <span class="dim">em ${escHtml(String(e.tela||'').split(' · ')[0])}</span></li>`).join('')}</ol>` : ''}
          <ol>${rastro.map(e=>`<li><span class="dim num">${horaCurta(e.t)}</span> ${e.tipo==='tela' ? 'abriu <b>' + escHtml(e.d) + '</b>' : escHtml(rotuloEvento(e))}</li>`).join('')}</ol></details>` : ''}
        <div class="bl-meta"><span>Valor <b class="num">${numero(i.valor)}</b>/5</span><span>· ${ESF_ROT[i.esforco]||''}</span><span>· tela ${escHtml(i.tela)}</span><span>· ${escHtml(i.disp)}</span>${i.versao ? `<span>· v${escHtml(i.versao)}</span>` : ''}<span>· ${quandoTs(i.criadoEm)}</span><span>· ${escHtml(i.nome||'')} &lt;${escHtml(i.email||'')}&gt;</span></div>
      </div></article>`; };
  return `<div class="backlog" style="padding:0">
    <h2 style="margin:0 0 6px">Reportes priorizados</h2>
    <div class="sub">Tudo o que os alunos reportam, já classificado e na ordem sugerida: primeiro o que mais atrapalha a jornada e dá menos trabalho. Ao fechar um reporte, o aluno é avisado na próxima vez que entrar.</div>
    <div class="quads">${Object.keys(QUAD).map(q=>`<div class="quad q-${q}"><b>${QUAD[q].n}</b><span>${QUAD[q].d}</span><span class="num">${cont(q)}</span></div>`).join('')}</div>
    <div class="bl-filtro" role="group" aria-label="Filtrar">${[['todos','Abertos'],['bug','Bugs'],['melhoria','Melhorias'],['resolvido','Fechados (' + todos.filter(fechadoAdm).length + ')']].map(([k,n])=>`<button class="chip ${ADM.filtro===k?'on':''}" onclick="ADM.filtro='${k}';render(true)">${n}</button>`).join('')}</div>
    ${vencidos ? `<p class="aviso" style="margin:0 0 12px">${vencidos} ${vencidos===1?'reporte fechado tem':'reportes fechados têm'} print há mais de ${DIAS_PRINT} dias. Pelo aviso de privacidade, o print sai depois desse prazo (o texto fica). <button class="btn sec" onclick="apagarPrintsVencidos()" ${ADM.limpandoPrints?'disabled':''}>${ADM.limpandoPrints?'Apagando…':'Apagar prints vencidos'}</button></p>` : ''}
    <section class="bl-sec">${vis.map((i,k)=>card(i,k+1)).join('') || `<p class="vazio">${ADM.filtro==='resolvido' ? 'Nenhum reporte fechado ainda.' : 'Nenhum reporte aberto. 🎉'}</p>`}</section>
  </div>`;
}

/* ---------- Desenvolvimento (v1.10) ----------
   Horas, tokens e custo de construir o SIPC, vindos do Painel de desenvolvimento
   do Victor (arquivo metricas-sipc.json no PC dele). Só totais: nada de texto
   de conversa. Só o admin vê; os indicadores nunca vão para Admin de cliente. */
const DEV = {m:null, carregando:false, lendo:false, erro:null, situacao:'nenhum', carregou:false, msg:''};
const devPref = (k, d) => { try{ const v = localStorage.getItem('sipc.adm.' + k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } };
const devGuardar = (k, v) => { try{ localStorage.setItem('sipc.adm.' + k, JSON.stringify(v)); }catch(e){} };
const devBrl = v => numero(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const devHoras = h => numero(h).toLocaleString('pt-BR',{maximumFractionDigits:1}) + ' h';
const devMil = n => { n = numero(n); return n >= 1e9 ? (n/1e9).toLocaleString('pt-BR',{maximumFractionDigits:1}) + ' bi' : n >= 1e6 ? (n/1e6).toLocaleString('pt-BR',{maximumFractionDigits:1}) + ' mi' : n >= 1e3 ? Math.round(n/1e3) + ' mil' : String(Math.round(n)); };

async function carregarDev(forcar){
  if(!ehAdmin() || DEV.carregando || (DEV.carregou && !forcar)) return;
  const md = SIPC.metricasDev;
  DEV.carregando = true; DEV.erro = null; render(true);
  try{
    DEV.m = await md.carregar();
    DEV.situacao = await md.situacao();
    const r = await md.atualizarSozinho(DEV.m);
    DEV.m = r.metricas; DEV.msg = r.mudou ? 'atualizado com o arquivo do computador' : '';
    DEV.carregou = true;
  }catch(e){ DEV.erro = SIPC.traduzir(e); }
  DEV.carregando = false; render(true);
}
async function devLer(como, arquivo){
  const md = SIPC.metricasDev;
  DEV.lendo = true; DEV.erro = null; render(true);
  try{
    const r = como === 'escolher' ? await md.escolherArquivo(DEV.m) : como === 'input' ? await md.importarArquivo(arquivo, DEV.m) : await md.atualizarComClique(DEV.m);
    DEV.m = r.metricas; DEV.situacao = await md.situacao(); DEV.carregou = true;
    avisar(r.mudou ? 'Indicadores atualizados.' : 'O arquivo não é mais novo que os números salvos.');
  }catch(e){ if(!(e && e.name === 'AbortError')) DEV.erro = e && e.message ? e.message : String(e); }
  DEV.lendo = false; render(true);
}
async function devEsquecer(){ await SIPC.metricasDev.esquecerArquivo(); DEV.situacao = 'nenhum'; avisar('O app esqueceu o arquivo neste aparelho.'); render(true); }
function devAjuste(k, v){ devGuardar(k, v); render(true); }

function admDev(){
  const md = SIPC.metricasDev, m = DEV.m;
  const valorHora = numero(devPref('valorHora', md.VALOR_HORA_PADRAO)), dolar = numero(devPref('dolar', 5.5)), comTokens = !!devPref('comTokens', false);
  const auto = md.leituraAutomatica();
  const botoes = `<div class="adm-dev-acoes">${auto ? (DEV.situacao === 'nenhum'
        ? `<button class="btn" onclick="devLer('escolher')" ${DEV.lendo?'disabled':''}>Escolher o arquivo de métricas</button>`
        : `<button class="btn sec" onclick="devLer('clique')" ${DEV.lendo?'disabled':''}>${DEV.lendo?'Lendo…':'Ler o arquivo agora'}</button><button class="btn link" onclick="devLer('escolher')">Trocar arquivo</button><button class="btn link" onclick="devEsquecer()">Esquecer arquivo</button>`)
      : `<label class="btn sec">Escolher arquivo<input type="file" accept=".json,application/json" hidden onchange="this.files[0]&&devLer('input',this.files[0])"></label>`}</div>`;
  const ajuda = `<details class="bl-rastro"><summary>Como funciona e o que fica guardado</summary>
      <ul class="dim" style="font-size:13px;margin:8px 0 0;padding-left:18px">
        <li><b>De onde vem:</b> do Painel de desenvolvimento no seu computador, arquivo <code>G:\\Meu Drive\\Claude - AI\\painel-desenvolvimento\\dados\\metricas-sipc.json</code>, refeito a partir das suas conversas com o Claude Code.</li>
        <li><b>Atualização:</b> na primeira vez você escolhe o arquivo. Depois, cada vez que abrir esta aba no Chrome ou Edge deste computador, o app relê o arquivo e, se ele for mais novo, salva os totais. Se o navegador pedir, um clique em "Ler o arquivo agora" libera (o Chrome oferece "Permitir em todas as visitas"). No celular aparecem os últimos números salvos.</li>
        <li><b>O que é salvo:</b> só totais (horas, tokens, custo, linhas e commits), num documento do banco que só o seu login de admin lê e grava. Nenhum texto de conversa, título de sessão, senha ou chave.</li>
        <li><b>Neste aparelho:</b> o navegador guarda só a permissão para ler aquele arquivo. "Esquecer arquivo" apaga essa permissão.</li>
        <li><b>Horas:</b> tempo de trabalho junto com o Claude (pausas acima de 15 min não contam) mais as horas lançadas à mão no painel. O valor da hora e a cotação ficam só neste navegador.</li>
        <li><b>Custo em API:</b> quanto os tokens custariam pagos por uso. Na assinatura não se paga por token; por isso só entra no total se você marcar.</li>
      </ul></details>`;
  if(DEV.carregando && !m) return `<div class="carregando">${ico('spark')}<p><b>Carregando os indicadores…</b></p></div>`;
  const erro = DEV.erro ? `<div class="erro"><b>Não consegui ler os indicadores.</b><br>${escHtml(DEV.erro)}</div>` : '';
  if(!m) return `<div class="adm-cab"><div><h2>Desenvolvimento</h2><p class="dim adm-sub">Horas, tokens e custo de construir o SIPC. Ainda não há números salvos.</p></div></div>${erro}
    <section class="bloco"><p>Para começar, escolha o arquivo <b>metricas-sipc.json</b> do seu Painel de desenvolvimento.</p>${botoes}${ajuda}</section>`;

  const c = md.custo(m, {valorHora, dolar, comTokens});
  const tile = (rot, val, sub, cls='') => `<div class="kpi ${cls}"><span class="k-rot">${rot}</span><span class="k-val">${val}</span><span class="k-delta">${sub}</span></div>`;
  const cats = Object.entries(md.CATEGORIAS);
  const semanas = Object.entries(m.semanas || {}).slice(-12).map(([k,s]) => {
    const h = Object.values(s.horas||{}).reduce((a,v)=>a+numero(v),0);
    return {rot: k.slice(8,10) + '/' + k.slice(5,7), valor: Math.round(h*10)/10, dica: `Semana de ${k.slice(8,10)}/${k.slice(5,7)}: ${devHoras(h)} · ${devBrl(h*valorHora)} · ${devMil(s.tokens)} tokens`};
  });
  const geradoEm = new Date(m.geradoEm), dt = d => fmtData(dataDe(d),{day:'2-digit',month:'2-digit',year:'numeric'});
  return `<div class="adm-cab"><div><h2>Desenvolvimento</h2><p class="dim adm-sub">Horas, tokens e custo de construir o SIPC${m.inicio ? `, de ${dt(m.inicio)} a ${dt(m.fim||m.inicio)}` : ''}. Números de ${geradoEm.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(',','')}${DEV.msg ? ' (' + escHtml(DEV.msg) + ')' : ''}.</p></div>${botoes}</div>
    ${erro}
    <div class="adm-dev-calc" role="group" aria-label="Calculadora">
      <label class="bl-campo">Valor da hora (R$) <input type="number" min="0" step="10" value="${valorHora}" onchange="devAjuste('valorHora', Number(this.value)||0)"></label>
      <label class="bl-campo">Cotação do dólar (R$) <input type="number" min="0" step="0.05" value="${dolar}" onchange="devAjuste('dolar', Number(this.value)||0)"></label>
      <label class="bl-campo"><input type="checkbox" ${comTokens?'checked':''} onchange="devAjuste('comTokens', this.checked)"> Somar os tokens no custo</label>
    </div>
    <section class="kpis adm-kpis" aria-label="Indicadores de desenvolvimento">
      ${tile('Custo do projeto', devBrl(c.total), comTokens ? 'horas × valor da hora + tokens' : `horas × ${devBrl(valorHora)}/h`, 'adm-dest')}
      ${tile('Horas', devHoras(c.horas), `${devHoras(m.horasClaude)} com o Claude · ${devHoras(m.horasManuais)} à mão`)}
      ${tile('Sessões', numero(m.sessoes), `${numero(m.diasAtivos)} dias com trabalho · ${devHoras(m.indicadores.horasPorDia)} por dia`)}
      ${tile('Tokens', devMil(m.tokensTotal), `${devMil(m.tokens.saida)} de saída · ${devMil(m.tokens.cacheLido)} lidos do cache`)}
      ${tile('Tokens em API', devBrl(c.tokensReais), `US$ ${numero(m.custoUsd).toLocaleString('pt-BR',{maximumFractionDigits:0})} se fosse pago por uso`)}
      ${tile('Código', `${devMil(m.linhasMais)} <small>linhas</small>`, `${numero(m.commits)} commits · ${numero(m.ferramentas).toLocaleString('pt-BR')} ferramentas`)}
    </section>
    <div class="adm-grade">
      <section class="bloco"><h3>Horas por atividade</h3><p class="dim adm-sub">Inclui as horas lançadas à mão.</p>
        ${barrasLinhas(cats.map(([k,n])=>({rot:n, valor:numero(m.horasPorCategoria[k]), texto:devHoras(m.horasPorCategoria[k]), dica:`${n}: ${devHoras(m.horasPorCategoria[k])} · ${numero(m.pedidos[k])} pedidos`})))}</section>
      <section class="bloco"><h3>Custo por atividade</h3><p class="dim adm-sub">Horas × ${devBrl(valorHora)}.</p>
        ${barrasLinhas(cats.map(([k,n])=>({rot:n, valor:numero(m.horasPorCategoria[k])*valorHora, texto:devBrl(numero(m.horasPorCategoria[k])*valorHora)})))}</section>
      <section class="bloco"><h3>Horas por semana</h3><p class="dim adm-sub">Últimas 12 semanas (a data é a segunda-feira).</p>${semanas.length ? barrasDias(semanas, 'horas por semana') : '<p class="dim">Sem semanas registradas.</p>'}</section>
      <section class="bloco"><h3>Para orçar o próximo</h3><ul class="ev-lista">
        <li><span>Custo dos tokens por hora</span><b class="num">${devBrl(m.indicadores.custoUsdPorHora*dolar)}</b></li>
        <li><span>Planejamento por hora de desenvolvimento</span><b class="num">${numero(m.indicadores.planejamentoPorHoraDev).toLocaleString('pt-BR',{maximumFractionDigits:2})} h</b></li>
        <li><span>Linhas por hora de desenvolvimento</span><b class="num">${Math.round(numero(m.indicadores.linhasPorHoraDev)).toLocaleString('pt-BR')}</b></li>
        <li><span>Horas por dia de trabalho</span><b class="num">${devHoras(m.indicadores.horasPorDia)}</b></li>
      </ul></section>
    </div>
    ${ajuda}`;
}
