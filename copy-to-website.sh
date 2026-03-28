#!/bin/bash
# Copies dungeo browser build and .sharpee file to the website public directory.

set -e

cp -f dist/web/dungeo/* website/public/web/dungeo/
cp -f dist/stories/dungeo.sharpee website/public/downloads/dungeo.sharpee

echo "Copied:"
echo "  dist/web/dungeo/* -> website/public/web/dungeo/"
echo "  dist/stories/dungeo.sharpee -> website/public/downloads/dungeo.sharpee"
