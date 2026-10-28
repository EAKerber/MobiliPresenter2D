// P-TOKEN-02A: observe computed CSS only. Does not install, alias or apply VIS-002 tokens.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const BASE="http://127.0.0.1:8123", out="artifacts/p-token-02a";
const samples={
  "/":{header:".site-header",menu:"#menuToggle",themeControl:"[data-ui-theme-toggle]",hero:".hero",bodyCopy:".hero-description"},
  "/about/":{header:".site-header",menu:"#menuToggle",themeControl:"[data-ui-theme-toggle]",bodyCopy:".about-scale p:not(.eyebrow)"},
  "/how-it-works/":{header:".site-header",menu:"#menuToggle",themeControl:"[data-ui-theme-toggle]",label:".study-band .eyebrow",caption:".study-art figcaption"},
  "/viewer/":{header:".viewer-header",menu:"#menuToggle",themeControl:"[data-ui-theme-toggle]",return:".viewer-header .back-link",heading:".viewer-heading"}
};
const widths=[390,1366],themes=["light","dark"];
const keys=["--public-bg","--public-surface","--public-surface-soft","--public-text",
  "--public-muted","--public-line","--public-accent","--ui-theme-focus"];
const report={schema:"M2DPToken02AComputedStyles/0.1",status:"browser observation only; no approved token mappings",
  matrix:[],limits:[
    "Local static server: data APIs and real auth are not validated",
    "No changes to runtime CSS, DOM source, tokens, theme controller, or assets",
    "Computed style values on representative elements do not prove approval/contrast on all surfaces",
    "Snapshot with reduced motion; real device and publication checks remain separate"
  ]};
await mkdir(out,{recursive:true});
for(const engine of [chromium,webkit]){
  const browser=await engine.launch({headless:true});
  try{
    for(const route of Object.keys(samples))for(const width of widths)for(const theme of themes){
      const context=await browser.newContext({viewport:{width,height:844},colorScheme:theme,
        reducedMotion:"reduce",deviceScaleFactor:1,locale:"pt-BR",serviceWorkers:"block"});
      await context.addInitScript(mode=>{localStorage.setItem("casa-ui-theme-mode-v1",mode);},theme);
      const page=await context.newPage(),pageErrors=[];
      page.on("pageerror",err=>pageErrors.push(String(err.message).slice(0,150)));
      try {
        const response=await page.goto(BASE+route,{waitUntil:"domcontentloaded",timeout:30000});
        assert.equal(response?.status(),200,route+" static route unavailable");
        await page.locator("[data-ui-theme-toggle]").first().waitFor({timeout:15000});
        await page.evaluate(async()=>{await document.fonts?.ready;});
        const data=await page.evaluate(({selectors,vars})=>{
          const root=document.documentElement,rootCSS=getComputedStyle(root);
          const tokens=Object.fromEntries(vars.map(key=>[key,rootCSS.getPropertyValue(key).trim()]));
          const elements={};
          for(const [name,sel] of Object.entries(selectors)){
            const node=document.querySelector(sel);
            if(!node){elements[name]={found:false,selector:sel};continue;}
            const style=getComputedStyle(node),rect=node.getBoundingClientRect();
            elements[name]={found:true,selector:sel,
              color:style.color,background:style.backgroundColor,border:style.borderColor,
              outlineColor:style.outlineColor,outlineWidth:style.outlineWidth,
              outlineOffset:style.outlineOffset,fontSize:style.fontSize,
              display:style.display,
              width:Math.round(rect.width*100)/100,height:Math.round(rect.height*100)/100};
          }
          return {resolvedTheme:root.dataset.theme,mode:root.dataset.themeMode,
            dsReferenceValue:rootCSS.getPropertyValue("--ds-reference-surface-light").trim(),
            tokens,elements,
            sheetOrder:[...document.styleSheets].map(sheet=>sheet.href||"[inline]").filter(Boolean)};
        },{selectors:samples[route],vars:keys});
        assert.equal(data.resolvedTheme,theme,"theme mismatch "+route+"/"+width+"/"+theme);
        assert.equal(data.dsReferenceValue,"","DS reference CSS must not be loaded");
        assert.equal(data.elements.header.found,true);
        assert.equal(data.elements.themeControl.found,true);
        const item={engine:engine.name(),route,width,theme,...data,pageErrors};
        report.matrix.push(item);
        console.log("P_TOKEN_02A_OBSERVATION "+JSON.stringify({engine:engine.name(),route,width,theme,
          rootBg:data.tokens["--public-bg"],surface:data.tokens["--public-surface"],
          focus:data.tokens["--ui-theme-focus"],headerBg:data.elements.header.background,
          headerText:data.elements.header.color,menuOutline:data.elements.menu.outlineWidth,
          dsReferenceLoaded:false}));
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
}
assert.equal(report.matrix.length,32);
await writeFile(out+"/computed-style-observations.json",JSON.stringify(report,null,2)+"\n");
console.log("P_TOKEN_02A_READONLY_PASS "+JSON.stringify({scenarios:report.matrix.length,routes:4,widths:2,themes:2,engines:2}));
