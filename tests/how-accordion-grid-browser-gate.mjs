import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";

const BASE="http://127.0.0.1:8124",CAND="http://127.0.0.1:8123";
const selectors=[".foundation-list",".study-topics"];
const widths=[390,1366],themes=["light","dark"];
const artifact="artifacts/how-accordion";
await mkdir(artifact,{recursive:true});

async function inspect(browser,origin,width,theme,verifyChanges){
 const context=await browser.newContext({viewport:{width,height:844},colorScheme:theme,
    reducedMotion:"reduce",deviceScaleFactor:1,locale:"pt-BR"});
 await context.addInitScript(mode=>{localStorage.setItem("casa-ui-theme-mode-v1",mode);},theme);
 const page=await context.newPage(),errors=[];
 page.on("pageerror",error=>errors.push(error.message));
 const response=await page.goto(origin+"/how-it-works/",{waitUntil:"domcontentloaded",timeout:30000});
 assert.equal(response?.status(),200);
 await page.evaluate(async()=>{await document.fonts?.ready;});
 const snapshots=[];
 for(const selector of selectors){
   const root=page.locator(selector),details=root.locator("details");
   assert.equal(await details.count(),3);
   assert.equal(await details.evaluateAll(nodes=>nodes.filter(n=>n.open).length),0);
   const closedRects=await details.evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
   const closedScreenshot=await root.screenshot({animations:"disabled"});
   await details.first().locator("summary").click();
   assert.equal(await details.first().evaluate(el=>el.open),true);
   assert.deepEqual(await details.evaluateAll(nodes=>nodes.map(n=>n.open)),[true,false,false]);
   const firstRects=await details.evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
   if(verifyChanges){
     assert.ok(firstRects[0] > closedRects[0]+10,selector+" first panel should grow");
     if(width>=901){
       for(const idx of [1,2])assert.ok(
         Math.abs(firstRects[idx]-closedRects[idx])<2,
         selector+" closed sibling must keep its own height; got "+JSON.stringify({closedRects,firstRects})
       );
     }
   }
   const screenshotOpened=await root.screenshot({animations:"disabled"});
   await details.first().locator("summary").press("Enter");
   assert.equal(await details.first().evaluate(el=>el.open),false,"Enter closes");
   await details.first().locator("summary").press("Space");
   assert.equal(await details.first().evaluate(el=>el.open),true,"Space opens");
   await details.first().locator("summary").press("Enter");
   assert.equal(await details.first().evaluate(el=>el.open),false);
   // Native details must continue to permit independent opening of multiple items.
   await details.first().locator("summary").click();
   await details.nth(1).locator("summary").click();
   assert.deepEqual(await details.evaluateAll(nodes=>nodes.map(n=>n.open)),[true,true,false]);
   await details.first().locator("summary").click();
   await details.nth(1).locator("summary").click();
   snapshots.push({selector,closedScreenshot,screenshotOpened,closedRects,firstRects});
 }
 assert.deepEqual(errors,[],"uncaught browser errors: "+JSON.stringify(errors));
 await context.close();
 return snapshots;
}

const results=[];
for(const engine of [chromium,webkit]){
 const browser=await engine.launch({headless:true});
 try{
  for(const width of widths)for(const theme of themes){
   const [before,after]=await Promise.all([
      inspect(browser,BASE,width,theme,false),
      inspect(browser,CAND,width,theme,true)
   ]);
   for(let i=0;i<selectors.length;i++){
     assert.equal(after[i].closedScreenshot.equals(before[i].closedScreenshot),true,
       "closed-state pixels changed in "+selectors[i]+" "+engine.name()+" "+width+" "+theme);
     if(width>=901)for(const idx of [1,2]){
       assert.ok(before[i].firstRects[idx]>after[i].firstRects[idx]+10,
         "baseline stretch not reproduced at "+selectors[i]+" "+width+" "+theme);
     }
     await writeFile(artifact+"/"+engine.name()+"-"+width+"-"+theme+"-open-"+i+".png",after[i].screenshotOpened);
   }
   const record={engine:engine.name(),width,theme,closedPixelEqual:true,
     foundationFixed:true,studyFixed:true,keyboard:true,independentOpen:true,errors:0};
   results.push(record);
   console.log("HOW_ACCORDION_GRID_PASS "+JSON.stringify(record));
  }
 }finally{await browser.close();}
}
await writeFile(artifact+"/report.json",JSON.stringify({schema:"AccordionGridGate0.1",runs:results},null,2));
console.log("HOW_ACCORDION_GRID_RESULT PASS "+results.length+"/8");
