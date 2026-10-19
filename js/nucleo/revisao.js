// Revisão do SIPC: todo tópico volta 1, 7 e 30 dias depois de estudado.
// "Lembrei" leva à próxima etapa (contada a partir do estudo); "Difícil"
// repete a etapa; "Esqueci" recomeça em 24 horas. Depois da etapa de 30
// dias, o tópico está consolidado.
export const ETAPAS = [1, 7, 30];

export function somarDias(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const maior = (a, b) => (a > b ? a : b);

export function agendar(materia, topico, dataISO) {
  return { chave: materia + '::' + topico, materia, topico, estudadoEm: dataISO, etapa: 0,
           proxima: somarDias(dataISO, ETAPAS[0]), consolidado: false, historico: [] };
}

export function datasDeVolta(dataISO) { return ETAPAS.map(n => somarDias(dataISO, n)); }

export function avaliar(rev, resultado, hojeISO) {
  const r = { ...rev, historico: [...(rev.historico || []), { data: hojeISO, resultado, etapa: rev.etapa }] };
  const amanha = somarDias(hojeISO, 1);
  if (resultado === 'esqueci') return { ...r, etapa: 0, estudadoEm: hojeISO, proxima: amanha, consolidado: false };
  if (resultado === 'dificil') return { ...r, proxima: somarDias(hojeISO, ETAPAS[r.etapa]) };
  if (r.etapa >= ETAPAS.length - 1) return { ...r, consolidado: true, proxima: null };
  const etapa = r.etapa + 1;
  // Revisão feita com atraso nunca agenda a próxima para o passado.
  return { ...r, etapa, proxima: maior(somarDias(r.estudadoEm, ETAPAS[etapa]), amanha) };
}

export function vencidas(revs, hojeISO) {
  return revs.filter(r => !r.consolidado && r.proxima && r.proxima <= hojeISO);
}
