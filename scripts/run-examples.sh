#!/usr/bin/env bash
# Compile and run each example with aihc, and compare the output with
# examples/ID.out.
#
# Usage: scripts/run-examples.sh [--update]
#
# AIHC names the compiler. The default is aihc on the PATH. With --update,
# the script writes the new output to examples/ID.out and does not compare.
set -euo pipefail

update=""
if [[ "${1:-}" == "--update" ]]; then
  update=1
fi
root=$(cd "$(dirname "$0")/.." && pwd)
aihc="${AIHC:-aihc}"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

status=0
for source in "$root"/examples/*.hs; do
  id=$(basename "$source" .hs)
  expected="$root/examples/$id.out"
  cp "$source" "$work/$id.hs"
  (cd "$work" && "$aihc" build "$id.hs" --output "$work/$id" >"$work/$id.log" 2>&1) || {
    echo "FAIL $id: aihc build failed" >&2
    cat "$work/$id.log" >&2
    status=1
    continue
  }
  "$work/$id" >"$work/$id.out"
  if [[ -n "$update" ]]; then
    cp "$work/$id.out" "$expected"
    echo "updated $id"
  elif diff -u "$expected" "$work/$id.out"; then
    echo "ok   $id"
  else
    echo "FAIL $id: the output is different" >&2
    status=1
  fi
done
exit "$status"
