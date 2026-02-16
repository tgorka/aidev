#!/bin/bash
# agent-audit.sh — Cross-agent audit hook for Cursor
# Captures structured JSONL entries for all agent activity (pr-create, bmad-worker, etc.)
# Called by Cursor hooks: stop, subagentStop, afterShellExecution

set -euo pipefail

PROJECT_DIR="${CURSOR_PROJECT_DIR:-.}"
LOG_DIR="${PROJECT_DIR}/_logs"
LOG_FILE="${LOG_DIR}/agent-audit.jsonl"

# Read JSON input from stdin
json_input=$(cat)

# Create log directory if needed
mkdir -p "${LOG_DIR}"

# Build timestamp
timestamp=$(date -u '+%Y-%m-%dT%H:%M:%S.000Z')

# Extract hook event name from input (provided by Cursor)
hook_event=$(echo "$json_input" | jq -r '.hook_event_name // "unknown"' 2>/dev/null || echo "unknown")

# Extract key fields depending on hook type
conversation_id=$(echo "$json_input" | jq -r '.conversation_id // "unknown"' 2>/dev/null || echo "unknown")
model=$(echo "$json_input" | jq -r '.model // "unknown"' 2>/dev/null || echo "unknown")

# Build the log entry
log_entry=$(jq -n \
  --arg ts "$timestamp" \
  --arg event "$hook_event" \
  --arg conv_id "$conversation_id" \
  --arg model "$model" \
  --argjson input "$json_input" \
  '{
    timestamp: $ts,
    event: $event,
    conversation_id: $conv_id,
    model: $model,
    input: $input
  }' 2>/dev/null)

# If jq fails, write a simpler entry
if [ $? -ne 0 ] || [ -z "$log_entry" ]; then
  log_entry="{\"timestamp\":\"${timestamp}\",\"event\":\"${hook_event}\",\"raw\":\"hook-parse-error\"}"
fi

# Append to log file
echo "$log_entry" >> "${LOG_FILE}"

# Exit successfully — never block agent execution
exit 0
