Delegate a task to the OpenCode CLI agent.

Follow these steps:

1. Ask the user what task to delegate (if not already provided).
2. Run the task using: `opencode run "<task description>"`
3. Monitor the output in the terminal.
4. Report the result back to the user.

Use this when:

- You want a second AI agent to work on a parallel task.
- The task is self-contained and doesn't require IDE context.
- You want OpenCode's specific capabilities (e.g., different model, background execution).

Notes:

- OpenCode configuration is in `opencode.json` at the project root.
- OpenCode rules are in `AGENTS.md` at the project root.
- OpenCode commands are in `.opencode/command/`.
