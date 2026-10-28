"use strict";
// Compare two exact historical/current CSS blobs on the SAME validated local V5.
// Preserve differences as evidence; never assert raster equality or use Netlify.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const {chromium,webkit}=require("playwright");
const meta=require("../../docs/reconciliation/ci-v5-nav-clean/css-causality.json");
const url=process.env.FLOW_LAYOUT_URL;
assert.equal(url,"http://127.0.0.1:8123/config/","CI requires loopback V5 target");
const historical=fs.readFileSync(meta.older.cssArchive,"utf8");
const stable=fs.readFileSync("app/styles.css","utf8");
const output=process.argv[2]||"/tmp/m2d-nav-css-causality";
const wide=process.env.M2D_NAV_WIDE_MATRIX==="1";
const widths=wide?[390,701,900,1050,1051,1200,1366]:meta.test.widths;
const themes=wide?["light","dark"]:["light"];
const detailStates=wide?[false,true]:[true];
fs.mkdirSync(output,{recursive:true});
const captureSha=b=>crypto.createHash("sha256").update(b).digest("hex");
async function inspect(driver,css,width,mode,theme,detail) {
 const page=await driver.newPage({viewport:{width:wide?width:1366,height:900},reducedMotion:"reduce"});
 let switched=0;
 try {
  await page.route(/\/styles\.css(?:\?|$)/,async r=>{switched++;await r.fulfill({status:200,contentType:"text/css",body:css})});
  await page.goto(url,{waitUntil:"domcontentloaded",timeout:25000});
  await page.waitForFunction(()=>document.documentElement.dataset.publishedConfigurationStatus==="validated"
      && !document.querySelector(".workspace")?.hidden
      && window.CASA_EM_MODULOS_DEBUG?.getNormalizedFlow?.()?.stages?.length,
    null,{timeout:25000});
  await page.evaluate(t=>{document.documentElement.dataset.theme=t},theme);
  if(detail){
    await page.locator("#moduleList [data-select-entity]").first().click();
    await page.waitForFunction(()=>document.body.classList.contains("has-module-detail"));
  }
  if(!wide)await page.evaluate(w=>{document.querySelector(".controls").style.width=w+"px"},width);
  await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
  // Screenshot flushes pending container-query/layout updates before reading
  // computed text metrics; historical nav-differential gate used the same order.
  await page.waitForTimeout(160);
  const shot=await page.locator(".flow-nav").screenshot({animations:"disabled",timeout:10000});
  const data=await page.evaluate(()=>{
    const nav=document.querySelector(".flow-nav"),controls=document.querySelector(".controls");
    const labels=[...nav.querySelectorAll(".flow-step__label")];
    const buttons=[...nav.querySelectorAll("[data-step]")];
    const navStyle=getComputedStyle(nav),ctrlStyle=getComputedStyle(controls);
    const navContent=nav.clientWidth-parseFloat(navStyle.paddingLeft)-parseFloat(navStyle.paddingRight);
    const ctrlContent=controls.clientWidth-parseFloat(ctrlStyle.paddingLeft)-parseFloat(ctrlStyle.paddingRight);
    return {
      navContainer:navStyle.containerName,controlsContainer:ctrlStyle.containerName,
      navWidth:nav.getBoundingClientRect().width,
      navContentWidth:navContent,controlsWidth:controls.getBoundingClientRect().width,
      controlsContentWidth:ctrlContent,
      labelFontSizes:labels.map(x=>getComputedStyle(x).fontSize),
      labelWidths:labels.map(x=>Math.round(x.getBoundingClientRect().width*100)/100),
      stepCount:buttons.length,stepLabels:buttons.map(x=>x.dataset.step),
      navScrollWidth:nav.scrollWidth,navClientWidth:nav.clientWidth,
      navOverflow:nav.scrollWidth>nav.clientWidth+2,
      compactLabel:labels.length>0&&labels.every(x=>Number.parseFloat(getComputedStyle(x).fontSize)===0)
    };
  });
  data.navRasterSha256=captureSha(shot);
  data.cssRouteFulfilled=switched;
  assert.ok(switched>0,"Stylesheet injection must have occurred: "+mode+"/"+width);
  assert.ok(data.stepCount>=2 && data.stepCount===data.labelFontSizes.length,"Published V5 stage/label count: "+mode+"/"+width);
  if(mode==="stable"){
    assert.equal(data.navContainer,"flow-steps","new owner is navigation not controls");
    assert.notEqual(data.controlsContainer,"flow-steps","parent controls must not own label boundary");
    assert.equal(data.navOverflow,false,"main navigation must not overflow at fixed controls width "+width);
    // The stylesheet query is evaluated on the navigation content box.
    if(Math.abs(data.navContentWidth-500)>2){
      assert.equal(data.compactLabel,data.navContentWidth<=500,
        "label switch must track nav container not parent width: "+JSON.stringify(data));
    }
  }else{
    assert.equal(data.controlsContainer,"flow-steps","old query owner remains controls");
    assert.notEqual(data.navContainer,"flow-steps","old query is not local to nav");
  }
  return data;
 }finally{await page.close()}
}
(async()=>{
 const rows=[];
 for(const [engineName,engine] of [["chromium",chromium],["webkit",webkit]]){
  const browser=await engine.launch({headless:true});
  try{
   for(const width of widths)for(const theme of themes)for(const detail of detailStates){
    const old=await inspect(browser,historical,width,"historical",theme,detail);
    const current=await inspect(browser,stable,width,"stable",theme,detail);
    const sameRaster=old.navRasterSha256===current.navRasterSha256;
    const sameCompact=old.compactLabel===current.compactLabel;
    const row={engine:engineName,width,theme,detail,sameRaster,sameCompact,
      old:{navContainer:old.navContainer,controlsContainer:old.controlsContainer,
        navWidth:old.navWidth,navContentWidth:old.navContentWidth,
        controlsContentWidth:old.controlsContentWidth,compactLabel:old.compactLabel,
        navOverflow:old.navOverflow,sha:old.navRasterSha256},
      main:{navContainer:current.navContainer,controlsContainer:current.controlsContainer,
        navWidth:current.navWidth,navContentWidth:current.navContentWidth,
        controlsContentWidth:current.controlsContentWidth,compactLabel:current.compactLabel,
        navOverflow:current.navOverflow,sha:current.navRasterSha256}};
    rows.push(row);
    console.log("M2D_NAV_CSS_CAUSAL_CASE "+JSON.stringify({engine:engineName,width,theme,detail,sameRaster,sameCompact,oldCompact:old.compactLabel,mainCompact:current.compactLabel,mainNavContent:current.navContentWidth}));
   }
  }finally{await browser.close()}
 }
 const differences=rows.filter(r=>!r.sameRaster).length;
 const switchDifferences=rows.filter(r=>!r.sameCompact).length;
 const report={schema:"M2DNavCSSBoundaryMeasurement/0.1",
  pinnedMain:meta.stableMain.sha,pinnedHistorical:meta.older.sha,
  matrix:wide?"profile-theme-detail":"controls-500-boundary",tests:rows.length,differences,switchDifferences,rows,
  caveat:"raster mismatch is evidence of changed CSS ownership, not by itself a regression; this is isolated V5 browser, not Netlify session"};
 fs.writeFileSync(path.join(output,"result.json"),JSON.stringify(report,null,2)+"\n");
 assert.equal(rows.length,widths.length*themes.length*detailStates.length*meta.test.engines.length);
 console.log("M2D_NAV_CSS_CAUSAL_COMPLETE "+JSON.stringify({cases:rows.length,differences,switchDifferences,main:meta.stableMain.sha}));
})().catch(e=>{console.error(e);process.exitCode=1});
