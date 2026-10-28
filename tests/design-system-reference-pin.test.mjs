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

test("archived 22 Oct literal observation is immutable historical evidence, not a current source freeze", async () => {
  const folder="design-system/pins/vis-002/v0.1.0/";
  const manifest=JSON.parse(await readFile(resolve(folder+"approved-palette-reference.manifest.json"),"utf8"));
  const audit=JSON.parse(await readFile(resolve("design-system/audits/p-token-01b-current-css-literal-observations.json"),"utf8"));
  assert.match(audit.status,/NOT proof/);
  assert.equal(audit.sourceCommit,"840a0cda361b3ce215fc934badc26df72dffc6e8");
  assert.equal(audit.designSystemCommit,"70f0eabf609b5b4391459c426d6f7ecaeac070c8");
  assert.equal(manifest.source.gitBlobSha,"63b60f8d87327c6fd1e80c8cdf4ff832c4089bfa");
  assert.equal(audit.totals.cssFiles,8);
  assert.equal(audit.totals.literalMatches,54); // archival datum ONLY
  assert.equal(audit.scanned.length,8);
  const swatches=new Set(manifest.entries.filter(x=>x.value.startsWith("#")).map(x=>x.value.toUpperCase()));
  let currentLiteralMatches=0,changedFiles=0;
  for(const row of audit.scanned){
    const css=await readFile(resolve(row.path),"utf8");
    const hexes=css.match(/#[0-9a-fA-F]{6}\b/g)||[];
    const n=hexes.filter(hex=>swatches.has(hex.toUpperCase())).length;
    currentLiteralMatches+=n;
    if(n!==row.rawMatches)changedFiles++;
  }
  assert.ok(currentLiteralMatches>=0);
  // Current observations are deliberately *not* asserted to equal the
  // 22 October snapshot. No semantic mapping follows from a literal match.
  console.log("P_TOKEN_01B_LEXICAL_COMPARISON "+JSON.stringify({
    historicCommit:audit.sourceCommit,historicLiteralMatches:54,
    currentLiteralMatches,changedFiles,scope:"informational; no CSS activation"
  }));
});
