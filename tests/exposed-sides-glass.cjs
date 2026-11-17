const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process');
const {setTimeout:delay}=require('node:timers/promises');
const {chromium}=require('playwright');

const repoRoot=path.resolve(__dirname,'..');
const fixtureScript=path.join(__dirname,'ci','local-buyer-config-server.mjs');

async function stopChild(child){
  if(!child||child.exitCode!==null||child.signalCode!==null)return;
  const exited=new Promise(resolve=>child.once('exit',()=>resolve(true)));
  child.kill('SIGTERM');
  const stopped=await Promise.race([exited,delay(2000).then(()=>false)]);
  if(!stopped&&child.exitCode===null&&child.signalCode===null){
    child.kill('SIGKILL');
    await Promise.race([exited,delay(1000)]);
  }
}

async function startFixture(){
  const suppliedUrl=process.env.EXPOSED_SIDES_GLASS_URL;
  if(suppliedUrl){
    const configUrl=new URL(suppliedUrl);
    assert.equal(configUrl.protocol,'http:','glass replay accepts only the local HTTP fixture');
    assert.equal(configUrl.hostname,'127.0.0.1','glass replay must stay on loopback');
    assert.equal(configUrl.pathname,'/config/','glass replay must target the Configurator route');
    return {configUrl:configUrl.href,close:async()=>{}};
  }

  const child=spawn(process.execPath,[fixtureScript],{
    cwd:repoRoot,
    env:{...process.env,CI_LOCAL_CONFIG_PORT:'0'},
    stdio:['ignore','pipe','pipe']
  });
  let stdout='',stderr='',readyInfo=null,settled=false,startupTimer;
  let resolveReady,rejectReady;
  const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject});
  const failStartup=error=>{
    if(settled)return;
    settled=true;
    clearTimeout(startupTimer);
    rejectReady(error);
  };
  const acceptReady=info=>{
    if(settled)return;
    settled=true;
    clearTimeout(startupTimer);
    readyInfo=info;
    resolveReady(info);
  };
  const diagnostic=()=>('stdout:\n'+stdout+'\nstderr:\n'+stderr).slice(-5000);

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data',chunk=>{
    stdout=(stdout+chunk).slice(-10000);
    const match=stdout.match(/CI_LOCAL_BUYER_DEFAULTS_FIXTURE_READY (\{[^\r\n]+\})/);
    if(match){
      try{acceptReady(JSON.parse(match[1]))}
      catch(error){failStartup(new Error('Invalid local fixture readiness record: '+error.message+'\n'+diagnostic()))}
    }
  });
  child.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-10000)});
  child.once('error',error=>failStartup(new Error('Could not start local fixture: '+error.message+'\n'+diagnostic())));
  child.once('exit',(code,signal)=>{
    if(!readyInfo)failStartup(new Error('Local fixture exited before becoming ready ('+code+'/'+signal+').\n'+diagnostic()));
  });
  startupTimer=setTimeout(()=>failStartup(new Error('Timed out waiting for the local fixture readiness record.\n'+diagnostic())),15000);

  try{
    const info=await ready;
    assert(Number.isInteger(info.port)&&info.port>0&&info.port<=65535,'local fixture did not report its assigned loopback port');
    const origin='http://127.0.0.1:'+info.port;
    let endpointReady=false,lastProbeError=null;
    for(let attempt=0;attempt<30;attempt++){
      if(child.exitCode!==null)throw new Error('Local fixture exited during readiness checks.\n'+diagnostic());
      try{
        const [configuration,session]=await Promise.all([
          fetch(origin+'/api/buyer-configuration',{signal:AbortSignal.timeout(1500)}),
          fetch(origin+'/api/access/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({authenticated:false}),signal:AbortSignal.timeout(1500)})
        ]);
        const [configurationBody,sessionBody]=await Promise.all([configuration.json(),session.json()]);
        if(configuration.ok&&session.ok&&configurationBody&&sessionBody.authenticated===false){endpointReady=true;break}
        lastProbeError=new Error('local fixture endpoints did not return the expected anonymous V5 responses');
      }catch(error){lastProbeError=error}
      await delay(100);
    }
    if(!endpointReady)throw new Error('Local fixture did not pass its readiness probes: '+(lastProbeError?.message||'unknown failure')+'\n'+diagnostic());
    return {configUrl:origin+'/config/',close:()=>stopChild(child)};
  }catch(error){
    await stopChild(child);
    throw error;
  }
}

