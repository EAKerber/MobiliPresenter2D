import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {inspect} from "../tools/migration-inspector.mjs";

function fixture(callback){
  const root=mkdtempSync(join(tmpdir(),"m2d-inspector-test-"));
  const put=(path,value)=>{
    const full=join(root,path);
    mkdirSync(resolve(full,".."),{recursive:true});
    writeFileSync(full,value);
  };
  try{return callback({root,put});}finally{rmSync(root,{recursive:true,force:true});}
}
test("maps static pages, assets, shared dependencies and cautious CSS candidates",()=>{
  fixture(({root,put})=>{
    put("index.html",'<link rel="stylesheet" href="/css/global.css?v=1"><link rel="stylesheet" href="css/page.css"><script src="/js/app.js?v=2"></script><div class="shared navigation"></div>');
    put("about/index.html",'<link rel="stylesheet" href="../css/global.css"><script src="https://example.com/ext.js"></script><main class="shared"></main>');
    put("css/global.css",".shared {color: red} .global {padding: 0}");
    put("css/page.css",".shared {padding: 2px} .page {color:blue}");
    put("js/app.js","window.example = 1;");
    const options={appRoot:root,routes:[["home","index.html"],["about","about/index.html"]],focus:"shared",changed:["app/css/global.css","js/orphan.js"]};
    const result=inspect(options);
    assert.equal(result.summary.routes,2);
    assert.equal(result.summary.found,2);
    assert.deepEqual(result.routes[0].stylesheets,["css/global.css","css/page.css"]);
    assert.deepEqual(result.routes[0].scripts,["js/app.js"]);
    assert.deepEqual(result.sharedDependencies,[{path:"css/global.css",routes:["about","home"]}]);
    assert.equal(result.cssOverlapCandidates.length,1);
    assert.deepEqual(result.cssOverlapCandidates[0].classes,["shared"]);
    assert.equal(result.cssOverlapCandidates[0].classification,"LEXICAL_CANDIDATE_UNVERIFIED");
    assert.deepEqual(result.changedImpact[0].directConsumers,["about","home"]);
    assert.equal(result.changedImpact[1].requireReview,true);
    assert.equal(result.focusEvidence.length,2);
    assert.equal(result.routes[1].unresolved[0].kind,"EXTERNAL_OR_DYNAMIC_ASSET");
    assert.equal(JSON.stringify(result),JSON.stringify(inspect(options)),"manifest is deterministic");
    assert.equal(existsSync(join(root,"migration-inspector.json")),false,"read-only by default");
  });
});
test("flags missing pages and unsafe relative assets without traversing filesystem",()=>{
  fixture(({root,put})=>{
    put("index.html",'<script src="../../../outside.js"></script><link rel="stylesheet" href="/css/missing.css">');
    const result=inspect({appRoot:root,routes:[["home","index.html"],["nope","missing.html"]]});
    assert.equal(result.summary.found,1);
    assert.equal(result.routes[0].unresolved.some(x=>x.kind==="PATH_OUTSIDE_APP"),true);
    assert.equal(result.routes[0].unresolved.some(x=>x.kind==="REFERENCED_FILE_MISSING"),true);
    assert.equal(result.diagnostics.some(x=>x.kind==="PAGE_NOT_FOUND"),true);
  });
});
test("real product smoke: route discovery and focus evidence, not homologation",()=>{
  const productApp=resolve("app");
  const result=inspect({appRoot:productApp,focus:"site-header"});
  assert.equal(result.schema,"M2DMigrationInspector/0.1");
  assert.equal(result.coverage.negativeImpact,"NOT_PROVEN");
  assert.equal(result.routes.find(r=>r.id==="landing")?.status,"FOUND");
  assert.equal(result.routes.find(r=>r.id==="viewer")?.status,"FOUND");
  assert.equal(result.focusEvidence.some(x=>x.route==="landing"&&x.htmlStatic),true);
  assert.equal(result.focusEvidence.some(x=>x.route==="viewer"&&x.htmlStatic),false,"Viewer NAV-005 is a distinct variant");
});
