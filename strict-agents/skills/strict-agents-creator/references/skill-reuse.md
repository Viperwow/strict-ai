# Picking skills for the agent

Step 3 decides what the agent composes. Reuse beats create, and a missing helper never blocks the flow.

## Order

1. **Reuse what the survey found.** Step 1 already enumerated the skills available in this session. If one covers the need, add it to the agent's `skills:` and move on.
2. **Look wider — only if this session can.** The same survey tells you whether a skill-discovery skill is available. When one is, and nothing in the pool fits, use it to search for an installable skill. When none is available, skip straight to step 3.
3. **Inline the procedure.** Write the steps into the agent body. This is the normal outcome for a one-off need, not a fallback.

## Why the flow never depends on a named tool

This skill assumes nothing about which helpers exist. It reads the session's own skill list and adapts. A skill you name in a document becomes a dependency the moment the document assumes it — so the survey decides, not the prose.

Known discovery and authoring skills exist in the wider ecosystem — `find-skills` and `skill-creator` are the common ones — but treat them as examples of the *shape* of tool to look for, never as a requirement. If the survey does not turn one up, nothing in this flow changes.

## Extracting a reusable skill is a separate task

When the same gap will clearly recur across future agents, report it with the recurring-gap block in `references/output-contract.md` and stop there. Authoring a reusable skill has its own workflow, its own review, and its own eval. Starting it mid-flight derails the agent you were asked to build.

Inline the procedure now. Extract later, deliberately.
