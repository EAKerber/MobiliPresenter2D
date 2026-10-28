// Isolated read-only audit: public text on solid CSS surfaces.
import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {chromium,webkit} from "playwright";

const ORIGIN=process.env.PUBLIC_AUDIT_ORIGIN||"http://127.0.0.1:8123";
const WIDTHS=[390,768,1366],THEMES=["light","dark"];
const ROUTES=[
 {path:"/",samples:[
  {id:"landing-hero",selector:".hero-description",light:["#705c4b","#f0ede8"]},
  {id:"landing-story",selector:".story-section > p:not(.eyebrow)",light:["#705c4b","#e8e3dc"]},
  {id:"landing-feature",selector:".feature-copy > p:not(.eyebrow):not(.feature-availability)",light:["#705c4b","#f0ede8"]},
  {id:"landing-environments",selector:".environment span"},
  {id:"landing-availability",selector:".feature-copy > p.feature-availability",keep:"public-text"}]},
 {path:"/about/",samples:[
  {id:"about-scale",selector:".about-scale__copy > p:not(.eyebrow)",light:["#705c4b","#f0ede8"]},
  {id:"about-closing",selector:".about-closing > p:not(.eyebrow):not(.about-closing__signature)",light:["#705c4b","#f0ede8"]},
  {id:"about-hero",selector:".about-hero__lead"},
  {id:"about-chapters",selector:".about-chapter__body p"},
  {id:"about-scale-stat",selector:".about-scale__stat > span",light:["#705c4b","#f0ede8"]},
  {id:"about-signature",selector:".about-closing__signature",keep:"public-text"}]},
 {path:"/how-it-works/",samples:[
  {id:"how-hero",selector:".how-hero-note",light:["#705c4b","#f0ede8"]},
  {id:"how-eyebrow",selector:".study-band .eyebrow",light:["#70522f","#e8e3dc"]},
  {id:"how-story",selector:".story-text-copy p"},
  {id:"how-study",selector:".study-copy > p:not(.eyebrow)"},
  {id:"how-quality",selector:".quality-points p"},
  {id:"how-disclaimer",selector:".image-disclaimer"},
  {id:"how-finish",selector:".finish-copy > p:not(.eyebrow):not(.finish-signature)",light:["#705c4b","#f0ede8"]},
  {id:"how-signature",selector:".finish-copy > p.finish-signature",keep:"accent-dark"}]}
];
function lin(v){const c=parseInt(v,16)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}
function lum(h){const s=h.replace("#","");return .2126*lin(s.slice(0,2))+.7152*lin(s.slice(2,4))+.0722*lin(s.slice(4,6));}
function contrast(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
const all=[];let scenarios=0,approvedChecks=0;
for(const [engine,lib] of [["chromium",chromium],["webkit",webkit]]){
 const browser=await lib.launch({headless:true});
 try{
  for(const width of WIDTHS)for(const theme of THEMES)for(const route of ROUTES){
   const page=await browser.newPage({viewport:{width,height:900},colorScheme:theme,reducedMotion:"reduce"});
   try{
    await page.addInitScript(mode=>localStorage.setItem("casa-ui-theme-mode-v1",mode),theme);
    const response=await page.goto(new URL(route.path,ORIGIN).toString(),{waitUntil:"domcontentloaded",timeout:20000});
    assert.equal(response?.status(),200,route.path+" HTTP status");
    assert.equal(await page.locator("html").getAttribute("data-theme"),theme,route.path+" theme");
    const muted=await page.locator("html").evaluate(el=>getComputedStyle(el).getPropertyValue("--public-muted").trim().toLowerCase());
    assert.equal(muted,theme==="light"?"#706c66":"#c4bcb2","Global --public-muted changed unexpectedly");
    for(const target of route.samples){
     const loc=page.locator(target.selector);
     assert.ok(await loc.count()>0,route.path+" missing "+target.selector);
     const values=await loc.evaluateAll(elements=>elements.map(el=>{
      const parse=s=>{
       const m=s.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)(?:\s*[,/]\s*(\d+(?:\.\d+)?))?\s*\)$/);
       return m?{hex:"#"+[1,2,3].map(i=>Math.round(Number(m[i])).toString(16).padStart(2,"0")).join(""),alpha:m[4]===undefined?1:Number(m[4])}:null;
      };
      const st=getComputedStyle(el),rect=el.getBoundingClientRect();
      let bg=null,reason=rect.width===0||rect.height===0||st.display==="none"||st.visibility==="hidden"?"not-visible":null;
      for(let cur=el;cur&&!reason;cur=cur.parentElement){
       const s=getComputedStyle(cur);
       if(s.backgroundImage!=="none"){reason="image-or-gradient-background";break;}
       const layer=parse(s.backgroundColor);
       if(!layer){reason="unparsed-background";break;}
       if(layer.alpha===1){bg=layer.hex;break;}
       if(layer.alpha!==0){reason="translucent-background";break;}
      }
      const fg=parse(st.color);
      if(!reason&&(!fg||fg.alpha!==1))reason="nonopaque-or-unparsed-text";
      if(!reason&&!bg)reason="no-solid-ancestor";
      return {fg:fg?.hex||null,bg,reason,fontSize:parseFloat(st.fontSize),fontWeight:st.fontWeight};
     }));
     for(const [index,val] of values.entries()){
      const weight=Number(val.fontWeight)||(/bold/i.test(val.fontWeight)?700:400);
      const min=val.fontSize>=24||(val.fontSize>=18.66&&weight>=700)?3:4.5;
      const ratio=val.reason?null:contrast(val.fg,val.bg);
      const status=val.reason?"unverified":ratio<min?"contrast-candidate":"passes-threshold";
      const row={engine,path:route.path,width,theme,id:target.id,selector:target.selector,index,
       fg:val.fg,bg:val.bg,ratio:ratio===null?null:Number(ratio.toFixed(4)),min,status,reason:val.reason};
      all.push(row);
      if(target.keep){
       const expected=theme==="light"
        ?(target.keep==="accent-dark"?"#6e512e":"#22211f")
        :(target.keep==="accent-dark"?"#e2c991":"#f4f1eb");
       assert.equal(val.fg,expected,"Excluded semantic text changed: "+JSON.stringify(row));
      }
      if(theme==="light"&&target.light){
       assert.equal(val.reason,null,"Approved pair unresolved: "+JSON.stringify(row));
       assert.equal(val.fg,target.light[0],"Approved foreground drift: "+JSON.stringify(row));
       assert.equal(val.bg,target.light[1],"Approved background drift: "+JSON.stringify(row));
       assert.ok(ratio>=min,"Approved contrast regression: "+JSON.stringify(row));
       approvedChecks++;
      }
     }
    }
    scenarios++;
   }finally{await page.close();}
  }
 }finally{await browser.close();}
}
const counts={total:all.length,passes:all.filter(x=>x.status==="passes-threshold").length,
 candidates:all.filter(x=>x.status==="contrast-candidate").length,
 unverified:all.filter(x=>x.status==="unverified").length};
