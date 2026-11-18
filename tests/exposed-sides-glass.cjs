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
  const shutdownTimeout=new AbortController();
  const stopped=await Promise.race([exited,delay(2000,null,{signal:shutdownTimeout.signal}).then(()=>false,()=>false)]);
  shutdownTimeout.abort();
  if(!stopped&&child.exitCode===null&&child.signalCode===null){
    child.kill('SIGKILL');
    const killTimeout=new AbortController();
    await Promise.race([exited,delay(1000,null,{signal:killTimeout.signal}).catch(()=>false)]);
    killTimeout.abort();
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
  const viewport={width:1600,height:1050};
  const all=['module-01','module-02','module-03','module-04','module-05','module-06','module-07'];
  const expectedCaptures=[
    {name:'glass-all',visibleIds:all},
    {name:'glass-module-02-off',visibleIds:all.filter(id=>id!=='module-02')},
    {name:'glass-module-05-off',visibleIds:all.filter(id=>id!=='module-05')},
    {name:'glass-modules-02-05-on',visibleIds:['module-02','module-05']}
  ];
  const outputFiles=['test.json',...expectedCaptures.map(({name})=>name+'.png')];
  for(const file of outputFiles)fs.rmSync(path.join(output,file),{force:true});
  const report={passed:false,source:'validated local defaults fixture; no hosted configuration',viewport,captures:[],errors:[]};
  let fixture,browser;
  try{
    fixture=await startFixture();
    report.route=new URL(fixture.configUrl).pathname;
    browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
    report.browser=browser.version();
    const page=await browser.newPage({viewport}),captures=report.captures;
    page.on('pageerror',error=>report.errors.push({message:error.message,stack:error.stack||null}));
    await page.goto(fixture.configUrl,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.CASA_EM_MODULOS_DEBUG&&document.documentElement.dataset.publishedConfigurationStatus==='validated',null,{timeout:30000});
    await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
    const model=await page.evaluate(()=>{
      const scene=window.CASA_EM_MODULOS_SCENE,core=window.CasaModulesCore,visibility=window.CasaModulesVisibility;let count=0;
      const modules=scene.entities.filter(e=>e.kind==='module'),moduleIds=modules.map(e=>e.id);
      if(moduleIds.length!==7||new Set(moduleIds).size!==7)throw Error('Expected seven unique module entities before enumerating glass states');
      for(let bits=0;bits<2**modules.length;bits++)for(const glass of [false,true]){
        const state=core.createInitialState(scene);modules.forEach((e,i)=>core.setEntityVisibility(state,e.id,Boolean(bits&(1<<i))));
        core.setGlobalService(state,'tempered-glass',glass);const resolved=visibility.resolveVisibility(scene,state);
        if(resolved['tempered-glass'].visible!==glass)throw Error('Glass visibility must remain independent of modules');count++;
      }
      return {count,moduleIds};
    });
    report.cases=model.count;report.modelModuleIds=model.moduleIds;
    assert.deepEqual([...model.moduleIds].sort(),all,'the 256-case model must cover the seven expected module IDs');
    assert.equal(model.count,256);assert.equal(await page.locator('.module-card').count(),7);
    const capture=async(name,visibleIds,glass=true)=>{
      const observed=await page.evaluate(async({name,visibleIds,glass})=>{
        for(const toggle of document.querySelectorAll('#moduleList [data-module-toggle]')){
          const shouldBeVisible=visibleIds.includes(toggle.dataset.moduleToggle);
          if(toggle.checked!==shouldBeVisible){toggle.checked=shouldBeVisible;toggle.dispatchEvent(new Event('change',{bubbles:true}))}
        }
        const box=document.querySelector('[data-global-service-id="tempered-glass"]');
        if(!box)throw Error('Tempered-glass control is missing');
        if(box.checked!==glass){box.checked=glass;box.dispatchEvent(new Event('change',{bubbles:true}))}
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        const renderedModules=[...document.querySelectorAll('#viewer .layer-group[data-entity-id^="module-"]')];
        const glassLayer=document.querySelector('#viewer [data-entity-id="tempered-glass"]');
        return {
          name,
          selectedModuleIds:[...document.querySelectorAll('#moduleList [data-module-toggle]:checked')].map(toggle=>toggle.dataset.moduleToggle).sort(),
          visibleModuleIds:renderedModules.filter(layer=>layer.getAttribute('aria-hidden')==='false').map(layer=>layer.dataset.entityId).sort(),
          glass:box.checked,
          renderedGlassVisible:glassLayer?.getAttribute('aria-hidden')==='false'
        };
      },{name,visibleIds,glass});
      await page.locator('#viewer').screenshot({path:path.join(output,name+'.png'),animations:'disabled'});
      captures.push(observed);
    };
    for(const expected of expectedCaptures)await capture(expected.name,expected.visibleIds,true);
    const glassCount=await page.locator('[data-entity-id="tempered-glass"]').count();
    const glassZ=await page.locator('[data-entity-id="tempered-glass"]').evaluate(el=>Number(getComputedStyle(el).zIndex));
    const foregroundZ=await page.locator('.layer-group[data-entity-id="module-05"]').evaluate(el=>Number(getComputedStyle(el).zIndex));
    await page.evaluate(()=>{
      const box=document.querySelector('[data-global-service-id="tempered-glass"]');
      if(!box.checked){box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}))}
    });
    const glassAriaHidden=await page.locator('[data-entity-id="tempered-glass"]').getAttribute('aria-hidden');
    const mismatchedCaptures=expectedCaptures.flatMap((expected,index)=>{
      const actual=captures[index],visibleIds=[...expected.visibleIds].sort();
      return !actual||actual.name!==expected.name||JSON.stringify(actual.selectedModuleIds)!==JSON.stringify(visibleIds)||JSON.stringify(actual.visibleModuleIds)!==JSON.stringify(visibleIds)||actual.glass!==true||actual.renderedGlassVisible!==true
        ?[{index,expected:{name:expected.name,visibleModuleIds:visibleIds,glass:true},actual:actual||null}]:[];
    });
    report.glassCount=glassCount;report.glassZ=glassZ;report.foregroundZ=foregroundZ;report.glassAriaHidden=glassAriaHidden;report.mismatchedCaptures=mismatchedCaptures;
    assert.equal(captures.length,4,'the browser review must save all four named states');
    assert.deepEqual(captures.map(({name})=>name),expectedCaptures.map(({name})=>name),'capture names must be unique and match the expected four files');
    assert.equal(new Set(captures.map(({name})=>name)).size,4,'capture names must not overwrite one another');
    assert.deepEqual(mismatchedCaptures,[],'capture filenames and actual module/service states must match');
    assert.equal(glassCount,1);
    assert(glassZ<foregroundZ,'glass must be composited before the furniture and hood');
    assert.equal(glassAriaHidden,'false');
    assert.deepEqual(report.errors,[]);
    report.passed=true;
    console.log(JSON.stringify({passed:true,cases:model.count,errors:report.errors,configUrl:fixture.configUrl,captures:captures.length}));
  }catch(error){
    report.failure={message:error.message,stack:error.stack||null};
    throw error;
  }finally{
    try{if(browser)await browser.close()}finally{
      try{if(fixture)await fixture.close()}finally{fs.writeFileSync(path.join(output,'test.json'),JSON.stringify(report,null,2))}
    }
  }
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
