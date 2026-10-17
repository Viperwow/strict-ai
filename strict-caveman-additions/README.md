# strict-caveman-additions

Always-on rules for agent replies, added on top of a compression style. The compression style wins every conflict.

```
/plugin install strict-caveman-additions --marketplace Viperwow/strict-ai
```

- Paragraphs: one topic, at most six sentences.
- Warnings: a command first, then a short reason.
- English: simple tenses, no `-ing` noun forms.
- Russian: simplified technical Russian, ГОСТ Р 58049-2017 section 8.2.

Hooks load the rules at session start and remind on every prompt. Disable the plugin to turn them off.

Hooks ship for Claude Code only. On other hosts, load `SKILL.md` and its `references/` through that host's own rules mechanism.

Requires `python3` on `PATH`. On Windows, the Microsoft Store `python3` alias is only a stub; install Python with that alias working, or the hooks fail.

Tests: `python3 strict-caveman-additions/hooks/test_inject.py`
