const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.evaluate(async () => Promise.all([...document.images].map(img => img.decode().catch(() => null))));
  await page.waitForTimeout(900);

  const assert = (condition, message) => { if (!condition) throw new Error(message); };

  const regionAlpha = (x,y,w,h) => page.$eval("#plinthCanvas",(canvas,r)=>{
    const data=canvas.getContext("2d").getImageData(r.x,r.y,r.w,r.h).data;
    let alpha=0;
    for(let i=3;i<data.length;i+=4) if(data[i]) alpha++;
    return alpha;
  },{x,y,w,h});

  await page.waitForFunction(() => {
    const c=document.getElementById("plinthCanvas"),d=c.getContext("2d").getImageData(480,850,750,55).data;
    for(let i=3;i<d.length;i+=4) if(d[i]) return true;
    return false;
  });

  const extensions = {
    stone02Left: await regionAlpha(485,858,18,36),
    stone02Right: await regionAlpha(745,858,12,36),
    stone03Left: await regionAlpha(736,858,8,36),
    stone03Right: await regionAlpha(1204,858,13,36)
  };
  assert(extensions.stone02Left > 20, "stone-02 left plinth side is still outside runtime mask");
  assert(extensions.stone02Right > 20, "stone-02 right plinth edge is still outside runtime mask");
  assert(extensions.stone03Left > 20, "stone-03 left plinth edge is still outside runtime mask");
  assert(extensions.stone03Right > 20, "stone-03 right plinth edge is still outside runtime mask");

  const plinthStats = await page.$eval("#plinthCanvas", canvas => {
    const data=canvas.getContext("2d").getImageData(480,858,750,36).data;
    let count=0,r=0,g=0,b=0,l=0,l2=0;
    for(let i=0;i<data.length;i+=4){
      if(!data[i+3]) continue;
      const lum=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];
      count++;r+=data[i];g+=data[i+1];b+=data[i+2];l+=lum;l2+=lum*lum;
    }
    const mean=l/count;
    return {count,meanRgb:[r/count,g/count,b/count],lumaMean:mean,lumaStd:Math.sqrt(Math.max(0,l2/count-mean*mean))};
  });
  const target=[238,234,227];
  assert(plinthStats.meanRgb.every((v,i)=>Math.abs(v-target[i])<35), "base MDF plinth mean drifted too far from selected finish");

  const styleFor = async id => {
    await page.locator('[data-step="finishes"]').click();
    await page.locator('[data-finish-id="'+id+'"]').click();
    await page.waitForTimeout(180);
    return page.locator('[data-entity-id="module-03"]').evaluate(group => {
      const shadow=group.querySelector(".structure-layer--shadow");
      const highlight=group.querySelector(".structure-layer--highlight");
      return {
        luma:Number(group.dataset.structureLuminance),
        shadow:Number(getComputedStyle(shadow).opacity),
        highlight:Number(getComputedStyle(highlight).opacity),
        shadowMask:getComputedStyle(shadow).maskImage || getComputedStyle(shadow).webkitMaskImage,
        highlightMask:getComputedStyle(highlight).maskImage || getComputedStyle(highlight).webkitMaskImage
      };
    });
  };

  const bright=await styleFor("base-light");
  const soft=await styleFor("tone-15-b");
  const mid=await styleFor("tone-15-a");
  const wood=await styleFor("tone-25-a");
  const dark=await styleFor("tone-25-b");

  assert(bright.luma > .9 && soft.luma > .9, "bright texture luminance metrics not applied");
  assert(dark.luma < .25, "dark texture luminance metric not applied");
  assert(bright.shadow > mid.shadow, "bright finish did not receive stronger structural shadow");
  assert(soft.shadow > mid.shadow, "soft bright finish did not receive stronger structural shadow");
  assert(dark.shadow < mid.shadow, "dark finish shadow was not reduced");
  assert(dark.highlight > .05, "dark finish did not receive subtle highlight support");
  assert(bright.shadowMask !== "none" && bright.highlightMask !== "none", "structure masks missing from runtime");

  await styleFor("base-light");
  await page.locator(".viewer").screenshot({path:"/tmp/review/seams-base-light.png"});
  await styleFor("tone-15-b");
  await page.locator(".viewer").screenshot({path:"/tmp/review/seams-soft-light.png"});
  await styleFor("tone-25-a");
  await page.locator(".viewer").screenshot({path:"/tmp/review/seams-wood.png"});
  await styleFor("tone-25-b");
  await page.locator(".viewer").screenshot({path:"/tmp/review/seams-dark.png"});

  // Expanded physical plinth must remain covered when switching to stone.
  await page.locator('[data-stone-package-id="stone-dark"]').click();
  await page.locator("#stoneSkirtingToggle").check();
  await page.waitForTimeout(500);
  const stoneExtensions = {
    stone02Left: await regionAlpha(485,858,18,36),
    stone03Right: await regionAlpha(1204,858,13,36)
  };
  assert(stoneExtensions.stone02Left > 20 && stoneExtensions.stone03Right > 20, "expanded plinth support disappeared in stone mode");
  await page.locator(".viewer").screenshot({path:"/tmp/review/plinth-stone-expanded.png"});

  if(errors.length) throw new Error("page errors: "+errors.join(" | "));
  fs.writeFileSync("/tmp/review/gate.json",JSON.stringify({pass:true,extensions,stoneExtensions,plinthStats,bright,soft,mid,wood,dark},null,2));
  await browser.close();
})().catch(err=>{console.error(err);process.exit(1);});
