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
  const topo = `<div class="bl-filtro adm-topo" role="group" aria-label="Área do administrador">${[['geral','Visão geral'],['usuarios','Alunos'],['backlog','Reportes']].map(([k,n])=>`<button class="chip ${ADM.aba===k && !ADM.ficha?'on':''}" onclick="ADM.aba='${k}';ADM.ficha=null;render(true)">${n}</button>`).join('')}
    <button class="chip" onclick="carregarAdmin(true)">${ADM.carregando?'Atualizando…':'Atualizar'}</button>
    ${ADM.carregadoEm ? `<span class="dim" style="font-size:12px">dados de ${ADM.carregadoEm.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>` : ''}</div>`;
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
    </div>`;
}

const ROT_EVENTO = {login:'entrou', 'trilha-criada':'criou a trilha', 'trilha-aberta':'abriu a trilha', 'topico-aberto':'abriu o tópico', 'topico-concluido':'concluiu o tópico',
  revisao:'revisou', 'questoes-dia':'fez as questões do dia', 'edital-lido':'leu o edital', 'edital-erro':'teve erro ao ler o edital', reporte:'mandou um reporte',
  'modo-teste':'ligou o modo teste', tour:'viu o tour', sair:'saiu da conta', tela:'abriu', 'ia-erro':'teve erro da IA'};
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

/* ---------- backlog do Reportar ---------- */
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
  return `<div class="backlog" style="padding:0">
    <h2 style="margin:0 0 6px">Reportes priorizados</h2>
    <div class="sub">Tudo o que os alunos reportam, já classificado e na ordem sugerida: primeiro o que mais atrapalha a jornada e dá menos trabalho.</div>
    <div class="quads">${Object.keys(QUAD).map(q=>`<div class="quad q-${q}"><b>${QUAD[q].n}</b><span>${QUAD[q].d}</span><span class="num">${cont(q)}</span></div>`).join('')}</div>
    <div class="bl-filtro" role="group" aria-label="Filtrar">${[['todos','Tudo'],['bug','Bugs'],['melhoria','Melhorias']].map(([k,n])=>`<button class="chip ${ADM.filtro===k?'on':''}" onclick="ADM.filtro='${k}';render(true)">${n}</button>`).join('')}</div>
    <section class="bl-sec">${vis.map((i,k)=>card(i,k+1)).join('') || '<p class="vazio">Nada reportado ainda.</p>'}</section>
  </div>`;
}
