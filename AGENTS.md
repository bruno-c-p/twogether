# Regras de trabalho

## Validação obrigatória para qualquer alteração

- Toda alteração, independentemente de tamanho ou tipo (código, UI, estilos,
  textos, configuração, dependências ou documentação), exige validação do app
  em execução antes de encerrar a tarefa. Não omita essa etapa por considerar
  a mudança simples ou de baixo impacto.
- Inicie o app com Bun e use um navegador real para executar o fluxo afetado
  de ponta a ponta. Para alterações sem efeito direto na interface, faça ao
  menos um teste básico de carregamento e navegação do app e valide também
  o comportamento específico da alteração.
- Confira o resultado visual e a responsividade em desktop, tablet e celular,
  incluindo telas estreitas de 320px. Verifique cortes, sobreposições e rolagem
  horizontal indevida. Inspecione os temas claro e escuro quando houver UI.
- Exercite os controles e estados relevantes: filtros, troca de mês/pessoa,
  formulários, estados vazios, dados preenchidos, persistência após recarregar
  e ocultação de valores, conforme o fluxo afetado.
- Inspecione erros no console e requisições com falha. Corrija problemas
  introduzidos pela alteração e repita a validação do fluxo corrigido.
- Execute `bun run typecheck`, `bun run lint`, `bun run fitness`,
  `bun run test`, `bun run build`, `bun run e2e:must` e `git diff --check`.
  Se faltarem dependências, execute `bun install --frozen-lockfile` antes
  das verificações. Chromium do Playwright: `bunx playwright install chromium`.
- Testes automatizados, análise de código e build não substituem a validação
  no navegador. Não declare a tarefa concluída apenas com essas verificações.
- Use dados de teste isolados; preserve dados reais e trabalho não relacionado.
  Não publique nem faça deploy sem autorização.
- Se acesso, autenticação ou ferramentas impedirem alguma validação, informe
  o bloqueio concreto e o que falta verificar. Não apresente a alteração como
  totalmente validada; solicite somente a informação ou ação necessária para
  concluir a verificação.
- Na resposta final, registre sucintamente o que foi testado no app, os
  resultados das verificações automatizadas e quaisquer limitações reais.

## Sem mídia em `.github/`

- Não anexe, faça commit nem deixe screenshots ou vídeos sob `.github/`
  (sem `.github/assets`, sem dumps de imagens de PR nessa árvore).
- Validação visual continua no corpo do PR: imagens hospedadas/do agente e
  embeds markdown que não são arquivos em `.github/`.
- Não use o git do repositório como substituto para guardar essa mídia em
  outro caminho.

## Importações absolutas

- Importações de código-fonte do repositório devem usar o alias `@/` (`src/`),
  nunca caminhos relativos (`./` ou `../`).
- Não altere URLs públicas em runtime, `url()` em CSS, nem importações de
  pacotes externos.
- Mantenha os imports no topo do arquivo. Sem imports inline, salvo quando a
  toolchain exigir carregamento preguiçoso.
- Exceção: arquivos gerados que a toolchain reescreve com imports relativos
  (ex.: `src/routeTree.gen.ts` do TanStack Router). Não os edite para forçar o
  alias.
