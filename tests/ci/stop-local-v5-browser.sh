#!/usr/bin/env bash
# Stop only the local Buyer V5 server started by prepare-local-v5-browser.sh.
set -euo pipefail
pid="${CI_LOCAL_CONFIG_PID:-}"
pid_file="${CI_LOCAL_CONFIG_PID_FILE:-/tmp/m2d-local-v5-browser-server.pid}"
if [[ -z "$pid" && -f "$pid_file" ]]; then pid=$(cat "$pid_file"); fi
if [[ -z "$pid" ]]; then
  echo "CI_LOCAL_V5_FIXTURE_STOP: no local server was started"
  exit 0
fi
if [[ ! "$pid" =~ ^[0-9]+$ ]]; then
  echo "::error::Invalid local V5 fixture process id"
  exit 2
fi
process_state() {
  ps -p "$pid" -o stat= 2>/dev/null | awk '{print $1}'
}

is_active_process() {
  local state
  state=$(process_state)
  [[ -n "$state" && "${state:0:1}" != "Z" ]]
}

command_line=$(ps -p "$pid" -o args= 2>/dev/null || true)
if ! is_active_process; then
  echo "CI_LOCAL_V5_FIXTURE_STOP: server process already exited"
elif [[ "$command_line" != *local-buyer-config-server.mjs* ]]; then
  echo "::error::Refusing to stop a process that is not the local Buyer fixture"
  exit 3
else
  kill -TERM "$pid"
  for _ in $(seq 1 10); do
    if ! is_active_process; then break; fi
    sleep 1
  done
  if is_active_process; then kill -KILL "$pid"; fi
  for _ in $(seq 1 5); do
    if ! is_active_process; then break; fi
    sleep 1
  done
  if is_active_process; then
    echo "::error::Local Buyer fixture process did not stop"
    exit 4
  fi
  echo "CI_LOCAL_V5_FIXTURE_STOP_PASS: process $pid stopped"
fi
rm -f "$pid_file"
