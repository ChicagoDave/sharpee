/**
 * build-snippet-page.cjs — render the book's code snippets as one standalone HTML page.
 *
 * Organized BY BOOK CHAPTER (docs/book/parts/**), in book reading order. For each
 * chapter it shows two kinds of snippet:
 *   1. RAW STEPS    — the individual fenced code blocks from the book (the deltas a
 *                     reader adds), in order.
 *   2. COMBINED     — the cumulative, runnable story file at that point, taken from the
 *                     real tested tutorial source (tutorials/familyzoo/src/chNN-*.ts).
 *                     Chapters that add no story code carry the previous cumulative forward.
 *
 * Run from anywhere:  node scripts/build-snippet-page.cjs [chNN ...]
 *   With no args: every chapter. With args (e.g. ch02 ch03 ch04): only those (proof mode).
 *
 * Owner: docs/book authoring toolchain.
 */
const fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..'); // repo root (this script lives in scripts/)
const BOOK = path.join(ROOT, 'docs/book');
const FZ = path.join(ROOT, 'tutorials/familyzoo/src');
const OUT = path.join(BOOK, 'code-snippets', 'index.html');

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
  const numMatch = path.basename(file).match(/^(\d\d)/);
  const num = numMatch[1];
  let title = path.basename(file,'.md');
  for (const l of lines) {
    if (!/^#\s+/.test(l)) continue;
    if (/\{[^}]*\.part\b/.test(l)) continue;       // skip volume divider
    title = l.replace(/^#\s+/,'').replace(/\s*\{.*\}\s*$/,'').trim(); break;
  }
  // extract steps (fenced blocks), tracking section heading + under-the-hood
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

// ---- render HTML ----
const chapterHtml = (c) => {
  const steps = c.steps.map((s,i)=>`
      <div class="step">
        <div class="step-head"><span class="badge">step ${i+1}</span>
          <span class="sec">${esc(s.heading)}</span>
          <span class="lang ${s.kind==='reference'?'ref':''}">${s.lang}${s.kind==='reference'?' · reference':''}</span>
          <button class="copy" data-copy>copy</button>
        </div>
        <pre><code>${esc(s.code)}</code></pre>
      </div>`).join('');
  let combined;
  if (c.combined == null) {
    combined = `<p class="note">No cumulative story file yet (this chapter sets up tooling, not story code).</p>`;
  } else if (c.combinedChanged) {
    combined = `<p class="note">Runnable cumulative at the end of this chapter — the complete, tested story so far. Source: <code>${esc(c.combinedFrom)}</code></p>
      <div class="combined"><div class="step-head"><span class="badge run">runnable</span>
        <span class="sec">${esc(c.combinedFrom.split('/').pop())}</span>
        <span class="lang">typescript</span><button class="copy" data-copy>copy</button></div>
        <pre><code>${esc(c.combined)}</code></pre></div>`;
  } else {
    combined = `<p class="note">No story-code change this chapter — cumulative unchanged from the previous runnable checkpoint (<code>${esc(c.combinedFrom)}</code>).</p>`;
  }
  return `
    <section class="chapter" id="ch${c.num}">
      <h2>Chapter ${Number(c.num)} — ${esc(c.title)}</h2>
      <p class="src">book source: <code>${esc(c.file)}</code> · ${c.steps.length} raw step(s)</p>
      <h3>Raw steps</h3>
      ${steps || '<p class="note">No code snippets in this chapter.</p>'}
      <h3>Combined — runnable cumulative</h3>
      ${combined}
    </section>`;
};

const toc = chapters.map(c=>`<li><a href="#ch${c.num}">Ch ${Number(c.num)} — ${esc(c.title)}</a></li>`).join('');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Sharpee Author and Developer Manual — Code Snippets</title>
<style>
  /* Palette mirrors site/style.css — dark default, champagne-gold accent, light toggle. */
  :root{--bg:#0d1117;--bg-sidebar:#161b22;--border:#30363d;--text:#e6edf3;--text-muted:#8b949e;
    --accent:#f2d280;--accent-hover:#f5dda0;--heading:#f0e6d3;
    --font-sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
    --font-mono:"SF Mono","Cascadia Code","Fira Code",Menlo,Consolas,monospace;}
  [data-theme="light"]{--bg:#faf9f7;--bg-sidebar:#f0eeeb;--border:#d4d0cc;--text:#2a2520;--text-muted:#555;
    --accent:#3b82c4;--accent-hover:#2d6da3;--heading:#1a1a1a;}
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;font-family:var(--font-sans);font-size:15px;line-height:1.6;color:var(--text);background:var(--bg);-webkit-font-smoothing:antialiased}
  a{color:var(--accent);text-decoration:none}a:hover{color:var(--accent-hover)}
  .sidebar{position:fixed;top:0;left:0;bottom:0;width:525px;overflow-y:auto;border-right:1px solid var(--border);background:var(--bg-sidebar);padding:1.5rem 0;display:flex;flex-direction:column}
  .side-head{padding:0 1.5rem 1rem;font-weight:800;color:var(--accent);letter-spacing:-.02em;border-bottom:1px solid var(--border);margin-bottom:.5rem}
  .side-head span{display:block;font-weight:400;color:var(--text-muted);font-size:13px;letter-spacing:0}
  .sidebar ul{list-style:none;margin:0;padding:0;font-size:13.5px;flex:1}
  .sidebar li a{display:block;padding:.34rem 1.5rem;color:var(--text-muted);border-left:3px solid transparent;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}
  .sidebar li a:hover{color:var(--accent)}
  .sidebar li a.active{border-left-color:var(--accent);color:var(--accent);font-weight:700}
  .theme-toggle{padding:0 1.5rem 1rem;display:flex;justify-content:flex-end}
  .theme-toggle button{background:none;border:1px solid var(--border);color:var(--text-muted);font-family:var(--font-sans);font-size:.8rem;padding:.35rem .75rem;border-radius:4px;cursor:pointer}
  .theme-toggle button:hover{color:var(--accent);border-color:var(--accent)}
  .content{margin-left:525px;max-width:920px;padding:2.5rem 2rem 6rem}
  header h1{margin:0 0 .25rem;font-size:2rem;font-weight:800;color:var(--heading);letter-spacing:-.02em;line-height:1.2}
  header .subtitle{font-size:1rem;margin:.1rem 0 1rem;color:var(--text-muted)}
  header p{color:var(--text-muted);margin:.25rem 0 1.5rem}
  @media (max-width:760px){.sidebar{position:static;width:auto;bottom:auto;border-right:none;border-bottom:1px solid var(--border)}.content{margin-left:0}}
  .chapter{border-top:1px solid var(--border);padding-top:1.5rem;margin-top:2.5rem}
  h2{font-size:1.4rem;font-weight:700;color:var(--heading);margin:.2rem 0 .2rem}
  h3{font-size:.8rem;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin:1.6rem 0 .6rem;font-weight:700}
  .src{color:var(--text-muted);font-size:13px;margin:.1rem 0 0}
  .note{color:var(--text-muted);font-size:13.5px}
  .note code,.src code,header code{font-family:var(--font-mono);font-size:.85em;background:var(--bg-sidebar);padding:.1rem .35rem;border-radius:4px;border:1px solid var(--border)}
  .step,.combined{border:1px solid var(--border);border-radius:6px;overflow:hidden;margin:.6rem 0}
  .step-head{display:flex;align-items:center;gap:.6rem;padding:.4rem .7rem;background:var(--bg);border-bottom:1px solid var(--border);font-size:12.5px}
  .badge{border:1px solid var(--border);color:var(--text-muted);border-radius:4px;padding:.05rem .45rem;font-weight:600}
  .badge.run{background:var(--accent);color:var(--bg);border-color:var(--accent)}
  .sec{color:var(--text);font-weight:600}
  .lang{margin-left:auto;color:var(--text-muted);font-family:var(--font-mono)}
  .lang.ref{color:var(--accent)}
  .copy{border:1px solid var(--border);background:none;border-radius:5px;padding:.1rem .5rem;cursor:pointer;font-size:12px;color:var(--text-muted);font-family:var(--font-sans)}
  .copy:hover{color:var(--accent);border-color:var(--accent)}
  pre{margin:0;padding:.85rem 1rem;overflow:auto;background:var(--bg-sidebar);font:12.5px/1.5 var(--font-mono);color:var(--text)}
  code{white-space:pre}
</style></head>
<body>
<aside class="sidebar">
  <div class="theme-toggle"><button id="theme-toggle" type="button">Light mode</button></div>
  <div class="side-head">The Sharpee Author and Developer Manual<br><span>Code Snippets</span></div>
  <ul>${toc}</ul>
</aside>
<main class="content">
<header>
  <h1>The Sharpee Author and Developer Manual</h1>
  <p class="subtitle">Authoring Interactive Fiction with Sharpee · Code Snippets</p>
  <p>Every code step from the manual, by book chapter. <b>Raw steps</b> are the deltas you add as you read; the <b>combined</b> block is the complete, runnable story so far (from the tested <code>familyzoo</code> tutorial source).${filter.length?' <b>Preview build — '+chapters.length+' chapter(s).</b>':''}</p>
</header>
${chapters.map(chapterHtml).join('\n')}
</main>
<script>
// Theme toggle — same palette + persistence key as site/theme.js
(function(){
  var btn=document.getElementById('theme-toggle'), root=document.documentElement;
  function apply(t){root.setAttribute('data-theme',t);btn.textContent=t==='dark'?'Light mode':'Dark mode';localStorage.setItem('sharpee-theme',t);}
  apply(localStorage.getItem('sharpee-theme')||'dark');
  btn.addEventListener('click',function(){apply(root.getAttribute('data-theme')==='dark'?'light':'dark');});
})();
document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',()=>{
  const code=b.closest('.step,.combined').querySelector('code').innerText;
  navigator.clipboard.writeText(code).then(()=>{const t=b.textContent;b.textContent='copied';setTimeout(()=>b.textContent=t,1200);});
}));
// scrollspy: highlight the sidebar link for the chapter currently in view
const links=new Map([...document.querySelectorAll('.sidebar a')].map(a=>[a.getAttribute('href').slice(1),a]));
const spy=new IntersectionObserver(es=>{
  es.forEach(e=>{ if(e.isIntersecting){
    links.forEach(a=>a.classList.remove('active'));
    const a=links.get(e.target.id); if(a){a.classList.add('active');a.scrollIntoView({block:'nearest'});}
  }});
},{rootMargin:'-10% 0px -80% 0px'});
document.querySelectorAll('section.chapter').forEach(s=>spy.observe(s));
</script>
</body></html>`;

fs.writeFileSync(OUT, html);
console.log(`Wrote ${path.relative(ROOT,OUT)} — ${chapters.length} chapter(s)${filter.length?' (preview: '+filter.join(', ')+')':''}.`);
