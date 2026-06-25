/**
 * build-snippet-page.cjs — render the book's code snippets as an integrated site page.
 *
 * Emits site/book-snippets.html, a normal page of the Sharpee website: it shares the
 * site chrome (style.css, the right-hand nav + footer from components.js, theme.js), so
 * it is NOT a standalone document. A compact left column lists chapters and their
 * sections (no long titles); the centre column holds the snippets; the right column is
 * the standard site nav. A downloads bar links the rendered book (HTML / EPUB / PDF),
 * which build-book.sh publishes alongside this page.
 *
 * Organized BY BOOK CHAPTER (docs/book/parts/**), in book reading order. For each chapter:
 *   1. STEPS     — the individual fenced code blocks from the book (the deltas a reader
 *                  adds), grouped under their section headings.
 *   2. COMBINED  — the cumulative, runnable story file at that point, taken from the real
 *                  tested tutorial source (tutorials/familyzoo/src/chNN-*.ts). Chapters
 *                  that add no story code carry the previous cumulative forward.
 *
 * Run from anywhere:  node scripts/build-snippet-page.cjs [chNN ...]
 *   With no args: every chapter. With args (e.g. ch02 ch03 ch04): only those (preview).
 *
 * Owner: docs/book authoring toolchain (book web presence on the site).
 */
const fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..'); // repo root (this script lives in scripts/)
const BOOK = path.join(ROOT, 'docs/book');
const FZ = path.join(ROOT, 'tutorials/familyzoo/src');
const OUT = path.join(ROOT, 'site', 'book-snippets.html');

// book-chapter number -> the runnable tutorial file that is its end-of-chapter checkpoint
const RUNNABLE = {
  '02':'ch02-first-room.ts', '04':'ch04-navigation.ts', '05':'ch05-scenery-items.ts',
  '06':'ch06-containers.ts', '07':'ch07-doors-keys.ts', '08':'ch08-light-dark.ts',
  '12':'ch12-readables.ts', '13':'ch13-event-handlers.ts', '14':'ch14-custom-actions.ts',
  '15':'ch15-capability-dispatch.ts', '20':'ch20-npcs.ts', '22':'ch22-timed-events.ts',
  '23':'ch23-scoring.ts',
};
const INCLUDE = { typescript:'ts', bash:'sh', css:'css', jsonc:'jsonc' };
const filter = process.argv.slice(2); // e.g. ['ch02','ch04']

const esc = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// ---- gather book chapters (parts/part-*/NN-*.md), in book order ----
const partDirs = fs.readdirSync(path.join(BOOK,'parts')).sort();
const chapterFiles = [];
for (const p of partDirs) {
  const dir = path.join(BOOK,'parts',p);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir).sort()) {
    if (/^\d\d-.*\.md$/.test(f)) chapterFiles.push(path.join(dir,f));
  }
}

