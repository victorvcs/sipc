# SIPC — Débito técnico e decisões adiadas

Este arquivo registra o que se sabe que está incompleto, **por que foi deixado assim** e o que dispara a hora de resolver. Nada aqui é descuido: são escolhas conscientes de quem está validando um protótipo, não operando um produto.

Atualizado em 13/09/2026.

---

## 1. Cada usuário precisa da própria chave de API

**Situação.** Para gerar conteúdo de estudo e questões, cada pessoa tem que criar uma chave no Google AI Studio (ou na Anthropic) e colá-la em *Configurações*. A chave fica no `localStorage` do navegador dela.

**Por que está assim.** O SIPC é um HTML estático, servido pelo GitHub Pages, sem backend. Sem servidor não existe lugar seguro para uma chave compartilhada: qualquer chave embutida no arquivo fica visível no código-fonte da página, e qualquer pessoa poderia copiá-la e gastar por conta de quem a colocou lá.

**Por que não foi resolvido agora.** O projeto está em fase de validação, com um único usuário. Construir a infraestrutura de proxy antes de saber se o sistema presta seria decidir arquitetura no escuro — inclusive sem conhecer o custo por pessoa, que é justamente o número que só o uso real revela.

**O que dispara a resolução.** O primeiro uso com pessoas que não sejam o autor. Em particular, o uso como instrumento de coleta em pesquisa com participantes, previsto no resumo do projeto: pedir que um participante crie conta no Google AI Studio inviabiliza o estudo.

**Como se resolve.** Um proxy que guarde a chave do lado do servidor:

```
hoje:      navegador --[chave do usuário]--> provedor
com proxy: navegador --> servidor próprio --[chave única]--> provedor
```

Caminhos possíveis, a avaliar quando chegar a hora:

- **Firebase Cloud Functions** — natural, já que o Firebase está montado. Exige o plano Blaze (pago por uso); o projeto está no Spark hoje.
- **Cloudflare Workers / Vercel** — camada gratuita sem cartão, funcionam bem como proxy fino, independentes do Firebase.
- **Firebase AI Logic** — produto da Google feito para chamar Gemini a partir do cliente sem expor chave. Falta confirmar se também exige Blaze.

**Consequência a não esquecer.** Com proxy, todo o uso de todos os usuários passa a ser custo de quem mantém o sistema. Isso torna obrigatório um limite por usuário — sem ele, uma única pessoa entusiasmada consome o crédito de todos em uma tarde.

### O atalho que não deve ser tomado

Quando chegar a hora de testar com outras pessoas, vai parecer prático simplesmente **mandar a própria chave para os testadores colarem**. É a pior das três opções, e vale registrar o porquê antes que a ideia pareça boa numa sexta-feira à noite:

- A chave fica **na mão deles**, utilizável em qualquer outro projeto, sem que o dono saiba.
- **Todos dividem a mesma cota** — no plano gratuito do Gemini o limite é por chave, não por pessoa. Alguns testadores simultâneos se derrubam com `429`.
- **Não dá para revogar o acesso de um** sem revogar o de todos.

As duas opções legítimas continuam sendo: cada pessoa com a própria chave (o desenho atual, com atrito), ou o proxy (sem atrito, com custo e limite por usuário). Não existe meio-termo seguro.

### Nota sobre vocabulário

No plano gratuito do Gemini não se gasta **dinheiro**, se gasta **cota**: requisições por minuto e por dia, sem cartão e sem fatura. O consumo só vira custo financeiro ao migrar para o plano pago ou para a Anthropic. Confundir os dois leva a decidir arquitetura por medo de uma conta que ainda não existe.

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

## 4. App Check não está configurado

**Situação.** A `firebaseConfig` é pública por design, e as Regras de Segurança do Firestore protegem os dados de cada usuário. Mas nada impede que alguém use essa configuração para criar contas em massa e consumir cota do projeto.

**Por que está assim.** É uma camada a mais de configuração, que atrapalharia a fase de teste sem trazer benefício enquanto o app tem um usuário.

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
