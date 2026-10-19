// Tudo que toca o Firestore passa por aqui. Com o modo teste ligado, as
// escritas vão para a memória e somem ao desligar: o aluno testa a jornada
// sem mexer no próprio progresso.
import { db, doc, getDoc, setDoc, deleteDoc, collection, getDocs, addDoc, query, orderBy, serverTimestamp } from './firebase.js';

let teste = false;
const memoria = new Map();
export const modoTeste = () => teste;
export function setModoTeste(on) { teste = on; if (!on) memoria.clear(); }

const agora = () => new Date().toISOString();
async function ler(ref) {
  if (teste && memoria.has(ref.path)) return memoria.get(ref.path);
  return (await getDoc(ref)).data() ?? null;
}
async function gravar(ref, dados) {
  if (teste) { memoria.set(ref.path, { ...(memoria.get(ref.path) || {}), ...dados }); return; }
  await setDoc(ref, dados, { merge: true });
}

/* perfil */
export const carregarPerfil = uid => ler(doc(db, 'users', uid));
export const salvarPerfil = (uid, dados) => gravar(doc(db, 'users', uid), { ...dados, ultimoAcesso: agora() });

/* trilhas */
export async function listarTrilhas(uid) {
  const reais = (await getDocs(collection(db, 'users', uid, 'trilhas'))).docs.map(d => ({ id: d.id, ...d.data() }));
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
  if (teste) { memoria.set(`users/${uid}/trilhas/${tid}`, { excluida: true }); return; }
  await deleteDoc(doc(db, 'users', uid, 'trilhas', tid, 'estado', 'atual'));
  await deleteDoc(doc(db, 'users', uid, 'trilhas', tid));
}

/* estado de estudo (feito, revisões, parcial, questões, minutos, rascunhos) */
export const carregarEstado = (uid, tid) => ler(doc(db, 'users', uid, 'trilhas', tid, 'estado', 'atual'));
let pendente = null, ultimo = null;
export function salvarEstado(uid, tid, estado) {
  clearTimeout(pendente);
  ultimo = () => gravar(doc(db, 'users', uid, 'trilhas', tid, 'estado', 'atual'), estado);
  pendente = setTimeout(() => { const f = ultimo; ultimo = null; f && f(); }, 800);
}
// Grava na hora o que estiver pendente (ao sair da página ou trocar de trilha).
export function salvarAgora() { clearTimeout(pendente); const f = ultimo; ultimo = null; return f ? f() : Promise.resolve(); }

/* conteúdo gerado pela IA, compartilhado entre alunos */
export const lerConteudo = id => ler(doc(db, 'conteudos', id));
export const gravarConteudo = (id, dados) => gravar(doc(db, 'conteudos', id), dados);

/* feedback: sempre chega ao Victor, inclusive em modo teste (é para isso que o modo existe) */
export async function enviarFeedback(dados) {
  await addDoc(collection(db, 'feedback'), { ...dados, modoTeste: teste, criadoEm: serverTimestamp() });
}

/* administração (as Regras só deixam o admin ler) */
export const listarFeedback = async () =>
  (await getDocs(query(collection(db, 'feedback'), orderBy('criadoEm', 'desc')))).docs.map(d => ({ id: d.id, ...d.data() }));
export const listarUsuarios = async () => (await getDocs(collection(db, 'users'))).docs.map(d => ({ uid: d.id, ...d.data() }));
export const listarTrilhasDe = async uid =>
  (await getDocs(collection(db, 'users', uid, 'trilhas'))).docs.map(d => ({ id: d.id, ...d.data() }));
export const estadoDe = (uid, tid) => carregarEstado(uid, tid);