const grouped=Object.values(all.reduce((map,s)=>{
 const key=[s.path,s.id,s.theme].join("|");
 const item=map[key]??={path:s.path,id:s.id,theme:s.theme,count:0,lowestRatio:null,fg:s.fg,bg:s.bg,below:0,unverified:0};
 item.count++;
 if(s.ratio!==null)item.lowestRatio=item.lowestRatio===null?s.ratio:Math.min(item.lowestRatio,s.ratio);
 if(s.status==="contrast-candidate")item.below++;
 if(s.status==="unverified")item.unverified++;
 return map;
},{})).sort((a,b)=>a.path.localeCompare(b.path)||a.id.localeCompare(b.id)||a.theme.localeCompare(b.theme));
const report={schema:"M2DVIS002CContrastConformance/1",source:"checked-out app on loopback",
 scope:"VIS-002C contextual pairs with legacy exclusions; opaque CSS ancestor surfaces only",
 scenarios,widths:WIDTHS,engines:["chromium","webkit"],themes:THEMES,approvedChecks,counts,grouped,samples:all};
await mkdir("artifacts/vis002c-contrast",{recursive:true});
await writeFile("artifacts/vis002c-contrast/report.json",JSON.stringify(report,null,2)+"\n");
console.log("VIS002C_CONTRAST_PASS "+JSON.stringify({scenarios,approvedChecks,counts}));
console.log("VIS002C_CONTRAST_UNVERIFIED "+JSON.stringify(grouped.filter(x=>x.below||x.unverified)));

assert.equal(scenarios,36,"Complete 36-case browser matrix required");
assert.equal(approvedChecks,72,"Approved contextual pair coverage changed");
assert.equal(counts.candidates,0,"No measured in-scope text may remain below threshold");
