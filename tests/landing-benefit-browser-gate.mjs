import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const sites = { baseline:"http://127.0.0.1:8124/", candidate:"http://127.0.0.1:8123/" };
const widths=[390,1366], modes=["light","dark"];
const browsers = await chromium.launch({headless:true});
const results=[];
await mkdir("artifacts/landing-benefits",{recursive:true});
async function inspect(name,width,mode) {
  const context=await browsers.newContext({
    viewport:{width,height:900},colorScheme:mode,reducedMotion:"reduce",locale:"pt-BR",
    deviceScaleFactor:1,serviceWorkers:"block"
  });
  await context.addInitScript(theme=>{localStorage.setItem("casa-ui-theme-mode-v1",theme);},mode);
  const page=await context.newPage(), errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  page.on("response",response=>{
    if(response.status()>=400&&new URL(response.url()).origin===new URL(sites[name]).origin){
      errors.push("HTTP "+response.status()+" "+new URL(response.url()).pathname);
    }
  });
  const response=await page.goto(sites[name],{waitUntil:"networkidle",timeout:30000});
  assert.equal(response?.status(),200);
  await page.waitForSelector("#benefits > .benefit-item",{timeout:10000});
  await page.evaluate(()=>document.fonts?.ready);
  // Intro overlay is an independent animation and must no longer cover the strip.
  await page.waitForTimeout(3200);
  const model=await page.evaluate(()=>{
    const grid=document.getElementById("benefits"), mini=document.getElementById("miniBenefits"), keys=[
      "display","position","color","backgroundColor","borderRightColor","fontFamily",
      "fontSize","fontWeight","lineHeight","gap","padding","minHeight",
      "gridTemplateColumns","justifyContent","alignItems","opacity"
    ];
    const capture=(element)=>{
      const c=getComputedStyle(element),rect=element.getBoundingClientRect(), styles={};
      for(const key of keys)styles[key]=c[key];
      return {
        tag:element.tagName.toLowerCase(),
        html:element.outerHTML,
        styles,
        bounds:{x:rect.x,y:rect.y,width:rect.width,height:rect.height}
      };
    };
    return {
      resolvedTheme:document.documentElement.dataset.theme,
      environments:document.querySelectorAll("#environmentTrack .environment").length,
      miniBenefits:document.querySelectorAll("#miniBenefits .mini-benefit").length,
      rows:[...grid.children].map(capture),
      grid:capture(grid),
      miniRows:[...mini.children].map(capture),
      miniGrid:capture(mini),
      classes:[...grid.querySelectorAll("[class]")].map(x=>x.className)
    };
  });
  const screenshot=await page.locator("#benefits").screenshot({animations:"disabled"});
  const miniScreenshot=await page.locator("#miniBenefits").screenshot({animations:"disabled"});
  await writeFile("artifacts/landing-benefits/"+name+"-"+width+"-"+mode+".png",screenshot);
  await writeFile("artifacts/landing-benefits/"+name+"-"+width+"-"+mode+"-compact.png",miniScreenshot);
  await context.close();
  return {name,width,mode,errors,model,screenshot,miniScreenshot};
}
try{
  for(const width of widths)for(const mode of modes){
    const baseline=await inspect("baseline",width,mode);
    const candidate=await inspect("candidate",width,mode);
    assert.deepEqual(baseline.errors,[],"baseline has runtime errors");
    assert.deepEqual(candidate.errors,[],"candidate has runtime errors");
    assert.equal(candidate.model.resolvedTheme,mode);
    assert.equal(candidate.model.environments,5);
    assert.equal(candidate.model.miniBenefits,3);
    assert.equal(candidate.model.miniRows.length,3);
    assert.equal(candidate.model.rows.length,4);
    assert.deepEqual(candidate.model,baseline.model,"DOM/computed CSS/layout mismatch at "+width+" "+mode);
    assert.equal(candidate.screenshot.equals(baseline.screenshot),true,"benefit-strip screenshot differs at "+width+" "+mode);
    assert.equal(candidate.miniScreenshot.equals(baseline.miniScreenshot),true,"mini-benefits screenshot differs at "+width+" "+mode);
    results.push({width,mode,benefits:4,miniBenefits:3,domEqual:true,computedCssEqual:true,geometryEqual:true,screenshotEqual:true,compactScreenshotEqual:true,errors:0});
    console.log("LANDING_COMPONENT_GATE "+JSON.stringify(results.at(-1)));
  }
} finally {await browsers.close();}
await writeFile("artifacts/landing-benefits/report.json",JSON.stringify({
  schema:"M2DLandingBenefitsPilotGate0.2",source:"local baseline main vs isolated branch",
  scope:"public Landing only, chromium, no production auth or deploy",
  cases:results
},null,2)+"\n");
console.log("LANDING_COMPONENT_GATE_RESULT PASS "+results.length+"/"+widths.length*modes.length);
