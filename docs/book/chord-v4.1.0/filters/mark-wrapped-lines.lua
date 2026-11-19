--[[
mark-wrapped-lines.lua — Pandoc Lua filter for the Chord manual's PDF.

Purpose: a line of a typed listing (a `chord`, `json` or `shell` fence) that is
         too long for the printed page is broken here, at a space, and each
         continuation row begins with the mark "↪ " at the line's own
         indentation. Without this the page wraps the line silently and the
         second row looks like a new line of the file ("How to read this book"
         tells the reader what the mark means).

Public interface: listed under `filters:` in book.yaml. It changes nothing
         unless the output file is the PDF's intermediate HTML (the name
         scripts/build-book.sh gives it contains "pdf-source"), so the HTML
         and EPUB editions keep their lines whole and wrap on screen.

Owner:   docs/book authoring toolchain; the Chord manual plan
         (docs/work/archive/chord-manual/plan.md).

Invariants:
  - Only the classes in TYPED are touched; transcripts (`text` fences) are
    prose the reader does not type, and the page may wrap them freely.
  - A row is never broken anywhere but at a space. A token longer than the
    width is left for the stylesheet to break.
  - The widths are in characters of the code font at the print size
    (styles/print.css, styles/book.css). 66 fit in a block on the page: a
    66-character row was seen whole in the PDF built 2026-11-17 before this
    filter existed. 60 is the figure worked out for a block inside an aside
    box, which has not been seen on a page, so that width is two under it.
]]

local PAGE_WIDTH = 66
local BOX_WIDTH = 58
local MARK = "↪ "
local MARK_COLUMNS = 2
local TYPED = { chord = true, json = true, shell = true }

--- True when this run renders the PDF's intermediate HTML.
local function is_print_run()
  local out = PANDOC_STATE.output_file or ""
  return out:find("pdf%-source") ~= nil
end

--- Number of display columns in a UTF-8 string (one per code point).
local function columns(s)
  return utf8.len(s) or #s
end

--- Break one line into rows no wider than `width`, marking each continuation.
-- Returns the rows joined by newlines; a line that fits is returned unchanged.
local function wrap_line(line, width)
  if columns(line) <= width then return line end
  local indent = line:match("^( *)")
  local rows = {}
  local rest = line
  local first = true
  while columns(rest) > width do
    -- Last space at or before the width, past the row's own leading text.
    local floor_at = #indent + (first and 0 or #MARK) + 1
    local cut = nil
    local col = 0
    for pos, code in utf8.codes(rest) do
      col = col + 1
      if col > width + 1 then break end
      if code == 32 and pos > floor_at then cut = pos end
    end
    if not cut then break end
    rows[#rows + 1] = rest:sub(1, cut - 1)
    rest = indent .. MARK .. rest:sub(cut + 1)
    first = false
  end
  rows[#rows + 1] = rest
  return table.concat(rows, "\n")
end

--- Wrap every over-long line of a typed code block.
local function wrap_block(block, width)
  local typed = false
  for _, class in ipairs(block.classes) do
    if TYPED[class] then typed = true end
  end
  if not typed then return nil end
  local out = {}
  for line in (block.text .. "\n"):gmatch("(.-)\n") do
    out[#out + 1] = wrap_line(line, width)
  end
  block.text = table.concat(out, "\n")
  return block
end

if not is_print_run() then
  return {}
end

assert(MARK_COLUMNS == columns(MARK), "MARK_COLUMNS must match MARK")

return {
  {
    traverse = "topdown",
    -- An aside box is narrower than the page: wrap its blocks to the box's
    -- width and stop, so the page-width pass below does not see them again.
    Div = function(div)
      local narrowed = div:walk({
        CodeBlock = function(block) return wrap_block(block, BOX_WIDTH) end,
      })
      return narrowed, false
    end,
    CodeBlock = function(block) return wrap_block(block, PAGE_WIDTH) end,
  },
}
