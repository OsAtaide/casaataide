# CASAQUEST — Guardiões da Base

Fundação inicial do CASAQUEST: uma experiência mobile-first que transforma responsabilidades da casa em missões, progresso e conquistas.

> Cumpra missões. Ganhe conquistas. Evolua sua Base.

## Escopo desta etapa

Esta entrega contém a base visual, seleção de perfil e dashboards para Jennifer Ataide (9 anos, Modo Aventura), Richardson Ataide (13 anos, Modo Pro) e o pai (Central de Comando). O fluxo de entrada possui sessão server-only e modo demonstração local; a autenticação real usa o Neon quando configurado. Missões, histórico, recompensas, relatório operacional, streak e escudos já estão preparados em rotas server-only. Notificações push e publicação em produção dependem de credenciais e configuração externa, por isso não são simuladas.

## Rodando localmente

Requisitos: Node.js 20.9+ e npm.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`.

Comandos de qualidade:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Neon / PostgreSQL

1. Crie um projeto e um branch no Neon.
2. Copie a connection string para `DATABASE_URL` e crie um `SESSION_SECRET` forte em `.env.local`.
3. Defina `CASA_FAMILY_ID` com o UUID da família cadastrada. O script de seed informa esse UUID ao finalizar.
4. Aplique `migrations/202609090001_initial_schema.sql` com o SQL Editor do Neon ou com uma ferramenta de migrations.
5. Aplique `migrations/202609090002_auth_sessions.sql` depois da primeira migration.
6. O schema inclui `family_id`, índices, RLS nativa do PostgreSQL e funções transacionais para XP e moedas. O cliente nunca deve atualizar saldo diretamente.
7. A migration de autenticação adiciona `email`, `password_hash` e `auth_sessions`. O hash é feito com `crypto.scrypt`; nenhum PIN ou senha é salvo em texto simples.
8. A camada de sessão define `app.family_id` dentro da transação antes de consultar dados da família. O valor vem da sessão validada, nunca do body da requisição.
9. Em produção HTTPS, use `SECURE_COOKIES=true` (no Vercel o cookie seguro é ativado automaticamente). Para `localhost` em HTTP, mantenha `SECURE_COOKIES=false`.
10. O schema Drizzle está em `lib/neon/schema.ts`, a configuração em `drizzle.config.ts` e os scripts disponíveis são `npm run db:generate`, `npm run db:migrate` e `npm run db:studio`. As transações críticas continuam usando o driver Neon serverless diretamente para preservar a atomicidade da operação PostgreSQL.

Para reproduzir o cadastro inicial sem salvar credenciais em arquivos, defina temporariamente `CASA_PARENT_EMAIL`, `CASA_PARENT_PASSWORD`, `CASA_JENNIFER_PIN` e `CASA_RICHARDSON_PIN` no processo e execute `npm run db:seed:family`. O script é idempotente por e-mail do pai.

Para o `localhost` continuar conectado ao Neon depois de reiniciar o terminal, copie `.env.example` para `.env.local` e preencha apenas na máquina local `DATABASE_URL`, `SESSION_SECRET`, `SECURE_COOKIES=false`, `CASA_FAMILY_ID` e `CASA_FAMILY_NAME`. O arquivo `.env.local` permanece ignorado pelo Git e nunca deve ser enviado ao navegador.

Não coloque `DATABASE_URL` ou `SESSION_SECRET` no navegador nem versione `.env.local`.

## Estrutura

- `app/`: App Router, layout, página inicial, manifest e estilos globais.
- `components/`: shell visual, dashboards e primitivas no estilo shadcn/ui.
- `data/`: dados temporários de demonstração.
- `lib/domain/`: regras puras de nível, missões e recompensas.
- `lib/neon/`: cliente server-only do Neon.
- `lib/neon/schema.ts` e `drizzle.config.ts`: schema tipado e configuração do Drizzle Kit.
- `lib/auth/`: hash de credenciais, sessão HTTP-only e tipos de autenticação.
- `app/api/auth/`: login, sessão atual e logout.
- `scripts/seed-family.mjs`: seed transacional da primeira família, sem credenciais embutidas.
- `migrations/`: SQL versionado compatível com Neon/PostgreSQL.
- `tests/`: testes unitários de domínio.

## Rotas disponíveis

O primeiro fluxo real de missões está disponível nas rotas server-only e na Central de Comando:

- `GET /api/missions`: lista as missões da família; criança vê somente as próprias.
- `POST /api/missions`: responsável cria uma missão para um ou mais filhos.
- `PATCH /api/missions/:assignmentId`: responsável arquiva ou restaura uma missão sem apagar o histórico.
- `POST /api/missions/:assignmentId/complete`: criança conclui uma missão.
- `POST /api/missions/:assignmentId/approve`: responsável aprova uma missão aguardando revisão.
- `PATCH /api/missions/:assignmentId` com `action=update`: responsável edita uma missão sem alterar snapshots históricos.
- `POST /api/missions/:assignmentId/return`: responsável devolve com justificativa.
- `POST /api/missions/:assignmentId/excuse`: responsável justifica sem recompensa ou penalidade.
- `POST /api/missions/:assignmentId/evidence`: criança envia uma foto privada de até 2 MB.
- `POST /api/missions/penalties/settle`: responsável fecha ocorrências vencidas e aplica penalidades idempotentes ao Cofre Semanal.

O responsável também pode criar uma missão pela seção “Nova missão”, escolhendo os filhos, dificuldade, prioridade e aprovação obrigatória. Todas as rotas exigem sessão, definem `app.family_id` dentro da transação e usam `apply_xp_transaction`/`apply_coin_transaction` para registrar recompensas.

O módulo de recompensas usa `GET/POST /api/rewards`, solicitações infantis em `POST /api/rewards/:rewardId/redeem` e revisão do responsável em `POST /api/rewards/redemptions/:redemptionId/resolve`. O pedido só desconta moedas quando aprovado.

O relatório operacional está disponível para o responsável em `GET /api/reports/summary`, com filtro opcional `from=YYYY-MM-DD&to=YYYY-MM-DD`.

As migrations `202609140001_profile_ages.sql`, `202609140002_ledger_idempotency.sql`, `202609140003_streak_engine.sql` e `202609140004_streak_shield_usage.sql` devem ser aplicadas depois das migrations iniciais. Elas preenchem as idades informadas, impedem lançamentos duplicados, calculam streak pelo limiar da família e registram o uso idempotente de escudos.

A migration `202609140004_streak_shield_usage.sql` adiciona o registro de consumo de escudos. Um guardião pode proteger um dia elegível em `POST /api/streaks/shield/use`; o servidor valida a família, o saldo de escudos e a taxa de conclusão antes de consumir o escudo.

A migration `202609160001_mission_engine.sql` adiciona snapshots de recompensa, regras de atraso, datas de início/fim, devolução, justificativa, evidência e `weekly_vaults`/`vault_transactions`. Como o ambiente atual não possui um provedor de Object Storage definido, a evidência usa um adapter de desenvolvimento privado no Neon, limitado a imagens pequenas; a interface deve ser trocada por storage de objetos com URL temporária antes de armazenar volume maior em produção.

## Preparação para produção

Antes de publicar, configure no ambiente do servidor `DATABASE_URL`, `SESSION_SECRET`, `CASA_FAMILY_ID` e `SECURE_COOKIES=true`, aplique todas as migrations em um branch Neon de produção e valide login, permissões, transações e responsividade. Push notifications exigem VAPID/provedor e não fazem parte desta entrega.

### Publicação na Vercel

O projeto é detectado automaticamente como Next.js pela Vercel. Configure estas variáveis em Project Settings → Environment Variables para `Production` e `Preview`:

- `DATABASE_URL`
- `SESSION_SECRET`
- `CASA_FAMILY_ID`
- `CASA_FAMILY_NAME`
- `SECURE_COOKIES=true`

Antes do primeiro uso real, aplique as migrations SQL versionadas no branch Neon de produção. Nunca coloque a connection string em commits, no código cliente ou em mensagens de log.
