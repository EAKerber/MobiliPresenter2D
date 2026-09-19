const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");

(async () => {
  const output = process.argv[2] || "/tmp/bmc02-runtime";
  fs.mkdirSync(output,{recursive:true});
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:1366,height:768}});
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("console",m=>{ if(m.type()==="error") errors.push(m.text()); });

  const defaultUrl = process.env.BMC02_BROWSER_URL
    ? process.env.BMC02_BROWSER_URL
    : pathToFileURL(path.resolve(__dirname,"../app/index.html")).href;
  const target = defaultUrl + (defaultUrl.includes("?") ? "&" : "?") + "reconstruction=bmc02";
  await page.goto(target);
  await page.evaluate(() => Promise.all([...document.images].map(img=>img.decode().catch(()=>null))));

  const canvasStats = () => page.evaluate(() => {
    const c=document.getElementById("reconstructionCanvas-bmc02");
    if(!c) return null;
    const d=c.getContext("2d").getImageData(0,0,c.width,c.height).data;
    let alpha=0,outside=0,sample=null;
    for(let y=0;y<c.height;y++){
      for(let x=0;x<c.width;x++){
        const i=(y*c.width+x)*4,a=d[i+3];
        if(!a) continue;
        alpha++;
        if(x<720||x>=755||y<510||y>=600) outside++;
        if(!sample) sample=[x,y,d[i],d[i+1],d[i+2],a];
      }
    }
    return {
      alpha,outside,sample,
      active:c.dataset.active,
      revision:Number(c.dataset.renderRevision||0),
      error:c.dataset.renderError||null
    };
  });

  assert.equal(await page.locator("#reconstructionCanvas-bmc02").count(),1,"BMC-02 research canvas not installed");
  assert.equal((await canvasStats()).alpha,0,"BMC-02 must be hidden while Module 02 occludes the return");
  assert.equal(
    await page.locator('[data-entity-id="module-02-right-exposed-face"] img').getAttribute("data-render-delegated"),
    null,
    "BMC-02 must not delegate the BMC-01 historical overlay"
  );

  const visibilityCases=[];
  const setCase=async(id,module02,module03,expected)=>{
    await page.locator("#toggle-module-02").setChecked(module02);
    await page.locator("#toggle-module-03").setChecked(module03);
    await page.waitForFunction(([expected])=>{
      const c=document.getElementById("reconstructionCanvas-bmc02");
      if(!c || c.dataset.active!==String(expected)) return false;
      const d=c.getContext("2d").getImageData(720,510,35,90).data;
      let any=false;
      for(let i=3;i<d.length;i+=4){ if(d[i]) { any=true; break; } }
      return expected ? any : !any;
    },[expected]);
    const stats=await canvasStats();
    assert.equal(stats.alpha>0,expected,id+" visibility mismatch");
    assert.equal(stats.outside,0,id+" escaped authorized ROI");
    visibilityCases.push({id,module02,module03,expected,alpha:stats.alpha});
    return stats;
  };

  await setCase("both-visible",true,true,false);
  const active=await setCase("module-02-hidden",false,true,true);
  assert.equal(active.alpha,80,"BMC-02 must preserve exact historical 80-pixel support");
  assert(active.sample,"BMC-02 active state needs a sample pixel");
  await page.locator("#viewer").screenshot({path:path.join(output,"neutral-return.png"),animations:"disabled"});

  await page.locator('[data-step="finishes"]').click();
  await page.locator('[data-stone-package-id="stone-green"]').click();
  await page.waitForFunction(previous => Number(document.getElementById("reconstructionCanvas-bmc02").dataset.renderRevision||0) > previous, active.revision);
  const green=await canvasStats();
  assert.notDeepEqual(green.sample.slice(2,5),active.sample.slice(2,5),"stone package did not recolor BMC-02 termination");
  await page.locator("#viewer").screenshot({path:path.join(output,"green-return.png"),animations:"disabled"});

  await page.locator('[data-finish-id="tone-25-b"]').click();
  await page.waitForFunction(previous => Number(document.getElementById("reconstructionCanvas-bmc02").dataset.renderRevision||0) > previous, green.revision);
  const darkFront=await canvasStats();
  assert.deepEqual(darkFront.sample.slice(2,5),green.sample.slice(2,5),"front finish changed stone-only BMC-02 termination");

  await page.locator('[data-step="modules"]').click();
  await setCase("both-hidden",false,false,false);
  await setCase("module-03-hidden",true,false,false);

  fs.writeFileSync(path.join(output,"result.json"),JSON.stringify({
    status:"PASS",target,visibilityCases,active,green,darkFront,pageErrors:errors
  },null,2));
  assert.deepEqual(errors,[]);

  const ordinary=await browser.newPage({viewport:{width:1366,height:768}});
  await ordinary.goto(defaultUrl);
  assert.equal(await ordinary.locator("#reconstructionCanvas-bmc02").count(),0,"default app unexpectedly enabled BMC-02");
  await ordinary.close();
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
