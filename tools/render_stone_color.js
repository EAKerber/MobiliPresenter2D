// Runs the actual browser color kernel on raw RGBA fixtures, without dependencies.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const folder = process.argv[2];
const context = {window: {}, Uint8ClampedArray};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../app/core/stone.js'), 'utf8'), context);
const inputs = ['neutral','under','objects','mask'].map(k => fs.readFileSync(path.join(folder, k + '.rgba')));
for (const [name, color] of [['graphite','#34383d'], ['light','#d8d8d2'], ['custom','#825faf']]) {
  fs.writeFileSync(path.join(folder, name + '.rgba'), context.window.CasaStone.recolor(...inputs, color));
}
const reset = context.window.CasaStone.recolor(...inputs, null);
if (reset.some(v => v !== 0)) throw Error('reset must remove the color layer entirely');
for (const [a,b,id] of [[true,true,'default'],[false,true,'module-02-hidden'],[true,false,'module-03-hidden'],[false,false,'modules-02-03-hidden']]) {
  if (context.window.CasaStone.caseId({visibilityByEntity:{'module-02':a,'module-03':b}}) !== id) throw Error('wrong visibility case');
}
