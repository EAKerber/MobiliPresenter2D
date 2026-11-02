// Semantic, localhost-only public navigation test.
// Derived from P-COMP-01 behavioral goals without differential snapshots.
// No production request, browser auth, grant, external script, or Netlify deploy.
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {chromium,webkit}=require("playwright");

const BASE=process.env.M2D_PUBLIC_LOOPBACK_URL || "http://127.0.0.1:8123";
const ROUTES=[
  {path:"/",active:"/#ambientes",kind:"primary"},
  {path:"/about/",active:"/about/",kind:"primary"},
  {path:"/how-it-works/",active:"/how-it-works/",kind:"primary"},
  {path:"/viewer/",active:null,kind:"viewer"}
];
const WIDTHS=[390,768,1366],NAV005_HOW_WIDTHS=[275,288,290,291,320,321,486,900,901],THEMES=["light","dark"];
const NAV005_PUBLIC_NARROW_WIDTHS=[275,288,290,291,320];
const widthsFor=path=>path==="/viewer/"?WIDTHS:
  [...new Set([...WIDTHS,...(path==="/how-it-works/"?NAV005_HOW_WIDTHS:NAV005_PUBLIC_NARROW_WIDTHS)])];
const ENGINES=[["chromium",chromium],["webkit",webkit]];
let passed=0;

