# SIPC — Guia de configuração (contas reais + banco de dados)

Este guia explica como ligar o arquivo `sipc-standalone.html` a um banco de dados de verdade, para que cada pessoa que usar o site tenha login próprio e seus dados fiquem salvos e isolados dos de qualquer outra pessoa. O arquivo já publicado no GitHub **não contém nenhuma senha, chave secreta ou credencial de banco de dados** — o que você vai colar nele é uma configuração pública do Firebase, que é segura por design (a explicação de por quê está mais abaixo). Sem esse passo, o site continua funcionando normalmente, só que apenas em modo teste, sem salvar nada.

## Passo 1 — Criar um projeto no Firebase

Acesse [console.firebase.google.com](https://console.firebase.google.com), entre com sua conta Google e clique em "Adicionar projeto". Dê um nome (por exemplo, `sipc-estudos`) e siga o assistente até o fim — não é necessário ativar o Google Analytics para este uso.

## Passo 2 — Ativar login por e-mail e senha

Dentro do projeto, no menu lateral vá em **Build › Authentication**, clique em "Get started" e, na aba "Sign-in method", ative o provedor **E-mail/senha**.

## Passo 3 — Criar o banco de dados (Firestore)

No menu lateral, vá em **Build › Firestore Database** e clique em "Create database". Escolha o modo **produção** (production mode) e a região mais próxima de onde a maioria dos usuários vai acessar (por exemplo, `southamerica-east1` para o Brasil).

## Passo 4 — Colar as Regras de Segurança

Ainda no Firestore, vá na aba **Rules** e substitua o conteúdo por este:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/sipc/{doc} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Essa regra é o que garante a privacidade de verdade: mesmo que alguém tente ler ou escrever no banco diretamente, o Firestore só permite acesso a um documento dentro de `users/{uid}/...` se a pessoa autenticada for exatamente o dono daquele `uid`. É essa regra — não o sigilo da configuração — que protege os dados de cada pessoa. Clique em "Publish" para salvar.

## Passo 5 — Pegar a configuração pública do app

No menu lateral, clique na engrenagem ao lado de "Project Overview" e em **Configurações do projeto**. Role até "Seus apps" e clique no ícone `</>` para registrar um app da Web (não precisa marcar a opção de Firebase Hosting). Dê um apelido qualquer e clique em registrar. O Firebase vai mostrar um bloco de código parecido com este:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "sipc-estudos.firebaseapp.com",
  projectId: "sipc-estudos",
  storageBucket: "sipc-estudos.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

Copie esse objeto inteiro.

## Passo 6 — Colar no arquivo

Abra `sipc-standalone.html` num editor de texto e procure por `firebaseConfig` (fica perto do topo do arquivo). Substitua o objeto de exemplo pelo que você copiou no passo anterior. Salve o arquivo.

Note que essa `apiKey` do Firebase **não é um segredo** como uma senha de banco de dados tradicional — ela só identifica publicamente qual projeto Firebase o site está usando, algo parecido com o número de uma conta bancária: dá pra saber qual é a conta, mas não dá pra sacar dinheiro dela sem a autenticação de verdade, que é o que a regra do Passo 4 controla. Por isso ela pode (e deve) ir para um repositório público no GitHub sem problema.

## Passo 7 — Publicar no GitHub Pages

Suba o `sipc-standalone.html` (renomeado para `index.html`, se preferir) para um repositório no GitHub e ative o GitHub Pages nas configurações do repositório, apontando para a branch e a pasta onde o arquivo está. Em poucos minutos o site estará no ar com contas reais funcionando.

## O que cada modo faz, na prática

Com o Firebase configurado, quem abrir o site vê uma tela pedindo para entrar ou criar conta, com uma opção de "usar sem conta" que cai no modo teste — nada é salvo, dá para explorar o sistema livremente. Quando a pessoa cria uma conta ou entra com uma já existente, os dados dela (matérias, progresso, sessões de estudo, resultados de questões, perfil) passam a ser salvos automaticamente no Firestore, dentro de `users/<uid-da-pessoa>/sipc/...`, e ficam privados: mais ninguém — nem outra pessoa usando o mesmo site — consegue ler ou escrever ali, por causa da regra do Passo 4.

A chave da própria Anthropic (usada para gerar conteúdo de estudo e questões) continua sendo pedida individualmente a cada pessoa e fica salva só no navegador dela — o Firebase não guarda essa chave, nem ela passa a existir no código do site.

## Se quiser testar antes de publicar

Você pode abrir o `sipc-standalone.html` direto no navegador (duplo clique no arquivo) depois de colar a configuração do Firebase — funciona localmente do mesmo jeito que funcionaria já publicado, incluindo criar conta e salvar dados de verdade.
