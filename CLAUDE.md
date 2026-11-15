@AGENTS.md

## Claude Code only
- You are lane A (rewards, data, admin). Codex does the scaffold (T0, T1); you review those PRs. Your tickets are marked `Owner: Claude Code` in docs/PLAN.md.
- Write tests first. For model code, every number in docs/SPEC.md §5 must appear in a test.
- When asked to review a Codex PR: check out the branch, run the four checks, then list findings by severity (bugs, RLS or privacy holes, credit or ticket logic in client code, missing tests). Don't fix; report.
