// CI-BASELINE-01 / Issue #232 — sessionless, read-only readiness diagnostics.
// Capture only status codes, paths without queries, asset status, and Boolean
// bootstrap markers. Never capture cookies, tokens, auth headers or page HTML.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const targets = [
  ["production", "https://mobilipresenter2d.netlify.app/config/"],
  ["pr231", "https://deploy-preview-231--mobilipresenter2d.netlify.app/config/"]
];
const output="artifacts/ci-baseline-01";
await mkdir(output,{recursive:true});
const safePath = raw => {
  try { const u=new URL(raw); return u.origin+u.pathname; }
  catch { return "[unparseable-url]"; }
};
const record={schema:"M2DConfigBootstrapReadiness/0.1",
  purpose:"Observe unauthenticated route response, not bypass authentication or assert product failure",
  privacy:"Fresh ephemeral unauthenticated browser contexts. No cookies, headers, URL queries, HTML or screenshots stored.",
  source:"MobiliPresenter2D main@840a0cda",observations:[]};
const browser=await chromium.launch({headless:true});
try {
  for(const [name,url] of targets){
    const context=await browser.newContext({viewport:{width:1050,height:900},
      locale:"pt-BR",serviceWorkers:"block",acceptDownloads:false});
    const page=await context.newPage();
    const scripts=[],pageErrors=[],consoleErrors=[];
    page.on("response",r=>{
      if(r.request().resourceType()!=="script"&&r.request().resourceType()!=="document")return;
      if(scripts.length<160)scripts.push({type:r.request().resourceType(),
        url:safePath(r.url()),status:r.status(),contentType:(r.headers()["content-type"]||"").split(";")[0]});
    });
    page.on("requestfailed",request=>{
      if(request.resourceType()==="script"&&scripts.length<160)
        scripts.push({type:"failed-script",url:safePath(request.url()),reason:request.failure()?.errorText?.slice(0,110)||"unknown"});
    });
    page.on("pageerror",e=>{if(pageErrors.length<25)pageErrors.push(e.name||"Error");});
    page.on("console",m=>{if(m.type()==="error"&&consoleErrors.length<25)consoleErrors.push("console-error");});
    try{
      const initial=await page.goto(url,{waitUntil:"domcontentloaded",timeout:25000});
      await page.waitForTimeout(1500);
      const info=await page.evaluate(()=>({
        title:document.title.slice(0,120),
        hasConfiguratorWorkspace:!!document.querySelector("main.workspace"),
        hasPublicHero:!!document.querySelector("#heroTitle"),
        hasLoginPrompt:!!document.querySelector("form[data-login], #adminLogin, #identityLogin"),
        debugPresent:typeof window.CASA_EM_MODULOS_DEBUG==="object"&&window.CASA_EM_MODULOS_DEBUG!==null,
        debugProfileMethod:typeof window.CASA_EM_MODULOS_DEBUG?.getLayoutProfile==="function",
        policyPresent:typeof window.CasaModulesPresentationContract==="object",
        layoutProfilesPresent:typeof window.CasaModulesLayoutProfiles==="object",
        configState:document.documentElement.dataset.layoutProfile||null,
        moduleCardCount:document.querySelectorAll("#moduleList .module-card").length
      }));
      const badScripts=scripts.filter(x=>x.type!=="failed-script"&&x.status>=400);
      const result={
        name,requested:safePath(url),final:safePath(page.url()),status:initial?.status()||null,
        info,scriptRequests:scripts.length,scriptErrors:badScripts,
        scriptPaths:scripts.filter(x=>x.type==="script").map(x=>({path:x.url,status:x.status})),
        failedRequests:scripts.filter(x=>x.type==="failed-script"),
        pageErrorCount:pageErrors.length,pageErrorNames:pageErrors,
        consoleErrorCount:consoleErrors.length
      };
      result.classification= result.final!==result.requested
          ? "redirect-or-protected-candidate"
          : !result.info.hasConfiguratorWorkspace
            ? "not-configurator-document"
            : !result.info.debugPresent
              ? "config-document-but-bootstrap-unavailable"
              : result.info.moduleCardCount===0
                ? "debug-present-but-modules-unready"
                : "config-bootstrap-present";
      record.observations.push(result);
      console.log("CI_BASELINE_CONFIG_OBSERVATION "+JSON.stringify({
        name,result:result.classification,status:result.status,final:result.final,
        workspace:result.info.hasConfiguratorWorkspace,debug:result.info.debugPresent,
        modules:result.info.moduleCardCount,errors:result.pageErrorCount,
        badScripts:badScripts.length}));
    }catch(error){
      record.observations.push({name,requested:safePath(url),
        classification:"navigation-or-inspection-error",
        errorType:error?.name||"Error",messageCategory:"navigation failed; no contents collected"});
      console.log("CI_BASELINE_CONFIG_OBSERVATION "+JSON.stringify({name,result:"navigation-or-inspection-error"}));
    }finally{await context.close();}
  }
}finally{await browser.close();}
await writeFile(output+"/readiness.json",JSON.stringify(record,null,2)+"\n","utf8");
console.log("CI_BASELINE_CONFIG_DIAGNOSTIC_COMPLETE "+JSON.stringify(
  record.observations.map(x=>({name:x.name,result:x.classification}))));
