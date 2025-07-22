#!/bin/bash
timestamp=$(date +%Y%m%d-%H%M%S)
logfile="/c/repotemp/sharpee/logs/test-stdlib-${timestamp}.log"
cd /c/repotemp/sharpee/packages/stdlib
pnpm test > "$logfile" 2>&1
echo "log: $logfile"
tail -n 100 "$logfile"
