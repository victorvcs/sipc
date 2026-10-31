// Vídeos por tópico, tocando dentro do app (antes o link abria o YouTube em
// outra aba). A busca usa a API do YouTube com uma chave restrita ao domínio
// do SIPC; o resultado de cada tópico vai para um cache compartilhado no
// Firestore (videos/{id}), porque a cota gratuita é de ~100 buscas por dia
// para o projeto inteiro e o mesmo tópico serve para todos os alunos.
import { YOUTUBE_KEY } from './firebase.js';
import { lerVideos, gravarVideos } from './store.js';
import { slug } from './nucleo/iautil.js';
import { tentativasBusca, selecionarVideos, selecionarAberto } from './nucleo/videobusca.js';

export const temChave = () => !!YOUTUBE_KEY;
const idVideos = (materia, topico) => `${slug(materia)}__${slug(topico)}`;
const ID_OK = /^[A-Za-z0-9_-]{11}$/;

// "PT1H2M3S" → segundos
export function duracaoISO(iso) {
  const m = String(iso || '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
}

async function api(caminho, params) {
  const url = 'https://www.googleapis.com/youtube/v3/' + caminho + '?' + new URLSearchParams({ ...params, key: YOUTUBE_KEY });
  const r = await fetch(url);
  if (!r.ok) throw new Error(r.status === 403 ? 'a cota diária de vídeos acabou; amanhã volta' : 'não consegui buscar os vídeos (' + r.status + ')');
  return r.json();
}

async function buscarUmaVez(q) {
  const busca = await api('search', { part: 'snippet', type: 'video', maxResults: '12', q,
    relevanceLanguage: 'pt', regionCode: 'BR', safeSearch: 'strict', videoEmbeddable: 'true' });
  const ids = (busca.items || []).map(i => i.id && i.id.videoId).filter(id => ID_OK.test(id || ''));
  if (!ids.length) return [];
  const det = await api('videos', { part: 'snippet,contentDetails,statistics', id: ids.join(',') });
  return (det.items || []).map(v => ({
    id: v.id, t: String(v.snippet.title || '').slice(0, 160), c: String(v.snippet.channelTitle || '').slice(0, 80),
    seg: duracaoISO(v.contentDetails && v.contentDetails.duration), views: +(v.statistics && v.statistics.viewCount) || 0,
  })).filter(v => ID_OK.test(v.id));
}

// Até 5 vídeos de aula, de 3 a 30 minutos, do mais visto para o menos visto.
// Se nenhuma tentativa achar, abre a duração sobre o que já veio.
async function buscarNoYouTube(materia, topico) {
  const achados = new Map();
  for (const q of tentativasBusca(materia, topico)) {
    (await buscarUmaVez(q)).forEach(v => achados.set(v.id, v));
    const certos = selecionarVideos([...achados.values()]);
    if (certos.length) return certos;
  }
  return selecionarAberto([...achados.values()]);
}

export async function obterVideos({ materia, topico, uid }) {
  const id = idVideos(materia, topico);
  const salvo = await lerVideos(id).catch(() => null);
  if (salvo && Array.isArray(salvo.itens)) return salvo.itens.filter(v => v && ID_OK.test(v.id));
  if (!YOUTUBE_KEY) return null; // sem chave configurada: o app mostra o aviso
  const itens = await buscarNoYouTube(materia, topico);
  if (uid && itens.length) gravarVideos(id, { itens, materia: String(materia).slice(0, 300), topico: String(topico).slice(0, 300), uid, criadoEm: new Date().toISOString() }).catch(() => {});
  return itens;
}
