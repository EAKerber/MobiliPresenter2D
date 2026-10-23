import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("temporary session status has exactly one modern Netlify route owner",()=>{
  const toml=readFileSync(new URL("../netlify.toml",import.meta.url),"utf8");
  const fn=readFileSync(new URL("../netlify/functions/access-session-status.mjs",import.meta.url),"utf8");
  assert.match(fn,/export const config = \{ path: "\/api\/access\/session" \};/);
  assert.match(fn,/request\.method !== "POST"/);
  assert.match(fn,/findActiveSession\(token\)/);
  assert.doesNotMatch(toml,/^\s*from\s*=\s*"\/api\/access\/session"\s*$/m,
    "a forced rewrite to the legacy function URL must not shadow the configured direct route");
  assert.match(toml,/from = "\/api\/access\/session\/logout"/,
    "logout keeps its existing independently validated route");
  assert.match(toml,/from = "\/api\/buyer-configuration"/,
    "buyer API routing remains unchanged");
});
