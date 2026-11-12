// Regras puras do Reportar (v1.9): impacto, contexto que vai junto (rastro e
// erros, sem dado pessoal), limites que batem com as Regras do Firestore,
// status da fila e limite diário de envios. Sem DOM e sem Firebase: testado
// em tests/reporte.test.js.

// O aluno diz o impacto do bug; a gravidade e o valor saem daqui.
export const IMPACTOS = {
  bloqueia:  { sev: 'alta',  valor: 5, rot: 'Me impede de estudar' },
  atrapalha: { sev: 'media', valor: 3, rot: 'Atrapalha, mas dá para seguir' },
  incomoda:  { sev: 'baixa', valor: 2, rot: 'Só incomoda' },
};

// Fila do admin. Só "novo" é gravado pelo aluno.
export const STATUS = {
  novo:      'Novo',
  triado:    'Triado',
  andamento: 'Em andamento',
  resolvido: 'Resolvido',
  'nao-vamos': 'Não vamos fazer',
};
export const fechado = s => s === 'resolvido' || s === 'nao-vamos';

export const LIM = { rastro: 20, erros: 5, detalhe: 160, erro: 200, tela: 120, tipoEv: 40, versao: 20, motivo: 300, resposta: 500, porDia: 10 };

// Tira do texto o que pode identificar alguém ou abrir uma conta:
// e-mail, CPF/telefone/cartão (11+ dígitos, com ou sem pontuação) e
// trechos com cara de token (20+ letras/números seguidos sem espaço).
export function limparTexto(v, max = LIM.erro) {
  return String(v ?? '')
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[removido]')
    .replace(/\(?\d(?:[\s.\-/()]{0,2}\d){10,}/g, '[removido]')
    .replace(/[A-Za-z0-9_\-]{20,}/g, m => /\d/.test(m) && /[A-Za-z]/.test(m) ? '[removido]' : m)
    .slice(0, max);
}

// Lista circular: guarda só os últimos `max`.
export function empilhar(lista, item, max) {
  const nova = [...lista, item];
  return nova.length > max ? nova.slice(nova.length - max) : nova;
}

const corta = (v, n) => String(v ?? '').slice(0, n);
export const itemRastro = e => ({ t: corta(e.t, 30), tipo: corta(e.tipo, LIM.tipoEv), d: limparTexto(e.d, LIM.detalhe), tela: corta(e.tela, LIM.tela) });
export const itemErro = e => ({ t: corta(e.t, 30), msg: limparTexto(e.msg, LIM.erro), tela: corta(e.tela, LIM.tela) });

// Contexto que vai junto com o reporte, já no formato aceito pelas Regras.
export function contexto({ rastro = [], erros = [], versao = '' } = {}) {
  return {
    versao: corta(versao, LIM.versao),
    rastro: rastro.slice(-LIM.rastro).map(itemRastro),
    erros: erros.slice(-LIM.erros).map(itemErro),
  };
}

// Limite de envios por dia, contado no aparelho. `reg` = {dia, n}.
export function podeEnviar(reg, hoje) {
  const n = reg && reg.dia === hoje ? Number(reg.n) || 0 : 0;
  return { ok: n < LIM.porDia, restam: Math.max(0, LIM.porDia - n) };
}
export function contarEnvio(reg, hoje) {
  const n = reg && reg.dia === hoje ? Number(reg.n) || 0 : 0;
  return { dia: hoje, n: n + 1 };
}

// Reportes do aluno fechados depois da última vez que ele viu o aviso.
const ms = v => v == null ? 0 : typeof v === 'string' ? Date.parse(v) || 0 : v.toMillis ? v.toMillis() : v.seconds ? v.seconds * 1000 : Number(v) || 0;
export function avisosNovos(reportes, vistosEm) {
  const desde = ms(vistosEm);
  return reportes.filter(r => fechado(r.status) && ms(r.resolvidoEm) > desde);
}
export const momento = ms;
