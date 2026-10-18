# SIPC — Guia de configuração (contas, banco de dados e IA)

Este guia explica como o `index.html` se liga ao Firebase para que cada pessoa tenha login próprio, dados salvos e isolados, e acesso à IA **sem precisar de chave nenhuma**. O arquivo publicado no GitHub **não contém senha, chave secreta nem chave do Gemini** — o que vai nele são identificadores públicos (a `firebaseConfig` e o ID da chave do reCAPTCHA), seguros por design.

O projeto Firebase usado é o `sipc-estudos`, no plano **Spark (sem custos)**.

## Passo 1 — Projeto no Firebase

Em [console.firebase.google.com](https://console.firebase.google.com), "Adicionar projeto". Não é preciso ativar o Google Analytics.

## Passo 2 — Login

**Build › Authentication › Sign-in method**: ative **E-mail/senha** e **Google**.

Em **Authentication › Configurações › Domínios autorizados**, adicione o domínio de publicação (`victorvcs.github.io`). Sem isso, o "Entrar com Google" funciona em `localhost` e falha no site publicado com `auth/unauthorized-domain`.

## Passo 3 — Banco de dados (Firestore)

**Build › Firestore Database › Create database**, modo **produção**, região `southamerica-east1`. Na aba **Rules**, cole o conteúdo de [`firestore.rules`](firestore.rules) e publique.

A regra garante que cada pessoa só lê e escreve em `users/{seu-uid}/sipc/...`. É ela — não o sigilo da configuração — que protege os dados.

## Passo 4 — Configuração pública do app

**Configurações do projeto › Seus apps › app Web (`</>`)**. Copie o objeto `firebaseConfig` para o `index.html` (procure por `firebaseConfig`, perto do topo).

A `apiKey` do Firebase **não é segredo**: só identifica o projeto. Pode (e deve) ir para o repositório público.

## Passo 5 — IA sem chave por usuário (Firebase AI Logic)

O SIPC chama o Gemini pelo **Firebase AI Logic**: a chave do Gemini fica guardada no próprio Firebase e ninguém precisa criar ou colar chave.

1. **AI Services › AI Logic › Começar** e escolha **Gemini Developer API** (sem custo financeiro). **Não** escolha "Agent Platform Gemini API", que exige faturamento.
2. Aceite os termos da API Gemini e conclua o assistente. O monitoramento de IA é opcional — deixamos **desligado** (AI Logic › Configurações).

O modelo usado está na constante `IA_MODELO` do `index.html`.

## Passo 6 — Proteção contra abuso (App Check + reCAPTCHA)

Sem isso, qualquer site poderia usar a cota de IA do projeto. A partir de **2/11/2026** o App Check é **obrigatório** para o AI Logic.

1. Em [console.cloud.google.com/security/recaptcha](https://console.cloud.google.com/security/recaptcha) (projeto `sipc-estudos`), crie uma chave: tipo **Web**, domínio `victorvcs.github.io`, **sem** desafio checkbox. **Não** adicione `localhost`.
2. Copie o **ID da chave** (começa com `6L…`) para a constante `RECAPTCHA_SITE_KEY` do `index.html`. Ele é público.
3. No Firebase, **Security › App Check › Apps**, registre o app web com **Fraud Defense (reCAPTCHA Enterprise)** usando esse ID.

Chave atual: `sipc-web`.

## Passo 7 — Publicar no GitHub Pages

O repositório `victorvcs/sipc` publica a branch `main` em `https://victorvcs.github.io/sipc/`. Cada push na `main` atualiza o site em um ou dois minutos.

## Testar localmente

Abrir o arquivo com duplo clique (`file://`) não serve: o login com Google e o App Check exigem um endereço `http://localhost`. Rode um servidor estático dentro da pasta do repositório, por exemplo:

```
npx --yes http-server -p 5500
```

e abra `http://localhost:5500`.

Em `localhost` o reCAPTCHA não vale (a chave só aceita o domínio publicado). O app gera então um **token de depuração** e o mostra na tela inicial e em **Configurações**. Cadastre-o uma vez em **App Check › Apps › ⋮ › Gerenciar tokens de depuração**. Esse token libera o acesso à IA: não publique nem compartilhe.

## O que cada modo faz

Quem abre o site vê a tela de entrar ou criar conta, com a opção "usar sem conta" (modo teste — nada é salvo). Com conta, matérias, progresso, sessões, questões, revisões e perfil ficam em `users/<uid>/sipc/...`, privados.

O app começa **zerado**: a pessoa cadastra o próprio edital (PDF ou texto colado), a IA separa matérias, pesos e tópicos, e a trilha é montada a partir disso.
