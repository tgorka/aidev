# PROJECT — Project Rules

## Overview

PROJECT OVERVIEW

## Stack

- **Language**: TypeScript (strict mode, ES2024, ESM modules)
- **IaC Framework**: Pulumi v3 with Node.js 25 runtime (if needed)
- **Package Manager**: Bun >= 1.2 (officially supported by Pulumi — never use npm/yarn/pnpm)
- **Testing**: Vitest
- **Linting**: ESLint 9 (flat config)
- **Formatting**: Prettier

## Critical Rules

1. **Always use Bun** for package management: `bun install`, `bun add`, `bun run`, `bunx`.
2. **Never commit to `main`** — use Graphite `gt` for trunk-based development with PRs.
3. **Pulumi runtime is Node.js** — Bun is the package manager only.
4. **Communicate in Polish** with the user, but all code/comments/docs in English.

## Git Workflow

- Trunk-based development with Graphite CLI (`gt`).
- Create branches: `gt create -m "feat: description"`
- Submit PRs: `gt submit --publish --reviewers tgorka`
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `ci:`, `chore:`
- Always assign `tgorka` as reviewer.
- Run `bun run build && bun run lint && bun run test` before submitting.

## TypeScript Conventions

- ESM only (`import`/`export`, no `require`).
- Explicit return types on exported functions.
- Files: `kebab-case.ts`. Classes: `PascalCase`. Functions/vars: `camelCase`.
- Pulumi resource names: `kebab-case` (e.g., `"web-server"`, `"docker-network"`).
- Group imports: node built-ins → @pulumi/\* → third-party → local.

## Pulumi Patterns

- Use `ComponentResource` for grouping related resources.
- Use `pulumi.Config` for all configurable values — never hardcode.
- Export stack outputs for cross-stack or external consumption.
- Use `pulumi.runtime.setMocks()` for unit testing.

## Project Structure

```
src/           — Source code
dist/          — Compiled output (gitignored)
_bmad/         — BMAD framework modules and configuration
_state/        — Agent execution state (gitignored JSON, except bmad-progress-*.json)
_logs/         — Agent audit logs (gitignored JSON)
.worktrees/    — Git worktrees for parallel development (gitignored)
.cursor/       — Cursor IDE commands, rules, and cloud agent config
.opencode/     — OpenCode CLI commands
.devcontainer/ — Dev container configuration
.github/       — PR templates, CI workflows, issue templates
```

## Available Scripts

```bash
bun run build      # Compile TypeScript
bun run dev        # Watch mode compilation
bun run test       # Run tests (Vitest)
bun run test:watch # Watch mode tests
bun run lint       # ESLint
bun run format     # Prettier
```

## Environment Variables

Before running CLI tools that require authentication (`gh`, `gt`, `pulumi`, `cubic`), load tokens from `.env.local`:

```bash
set -a && source .env.local && set +a && export GH_TOKEN="${GITHUB_TOKEN:-}"
```

Tokens are stored in `.env.local` (gitignored). See `.env.example` for the template.
Key variables: `GITHUB_TOKEN`/`GH_TOKEN` (GitHub), `GT_TOKEN` (Graphite), `PULUMI_ACCESS_TOKEN` (Pulumi).

## Command State Files

Resumable commands store progress in `_state/` (gitignored). If a state file exists (e.g., `_state/create-pr.json`), the command should check it and resume from where it left off instead of starting fresh.

**Exception:** `_state/bmad-progress-*.json` files are git-tracked (not gitignored). These are persistent BMAD lifecycle progress files, one per worktree/project, that document the workflow execution history.

## Subagents

The project uses autonomous subagents for common workflows. Agents are defined in `.cursor/agents/` (Cursor) and `.opencode/agents/` (OpenCode).

### Available Agents

| Agent         | Description                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------- |
| `pr-create`   | Creates PRs via Graphite CLI with quality gates, AI review polling, and branch cleanup       |
| `pull-main`   | Syncs trunk branch, repairs git corruption, cleans up stale branches. Worktree-aware.        |
| `worktree`    | Manages git worktrees for parallel development (create, list, status, sync, close, switch)   |
| `bmad-worker` | Executes BMAD workflow steps with auto-discovery, lifecycle templates, and progress tracking |

### Worktree Workflow

The project supports parallel development via git worktrees. The `worktree` agent manages the lifecycle, while `pull-main` handles sync within each workspace.

**Key concepts:**

- Worktrees live in `.worktrees/<name>/` (gitignored).
- Each worktree has its own branch, `node_modules/`, and working tree.
- All worktrees share the same git object store (`.git/objects/`).
- `.env.local` is symlinked (not copied) to worktrees for token sharing.
- The `_state/worktrees.json` registry tracks worktree metadata (trunk branch, status).

**Typical flow:**

```bash
# Orchestrator creates a worktree for a feature
worktree operation=create name=feature-auth

# Switch context to the worktree
worktree operation=switch name=feature-auth

# Work happens in the worktree (coding, pr-create, etc.)
# ...

# Sync worktree with latest trunk changes
worktree operation=sync name=feature-auth

# After PR is merged, close the worktree
worktree operation=close name=feature-auth

# Sync the main workspace
pull-main
```

**Important constraints:**

- Git forbids checking out the same branch in two worktrees.
- Run `git fetch` from the main workspace only — never in parallel from multiple worktrees.
- Pulumi operations should run from one worktree at a time (shared stack).
- Git pack corruption affects all worktrees; repair from the main workspace.

## Agent Observability

All agents write structured JSON logs to `_logs/<agent-name>/` and track execution state in `_state/<agent-name>.json`. State files are always cleaned up after execution; log files persist for auditing.

## BMAD Framework

The project integrates BMAD (Build Method for AI Development) in `_bmad/`.
Commands are available in `.opencode/command/bmad-*` for product development workflows.

### BMAD Worker Auto-Discovery

The `bmad-worker` agent can automatically determine the next workflow task when invoked without explicit instructions. It uses:

- **`_bmad/_config/bmad-help.csv`** — master workflow catalog with phases and sequence numbers
- **`_state/bmad-progress-<name>.json`** — persistent progress files (git-tracked, one per worktree/project)

**Lifecycle templates** define which workflows are included when creating a new progress file:

- `full` (default) — complete greenfield project, all phases 1-4
- `feature` — add feature to existing project, phases 2-4
- `bugfix` — quick fix via Quick Spec + Quick Dev
- `brownfield` — quick changes with project context generation
- `minimal` — only required workflows, no optional steps

**Approval gates** — Create Brief, Create PRD, and Create Architecture require human approval before the agent proceeds to the next workflow.

**Worktree support** — progress files are named per worktree (e.g., `bmad-progress-feature-auth.json`). BMAD outputs are naturally isolated per worktree since `{project-root}` resolves to each worktree's root.

**Key parameters:**

```bash
# Auto-discover next task (uses progress file, creates one from template if missing)
bmad-worker

# Explicit template and subproject
bmad-worker template=feature subproject=packages/api

# Approve a gate workflow and continue
bmad-worker approve="bmm/2-planning/Create PRD"

# Skip optional workflows
bmad-worker skip-optional=true

# Reset lifecycle progress
bmad-worker reset-progress=true template=full
```
