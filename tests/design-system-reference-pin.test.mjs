import test from "node:test";
import assert from "node:assert/strict";
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
