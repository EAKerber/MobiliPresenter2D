#!/usr/bin/env node
/* DS-04 — Zero-dependency static color/theme coverage lint.
 * Run: node theme_audit.cjs /path/to/MobiliPresenter2D
 * Prints summary and writes theme_candidates.json / .csv next to script.
 * This is a LEXICAL TRIAGE aid, not a browser-computed-style validator.
 * Do not auto-fix findings: authoring swatches, photos and scene layers are exempt.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || '.');
const app = path.join(root, 'app');
const cssFiles = ['public-theme.css','ui-theme.css','landing/landing.css','how-it-works/how-it-works.css','viewer/viewer.css','styles.css','admin/admin.css'];
const htmlFiles = ['index.html','about/index.html','how-it-works/index.html','viewer/index.html','config/index.html','admin.html','access/index.html','access/manage.html'];
function walk(dir) { return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
const jsFiles = walk(app).filter(p => /\.m?js$/.test(p) && !p.includes('/data/') && !p.includes('/tools/') && !/\.test\.m?js$/.test(p));
function read(rel) { const p = path.join(app,rel); return fs.existsSync(p) ? fs.readFileSync(p,'utf8') : ''; }
function loc(s,i) { return s.slice(0,i).split('\n').length; }
const htmlSources = htmlFiles.map(f=>({path:f,text:read(f)}));
const jsSources = jsFiles.map(f=>({path:path.relative(app,f).replace(/\\/g,'/'),text:fs.readFileSync(f,'utf8')}));
const domClassSources = new Map();
for(const f of [...htmlSources,...jsSources]) {
  for(const m of f.text.matchAll(/(?:class|className)\s*(?:=|:)\s*["'`]([^"'`]{1,180})/g)) {
    for(const c of m[1].split(/\s+/)) {
      if(!/^[a-zA-Z][\w-]*$/.test(c))continue;
      if(!domClassSources.has(c))domClassSources.set(c,[]);
      if(domClassSources.get(c).length<8)domClassSources.get(c).push(`${f.path}:${loc(f.text,m.index)}`);
    }
  }
}
// Parse flat CSS declarations (regular rules, including many nested @media rules).
// CSS nesting / @supports / complex container and cascade are NOT fully implemented.
function parse(css, rel) {
  const stripped=css.replace(/\/\*[\s\S]*?\*\//g,m=>m.replace(/[^\n]/g,' '));
  const rows=[], rx=/(?:^|\})\s*([^{}]+)\{([^{}]*)\}/gm;
  for(const m of stripped.matchAll(rx)) {
    const selector=m[1].trim(); if(!selector || selector.startsWith('@'))continue;
    const declarations=[];
    for(const dec of m[2].matchAll(/(?:^|;)\s*([\w-]+)\s*:\s*([^;{}]+)/g)) declarations.push({prop:dec[1],value:dec[2].trim()});
    rows.push({source:rel,line:loc(stripped,m.index),selector,declarations});
  }
  return rows;
}
const themeCss=read('ui-theme.css');const themeRows=parse(themeCss,'ui-theme.css');
const themedClasses=new Set();
for(const row of themeRows)for(const m of row.selector.matchAll(/\.[\w-]+/g))themedClasses.add(m[0].slice(1));
const literal=/(?:#[a-f\d]{3,8}\b|rgba?\(|hsla?\(|linear-gradient\(|color-mix\(|\b(?:white|black)\b)/i;
const colorProp=/^(?:(?:background|border|outline|box-shadow|text-shadow)(?:-[\w-]+)?|color|fill|stroke|opacity|filter|caret-color)$/;
const byFile=[];
for(const rel of cssFiles) {
  const css=read(rel);if(!css)continue;
  for(const row of parse(css,rel)) {
    const classes=[...row.selector.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m=>m[1]);
    const used=classes.filter(c=>domClassSources.has(c));
    if(!used.length)continue;
    for(const dec of row.declarations){
      if(!colorProp.test(dec.prop) || !literal.test(dec.value) || /var\(--/.test(dec.value))continue;
      const isThemeSelector=/\[data-theme\s*=|prefers-color-scheme/.test(row.selector);
      if(isThemeSelector)continue;
      const scoped=classes.some(c=>themedClasses.has(c));
      byFile.push({route_family:rel,source:rel,line:row.line,selector:row.selector.replace(/\s+/g,' ').slice(0,180),property:dec.prop,value:dec.value.slice(0,170),dom_evidence:used.map(c=>`${c}: ${domClassSources.get(c).slice(0,2).join(', ')}`).join(' | '),themed_class_exists:scoped,needs_manual_review:!scoped});
    }
  }
}
const structural=[];
for(const f of htmlSources) {
  const pinned = /<html[^>]*data-theme\s*=\s*["'](?:light|dark)["']/.test(f.text);
  const controller = /<script[^>]+src=["'][^"']*ui-theme\.js/.test(f.text);
  const themeStyle = /<link[^>]+href=["'][^"']*ui-theme\.css/.test(f.text);
  if(pinned || !controller || !themeStyle)structural.push({file:f.path,pinned_theme:pinned,loads_controller:controller,loads_theme_styles:themeStyle});
}
const inlineColor=[];
for(const f of jsSources){const lines=f.text.split('\n');for(let i=0;i<lines.length;i++)if(/\.style\.(?:color|backgroundColor|borderColor|fill|stroke)\s*=|\.style\.setProperty\(["']--/.test(lines[i])) inlineColor.push({source:f.path,line:i+1,source_fragment:lines[i].trim().slice(0,160)});}
const result={schema:'DS04.theme-audit.1',repository_baseline:'67d31976c605c76c7ef10876d03fdeb17369ab78',warning:'heuristic only; not a CSSOM/DOM execution or cascade/contrast proof',counts:{css_files:cssFiles.length,html_files:htmlSources.length,js_files:jsSources.length,referenced_classes:domClassSources.size,literal_style_candidates:byFile.length,unthemed_class_candidates:byFile.filter(x=>x.needs_manual_review).length},structural,css_candidates:byFile,js_inline_color_actions:inlineColor};
const outputDir=process.argv[3]?path.resolve(process.argv[3]):process.cwd();fs.mkdirSync(outputDir,{recursive:true});
fs.writeFileSync(path.join(outputDir,'theme_candidates.json'),JSON.stringify(result,null,2)+'\n');
const q=s=>'"'+String(s??'').replace(/"/g,'""').replace(/\r?\n/g,' ')+'"';
fs.writeFileSync(path.join(outputDir,'theme_candidates.csv'),['route_family,source,line,selector,property,value,dom_evidence,themed_class_exists,needs_manual_review',...byFile.map(x=>[x.route_family,x.source,x.line,x.selector,x.property,x.value,x.dom_evidence,x.themed_class_exists,x.needs_manual_review].map(q).join(','))].join('\n')+'\n');
console.log(JSON.stringify({counts:result.counts,structural,outputs:['theme_candidates.json','theme_candidates.csv']},null,2));
