import assert from "node:assert/strict";
import { mkdir,writeFile } from "node:fs/promises";
import { chromium,webkit } from "playwright";
import { PNG } from "pngjs";

const BASE="http://127.0.0.1:8124",CANDIDATE="http://127.0.0.1:8123";
const cases=[
  {route:"/",selector:".hero-description"},
  {route:"/how-it-works/",selector:".how-hero-note"},
  {route:"/about/",selector:".about-scale p:not(.eyebrow)"}
];
const widths=[320,390,768,1366],themes=["light","dark"];
const out="artifacts/p-token-02b";
const token="--ds-vis002-approved-support-text-light";
await mkdir(out,{recursive:true});

function pixelDelta(a,b){
  const p=PNG.sync.read(a),q=PNG.sync.read(b);
  if(p.width!==q.width||p.height!==q.height)return {kind:"dimensions",main:[p.width,p.height],candidate:[q.width,q.height]};
  let changed=0,maxChannel=0;
  for(let i=0;i<p.data.length;i+=4){
    let diff=0;
    for(let c=0;c<4;c++) diff=Math.max(diff,Math.abs(p.data[i+c]-q.data[i+c]));
    if(diff){changed++;maxChannel=Math.max(maxChannel,diff);}
  }
  return {kind:"pixel",changed,total:p.width*p.height,fraction:changed/(p.width*p.height),maxChannel};
}
async function capture(browser,origin,scenario,width,theme){
  const ctx=await browser.newContext({viewport:{width,height:844},
    colorScheme:theme,reducedMotion:"reduce",locale:"pt-BR",deviceScaleFactor:1,serviceWorkers:"block"});
  await ctx.addInitScript(theme=>localStorage.setItem("casa-ui-theme-mode-v1",theme),theme);
  const page=await ctx.newPage();const errors=[];
  page.on("pageerror",e=>errors.push(String(e.message).slice(0,160)));
  try{
    const response=await page.goto(origin+scenario.route,{waitUntil:"domcontentloaded",timeout:30000});
    assert.equal(response?.status(),200,origin+scenario.route);
    const target=page.locator(scenario.selector).first();
    await target.waitFor({state:"visible",timeout:12000});
    await page.evaluate(async selector=>{
      await document.fonts?.ready;
      await Promise.all([...document.querySelectorAll(selector+" img")].map(x=>x.decode().catch(()=>{})));
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    },scenario.selector);
    const styles=await target.evaluate((node,property)=>{
      const s=getComputedStyle(node),r=node.getBoundingClientRect();
      return {color:s.color,background:s.backgroundColor,border:s.borderColor,opacity:s.opacity,
        fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,
        letterSpacing:s.letterSpacing,display:s.display,visibility:s.visibility,textAlign:s.textAlign,
        width:Math.round(r.width*100)/100,height:Math.round(r.height*100)/100,
        x:Math.round(r.x*100)/100,y:Math.round(r.y*100)/100,
        token:s.getPropertyValue(property).trim()};
    },token);
    const screenshot=await target.screenshot({animations:"disabled"});
    return {styles,screenshot,errors};
  }finally{await ctx.close();}
}
const report={schema:"M2DToken02BStrictContextualVisual/0.1",cases:[],summary:{scenarios:0,pixelToleranceUsed:0},limits:[
  "Local static HTTP server cannot prove auth/API workflows",
  "Only exact three approved selectors on light and dark pages; no broad global token mapping",
  "Visual matching does not itself approve new palette values"
]};
for(const engine of [chromium,webkit]){
  const browser=await engine.launch({headless:true});
  try{
    for(const scenario of cases)for(const width of widths)for(const theme of themes){
      const before=await capture(browser,BASE,scenario,width,theme);
      const after=await capture(browser,CANDIDATE,scenario,width,theme);
      assert.deepEqual(after.errors,before.errors);
      const {token:mainToken,...oldStyle}=before.styles,{token:newToken,...newStyle}=after.styles;
      assert.deepEqual(newStyle,oldStyle,"computed CSS/layout changed "+engine.name()+" "+scenario.route+"/"+width+"/"+theme);
      assert.equal(mainToken,"","reference token must not appear on baseline");
      assert.equal(newToken,theme==="light"?"#705C4B":"","contextual token scope changed");
      if(theme==="light")assert.equal(newStyle.color,"rgb(112, 92, 75)","approved text color changed");
      let delta=null;
      if(!before.screenshot.equals(after.screenshot)){
        delta=pixelDelta(before.screenshot,after.screenshot);
        const key=(scenario.route.replace(/\//g,"_")||"_")+"-"+width+"-"+theme+"-"+engine.name();
        await writeFile(out+"/"+key+"-main.png",before.screenshot);
        await writeFile(out+"/"+key+"-candidate.png",after.screenshot);
        console.log("P_TOKEN_02B_RASTER_DELTA "+JSON.stringify({route:scenario.route,width,theme,engine:engine.name(),...delta}));
        assert.ok(delta.kind==="pixel"&&delta.maxChannel<=1&&delta.fraction<=0.001,
          "screenshot differs more than raster tolerance "+JSON.stringify(delta));
        report.summary.pixelToleranceUsed++;
      }
      report.cases.push({route:scenario.route,selector:scenario.selector,width,theme,engine:engine.name(),
        computedColor:newStyle.color,token:newToken,delta,passed:true});
      report.summary.scenarios++;
      console.log("P_TOKEN_02B_SCENARIO_PASS "+JSON.stringify({route:scenario.route,width,theme,engine:engine.name(),color:newStyle.color}));
    }
  }finally{await browser.close();}
}
assert.equal(report.summary.scenarios,48);
await writeFile(out+"/result.json",JSON.stringify(report,null,2)+"\n");
console.log("P_TOKEN_02B_DIFFERENTIAL_PASS "+JSON.stringify(report.summary));
