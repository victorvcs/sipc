// Tudo que toca o Firestore passa por aqui. Com o modo teste ligado, as
// escritas vão para a memória e somem ao desligar: o aluno testa a jornada
// sem mexer no próprio progresso.
import { db, doc, getDoc, setDoc, deleteDoc, collection, getDocs, addDoc, query, orderBy, limit, serverTimestamp, where } from './firebase.js';

let teste = false;
const memoria = new Map();
export const modoTeste = () => teste;
// Trocar de modo descarta o que estava na fila: uma gravação feita no teste
// não pode cair no banco real depois que o teste foi desligado.
export function setModoTeste(on) { descartarPendentes(); teste = on; if (!on) memoria.clear(); }

const agora = () => new Date().toISOString();
async function ler(ref) {
  if (teste && memoria.has(ref.path)) return memoria.get(ref.path);
  // No modo teste sem conta as Regras recusam a leitura: vale como "nada salvo".
  try { return (await getDoc(ref)).data() ?? null; } catch (e) { if (teste) return null; throw e; }
}
// substituir: grava o documento inteiro. Com merge, uma chave apagada no app
// (ex.: o tópico saiu de "continuar de onde parou") continuaria no banco.
async function gravar(ref, dados, substituir = false, emTeste = teste) {
  if (emTeste) { memoria.set(ref.path, substituir ? dados : { ...(memoria.get(ref.path) || {}), ...dados }); return; }
  await setDoc(ref, dados, substituir ? {} : { merge: true });
}

/* perfil */
export const carregarPerfil = uid => ler(doc(db, 'users', uid));
export const salvarPerfil = (uid, dados) => gravar(doc(db, 'users', uid), { ...dados, ultimoAcesso: agora() });

/* trilhas */
export async function listarTrilhas(uid) {
  let reais = [];
  try { reais = (await getDocs(collection(db, 'users', uid, 'trilhas'))).docs.map(d => ({ id: d.id, ...d.data() })); }
  catch (e) { if (!teste) throw e; }
  if (!teste) return reais;
  const prefixo = `users/${uid}/trilhas/`;
  const daMemoria = [...memoria].filter(([p]) => p.startsWith(prefixo) && p.split('/').length === 4)
    .map(([p, v]) => ({ id: p.split('/')[3], ...v }));
  return [...reais.filter(r => !daMemoria.some(m => m.id === r.id)), ...daMemoria].filter(t => !t.excluida);
}
export async function criarTrilha(uid, dados) {
  const id = 't' + Date.now();
  await gravar(doc(db, 'users', uid, 'trilhas', id), { ...dados, criadaEm: agora(), atualizadaEm: agora() });
  return id;
}
export const salvarTrilha = (uid, tid, dados) => gravar(doc(db, 'users', uid, 'trilhas', tid), { ...dados, atualizadaEm: agora() });
export async function excluirTrilha(uid, tid) {
  descartarPendentes(tid); // senão a gravação atrasada recria um estado órfão
  if (teste) { memoria.set(`users/${uid}/trilhas/${tid}`, { excluida: true }); return; }
  await deleteDoc(doc(db, 'users', uid, 'trilhas', tid, 'estado', 'atual'));
  await deleteDoc(doc(db, 'users', uid, 'trilhas', tid));
}

/* estado de estudo (feito, revisões, parcial, questões, minutos, rascunhos) */
export const carregarEstado = (uid, tid) => ler(doc(db, 'users', uid, 'trilhas', tid, 'estado', 'atual'));
// Uma fila por trilha: salvar a trilha B logo depois da A não pode descartar a A.
// O documento só é copiado na hora de gravar (copiar a cada tecla do rascunho
// pesava), e o modo (teste ou real) fica preso ao momento do agendamento.
const pendentes = new Map(); // tid → {timer, gravar}
function descartarPendentes(tid) {
  for (const [t, p] of pendentes) if (!tid || t === tid) { clearTimeout(p.timer); pendentes.delete(t); }
}
const avisarErro = e => dispatchEvent(new CustomEvent('sipc-erro-salvar', { detail: e }));
export function salvarEstado(uid, tid, estado) {
  const antigo = pendentes.get(tid); if (antigo) clearTimeout(antigo.timer);
  const emTeste = teste, ref = doc(db, 'users', uid, 'trilhas', tid, 'estado', 'atual');
  const p = { gravar: () => gravar(ref, JSON.parse(JSON.stringify(estado)), true, emTeste) };
  p.timer = setTimeout(() => {
    if (pendentes.get(tid) !== p) return;
    pendentes.delete(tid);
    // Falha de gravação não pode passar em silêncio: o aluno acharia que salvou.
    p.gravar().catch(avisarErro);
  }, 800);
  pendentes.set(tid, p);
}
// Grava na hora o que estiver pendente (ao esconder a página ou trocar de
// trilha). Nunca rejeita: quem chama segue em frente, e o aluno é avisado.
export async function salvarAgora() {
  const fila = [...pendentes.values()];
  descartarPendentes();
  await Promise.all(fila.map(p => p.gravar().catch(avisarErro)));
}

