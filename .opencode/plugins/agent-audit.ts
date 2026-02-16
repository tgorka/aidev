/**
 * Cross-agent audit plugin for OpenCode.
 * Captures structured JSONL entries for all agent activity
 * (pr-create, bmad-worker, and any future agents).
 *
 * Logs are written to `_logs/agent-audit.jsonl` in append-only format
 * for offline processing, error analysis, and performance tracking.
 */

import type { Plugin } from "@opencode-ai/plugin";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

interface AuditEntry {
  timestamp: string;
  event: string;
  [key: string]: unknown;
}

async function writeLog(directory: string, entry: AuditEntry): Promise<void> {
  const logDir = join(directory, "_logs");
  const logPath = join(logDir, "agent-audit.jsonl");

  try {
    await mkdir(logDir, { recursive: true });
    const line = JSON.stringify(entry) + "\n";
    await appendFile(logPath, line, "utf8");
  } catch {
    // Never block agent execution due to logging failures
  }
}

export const AgentAuditPlugin: Plugin = async ({ directory }) => {
  const log = (event: string, data: Record<string, unknown> = {}) =>
    writeLog(directory, {
      timestamp: new Date().toISOString(),
      event,
      ...data,
    });

  // Log plugin initialization
  await log("plugin.init", { plugin: "agent-audit" });

  return {
    // Session lifecycle
    event: async ({ event }) => {
      if (event.type === "session.idle") {
        await log("session.idle", { sessionData: event });
      }
      if (event.type === "session.error") {
        await log("session.error", { sessionData: event });
      }
      if (event.type === "session.created") {
        await log("session.created", { sessionData: event });
      }
    },

    // Tool execution tracking
    "tool.execute.after": async (input, output) => {
      // Log shell/bash commands (gt, gh, git, bun)
      if (input.tool === "bash" || input.tool === "shell") {
        const command = String(output?.args?.command ?? input?.args?.command ?? "");
        if (/\b(gt|gh|git|bun)\b/.test(command)) {
          await log("tool.shell", {
            tool: input.tool,
            command,
          });
        }
      }

      // Log file edits
      if (input.tool === "write" || input.tool === "edit") {
        await log("tool.file", {
          tool: input.tool,
          file: output?.args?.filePath ?? input?.args?.filePath,
        });
      }
    },
  };
};
