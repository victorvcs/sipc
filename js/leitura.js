// Lê o arquivo que o aluno anexou no setup. PDF e Word viram texto (a IA
// organiza depois); planilha vira abas com linhas (planilhaParaEdital organiza
// sem IA). As bibliotecas só são baixadas quando alguém anexa aquele formato.

// Editais grandes trazem o conteúdo programático nos anexos, no fim do
// arquivo. Até o limite manda tudo; acima dele, manda o final.
export const LIMITE_CHARS = 150000;

const carregados = {};
function carregarScript(src) {
  return carregados[src] ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => { delete carregados[src]; reject(new Error('não foi possível carregar o leitor deste formato; confira a internet')); };
    document.head.appendChild(s);
  });
}

async function lerPdf(file) {
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  let texto = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const content = await (await pdf.getPage(p)).getTextContent();
    texto += content.items.map(it => it.str).join(' ') + '\n';
  }
  if (!texto.trim()) throw new Error('o PDF não tem texto selecionável (pode ser imagem escaneada); cole o texto do edital');
  return { tipo: 'pdf', paginas: pdf.numPages, texto: texto.slice(-LIMITE_CHARS) };
}

async function lerWord(file) {
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js');
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  if (!value.trim()) throw new Error('o documento Word está vazio');
  return { tipo: 'word', texto: value.slice(-LIMITE_CHARS) };
}

async function lerPlanilha(file) {
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
  const wb = XLSX.read(await file.arrayBuffer());
  const abas = wb.SheetNames.map(n => ({ nome: n, linhas: XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: true }) }));
  return { tipo: 'planilha', abas };
}

export async function lerArquivo(file) {
  const nome = file.name.toLowerCase();
  if (nome.endsWith('.pdf') || file.type === 'application/pdf') return lerPdf(file);
  if (/\.docx$/.test(nome)) return lerWord(file);
  if (/\.(xlsx|xls|csv|ods)$/.test(nome)) return lerPlanilha(file);
  if (/\.txt$/.test(nome)) return { tipo: 'texto', texto: (await file.text()).slice(-LIMITE_CHARS) };
  throw new Error('formato não suportado: use PDF, planilha ou Word (.docx)');
}