for(const [engineName,engine] of ENGINES){
  const browser=await engine.launch({headless:true});
  try{
    for(const {path,active,kind} of ROUTES){
      for(const width of widthsFor(path))for(const theme of THEMES){
        const id=[engineName,path,width,theme].join("|");
        const context=await browser.newContext({viewport:{width,height:844},
          reducedMotion:"reduce",locale:"pt-BR",serviceWorkers:"block"});
        // Keep all network traffic on the localhost static fixture.
        await context.route("**/*",async route=>{
          const url=new URL(route.request().url());
          if(url.protocol==="data:" || (url.hostname==="127.0.0.1" && url.port==="8123"))
            await route.continue();
          else await route.abort("blockedbyclient");
        });
        await context.addInitScript(mode=>{
          try { localStorage.setItem("casa-ui-theme-mode-v1",mode); }
          catch { /* Sandboxed third-party iframe has no storage origin. */ }
        },theme);
        const page=await context.newPage(),errors=[];
        page.on("pageerror",e=>errors.push(String(e.message).slice(0,250)));
        try{
          const res=await page.goto(BASE+path,{waitUntil:"domcontentloaded",timeout:25000});
          assert.equal(res?.status(),200,id+" route must load");
          await page.locator("[data-ui-theme-toggle]").first().waitFor({timeout:14000});
          const toggle=page.locator("#menuToggle"),nav=page.locator("#primaryNav");
          assert.equal(await toggle.count(),1,id+" one toggle");
          assert.equal(await nav.count(),1,id+" one shared nav");
          assert.equal(await page.locator('script[src*="/landing/header-menu.js"]').count(),1,
            id+" exactly one controller");
          assert.equal(await toggle.getAttribute("aria-expanded"),"false",
            id+" initially closed");
          assert.equal(await toggle.getAttribute("aria-controls"),"primaryNav");
          assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),
            theme,id+" theme");
          const themeName=await page.locator("[data-ui-theme-toggle]").first().getAttribute("aria-label");
          assert.match(themeName||"",/^Tema atual: (Claro|Escuro)\. Ativar (Automático|Claro|Escuro)\.$/,
            id+" icon-only and visible theme control keeps its accessible name");
          assert.deepEqual(await nav.locator("[aria-current='page']").evaluateAll(
            elements=>elements.map(e=>{const u=new URL(e.getAttribute("href"),document.baseURI);return u.pathname+u.hash;})),active?[active]:[],
            id+" active nav must match route (Viewer has none)");
          if(kind==="primary"){
            assert.equal(await page.locator(".site-header").count(),1);
            assert.equal(await page.locator(".site-header--public").count(),1,
              id+" first-level public header has an explicit scope");
            assert.equal(await page.evaluate(()=>document.documentElement.classList.contains("public-page-root")),true,
              id+" public narrow-fit exception is explicitly scoped");
            assert.equal(await page.locator(".viewer-header").count(),0);
            const compact=width<=900;
            const cta=page.locator(".header-cta");
            assert.equal(await cta.count(),1,id+" one public contact link");
            assert.equal(await cta.getAttribute("aria-label"),"Fale conosco pelo WhatsApp");
            assert.equal(await cta.evaluate(el=>el.parentElement.id),compact?"primaryNav":"",
              id+" contact moves between the compact menu and wide actions");
            if(!compact)assert.equal(await cta.evaluate(el=>el.parentElement.classList.contains("header-actions")),true,
              id+" wide contact stays in the established action group");
            const controlGeometry=await page.evaluate(()=>{
              const theme=document.querySelector("[data-ui-theme-toggle]"),menu=document.querySelector("#menuToggle");
              const themeRect=theme?.getBoundingClientRect(),menuRect=menu?.getBoundingClientRect();
              const headerRect=document.querySelector(".site-header--public")?.getBoundingClientRect();
              return {adjacent:theme?.nextElementSibling===menu,themeRight:themeRect?.right,
                menuLeft:menuRect?.left,menuRight:menuRect?.right,headerRight:headerRect?.right,
                expectedInset:Math.max(24,(innerWidth-1280)/2)};
            });
            assert.equal(controlGeometry.adjacent,true,id+" theme immediately precedes the menu in the DOM");
            if(compact){
              assert.ok(controlGeometry.menuRight<=width+1,id+" menu remains inside the viewport");
              assert.ok(controlGeometry.menuRight>=controlGeometry.headerRight-32,
                id+" menu stays at the far right of the public header");
              assert.ok(controlGeometry.themeRight<=controlGeometry.menuLeft+1,
                id+" theme control stays immediately before the menu");
            }else{
              assert.ok(Math.abs(controlGeometry.headerRight-controlGeometry.themeRight-controlGeometry.expectedInset)<=2,
                id+" wide theme control stays at the established right inset");
            }
            const labelVisible=await page.locator("[data-ui-theme-toggle] .ui-theme-toggle__label-short")
              .evaluate(el=>getComputedStyle(el).display!=="none");
            assert.equal(labelVisible,width>290,id+" public theme label follows compact fit");
            if(width<=320){
              const narrow=await page.evaluate(()=>{
                const brand=document.querySelector(".site-header--public .brand").getBoundingClientRect();
                const actions=document.querySelector(".site-header--public .header-actions").getBoundingClientRect();
                const menu=document.querySelector("#menuToggle").getBoundingClientRect();
                const theme=document.querySelector("[data-ui-theme-toggle]").getBoundingClientRect();
                const header=document.querySelector(".site-header--public").getBoundingClientRect();
                return {rootScroll:document.documentElement.scrollWidth,headerHeight:header.height,brandWidth:brand.width,
                  brandBottom:brand.bottom,actionsTop:actions.top,menuRight:menu.right,themeRight:theme.right,
                  headerRight:header.right};
              });
              assert.ok(narrow.rootScroll<=width,id+" narrow public page has no horizontal overflow");
              assert.ok(narrow.brandWidth>=111.5&&narrow.brandWidth<=160,
                id+" narrow logo reduction stays within the approved 30 percent");
              assert.ok(narrow.menuRight<=width&&narrow.menuRight>=narrow.headerRight-32,
                id+" narrow menu remains visible at the header's right edge");
              assert.ok(narrow.themeRight<=narrow.menuRight-40,
                id+" narrow theme control fits before the menu");
              if(width===290){
                assert.ok(narrow.actionsTop>=narrow.brandBottom-1,id+" 290px header wraps into two rows");
                assert.ok(narrow.menuRight<=width,id+" 290px menu target remains fully visible");
              }
              if(width===291)assert.ok(narrow.headerHeight<80,id+" 291px header remains on one row");
            }
            if(path==="/how-it-works/"&&width<=320){
              const hero=await page.evaluate(()=>{
                const copy=document.querySelector(".how-hero-copy"),title=document.querySelector("#heroTitle");
                const copyRect=copy.getBoundingClientRect(),titleRect=title.getBoundingClientRect(),range=document.createRange();
                range.selectNodeContents(title);
                const textRect=range.getBoundingClientRect();
                return {copyWidth:copy.clientWidth,copyScrollWidth:copy.scrollWidth,titleWidth:title.clientWidth,
                  titleScrollWidth:title.scrollWidth,titleLeft:titleRect.left,titleRight:titleRect.right,
                  textLeft:textRect.left,textRight:textRect.right,textTop:textRect.top,textBottom:textRect.bottom,
                  copyLeft:copyRect.left,copyRight:copyRect.right,copyTop:copyRect.top,copyBottom:copyRect.bottom,
                  titleText:title.innerText.trim()};
              });
              assert.ok(hero.titleText.length>0&&hero.titleWidth>0,
                id+" how-it-works title is present and rendered");
              assert.ok(hero.copyScrollWidth<=hero.copyWidth+1&&hero.copyLeft>=-1&&hero.copyRight<=width+1,
                id+" how-it-works hero copy remains inside the viewport");
              assert.ok(hero.titleScrollWidth<=hero.titleWidth+1&&hero.textLeft>=hero.copyLeft-1&&
                hero.textRight<=hero.copyRight+1&&hero.textTop>=hero.copyTop-1&&hero.textBottom<=hero.copyBottom+1,
                id+" how-it-works title text stays visible inside the hero copy");
            }
          }else{
            assert.equal(await page.locator(".site-header").count(),0);
            assert.equal(await page.locator(".viewer-header").count(),1);
            assert.equal(await page.locator(".viewer-header__actions > .back-link + [data-ui-theme-toggle]").count(),1,
              id+" Viewer Ambientes precedes theme");
            assert.equal(await page.locator(".viewer-header__actions > [data-ui-theme-toggle] + #menuToggle").count(),1,
              id+" Viewer theme precedes menu");
          }
          if(await toggle.isVisible()){
            await toggle.focus();
            await page.keyboard.press("Enter");
            assert.equal(await toggle.getAttribute("aria-expanded"),"true",
              id+" Enter must open");
            assert.equal(await nav.isVisible(),true,id+" opened nav must be visible");
            assert.equal(await page.evaluate(()=>document.activeElement===
              document.querySelector("#primaryNav a[href]")),true,
              id+" keyboard activation focuses first link");
            if(kind==="primary"&&width<=900){
              const contact=page.locator("#primaryNav > .header-cta");
              assert.equal(await contact.count(),1,id+" compact menu contains contact");
              assert.equal(await contact.isVisible(),true,id+" open compact menu exposes contact");
              assert.equal(await contact.evaluate(el=>{
                const r=el.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.width>0;
              }),true,id+" contact action fits inside the visible compact menu");
              await page.keyboard.press("Tab");
              await page.keyboard.press("Tab");
              await page.keyboard.press("Tab");
              assert.equal(await contact.evaluate(el=>document.activeElement===el),true,
                id+" keyboard order reaches contact after public navigation");
            }
            await page.keyboard.press("Escape");
            assert.equal(await toggle.getAttribute("aria-expanded"),"false",
              id+" Escape closes");
            assert.equal(await toggle.evaluate(e=>document.activeElement===e),true,
              id+" Escape returns focus");
            await toggle.click();
            assert.equal(await toggle.getAttribute("aria-expanded"),"true",
              id+" pointer opens");
            await page.locator("main").first().dispatchEvent("pointerdown");
            assert.equal(await toggle.getAttribute("aria-expanded"),"false",
              id+" pointer outside closes");
            await toggle.click();
            const first=nav.locator("a[href]").first();
            await first.evaluate(e=>e.addEventListener("click",ev=>ev.preventDefault(),{once:true}));
            await first.click();
            assert.equal(await toggle.getAttribute("aria-expanded"),"false",
              id+" link closes without navigation");
            await toggle.click();
            assert.equal(await toggle.getAttribute("aria-expanded"),"true",
              id+" one controller, not double-initialized");
            await toggle.click();
            assert.equal(await toggle.getAttribute("aria-expanded"),"false",
              id+" pointer closes again");
          }else{
            assert.equal(kind,"primary",id+" Viewer menu must be exposed at every width");
            assert.equal(await nav.isVisible(),true,id+" desktop nav");
          }
          if(engineName==="chromium"&&path==="/how-it-works/"&&width===486&&theme==="light"){
            const contact=page.locator(".header-cta");
            await page.setViewportSize({width:1366,height:844});
            await page.waitForFunction(()=>document.querySelector(".header-cta")?.parentElement?.classList.contains("header-actions"));
            await contact.focus();
            await page.setViewportSize({width:390,height:844});
            await page.waitForFunction(()=>document.querySelector(".header-cta")?.parentElement?.id==="primaryNav");
            assert.equal(await page.locator("#menuToggle").getAttribute("aria-expanded"),"true",
              id+" resizing into compact layout keeps focused contact visible in an open menu");
            assert.equal(await contact.evaluate(el=>document.activeElement===el),true,
              id+" resize preserves focus on the moved contact control");
            await contact.evaluate(el=>el.addEventListener("click",event=>event.preventDefault(),{once:true}));
            await contact.click();
            assert.equal(await page.locator("#menuToggle").getAttribute("aria-expanded"),"false",
              id+" delegated menu click handling closes after the contact is moved");
            await page.locator("#menuToggle").click();
            assert.equal(await page.locator("#menuToggle").getAttribute("aria-expanded"),"true");
            await page.setViewportSize({width:1366,height:844});
            await page.waitForFunction(()=>document.querySelector(".header-cta")?.parentElement?.classList.contains("header-actions"));
            assert.equal(await page.locator("#menuToggle").getAttribute("aria-expanded"),"false",
              id+" resizing to wide layout synchronizes the hidden menu button state");
            assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector("#primaryNav a[href]")),true,
              id+" focus moves from the hidden menu button to visible navigation");
            await page.setViewportSize({width:390,height:844});
            await page.waitForFunction(()=>document.querySelector(".header-cta")?.parentElement?.id==="primaryNav");
            assert.equal(await page.locator("#menuToggle").getAttribute("aria-expanded"),"true",
              id+" resize keeps the focused navigation link visible in the compact menu");
            assert.equal(await page.locator("#primaryNav a[href]").first().evaluate(el=>document.activeElement===el),true,
              id+" resize preserves focus within the shared navigation");
          }
          if(path==="/about/"){
            assert.equal(await page.locator('a.about-skip[href="#main"]').count(),1,
              id+" skip link");
            assert.equal(await page.locator("#main").count(),1,id+" skip target");
          }
          if(path==="/how-it-works/"){
            const cards=page.locator("[data-economy]");
            assert.equal(await cards.count(),6,id+" six economy subjects");
            await cards.first().click();
            assert.equal(await page.locator("#economyDetail").isVisible(),true,
              id+" one details panel opens");
            assert.deepEqual(await cards.evaluateAll(items=>items.slice(0,2).map(
              e=>e.getAttribute("aria-expanded"))),["true","false"],
              id+" only selected card is expanded");
            await cards.nth(1).click();
            assert.deepEqual(await cards.evaluateAll(items=>items.slice(0,2).map(
              e=>e.getAttribute("aria-expanded"))),["false","true"],
              id+" selecting another card collapses previous");
          }
          assert.deepEqual(errors,[],id+" no uncaught public script errors");
          passed++;
          console.log("M2D_PUBLIC_NAV_SEMANTIC_PASS "+JSON.stringify({engineName,path,width,theme}));
        }catch(error){
          console.error("M2D_PUBLIC_NAV_SEMANTIC_FAIL "+JSON.stringify({
            id,message:String(error?.message||error).slice(0,1800),errors
          }));
          throw error;
        }finally{
          await context.close();
        }
      }
    }
  }finally{await browser.close();}
}
const expected=ENGINES.length*THEMES.length*ROUTES.reduce((sum,route)=>sum+widthsFor(route.path).length,0);
assert.equal(passed,expected);
console.log("M2D_PUBLIC_NAV_SEMANTIC_COMPLETE "+JSON.stringify({
  passed,expected,engines:ENGINES.length,routes:ROUTES.length,baseWidths:WIDTHS,
  nav005HowWidths:NAV005_HOW_WIDTHS,nav005PublicNarrowWidths:NAV005_PUBLIC_NARROW_WIDTHS,themes:THEMES.length,
  scope:"static localhost; generated public headers vs independently authored Viewer"
}));
