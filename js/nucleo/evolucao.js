// Gamificação do estudo (sem tela, por isso tem teste). Estimula a passar da
// meta do dia, mas só até um limite: hora além dele não vale mais nada aqui,
// para o app nunca premiar o desgaste.

export const PAUSA_SUGERIDA_SEG = 50 * 60;
const FATOR_LIMITE = 1.5, TETO_DIA_H = 6;
export const MARCOS = [10, 25, 50, 75, 100];

export const metaSeg = horasDia => Math.round((Number(horasDia) || 0) * 3600);

// Quem combinou mais que o teto não é punido: o limite vira a própria meta.
export const limiteSeg = horasDia => {
  const h = Number(horasDia) || 0;
  return Math.round(Math.max(h, Math.min(h * FATOR_LIMITE, TETO_DIA_H)) * 3600);
};

export function statusDia(focoSeg, horasDia) {
  const meta = metaSeg(horasDia), limite = limiteSeg(horasDia), seg = Number(focoSeg) || 0;
  const estado = !seg ? 'comecar' : seg < meta ? 'andamento' : seg >= limite && limite > meta ? 'descanso' : seg > meta ? 'extra' : 'meta';
  return { estado, meta, limite, faltaSeg: Math.max(0, meta - seg), extraSeg: Math.max(0, Math.min(seg, limite) - meta), pct: meta ? Math.min(100, Math.round(seg / meta * 100)) : 0 };
}

// Dias de plano que o tempo extra adiantou, contando cada dia só até o limite.
export function diasGanhos(porDia, horasDia) {
  const meta = metaSeg(horasDia); if (!meta) return 0;
  const extra = Object.values(porDia || {}).reduce((t, s) => t + statusDia(s, horasDia).extraSeg, 0);
  return Math.floor(extra / meta * 10) / 10;
}

export const proximoMarco = pct => MARCOS.find(m => m > pct) ?? null;
export const marcosAlcancados = pct => MARCOS.filter(m => pct >= m);
