# twogether

Orçamento compartilhado para **duas pessoas**, com TanStack Start, React, TypeScript e Bun.

## Executar

Requer Bun 1.3.14+ e Node.js 22.12+ para as ferramentas de build. O servidor roda com Bun e seu SQLite nativo.

```sh
bun install
cp .env.example .env.local
# Preencha as variáveis abaixo em .env.local
bun run dev
```

- `RESEND_API_KEY`: chave do Resend, somente no servidor.
- `RESEND_FROM`: remetente de um domínio verificado no Resend, como `Twogether <acesso@seu-dominio.com>`.
- `APP_ORIGIN`: origem da aplicação, sem caminho. Local: `http://localhost:3000`. Para testar em outro dispositivo, use um endereço acessível a ambos e abra o app por esse mesmo endereço. Produção exige HTTPS.
- `BUDGET_DATABASE_PATH`: caminho do banco, padrão `./data/twogether.sqlite`.

Reinicie o servidor após alterar o ambiente. Em `bun run dev`, o acesso local usa o e-mail informado para encontrar ou criar a conta diretamente no SQLite e não envia mensagens pelo Resend; esse atalho só existe com `NODE_ENV=development`. Fora do desenvolvimento, sem a configuração do Resend, o aplicativo não envia links de acesso.

## Acesso e casal

1. Em desenvolvimento, informe o e-mail para entrar diretamente; se ainda não existir, a conta é criada e segue para o onboarding. Nos demais ambientes, receba um link mágico pelo Resend. Não existe senha nem distinção entre cadastro e login.
2. No desenvolvimento, a conta nova segue diretamente para o nome; nos demais ambientes, abra o link e pressione Continuar. Na primeira visita, informe seu nome.
3. Comece o orçamento ou aceite um convite. Convites podem acompanhar o e-mail de acesso.
4. Em **Nosso espaço**, gere e copie um convite para seu par. O link aceita uma única pessoa, expira em 48 horas e pode ser cancelado. Gerar outro invalida o anterior.

O link de acesso expira em 15 minutos, funciona uma vez e autentica somente quem tem acesso ao e-mail. Sessões duram 30 dias. Sair revoga a sessão atual. Ambos veem e editam todos os dados do casal; cada conta pertence a apenas um orçamento e o banco limita cada orçamento a duas pessoas.

## Orçamento

- Transações com descrição, valor, data, meta, tags e **quem recebeu/pagou**; por padrão, a pessoa atual.
- Visão **Nós** e filtros individuais. O valor planejado de cada meta sempre usa a renda total do casal, mesmo com um filtro individual ativo.
- Seis metas fixas com percentuais editáveis que somam 100%: custo fixo 30%, prazeres 10%, conforto 15%, metas 15%, liberdade financeira 25% e conhecimento 5%. A divisão vale para todos os meses.
- Edição, exclusão e desfazer por transação, busca e filtros por meta, tipo e tag. Valores em centavos inteiros.
- Autoria original e última pessoa que editou preservadas, independentemente de quem pagou.
- Atualização automática a cada 5 segundos enquanto a página está visível e ao voltar à aba. Alterações concorrentes no mesmo lançamento ou nos percentuais são rejeitadas com orientação para revisar a versão atual; inclusões independentes não se sobrescrevem.

## Persistência e publicação

SQLite no servidor (`data/`, ignorado pelo Git), com transações, sessões e tokens armazenados por hash. Cookies HttpOnly/SameSite e Secure sob HTTPS. API valida origem, dados, membros e versões no servidor; respostas não são cacheadas. Env e credenciais não integram o bundle cliente.

Esta entrega roda localmente. Publicação requer servidor Bun com disco persistente, backups do SQLite e as variáveis de produção. Não use disco efêmero nem várias réplicas com bancos separados. O build gera cliente e servidor em `dist/`; o adaptador de hospedagem deve servir os assets e o handler TanStack com Bun. E-mails são transacionais; o app não dispara convites para terceiros automaticamente.

## Verificação

```sh
bun run typecheck
bun run lint
bun run test
bun run build
```

Vitest cobre cálculos/validação; Bun testa SQLite, isolamento, limite de membros, convites, acesso por link, expiração, edição concorrente e contrato HTTP. E-mail é substituído por um transporte de teste nos testes, sem enviar mensagens reais.

Referências: [rotas de servidor do TanStack Start](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes), [API de envio do Resend](https://resend.com/docs/api-reference/emails/send-email).
