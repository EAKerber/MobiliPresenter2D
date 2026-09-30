const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
(async()=>{
  const output=path.resolve(process.argv[2]||'review-assets/glass-occlusion/browser');fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
  const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../app/index.html')).href);await page.waitForFunction(()=>window.CASA_EM_MODULOS_DEBUG);
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
  assert.equal(await page.locator('[data-entity-id="module-02-right-exposed-face"]').count(),0);
  assert.equal(await page.locator('[data-entity-id="module-07-floor-side-bridge"]').count(),0);
  await page.evaluate(()=>{const box=document.querySelector('[data-global-service-id="tempered-glass"]');box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.equal(await page.locator('[data-entity-id="tempered-glass"]').getAttribute('aria-hidden'),'false');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'test.json'),JSON.stringify({passed:true,cases,errors},null,2));
  console.log(JSON.stringify({passed:true,cases,errors}));await browser.close();
})();
