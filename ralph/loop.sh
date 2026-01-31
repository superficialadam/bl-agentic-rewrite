#!/bin/bash
# Ralph Loop — non-interactive batch mode using claude -p
# Runs claude in pipe mode, streams JSON to log files, displays progress via jq
#
# Usage:
#   ./loop.sh research [max]   # Research mode — study & document the existing app
#   ./loop.sh build [max]      # Build mode — implement from research findings
#   ./loop.sh [max]            # Build mode (default)
#   ./loop.sh                  # Build mode, unlimited

set -euo pipefail
cd "$(dirname "$0")"

# Parse mode and iterations
if [ "${1:-}" = "research" ]; then
    MODE="research"
    PROMPT_FILE="PROMPT_research.md"
    MAX_ITERATIONS=${2:-0}
elif [[ "${1:-}" =~ ^[0-9]+$ ]]; then
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=$1
else
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=0
fi

if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: $PROMPT_FILE not found (run from ralph/ directory)"
    exit 1
fi

mkdir -p logs

ITERATION=0
CURRENT_BRANCH=$(git -C .. branch --show-current)
STOP_FILE=".loop-stop"

# Clean up any stale stop file from previous runs
rm -f "$STOP_FILE"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Mode:   $MODE"
echo "Prompt: $PROMPT_FILE"
echo "Branch: $CURRENT_BRANCH"
[ "$MAX_ITERATIONS" -gt 0 ] && echo "Max:    $MAX_ITERATIONS iterations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

while true; do
    if [ "$MAX_ITERATIONS" -gt 0 ] && [ "$ITERATION" -ge "$MAX_ITERATIONS" ]; then
        echo "Reached max iterations: $MAX_ITERATIONS"
        break
    fi

    ITERATION=$((ITERATION + 1))
    TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
    LOGFILE="logs/loop-${MODE}-${ITERATION}-${TIMESTAMP}.jsonl"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  LOOP $ITERATION$([ "$MAX_ITERATIONS" -gt 0 ] && echo " / $MAX_ITERATIONS")  |  $MODE  |  $(date '+%H:%M:%S')"
    echo "  Log: $LOGFILE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Run claude in pipe mode with streaming JSON output
    cat "$PROMPT_FILE" | claude -p \
        --dangerously-skip-permissions \
        --output-format stream-json \
        --verbose \
        2>&1 | tee "$LOGFILE" | jq -r --unbuffered '
        if .type == "system" and .subtype == "init" then
            "  ⚙  Model: \(.model // "unknown")"
        elif .type == "assistant" then
            (.message.content[]? |
                if .type == "text" and (.text | length) > 0 then
                    "  💬 \(.text | gsub("\n"; "\n     ") | .[0:300])"
                elif .type == "tool_use" then
                    "  🔧 \(.name)" + (
                        if .name == "Read" then " → \(.input.file_path // "")"
                        elif .name == "Write" then " → \(.input.file_path // "")"
                        elif .name == "Edit" then " → \(.input.file_path // "")"
                        elif .name == "Bash" then " → \(.input.command // "" | .[0:120])"
                        elif .name == "Glob" then " → \(.input.pattern // "")"
                        elif .name == "Grep" then " → \(.input.pattern // "")"
                        elif .name == "Task" then " → \(.input.description // "")"
                        else ""
                        end
                    )
                else empty
                end
            )
        elif .type == "result" then
            "\n  ✅ Done | Cost: \(.cost_usd // "?") | Duration: \(.duration_ms // "?" | if type == "number" then (. / 1000 | tostring + "s") else . end) | Turns: \(.num_turns // "?")"
        else empty
        end
    ' 2>/dev/null || true

    echo ""
    echo "  Log saved: $LOGFILE"

    # Show summary from log
    if [ -f "$LOGFILE" ]; then
        SUMMARY=$(jq -r 'select(.type=="result") | "  Tokens: \(.usage.input_tokens // "?") in / \(.usage.output_tokens // "?") out | Cost: $\(.cost_usd // "?")"' "$LOGFILE" 2>/dev/null || echo "  (no result summary)")
        echo "$SUMMARY"

        # Context window usage — peak from last assistant turn
        CTX=$(jq -s -r '
            [ .[] | select(.type=="assistant" and .message.usage) | .message.usage |
                (.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0) + (.output_tokens // 0)
            ] | if length > 0 then
                max as $peak | "  Context: \($peak)/200000 (\($peak * 100 / 200000 | floor)%)"
            else "  Context: unknown"
            end
        ' "$LOGFILE" 2>/dev/null || echo "  Context: unknown")
        echo "$CTX"
    fi

    # Check for stop signal
    if [ -f "$STOP_FILE" ]; then
        echo ""
        echo "  🏁 Stop signal received — research/build complete"
        rm -f "$STOP_FILE"
        break
    fi

    # Push changes
    echo "  Pushing..."
    git -C .. push origin "$CURRENT_BRANCH" 2>/dev/null || git -C .. push -u origin "$CURRENT_BRANCH" 2>/dev/null || echo "  (push failed or nothing to push)"

    echo ""
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Ralph loop finished: $ITERATION iterations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
