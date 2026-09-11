(function (global) {
  "use strict";
  const width = 1536, height = 1024;
  function caseId(state) {
    const a = state.visibilityByEntity['module-02'], b = state.visibilityByEntity['module-03'];
    return a ? (b ? 'default' : 'module-03-hidden') : (b ? 'module-02-hidden' : 'modules-02-03-hidden');
  }
  // Difference composition retains the approved neutral pixels exactly, including
  // semitransparent object edges. Only the background contribution changes.
  function recolor(neutral, under, objects, mask, color) {
    const result = new Uint8ClampedArray(neutral.length);
    if (!/^#[0-9a-f]{6}$/i.test(color || '')) return result;
    const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
    for (let i = 0; i < result.length; i += 4) {
      const coverage = mask[i] / 255;
      if (!coverage) continue;
      const background = 1 - objects[i + 3] / 255;
      const luminance = (under[i] * .2126 + under[i + 1] * .7152 + under[i + 2] * .0722) / 180;
      const shade = Math.min(1.35, Math.max(.35, luminance));
      for (let c = 0; c < 3; c++) {
        const target = Math.min(255, rgb[c] * shade);
        result[i + c] = Math.round(neutral[i + c] + (target - under[i + c]) * background * coverage);
      }
      result[i + 3] = 255;
    }
    return result;
  }
  function createRenderer(canvas, data) {
    const cache = new Map();
    let revision = 0;
    const context = canvas.getContext('2d');
    async function pixels(url) {
      const image = new Image(); image.src = url;
      await image.decode();
      const scratch = document.createElement('canvas'); scratch.width = width; scratch.height = height;
      const ctx = scratch.getContext('2d', {willReadFrequently: true});
      ctx.drawImage(image, 0, 0);
      return ctx.getImageData(0, 0, width, height).data;
    }
    return async function render(state) {
      const ticket = ++revision;
      context.clearRect(0, 0, width, height);
      if (!state.stoneColor) return;
      const id = caseId(state), color = state.stoneColor;
      if (!cache.has(id)) cache.set(id, Promise.all(['neutral','under','objects','mask'].map(k => pixels(data[id][k]))));
      try {
        const inputs = await cache.get(id);
        if (ticket !== revision) return;
        context.putImageData(new ImageData(recolor(...inputs, color), width, height), 0, 0);
      } catch (error) {
        cache.delete(id);
        if (ticket === revision) {
          document.getElementById('stoneStatus').textContent = 'Não foi possível carregar a cor da pedra. Tente novamente.';
        }
        console.error(error);
      }
    };
  }
  global.CasaStone = Object.freeze({caseId, recolor, createRenderer});
})(window);
