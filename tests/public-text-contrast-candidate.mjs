// AUDIT-PUBLIC-TEXT-02 — visual candidate only; neither CSS nor HTML is changed in app/.
import assert from "node:assert/strict";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {chromium,webkit} from "playwright";
import {join} from "node:path";

const CANDIDATE=await readFile("evidence/visual/public-text-contrast-candidate-v1.css","utf8");
const ORIGIN=process.env.PUBLIC_AUDIT_ORIGIN||"http://127.0.0.1:8123";
const WIDTHS=[390,768,1366],THEMES=["light","dark"];
const CASES=[
 {route:"/",id:"story",selector:".story-section > p:not(.eyebrow)",surface:"#e8e3dc"},
 {route:"/",id:"feature",selector:".feature-copy > p:not(.eyebrow):not(.feature-availability)",surface:"#f0ede8"},
 {route:"/about/",id:"closing",selector:".about-closing > p:not(.eyebrow):not(.about-closing__signature)",surface:"#f0ede8"},
 {route:"/about/",id:"stat",selector:".about-scale__stat > span",surface:"#f0ede8"},
 {route:"/how-it-works/",id:"finish",selector:".finish-copy > p:not(.eyebrow)",surface:"#f0ede8"}
];
const CONTROLS=[
 {route:"/",selector:".hero-description"},
 {route:"/",selector:".feature-copy > p.feature-availability"},
 {route:"/about/",selector:".about-scale__copy > p:not(.eyebrow)"},
 {route:"/about/",selector:".about-closing__signature"},
 {route:"/how-it-works/",selector:".how-hero-note"},
 {route:"/how-it-works/",selector:".study-band .eyebrow"}
];
assert.equal((CANDIDATE.match(/html\[data-theme="light"\]/g)||[]).length,5);
assert.ok(!/\bimportant\b/.test(CANDIDATE),"Candidate cannot use !important");
function lin(v){let z=parseInt(v,16)/255;return z<=.04045?z/12.92:((z+.055)/1.055)**2.4;}
function lum(h){const t=h.slice(1);return .2126*lin(t.slice(0,2))+.7152*lin(t.slice(2,4))+.0722*lin(t.slice(4,6));}
function ratio(x,y){let a=lum(x),b=lum(y);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
async function snapshot(page,selector){
 return page.locator(selector).evaluateAll(list=>list.map(el=>{
  const s=getComputedStyle(el),b=getComputedStyle(el.closest(".environment-feature")||el.closest("section")||el.parentElement),
    r=el.getBoundingClientRect();
  return {color:s.color,background:b.backgroundColor,fontSize:s.fontSize,fontWeight:s.fontWeight,
   x:r.x+scrollX,y:r.y+scrollY,w:r.width,h:r.height,content:el.textContent?.trim()||"",textAlign:s.textAlign};
 }));
}
function hex(rgb){
 const m=rgb.match(/^rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)\s*\)$/);
 assert.ok(m,"Opaque rgb required: "+rgb);
 return "#"+[1,2,3].map(i=>Number(m[i]).toString(16).padStart(2,"0")).join("");
}
const report={schema:"M2DPublicTextContrastCandidate/1",baseline:"main@15e1cfb; no app modifications",
 candidate:"evidence/visual/public-text-contrast-candidate-v1.css (injected in browser only)",
 status:"candidate-not-homologated",engines:["chromium","webkit"],widths:WIDTHS,themes:THEMES,
 scenarios:0,changed:0,unchangedDark:0,controlChecks:0,cases:[],visualShots:[]};
