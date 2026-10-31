// Contas do cronômetro de foco (sem tela, por isso têm teste). O estado é
// {desde, sessaoSeg}: desde é o instante em que o trecho atual começou, ou
// null quando está pausado; sessaoSeg soma os trechos já fechados.

export const INTERVALO_GRAVACAO_MS = 30000;
// Computador que dormiu não dispara nada: ao acordar, o trecho pareceria ter
// durado horas. Como se grava a cada 30 s, trecho maior que isto não é estudo.
export const TRECHO_MAX_SEG = 120;

export const focoVazio = () => ({ desde: null, sessaoSeg: 0 });

export const iniciar = (f, agora) => (f.desde != null ? f : { ...f, desde: agora });

export function fecharTrecho(f, agora) {
  if (f.desde == null) return { foco: f, seg: 0 };
  const seg = Math.min(TRECHO_MAX_SEG, Math.max(0, Math.floor((agora - f.desde) / 1000)));
  return { foco: { ...f, desde: agora, sessaoSeg: f.sessaoSeg + seg }, seg };
}

export function pausar(f, agora) {
  const { foco, seg } = fecharTrecho(f, agora);
  return { foco: { ...foco, desde: null }, seg };
}

export const decorridoSeg = (f, agora) =>
  f.sessaoSeg + (f.desde != null ? Math.min(TRECHO_MAX_SEG, Math.max(0, Math.floor((agora - f.desde) / 1000))) : 0);

export function relogio(seg) {
  const p = n => String(n).padStart(2, '0');
  const h = Math.floor(seg / 3600), m = Math.floor(seg % 3600 / 60), s = seg % 60;
  return (h ? h + ':' + p(m) : p(m)) + ':' + p(s);
}

// Soma os dias do intervalo [de, ate] (datas AAAA-MM-DD).
export const somaFoco = (porDia, de = '', ate = '9999') =>
  Object.entries(porDia || {}).reduce((t, [d, s]) => (d >= de && d <= ate ? t + (Number(s) || 0) : t), 0);
