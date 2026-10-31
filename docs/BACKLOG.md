# SIPC — Backlog de funcionalidades

Pedidos do Victor ainda não implementados. Dívidas técnicas ficam em `DEBITO_TECNICO.md`.

Registrado em 31/10/2026.

## Próximo: discursiva e raciocínio lógico

**Pedido (31/10/2026).** Treino de discursiva: a pessoa informa a banca e a temática, escreve no editor do app ou manda a foto do que escreveu no papel, e a IA corrige e dá feedback. O sistema mostra a estrutura de redação daquela banca, como um gabarito modelo, com o que ela pede, a partir de provas discursivas corrigidas. O estudo é em passos: primeiro exercícios só de estrutura e ideias, depois os passos seguintes. Faltam também questões de raciocínio lógico.

**Aguardando.** O Victor vai mandar uma "colinha" com o material que já fez. Não começar antes de receber.

**Em aberto.** Pela regra de IA do produto, a estrutura da banca precisa vir de fontes reais e citadas. Falta definir como obter e guardar essas provas, porque a busca na internet feita pelo app ainda não existe.

## 1. Escolher o cargo antes de ler o edital

**Pedido.** Em edital grande, com vários cargos, a pessoa escolhe o cargo e só então o sistema puxa as matérias.

**Motivo.** Um edital grande falhou na leitura, com `[500] This model is currently experiencing high demand`, e misturar cargos gera matérias erradas.

**Decisão de 31/10/2026 (Victor).** O cargo é obrigatório: sem ele, a pessoa não segue e o edital não é lido. Assim a IA lê só as matérias daquele cargo.

**Ponto de partida.** O app já tem `S.filtroCargo`, que `extrairEdital` usa para considerar um só cargo.

## 2. Cronograma do concurso

**Pedido.** Ao enviar o edital, o sistema monta o cronograma daquele concurso, com as datas importantes, para o candidato não esquecer, e depois notifica.

**Regra.** Havendo retificação do edital, o candidato atualiza o PDF, ou envia só o novo cronograma.

**Em aberto.** Canal de notificação (no próprio app, e-mail ou push). O app não tem backend próprio, e o plano continua gratuito (decisão em `DEBITO_TECNICO.md`, item 1).

## 3. Novidades e central de ajuda

**Pedido.** Toda funcionalidade nova entra como novidade para o usuário, explicando o que ela faz, e entra também na central de ajuda, que funciona como manual de uso do sistema.

**Regra de trabalho.** A partir daqui, cada funcionalidade publicada atualiza as novidades e a central de ajuda.
