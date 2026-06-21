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

# Downscale full-resolution art masters (art/_masters/*.jpg) into the committed,
# book-referenced art/*.jpg. Met source files are 2000–4000 px (multi-MB); the
# book shows them at most ~3in wide, so 1400 px is crisp for print and keeps the
# embedded HTML/EPUB small. Regenerated only when a master is new or changed; if
# no masters are present (e.g. fresh clone), the committed art/*.jpg are used.
ART_MAX_PX=1400
ART_QUALITY=82

optimize_art() {
  [ -d art/_masters ] || return 0
  command -v magick >/dev/null || { echo "  (skipping art optimization: imagemagick not found)"; return 0; }
  local master out
  for master in art/_masters/*.jpg; do
    [ -e "$master" ] || continue
    out="art/$(basename "$master")"
    if [ ! -e "$out" ] || [ "$master" -nt "$out" ]; then
      echo "  optimize $(basename "$master")"
      magick "$master" -auto-orient -resize "${ART_MAX_PX}x${ART_MAX_PX}>" \
        -strip -quality "$ART_QUALITY" "$out"
    fi
  done
}

# Title + copyright pages must precede the table of contents. The HTML/PDF
# writers inject the auto-TOC at the top of the body, so we render those two
# pages to a standalone-less HTML fragment and feed it through
# --include-before-body (placed ahead of the TOC by the template). EPUB instead
# layers frontmatter.yaml ahead of book.yaml so the two pages lead the spine.
# See frontmatter.yaml for the full rationale.
FRONT_FRAGMENT="$OUT/.frontmatter.html"

build_front_fragment() {
  pandoc --defaults=frontmatter.yaml \
    --to=html5 \
    --output="$FRONT_FRAGMENT"
}

build_html() {
  echo "→ HTML"
  build_front_fragment
  pandoc --defaults=book.yaml \
    --to=html5 \
    --embed-resources \
    --css=styles/book.css \
    --metadata=document-css:false \
    --include-before-body="$FRONT_FRAGMENT" \
    --output="$OUT/$NAME.html"
}

build_epub() {
  echo "→ EPUB"
  pandoc --defaults=frontmatter.yaml --defaults=book.yaml \
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
  build_front_fragment
  pandoc --defaults=book.yaml \
    --to=html5 \
    --css=styles/book.css \
    --css=styles/print.css \
    --metadata=document-css:false \
    --include-before-body="$FRONT_FRAGMENT" \
    --output="$TMP"
  weasyprint "$TMP" "$OUT/$NAME.pdf"
  rm -f "$TMP"
}

echo "→ art"
optimize_art

case "${1:-all}" in
  html) build_html ;;
  epub) build_epub ;;
  pdf)  build_pdf ;;
  all)  build_html; build_epub; build_pdf ;;
  *)    echo "usage: build-book.sh [html|epub|pdf|all]"; exit 2 ;;
esac

echo "done → $BOOK_DIR/$OUT/"
ls -la "$OUT"
