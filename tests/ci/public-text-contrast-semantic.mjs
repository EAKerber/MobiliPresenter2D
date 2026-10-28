// Historical AUDIT-PUBLIC-TEXT-01 semantics on current scoped VIS-002C v0.3.
import assert from "node:assert/strict";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {chromium,webkit}=require("playwright");
const m=JSON.parse(await readFile(new URL("../../design-system/pins/vis-002/context-v0.3.0/contextual-mapping.json",import.meta.url),"utf8"));
assert.equal(m.version,"0.3.0");
assert.equal(m.value,"#292723");
assert.equal(m.contexts.length,10);
const origin=process.env.PUBLIC_AUDIT_ORIGIN||"http://127.0.0.1:8123";
const samples=[
 ["/","hero",".hero-description"],
 ["/","story",".story-section > p:not(.eyebrow)"],
 ["/","feature",".feature-copy > p:not(.eyebrow):not(.feature-availability)"],
 ["/","availability",".feature-copy > p.feature-availability"],
 ["/","environments",".environment span"],
 ["/about/","scale",".about-scale__copy > p:not(.eyebrow)"],
 ["/about/","closing",".about-closing > p:not(.eyebrow):not(.about-closing__signature)"],
 ["/about/","hero",".about-hero__lead"],
 ["/about/","chapters",".about-chapter__body p"],
 ["/about/","stat",".about-scale__stat > span"],
 ["/about/","signature",".about-closing__signature"],
 ["/how-it-works/","hero",".how-hero-note"],
 ["/how-it-works/","eyebrow",".study-band .eyebrow"],
 ["/how-it-works/","story",".story-text-copy p"],
 ["/how-it-works/","study",".study-copy > p:not(.eyebrow)"],
 ["/how-it-works/","quality",".quality-points p"],
 ["/how-it-works/","disclaimer",".image-disclaimer"],
 ["/how-it-works/","finish",".finish-copy > p:not(.eyebrow):not(.finish-signature)"],
 ["/how-it-works/","signature",".finish-copy > p.finish-signature"]
];
const approved=new Map(m.contexts.map(x=>[x.route+"|"+x.selector,x]));
const light=x=>{const v=[0,2,4].map(i=>parseInt(x.slice(i+1,i+3),16)/255).map(q=>q<=.04045?q/12.92:((q+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];};
const ratio=(a,b)=>(Math.max(light(a),light(b))+.05)/(Math.min(light(a),light(b))+.05);
function measure(selector){
 const parse=s=>{
  const a=s.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)(?:\s*[,/]\s*(\d+(?:\.\d+)?))?\s*\)$/);
  return a?{hex:"#"+[1,2,3].map(i=>Math.round(Number(a[i])).toString(16).padStart(2,"0")).join(""),alpha:a[4]===undefined?1:Number(a[4])}:null;
 };
 return [...document.querySelectorAll(selector)].map(el=>{
  const s=getComputedStyle(el),r=el.getBoundingClientRect();
  let bg=null,reason=r.width===0||r.height===0||s.display==="none"||s.visibility==="hidden"||Number(s.opacity)===0?"not-visible":null;
  for(let e=el;e&&!reason;e=e.parentElement){
   const st=getComputedStyle(e);
   if(st.backgroundImage!=="none"){reason="image-or-gradient";break}
   const c=parse(st.backgroundColor);
   if(!c){reason="unparsed-surface";break}
   if(c.alpha===1){bg=c.hex;break}
   if(c.alpha!==0){reason="translucent-surface";break}
  }
  const fg=parse(s.color);
  if(!reason&&(!fg||fg.alpha!==1))reason="nonopaque-text";
  if(!reason&&!bg)reason="no-solid-surface";
  const size=parseFloat(s.fontSize),weight=Number(s.fontWeight)||(/bold/i.test(s.fontWeight)?700:400);
  return {fg:fg?.hex||null,bg,reason,min:size>=24||(size>=18.66&&weight>=700)?3:4.5,
   token:s.getPropertyValue("--ds-vis002c-long-copy-light").trim()};
 });
}
let scenarios=0,approvedChecks=0;
const rows=[],missing=[];
for(const [engineName,engine] of [["chromium",chromium],["webkit",webkit]]){
 const browser=await engine.launch({headless:true});
 try{
  for(const width of [390,768,1366])for(const theme of ["light","dark"])for(const route of ["/","/about/","/how-it-works/"]){
   const label=[engineName,width,theme,route].join("|");
   const context=await browser.newContext({viewport:{width,height:900},colorScheme:theme,reducedMotion:"reduce",serviceWorkers:"block"});
   await context.route("**/*",async req=>{
    const u=new URL(req.request().url());
    if(u.protocol==="data:"||(u.hostname==="127.0.0.1"&&u.port==="8123"))await req.continue();
    else await req.abort("blockedbyclient");
   });
   await context.addInitScript(t=>{try{localStorage.setItem("casa-ui-theme-mode-v1",t)}catch{}},theme);
   const page=await context.newPage();
   try{
    const response=await page.goto(origin+route,{waitUntil:"domcontentloaded",timeout:20000});
    assert.equal(response?.status(),200,label+" route");
    await page.waitForFunction(t=>document.documentElement.dataset.theme===t,theme,{timeout:12000});
    await page.evaluate(async()=>{
     for(const img of document.images)img.loading="eager";
     await document.fonts.ready;
     await Promise.all([...document.images].filter(i=>i.src).map(i=>i.decode?.().catch(()=>{})));
    });
    if(route==="/"){
     await page.locator("#environmentFeature").waitFor({state:"visible",timeout:15000});
     await page.locator("#featureDescription").waitFor({state:"visible",timeout:15000});
    }
    await page.waitForTimeout(300);
    for(const [routeName,id,selector] of samples.filter(x=>x[0]===route)){
     const auth=approved.get(routeName+"|"+selector);
     const found=await page.evaluate(measure,selector);
     if(found.length===0){missing.push({label,id,selector});if(auth)assert.fail(label+" missing authorized "+selector);continue}
     for(const [index,v] of found.entries()){
      if(auth){
       if(theme==="light"&&v.reason!=="not-visible"){
        assert.equal(v.fg,auth.foreground.toLowerCase(),label+" approved foreground "+selector);
        assert.equal(v.token,m.value,label+" approved token "+selector);
        approvedChecks++;
       }else if(theme==="dark")assert.equal(v.token,"",label+" scoped light token in dark "+selector);
       if(theme==="light"&&!v.reason)
        assert.equal(v.bg,auth.background.toLowerCase(),label+" approved background "+selector);
      }
      const cr=v.reason?null:ratio(v.fg,v.bg);
      const status=v.reason?"unverified":cr<v.min?"candidate":"pass";
      rows.push({engine:engineName,width,theme,route,id,selector,index,authorized:!!auth,
       foreground:v.fg,background:v.bg,ratio:cr===null?null:Number(cr.toFixed(4)),
       threshold:v.min,status,reason:v.reason});
     }
    }
    scenarios++;
   }finally{await context.close()}
  }
 }finally{await browser.close()}
}
assert.equal(scenarios,36);
assert.ok(approvedChecks>=24,"mapped contexts did not have enough visible coverage");
const counts=Object.fromEntries(["pass","candidate","unverified"].map(x=>[x,rows.filter(y=>y.status===x).length]));
const report={schema:"M2DPublicTextContrastSemanticAudit/2",sourceCommit:"ace851004713f92b4425e5832c6c892825814f0a",
 sourceTestBlob:"67f5e3556afde97f4ba7396443a583688e1d3a31",
 currentMappingBlob:"e8f42f76e2732cbcf3e9a68d1dc8f82ea79dd73d",
 policy:"read-only; candidate and unverified are observations, not permission to mutate CSS",
 scenarios,approvedChecks,counts,missing,rows};
await mkdir("artifacts/public-contrast-semantic",{recursive:true});
await writeFile("artifacts/public-contrast-semantic/report.json",JSON.stringify(report,null,2)+"\n");
console.log("PUBLIC_CONTRAST_SEMANTIC_PASS "+JSON.stringify({scenarios,approvedChecks,counts,missing:missing.length}));
