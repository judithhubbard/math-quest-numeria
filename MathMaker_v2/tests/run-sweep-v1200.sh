#!/bin/bash
# Full drive sweep for v1.20.0 (mirror brightness + Your Own Room rebuild).
cd /Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2
export NODE_PATH=$HOME/.claude/pw/node_modules
SUM=tests/logs/sweep-v1200-summary.txt
: > "$SUM"
for f in tests/drive-*.js; do
  d=$(basename "$f" .js)
  [ "$d" = "drive-marathon" ] && continue
  node "$f" > "tests/logs/${d}-v1200.log" 2>&1
  ec=$?
  fails=$(grep -c '^FAIL' "tests/logs/${d}-v1200.log")
  echo "$d exit=$ec fails=$fails" >> "$SUM"
done
echo DONE >> "$SUM"
