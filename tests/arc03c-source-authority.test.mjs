import test from "node:test";
import assert from "node:assert/strict";
import {access,copyFile,mkdtemp,mkdir,readFile,rm,writeFile} from "node:fs/promises";
import {dirname,join,resolve} from "node:path";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {escapeHtml,projectPages} from "../scripts/compile-primary-pages.mjs";
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const normalizeNewlines=value=>value.replace(/\r\n/g,"\n");
const SLOT="<!-- ARC03_PRIMARY_HEADER -->";
const SOURCE_INPUTS=[
 "scripts/compile-primary-pages.mjs",
 "app/core/ui-copy.js",
 "architecture/fragments/primary-header.fragment.html",
 "architecture/fragments/primary-header.routes.json",
 "architecture/pages/root.page.html",
 "architecture/pages/about.page.html",
 "architecture/pages/how-it-works.page.html"
];
const ISOLATED_INPUTS=[
 ...SOURCE_INPUTS,
 "architecture/generated/primary-pages.manifest.json",
 "app/index.html",
 "app/about/index.html",
 "app/how-it-works/index.html"
];
const gate=(mode="--check",root=ROOT)=>spawnSync(
 process.execPath,[join(root,"scripts/compile-primary-pages.mjs"),mode],
 {cwd:root,encoding:"utf8",timeout:20000}
);
async function runIsolatedMutation(path,mutate,mode="--check",inputs=ISOLATED_INPUTS) {
 const root=await mkdtemp(join(tmpdir(),"m2d-arc03-source-authority-"));
 try {
  const liveBefore=await readFile(join(ROOT,path),"utf8");
  for(const file of inputs) {
   const destination=join(root,file);
   await mkdir(dirname(destination),{recursive:true});
   await copyFile(join(ROOT,file),destination);
  }
  const target=join(root,path),before=await readFile(target,"utf8");
  await mutate(target,before);
  const mutation=await readFile(target,"utf8");
  const result=gate(mode,root),after=await readFile(target,"utf8");
  const liveAfter=await readFile(join(ROOT,path),"utf8");
  return {root,mutation,after,liveBefore,liveAfter,...result};
 } finally {
  await rm(root,{recursive:true,force:true});
 }
}
async function assertRejectedMutation(path,mutate,expected) {
 const r=await runIsolatedMutation(path,mutate,"--check",SOURCE_INPUTS);
 assert.notEqual(r.status,0,"the isolated invalid source must fail");
 assert.match(r.stderr,expected);
 assert.equal(r.after,r.mutation,"the check must leave the negative fixture unchanged");
 assert.equal(r.liveAfter,r.liveBefore,"the active checkout must remain unchanged");
 await assert.rejects(access(r.root),{code:"ENOENT"},"the temporary fixture must be removed");
}

