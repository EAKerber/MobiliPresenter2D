// CI-BASELINE-01: positive integration against the dedicated test site and user-confirmed internal test DB. All session secrets remain in memory.
const out="artifacts/ci-baseline-01/authenticated.json";
await mkdir("artifacts/ci-baseline-01",{recursive:true});
let report={schema:"M2DCIIsolatedSessionFixture/1",classification:"BLOCKED_AUTH_FIXTURE",
  stage:"preflight",realAccessRedeem:false,bootstrap:false,revoked:false};
let db,browser,context,grantId;
try{
 const input={
  origin:process.env.CI_STAGING_ORIGIN,
  databaseUrl:process.env.CI_STAGING_DATABASE_URL,
  projectRef:process.env.CI_STAGING_SUPABASE_REF,
  expectedHost:process.env.CI_STAGING_EXPECTED_HOST,
  isolationTag:process.env.CI_STAGING_ISOLATION_TAG
 };
 const gate=validateFixtureEnvironment(input);
 report.stage="isolated-role-check";
 db=new pg.Client({connectionString:input.databaseUrl,
  ssl:{ca:SUPABASE_DATABASE_CA,rejectUnauthorized:true},
  connectionTimeoutMillis:6000,application_name:"m2d-ci-access-fixture"});
 await db.connect();
 const role=await db.query("select current_user as name");
 assert.equal(role.rows[0]?.name,"access_ci_fixture",
  "BLOCKED_AUTH_FIXTURE: database connection role is not access_ci_fixture");
 const functions=await db.query("select to_regprocedure('access_control.ci_create_config_fixture_grant(uuid,text)') as create_fn, "+
  "to_regprocedure('access_control.ci_revoke_config_fixture_grant(uuid)') as revoke_fn");
 assert.ok(functions.rows[0]?.create_fn&&functions.rows[0]?.revoke_fn,
  "BLOCKED_AUTH_FIXTURE: fixture functions absent; apply the reviewed migration first");

 // Only nonreal address in the RFC-reserved example domain. Five-minute grant.
 grantId=randomUUID();
 const grantToken=createOpaqueToken();
 const expire=new Date(Date.now()+5*60_000);
 await db.query("SELECT access_control.ci_create_config_fixture_grant($1::uuid,$2::text)",
  [grantId,hashOpaqueToken(grantToken)]);
 report.stage="real-redeem";
 browser=await chromium.launch({headless:true});
 context=await browser.newContext({viewport:{width:1366,height:768},serviceWorkers:"block"});
 const page=await context.newPage();
 const jsErrors=[];
 page.on("pageerror",error=>jsErrors.push(error.name||"Error"));
 const redeem=await context.request.post(new URL("/api/access/redeem",gate.origin).toString(),{
  headers:{Origin:gate.origin,"Content-Type":"application/json"},
  data:{token:grantToken},timeout:15000
 });
 assert.equal(redeem.status(),200,"Access redeem rejected isolated fixture");
 const redeemBody=await redeem.json();
 assert.equal(redeemBody?.ok,true,"Access redeem returned not-ok");
 report.realAccessRedeem=true;
 // Grant secret is never written to disk or echoed. The browser context's
 // HttpOnly cookie comes from the *real* redeem endpoint.
 const cookies=await context.cookies(gate.origin);
 assert.ok(cookies.some(c=>c.name===ACCESS_COOKIE_NAME),
  "BLOCKED_AUTH_FIXTURE: redeem did not establish a scoped browser cookie");
 report.stage="authenticated-readiness";
 const config=await page.goto(new URL("/config/",gate.origin).toString(),{
  waitUntil:"domcontentloaded",timeout:20000});
 assert.equal(config?.status(),200,"Authenticated Config HTML not returned");
 assert.equal(new URL(page.url()).pathname,"/config/","Authenticated session redirected away");
 await page.waitForFunction(()=>Boolean(window.CASA_EM_MODULOS_DEBUG &&
  typeof window.CASA_EM_MODULOS_DEBUG.getLayoutProfile==="function"),null,{timeout:20000});
 assert.ok(await page.locator(".workspace").count()>0,"Configurator workspace not found");
 report.bootstrap=true;
 report.layoutProfile=await page.evaluate(()=>window.CASA_EM_MODULOS_DEBUG.getLayoutProfile());
 // Staging user must not acquire admin capabilities.
 const admin=await context.request.get(new URL("/api/admin-bootstrap",gate.origin).toString(),{
  timeout:10000});
 assert.ok([401,403].includes(admin.status()),
  "Temporary session unexpectedly authorized admin endpoint");
 report.adminAccessDenied=true;
 report.jsErrorClasses=jsErrors;
 report.stage="revoke-and-check";
 // Tear down sessions and grant. Revoked cookie should never authorize /config.
 const revoked=await db.query("SELECT access_control.ci_revoke_config_fixture_grant($1::uuid) AS revoked",[grantId]);
 assert.equal(revoked.rows[0]?.revoked,true,"Fixture grant was not revoked");
 await db.query("UPDATE access_control.access_grants "+
  "SET revoked_at=now(),revoked_by_identity_id='ci-isolated-fixture' "+
  "WHERE id=$1 AND revoked_at IS NULL",[grantId]);
 report.revoked=true;
 const after=await page.goto(new URL("/config/",gate.origin).toString(),{
  waitUntil:"domcontentloaded",timeout:20000});
 assert.equal(new URL(page.url()).pathname,"/access/",
  "Revoked session still reaches protected Config");
 assert.equal(after?.status(),200,"Access screen unavailable after revoke");
 report.classification="AUTHENTICATED_FIXTURE_PASS";
 report.stage="complete";
 console.log("CI_CONFIG_AUTHENTICATED_PASS "+JSON.stringify({
  bootstrap:report.bootstrap,revoked:report.revoked,adminAccessDenied:report.adminAccessDenied}));
}catch(error){
 report.errorClass=safeErrorClass(error);
 report.classification=report.stage==="preflight"||report.stage==="isolated-role-check"
  ?"BLOCKED_AUTH_FIXTURE":"AUTHENTICATED_FIXTURE_FAIL";
 console.error(report.classification+" stage="+report.stage+" errorClass="+report.errorClass);
 process.exitCode=1;
}finally{
 if(grantId&&db&&!report.revoked){
  try{
   await db.query("SELECT access_control.ci_revoke_config_fixture_grant($1::uuid)",[grantId]);
   report.revoked=true;
  }catch{
   report.cleanup="FAILED_MANUAL_REVOCATION_REQUIRED";
   process.exitCode=1;
  }
 }
 try{await context?.close();}catch{}
 try{await browser?.close();}catch{}
 try{await db?.end();}catch{}
 await writeFile(out,JSON.stringify(report,null,2)+"\n",{mode:0o600});
}
