const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const vm = require("node:vm");
const { chromium } = require("playwright");

const repoRoot = path.resolve(__dirname, "..");
const appRoot = path.join(repoRoot, "app");
const reviewDir = process.argv[2] || "/tmp/admin-hierarchy-review";
fs.mkdirSync(reviewDir, { recursive: true });

const sandbox = { window: {} };
vm.createContext(sandbox);
["data/scene-data.js", "data/catalog-data.js", "data/mock-price-book.js"].forEach((relativePath) => {
  vm.runInContext(fs.readFileSync(path.join(appRoot, relativePath), "utf8"), sandbox, { filename: relativePath });
});

const catalog = sandbox.window.CASA_EM_MODULOS_CATALOG;
const priceBook = sandbox.window.CASA_EM_MODULOS_PRICE_BOOK;
const scene = sandbox.window.CASA_EM_MODULOS_SCENE;
const defaults = require(path.join(appRoot, "data/configurator-settings.js"));
const configuration = require(path.join(appRoot, "core/configuration.js"));

let current = configuration.createDefaultAdministration(defaults, catalog, priceBook, scene);
let putCount = 0;
let lastPut = null;

const identityStub = 