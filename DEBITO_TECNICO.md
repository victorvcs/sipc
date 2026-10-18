# SIPC — Débito técnico e decisões adiadas

Este arquivo registra o que se sabe que está incompleto, **por que foi deixado assim** e o que dispara a hora de resolver. Nada aqui é descuido: são escolhas conscientes de quem está validando um protótipo, não operando um produto.

Atualizado em 18/10/2026.

---

## 1. ~~Cada usuário precisa da própria chave de API~~ — resolvido em 18/10/2026

**O que era.** Cada pessoa precisava criar uma chave no Google AI Studio (ou na Anthropic) e colá-la em *Configurações*. Isso inviabilizava o uso por participantes de pesquisa.

**Como foi resolvido.** A IA passou a ser chamada pelo **Firebase AI Logic** (provedor *Gemini Developer API*, plano Spark, sem custo). A chave do Gemini fica guardada no próprio Firebase; o HTML publicado não tem chave, e o usuário não configura nada. O abuso da cota por outros sites é barrado pelo **App Check com reCAPTCHA Enterprise** (chave `sipc-web`, só para `victorvcs.github.io`). Detalhes no guia de configuração.

**O que continua valendo do raciocínio anterior.**

- Todo o uso de todos os usuários agora sai **da mesma cota do projeto**. No plano gratuito isso não vira dinheiro, vira indisponibilidade: quando a cota do minuto ou do dia estoura, todos recebem `429` ao mesmo tempo. O app repete a chamada até 4 vezes, mas não faz milagre.
- O AI Logic tem limite **por usuário por minuto** (padrão 100), mas **não tem limite diário por pessoa**. Uma pessoa entusiasmada ainda pode consumir a cota do dia de todos. Se isso acontecer, as saídas são: ativar o *Modo de usuários autenticados* (AI Logic › Configurações — exige que a IA use o login do app, ver item 7) ou contar uso por usuário no Firestore.
- **Não** voltar a pôr chave no código, nem distribuir a própria chave a testadores: continua sendo a pior opção, pelos motivos registrados no histórico deste arquivo.

**O que dispara rever.** Erros `429` frequentes, ou uso com muitos participantes simultâneos (pesquisa). Nesse ponto, avaliar o plano pago (Blaze) com orçamento e alerta de gasto.

---

## 2. Login com Google vai falhar na primeira publicação

**Situação.** O botão "Entrar com Google" funciona em `localhost`, mas vai retornar `auth/unauthorized-domain` assim que o site for publicado.

**Causa.** O Firebase só aceita fluxo OAuth vindo de domínios autorizados. `localhost` já vem na lista por padrão; o domínio do GitHub Pages, não.

**Correção.** Console do Firebase → *Authentication* → *Configurações* → *Domínios autorizados* → adicionar o domínio de publicação. A mensagem de erro no app já aponta esse caminho.

---

## 3. O resgate por regex esconde respostas cortadas

**Situação.** Quando o JSON das questões vem truncado, o código recupera por expressão regular apenas as questões completas e segue em frente, sem avisar.

**Efeito.** A pessoa clica em "Gerar 10 questões" e pode receber seis, sem nenhuma indicação de que algo falhou.

**Estado atual.** Mitigado: o orçamento de tokens subiu de 4096 para 12000, e em teste real as 10 questões vieram completas, sem acionar o resgate. O resgate continua no código como rede de segurança.

**O que falta.** Avisar na interface quando o resgate for acionado — algo como "vieram 6 das 10 questões". Hoje a degradação é silenciosa, e degradação silenciosa é a que mais engana.

---

## 4. App Check só protege a IA, não o login nem o Firestore

**Situação.** Desde 18/10/2026 o App Check (reCAPTCHA Enterprise) está ativo e **aplicado ao Firebase AI Logic** — obrigatório a partir de 2/11/2026. Authentication e Firestore continuam sem App Check: nada impede que alguém use a `firebaseConfig` pública para criar contas em massa. Os dados de cada usuário seguem protegidos pelas Regras de Segurança.

**Por que está assim.** O app compat (login e banco) e o app modular (IA) são instâncias separadas (item 7); estender o App Check ao compat é mais uma camada de configuração sem benefício enquanto o uso é pequeno.

**O que dispara a resolução.** Publicação com divulgação real, ou qualquer sinal de uso anômalo no console.

---

## 5. Provedor Google ativado no Authentication sem necessidade original

**Situação.** O provedor Google foi ativado no console antes de existir botão no app. O botão foi implementado depois, então hoje está coerente.

**Nota.** Registrado apenas para quem for auditar a configuração e estranhar a ordem dos fatos.

---

## 6. `legado/dashboard.html`

**Situação.** Versão anterior do sistema, presa ao concurso DATAPREV e sem Firebase. Não é mais a versão viva.

**Por que foi mantida.** Referência histórica da evolução do projeto — pode ser útil na dissertação para mostrar o caminho entre o protótipo específico e o sistema generalizado.

**O que dispara a remoção.** Nada urgente. Se nunca for citada na dissertação, pode sair.

---

## 7. A IA roda num app Firebase separado, sem login

**Situação.** O AI Logic só existe no SDK modular do Firebase; o resto do app usa o SDK *compat*. Para não reescrever o app inteiro, a IA roda num segundo app Firebase (`sipc-ia`) do mesmo projeto, carregado num `<script type="module">`. Esse app não conhece o login do usuário.

**Consequência.** Não dá para ativar o *Modo de usuários autenticados* do AI Logic sem antes migrar o app para o SDK modular (ou compartilhar a autenticação entre os dois). Hoje, quem usa "sem conta" (modo teste) também gera conteúdo e questões.

**O que dispara a resolução.** Abuso de cota (item 1) ou necessidade de atribuir uso de IA a cada participante.

---

## 8. Token de depuração do App Check para testar em localhost

**Situação.** Em `localhost` o reCAPTCHA não vale. O app gera um token de depuração (guardado no `localStorage`) e o mostra na tela; ele precisa ser cadastrado uma vez em *App Check › Apps › ⋮ › Gerenciar tokens de depuração*. Até ser cadastrado, a IA local responde `401 App Check token is invalid`.

**Cuidado.** O token libera o acesso à IA do projeto sem reCAPTCHA. Não publicar, não commitar, e apagar do console quando não for mais usado.

---

## 9. Questões sempre no formato A–E

**Situação.** O gerador sempre produz múltipla escolha com 5 alternativas. Bancas como o Cebraspe usam itens **Certo/Errado**, e algumas provas usam 4 alternativas.

**O que falta.** Guardar o formato da prova no edital (detectável pela IA na leitura do PDF) e gerar no formato certo.

