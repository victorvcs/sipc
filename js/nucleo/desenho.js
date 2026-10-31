// Regras da folha de desenho (sem tela, por isso têm teste). A folha é
// {tracos, passado}: tracos é o que está visível e passado guarda as versões
// anteriores para o desfazer. Cada traço é {f, p}: f é a ferramenta ('c' caneta
// ou 'b' borracha) e p é a lista plana x, y, largura. O desenho nunca vai para o
// Firestore (o documento tem limite de 1 MB): fica só no aparelho do aluno.

export const LARGURA = 1200;      // coordenadas fixas: girar o iPad não desloca o desenho
export const ALTURA_RASCUNHO = 500;
export const ALTURA_FOLHA = 1600; // retrato; o maior lado fica igual ao da foto reduzida
export const LARGURA_CANETA = 4;
export const LARGURA_BORRACHA = 36;
export const MAX_DESFAZER = 50;
// A palma encosta depois da caneta: o toque só volta a valer um tempo depois do último traço dela.
export const TOQUE_BLOQUEADO_MS = 60000;
export const MAX_FOLHAS = 40;
export const MAX_CARACTERES = 3e6; // o localStorage costuma ter 5 MB, e o resto é do app

export const folhaVazia = () => ({ tracos: [], passado: [] });
export const temTracos = f => !!f && f.tracos.some(t => t.f === 'c');

const comHistorico = (f, tracos) => ({ tracos, passado: [...f.passado, f.tracos].slice(-MAX_DESFAZER) });
export const adicionar = (f, traco) => comHistorico(f, [...f.tracos, traco]);
export const limpar = f => (f.tracos.length ? comHistorico(f, []) : f);
export const desfazer = f => (f.passado.length ? { tracos: f.passado.at(-1), passado: f.passado.slice(0, -1) } : f);

// Na tela estreita a folha encolhe e o traço sumiria: ele engrossa para continuar legível.
export const escalaDoTraco = larguraNaTela => Math.min(2.4, Math.max(1, 720 / (larguraNaTela || 720)));

// Só a caneta informa pressão de verdade: mouse e dedo mantêm a largura fixa.
export function larguraDoPonto(ferramenta, tipoPonteiro, pressao, escala = 1) {
  if (ferramenta === 'b') return Math.round(LARGURA_BORRACHA * escala);
  if (tipoPonteiro !== 'pen') return Math.round(LARGURA_CANETA * escala * 10) / 10;
  const p = Math.min(1, Math.max(0, Number(pressao) || 0));
  return Math.round(LARGURA_CANETA * escala * (0.5 + p * 1.5) * 10) / 10;
}

export const novoTraco = ferramenta => ({ f: ferramenta === 'b' ? 'b' : 'c', p: [] });

// Devolve true se o ponto entrou. Ponto colado no anterior só pesa no armazenamento.
export function somarPonto(traco, x, y, largura) {
  const n = traco.p.length;
  if (n && Math.hypot(x - traco.p[n - 3], y - traco.p[n - 2]) < 1.5) return false;
  traco.p.push(Math.round(x), Math.round(y), largura);
  return true;
}

export const toqueBloqueado = (ultimaCanetaEm, agora) =>
  ultimaCanetaEm != null && agora - ultimaCanetaEm < TOQUE_BLOQUEADO_MS;

// Decide o que fazer com um ponteiro que encostou. ativo é o tipo do ponteiro
// que está desenhando agora, ou null. A caneta sempre ganha: a palma costuma
// encostar primeiro, e o risco dela é descartado.
export function aoEncostar(tipoPonteiro, ativo, ultimaCanetaEm, agora) {
  if (tipoPonteiro === 'pen') return ativo === 'touch' ? 'trocar' : ativo ? 'ignorar' : 'desenhar';
  if (ativo) return 'ignorar';
  return tipoPonteiro === 'touch' && toqueBloqueado(ultimaCanetaEm, agora) ? 'ignorar' : 'desenhar';
}

export const serializar = (f, agora) => agora + '|' + JSON.stringify(f.tracos);

// O que vem do armazenamento pode estar corrompido: traço inválido é descartado.
export function desserializar(texto) {
  const i = String(texto ?? '').indexOf('|');
  if (i < 0) return folhaVazia();
  try {
    const lista = JSON.parse(texto.slice(i + 1));
    if (!Array.isArray(lista)) return folhaVazia();
    const ok = t => t && (t.f === 'c' || t.f === 'b') && Array.isArray(t.p) && t.p.length % 3 === 0 && t.p.every(Number.isFinite);
    return { tracos: lista.filter(ok), passado: [] };
  } catch { return folhaVazia(); }
}
export const instanteSalvo = texto => parseInt(texto, 10) || 0;

// Folhas [{chave, tam, em}] que precisam sair para respeitar os limites: as mais antigas primeiro.
export function quaisApagar(folhas, maxFolhas = MAX_FOLHAS, maxCaracteres = MAX_CARACTERES) {
  const antigasPrimeiro = [...folhas].sort((a, b) => a.em - b.em);
  let qtd = folhas.length, total = folhas.reduce((s, f) => s + f.tam, 0);
  const sair = [];
  for (const f of antigasPrimeiro) {
    if (qtd <= maxFolhas && total <= maxCaracteres) break;
    sair.push(f.chave); qtd--; total -= f.tam;
  }
  return sair;
}
