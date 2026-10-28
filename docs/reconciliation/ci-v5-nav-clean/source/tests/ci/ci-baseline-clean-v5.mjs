// CI-only functional browser suites against a synthetic validated V5 projection.
import {spawnSync} from "node:child_process";
const cases=[
  ["mobile","tests/mobile-pip-main-browser.cjs","MOBILE_INTERACTIONS_URL"],
  ["keyboard","tests/keyboard-browser.cjs","KEYBOARD_BROWSER_URL"],
  ["flow","tests/flow-layout-browser.cjs","FLOW_LAYOUT_URL"],
  ["summary","tests/summary-pricing-browser.cjs","SUMMARY_PRICING_BROWSER_URL"],
  ["stone","tests/stone-browser.cjs","STONE_BROWSER_URL"]
];
let passed=0;
for(const [name,file,key] of cases){
  const env={...process.env,[key]:"http://127.0.0.1:8123/config/"};
  delete env.CI_CONFIG_TEST_TOKEN;
  delete env.PLAYWRIGHT_AUTH_STATE_FILE;
  const result=spawnSync(process.execPath,[file,"/tmp/ci-clean-"+name],{
    encoding:"utf8",env,timeout:180000,maxBuffer:6*1024*1024
  });
  const success=result.status===0;
  console.log("CI_CLEAN_V5_SUITE "+JSON.stringify({name,status:success?"PASS":"FAIL",
    exitCode:result.status,signal:result.signal||null}));
  if(!success){
    const output=(String(result.stdout||"")+"\n"+String(result.stderr||""));
    console.error("CI_CLEAN_V5_FAILURE "+JSON.stringify({name,
      excerpt:output.slice(-2200).replace(/https?:\/\/[^\s"'\)]+/g,"[URL]")}));
    process.exitCode=1;
  }else passed++;
}
console.log("CI_CLEAN_V5_COMPLETE "+JSON.stringify({passed,failed:cases.length-passed}));
