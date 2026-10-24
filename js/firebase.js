// Um único app Firebase para tudo: login, banco, App Check e IA.
// (Antes a IA rodava num segundo app separado, sem o login do aluno.)
// A firebaseConfig e o ID da chave do reCAPTCHA são públicos por design:
// quem protege os dados são as Regras do Firestore; quem protege a cota de IA
// é o App Check.
const V = 'https://www.gstatic.com/firebasejs/12.17.1/';
// Em paralelo: em sequência eram 4 idas e voltas a mais antes da primeira tela.
// A IA (firebase-ai) só é baixada quando alguém gera conteúdo (ver obterIA).
const [{ initializeApp }, A, F, { initializeAppCheck, ReCaptchaEnterpriseProvider }] = await Promise.all([
  import(V + 'firebase-app.js'), import(V + 'firebase-auth.js'), import(V + 'firebase-firestore.js'), import(V + 'firebase-app-check.js'),
]);

export const firebaseConfig = {
  apiKey: 'AIzaSyBQzTX6AcgO16X5rlc8WJ0DACleECXSfrA',
  authDomain: 'sipc-estudos.firebaseapp.com',
  projectId: 'sipc-estudos',
  storageBucket: 'sipc-estudos.firebasestorage.app',
  messagingSenderId: '838344160832',
  appId: '1:838344160832:web:a78e3010975726391651a5',
};
export const RECAPTCHA_SITE_KEY = '6LdLwPUtAAAAAFuNqGyZsEV2KaRmNOoaZZj1b_wH';
export const IA_MODELO = 'gemini-3.6-flash';
export const ADMIN_EMAIL = 'victorvcs@gmail.com';
// Chave da API do YouTube (busca de vídeos por tópico). Pública por design,
// como a firebaseConfig: fica restrita no Google Cloud ao domínio do SIPC e só
// à YouTube Data API. Vazia = o app mostra o link de busca no lugar do player.
export const YOUTUBE_KEY = 'AIzaSyBdzpJ9STXt8uaSBUKaQBiiDJvkl4hSMWk'; // "SIPC YouTube (navegador)": só victorvcs.github.io e localhost:5500

export const app = initializeApp(firebaseConfig);

// Em localhost o reCAPTCHA não vale (a chave só aceita o domínio publicado):
// usa um token de depuração, cadastrado uma vez no console do App Check.
const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
export let debugToken = null;
if (local) {
  try { debugToken = localStorage.getItem('sipc::appcheck-debug'); } catch (e) {}
  if (!debugToken) { debugToken = crypto.randomUUID(); try { localStorage.setItem('sipc::appcheck-debug', debugToken); } catch (e) {} }
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
}
initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true });

// Sessão no localStorage, com o IndexedDB só de reserva. O Firebase Auth 12.x
// tranca o IndexedDB quando a página fica "escondida", e no navegador em tela
// cheia (Mac) a janela do Google esconde o SIPC: o login voltava com
// "Database is closing/hidden". Quem já tinha sessão no IndexedDB é migrado.
export const auth = A.initializeAuth(app, {
  persistence: [A.browserLocalPersistence, A.indexedDBLocalPersistence],
  popupRedirectResolver: A.browserPopupRedirectResolver,
});
export const db = F.getFirestore(app);

// Tokens do App Check de uso único para a IA: um token copiado de uma sessão
// legítima não serve para repetir chamadas fora do navegador.
let iaPronta = null;
export const obterIA = () => iaPronta ??= import(V + 'firebase-ai.js').then(({ getAI, getGenerativeModel, GoogleAIBackend }) =>
  ({ ia: getAI(app, { backend: new GoogleAIBackend(), useLimitedUseAppCheckTokens: true }), getGenerativeModel }));

export const {
  onAuthStateChanged, signInWithPopup, signInWithRedirect, GoogleAuthProvider, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential,
  EmailAuthProvider, updateProfile, signOut,
} = A;
export const { doc, getDoc, setDoc, deleteDoc, collection, getDocs, addDoc, query, orderBy, limit, serverTimestamp } = F;
