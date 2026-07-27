# Testing governance — proposals (living list)

Single source for ideas under discussion. Add items in chat; inline expansions from comments in parentheses.

- PRD, ADR documents first.
- Test cases and test scenarios for human verification with strict `.testing` checklist linking.
- Auto scoping of a repo.
- Layering the scoped repo.
- Setting short ids for each to rely on.
- Set severity layers on each layer and scope.
- Severity should also have an id.
- Write tests for scopes, layers and severity.
- Provide coverage based on severity level, layer and scope.
- Cover with specific checklist of tests.
- Red-green development.
- Add tests quality checks (e.g. mutational testing).
- Provide specific testing checklists for each layer.
- Different size of testing and multiple per PR (e.g. small one locally, affected code, then a large one).
- Use semantic / static tools: opengrep, semgrep, fuzz, eslint, … (perspective tools from dialog and from the internet).
- Adapt relevant data for AI (e.g. json, vectorized, yaml).
- Human-readable form nearby in another file ("specificity for a reader" first approach).
