# ai-workspace

Personal workspace for working with AI (Claude Code) on mockup.
**Committed** with the repo — this is my own project.

## Structure

```
ai-workspace/
  tasks/            ← tasks; status = the folder the file lives in
    1-backlog/      ← raw ideas, not ready yet
    2-todo/         ← ready to pick up
    3-inprogress/   ← doing now  ← ENTRY POINT: whatever is here is what we do
    4-done/         ← archive (clean out every N weeks)
  notes/            ← anything freeform: guides, deep-dives, links (flat files)
```

## How it works (protocol)

1. **Current task = whatever is in `3-inprogress/`.** There is no separate board — the
   folder IS the board. Nothing duplicates the state, so nothing can go stale. Start a
   session by reading the file(s) in `3-inprogress/`.
2. **Status = folder.** Changing a task's status = moving its file:
   `tasks/2-todo/x.md` → `tasks/3-inprogress/x.md`. Numeric prefixes keep the folders in
   workflow order under alphabetical sort. No manual `status:` fields.
3. **Journal lives inside the task file.** What was done in a session and what was learned
   goes into the "Journal" section at the bottom of the task file. No separate `sessions/`
   folder: the task is its own history.
4. **Small things in `tasks/`, big things grow into `notes/`.** If a task grows into an
   initiative, make `notes/<initiative>-plan.md` (plan + decisions) and link to it from the
   task file.
5. **`notes/` is flat.** Guides, deep-dives, links — separate files with clear names. No
   nested folder tree. Screenshots, if any → `notes/assets/`.

## Boundary with auto-memory

`~/.claude/.../memory/` — **permanent facts**, loaded every session.
`ai-workspace/` — **working material**: current tasks and notes. Don't duplicate:
fact-forever → memory, working material → here.

## Claude's role

At the end of a substantive session Claude moves the task between folders
(`3-inprogress` → `4-done`) and appends to the task's "Journal". Entry point for the
session is wired via `CLAUDE.md`.

## Task file template

File name — kebab-case by topic: `some-task.md`.

```markdown
---
title: Short task name
created: 2026-01-01
tags: [area]
links:
  plan: ../../notes/some-plan.md    # if part of an initiative
---

## Goal
What I want and why.

## Context / what I found
Facts from investigation. Links to code (`src/.../File.ts:42`).

## Steps
- [ ] ...

## Journal
- 2026-01-01 — what I did, where I stopped.
```

## Reproduce in a new project

```bash
mkdir -p ai-workspace/{tasks/{1-backlog,2-todo,3-inprogress,4-done},notes}
```
