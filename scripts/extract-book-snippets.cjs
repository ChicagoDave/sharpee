const fs = require('fs'), path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'code-snippets');
const AREAS = ['frontmatter','parts','backmatter','appendices'];
const INCLUDE = { typescript:'ts', bash:'sh', css:'css', jsonc:'jsonc' };

const glob = (dir) => fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>{
  const p=path.join(dir,d.name);
  return d.isDirectory()?glob(p):(d.name.endsWith('.md')?[p]:[]);
});
const slug = (s) => s.toLowerCase()
  .replace(/`/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50) || 'snippet';

const files = AREAS.flatMap(d=>fs.existsSync(d)?glob(d):[]).sort();

if (fs.existsSync(OUT)) fs.rmSync(OUT, {recursive:true});
fs.mkdirSync(OUT, {recursive:true});

const catalog = [];
let totalWritten = 0, totalSkipped = 0, refCount = 0;

for (const f of files) {
  const rel = path.relative(ROOT, f);
  const area = rel.split(path.sep)[0];
  const base = path.basename(f, '.md');
  const chapterDir = area === 'parts' ? `ch${base}` : `${area}-${base}`;

  const lines = fs.readFileSync(f,'utf8').split('\n');
  // Part-opening chapters embed a `{.part}` volume divider H1 before the
  // chapter's own H1. Capture the volume separately and use the first
  // non-divider H1 as the chapter title.
  let chapterTitle = base, volume = null;
  for (const l of lines) {
    if (!/^#\s+/.test(l)) continue;
    const text = l.replace(/^#\s+/,'').replace(/\s*\{.*\}\s*$/,'').trim();
    if (/\{[^}]*\.part\b/.test(l)) { volume = text; continue; }
    chapterTitle = text; break;
  }

  let inUth=false, uthCaption=null, fence=null, lang=null, buf=[], heading=null, startLine=0;
  const items=[];
  let seq=0;

  for (let i=0;i<lines.length;i++){
    const ln=lines[i];
    if (fence===null && /^:::\s*under-the-hood/.test(ln)){inUth=true;uthCaption=null;continue;}
    if (fence===null && /^:::\s*$/.test(ln) && inUth){inUth=false;uthCaption=null;continue;}
    if (fence===null && inUth && /\*\*Under the Hood\b/.test(ln)){
      uthCaption=ln.replace(/\*\*/g,'').replace(/^\s+|\s+$/g,''); continue;
    }
    const m=ln.match(/^```([a-zA-Z]*)\s*$/);
    if (m){
      if (fence===null){fence=m[1]||'';lang=fence;buf=[];startLine=i+1;}
      else {
        const ext = INCLUDE[lang];
        if (ext){
          seq++;
          const isRef = inUth;
          // reference snippets: name from the documented symbol; author: from section heading
          let nameSlug, symbol=null;
          if (isRef && uthCaption){
            // caption like: Under the Hood: `Story` · `@sharpee/engine`
            const mm = uthCaption.match(/Under the Hood\s*[:\-—–]\s*`?([^`·]+?)`?\s*(?:·|$)/);
            symbol = mm ? mm[1].trim() : null;
            nameSlug = slug(symbol || heading || 'reference');
          } else {
            nameSlug = slug(heading||'snippet');
          }
          const fname = isRef
            ? `${String(seq).padStart(2,'0')}-${nameSlug}.reference.${ext}`
            : `${String(seq).padStart(2,'0')}-${nameSlug}.${ext}`;
          items.push({
            fname, lang, ext, heading: heading||'(no heading)',
            srcLine: startLine, kind: isRef?'reference':'author',
            caption: isRef?uthCaption:null, symbol,
            content: buf.join('\n').replace(/\s+$/,'')+'\n',
            nlines: buf.length,
          });
          totalWritten++; if (isRef) refCount++;
        } else totalSkipped++;
        fence=null;lang=null;buf=[];
      }
      continue;
    }
    if (fence!==null){buf.push(ln);continue;}
    const h=ln.match(/^(#{1,6})\s+(.*)/);
    if (h) heading=h[2].replace(/\s*\{.*\}\s*$/,'').trim();
  }

  if (items.length){
    const dir = path.join(OUT, chapterDir);
    fs.mkdirSync(dir,{recursive:true});
    for (const it of items) fs.writeFileSync(path.join(dir,it.fname), it.content);
    catalog.push({chapterDir, chapterTitle, volume, srcFile: rel, items});
  }
}

let md = `# Sharpee Book — Code Snippet Catalog\n\n`;
md += `Every code and config snippet from *The Sharpee Author and Developer Manual*, `;
md += `extracted verbatim and organized by chapter in reading order.\n\n`;
md += `- **${totalWritten} snippets** across ${catalog.length} chapters (${totalWritten-refCount} author, ${refCount} reference).\n`;
md += `- Game-session transcripts (the \`> look\` ... output examples) are **not** included; they are example play sessions, not code.\n`;
md += `- **author** snippets are the story code/config a reader writes (assembled in reading order into \`src/index.ts\` and project files).\n`;
md += `- **reference** snippets are "Under the Hood" excerpts of the platform's own source (interfaces/classes you *import*, not code you write); their filenames carry a \`.reference.\` infix and are named for the symbol they document.\n`;
md += `- File names are \`NN-<slug>.<ext>\`, where \`NN\` is the snippet's order within the chapter.\n\n`;
md += `Regenerate with \`node scripts/extract-book-snippets.cjs\` (from \`docs/book/\`).\n\n---\n\n`;

let lastVolume = null;
for (const c of catalog){
  if (c.volume && c.volume !== lastVolume){
    md += `# ${c.volume}\n\n`;
    lastVolume = c.volume;
  }
  md += `## ${c.chapterTitle}\n\n`;
  md += `\`${c.chapterDir}/\` &nbsp;·&nbsp; source: \`docs/book/${c.srcFile}\`\n\n`;
  md += `| # | File | Section | Lang | Kind | Src line |\n`;
  md += `|---|------|---------|------|------|----------|\n`;
  for (const it of c.items){
    const kind = it.kind==='reference'
      ? `reference${it.symbol?` — \`${it.symbol}\``:''}`
      : 'author';
    md += `| ${it.fname.slice(0,2)} | \`${it.fname}\` | ${it.heading.replace(/\|/g,'\\|')} | ${it.lang} | ${kind} | ${it.srcLine} |\n`;
  }
  md += `\n`;
}

fs.writeFileSync(path.join(OUT,'CATALOG.md'), md);
console.log(`Wrote ${totalWritten} snippets (${totalWritten-refCount} author, ${refCount} reference) to code-snippets/ across ${catalog.length} chapters.`);
console.log(`Skipped ${totalSkipped} non-code blocks.`);
