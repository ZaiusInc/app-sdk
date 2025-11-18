Launch the node-fetch migration sub-agent to automatically migrate this package from node-fetch to native fetch API.

The agent will:
- Identify all node-fetch usage
- Check for public API breaking changes
- Update imports and add stream and other needed conversions
- Clean up package.json
- Run tests and build
- Report breaking changes and version bump requirements

Use the Task tool with subagent_type="general-purpose" and load the prompt from .claude/agents/migrate-from-node-fetch.md
