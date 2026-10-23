// Read-only local browser probe for current Config visibility and click targets.
// This is diagnostic, NOT an authenticated or functional PASS gate.
import {chromium} from "playwright";
import {mkdir,writeFile} from "node:fs/promises";
const url="http://127.0.0.1:8123/config/";
const dir="artifacts/ci-baseline-01/visibility";
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true});
const reports=[];
for(const width of [1050,1366]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:"reduce"});
 try{
  await page.goto(url,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>Boolean(window.CASA_EM_MODULOS_DEBUG?.getLayoutProfile),null,{timeout:12000});
  const sample=()=>page.evaluate(()=>{
    const selectors=[
      "#mobileSceneRepin","#viewerPinSentinel","#moduleDetailPlaceholder",
      ".flow-nav [data-step='finishes']",".flow-nav [data-step='summary']",
      "#introSplash","#moduleList .module-card.is-selected"
    ];
    const nodes=Object.fromEntries(selectors.map(selector=>{
      const el=document.querySelector(selector);
      if(!el)return [selector,{exists:false}];
      const c=getComputedStyle(el),r=el.getBoundingClientRect();
      const cx=Math.max(0,Math.min(innerWidth-1,r.x+r.width/2));
      const cy=Math.max(0,Math.min(innerHeight-1,r.y+r.height/2));
      const hit=document.elementFromPoint(cx,cy);
      return [selector,{exists:true,display:c.display,visibility:c.visibility,
        opacity:c.opacity,pointerEvents:c.pointerEvents,hidden:el.hidden,
        rect:{x:r.x,y:r.y,w:r.width,h:r.height},
        inViewport:r.bottom>0&&r.top<innerHeight,hit:hit?.id||hit?.tagName,
        role:el.getAttribute("role"),ariaDisabled:el.getAttribute("aria-disabled"),
        ariaCurrent:el.getAttribute("aria-current")}];
    }));
    return {layout:document.documentElement.dataset.layoutProfile,
      debugProfile:window.CASA_EM_MODULOS_DEBUG?.getLayoutProfile?.(),
      bodyClass:document.body.className,
      stageCurrent:document.querySelector(".flow-nav [aria-current='step']")?.getAttribute("data-step")||null,
      nodes};
  });
  const initial=await sample();
  if(width===1050)await page.evaluate(()=>{
    const s=document.getElementById("viewerPinSentinel");
    if(s)scrollTo(0,s.getBoundingClientRect().top+scrollY+180);
  });
  await page.waitForTimeout(150);
  const after150=await sample();
  await page.waitForTimeout(1500);
  const after1650=await sample();
  const report={width,initial,after150,after1650};
  reports.push(report);
  await page.screenshot({path:dir+"/config-"+width+".png",fullPage:true,animations:"disabled"});
  console.log("CI_CONFIG_VISIBILITY "+JSON.stringify({width,layout:initial.layout,
   modulePlaceholderVisible:after1650.nodes["#moduleDetailPlaceholder"]?.display!=="none"&&
     after1650.nodes["#moduleDetailPlaceholder"]?.visibility!=="hidden",
   repin:after1650.nodes["#mobileSceneRepin"],
   finishes:after1650.nodes[".flow-nav [data-step='finishes']"],
   introSplash:after1650.nodes["#introSplash"]}).slice(0,1450));
 }finally{await page.close()}
}
await browser.close();
await writeFile(dir+"/report.json",JSON.stringify({schema:"CIConfigLocalVisibility/1",warning:"Local static no Edge/DB",reports},null,2)+"\n");
