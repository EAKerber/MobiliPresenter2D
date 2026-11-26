// P-TOKEN-02A: observe computed CSS only. Does not install, alias or apply VIS-002 tokens.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const BASE=process.env.CSS_AUDIT_ORIGIN||"http://127.0.0.1:8123";
const out=process.env.CSS_AUDIT_OUTPUT_DIR||"artifacts/p-token-02a";
const siteRoot=path.resolve(process.env.CSS_AUDIT_SITE_ROOT||"app");
const samples={
  "/":{header:".site-header",menu:"#menuToggle",themeControl:"[data-ui-theme-toggle]",hero:".hero",bodyCopy:".hero-description"},
  "/about/":{header:".site-header",menu:"#menuToggle",themeControl:"[data-ui-theme-toggle]",bodyCopy:".about-scale p:not(.eyebrow)"},
  "/how-it-works/":{header:".site-header",menu:"#menuToggle",themeControl:"[data-ui-theme-toggle]",label:".study-band .eyebrow",caption:".study-art figcaption"},
  "/viewer/":{header:".viewer-header",menu:"#menuToggle",themeControl:"[data-ui-theme-toggle]",return:".viewer-header .back-link",heading:".viewer-heading"}
};
const css00Shells=[
  {route:"/",shell:"index.html"},
  {route:"/about/",shell:"about/index.html"},
  {route:"/how-it-works/",shell:"how-it-works/index.html"},
  {route:"/viewer/",shell:"viewer/index.html"},
  {route:"/config/",shell:"config/index.html"},
  {route:"/admin.html",shell:"admin.html"},
  {route:"/access/",shell:"access/index.html"},
  {route:"/access/manage.html",shell:"access/manage.html"}
];
function parseAttributes(tag){
  return Object.fromEntries([...tag.matchAll(/([^\s=]+)\s*=\s*["']([^"']*)["']/g)].map(match=>[match[1].toLowerCase(),match[2]]));
}
function localRelativePath(url,baseUrl){
  const resolved=new URL(url,baseUrl);
  if(resolved.origin!=="https://css-audit.invalid")return null;
  return decodeURIComponent(resolved.pathname).replace(/^\/+/, "");
}
async function scanCss(relativePath,visited=new Set()){
  assert.ok(!visited.has(relativePath),"CSS @import cycle detected: "+relativePath);
  visited.add(relativePath);
  const absolute=path.resolve(siteRoot,relativePath);
  assert.ok(absolute.startsWith(siteRoot+path.sep),"CSS import escapes audited app root: "+relativePath);
  let content;
  try{content=await readFile(absolute,"utf8");}
  catch(error){
    if(error.code==="ENOENT")return {path:relativePath,sha256:null,missing:true,imports:[]};
    throw error;
  }
  const withoutComments=content.replace(/\/\*[\s\S]*?\*\//g,"");
  const imports=[];
  for(const match of withoutComments.matchAll(/@import\s+(?:url\(\s*)?["']?([^"'()\s;]+)["']?\s*\)?[^;]*;/gi)){
    const imported=localRelativePath(match[1],"https://css-audit.invalid/"+relativePath);
    if(imported)imports.push(await scanCss(imported,new Set(visited)));
    else imports.push({url:match[1],external:true});
  }
  return {path:relativePath,sha256:createHash("sha256").update(content).digest("hex"),imports};
}
async function captureStaticInventory(){
  const routes=[];
  for(const {route,shell} of css00Shells){
    const html=await readFile(path.resolve(siteRoot,shell),"utf8");
    const baseUrl="https://css-audit.invalid/"+shell;
    const stylesheetHrefs=[];
    for(const match of html.matchAll(/<link\b[^>]*>/gi)){
      const attrs=parseAttributes(match[0]);
      if((attrs.rel||"").toLowerCase().split(/\s+/).includes("stylesheet")&&attrs.href)stylesheetHrefs.push(attrs.href);
    }
    assert.ok(stylesheetHrefs.length>0,"No linked stylesheet found for "+route);
    const stylesheets=[];
    for(const href of stylesheetHrefs){
      const localPath=localRelativePath(href,baseUrl);
      stylesheets.push(localPath?await scanCss(localPath):{url:href,external:true});
    }
    const inlineStyles=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match=>createHash("sha256").update(match[1]).digest("hex"));
    routes.push({route,shell,shellSha256:createHash("sha256").update(html).digest("hex"),stylesheets,
      inlineStyleBlockCount:inlineStyles.length,inlineStyleBlockSha256:inlineStyles,
      styleAttributeCount:[...html.matchAll(/\sstyle\s*=/gi)].length});
  }
  const missingLocalCss=routes.flatMap(route=>route.stylesheets.flatMap(sheet=>[
    ...(sheet.missing?[{route:route.route,shell:route.shell,path:sheet.path}]:[]),
    ...(sheet.imports||[]).filter(imported=>imported.missing).map(imported=>({route:route.route,shell:route.shell,path:imported.path}))
  ]));
  const unexpectedMissing=missingLocalCss.filter(item=>item.path!=="config/styles.css");
  assert.deepEqual(unexpectedMissing,[],"Unexpected local CSS links/imports are missing");
  return {schema:"M2DCSS00StaticInventory/1",sourceRef:process.env.CSS_AUDIT_SOURCE_REF||"unspecified",
    sourceRoot:siteRoot,routes,missingLocalCss,limits:[
      "Static shell/import inventory only; runtime-created styles remain separate observations.",
      "The existing Config link to config/styles.css is recorded as missing in the static app tree; this audit does not change it.",
      "Authenticated Admin and token-gated Config states are not established by this static scan."
    ]};
}
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
report.staticInventory=await captureStaticInventory();
await writeFile(out+"/css-00-static-inventory.json",JSON.stringify(report.staticInventory,null,2)+"\n");
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
