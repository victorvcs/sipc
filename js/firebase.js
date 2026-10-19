// Um único app Firebase para tudo: login, banco, App Check e IA.
// (Antes a IA rodava num segundo app separado, sem o login do aluno.)
// A firebaseConfig e o ID da chave do reCAPTCHA são públicos por design:
// quem protege os dados são as Regras do Firestore; quem protege a cota de IA
// é o App Check.
const V = 'https://www.gstatic.com/firebasejs/12.17.1/';
const { initializeApp } = await import(V + 'firebase-app.js');
const A = await import(V + 'firebase-auth.js');
const F = await import(V + 'firebase-firestore.js');
const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import(V + 'firebase-app-check.js');
const { getAI, getGenerativeModel, GoogleAIBackend } = await import(V + 'firebase-ai.js');

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

export const auth = A.getAuth(app);
export const db = F.getFirestore(app);
export const ia = getAI(app, { backend: new GoogleAIBackend() });

export const {
  onAuthStateChanged, signInWithPopup, signInWithRedirect, GoogleAuthProvider, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential,
  EmailAuthProvider, updateProfile, signOut,
} = A;
export const { doc, getDoc, setDoc, deleteDoc, collection, getDocs, addDoc, query, orderBy, serverTimestamp } = F;
export { getGenerativeModel };
