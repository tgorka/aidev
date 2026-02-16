Delegate a task to a background OpenCode agent session.

Follow these steps:

1. Ask the user what task to delegate (if not already provided).
2. Run the task using: `opencode run "<task description>"`
3. Monitor the output in the terminal.
4. Report the result back to the user.

Use this when:

- You want to run a parallel task in a separate agent session.
- The task is self-contained and doesn't require current conversation context.

Notes:

- OpenCode configuration is in `opencode.json` at the project root.
- OpenCode rules are in `AGENTS.md` at the project root.
- Available commands are in `.opencode/command/`.
