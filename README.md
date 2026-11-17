# HelpLoop

Help one, get helped by one, and meet someone new each time. A study-help exchange for KAIST students: helping earns time-bank credits and weekly lottery tickets, with a bonus for helping someone new.

Team Khela Hobe · KAIST ISE Freshmen Idea League, Mon 23 Nov 2026.

- `docs/SPEC.md`: product, reward rules and models, screens, data, metrics
- `docs/PLAN.md`: schedule, tickets, who owns what
- `docs/CODEX_START.md`: step-by-step prompts for Codex (start here)
- `AGENTS.md`: rules for both coding agents (Claude Code reads it through `CLAUDE.md`)
- `src/lib/model/`: reward logic with tests (already done)
- `supabase/migrations/0001_init.sql`: schema and access rules; `supabase/tests/run_local.sh` verifies them

## Run locally
```bash
pnpm install
cp .env.example .env.local   # Supabase URL and keys
pnpm dev
pnpm test
PGHOST=localhost PGUSER=postgres ./supabase/tests/run_local.sh   # needs a local Postgres 16+
```
