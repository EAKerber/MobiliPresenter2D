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
  await page.goto(pathToFileURL(path.resolve(__dirname, '../app/index.html')).href);
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
  await page.getByRole('button',{name:'Pedra clara',exact:true}).click();
  await page.waitForFunction(previous => document.getElementById('stoneCanvas').getContext('2d').getImageData(1100,540,1,1).data[0] !== previous, graphite[0]);
  assert.equal((await state()).stoneColor,'#d8d8d2');
  await screenshot('desktop-light');
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

  for (const [a,b,id] of [[false,true,'module-02-hidden'],[true,false,'module-03-hidden'],[false,false,'both-hidden'],[true,true,'both-visible']]) {
    await page.getByLabel('Inferior do fogão',{exact:true}).setChecked(a);
    await page.getByLabel('Inferior da pia',{exact:true}).setChecked(b);
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
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({status:'PASS',desktop:[1366,768],mobile:[390,844],resetViewerExact:true,independentFinishes:true,visibilityCases:4,pageErrors:errors},null,2));
  await browser.close();
})().catch(error => {console.error(error);process.exit(1);});
