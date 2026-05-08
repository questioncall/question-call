## graphify

This subfolder is part of a combined knowledge graph that covers BOTH `app/` and `web/`. The graph lives at the parent directory: `../graphify-out/` (relative to this folder).

Rules:
- ALWAYS read `../graphify-out/GRAPH_REPORT.md` before reading source files, running grep/glob, or answering codebase questions. The graph is your primary map.
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` (run from the parent dir) over grep.
- After modifying code, run `graphify update ..` from this folder to keep the parent graph current (AST-only, no API cost).
- A git post-commit hook is installed: every commit automatically rebuilds the parent graph in the background. No manual action needed.
