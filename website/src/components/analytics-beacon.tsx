/**
 * analytics-beacon.tsx — the client half of the analytics pair.
 *
 * Adapted from Ledga's inline snippet (ChicagoDave/budgetman
 * landingpage/index.html). Kept as ONE inline script rather than a React
 * effect on purpose: it runs before hydration, costs no bundle, and cannot be
 * broken by a render error elsewhere on the page.
 *
 * It reports two things:
 *
 *   pageview   once per load, plus on client-side route changes (Next does not
 *              reload the document, so a popstate/pushState hook is what makes
 *              a docs site's navigation visible at all).
 *   download   on any click of a link to a downloadable artifact — the local
 *              /downloads/ path or a GitHub release asset. Delegated from
 *              document, so links in MDX need no special component and every
 *              future download page is covered without being remembered.
 *
 * Everything is best-effort: storage in a try, the POST with keepalive so it
 * survives the navigation it is reporting, and every failure swallowed. A
 * reader must never learn that analytics exist.
 *
 * Public interface: <AnalyticsBeacon /> — mount once, in the root layout.
 * Owner context: website — analytics collection.
 */

const SCRIPT = `
(function(){
  var E='/api/p', V='_sv', S='_ss';
  function g(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function p(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  function gs(k){try{return sessionStorage.getItem(k)}catch(e){return null}}
  function ps(k,v){try{sessionStorage.setItem(k,v)}catch(e){}}
  function r(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
  var vid=g(V)||r(); p(V,vid);
  var sid=gs(S)||r(); ps(S,sid);

  function send(extra){
    try{
      var d={vid:vid,sid:sid,path:location.pathname,ref:document.referrer,
             lang:navigator.language,tz:Intl.DateTimeFormat().resolvedOptions().timeZone,
             sw:screen.width,sh:screen.height,vw:innerWidth,vh:innerHeight,type:'pageview'};
      for(var k in extra){d[k]=extra[k]}
      fetch(E,{method:'POST',body:JSON.stringify(d),
               headers:{'Content-Type':'application/json'},keepalive:true}).catch(function(){});
    }catch(e){}
  }

  function view(){send({})}
  if(document.readyState==='complete')view();else addEventListener('load',view);

  // Next navigates without reloading, so pushState has to be observed or the
  // whole site looks like one pageview.
  var push=history.pushState;
  history.pushState=function(){push.apply(this,arguments);setTimeout(view,0)};
  addEventListener('popstate',function(){setTimeout(view,0)});

  // Downloads, delegated: any link to a local artifact or a GitHub release.
  addEventListener('click',function(ev){
    try{
      var a=ev.target&&ev.target.closest?ev.target.closest('a[href]'):null;
      if(!a)return;
      var h=a.getAttribute('href')||'';
      var isLocal=h.indexOf('/downloads/')===0;
      var isRelease=h.indexOf('github.com/')>-1&&h.indexOf('/releases/')>-1;
      if(!isLocal&&!isRelease)return;
      send({type:'download',asset:h.split('/').pop()||h});
    }catch(e){}
  },true);
})();
`;

export function AnalyticsBeacon() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
