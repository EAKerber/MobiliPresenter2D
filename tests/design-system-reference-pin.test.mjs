import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { verifyReferencePin } from "../scripts/verify-design-system-reference-pin.mjs";

test("P-TOKEN-01B vendor pin is intact, known-source and excluded from runtime", async () => {
  const result=await verifyReferencePin();
  assert.equal(result.entries,16);
  assert.equal(result.productActivated,false);
  assert.equal(result.htmlScanned,8);
  assert.equal(result.cssScanned,8);
  assert.equal(result.sourceGitBlob,"63b60f8d87327c6fd1e80c8cdf4ff832c4089bfa");
  assert.equal(result.designSystemCommit,"70f0eabf609b5b4391459c426d6f7ecaeac070c8");
});

test("lexical consumer observations are reproducible, not token-mapping authorizations", async () => {
  const folder="design-system/pins/vis-002/v0.1.0/";
  const manifest=JSON.parse(await readFile(resolve(folder+"approved-palette-reference.manifest.json"),"utf8"));
  const audit=JSON.parse(await readFile(resolve("design-system/audits/p-token-01b-current-css-literal-observations.json"),"utf8"));
  assert.match(audit.status,/NOT proof/);
  assert.equal(audit.sourceCommit,"840a0cda361b3ce215fc934badc26df72dffc6e8");
  assert.equal(audit.designSystemCommit,manifest.source.repository==="EAKerber/MobiliPresenter2D_DesignSystem"
    ? "70f0eabf609b5b4391459c426d6f7ecaeac070c8" : "");
  const entries=manifest.entries.filter(e=>e.value.startsWith("#"));
  let observed=0;
  for(const row of audit.scanned){
    const css=await readFile(resolve(row.path),"utf8");
    let matches=0;
    for(const line of css.split("\n"))for(const token of entries)
      for(const match of line.matchAll(/#[0-9a-fA-F]{6}\b/g))
        if(match[0].toUpperCase()===token.value)matches++;
    assert.equal(matches,row.rawMatches,"stale swatch observations: "+row.path);
    observed+=matches;
  }
  assert.equal(audit.totals.cssFiles,8);
  assert.equal(observed,audit.totals.literalMatches);
  assert.equal(observed,54);
});
