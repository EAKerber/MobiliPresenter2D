// P-TOKEN-01B: verify a vendor snapshot without activating any CSS in product runtime.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = path => readFile(join(ROOT,path),"utf8");
const requiredHTML = [
  "app/index.html", "app/about/index.html", "app/how-it-works/index.html",
  "app/viewer/index.html", "app/config/index.html", "app/admin.html",
  "app/access/index.html", "app/access/manage.html"
];
const requiredCSS = [
  "app/public-theme.css", "app/ui-theme.css", "app/landing/landing.css",
  "app/about/about.css", "app/how-it-works/how-it-works.css",
  "app/viewer/viewer.css", "app/styles.css", "app/admin/admin.css"
];

function gitBlobSha(text) {
  const hash=createHash("sha1");
  hash.update("blob "+Buffer.byteLength(text,"utf8")+"\0");
  hash.update(text,"utf8");
  return hash.digest("hex");
}

export async function verifyReferencePin() {
  const path="design-system/pins/vis-002/v0.1.0/PIN.json";
  const pin=JSON.parse(await readText(path));
  assert.equal(pin.schema,"M2DDesignSystemDistributionPin/0.1");
  assert.equal(pin.status,"REFERENCE_ONLY_NOT_LINKED");
  assert.equal(pin.designSystem.repository,"EAKerber/MobiliPresenter2D_DesignSystem");
  assert.equal(pin.designSystem.canonicalDecision,"VIS-002.approvedPalette");
  assert.match(pin.designSystem.commit,/^[a-f0-9]{40}$/);
  assert.equal(pin.product.publishedDirectory,"app");
  assert.equal(pin.product.activated,false);
  assert.equal(pin.product.cssImportAllowed,false);
  assert.deepEqual(pin.product.componentMappingsApproved,[]);
  const css=await readText(pin.distribution.css.path);
  const manifestText=await readText(pin.distribution.manifest.path);
  assert.equal(gitBlobSha(css),pin.distribution.css.gitBlob,"CSS differs from DS-published bytes");
  assert.equal(gitBlobSha(manifestText),pin.distribution.manifest.gitBlob,"manifest differs from DS-published bytes");
  const manifest=JSON.parse(manifestText);
  assert.equal(manifest.version,pin.designSystem.exportVersion);
  assert.equal(manifest.source.gitBlobSha,pin.designSystem.decisionGitBlob);
  assert.equal(manifest.authority.implementationAuthorized,false);
  assert.equal(manifest.policy.generatedCssMayBeLinkedAtRuntime,false);
  assert.equal(manifest.policy.noSemanticAliasesForComponents,true);
  assert.equal(manifest.entries.length,16,"expected 14 colors + 2 focus dimensions");
  assert.match(css,/Reference-only names, NOT mapped to product CSS roles/);
  assert.match(css,/DO NOT LINK into app pages/);
  const names=new Set();
  for(const entry of manifest.entries) {
    assert.match(entry.cssName,/^--ds-reference-[a-z-]+$/);
    assert.equal(names.has(entry.cssName),false,"duplicate reference name");
    names.add(entry.cssName);
    assert.ok(css.includes("  "+entry.cssName+": "+entry.value+";"),
      "generated CSS does not match manifest entry "+entry.cssName);
  }
  // No accidental import/reference in published HTML/CSS. A later approved PR
  // will deliberately replace this invariant with component-specific gates.
  for(const file of [...requiredHTML,...requiredCSS]){
    const source=await readText(file);
    assert.equal(/--ds-reference-|design-system\/pins\/vis-002/.test(source),false,
      "unapproved runtime reference in "+file);
  }
  return {pins:1,entries:names.size,htmlScanned:requiredHTML.length,cssScanned:requiredCSS.length,
    productActivated:false,sourceGitBlob:pin.designSystem.decisionGitBlob,
    designSystemCommit:pin.designSystem.commit};
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  verifyReferencePin().then(result => console.log("P_TOKEN_01B_PIN_PASS "+JSON.stringify(result)))
    .catch(error => {console.error(error);process.exitCode=1;});
}
