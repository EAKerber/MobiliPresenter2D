// Browser contract for the stone controls, using the real static app and assets.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');

(async () => {
  const output = process.argv[2] || '/tmp/stone-browser';
  fs.mkdirSync(output, {recursive: true});
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1366, height: 768}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const targetUrl = process.env.STONE_BROWSER_URL || pathToFileURL(path.resolve(__dirname, '../app/index.html')).href;
  const mode = process.env.STONE_BROWSER_URL ? 'production' : 'local';
  await page.goto(targetUrl);
  await page.evaluate(() => Promise.all(Array.from(document.images, image => image.decode())));
  const state = () => page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getState());
  const canvasPixel = async (x, y) => page.evaluate(([x, y]) => Array.from(document.getElementById('stoneCanvas').getContext('2d').getImageData(x,y,1,1).data), [x,y]);
  const waitColor = (x,y) => page.waitForFunction(([x,y]) => document.getElementById('stoneCanvas').getContext('2d').getImageData(x,y,1,1).data[3] > 0, [x,y]);
  const waitEmpty = () => page.waitForFunction(() => !document.getElementById('stoneCanvas').getContext('2d').getImageData(0,0,1536,1024).data.some(value => value !== 0));
  const screenshot = name => page.screenshot({path:path.join(output,name+'.png'),fullPage:true,animations:'disabled'});
  const neutral = await page.locator('#viewer').screenshot({animations:'disabled'});
  await screenshot('desktop-original');

  await page.getByRole('button',{name:'Pedra grafite',exact:true}).click();
  await waitColor(1100,540);
  const graphite = await canvasPixel(1100,540);
  assert.equal((await state()).stoneColor,'#34383d');
  assert.equal(await page.getByRole('button',{name:'Pedra grafite',exact:true}).getAttribute('aria-pressed'),'true');
  await screenshot('desktop-graphite');
  assert(await page.locator('#viewer').evaluate(el => {
    const rect=el.getBoundingClientRect();return rect.top>=0 && rect.bottom<=innerHeight;
  }), 'desktop must show the kitchen while choosing stone color');
  await page.getByRole('button',{name:'Pedra clara',exact:true}).click();
  await page.waitForFunction(previous => document.getElementById('stoneCanvas').getContext('2d').getImageData(1100,540,1,1).data[0] !== previous, graphite[0]);
  assert.equal((await state()).stoneColor,'#d8d8d2');
  await screenshot('desktop-light');
  await page.getByRole('button',{name:'Pedra areia',exact:true}).press('Enter');
  await page.waitForFunction(() => window.CASA_EM_MODULOS_DEBUG.getState().stoneColor === '#968371');
  assert.equal((await state()).stoneColor,'#968371');
  assert.equal(await page.getByRole('button',{name:'Pedra areia',exact:true}).getAttribute('aria-pressed'),'true');
  await screenshot('desktop-sand');
  await page.getByLabel('Outra cor da pedra',{exact:true}).fill('#825faf');
  assert.equal((await state()).stoneColor,'#825faf');
  await page.getByRole('button',{name:'Voltar à pedra original',exact:true}).click();
  await waitEmpty();
  assert.equal((await state()).stoneColor,null);
  assert.deepEqual(await page.locator('#viewer').screenshot({animations:'disabled'}),neutral,'reset must restore exact viewer pixels');

  await page.getByRole('button',{name:'Aplicar Verde oliva',exact:true}).click();
  const front = (await state()).frontFinishId;
  await page.getByRole('button',{name:'Pedra grafite',exact:true}).click();
  await waitColor(1100,540);
  await page.getByRole('button',{name:'Voltar à pedra original',exact:true}).click();
  await waitEmpty();
  assert.equal((await state()).frontFinishId,front,'stone reset must preserve fronts');
  await page.getByRole('button',{name:'Pedra grafite',exact:true}).click();
  await page.getByRole('button',{name:'Voltar ao acabamento original',exact:true}).click();
  assert.equal((await state()).stoneColor,'#34383d','front reset must preserve stone');

  const breakpoints = [];
  for (const [width, workspaceColumns, controlsColumns, viewerPosition] of [
    [1051,2,1,'static'], [1050,1,2,'sticky'], [701,1,2,'sticky'], [700,1,1,'sticky']
  ]) {
    await page.setViewportSize({width,height:844});
    const layout = await page.evaluate(() => {
      const columns = value => value.split(' ').filter(Boolean).length;
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        workspaceColumns: columns(getComputedStyle(document.querySelector('.workspace')).gridTemplateColumns),
        controlsColumns: getComputedStyle(document.querySelector('.controls')).display === 'grid'
          ? columns(getComputedStyle(document.querySelector('.controls')).gridTemplateColumns) : 1,
        viewerPosition: getComputedStyle(document.querySelector('.viewer-card')).position
      };
    });
    assert.equal(layout.overflow,false,`${width}px horizontal overflow`);
    assert.equal(layout.workspaceColumns,workspaceColumns,`${width}px workspace columns`);
    assert.equal(layout.controlsColumns,controlsColumns,`${width}px controls columns`);
    assert.equal(layout.viewerPosition,viewerPosition,`${width}px viewer position`);
    breakpoints.push({width,...layout});
  }

  for (const [a,b,id] of [[false,true,'module-02-hidden'],[true,false,'module-03-hidden'],[false,false,'both-hidden'],[true,true,'both-visible']]) {
    await page.getByRole('checkbox',{name:/Inferior do fogão/}).setChecked(a);
    await page.getByRole('checkbox',{name:/Inferior da pia/}).setChecked(b);
    if (a||b) await waitColor(b?1100:600,530); else await waitEmpty();
    const visible = await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getVisibility());
    assert.equal(visible['approved-stone-02'].visible,a);
    assert.equal(visible['approved-stone-03'].visible,b);
    assert.equal(visible['faucet-approved'].visible,b);
    if (!a) assert.equal((await canvasPixel(600,530))[3],0);
    if (!b) assert.equal((await canvasPixel(1100,530))[3],0);
    await screenshot(id);
  }
  // A pending image decode or color draw must never resurrect a cleared layer.
  await page.getByRole('button',{name:'Pedra clara',exact:true}).click();
  await page.getByRole('button',{name:'Restaurar',exact:false}).click();
  await waitEmpty();
  assert.equal((await state()).stoneColor,null);
  assert.equal((await state()).frontFinishId,'gianduia-original');
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Pedra grafite',exact:true}).click();
  await waitColor(1100,540);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),'mobile horizontal overflow');
  await screenshot('mobile-graphite');
  assert(await page.locator('#viewer').evaluate(el => {
    const rect=el.getBoundingClientRect();return rect.top>=0 && rect.bottom<=innerHeight;
  }), 'mobile must show the kitchen while choosing stone color');
  await page.screenshot({path:path.join(output,'mobile-viewport.png'),animations:'disabled'});
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({status:'PASS',mode,targetUrl,desktop:[1366,768],mobile:[390,844],colors:['#34383d','#d8d8d2','#968371','#825faf'],breakpoints,resetViewerExact:true,independentFinishes:true,visibilityCases:4,pageErrors:errors},null,2));
  await browser.close();
})().catch(error => {console.error(error);process.exit(1);});