(async()=>{
  const output=path.resolve(process.argv[2]||path.join(os.tmpdir(),'glass-occlusion-browser'));
  fs.mkdirSync(output,{recursive:true});
  let fixture,browser;
  try{
    fixture=await startFixture();
    browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
    const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(fixture.configUrl,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.CASA_EM_MODULOS_DEBUG&&document.documentElement.dataset.publishedConfigurationStatus==='validated',null,{timeout:30000});
    await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
    const cases=await page.evaluate(()=>{
      const scene=window.CASA_EM_MODULOS_SCENE,core=window.CasaModulesCore,visibility=window.CasaModulesVisibility;let count=0;
      const modules=scene.entities.filter(e=>e.kind==='module');
      for(let bits=0;bits<128;bits++)for(const glass of [false,true]){
        const state=core.createInitialState(scene);modules.forEach((e,i)=>core.setEntityVisibility(state,e.id,Boolean(bits&(1<<i))));
        core.setGlobalService(state,'tempered-glass',glass);const resolved=visibility.resolveVisibility(scene,state);
        if(resolved['tempered-glass'].visible!==glass)throw Error('Glass visibility must remain independent of modules');count++;
      }
      return count;
    });
    assert.equal(cases,256);assert.equal(await page.locator('.module-card').count(),7);
    const capture=async(name,visibleIds,glass=true)=>{
      await page.evaluate(({visibleIds,glass})=>{
        const state=window.CASA_EM_MODULOS_DEBUG.getState();
        for(const entity of window.CASA_EM_MODULOS_SCENE.entities.filter(e=>e.kind==='module'))state.visibilityByEntity[entity.id]=visibleIds.includes(entity.id);
        const box=document.querySelector('[data-global-service-id="tempered-glass"]');box.checked=glass;box.dispatchEvent(new Event('change',{bubbles:true}));
      },{visibleIds,glass});
      await page.locator('#viewer').screenshot({path:path.join(output,name+'.png'),animations:'disabled'});
    };
    const all=['module-01','module-02','module-03','module-04','module-05','module-06','module-07'];
    await capture('glass-all',all,true);
    await capture('glass-module-02-off',all.filter(id=>id!=='module-02'),true);
    await capture('glass-module-05-off',all.filter(id=>id!=='module-05'),true);
    await capture('glass-modules-02-05-on',all,true,false);
    assert.equal(await page.locator('[data-entity-id="tempered-glass"]').count(),1);
    const glassZ=await page.locator('[data-entity-id="tempered-glass"]').evaluate(el=>Number(getComputedStyle(el).zIndex));
    const foregroundZ=await page.locator('.layer-group[data-entity-id="module-05"]').evaluate(el=>Number(getComputedStyle(el).zIndex));
    assert(glassZ<foregroundZ,'glass must be composited before the furniture and hood');
    await page.evaluate(()=>{const box=document.querySelector('[data-global-service-id="tempered-glass"]');box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));});
    assert.equal(await page.locator('[data-entity-id="tempered-glass"]').getAttribute('aria-hidden'),'false');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'test.json'),JSON.stringify({passed:true,cases,errors,source:'validated local defaults fixture; no hosted configuration'},null,2));
    console.log(JSON.stringify({passed:true,cases,errors,configUrl:fixture.configUrl}));
  }finally{
    try{if(browser)await browser.close()}finally{if(fixture)await fixture.close()}
  }
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});

