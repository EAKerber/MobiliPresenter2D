// R8: responsive, two-theme audit of the 19 informative image fallback frames.
// Uses the built local site and transient image error/load events; never edits HTML.
import assert from "node:assert/strict";
import {mkdir, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {chromium, webkit} from "playwright";

const origin=process.env.PUBLIC_AUDIT_ORIGIN||"http://127.0.0.1:8123";
const framesByRoute=[{path:"/",count:1},{path:"/how-it-works/",count:18}];
const reportDir="artifacts/public-image-fallback-browser";
await mkdir(reportDir,{recursive:true});
const report=[];
function close(a,b,tolerance=2){return Math.abs(a-b)<=tolerance;}
async function ready(page){
  await page.evaluate(async()=>{
    for(const image of document.querySelectorAll("[data-image-fallback] img"))image.loading="eager";
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll("[data-image-fallback] img")]
      .map(image=>image.decode?.().catch(()=>{})));
  });
  await page.waitForTimeout(180);
}
async function inspect(page,index,fail=false){
  return page.evaluate(({index,fail})=>{
    const frames=[...document.querySelectorAll("[data-image-fallback]")];
    const frame=frames[index];
    if(!frame)throw Error("frame missing");
    const img=[...frame.querySelectorAll("img[alt]")].find(x=>x.alt.trim());
    if(!img)throw Error("informative img missing");
    if(fail)img.dispatchEvent(new Event("error"));
    const placeholder=frame.querySelector(".image-fallback");
    const box=frame.getBoundingClientRect();
    const pb=placeholder?.getBoundingClientRect();
    const ib=img.getBoundingClientRect();
    const style=placeholder&&getComputedStyle(placeholder);
    const fg=style?.color, bg=style?.backgroundColor;
    const relative=pb?{left:pb.left-box.left,top:pb.top-box.top,
      width:pb.width,height:pb.height}:null;
    return {
      alt:img.alt,loaded:img.complete&&img.naturalWidth>0,
      hidden:img.hidden,placeholderHidden:placeholder?.hidden??null,
      role:placeholder?.getAttribute("role"),
      label:placeholder?.getAttribute("aria-label"),
      description:placeholder?.querySelector(".image-fallback__description")?.textContent,
      text:placeholder?.querySelector(".image-fallback__status")?.textContent,
      box:{x:box.x,y:box.y,width:box.width,height:box.height},
      image:{width:ib.width,height:ib.height},overlay:relative,
      fg,bg,
      clipped:(placeholder?.scrollHeight||0)>(placeholder?.clientHeight||0)+2,
      horizontalOverflow:document.documentElement.scrollWidth>innerWidth,
      theme:document.documentElement.dataset.theme
    };
  },{index,fail});
}
function rgba(v){
 const m=v?.match(/rgba?\(([^)]+)\)/);if(!m)return null;
 return m[1].split(/[\s,\/]+/).filter(Boolean).slice(0,3).map(Number);
}
function luminance(s){const values=rgba(s);if(!values||values.some(x=>!Number.isFinite(x)))return null;
 const linear=values.map(x=>{let n=x/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});
 return .2126*linear[0]+.7152*linear[1]+.0722*linear[2];
}
function contrast(foreground,background){
 const a=luminance(foreground),b=luminance(background);
 return a===null||b===null?null:(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}
for(const [engineName,engine] of [["chromium",chromium],["webkit",webkit]]){
 const browser=await engine.launch({headless:true});
 try{
  for(const width of [390,1366])for(const theme of ["light","dark"])
   for(const pageSpec of framesByRoute){
    const page=await browser.newPage({
      viewport:{width,height:900},colorScheme:theme,reducedMotion:"reduce",
      deviceScaleFactor:1,serviceWorkers:"block"
    });
    const context=engineName+"/"+width+"/"+theme+"/"+pageSpec.path;
    try{
      await page.route("https://www.youtube-nocookie.com/embed/**",request=>request.fulfill({
        status:200,contentType:"text/html",
        body:"<!doctype html><html><body style='margin:0;background:#000'></body></html>"
      }));
      await page.addInitScript(mode=>localStorage.setItem("casa-ui-theme-mode-v1",mode),theme);
      const response=await page.goto(new URL(pageSpec.path,origin).toString(),
        {waitUntil:"domcontentloaded",timeout:30000});
      assert.equal(response?.status(),200,context+" HTTP");
      await ready(page);
      assert.equal(await page.locator("[data-image-fallback]").count(),pageSpec.count,
        context+" frame count");
      assert.equal(await page.locator("html").getAttribute("data-theme"),theme,context+" theme");
      let visibleFallbacks=0,smallFrames=0,clippedCount=0;
      for(let index=0;index<pageSpec.count;index++){
        const before=await inspect(page,index);
        assert.ok(before.alt.trim(),context+" frame "+index+" missing alt");
        assert.ok(before.box.width>20&&before.box.height>20,context+" initial frame empty "+index);
        const failed=await inspect(page,index,true);
        assert.equal(failed.hidden,true,context+" failed img must be hidden "+index);
        assert.equal(failed.placeholderHidden,false,context+" missing fallback "+index);
        assert.equal(failed.role,"img",context+" fallback inaccessible "+index);
        assert.equal(failed.label,"Imagem indisponível: "+before.alt,context+" inaccessible alt "+index);
        assert.equal(failed.description,before.alt,context+" text alt changed "+index);
        assert.equal(failed.text,"Imagem indisponível",context+" status "+index);
        assert.ok(close(failed.box.width,before.box.width)&&
          close(failed.box.height,before.box.height),
          context+" frame geometry collapsed on image failure "+index+
          " before="+JSON.stringify(before.box)+" after="+JSON.stringify(failed.box));
        assert.ok(failed.overlay&&failed.overlay.width>0&&failed.overlay.height>0&&
          close(failed.overlay.width,failed.box.width)&&
          close(failed.overlay.height,failed.box.height),
          context+" placeholder does not cover original frame "+index);
        const ratio=contrast(failed.fg,failed.bg);
        assert.ok(ratio!==null&&ratio>=4.5,
          context+" fallback contrast insufficient "+index+" ratio="+ratio);
        assert.equal(failed.horizontalOverflow,false,context+" horizontal overflow "+index);
        if(failed.box.height<80)smallFrames++;
        if(failed.clipped)clippedCount++;
        await page.evaluate(index=>{
          const f=[...document.querySelectorAll("[data-image-fallback]")][index];
          const img=[...f.querySelectorAll("img[alt]")].find(x=>x.alt.trim());
          img.dispatchEvent(new Event("load"));
        },index);
        const restored=await inspect(page,index);
        assert.equal(restored.hidden,false,context+" image not restored "+index);
        assert.equal(restored.placeholderHidden,true,context+" fallback not concealed "+index);
        assert.ok(close(restored.box.width,before.box.width)&&
          close(restored.box.height,before.box.height),
          context+" frame not restored "+index);
        visibleFallbacks++;
      }
      const result={engine:engineName,width,theme,path:pageSpec.path,
        frames:visibleFallbacks,smallFrames,scrollableFallbacks:clippedCount};
      report.push(result);
      console.log("PUBLIC_IMAGE_FALLBACK_BROWSER_CASE "+JSON.stringify(result));
    }finally{await page.close();}
  }
 }finally{await browser.close();}
}
assert.equal(report.length,16);
assert.equal(report.reduce((a,x)=>a+x.frames,0),152);
await writeFile(join(reportDir,"report.json"),
 JSON.stringify({schema:"PublicImageFallbackBrowser/1.0",
  note:"error/load events on local built pages; human visual review still required",report},null,2)+"\n");
console.log("PUBLIC_IMAGE_FALLBACK_BROWSER_PASS "+
 JSON.stringify({scenarios:report.length,frameCases:152}));
