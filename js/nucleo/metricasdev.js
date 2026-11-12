// Indicadores de desenvolvimento do SIPC (v1.10), só para o Admin do Victor.
// A origem é o Painel de desenvolvimento do Victor (G:\Meu Drive\Claude - AI\
// painel-desenvolvimento\dados\metricas-sipc.json): totais de horas, tokens,
// custo e commits, sem texto de conversa nem títulos de sessão.
// Este módulo só confere e limpa o arquivo e faz as contas; não fala com o banco.

export const CATEGORIAS = {
  planejamento: 'Planejamento, arquitetura e decisões',
  desenvolvimento: 'Desenvolvimento',
  correcao: 'Correção de bugs',
  design: 'Protótipo e design',
  infra: 'Infra e configuração',
  acompanhamento: 'Acompanhamento de projetos',
};
export const VALOR_HORA_PADRAO = 180;
export const MAX_SEMANAS = 104;

const num = (v, max = 1e12) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0; };
const dia = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
const porCategoria = o => Object.fromEntries(Object.keys(CATEGORIAS).map(k => [k, num(o && o[k], 1e6)]));

// Recebe o JSON do painel (objeto ou texto) e devolve só os campos conhecidos,
// com números válidos. Recusa arquivo de outro projeto ou sem data.
export function normalizar(entrada) {
  let d = entrada;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { throw new Error('O arquivo não é um JSON válido.'); } }
  if (!d || typeof d !== 'object') throw new Error('Arquivo vazio ou em formato desconhecido.');
  if (String(d.projeto || '').trim().toUpperCase() !== 'SIPC') throw new Error(`Este arquivo é do projeto "${String(d.projeto || 'sem nome').slice(0, 40)}", não do SIPC.`);
  const geradoEm = new Date(d.gerado_em);
  if (isNaN(geradoEm)) throw new Error('O arquivo não diz quando foi gerado (gerado_em).');
  const t = d.tokens || {};
  const ind = d.indicadores || {};
  const semanas = {};
  Object.keys(d.semanas || {}).filter(dia).sort().slice(-MAX_SEMANAS).forEach(k => {
    const s = d.semanas[k] || {};
    semanas[k] = { horas: porCategoria(s.horas), tokens: num(s.tokens), custo_usd: num(s.custo_usd, 1e7) };
  });
  return {
    geradoEm: geradoEm.toISOString(),
    inicio: dia(d.inicio), fim: dia(d.fim),
    sessoes: num(d.sessoes, 1e6), diasAtivos: num(d.dias_ativos, 1e5),
    horasClaude: num(d.horas_claude, 1e6), horasManuais: num(d.horas_manuais, 1e6),
    horasPorCategoria: porCategoria(d.horas_por_categoria),
    pedidos: porCategoria(d.pedidos),
    tokens: { entrada: num(t.entrada), cache5m: num(t.cache_5m), cache1h: num(t.cache_1h), cacheLido: num(t.cache_lido), saida: num(t.saida) },
    tokensTotal: num(d.tokens_total),
    custoUsd: num(d.custo_usd, 1e7),
    linhasMais: num(d.linhas_mais), linhasMenos: num(d.linhas_menos),
    ferramentas: num(d.n_ferramentas),
    commits: num(d.commits, 1e6),
    indicadores: {
      custoUsdPorHora: num(ind.custo_usd_por_hora, 1e6),
      linhasPorHoraDev: num(ind.linhas_por_hora_dev, 1e7),
      planejamentoPorHoraDev: num(ind.planejamento_por_hora_dev, 1e4),
      horasPorDia: num(ind.horas_por_dia, 24),
    },
    semanas,
  };
}

// Total de horas (com as lançadas à mão) e o custo pelo valor da hora.
// Os tokens entram no total só se o Victor pedir (na assinatura não se paga por token).
export function custo(m, { valorHora = VALOR_HORA_PADRAO, dolar = 5.5, comTokens = false } = {}) {
  const horas = num(m.horasClaude) + num(m.horasManuais);
  const maoDeObra = horas * num(valorHora);
  const tokensReais = num(m.custoUsd) * num(dolar);
  return { horas, maoDeObra, tokensReais, total: maoDeObra + (comTokens ? tokensReais : 0) };
}

// O arquivo do disco só substitui o salvo se for mais novo.
export const maisNovo = (arquivo, salvo) => !salvo || Date.parse(arquivo.geradoEm) > Date.parse(salvo.geradoEm || 0);
