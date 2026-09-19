const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");

(async () => {
  const output = process.argv[2] || "/tmp/bmc01-runtime";
  fs.mkdirSync(output,{recursive:true});
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:1366,height:768}});
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("console",m=>{ if(m.type()==="error") errors.push(m.text()); });

  const defaultUrl = process.env.BMC01_BROWSER_URL
    ? process.env.BMC01_BROWSER_URL
    : pathToFileURL(path.resolve(__dirname,"../app/index.html")).href;
  const target = defaultUrl + (defaultUrl.includes("?") ? "&" : "?") + "reconstruction=bmc01";
  await page.goto(target);
  await page.evaluate(() => Promise.all([...document.images].map(img=>img.decode().catch(()=>null))));

  const canvasStats = () => page.evaluate(() => {
    const c=document.getElementById("reconstructionCanvas");
    if(!c) return null;
    const d=c.getContext("2d").getImageData(0,0,c.width,c.height).data;
    let alpha=0,outside=0,carcass=null,plinth=null;
    for(let y=0;y<c.height;y++){
      for(let x=0;x<c.width;x++){
        const i=(y*c.width+x)*4,a=d[i+3];
        if(!a) continue;
        alpha++;
        if(x<742||x>=764||y<520||y>=899) outside++;
        if(!carcass && y>=590&&y<840) carcass=[x,y,d[i],d[i+1],d[i+2],a];
        if(!plinth && y>=860&&y<899) plinth=[x,y,d[i],d[i+1],d[i+2],a];
      }
    }
    return {alpha,outside,carcass,plinth,active:c.dataset.active,revision:Number(c.dataset.renderRevision||0),error:c.dataset.renderError||null};
  });

  assert(await page.locator("#reconstructionCanvas").count()===1,"research canvas not installed");
  const delegated=page.locator('[data-entity-id="module-02-right-exposed-face"] img');
  assert.equal(await delegated.getAttribute("data-render-delegated"),"bmc01");

  const visibilityCases=[];
  const recordVisibilityCase = async (id,module02,module03,expectedActive) => {
    await page.locator("#toggle-module-02").setChecked(module02);
    await page.locator("#toggle-module-03").setChecked(module03);
    await page.waitForFunction(expected => {
      const c=document.getElementById("reconstructionCanvas");
      if(!c || c.dataset.active !== String(expected)) return false;
      const d=c.getContext("2d").getImageData(742,520,22,379).data;
      let any=false;
      for(let i=3;i<d.length;i+=4){ if(d[i]) { any=true; break; } }
      return expected ? any : !any;
    },expectedActive);
    const stats=await canvasStats();
    assert.equal(stats.alpha>0,expectedActive,id+" reconstruction visibility mismatch");
    visibilityCases.push({id,module02,module03,expectedActive,alpha:stats.alpha,outside:stats.outside});
    return stats;
  };

  await recordVisibilityCase("both-visible",true,true,false);
  await recordVisibilityCase("module-02-hidden",false,true,false);
  await recordVisibilityCase("modules-02-03-hidden",false,false,false);
  const base=await recordVisibilityCase("module-03-hidden",true,false,true);
  await page.locator("#viewer").screenshot({path:path.join(output,"base-light.png"),animations:"disabled"});
  assert(base.alpha>1000,"expected reconstructed pixels when Module 03 is hidden");
  assert.equal(base.outside,0,"reconstruction escaped authorized ROI");
  assert(base.carcass && base.plinth,"both material slots must render");
  assert.equal(base.error,null);

  await page.locator('[data-step="finishes"]').click();
  await page.locator('[data-finish-id="tone-25-b"]').click();
  await page.waitForFunction(previous => Number(document.getElementById("reconstructionCanvas").dataset.renderRevision||0) > previous, base.revision);
  const dark=await canvasStats();
  await page.locator("#viewer").screenshot({path:path.join(output,"front-dark.png"),animations:"disabled"});
  assert.notDeepEqual(dark.carcass.slice(2,5),base.carcass.slice(2,5),"carcass did not react to front finish");
  assert.notDeepEqual(dark.plinth.slice(2,5),base.plinth.slice(2,5),"default plinth did not follow front finish");

  await page.locator('[data-stone-package-id="stone-green"]').click();
  await page.waitForFunction(previous => Number(document.getElementById("reconstructionCanvas").dataset.renderRevision||0) > previous, dark.revision);
  const stoneSelected=await canvasStats();
  await page.locator("#stoneSkirtingToggle").check();
  await page.waitForFunction(previous => Number(document.getElementById("reconstructionCanvas").dataset.renderRevision||0) > previous, stoneSelected.revision);
  const stone=await canvasStats();
  await page.locator("#viewer").screenshot({path:path.join(output,"stone-skirting-green.png"),animations:"disabled"});
  assert.deepEqual(stone.carcass.slice(2,5),dark.carcass.slice(2,5),"stone skirting changed carcass slot");
  console.log(JSON.stringify({base,dark,stoneSelected,stone},null,2));
  assert.notDeepEqual(stone.plinth.slice(2,5),dark.plinth.slice(2,5),"stone skirting did not change plinth slot");

  await page.locator('[data-step="modules"]').click();
  await page.locator("#toggle-module-02").setChecked(false);
  await page.waitForFunction(() => document.getElementById("reconstructionCanvas").dataset.active==="false");
  assert.equal((await canvasStats()).alpha,0,"reconstruction must clear when Module 02 is hidden");

  await page.screenshot({path:path.join(output,"final-hidden.png"),fullPage:true,animations:"disabled"});
  fs.writeFileSync(path.join(output,"result.json"),JSON.stringify({
    status:"PASS",target,visibilityCases,base,dark,stoneSelected,stone,pageErrors:errors
  },null,2));
  assert.deepEqual(errors,[]);

  const ordinary=await browser.newPage({viewport:{width:1366,height:768}});
  await ordinary.goto(defaultUrl);
  assert.equal(await ordinary.locator("#reconstructionCanvas").count(),0,"default app unexpectedly enabled research reconstruction");
  assert.notEqual(
    await ordinary.locator('[data-entity-id="module-02-right-exposed-face"] img').getAttribute("data-render-delegated"),
    "bmc01",
    "default app delegated the historical overlay"
  );
  await ordinary.close();
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
