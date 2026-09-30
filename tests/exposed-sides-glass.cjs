const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
(async()=>{
  const output=path.resolve(process.argv[2]||'review-assets/exposed-sides-v1/browser');fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
  const page=await browser.newPage({viewport:{width:1600,height:1050}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.APP_URL||pathToFileURL(path.resolve(__dirname,'../app/index.html')).href);
  await page.waitForFunction(()=>window.CASA_EM_MODULOS_DEBUG);
  await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
  const result=await page.evaluate(()=>{
    const scene=window.CASA_EM_MODULOS_SCENE,core=window.CasaModulesCore,v=window.CasaModulesVisibility;
    let cases=0;const modules=scene.entities.filter(e=>e.kind==='module');
    for(let bits=0;bits<128;bits++)for(const glass of [false,true]){
      const state=core.createInitialState(scene);
      modules.forEach((e,i)=>core.setEntityVisibility(state,e.id,Boolean(bits&(1<<i))));
      core.setGlobalService(state,'tempered-glass',glass);const r=v.resolveVisibility(scene,state);
      if(r['tempered-glass'].visible!==glass)throw Error('Glass incorrectly depends on modules');
      for(const e of scene.entities.filter(e=>e.tags.includes('exposed-side'))){
        const expected=r[e.hostId].visible && !(e.occludedByIds||[]).some(id=>r[id].visible);
        if(r[e.id].visible!==expected)throw Error('Side visibility: '+e.id);
      }
      const floorBridge=r['module-07-floor-side-bridge'];
      const expectedBridge=r['module-07'].visible&&!r['module-04'].visible;
      if(floorBridge.visible!==expectedBridge)throw Error('M07 floor joint visibility');
      for(const host of modules){
        const exposed=scene.entities.filter(e=>e.hostId===host.id && e.tags.includes('exposed-side') && r[e.id].visible);
        if(exposed.length>1)throw Error('Contradictory external sides: '+host.id);
      }cases++;
    }return {cases};
  });
  assert.equal(await page.locator('.module-card').count(),7);
  assert.equal(await page.locator('[data-select-scene-entity="tempered-glass"]').count(),0);
  const states={complete:['01','02','03','04','05','06','07'],left:['01','02','05'],right:['01','03','06','07'],upper05:['05'],upper06:['06'],upper07:['07'],module04off:['01','02','03','05','06','07'],module06off:['01','02','03','04','05','07'],module02off:['01','03','04','05','06','07']};
  for(const [name,ids] of Object.entries(states)){
    await page.evaluate(ids=>{const state=window.CASA_EM_MODULOS_DEBUG.getState();
      for(const e of window.CASA_EM_MODULOS_SCENE.entities.filter(e=>e.kind==='module'))state.visibilityByEntity[e.id]=ids.includes(e.id.slice(-2));
      state.globalSelections.finishId='fiber';
      const box=document.querySelector('[data-global-service-id="tempered-glass"]');box.checked=false;box.dispatchEvent(new Event('change',{bubbles:true}));
    },ids);
    await page.locator('#viewer').screenshot({path:path.join(output,name+'.png'),animations:'disabled'});
  }
  await page.evaluate(()=>{
    const state=window.CASA_EM_MODULOS_DEBUG.getState();
    state.visibilityByEntity['module-02-right-exposed-face']=false;
    const box=document.querySelector('[data-global-service-id="tempered-glass"]');box.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.locator('#viewer').screenshot({path:path.join(output,'full-side-base.png'),animations:'disabled'});
  await page.evaluate(()=>{
    const state=window.CASA_EM_MODULOS_DEBUG.getState();
    state.visibilityByEntity['module-02-right-exposed-face']=true;
    const box=document.querySelector('[data-global-service-id="tempered-glass"]');box.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.locator('#viewer').screenshot({path:path.join(output,'full-side-forced.png'),animations:'disabled'});
  // Canonical-camera clean plate for the explicitly requested side-mask workflow:
  // same module set as the valid M02 exposed-side state, with only its side layer removed.
  await page.evaluate(()=>{
    const state=window.CASA_EM_MODULOS_DEBUG.getState();
    for(const e of window.CASA_EM_MODULOS_SCENE.entities.filter(e=>e.kind==='module'))state.visibilityByEntity[e.id]=['01','02','05'].includes(e.id.slice(-2));
    state.visibilityByEntity['module-02-right-exposed-face']=false;
    const box=document.querySelector('[data-global-service-id="tempered-glass"]');box.checked=false;box.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.locator('#viewer').screenshot({path:path.join(output,'m02-side-base.png'),animations:'disabled'});
  await page.evaluate(()=>{window.CASA_EM_MODULOS_DEBUG.getState().visibilityByEntity['module-02-right-exposed-face']=true;const box=document.querySelector('[data-global-service-id="tempered-glass"]');box.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#viewer').screenshot({path:path.join(output,'m02-side-enabled.png'),animations:'disabled'});
  await page.evaluate(()=>{
    const state=window.CASA_EM_MODULOS_DEBUG.getState();
    for(const e of window.CASA_EM_MODULOS_SCENE.entities.filter(e=>e.kind==='module'))state.visibilityByEntity[e.id]=!['module-02'].includes(e.id);
    state.visibilityByEntity['range-freestanding-right-side']=false;
    const box=document.querySelector('[data-global-service-id="tempered-glass"]');box.checked=false;box.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.locator('#viewer').screenshot({path:path.join(output,'range-side-base.png'),animations:'disabled'});
  await page.evaluate(()=>{window.CASA_EM_MODULOS_DEBUG.getState().visibilityByEntity['range-freestanding-right-side']=true;const box=document.querySelector('[data-global-service-id="tempered-glass"]');box.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#viewer').screenshot({path:path.join(output,'range-side-enabled.png'),animations:'disabled'});
  await page.evaluate(()=>{
    const state=window.CASA_EM_MODULOS_DEBUG.getState();
    for(const e of window.CASA_EM_MODULOS_SCENE.entities.filter(e=>e.kind==='module'))state.visibilityByEntity[e.id]=!['module-04'].includes(e.id);
    state.visibilityByEntity['module-07-left-return']=false;
    const box=document.querySelector('[data-global-service-id="tempered-glass"]');box.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.locator('#viewer').screenshot({path:path.join(output,'m07-side-base.png'),animations:'disabled'});
  await page.evaluate(()=>{window.CASA_EM_MODULOS_DEBUG.getState().visibilityByEntity['module-07-left-return']=true;const box=document.querySelector('[data-global-service-id="tempered-glass"]');box.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#viewer').screenshot({path:path.join(output,'m07-side-enabled.png'),animations:'disabled'});
  await page.evaluate(()=>{
    const state=window.CASA_EM_MODULOS_DEBUG.getState();
    for(const e of window.CASA_EM_MODULOS_SCENE.entities.filter(e=>e.kind==='module'))state.visibilityByEntity[e.id]=e.id==='module-07';
    state.visibilityByEntity['module-07-floor-side-bridge']=false;
    const box=document.querySelector('[data-global-service-id="tempered-glass"]');box.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.locator('#viewer').screenshot({path:path.join(output,'m07-floor-joint-base.png'),animations:'disabled'});
  await page.evaluate(()=>{window.CASA_EM_MODULOS_DEBUG.getState().visibilityByEntity['module-07-floor-side-bridge']=true;const box=document.querySelector('[data-global-service-id="tempered-glass"]');box.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#viewer').screenshot({path:path.join(output,'m07-floor-joint-enabled.png'),animations:'disabled'});
  await page.evaluate(()=>{
    const state=window.CASA_EM_MODULOS_DEBUG.getState();
    for(const e of window.CASA_EM_MODULOS_SCENE.entities.filter(e=>e.kind==='module'))state.visibilityByEntity[e.id]=['module-04','module-07'].includes(e.id);
    state.visibilityByEntity['module-07-floor-side-bridge']=true;
    const box=document.querySelector('[data-global-service-id="tempered-glass"]');box.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.locator('#viewer').screenshot({path:path.join(output,'m07-floor-m04-on.png'),animations:'disabled'});
  assert.equal(await page.locator('[data-entity-id="module-07-floor-side-bridge"]').getAttribute('aria-hidden'),'true');
  await page.evaluate(()=>{
    const state=window.CASA_EM_MODULOS_DEBUG.getState();
    for(const e of window.CASA_EM_MODULOS_SCENE.entities.filter(e=>e.kind==='module'))state.visibilityByEntity[e.id]=e.id==='module-07';
    const box=document.querySelector('[data-global-service-id="tempered-glass"]');box.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.locator('#viewer').screenshot({path:path.join(output,'m07-floor-m04-off.png'),animations:'disabled'});
  assert.equal(await page.locator('[data-entity-id="module-07-floor-side-bridge"]').getAttribute('aria-hidden'),'false');
  for(const [name,ids] of Object.entries({glassComplete:['01','02','03','04','05','06','07'],glassModule02off:['01','03','04','05','06','07']})){
    await page.evaluate(ids=>{const state=window.CASA_EM_MODULOS_DEBUG.getState();
      for(const e of window.CASA_EM_MODULOS_SCENE.entities.filter(e=>e.kind==='module'))state.visibilityByEntity[e.id]=ids.includes(e.id.slice(-2));
      const box=document.querySelector('[data-global-service-id="tempered-glass"]');box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));
    },ids);
    await page.locator('#viewer').screenshot({path:path.join(output,name+'.png'),animations:'disabled'});
  }
  // Verify the existing service UI drives the actual layer; reset restores its selected default.
  await page.evaluate(()=>{const box=document.querySelector('[data-global-service-id="tempered-glass"]');box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.equal(await page.locator('[data-entity-id="tempered-glass"]').getAttribute('aria-hidden'),'false');
  page.on('dialog',d=>d.accept());await page.locator('#restoreButton').click();
  assert.equal(await page.evaluate(()=>window.CASA_EM_MODULOS_DEBUG.getVisibility()['tempered-glass'].visible),true);
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(output,'mobile.png'),fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'test.json'),JSON.stringify({passed:true,...result,errors},null,2));
  console.log(JSON.stringify({passed:true,...result,errors}));await browser.close();
})();