/* correções de redação: um documento por correção, para o histórico não pesar
   no estado da trilha e acompanhar o aluno em qualquer trilha */
export const salvarCorrecao = (uid, id, dados) => gravar(doc(db, 'users', uid, 'redacoes', id), { ...dados, criadaEm: agora() });
export async function listarCorrecoes(uid, n = 40) {
  let reais = [];
  try { reais = (await getDocs(query(collection(db, 'users', uid, 'redacoes'), orderBy('criadaEm', 'desc'), limit(n)))).docs.map(d => ({ id: d.id, ...d.data() })); }
  catch (e) { if (!teste) throw e; }
  if (!teste) return reais;
  const prefixo = `users/${uid}/redacoes/`;
  const daMemoria = [...memoria].filter(([p]) => p.startsWith(prefixo)).map(([p, v]) => ({ id: p.split('/')[3], ...v }));
  return [...daMemoria.reverse(), ...reais];
}

/* vídeos por tópico (resultado da busca no YouTube), compartilhados entre alunos */
export const lerVideos = id => ler(doc(db, 'videos', id));
export const gravarVideos = (id, dados) => gravar(doc(db, 'videos', id), dados);
// Só o admin apaga (Regras). Devolve quantos vídeos guardados venceram e saíram.
export async function apagarVideosVencidos(vencido) {
  const docs = (await getDocs(collection(db, 'videos'))).docs.filter(d => vencido(d.data().criadoEm));
  for (const d of docs) await deleteDoc(d.ref);
  return docs.length;
}

/* conteúdo gerado pela IA, compartilhado entre alunos */
export const lerConteudo = id => ler(doc(db, 'conteudos', id));
export const gravarConteudo = (id, dados) => gravar(doc(db, 'conteudos', id), dados);

/* feedback: sempre chega ao Victor, inclusive em modo teste (é para isso que o modo existe) */
export async function enviarFeedback(dados) {
  await addDoc(collection(db, 'feedback'), { ...dados, modoTeste: teste, criadoEm: serverTimestamp() });
}

/* uso do app: uma "sessão" por visita (telas, tempo ativo, ações), para o
   acompanhamento do Victor. Fica em users/{uid}/sessoes: o aluno grava a
   própria, só o admin lê a dos outros. Nunca chamado com o modo teste ligado. */
export const salvarSessao = (uid, sid, dados) => setDoc(doc(db, 'users', uid, 'sessoes', sid), dados);
export const listarSessoesDe = async (uid, n = 60) =>
  (await getDocs(query(collection(db, 'users', uid, 'sessoes'), orderBy('inicio', 'desc'), limit(n)))).docs.map(d => ({ id: d.id, ...d.data() }));

/* administração (as Regras só deixam o admin ler) */
export const listarFeedback = async () =>
  (await getDocs(query(collection(db, 'feedback'), orderBy('criadoEm', 'desc')))).docs.map(d => ({ id: d.id, ...d.data() }));
// Só o admin consegue (Regras): mudar status, ajustar a prioridade, responder.
// Fechar (resolvido / não vamos fazer) grava resolvidoEm, que dispara o aviso ao aluno.
export function atualizarFeedback(id, campos) {
  const extra = 'status' in campos ? { resolvidoEm: ['resolvido', 'nao-vamos'].includes(campos.status) ? serverTimestamp() : null } : {};
  return setDoc(doc(db, 'feedback', id), { ...campos, ...extra, atualizadoEm: serverTimestamp() }, { merge: true });
}
export const marcarFeedback = (id, status) => atualizarFeedback(id, { status });
// O admin apaga qualquer reporte; o aluno, os próprios (Regras).
export const excluirFeedback = id => deleteDoc(doc(db, 'feedback', id));
// Retenção: tira o print dos reportes fechados há mais de `dias` dias. O texto fica.
export async function apagarPrintsAntigos(itens, dias = 90) {
  const limite = Date.now() - dias * 864e5;
  const alvo = itens.filter(i => i.print && ['resolvido', 'nao-vamos'].includes(i.status)
    && i.resolvidoEm && (i.resolvidoEm.toMillis ? i.resolvidoEm.toMillis() : Date.parse(i.resolvidoEm)) < limite);
  for (const i of alvo) await setDoc(doc(db, 'feedback', i.id), { print: null, atualizadoEm: serverTimestamp() }, { merge: true });
  return alvo.map(i => i.id);
}
// Reportes do próprio aluno. O filtro por uid é obrigatório: sem ele as Regras recusam.
// Ordena no navegador para não precisar de índice composto.
export const listarMeusReportes = async uid =>
  (await getDocs(query(collection(db, 'feedback'), where('uid', '==', uid)))).docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.criadoEm?.toMillis?.() || 0) - (a.criadoEm?.toMillis?.() || 0));
export const listarUsuarios = async () => (await getDocs(collection(db, 'users'))).docs.map(d => ({ uid: d.id, ...d.data() }));
export const listarTrilhasDe = async uid =>
  (await getDocs(collection(db, 'users', uid, 'trilhas'))).docs.map(d => ({ id: d.id, ...d.data() }));
export const estadoDe = (uid, tid) => carregarEstado(uid, tid);
