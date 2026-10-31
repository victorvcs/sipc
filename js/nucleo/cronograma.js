// Datas do concurso (sem tela, por isso têm teste). Cada item é
// {evento, inicio, fim, manual}: fim só em período, manual para o que o aluno
// escreveu e a retificação não pode apagar.

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const dataValida = d => DATA.test(d || '') && !isNaN(new Date(d + 'T12:00:00').getTime());

const fimDe = i => i.fim || i.inicio;
const ordem = (a, b) => a.inicio.localeCompare(b.inicio) || a.evento.localeCompare(b.evento);

export function validarCronograma(lista) {
  const vistos = new Set();
  return (Array.isArray(lista) ? lista : []).map(i => ({
    evento: String(i?.evento ?? '').trim().slice(0, 160),
    inicio: i?.inicio,
    fim: dataValida(i?.fim) && i.fim > i.inicio ? i.fim : '',
    manual: !!i?.manual,
  })).filter(i => i.evento && dataValida(i.inicio)).filter(i => {
    const k = i.evento.toLowerCase() + i.inicio;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  }).sort(ordem);
}

// Retificação: as datas novas da IA substituem as antigas; as do aluno ficam.
export const atualizarCronograma = (atual, novas) =>
  validarCronograma([...validarCronograma(novas).map(i => ({ ...i, manual: false })), ...(atual || []).filter(i => i.manual)]);

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
