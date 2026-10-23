import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {PNG} from "pngjs";
import {chromium,webkit} from "playwright";

// Read-only: temporarily reconstruct legacy text color over current page, then remove.
// A full-page raster diff must be contained by approved target text rectangles.
const origin=process.env.PUBLIC_AUDIT_ORIGIN||"http://127.0.0.1:8123";
const routes=[
 {path:"/",slug:"landing",selectors:[".story-section > p:not(.eyebrow)",".feature-copy > p:not(.eyebrow):not(.feature-availability)"]},
 {path:"/about/",slug:"about",selectors:[".about-closing > p:not(.eyebrow):not(.about-closing__signature)",".about-scale__stat > span"]},
 {path:"/how-it-works/",slug:"how",selectors:[".finish-copy > p:not(.eyebrow):not(.finish-signature)"]}
];
const legacy=[
 'html[data-theme="light"] .story-section > p:not(.eyebrow),',
 'html[data-theme="light"] .feature-copy > p:not(.eyebrow):not(.feature-availability),',
 'html[data-theme="light"] .about-closing > p:not(.eyebrow):not(.about-closing__signature),',
 'html[data-theme="light"] .about-scale__stat > span,',
 'html[data-theme="light"] .finish-copy > p:not(.eyebrow):not(.finish-signature) {color:#706C66!important;}'
].join("\n");
const outDir="artifacts/vis002c-full-page";
await mkdir(outDir,{recursive:true});
const results=[];
const sample=(selectors)=>selectors.flatMap(selector=>[...document.querySelectorAll(selector)].filter(el=>{
 const r=el.getBoundingClientRect(),s=getComputedStyle(el);
 return r.width>0&&r.height>0&&s.display!=="none"&&s.visibility!=="hidden";
}).map(el=>{
 const r=el.getBoundingClientRect();
 return {selector,color:getComputedStyle(el).color,x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height};
}));
for(const [browserName,lib] of [["chromium",chromium],["webkit",webkit]]){
 const browser=await lib.launch({headless:true});
 try{
  for(const width of [390,1366])for(const route of routes){
   const page=await browser.newPage({viewport:{width,height:900},colorScheme:"light",reducedMotion:"reduce",deviceScaleFactor:1});
   try{
    // The remote YouTube thumbnail loads asynchronously between snapshots.
    // Keep the SAME iframe/geometry, but pin its cross-origin HTML in CI only.
    // Do not globally silence third-party requests or skip raster assertions.
    await page.route("https://www.youtube-nocookie.com/embed/**",route=>route.fulfill({
      status:200,contentType:"text/html",
      body:"<!doctype html><html><head><meta charset='utf-8'></head><body style='margin:0;background:#000'></body></html>"
    }));
    await page.addInitScript(()=>localStorage.setItem("casa-ui-theme-mode-v1","light"));
    const response=await page.goto(new URL(route.path,origin).toString(),{waitUntil:"domcontentloaded",timeout:20000});
    assert.equal(response?.status(),200,route.path+" HTTP failure");
    assert.equal(await page.locator("html").getAttribute("data-theme"),"light");
    if(route.slug==="landing"){
     await page.locator("#environmentFeature").waitFor({state:"visible",timeout:16000});
     await page.locator("#featureDescription").waitFor({state:"visible",timeout:16000});
    }
    await page.evaluate(async()=>{
     for(const img of document.images)img.loading="eager";
     await document.fonts.ready;
     await Promise.all([...document.images].filter(x=>x.src).map(x=>x.decode?.().catch(()=>{})));
    });
    await page.waitForLoadState("load",{timeout:12000}).catch(()=>{});
    await page.waitForTimeout(300);
    const corrected=await page.evaluate(sample,route.selectors);
    assert.ok(corrected.length>0,route.slug+" missing targets");
    for(const s of corrected)assert.equal(s.color,"rgb(112, 92, 75)",route.slug+" corrected pair drift");
    const style=await page.addStyleTag({content:legacy});
    await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
    const baseline=await page.evaluate(sample,route.selectors);
    assert.equal(baseline.length,corrected.length);
    for(const s of baseline)assert.equal(s.color,"rgb(112, 108, 102)",route.slug+" baseline reconstruction drift");
    const stem=browserName+"-"+width+"-"+route.slug;
    const before=PNG.sync.read(await page.screenshot({fullPage:true,animations:"disabled",caret:"hide",path:join(outDir,stem+"-before.png")}));
    await style.evaluate(el=>el.remove());
    await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
    const restored=await page.evaluate(sample,route.selectors);
    assert.deepEqual(restored,corrected,stem+" changed target layout or style after restoration");
    const after=PNG.sync.read(await page.screenshot({fullPage:true,animations:"disabled",caret:"hide",path:join(outDir,stem+"-after.png")}));
    assert.equal(before.width,after.width,stem+" changed page width");
    assert.equal(before.height,after.height,stem+" changed page height");
    const mask=corrected.map(s=>({x1:Math.floor(s.x-5),x2:Math.ceil(s.x+s.w+5),y1:Math.floor(s.y-5),y2:Math.ceil(s.y+s.h+5)}));
    let changed=0,outside=0;
    for(let y=0;y<before.height;y++)for(let x=0;x<before.width;x++){
     const i=(y*before.width+x)*4;
     const delta=Math.max(Math.abs(before.data[i]-after.data[i]),Math.abs(before.data[i+1]-after.data[i+1]),Math.abs(before.data[i+2]-after.data[i+2]),Math.abs(before.data[i+3]-after.data[i+3]));
     if(delta<=1)continue;
     changed++;
     if(!mask.some(r=>x>=r.x1&&x<=r.x2&&y>=r.y1&&y<=r.y2))outside++;
    }
    const result={browser:browserName,width,route:route.path,size:[before.width,before.height],targetCount:mask.length,changed,outside};
    results.push(result);
    console.log("VIS002C_FULLPAGE_SAMPLE "+JSON.stringify(result));
    assert.ok(changed>0,stem+" no visual color change detected");
    assert.equal(outside,0,stem+" raster changed outside approved text bounding boxes");
   }finally{await page.close();}
  }
 }finally{await browser.close();}
}
assert.equal(results.length,12);
await writeFile(join(outDir,"report.json"),JSON.stringify({schema:"VIS002CFullPageRaster/1",note:"Temporary legacy style on the same current DOM; no app mutation",results},null,2)+"\n");
console.log("VIS002C_FULLPAGE_PASS "+JSON.stringify({scenarios:results.length,changed:results.reduce((a,x)=>a+x.changed,0),outside:results.reduce((a,x)=>a+x.outside,0)}));