test("three generated pages and provenance manifest match authoritative source",async()=>{
 const r=await projectPages();
 assert.equal(r.manifest.authority,"architecture/pages");
 assert.deepEqual(r.manifest.pages.map(x=>x.route),["/","/about/","/how-it-works/"]);
 assert.equal(normalizeNewlines(await readFile("architecture/generated/primary-pages.manifest.json","utf8")),r.text);
 for(const p of r.pages) {
  assert.equal(normalizeNewlines(await readFile(p.output,"utf8")),p.html);
  assert.match(p.html,/<header class="site-header site-header--public">/);
  assert.doesNotMatch(p.html,/<!-- ARC03_PRIMARY_HEADER -->/);
 }
 const x=gate();assert.equal(x.status,0,x.stderr);
});
test("public copy is catalog-backed and remains static in generated HTML",async()=>{
 const r=await projectPages(),expected=[
  ["/brand/homeLinkAriaLabel","Casa em Módulos, início"],
  ["/brand/logoAlt","Casa em Módulos"],
  ["/navigation/primaryLabel","Navegação principal"],
  ["/navigation/environments","Ambientes"],
  ["/navigation/howItWorks","Como funciona"],
  ["/navigation/about","Quem somos"],
  ["/navigation/contactAriaLabel","Fale conosco pelo WhatsApp"],
  ["/navigation/contact","Fale conosco"]
 ];
 assert.equal(r.manifest.schema,"M2DARC03CPublishedPages/3");
 assert.equal(r.manifest.copyCatalog.path,"app/core/ui-copy.js");
 for(const page of r.pages) {
  const catalogVersion=["app/index.html","app/about/index.html","app/how-it-works/index.html"].includes(page.output)
   ? "arc13-loc004-comparison-copy-1"
   : "arc13-loc003-copy-1";
  const catalogScript=new RegExp(`<script src="/core/ui-copy\\.js\\?v=${catalogVersion}"></script>`);
  assert.equal((page.html.match(new RegExp(catalogScript.source,"g"))||[]).length,1,
   "each generated page loads the shared catalog exactly once");
  assert.match(page.html,/<a class="brand" href="[^"]+" aria-label="Casa em Módulos, início">/);
  assert.match(page.html,/<img[^>]+alt="Casa em Módulos">/);
  assert.match(page.html,/<nav id="primaryNav" aria-label="Navegação principal">/);
  for(const [,label] of expected.slice(3,6))assert.ok(page.html.includes(">"+label+"</a>"),label+" must be present without JS");
  assert.match(page.html,/<a class="header-cta" href="https:\/\/wa\.me\/" aria-label="Fale conosco pelo WhatsApp"><span>Fale conosco<\/span>/,
   "contact copy stays visible, accessible, and statically available without JavaScript");
  const comparisonRowLabels=[
   ["adaptation","Adaptação"],["quality","Qualidade"],["personalization","Personalização"],
   ["cost","Custo"],["stagedPurchase","Compra por etapas"],["production","Produção"]
  ];
  const comparisonCards=[
   ["readyMade","Móveis prontos",[
    "Dimensões e configurações da linha.","Varia conforme o produto e o fabricante.","Opções oferecidas pela linha.",
    "Varia conforme produto e configuração.","Depende da linha e da disponibilidade.","Produção da linha do fabricante."
   ]],
   ["traditional","Planejados tradicionais",[
    "Projeto definido para o ambiente.","Definida por materiais, projeto e execução.","Definida durante o projeto.",
    "Varia conforme projeto, materiais e serviço.","Definida com o prestador.","Produção conforme o projeto."
   ]],
   ["modular","Casa em Módulos",[
    "Combinação de módulos estudados para o empreendimento.","Padrão de marcenaria conforme especificações do projeto.",
    "Combinações de módulos, acabamentos e acessórios disponíveis.","Busca valores acessíveis por eficiência e escala.",
    "Possibilidade prevista no modelo, conforme regras comerciais.","Organizada a partir de uma plataforma modular por empreendimento."
   ]]
  ];
  const comparisonCopy=comparisonCards.flatMap(([cardKey,cardTitle,details])=>[
   [`/comparison/cards/${cardKey}`,cardTitle],
   ...comparisonRowLabels.flatMap(([labelKey,label],index)=>[
    [`/comparison/labels/${labelKey}`,label],
    [`/comparison/details/${cardKey}/${labelKey}`,details[index]]
   ])
  ]);
  const pageCopy=page.output==="app/index.html"
   ? [["/home/hero/eyebrow","Casa em Módulos"],["/home/hero/heading/assemble","Monte."],["/home/hero/heading/choose","Escolha."],["/home/hero/heading/enjoy","Aproveite."],["/home/hero/lead","Móveis inteligentes, pensados para o seu espaço e para o seu orçamento."],["/home/hero/description","Um novo conceito em mobiliário que une projeto, fabricação e instalação em uma solução simples, prática e acessível."],["/home/benefits/miniLabel","Vantagens"],["/actions/exploreEnvironments","Conheça nossos ambientes"],["/home/hero/aboutLink","Saiba mais"],["/video/youtubeLink","Assistir no YouTube ↗"],["/home/hero/artworkAlt","Cozinha planejada com uma mão segurando um celular"],["/home/hero/video/groupLabel","Vídeo de apresentação no celular"],["/home/hero/video/playLabel","Reproduzir o vídeo de apresentação"],["/video/fullscreen/open","Abrir vídeo em tela cheia"],["/video/fullscreen/open","Abrir vídeo em tela cheia"],["/home/benefits/stripLabel","Vantagens Casa em Módulos"],["/home/environments/eyebrow","Você escolhe o que precisa"],["/home/environments/heading","A gente já sabe como fazer."],["/home/environments/carousel/previous","Ambientes anteriores"],["/home/environments/carousel/page","Página do carrossel"],["/home/environments/carousel/next","Próximos ambientes"],["/home/story/eyebrow","Simples do início ao fim"],["/home/story/heading","Do seu espaço ao ambiente pronto."],["/home/story/description","Escolha o ambiente, conheça os módulos e encontre uma solução que acompanha sua rotina."],["/home/story/action","Encontre seu ambiente "],["/brand/logoAlt","Casa em Módulos"],["/footer/tagline","Móveis modulares pensados para a vida real."]]
   : page.output==="app/how-it-works/index.html"
    ? [["/video/youtubeLink","Assistir no YouTube ↗"],...comparisonCopy,["/brand/logoAlt","Casa em Módulos"],["/footer/tagline","Móveis modulares pensados para a vida real."],["/footer/homeLink","Voltar ao início ↑"]]
    : page.output==="app/about/index.html"
     ? [["/actions/exploreEnvironments","Conheça nossos ambientes"],["/brand/logoAlt","Casa em Módulos"],["/footer/tagline","Móveis modulares pensados para a vida real."],["/footer/homeLink","Voltar ao início ↑"]]
     : [];
  const pageExpected=[...expected,...pageCopy];
  const mapped=page.sourceMap.filter(segment=>segment.origin.kind==="catalog-key");
  assert.deepEqual(mapped.map(segment=>segment.origin.pointer),pageExpected.map(([pointer])=>pointer));
  for(let i=0;i<mapped.length;i++) {
   const segment=mapped[i];
   assert.equal(segment.transform,"catalog-key-substitution");
   assert.equal(segment.origin.path,"app/core/ui-copy.js");
   assert.equal(Array.from(page.html).slice(segment.output.start,segment.output.end).join(""),pageExpected[i][1]);
  }
 }
 const home=r.pages.find(page=>page.output==="app/index.html");
 assert.match(home.html,/<a class="button button-dark" href="\/#ambientes">Conheça nossos ambientes <span aria-hidden="true">→<\/span><\/a>/,
  "the environments CTA retains its route and stays usable without JavaScript");
 assert.match(home.html,/<p class="eyebrow">Casa em Módulos<\/p>\s*<h1 id="heroTitle">Monte\.<br>Escolha\.<br><em>Aproveite\.<\/em><\/h1>\s*<p class="hero-lead">Móveis inteligentes, pensados para o seu espaço e para o seu orçamento\.<\/p>\s*<p class="hero-description">Um novo conceito em mobiliário que une projeto, fabricação e instalação em uma solução simples, prática e acessível\.<\/p>/,
  "the Home hero copy remains exact and statically rendered with its original heading markup");
 assert.match(home.html,/<div class="section-heading"><p class="eyebrow">Você escolhe o que precisa<\/p><h2 id="environmentsTitle">A gente já sabe como fazer\.<\/h2><\/div>/,
  "the Home environments heading remains exact and statically rendered with its original semantics");
 assert.match(home.html,/<section class="story-section" id="como-funciona"><p class="eyebrow">Simples do início ao fim<\/p><h2>Do seu espaço ao ambiente pronto\.<\/h2><p>Escolha o ambiente, conheça os módulos e encontre uma solução que acompanha sua rotina\.<\/p><a href="\/#ambientes">Encontre seu ambiente <span aria-hidden="true">→<\/span><\/a><\/section>/,
  "the Home story section keeps its exact copy, route, trailing-space boundary, and static markup");
 assert.match(home.html,/<a href="\/about\/">Saiba mais<\/a>/,
  "the approved hero link stays visible and usable without JavaScript");
 assert.match(home.html,/role="group" aria-label="Vídeo de apresentação no celular" hidden/,
  "the hero video group keeps its exact accessible name as static HTML");
 assert.match(home.html,/id="heroPhonePoster" type="button" aria-label="Reproduzir o vídeo de apresentação"/,
  "the hero video poster keeps its exact accessible name as static HTML");
 assert.match(home.html,/id="heroPhoneFullscreen" type="button" aria-label="Abrir vídeo em tela cheia" title="Abrir vídeo em tela cheia"/,
  "the fullscreen button keeps the shared catalog label in both accessible sinks");
 assert.match(home.html,/id="previousPage" aria-label="Ambientes anteriores"[^>]*>←<\/button><div class="pagination" id="pagination" aria-label="Página do carrossel"><\/div><button type="button" id="nextPage" aria-label="Próximos ambientes">→<\/button>/,
  "the environment carousel keeps its exact three accessible labels and static controls");
 assert.match(home.html,/id="miniBenefits" aria-label="Vantagens"><\/div>/,
  "the hero benefits region keeps its exact accessible name in static HTML");
 assert.match(home.html,/<section class="benefit-strip" aria-label="Vantagens Casa em Módulos">/,
  "the benefits strip keeps its distinct accessible name in static HTML");
 assert.match(home.html,/<a href="https:\/\/www\.youtube\.com\/shorts\/hgcJ1k7lFkE" target="_blank" rel="noopener noreferrer">Assistir no YouTube ↗<\/a>/,
  "the YouTube link keeps its destination and remains usable without JavaScript");
 assert.equal(home.sourceMap.find(segment=>segment.origin.pointer==="/home/hero/aboutLink")?.origin.template.path,
  "architecture/pages/root.page.html");
 const howItWorks=r.pages.find(page=>page.output==="app/how-it-works/index.html");
 assert.match(howItWorks.html,/<a class="video-youtube-link" href="https:\/\/www\.youtube\.com\/shorts\/hgcJ1k7lFkE" target="_blank" rel="noopener noreferrer">Assistir no YouTube ↗<\/a>/,
  "the How it works YouTube link keeps its destination and remains usable without JavaScript");
 assert.match(r.pages.find(page=>page.output==="app/about/index.html").html,/<footer class="site-footer">[\s\S]*?<a href="\/">Voltar ao início ↑<\/a><\/footer>/,
  "About footer remains a static link to the home route without JavaScript");
 assert.match(r.pages.find(page=>page.output==="app/about/index.html").html,/<a class="about-text-link" href="\/#ambientes">Conheça nossos ambientes<\/a>/,
  "About environments CTA retains its route and remains usable without JavaScript");
 assert.match(howItWorks.html,/<footer class="site-footer">[\s\S]*?<a href="\.\.\/">Voltar ao início ↑<\/a><\/footer>/,
  "How it works footer preserves its relative home destination without JavaScript");
 for(const page of r.pages)assert.match(page.html,/<footer class="site-footer"[^>]*>[\s\S]*?<span>Móveis modulares pensados para a vida real\.<\/span>/,
  "the shared footer tagline stays static and exact on every primary page");
 for(const page of r.pages)assert.doesNotMatch(page.html,/\{\{copy\.[^{}]+\}\}/,
  "generated HTML contains no unresolved page-copy placeholders");
});
test("catalog text escapes HTML-sensitive characters",()=>{
 assert.equal(escapeHtml(`&<>"'`),"&amp;&lt;&gt;&quot;&#39;");
});
test("generated-page drift fails closed in isolated fixtures",async()=>{
 const htmlPath="app/about/index.html",htmlBefore=await readFile(join(ROOT,htmlPath),"utf8");
 const html=await runIsolatedMutation(htmlPath,
  (target,before)=>writeFile(target,before+"\n<!-- MANUAL_DRIFT -->\n"),"--build");
 assert.notEqual(html.status,0);
 assert.match(html.stderr,/Generated HTML drift/);
 assert.equal(html.after,html.mutation,"the compiler must not overwrite the negative fixture");
 assert.equal(html.liveAfter,htmlBefore,"the active checkout must remain unchanged");
 await assert.rejects(access(html.root),{code:"ENOENT"},"the temporary fixture must be removed");

 const manifestPath="architecture/generated/primary-pages.manifest.json";
 const manifestBefore=await readFile(join(ROOT,manifestPath),"utf8");
 const manifest=await runIsolatedMutation(manifestPath,
  (target,before)=>writeFile(target,before+" \n"));
 assert.notEqual(manifest.status,0);
 assert.match(manifest.stderr,/Generated manifest drift/);
 assert.equal(manifest.after,manifest.mutation,"the check must leave the negative fixture unchanged");
 assert.equal(manifest.liveAfter,manifestBefore,"the active checkout must remain unchanged");
 await assert.rejects(access(manifest.root),{code:"ENOENT"},"the temporary fixture must be removed");
});
test("compiler rejects unsafe and out-of-scope sources in isolated fixtures",async()=>{
 await assertRejectedMutation("architecture/fragments/primary-header.routes.json",
  async(target)=> {
   const config=JSON.parse(await readFile(target,"utf8"));
   config.routes[0].brandHref="javascript:alert(1)";
   await writeFile(target,JSON.stringify(config,null,2)+"\n");
  },/Unsafe static link: brandHref/);
 await assertRejectedMutation("architecture/pages/root.page.html",
  (target,before)=>writeFile(target,before+"\n"+SLOT+"\n"),
  /Exactly one header slot required/);
 await assertRejectedMutation("architecture/pages/root.page.html",
  (target,before)=>writeFile(target,before+'\n<header class="site-header site-header--public"></header>\n'),
  /Duplicate authorial header/);
 await assertRejectedMutation("architecture/pages/root.page.html",
  (target,before)=>writeFile(target,before+'\n<header class="viewer-header"></header>\n'),
  /NAV-005 excluded/);
 await assertRejectedMutation("architecture/pages/root.page.html",
  (target,before)=>writeFile(target,before.replace("{{copy.home.hero.aboutLink}}","{{copy.home.hero.unapproved}}")),
  /Page copy placeholder is not approved/);
 await assertRejectedMutation("architecture/fragments/primary-header.routes.json",
  async(target)=> {
   const config=JSON.parse(await readFile(target,"utf8"));
   config.status="EXPERIMENTAL_BUILD_TIME_ONLY_NOT_PUBLISHED";
   await writeFile(target,JSON.stringify(config,null,2)+"\n");
  },/BUILD_AUTHORITATIVE_ARC03C/);
 await assertRejectedMutation("app/core/ui-copy.js",
  (target,before)=>writeFile(target,before.replace('howItWorks: "Como funciona"','howItWorks: " "')),
  /Catalog entry must not be blank/);
 await assertRejectedMutation("app/core/ui-copy.js",
  (target,before)=>writeFile(target,before.replace('schema: "M2DUIStringCatalog/1"','schema: "M2DUIStringCatalog/99"')),
  /Unsupported UI copy catalog schema/);
 await assertRejectedMutation("app/core/ui-copy.js",
  (target,before)=>writeFile(target,before.replace('locale: "pt-BR"','locale: "en-US"')),
  /requires pt-BR copy/);
});
test("Viewer NAV-005 stays independently authored",async()=>{
 const html=await readFile("app/viewer/index.html","utf8");
 assert.match(html,/<header class="viewer-header">/);
 assert.doesNotMatch(html,/<header class="site-header/);
});
