import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,copyFileSync,mkdirSync,mkdtempSync,writeFileSync,rmSync,existsSync} from "node:fs";
import {join,dirname} from "node:path";
import {tmpdir} from "node:os";
import {spawnSync} from "node:child_process";
import {projectPages} from "../scripts/compile-primary-pages.mjs";

// The historical ARC03/03B staging prototype was superseded by a published
// authoritative ARC03C compiler. Retain its unique negative-security tests
// without reintroducing an experimental compiler or mutating the live app.
const SLOT="<!-- ARC03_PRIMARY_HEADER -->";
const ROUTES="architecture/fragments/primary-header.routes.json";
const SOURCE_PATHS=[
  "scripts/compile-primary-pages.mjs",
  "architecture/fragments/primary-header.fragment.html",
  ROUTES,
  "architecture/pages/root.page.html",
  "architecture/pages/about.page.html",
  "architecture/pages/how-it-works.page.html"
];
function runIsolated(mutator) {
  const root=mkdtempSync(join(tmpdir(),"m2d-arc03-legacy-contract-"));
  try {
    for(const file of SOURCE_PATHS){
      const dest=join(root,file);
      mkdirSync(dirname(dest),{recursive:true});
      copyFileSync(file,dest);
    }
    mutator(root);
    const p=spawnSync(process.execPath,[join(root,"scripts/compile-primary-pages.mjs"),"--check"],{
      cwd:root,encoding:"utf8",timeout:20000
    });
    assert.equal(p.signal,null,"the current compiler should reject input without being killed");
    return {root,stdout:p.stdout,stderr:p.stderr,status:p.status,
            emittedApp:existsSync(join(root,"app/index.html"))};
  } finally{rmSync(root,{recursive:true,force:true});}
}
function rejectsInput(mutate,message){
  const res=runIsolated(mutate);
  assert.notEqual(res.status,0,"unsafe authored source must fail closed");
  assert.match(res.stderr,message);
  assert.equal(res.emittedApp,false,"a malformed source must not emit publish output");
}
const put=(root,path,text)=>writeFileSync(join(root,path),text);

test("current ARC03C renders the same single-current NAV004 header and preserves route-specific a11y variants",async()=>{
  const config=JSON.parse(readFileSync(ROUTES,"utf8"));
  assert.equal(config.status,"BUILD_AUTHORITATIVE_ARC03C");
  assert.equal(config.routes.length,3);
  assert.ok(config.scope.doesNotInclude.includes("/viewer/"));
  const r=await projectPages();
  assert.equal(r.pages.length,3);
  for(let i=0;i<r.pages.length;i++){
    const {html,output}=r.pages[i],route=config.routes[i];
    assert.equal(html,readFileSync(output,"utf8"),"generated markup must be byte-identical to checked-in page");
    const fragments=[...html.matchAll(/<header class="site-header">[\s\S]*?<\/header>/g)];
    assert.equal(fragments.length,1);
    const header=fragments[0][0];
    assert.equal((header.match(/aria-current="page"/g)||[]).length,1);
    assert.equal((header.match(/id="primaryNav"/g)||[]).length,1);
    assert.equal((header.match(/id="menuToggle"/g)||[]).length,1);
    assert.equal(header.includes('alt="" aria-hidden="true"'),!!route.whatsAppIconAriaHidden);
    assert.doesNotMatch(header,/viewer-header|private-header/);
  }
});

test("ARC03C rejects invalid/injected header route links in isolated source fixture",()=>{
  rejectsInput(root=>{
    const config=JSON.parse(readFileSync(join(root,ROUTES),"utf8"));
    config.routes[0].brandHref='javascript:alert(1)';
    put(root,ROUTES,JSON.stringify(config));
  },/Unsafe static link/);
});

test("ARC03C refuses duplicate header slots instead of silently normalizing an authored page",()=>{
  rejectsInput(root=>{
    const path="architecture/pages/root.page.html";
    put(root,path,readFileSync(join(root,path),"utf8")+SLOT);
  },/Exactly one header slot required/);
});

test("ARC03C refuses copied header markup and illegal Viewer header inside authored public page",()=>{
  rejectsInput(root=>{
    const path="architecture/pages/about.page.html";
    put(root,path,readFileSync(join(root,path),"utf8")+'<header class="site-header"></header>');
  },/Duplicate authorial header/);
  rejectsInput(root=>{
    const path="architecture/pages/root.page.html";
    put(root,path,readFileSync(join(root,path),"utf8")+'<header class="viewer-header"></header>');
  },/NAV-005 excluded/);
});

test("experimental staging status cannot silently replace authoritative ARC03C build",()=>{
  rejectsInput(root=>{
    const config=JSON.parse(readFileSync(join(root,ROUTES),"utf8"));
    config.status="EXPERIMENTAL_BUILD_TIME_ONLY_NOT_PUBLISHED";
    put(root,ROUTES,JSON.stringify(config));
  },/BUILD_AUTHORITATIVE_ARC03C/);
});
