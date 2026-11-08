# QA — SIPC v1.8 — 08/11/2026

## Resumo
Modo: regressão focada no que mudou na v1.8. Ambiente: local (localhost:5502, branch `feature/v1.8`).
11 cenários novos (CT-19 a CT-29), 11 executados. Bugs: 0 alta, 1 média, 2 baixa, todos corrigidos.
Veredito: pronto para publicar, com os testes em produção da Cobertura feitos pelo Victor depois.

## Bugs
### BUG-01 — Alerta de Novidades listava a v1.7 (média) — corrigido
- Onde: `js/ajuda.js`, `DESTAQUES`.
- Aconteceu: o alerta "Novidades na versão 1.8" mostrava "Ver o seu domínio" e "Achar tudo no menu novo".
- Correção: destaques da v1.8 (agenda e primeira redação), com prints novos em `img/novidades/datas.jpg` e `evolucao.jpg` (dados de exemplo).

### BUG-02 — Data do aluno ia para a agenda como "data do edital" (baixa) — corrigido
- Onde: `js/nucleo/cronograma.js` (Google, Outlook e .ics).
- Correção: data do aluno leva "Data que você adicionou no SIPC."

### BUG-03 — "Cronograma atualizado com 1 datas" (baixa, anterior à v1.8) — corrigido
- Onde: `js/datas.js`, `lerDatas`.

## Usabilidade
- O texto de abertura da aba Datas ficou longo no celular. Foi encurtado; o lembrete de retificação aparece como nota só quando há data perto.
- O link "Baixar todas para qualquer agenda (.ics)" fica um pouco recuado por causa do padding do botão-link; igual aos outros links do app.

## Segurança
- Nenhuma mudança nas Regras do Firestore. O cache de vídeos usa um id novo a cada 30 dias, criado com as Regras atuais; só o admin apaga.
- O .ics é gerado no navegador, com o texto escapado (`;`, `,`, `\`, quebras de linha) e linhas de no máximo 75 bytes (testes).
- Os nomes das datas continuam passando por `escHtml` na tela.

## Cobertura
- **Não testado com IA real:** em localhost a IA responde 403 (App Check sem token de depuração). A leitura de vários arquivos e as questões foram testadas com a IA simulada; a qualidade da resposta da IA com vários arquivos só dá para ver em produção.
- **Não testado com login:** gravação no Firestore, Admin real (botão de apagar vídeos), cache de vídeos com a chave real.
- **Não testado:** abrir o .ics no Outlook, Google e iPhone de verdade; link do Outlook com conta de trabalho; notificação do navegador.
- Testes automatizados de navegador (Playwright) não foram criados: o projeto não tem Playwright instalado.

## Testes automatizados
`npm test`: 144 testes, todos passando (novos: Outlook, .ics, retificação, vários arquivos, cache de 30 dias, evolução com uma redação).
