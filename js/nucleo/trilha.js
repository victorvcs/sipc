import { vencidas } from './revisao.js';

// Cada tópico novo leva uns 40 min (leitura + questões); os vídeos entram na v1.1.
export const MIN_TOPICO = 40;
export const chaveTopico = (materia, topico) => materia + '::' + topico;

// 70% do tempo do dia vai para tópicos novos; o resto para as revisões 1-7-30.
export function ritmo({ totalTopicos, horas, dias, dataProva, hojeISO }) {
  const topDia = Math.max(1, Math.round((horas * 60 * 0.7) / MIN_TOPICO));
  const porSemana = dias.filter(Boolean).length || 1;
  const diasEstudo = Math.ceil(totalTopicos / topDia);
  const diasCorridos = Math.ceil((diasEstudo * 7) / porSemana);
  const ateProva = Math.max(0, Math.round((new Date(dataProva + 'T12:00:00Z') - new Date(hojeISO + 'T12:00:00Z')) / 86400000));
  return { topDia, diasEstudo, diasCorridos, ateProva, folga: ateProva - diasCorridos };
}

// Espalha os tópicos de cada matéria pelo ciclo; no empate, a de maior peso vem antes.
export function filaDeTopicos(materias) {
  const fila = [];
  materias.forEach(m => m.topicos.forEach((t, j) =>
    fila.push({ materia: m.nome, topico: t, peso: m.peso, k: (j + 0.5) / m.topicos.length })));
  return fila.sort((a, b) => a.k - b.k || b.peso - a.peso).map(({ k, ...x }) => x);
}

export function planoDoDia({ materias, feito, revisoes, parcial, hojeISO, horas }) {
  const rev = vencidas(revisoes, hojeISO);
  const emRev = new Set(rev.map(r => r.chave));
  const { topDia } = ritmo({ totalTopicos: 1, horas, dias: [true], dataProva: hojeISO, hojeISO });
  const novos = filaDeTopicos(materias)
    .filter(x => { const c = chaveTopico(x.materia, x.topico); return !feito[c] && !emRev.has(c); })
    .slice(0, topDia)
    .map(({ materia, topico }) => ({ materia, topico }));
  const continuar = Object.keys(parcial || {})[0] || null;
  return { revisoes: rev, novos, continuar };
}
