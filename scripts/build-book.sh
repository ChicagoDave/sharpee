#!/usr/bin/env bash
#
# build-book.sh — render *The Sharpee Book* to HTML, EPUB, and PDF.
#
# Purpose: one canonical markdown source (docs/book/) → three outputs, driven
#          locally (no CI). Chapter order and shared metadata live in
#          docs/book/book.yaml (a pandoc defaults file).
# Owner:   docs/book authoring toolchain (ADR — Sharpee author book plan).
#
# Usage:
#   scripts/build-book.sh            # render all three formats
#   scripts/build-book.sh html       # render one format (html | epub | pdf)
#
# Requires: pandoc, weasyprint (PDF engine). See the book plan, Phase 1.

set -euo pipefail

# Resolve the book directory relative to this script, then work from there so
# the input-files paths in book.yaml resolve correctly.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOOK_DIR="$SCRIPT_DIR/../docs/book"
cd "$BOOK_DIR"

OUT="build"
NAME="the-sharpee-book"
mkdir -p "$OUT"

command -v pandoc >/dev/null || { echo "error: pandoc not found (brew install pandoc)"; exit 1; }

build_html() {
  echo "→ HTML"
  pandoc --defaults=book.yaml \
    --to=html5 \
    --embed-resources \
    --css=styles/book.css \
    --metadata=document-css:false \
    --output="$OUT/$NAME.html"
}

build_epub() {
  echo "→ EPUB"
  pandoc --defaults=book.yaml \
    --to=epub3 \
    --css=styles/epub.css \
    --output="$OUT/$NAME.epub"
}

build_pdf() {
  echo "→ PDF"
  command -v weasyprint >/dev/null || { echo "error: weasyprint not found (brew install weasyprint)"; exit 1; }
  # Two steps: pandoc → an HTML at the book root (so relative styles/ and assets/
  # paths resolve), then weasyprint that file. We do NOT use --embed-resources:
  # weasyprint fails to decode pandoc's base64 data-URI images, but resolves
  # on-disk file references fine. The single-step --pdf-engine path runs
  # weasyprint from a temp dir where assets/ is unreachable.
  local TMP=".pdf-source.html"
  pandoc --defaults=book.yaml \
    --to=html5 \
    --css=styles/book.css \
    --css=styles/print.css \
    --metadata=document-css:false \
    --output="$TMP"
  weasyprint "$TMP" "$OUT/$NAME.pdf"
  rm -f "$TMP"
}

case "${1:-all}" in
  html) build_html ;;
  epub) build_epub ;;
  pdf)  build_pdf ;;
  all)  build_html; build_epub; build_pdf ;;
  *)    echo "usage: build-book.sh [html|epub|pdf|all]"; exit 2 ;;
esac

echo "done → $BOOK_DIR/$OUT/"
ls -la "$OUT"
