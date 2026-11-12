// v1.10 — Admin › Desenvolvimento: lê sozinho o arquivo de métricas do PC do Victor.
// Na primeira vez ele escolhe o arquivo (metricas-sipc.json do Painel de
// desenvolvimento). O navegador guarda só a "permissão para ler aquele arquivo"
// (no IndexedDB deste site, neste aparelho); nenhuma senha ou chave fica salva.
// Depois, ao abrir o Admin, o app relê o arquivo e, se for mais novo, grava os
// totais no Firestore para aparecerem também no celular.
// Só Chrome e Edge no computador têm essa leitura; nos outros, escolher o arquivo
// à mão continua funcionando.
import * as store from './store.js';
import { normalizar, maisNovo, custo, CATEGORIAS, VALOR_HORA_PADRAO } from './nucleo/metricasdev.js';

const BANCO = 'sipc-admin', LOJA = 'arquivos', CHAVE = 'metricas-dev';
export const leituraAutomatica = () => typeof window !== 'undefined' && 'showOpenFilePicker' in window;

function abrirBanco() {
  return new Promise((ok, erro) => {
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(LOJA);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
}
async function guardarArquivo(h) {
  const db = await abrirBanco();
  await new Promise((ok, erro) => { const t = db.transaction(LOJA, 'readwrite'); t.objectStore(LOJA).put(h, CHAVE); t.oncomplete = ok; t.onerror = () => erro(t.error); });
}
async function arquivoGuardado() {
  try {
    const db = await abrirBanco();
    return await new Promise(ok => { const r = db.transaction(LOJA).objectStore(LOJA).get(CHAVE); r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null); });
  } catch { return null; }
}
export async function esquecerArquivo() {
  try { const db = await abrirBanco(); db.transaction(LOJA, 'readwrite').objectStore(LOJA).delete(CHAVE); } catch {}
}

// Lê, confere e grava se for mais novo que o salvo. Devolve {metricas, mudou}.
async function importarTexto(texto, salvo) {
  const m = normalizar(texto);
  if (!maisNovo(m, salvo)) return { metricas: salvo, mudou: false };
  await store.gravarMetricasDev(m);
  return { metricas: m, mudou: true };
}

// Estado do arquivo lembrado: 'nenhum' | 'pedir' (precisa de um clique) | 'ok'.
export async function situacao() {
  if (!leituraAutomatica()) return 'nenhum';
  const h = await arquivoGuardado();
  if (!h) return 'nenhum';
  try { return (await h.queryPermission({ mode: 'read' })) === 'granted' ? 'ok' : 'pedir'; } catch { return 'nenhum'; }
}

// Ao abrir a aba: tenta reler sozinho (sem clique), se o navegador já deixa.
export async function atualizarSozinho(salvo) {
  if ((await situacao()) !== 'ok') return { metricas: salvo, mudou: false };
  const h = await arquivoGuardado();
  return importarTexto(await (await h.getFile()).text(), salvo);
}

// Com um clique: pede de novo a permissão (o Chrome oferece "Permitir sempre").
export async function atualizarComClique(salvo) {
  const h = await arquivoGuardado();
  if (!h) return escolherArquivo(salvo);
  if ((await h.requestPermission({ mode: 'read' })) !== 'granted') throw new Error('Sem permissão para ler o arquivo.');
  return importarTexto(await (await h.getFile()).text(), salvo);
}

// Primeira vez (ou trocar o arquivo).
export async function escolherArquivo(salvo) {
  const [h] = await window.showOpenFilePicker({ types: [{ description: 'Métricas do SIPC', accept: { 'application/json': ['.json'] } }], excludeAcceptAllOption: false, multiple: false });
  const r = await importarTexto(await (await h.getFile()).text(), salvo);
  await guardarArquivo(h);
  return r;
}

// Navegadores sem leitura automática: <input type="file">.
export const importarArquivo = async (file, salvo) => importarTexto(await file.text(), salvo);

export const carregar = () => store.lerMetricasDev().catch(e => {
  // Sem as regras novas publicadas o Firestore recusa: a aba ainda mostra o arquivo.
  if (e && e.code === 'permission-denied') return null;
  throw e;
});
export { custo, CATEGORIAS, VALOR_HORA_PADRAO };
