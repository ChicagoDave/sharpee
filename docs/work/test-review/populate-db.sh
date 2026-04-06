#!/bin/bash
# Populate test inventory DB from vitest JSON output
set -e

DB="docs/work/test-review/tests.db"
TMPJSON="/tmp/sharpee-test-results.json"

# Packages with test suites and their directories
declare -A PACKAGES=(
  ["core"]="packages/core"
  ["engine"]="packages/engine"
  ["world-model"]="packages/world-model"
  ["stdlib"]="packages/stdlib"
  ["parser-en-us"]="packages/parser-en-us"
  ["lang-en-us"]="packages/lang-en-us"
  ["event-processor"]="packages/event-processor"
  ["character"]="packages/character"
  ["ext-basic-combat"]="packages/extensions/basic-combat"
)

for pkg in "${!PACKAGES[@]}"; do
  dir="${PACKAGES[$pkg]}"
  echo "Running tests for $pkg ($dir)..."
  cd "/Users/david/repos/sharpee/$dir"
  npx vitest run --reporter=json 2>/dev/null > "$TMPJSON" || true
  cd "/Users/david/repos/sharpee"

  python3 -c "
import json, sqlite3, sys

with open('$TMPJSON') as f:
    data = json.load(f)

db = sqlite3.connect('$DB')
cur = db.cursor()
count = 0

for tf in data.get('testResults', []):
    file = tf['name'].replace('/Users/david/repos/sharpee/', '')
    for tc in tf.get('assertionResults', []):
        suite = ' > '.join(tc.get('ancestorTitles', []))
        name = tc.get('title', '')
        full = f'{suite} > {name}' if suite else name
        status = tc.get('status', 'unknown')
        if status == 'pending': status = 'skip'
        elif status == 'passed': status = 'pass'
        elif status == 'failed': status = 'fail'
        err = None
        if tc.get('failureMessages'):
            err = tc['failureMessages'][0][:500] if tc['failureMessages'] else None
        cur.execute('INSERT INTO tests (package, file, suite, name, full_name, status, error_message) VALUES (?,?,?,?,?,?,?)',
                    ('$pkg', file, suite, name, full, status, err))
        count += 1

db.commit()
db.close()
print(f'  {pkg}: {count} tests inserted')
"
done

echo ""
echo "=== Summary ==="
sqlite3 "$DB" "SELECT package, status, count(*) FROM tests GROUP BY package, status ORDER BY package, status;"
