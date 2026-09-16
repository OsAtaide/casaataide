# Orientações para futuras sessões

## Contexto

CASAQUEST é um app Next.js App Router em TypeScript estrito com Neon/PostgreSQL. A experiência tem três perfis: pai (administração), criança em `adventure` e adolescente em `pro`. A experiência principal é mobile-first, mas deve continuar boa em tablet e desktop.

## Regras de trabalho

- Preserve o escopo por etapa; não implemente loja, notificações ou streak avançado sem pedido explícito.
- Reutilize as regras puras em `lib/domain`; não recalcule níveis ou saldos dentro de componentes.
- XP e moedas devem passar por operações transacionais no Neon/PostgreSQL e por seus respectivos ledgers.
- Nunca confie em `family_id`, `child_id` ou `role` enviados pelo cliente; valide sessão, família e autorização no servidor. Antes de consultas da família, use uma transação com `SET LOCAL app.family_id` derivado da sessão.
- PIN infantil deve ser armazenado apenas como hash. Nunca use texto simples.
- Toda nova tabela de negócio deve ter isolamento por família, timestamps, índices adequados e política RLS.
- Prefira exclusão lógica e preservação de histórico.
- Textos da interface são em português brasileiro; não remova labels ou contraste por estética.
- Não declare validação concluída sem executar os comandos relevantes e testar a largura mobile.

## Fluxo sugerido

1. Leia `README.md`, `package.json` e esta orientação.
2. Verifique `git status` e o schema/migrations antes de editar banco.
3. Faça mudanças pequenas e valide com `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`.
4. Quando alterar interação visual, abra a aplicação em navegador e confirme o fluxo real.
5. Nunca faça commit, push ou deploy sem autorização explícita.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
