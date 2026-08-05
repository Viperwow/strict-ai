# Component routing

A plugin is a container. Each thing inside it has an authoring standard, and that standard belongs to whichever creator owns that component type — not to this skill. Routing is what keeps one standard per component instead of a second one drifting here.

| Component | Route to | What that creator owns |
|---|---|---|
| skill | a skill creator | the frontmatter, the description that decides when it fires, the supporting assets |
| subagent | a subagent creator | the tools, the pinned model, the eval contract |
| script | a script creator | the runtime choice, the header, the verification run |
| hook | a hook creator | the event, the matcher, the payload it reads |
| command | this skill | a thin entry point; it has no separate standard |
| MCP server | an MCP builder | the server, its tools, its transport |

Survey what is available in the session before routing. A creator that is not installed is not a blocker: write the component here, to the standard the plugin already uses, and say which creator would have owned it.

## What routing does not delegate

The plugin manifest, the directory layout, the local install check, and the marketplace entry stay here. They describe the container, and no component creator can see the container.

## Gates travel with the component

A routed component keeps its own gates — a subagent still needs its golden case, a script still needs its verification run. Being inside a plugin does not clear them, and this flow does not clear them on the component's behalf.
