#!/usr/bin/env bash
#
# build-book.sh — render *The Sharpee Book* to HTML, EPUB, and PDF.
#
# Purpose: per-version markdown source (docs/book/<version>/) → three outputs,
#          driven locally (no CI). Chapter order and shared metadata live in
#          docs/book/<version>/book.yaml (a pandoc defaults file).
# Owner:   docs/book authoring toolchain (ADR — Sharpee author book plan).
#
# Usage:
#   scripts/build-book.sh <version>          # render all formats for one edition
#   scripts/build-book.sh <version> html     # render one format (html | epub | pdf)
#   version = v1.5.0 | v2.0.0  (subdirectories of docs/book/)
#
# Requires: pandoc, weasyprint (PDF engine). See the book plan, Phase 1.

set -euo pipefail

# The book is split into per-version editions under docs/book/<version>/ (each a
# self-contained pandoc source with its own book.yaml + assets). Require the
# version as the first arg; the optional second arg is the format.
VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  echo "usage: build-book.sh <version> [html|epub|pdf|web|snippets|all]  (version = v1.5.0 | v2.0.0)"
  exit 2
fi
FORMAT="${2:-all}"

# Resolve the edition directory relative to this script, then work from there so
# the input-files paths in book.yaml resolve correctly.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOOK_DIR="$SCRIPT_DIR/../docs/book/$VERSION"
[ -d "$BOOK_DIR" ] || { echo "error: book edition not found: docs/book/$VERSION"; exit 2; }
cd "$BOOK_DIR"

OUT="build"
NAME="the-sharpee-book-$VERSION"
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

# Multi-page web build: a browsable chunked-HTML site (one page per chapter, with
# a sidebar nav) under docs/book/web/. Parked output — not wired into any live
# site yet; gitignored like build/. Generated from the same canonical source.
build_web() {
  echo "→ WEB (chunked HTML site → web/)"
  build_front_fragment
  rm -rf web
  pandoc --defaults=book.yaml \
    --to=chunkedhtml \
    --split-level=1 \
    --embed-resources \
    --css=styles/book.css \
    --metadata=document-css:false \
    --include-before-body="$FRONT_FRAGMENT" \
    --output=web
  # chunkedhtml copies media referenced in the body, but not assets referenced
  # only from the --include-before-body fragment (the title page's cover image).
  # Copy the optimized art so every referenced image resolves.
  cp -f art/*.jpg web/art/ 2>/dev/null || true
  # Every page links styles/book.css relatively, but chunkedhtml neither embeds
  # nor copies it (--embed-resources doesn't inline CSS here). Copy it so the
  # pages — including the cover and the index — are styled.
  mkdir -p web/styles
  cp -f styles/book.css web/styles/book.css
  # chunkedhtml ships only a minimal top nav; add a persistent left sidebar
  # (collapsible volumes → chapters) and a bottom Prev/Next bar to every page.
  if command -v node >/dev/null; then
    node "$SCRIPT_DIR/book-web-nav.cjs" "$VERSION"
  else
    echo "  (skipping web nav injection: node not found)"
  fi
}

# Book web presence on the site (GitHub Pages):
#   - render the per-chapter code-snippet page as an integrated site page
#     (site/book-snippets.html — shares style.css, the site nav, and theme.js).
#   - publish the rendered book itself (HTML / EPUB / PDF) into site/ so the page's
#     downloads bar and the nav's "Read the Book" link resolve.
# Run after build_html/epub/pdf (the `all` target does); the artifact copy is guarded
# so `build-book.sh snippets` alone still regenerates the page (downloads may 404 until
# a full build publishes them).
build_snippets() {
  echo "→ SNIPPETS + book downloads → site/"
  local SITE="$SCRIPT_DIR/../site"
  if command -v node >/dev/null; then
    node "$SCRIPT_DIR/build-snippet-page.cjs" "$VERSION"
  else
    echo "  (skipping snippet page: node not found)"
  fi
  for f in "$NAME.html" "$NAME.epub" "$NAME.pdf"; do
    [ -f "$OUT/$f" ] && cp -f "$OUT/$f" "$SITE/$f" && echo "  published $f"
  done
}

echo "→ art"
optimize_art

case "$FORMAT" in
  html)     build_html ;;
  epub)     build_epub ;;
  pdf)      build_pdf ;;
  web)      build_web ;;
  snippets) build_snippets ;;
  all)      build_html; build_epub; build_pdf; build_snippets ;;
  *)        echo "usage: build-book.sh <version> [html|epub|pdf|web|snippets|all]"; exit 2 ;;
esac

echo "done → $BOOK_DIR/$OUT/"
ls -la "$OUT"