await mkdir("artifacts/public-contrast-candidate",{recursive:true});
for(const [engine,lib] of [["chromium",chromium],["webkit",webkit]]){
 const browser=await lib.launch({headless:true});
 try{
  for(const width of WIDTHS)for(const theme of THEMES)for(const route of ["/","/about/","/how-it-works/"]){
   const page=await browser.newPage({viewport:{width,height:900},colorScheme:theme,reducedMotion:"reduce"});
   try{
    await page.addInitScript(mode=>localStorage.setItem("casa-ui-theme-mode-v1",mode),theme);
    const response=await page.goto(new URL(route,ORIGIN).toString(),{waitUntil:"domcontentloaded",timeout:20000});
    assert.equal(response?.status(),200,"Route failed: "+route);
    assert.equal(await page.locator("html").getAttribute("data-theme"),theme);
    await page.evaluate(()=>document.fonts.ready);
    // Landing's real intro uses an animated transform. Comparing document
    // coordinates during that intro incorrectly attributes movement to CSS.
    if(route==="/")await page.waitForFunction(()=>{
      const splash=document.querySelector("#introSplash");
      return !splash||getComputedStyle(splash).pointerEvents==="none";
    },null,{timeout:8000});
    if(route==="/")await page.waitForTimeout(500); // finish delayed hero public-reveal transforms
    const targets=CASES.filter(c=>c.route===route),controls=CONTROLS.filter(c=>c.route===route);
    const beforeControl=new Map();
    for(const c of controls)beforeControl.set(c.selector,await snapshot(page,c.selector));
    const local=[];
    for(const c of targets){
     assert.ok(await page.locator(c.selector).count()>0,c.id+" selector missing");
     if(engine==="chromium"&&theme==="light"&&[390,1366].includes(width)){
      const path=join("artifacts/public-contrast-candidate",engine+"-"+width+"-"+c.id+"-before.png");
      await page.locator(c.selector).first().screenshot({path,animations:"disabled"});
      report.visualShots.push(path);
     }
     local.push({c,before:await snapshot(page,c.selector)});
    }
    const beforeVar=await page.locator("html").evaluate(el=>getComputedStyle(el).getPropertyValue("--public-muted"));
    await page.addStyleTag({content:CANDIDATE});
    const afterVar=await page.locator("html").evaluate(el=>getComputedStyle(el).getPropertyValue("--public-muted"));
    assert.equal(afterVar,beforeVar,"Global --public-muted modified");
    for(const c of controls){
     const before=beforeControl.get(c.selector),after=await snapshot(page,c.selector);
     const stable=rows=>rows.map(({x,y,...rest})=>rest); // layout transitions move controls while colors remain identical
     assert.deepEqual(stable(after),stable(before),"Unrelated approved/semantic control changed: "+c.selector);
     report.controlChecks++;
    }
    for(const {c,before} of local){
     const after=await snapshot(page,c.selector);
     assert.equal(after.length,before.length,c.id+" count changed");
     for(let n=0;n<before.length;n++){
      const a=before[n],b=after[n];
      for(const key of ["background","fontSize","fontWeight","w","h","textAlign","content"])
       assert.deepEqual(b[key],a[key],"Geometry/content changed: "+c.id+" "+key);
      assert.ok(Math.abs(b.x-a.x)<.01 && Math.abs(b.y-a.y)<.01,"Position changed");
      if(theme==="light"){
       assert.equal(hex(a.color),"#706c66","Baseline drift: "+c.id);
       if(hex(b.color)!=="#705c4b"){
        const detail=await page.evaluate(selector=>{
         const el=document.querySelector(selector);
         const styles=[...document.querySelectorAll("style")];
         const our=styles.find(s=>s.textContent?.includes("AUDIT-PUBLIC-TEXT-02"));
         return {
          theme:document.documentElement.getAttribute("data-theme"),
          matches:el.matches('html[data-theme="light"] .story-section > p:not(.eyebrow)'),
          inline:el.getAttribute("style"),color:getComputedStyle(el).color,
          styleCount:styles.length,candidatePresent:!!our,
          candidateText:our?.textContent?.slice(0,900),
          rules:our?[...our.sheet.cssRules].map(r=>({selector:r.selectorText,color:r.style?.color,match:el.matches(r.selectorText)})):[],
          relevantSheets:[...document.styleSheets].map(s=>s.href||"inline").slice(-12)
         };
        },c.selector);
        console.error("PUBLIC_CANDIDATE_DEBUG "+JSON.stringify({engine,width,theme,route,id:c.id,detail}));
       }
       assert.equal(hex(b.color),"#705c4b","New candidate incorrect: "+c.id);
       assert.equal(hex(a.background),c.surface,"Unexpected surface: "+c.id);
       assert.equal(hex(b.background),c.surface,"Candidate surface changed: "+c.id);
       assert.ok(ratio(hex(b.color),c.surface)>=4.5,"Candidate below WCAG AA normal text");
       assert.ok(ratio(hex(b.color),c.surface)>ratio(hex(a.color),c.surface));
       report.changed++;
      }else{
       assert.deepEqual(b,a,"Dark theme must be pixel-compatible: "+c.id);
       report.unchangedDark++;
      }
      report.cases.push({engine,width,theme,route,id:c.id,index:n,
       baselineColor:hex(a.color),candidateColor:hex(b.color),surface:hex(b.background),
       baselineRatio:Number(ratio(hex(a.color),hex(b.background)).toFixed(4)),
       candidateRatio:Number(ratio(hex(b.color),hex(b.background)).toFixed(4)),
       changed:hex(a.color)!==hex(b.color)});
     }
     if(engine==="chromium"&&theme==="light"&&[390,1366].includes(width)){
      const path=join("artifacts/public-contrast-candidate",engine+"-"+width+"-"+c.id+"-after.png");
      await page.locator(c.selector).first().screenshot({path,animations:"disabled"});
      report.visualShots.push(path);
     }
    }
    report.scenarios++;
   }finally{await page.close();}
  }
 }finally{await browser.close();}
}
assert.equal(report.scenarios,36);
assert.equal(report.changed,36,"Expected 36 element-level light-theme changes");
assert.equal(report.unchangedDark,36);
assert.equal(report.controlChecks,72);
const out=join("artifacts/public-contrast-candidate","report.json");
await writeFile(out,JSON.stringify(report,null,2)+"\n");
console.log("PUBLIC_CONTRAST_CANDIDATE_PASS "+JSON.stringify({
 scenarios:report.scenarios,changed:report.changed,unchangedDark:report.unchangedDark,
 controls:report.controlChecks,visualShotPairs:report.visualShots.length/2,
 pairs:CASES.map(x=>({id:x.id,on:x.surface,ratio:Number(ratio("#705c4b",x.surface).toFixed(4))}))
}));