function parseChapter(file) {
  const lines = fs.readFileSync(file,'utf8').split('\n');
  const num = path.basename(file).match(/^(\d\d)/)[1];
  let title = path.basename(file,'.md');
  for (const l of lines) {
    if (!/^#\s+/.test(l)) continue;
    if (/\{[^}]*\.part\b/.test(l)) continue;       // skip volume divider
    title = l.replace(/^#\s+/,'').replace(/\s*\{.*\}\s*$/,'').trim(); break;
  }
  const steps = [];
  let inUth=false, fence=null, lang=null, buf=[], heading=null;
  for (let i=0;i<lines.length;i++){
    const ln=lines[i];
    if (fence===null && /^:::\s*under-the-hood/.test(ln)){inUth=true;continue;}
    if (fence===null && /^:::\s*$/.test(ln) && inUth){inUth=false;continue;}
    const m=ln.match(/^```([a-zA-Z]*)\s*$/);
    if (m){
      if (fence===null){fence=m[1]||'';lang=fence;buf=[];}
      else {
        if (INCLUDE[lang]) steps.push({lang, kind:inUth?'reference':'author',
          heading:heading||'(intro)', code:buf.join('\n').replace(/\s+$/,'')});
        fence=null;lang=null;buf=[];
      }
      continue;
    }
    if (fence!==null){buf.push(ln);continue;}
    const h=ln.match(/^#{1,6}\s+(.*)/);
    if (h) heading=h[1].replace(/\s*\{.*\}\s*$/,'').trim();
  }
  return {num, title, file:path.relative(ROOT,file), steps};
}

let chapters = chapterFiles.map(parseChapter);
if (filter.length) chapters = chapters.filter(c => filter.includes('ch'+c.num));

// ---- build cumulative-runnable state per chapter ----
let lastCum = null, lastCumFrom = null;
for (const c of chapters) {
  if (RUNNABLE[c.num]) {
    const fp = path.join(FZ, RUNNABLE[c.num]);
    c.combined = fs.readFileSync(fp,'utf8').replace(/\s+$/,'');
    c.combinedFrom = path.relative(ROOT, fp);
    c.combinedChanged = true;
    lastCum = c.combined; lastCumFrom = c.combinedFrom;
  } else {
    c.combined = lastCum;            // carry forward (may be null for ch01)
    c.combinedFrom = lastCumFrom;
    c.combinedChanged = false;
  }
}

// group a chapter's steps into consecutive sections by heading
function sectionsOf(steps){
  const secs=[]; let cur=null;
  steps.forEach((s,i)=>{
    if(!cur || cur.heading!==s.heading){ cur={heading:s.heading, steps:[]}; secs.push(cur); }
    cur.steps.push({...s, n:i+1});
  });
  return secs;
}

// ---- render HTML (integrated site page) ----
const stepHtml = (s) => `
        <div class="snip">
          <div class="snip-head">
            <span class="snip-badge${s.kind==='reference'?' ref':''}">${s.kind==='reference'?'reference':'step '+s.n}</span>
            <span class="snip-lang">${s.lang}</span>
            <button class="snip-copy" data-copy>copy</button>
          </div>
          <pre><code>${esc(s.code)}</code></pre>
        </div>`;

const chapterHtml = (c) => {
  const secs = sectionsOf(c.steps);
  const body = secs.map((sec,si)=>`
      <h3 class="snip-section" id="ch${c.num}-s${si}">${esc(sec.heading)}</h3>
      ${sec.steps.map(stepHtml).join('')}`).join('')
    || '<p class="snip-note">No code snippets in this chapter.</p>';
  let combined;
  if (c.combined==null){
    combined = `<p class="snip-note">No cumulative story file yet (this chapter sets up tooling, not story code).</p>`;
  } else if (c.combinedChanged){
    combined = `<p class="snip-note">The complete, runnable story at the end of this chapter (tested source: <code>${esc(c.combinedFrom)}</code>).</p>
      <div class="snip">
        <div class="snip-head"><span class="snip-badge run">runnable</span>
          <span class="snip-file">${esc(c.combinedFrom.split('/').pop())}</span>
          <span class="snip-lang">typescript</span>
          <button class="snip-copy" data-copy>copy</button></div>
        <pre><code>${esc(c.combined)}</code></pre>
      </div>`;
  } else {
    combined = `<p class="snip-note">No story-code change this chapter; the runnable file is unchanged from the previous checkpoint (<code>${esc(c.combinedFrom)}</code>).</p>`;
  }
  return `
    <section class="snip-chapter" id="ch${c.num}">
      <h2>Chapter ${Number(c.num)}: ${esc(c.title)}</h2>
      <p class="snip-src">Book source: <code>${esc(c.file)}</code> · ${c.steps.length} step(s)</p>
      ${body}
      <h3 class="snip-section" id="ch${c.num}-combined">Combined runnable file</h3>
      ${combined}
    </section>`;
};

// left nav: "Chapter N" (no long title) + its section sub-links
const navHtml = chapters.map(c=>{
  const secs = sectionsOf(c.steps);
  const subs = secs.map((sec,si)=>`<li><a href="#ch${c.num}-s${si}">${esc(sec.heading)}</a></li>`).join('')
    + `<li><a href="#ch${c.num}-combined">Combined</a></li>`;
  return `<li class="bn-ch"><a href="#ch${c.num}">Chapter ${Number(c.num)}</a><ul class="bn-secs">${subs}</ul></li>`;
}).join('');

const html = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code Snippets — Sharpee</title>
  <meta name="description" content="Every code snippet from The Sharpee Author and Developer Manual, by chapter: each step plus the complete runnable file it builds up to.">
  <link rel="stylesheet" href="style.css">
</head>
<body>
<div class="book-page">
  <nav class="book-nav">
    <div class="book-nav-title">The Sharpee Manual<span>Code Snippets</span></div>
    <ul>${navHtml}</ul>
  </nav>
  <main class="content">
    <h1>Code Snippets</h1>
    <p>Every code step from <a href="the-sharpee-book.html">The Sharpee Author and Developer Manual</a>, by chapter. The <strong>step</strong> blocks are the deltas you add as you read; the <strong>combined</strong> block is the complete, runnable story so far, taken from the tested <code>familyzoo</code> tutorial source.${filter.length?' <strong>Preview build: '+chapters.length+' chapter(s).</strong>':''}</p>
    ${chapters.map(chapterHtml).join('\n')}
  </main>
  <aside id="sidebar" class="sidebar"></aside>
  <footer id="footer" class="footer"></footer>
</div>
<script src="components.js"></script>
<script src="theme.js"></script>
<script>
document.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',function(){
  var code=b.closest('.snip').querySelector('code').innerText;
  navigator.clipboard.writeText(code).then(function(){var t=b.textContent;b.textContent='copied';setTimeout(function(){b.textContent=t;},1200);});
});});
var navLinks=new Map([].slice.call(document.querySelectorAll('.book-nav a')).map(function(a){return [a.getAttribute('href').slice(1),a];}));
var spy=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){
  navLinks.forEach(function(a){a.classList.remove('active');});
  var a=navLinks.get(e.target.id); if(a){a.classList.add('active');a.scrollIntoView({block:'nearest'});}
}});},{rootMargin:'-5% 0px -85% 0px'});
navLinks.forEach(function(a,id){var el=document.getElementById(id); if(el) spy.observe(el);});
</script>
</body>
</html>`;

fs.writeFileSync(OUT, html);
console.log(`Wrote ${path.relative(ROOT,OUT)} — ${chapters.length} chapter(s)${filter.length?' (preview: '+filter.join(', ')+')':''}.`);
