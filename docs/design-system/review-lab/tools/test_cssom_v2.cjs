#!/usr/bin/env node
/** Test harness for known DS04 false negatives; intentionally synthetic CSS. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const assert=require('node:assert/strict');const {spawnSync}=require('node:child_process');
const kit=__dirname,fixture=path.join(kit,'_fixture'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ds04v2-test-'));
try{
 const p=spawnSync(process.execPath,[path.join(kit,'theme_cssom_v2.cjs'),fixture,tmp],{encoding:'utf8',timeout:45000,env:{...process.env,DS04_ROUTES:'/__ds04__/config,/__ds04__/admin'}});
 if(p.status!==0)throw Error('Runner exit '+p.status+'\n'+p.stderr.slice(-1400)+'\n'+p.stdout.slice(-700));
 const r=JSON.parse(fs.readFileSync(path.join(tmp,'cssom_results.json'),'utf8'));
 const find=(route,mode)=>r.routes.find(x=>x.route===route&&x.mode===mode&&x.width===1366);
 const cfgLight=find('/__ds04__/config','light'), cfgDark=find('/__ds04__/config','dark');
 assert(cfgLight&&cfgDark,'fixture states exist');
 assert(cfgLight.loaded&&cfgDark.loaded,'CDP loaded fixture document');
 const findProblem=(res,id)=>res.problems.find(p=>p.htmlId===id);
 const counter=findProblem(cfgLight,'visibleCount');
 assert(counter&&counter.fail&&!counter.flagged&&counter.contrast<=1.05,'white counter on white surface detected');
 const price=cfgLight.problems.find(p=>p.text==='R$ 10.000,00');
 assert(price&&price.fail&&price.contrast<1.3,'dark price inherited on dark dock detected');
 assert(!cfgDark.problems.some(p=>p.text==='R$ 10.000,00'&&p.fail),'dark dock text readable in dark mode');
 const admin=find('/__ds04__/admin','light');
 assert(admin.problems.some(p=>p.text==='Item disponível'&&p.fail),'admin light fixed dark text detected');
 assert(admin.problems.some(p=>p.text==='Alterações salvas'&&p.fail),'admin light success color detected');
 const adminDark=find('/__ds04__/admin','dark');
 assert(!adminDark.problems.some(p=>p.text==='Item disponível'&&p.fail),'admin dark original palette readable');
 assert(r.routes.length===8,'two widths x two modes x two fixtures');
 assert.equal(r.countContract.totalPlaceholder,8);
 assert.equal(r.countContract.configuredDefaultModules,7);
 assert.equal(r.countContract.configuredCountIncludesLightingService,true);
 assert.equal(r.countContract.needsContractReview,true);
 console.log(JSON.stringify({result:'PASS',runner:'local Chromium CSSOM',fixtures:r.routes.length,counterRatio:counter.contrast,priceRatio:price.contrast,adminFailLight:admin.failures,adminFailDark:adminDark.failures},null,2));
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
