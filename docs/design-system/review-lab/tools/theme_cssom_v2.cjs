#!/usr/bin/env node
/**
 * DS04 v2 — Local-only effective contrast audit; zero npm dependencies.
 * Usage: node theme_cssom_v2.cjs <repository_root> [output_dir]
 * Needs a local checkout of MobiliPresenter2D and installed Chromium.
 * No internet, no PR, no deploy, no writing into the source repo.
 * Authoritative source: actual CSSOM on loaded DOM. Fixture findings are labeled.
 * This is not a complete accessible UI audit: states requiring real login/remote
 * APIs cannot be exercised offline. Do not treat absence of violations as PASS.
 */
'use strict';
const fs=require('node:fs');const path=require('node:path');const http=require('node:http');
const os=require('node:os');const {spawn,spawnSync}=require('node:child_process');
const root=path.resolve(process.argv[2]||'.');const app=path.join(root,'app');
const out=path.resolve(process.argv[3]||path.join(process.cwd(),'ds04-v2-output'));
const chromium=process.env.CHROMIUM||'chromium';
if(!fs.existsSync(path.join(app,'ui-theme.css'))) {console.error('No app/ui-theme.css found: expected repo root');process.exit(2)}
fs.mkdirSync(out,{recursive:true});
const routes=['/','/about/','/how-it-works/','/viewer/','/config/','/admin.html','/access/','/access/manage.html'];
const widths=[390,1366],themes=['light','dark'];
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
function fixtureConfig(){return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/ui-theme.css"></head><body>
<main class="workspace"><section class="viewer-card"><div class="viewer" style="height:60px;aspect-ratio:auto"></div><footer class="viewer-card__footer"><p class="layer-status"><span class="layer-status__indicator"></span><strong id="visibleCount">7</strong> de <span id="totalCount">7</span> módulos incluídos</p><p>Selecione um módulo.</p></footer></section>
<aside class="controls"><section class="panel" style="min-height:100px"><div class="config-section"><h3>Título da seção</h3><span class="module-number">01</span><div class="price-state"><div class="price-state__breakdown"><div><dt>Total estimado</dt><dd>R$ 10.000</dd></div></div></div></div></section><footer class="flow-actions" data-bottom-dock-enabled="true"><p class="configuration-value"><span>Estimativa</span><strong>R$ 10.000,00</strong><small>Estimativa</small></p><button class="button button--primary">Continuar para acabamentos</button></footer></aside></main>
</body></html>`}
function fixtureAdmin(){return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/admin/admin.css"><link rel="stylesheet" href="/ui-theme.css"></head><body><main class="admin-main"><section class="admin-card auth-card">
<p class="message">Mensagem</p><p class="message" data-kind="error">Falha na operação</p><p class="message" data-kind="success">Alterações salvas</p><div class="stage-card"><div class="stage-card__number">2</div><div class="stage-items"><label class="item-option">Item disponível</label></div><div class="hierarchy-group"><label class="hierarchy-name">Nome do módulo</label><div class="hierarchy-move">Mover seção</div><details class="hierarchy-choice-options" open><summary>Opções disponíveis</summary><div class="hierarchy-choice-option">Módulo A</div></details></div><div class="material-availability-option">Acabamento disponível</div></div></section></main></body></html>`}
const extras={'/__ds04__/config':fixtureConfig,'/__ds04__/admin':fixtureAdmin};
function inspectStructure(){
 const output=[];
 for(const route of routes){const f=route==='/'?'index.html':route.endsWith('/')?route.slice(1)+'index.html':route.slice(1);const file=path.resolve(app,f);
  if(!fs.existsSync(file)){output.push({route,file:f,available:false});continue}
  const html=fs.readFileSync(file,'utf8');
  output.push({route,file:f,available:true,themeController:/<script[^>]+src=["'][^"']*ui-theme\.js/i.test(html),themeStylesheet:/<link[^>]+href=["'][^"']*ui-theme\.css/i.test(html),staticThemeAttribute:html.match(/<html[^>]*data-theme\s*=\s*["'](light|dark)["']/i)?.[1]||null});
 }
 return output;
}
function inspectCountContract(){
 const f=path.join(app,'config/index.html'),data=path.join(app,'data/configurator-settings.js'),js=path.join(app,'app.js');
 if(!fs.existsSync(f))return {available:false};
 const html=fs.readFileSync(f,'utf8');const num=(id)=>+((html.match(new RegExp('<(?:strong|span) id="'+id+'">(\\d+)'))||[])[1]||NaN);
 let modules=null;if(fs.existsSync(data)){try{const obj=require(data);modules=obj.stages?.find(x=>x.id==='modules')?.items?.length??null}catch{}}
 let includesLighting=false;if(fs.existsSync(js)){const code=fs.readFileSync(js,'utf8');const start=code.indexOf('function updateVisibleCount()');if(start>=0)includesLighting=code.slice(start,start+700).includes('lighting-08')}
 return {available:true,visiblePlaceholder:num('visibleCount'),totalPlaceholder:num('totalCount'),configuredDefaultModules:modules,configuredCountIncludesLightingService:includesLighting,needsContractReview:includesLighting||(modules!==null&&num('totalCount')!==modules)};
}
const report={schema:'DS04.CSSOM.2.0',structural:inspectStructure(),countContract:inspectCountContract(),created_at:new Date().toISOString(),root,method:'Chromium CSSOM via Page.setDocumentContent with locally inlined styles; static HTML routes plus explicit dynamic DOM fixtures (no app JS execution)',routes:[],summary:{},limitations:[
 'Static HTML loaded with local CSS but application JS is deliberately not executed; dynamic content must be treated as fixture-only or missing, never PASS.',
 'The fixture scenarios are approximations of DOM structures and are not evidence that application JS created a given state.',
 'Background images, filters, overlay stacking, gradients and special blending are flagged uncertain; not pixel-verified.',
 'A/B of viewport is limited to mobile 390 and desktop 1366; add 320/768/zoom if required.',
 'Pseudo-content is screened separately; no assumption of full keyboard, focus or disabled state coverage.'
]};
const probe=String.raw`(() => {
function tuple(str) {
  const m=String(str).match(/rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[, /]+([\d.]+))?\s*\)/);
  if(m)return [+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]];
  return null;
}
function blend(f,b){let a=f[3];return [f[0]*a+b[0]*(1-a),f[1]*a+b[1]*(1-a),f[2]*a+b[2]*(1-a),1]}
function lum(c){const f=x=>{let z=x/255;return z<=.04045?z/12.92:((z+.055)/1.055)**2.4};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])}
function contrast(a,b){const x=lum(a),y=lum(b);return +( (Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)}
function pathOf(e){let parts=[];for(let p=e;p&&p.nodeType===1&&parts.length<5;p=p.parentElement){let t=p.tagName.toLowerCase();if(p.id)t+='#'+p.id;else if(p.classList.length)t+='.'+[...p.classList].slice(0,2).join('.');parts.unshift(t)}return parts.join(' > ')}
function backdrop(el){let ns=[];let e=el;const flags=new Set();while(e&&e.nodeType===1){ns.unshift(e);e=e.parentElement};let color=[255,255,255,1];for(const n of ns){const c=getComputedStyle(n),p=tuple(c.backgroundColor);if(p)color=blend(p,color);if(c.backgroundImage&&c.backgroundImage!=='none')flags.add('background-image');if(c.mixBlendMode!=='normal')flags.add('mix-blend');if(c.filter!=='none')flags.add('filter');if(c.backdropFilter&&c.backdropFilter!=='none')flags.add('backdrop-filter');if(c.opacity!=='1')flags.add('opacity')}return {color,flags:[...flags]}}
function ignore(el){return Boolean(el.closest('.scene-layer,.layer-group,.finish-layer,.scene-hotspots,.stone-color-layer,.swatch,.global-option__swatch,.handle-option__door,.handle-option__drawer,.material-chip,.material-mini-swatch,.admin-color-swatch,.material-texture-preview,.asset-preview,.technical-view svg,.module-detail__focus'))}
const rows=[];let candidates=0;let flagsCount=0;
for(const el of document.querySelectorAll('body *')){
 if(el.tagName==='SCRIPT'||el.tagName==='STYLE'||el.tagName==='SVG'||ignore(el))continue;
 const cs=getComputedStyle(el),box=el.getBoundingClientRect();if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity<.05||box.width<1||box.height<1)continue;
 const directText=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue).join(' ').replace(/\s+/g,' ').trim();
 const isInput=['INPUT','TEXTAREA'].includes(el.tagName);const caption=directText||(el.tagName==='BUTTON'?el.textContent.trim().slice(0,70):'')||(isInput?(el.getAttribute('placeholder')||el.getAttribute('aria-label')||''):'');
 if(!caption)continue;candidates++;
 const fg=tuple(cs.color);if(!fg)continue;
 const bd=backdrop(el);const text=blend(fg,bd.color);
 const size=parseFloat(cs.fontSize)||16;const large=size>=24||(size>=18.67&&parseInt(cs.fontWeight)>=700);const threshold=large?3:4.5;
 const ratio=contrast(text,bd.color);const flagged=bd.flags.length>0;if(flagged)flagsCount++;
 const rule={path:pathOf(el),text:caption.slice(0,94),tag:el.tagName.toLowerCase(),className:String(el.className||'').slice(0,130),fg:cs.color,effectiveFg:text.map(x=>Math.round(x)),effectiveBg:bd.color.map(x=>Math.round(x)),fontSize:size,threshold,contrast:ratio,flagged,flags:bd.flags,fail:ratio<threshold,htmlId:el.id||null};
 if(rule.fail||flagged)rows.push(rule);
}
const state={url:location.pathname,mode:document.documentElement.dataset.theme||null,candidates,flagged:flagsCount,elements:document.querySelectorAll('body *').length,failures:rows.filter(x=>x.fail&&!x.flagged).length,uncertain:rows.filter(x=>x.flagged).length,problems:rows.slice(0,900)};
return state;
})()`;
function injectCss(html, route){
  const fileRoute=route==='/'?'index.html':route.endsWith('/')?route.slice(1)+'index.html':route.slice(1);
  // Keep the original markup; remove scripts (those may require authentication)
  // and inline exactly the same local stylesheet bytes, in declared order.
  const basedir=path.dirname(path.join(app,fileRoute));
  html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  return html.replace(/<link\b[^>]*>/gi,(tag)=>{
    if(!/rel\s*=\s*["']stylesheet["']/i.test(tag))return tag;
    const m=tag.match(/href\s*=\s*["']([^"']+)["']/i);if(!m)return tag;
    const raw=m[1].split('?')[0].split('#')[0];
    const local=raw.startsWith('/')?path.resolve(app,'.'+raw):path.resolve(basedir,raw);
    if(!local.startsWith(app+path.sep)||!fs.existsSync(local))return '<!-- missing local stylesheet '+raw+' -->';
    return '<style data-audit-source="'+raw+'">\n'+fs.readFileSync(local,'utf8')+'\n</style>';
  });
}
function htmlFor(route){
  if(route in extras) return injectCss(extras[route](),route);
  const f=route==='/'?'index.html':route.endsWith('/')?route.slice(1)+'index.html':route.slice(1);
  let file=path.resolve(app,f);if(!file.startsWith(app+path.sep)||!fs.existsSync(file))return '<!doctype html><html><body><main><h1>ROUTE_NOT_AVAILABLE_OFFLINE: '+route+'</h1></main></body></html>';
  return injectCss(fs.readFileSync(file,'utf8'),route);
}
function writeCsv(data){const rows=[];for(const s of data.routes)for(const p of s.problems){rows.push([s.route,s.mode,s.width,s.kind,p.path,p.text,p.contrast,p.threshold,p.fail,p.flagged,p.flags.join(';'),p.fg,p.effectiveBg.join(','),p.className])}const q=x=>'"'+String(x??'').replace(/"/g,'""').replace(/\n/g,' ')+'"';const head=['route','theme','width','source','path','text','ratio','threshold','fail','uncertain','uncertainty','raw_fg','computed_bg_rgb','class'];fs.writeFileSync(path.join(out,'cssom_pairs.csv'),[head.join(','),...rows.map(r=>r.map(q).join(','))].join('\n')+'\n')}
async function main(){

 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'ds04-chromium-'));let chromeLog='';
 const browser=spawn(chromium,['--headless','--no-sandbox','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-extensions','--disable-features=Translate','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
 browser.stderr.on('data',x=>{chromeLog+=x.toString();if(chromeLog.length>20000)chromeLog=chromeLog.slice(-20000)});
 let ws;try{
 let debPort;for(let k=0;k<130;k++){await sleep(100);try{debPort=+fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];break}catch{if(browser.exitCode!==null)throw Error('Chromium exited: '+chromeLog.slice(-700))}}
 if(!debPort)throw Error('chromium failed to start '+chromeLog.slice(-900));
 let tabs=await fetch(`http://127.0.0.1:${debPort}/json/list`).then(r=>r.json());const tab=tabs.find(x=>x.type==='page');if(!tab)throw Error('no page target');
 ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail});let serial=0,pending=new Map();
 ws.onmessage=e=>{let a=JSON.parse(e.data);if(a.id&&pending.has(a.id)){clearTimeout(pending.get(a.id).timer);pending.get(a.id).resolve(a);pending.delete(a.id)}};
 async function cmd(method,params={}){const id=++serial;const p=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(Error('CDP timeout '+method))}},15000);pending.set(id,{resolve,reject,timer})});ws.send(JSON.stringify({id,method,params}));const data=await p;if(data.error)throw Error(method+' '+data.error.message);return data.result}
 async function evaluate(expression){const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('evaluate '+JSON.stringify(r.exceptionDetails).slice(0,500));return r.result.value}
 await cmd('Runtime.enable');await cmd('Page.enable');
 const testRoutes=process.env.DS04_ROUTES?process.env.DS04_ROUTES.split(',').filter(Boolean):[...routes,...Object.keys(extras)];
 for(const width of widths)for(const route of testRoutes){
   await cmd('Emulation.setDeviceMetricsOverride',{width,height:Math.max(820,Math.floor(width*1.8)),deviceScaleFactor:1,mobile:width<600});
   const page=htmlFor(route);const frameId=(await cmd('Page.getFrameTree')).frameTree.frame.id;
   await cmd('Page.setDocumentContent',{frameId,html:page});let ready=false;for(let k=0;k<25;k++){await sleep(25);try{ready=(await evaluate('document.readyState'))==='complete';if(ready)break}catch{}}
   if(process.env.DS04_DEBUG)console.error('LOADED',route,ready,await evaluate('({text:document.body.innerText.slice(0,80),n:document.querySelectorAll("body *").length})'));for(const mode of themes){
      await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(mode)}; true`);
      await sleep(40);const style=await evaluate(probe);report.routes.push({route,width,mode,kind:route.startsWith('/__ds04__')?'fixture':'static-html',loaded:ready,...style});
      const confirmed=style.problems.filter(p=>p.fail&&!p.flagged).sort((x,y)=>x.contrast-y.contrast).slice(0,3);
      console.log(JSON.stringify({route,width,mode,kind:route.startsWith('/__ds04__')?'fixture':'static-html',candidates:style.candidates,fail:style.failures,uncertain:style.uncertain,worst:confirmed.map(p=>({path:p.path,text:p.text.slice(0,45),contrast:p.contrast}))}));
   }
 }
 const sums={states:report.routes.length,totalTextCandidates:report.routes.reduce((n,r)=>n+r.candidates,0),totalLowContrastPairs:report.routes.reduce((n,r)=>n+r.failures,0),uncertainPairs:report.routes.reduce((n,r)=>n+r.uncertain,0),staticHtmlStates:report.routes.filter(r=>r.kind==='static-html').length,fixtureRoutes:report.routes.filter(r=>r.kind==='fixture').length};report.summary=sums;
 fs.writeFileSync(path.join(out,'cssom_results.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(out,'structural_checks.json'),JSON.stringify({routes:report.structural,countContract:report.countContract},null,2)+'\n');writeCsv(report);
 console.log('REPORT '+JSON.stringify(sums));
 } finally {try{ws?.close()}catch{}browser.kill();try{fs.rmSync(profile,{recursive:true,force:true})}catch{}}
}
main().catch(e=>{console.error(e.stack||e);process.exit(1)});