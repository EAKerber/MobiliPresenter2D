"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.resolve(__dirname, "../app/ui-theme.css"), "utf8");
const expected = { light: "#6e512e", dark: "#d8bc7c" };

for (const [theme, color] of Object.entries(expected)) {
  const rootRules = [...css.matchAll(new RegExp(
    `html\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`, "g"
  ))];
  const tokenRules = rootRules.flatMap((rule) =>
    [...rule[1].matchAll(/--ui-theme-focus:\s*(#[0-9a-f]{6})\s*;/gi)]
      .map((token) => ({ rule, token }))
  );
  assert.equal(tokenRules.length, 1, `${theme} focus token is defined exactly once`);
  const { rule: rootRule, token } = tokenRules[0];
  assert.equal(token[1].toLowerCase(), color, `${theme} focus color is unchanged`);

  const consumers = [...css.matchAll(new RegExp(
    `html\\[data-theme="${theme}"\\]\\s+:focus-visible\\s*\\{\\s*outline-color:\\s*var\\(--ui-theme-focus\\);\\s*\\}`, "g"
  ))];
  assert.equal(consumers.length, 1, `${theme} global focus rule consumes the token exactly once`);
  const consumer = consumers[0];
  assert(css.indexOf(rootRule[0]) < css.indexOf(consumer[0]),
    `${theme} token is defined before its global consumer`);
}

console.log("P-TOKEN-02A1 focus token contract: PASS");
