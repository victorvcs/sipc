// Domínio por matéria (sem tela, por isso tem teste). Cada tópico está num de
// quatro níveis, do que falta estudar ao que já passou por todas as revisões.

export const ACERTO_FIRME = 70;
export const NIVEIS = [
  { id: 'novo', nome: 'A estudar' },
  { id: 'estudado', nome: 'Estudado' },
  { id: 'firme', nome: 'Firme' },
  { id: 'consolidado', nome: 'Consolidado' },
];

// Firme pede questões feitas e acerto no mínimo em 70%: estudar não basta.
export function nivelDoTopico({ feito, consolidado, acertos = 0, total = 0 } = {}) {
  if (consolidado) return 'consolidado';
  if (!feito) return 'novo';
  return total > 0 && acertos / total * 100 >= ACERTO_FIRME ? 'firme' : 'estudado';
}

export function resumoDosNiveis(niveis) {
  const r = { novo: 0, estudado: 0, firme: 0, consolidado: 0 };
  niveis.forEach(n => { r[n]++; });
  return r;
}
