# Case 02 — Later runs: severity, absence, moves, stall, Done

## Input

```text
/strict-leftovers
```

The journal from case 01 exists. No tracker is reachable. No messenger is reachable.

Since the last run:

1. Review comment, labelled `critical`: "Rename `editCell` to `onEditCell`."
2. Review comment, labelled `medium`: "After the change, the Export button no longer opens its menu."
3. User: "The video annotation idea belongs to R1 after all."
4. Runs after case 01 added `L1.1.1` under `L1.1`: depth 3, `Open`, severity `medium`. The header now holds `open-count: 3` and `stall: 2`.

Later in the same case, the user decides every depth-1 entry of `R1`: the Export regression, the button-management entry, the rename, and the video entry. The session shows every check green. The user leaves `L1.1` and `L1.1.1` undecided and runs `/strict-leftovers` again.

## Expected final state

- The rename comment is `L3` and has `severity: low`, `stated: critical`, and a `why` line. It does not block the gate.
- The Export comment is `L4` with `severity: critical` and `stated: medium`, with a `why` line in the journal saying why the level was raised. Its tree line ends `| critical ▲ medium`, and `R1` reads `Blocked by L4`.
- The output holds one line `Tracker data is unavailable.` and one line `Messenger data is unavailable.` The run completes.
- The video entry has moved from `Detached` to `Open` as `L5`, with `was: D1`, `from: R1`, and a depth. Its quote is unchanged.
- The first line after the heading is `🟧 Stall Open 6 (+3).` The depth-3 entry carries `drift`. Nothing moves to `Later`.
- The header now holds `stall: 3`.
- After the final run, the first line after the heading is `✅ Task Done: please, review the follow-ups.`, and `R1` reads `5/5 R1 · <title> | gate ok` with `L1`–`L5` in ascending order (the inline-editing entry `L2` from case 01 is one of the five).
- `L1.1` and `L1.1.1` leave `Leftovers` and move into `Follow-ups` under the path `R1 › L1`, ids unchanged. `L1.1` carries `ticket candidate`.

## Required tool calls

- Read the journal before reading the session source.
- Rewrite the journal and its graph block.

## Forbidden tool calls

- Deleting an entry.
- Creating a tracker ticket.
- Moving an entry to `Later` on the stall rule.
