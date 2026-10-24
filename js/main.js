// Ponte entre a interface (js/app.js, script comum com as funções chamadas
// pelos onclick, portado do protótipo) e os módulos de dados, IA e regras.
// A interface só conhece window.SIPC; quem fala com o Firebase é este módulo.
import * as fb from './firebase.js';
import * as store from './store.js';
import * as ia from './ia.js';
import { lerArquivo } from './leitura.js';
import * as videos from './videos.js';
import { planilhaParaEdital } from './nucleo/planilha.js';
import { agendar, avaliar, reabrir, vencidas, somarDias, ETAPAS } from './nucleo/revisao.js';
import { ritmo, filaDeTopicos, planoDoDia, chaveTopico, MIN_TOPICO } from './nucleo/trilha.js';
import { classificar, quadrante, ordenar } from './nucleo/prioridade.js';

const { auth } = fb;

// Mensagens do Firebase Auth em português (vieram do app antigo).
const ERROS_AUTH = {
  'auth/invalid-email': 'Esse e-mail não parece completo. Confira se tem @ e o domínio.',
  'auth/missing-password': 'Digite sua senha.',
  'auth/weak-password': 'A senha precisa de pelo menos 8 caracteres.',
  'auth/email-already-in-use': 'Já existe uma conta com esse e-mail. Use "Entrar na minha conta".',
  'auth/invalid-credential': 'E-mail ou senha não conferem.',
  'auth/wrong-password': 'E-mail ou senha não conferem.',
  'auth/user-not-found': 'E-mail ou senha não conferem.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
  'auth/network-request-failed': 'Falha de conexão: verifique sua internet.',
  'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de terminar.',
  'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Libere pop-ups para este site e toque de novo, ou entre com e-mail e senha.',
  'auth/cancelled-popup-request': 'Já havia uma janela do Google aberta. Termine o login nela ou feche e tente de novo.',
  'auth/account-exists-with-different-credential': 'Já existe uma conta com esse e-mail criada com senha: entre com e-mail e senha.',
  'auth/unauthorized-domain': 'Este endereço não está liberado no Firebase (Authentication › Configurações › Domínios autorizados).',
  'auth/operation-not-allowed': 'Esse jeito de entrar não está ativado no Firebase.',
  'auth/requires-recent-login': 'Por segurança, saia e entre de novo antes de trocar a senha.',
};
const traduzir = e => ERROS_AUTH[e?.code]
  || (/closing.hidden|database connection is closing/i.test(e?.message || '') ? 'O navegador interrompeu o login no meio. Toque de novo em "Continuar com Google".' : null)
  || (e?.message || String(e)).replace(/^Firebase: /, '');

// Só pela janela (popup). O redirecionamento não serve aqui: o login roda em
// sipc-estudos.firebaseapp.com e o site em github.io, e os navegadores atuais
// bloqueiam o armazenamento entre esses domínios, então a pessoa voltava sem
// login e sem aviso. Com a janela bloqueada, o app explica o que fazer.
// "select_account": o Google sempre mostra a lista de contas (com "Usar outra
// conta"), em vez de entrar direto na conta que está logada no navegador.
async function entrarGoogle() {
  const prov = new fb.GoogleAuthProvider();
  prov.setCustomParameters({ prompt: 'select_account' });
  await fb.signInWithPopup(auth, prov);
}

async function cadastrar({ nome, email, senha }) {
  const cred = await fb.createUserWithEmailAndPassword(auth, email, senha);
  await fb.updateProfile(cred.user, { displayName: nome });
  return cred.user;
}

async function trocarSenha(atual, nova) {
  const u = auth.currentUser;
  await fb.reauthenticateWithCredential(u, fb.EmailAuthProvider.credential(u.email, atual));
  await fb.updatePassword(u, nova);
}

window.SIPC = {
  auth, ADMIN_EMAIL: fb.ADMIN_EMAIL, debugToken: fb.debugToken, traduzir,
  entrarGoogle, cadastrar, trocarSenha,
  entrarEmail: (email, senha) => fb.signInWithEmailAndPassword(auth, email, senha),
  esqueciSenha: email => fb.sendPasswordResetEmail(auth, email),
  atualizarNome: nome => fb.updateProfile(auth.currentUser, { displayName: nome }),
  sair: () => fb.signOut(auth),
  store, ia, videos, lerArquivo, planilhaParaEdital,
  revisao: { agendar, avaliar, reabrir, vencidas, somarDias, ETAPAS },
  trilha: { ritmo, filaDeTopicos, planoDoDia, chaveTopico, MIN_TOPICO },
  prioridade: { classificar, quadrante, ordenar },
};

addEventListener('sipc-erro-salvar', e => window.aoErroSalvar && window.aoErroSalvar(e.detail));
// No celular o pagehide muitas vezes nem dispara: esconder a aba é o último
// momento confiável para guardar onde o aluno parou. Ao voltar, relê o estado
// (pode ter estudado em outro aparelho nesse meio-tempo).
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { window.guardarProgresso && window.guardarProgresso(); store.salvarAgora(); }
  else window.releEstado && window.releEstado();
});
addEventListener('pagehide', () => { store.salvarAgora(); });

fb.onAuthStateChanged(auth, u => window.aoMudarLogin(u));
