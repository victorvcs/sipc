// Datas do concurso (sem tela, por isso têm teste). Cada item é
// {evento, inicio, fim, manual}: fim só em período, manual para o que o aluno
// escreveu e a retificação não pode apagar.

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const dataValida = d => DATA.test(d || '') && !isNaN(new Date(d + 'T12:00:00').getTime());

// A IA às vezes devolve a data como está no edital (12/11/2026) em vez de 2026-11-12.
export function normalizarData(d) {
  const s = String(d ?? '').trim();
  const br = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  return br ? `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}` : s;
}

const fimDe = i => i.fim || i.inicio;
const ordem = (a, b) => a.inicio.localeCompare(b.inicio) || a.evento.localeCompare(b.evento);

export function validarCronograma(lista) {
  const vistos = new Set();
  return (Array.isArray(lista) ? lista : []).map(i => {
    const inicio = normalizarData(i?.inicio), fim = normalizarData(i?.fim);
    return {
      evento: String(i?.evento ?? '').trim().slice(0, 160),
      inicio,
      fim: dataValida(fim) && fim > inicio ? fim : '',
      manual: !!i?.manual,
    };
  }).filter(i => i.evento && dataValida(i.inicio)).filter(i => {
    const k = i.evento.toLowerCase() + i.inicio;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  }).sort(ordem);
}

// Retificação: as datas novas da IA substituem as antigas; as do aluno ficam.
export const atualizarCronograma = (atual, novas) =>
  validarCronograma([...validarCronograma(novas).map(i => ({ ...i, manual: false })), ...(atual || []).filter(i => i.manual)]);

const DATA_NO_TEXTO = /\b\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?\b|\b\d{1,2}º? de (?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/gi;

// Edital longo não cabe inteiro na IA: fica só o começo, que costuma dizer o ano,
// e a vizinhança de cada data. Um edital sem nenhuma data devolve ''.
export function trechoDeDatas(texto, max = 40000, vizinhanca = 140) {
  const t = String(texto ?? ''), faixas = [];
  for (const m of t.matchAll(DATA_NO_TEXTO)) {
    const de = Math.max(0, m.index - vizinhanca), ate = Math.min(t.length, m.index + m[0].length + vizinhanca);
    const ultima = faixas.at(-1);
    if (ultima && de <= ultima[1]) ultima[1] = ate; else faixas.push([de, ate]);
  }
  if (!faixas.length) return '';
  return (t.slice(0, 600) + '\n…\n' + faixas.map(([a, b]) => t.slice(a, b)).join('\n…\n')).slice(0, max);
}

export const proximasDatas = (lista, hoje) => (lista || []).filter(i => fimDe(i) >= hoje);

const diasAte = (de, ate) => Math.round((new Date(ate + 'T12:00:00') - new Date(de + 'T12:00:00')) / 86400000);

// Quanto falta para o aluno agir: período aberto conta até o último dia.
export function faltam(item, hoje) {
  if (item.inicio > hoje) return diasAte(hoje, item.inicio);
  return item.fim && item.fim >= hoje ? diasAte(hoje, item.fim) : diasAte(hoje, item.inicio);
}

export const datasUrgentes = (lista, hoje, janela = 7) =>
  proximasDatas(lista, hoje).filter(i => faltam(i, hoje) <= janela);

// A agenda do Google trata o fim de evento de dia inteiro como exclusivo.
const diaSeguinte = d => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + 1); return x.toISOString().slice(0, 10); };

export function linkAgenda(item, prova = '') {
  const so = d => d.replace(/-/g, '');
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: prova ? `${item.evento} · ${prova}` : item.evento,
    dates: `${so(item.inicio)}/${so(diaSeguinte(fimDe(item)))}`,
    details: 'Data do cronograma do edital, guardada pelo SIPC. Confira sempre no edital.',
  });
  return 'https://calendar.google.com/calendar/render?' + p.toString();
}
