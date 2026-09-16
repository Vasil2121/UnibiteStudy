# Restructure playbook

Twelve phases converting `unibite-node` from flat route files into a layered
architecture: `database` / `api(routes + controllers)` / `store` on the server,
`api` / `shared` / `pages` on the client.

## How to run a phase

1. `/clear` in Claude Code
2. Paste the contents of the next `phase-XX-*.md`
3. Work through it, verify, review the report
4. Back up, then repeat

`CLAUDE.md` at the repository root is read automatically at the start of every
session. It holds the rules that apply to all phases — style rules, layer rules,
transaction pattern, grep checks. It survives `/clear`; the phase file does not.

Keep `CLAUDE.md` under about 150 lines. It is the only file loaded every time,
so phase detail must never leak into it.

## Files

| File | Purpose |
|---|---|
| `../../CLAUDE.md` | permanent conventions, loaded every session |
| `00-target-structure.md` | both target trees and the full migration map |
| `phase-00-baseline.md` | record current behaviour, change nothing |
| `phase-01-foundation.md` | `database/`, `middleware/`, `utils/` |
| `phase-02-allergens.md` | smallest domain, establishes the pattern |
| `phase-03-auth.md` | `users-store`, bcrypt and session stay in controller |
| `phase-04-profile.md` | first controller composing two stores |
| `phase-05-ratings.md` | first transaction across stores |
| `phase-06-requests.md` | state machine, hardest handler |
| `phase-07-admin.md` | aggregate queries, removes `[[x]]` destructuring |
| `phase-08-listings.md` | largest file, Haversine, photo upload |
| `phase-09-frontend-api.md` | `js/api/` and `js/shared/`, nothing user-visible |
| `phase-10-frontend-pages.md` | `js/pages/`, ES modules, HTML script tags |
| `phase-11-verification.md` | smoke tests, greps, ledger, concept report |

## Stop points

Wait for confirmation at the end of phases 00, 01, 02 and 08, and before 10.
Phase 02 sets the pattern every later domain copies — review it properly.
Phase 10 is the only phase that changes what the user sees.
