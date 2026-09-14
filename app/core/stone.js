(function (global) {
  "use strict";
  const width = 1536, height = 1024;
  function caseId(state) {
    const a = state.visibilityByEntity['module-02'], b = state.visibilityByEntity['module-03'];
    return a ? (b ? 'default' : 'module-03-hidden') : (b ? 'module-02-hidden' : 'modules-02-03-hidden');
  }
  function colorRgb(color) {
    if (!/^#[0-9a-f]{6}$/i.test(color || '')) return null;
    return [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
  }
  function shadedTarget(pixel, rgb) {
    const luminance = (pixel[0] * .2126 + pixel[1] * .7152 + pixel[2] * .0722) / 180;
    const shade = Math.min(1.35, Math.max(.35, luminance));
    return rgb.map(channel => Math.min(255, channel * shade));
  }
  // Difference composition retains the approved neutral pixels exactly, including
  // semitransparent object edges. Only the background contribution changes.
  function recolor(neutral, under, objects, mask, color) {
    const result = new Uint8ClampedArray(neutral.length);
    const rgb = colorRgb(color);
    if (!rgb) return result;
    for (let i = 0; i < result.length; i += 4) {
      const coverage = mask[i] / 255;
      if (!coverage) continue;
      const background = 1 - objects[i + 3] / 255;
      const target = shadedTarget([under[i], under[i + 1], under[i + 2]], rgb);
      for (let c = 0; c < 3; c++) {
        result[i + c] = Math.round(neutral[i + c] + (target[c] - under[i + c]) * background * coverage);
      }
      result[i + 3] = 255;
    }
    return result;
  }
  function visibleBridgeAssets(state, bridgeEntities) {
    return bridgeEntities
      .filter(entity => {
        const hosts = entity.hostIds || (entity.hostId ? [entity.hostId] : []);
        return hosts.length > 0 && hosts.every(id => Boolean(state.visibilityByEntity[id]));
      })
      .map(entity => entity.asset);
  }
  // Older generated bundles omitted a joint bridge whenever its neighbouring module
  // was hidden. Paint only bridge pixels with zero existing material coverage. Once
  // bundles are regenerated with the corrected materializer this becomes a no-op.
  function patchUncoveredBridge(result, mask, bridge, color) {
    const rgb = colorRgb(color);
    if (!rgb) return result;
    for (let i = 0; i < result.length; i += 4) {
      if (mask[i] || !bridge[i + 3]) continue;
      const target = shadedTarget([bridge[i], bridge[i + 1], bridge[i + 2]], rgb);
      result[i] = Math.round(target[0]);
      result[i + 1] = Math.round(target[1]);
      result[i + 2] = Math.round(target[2]);
      result[i + 3] = bridge[i + 3];
    }
    return result;
  }
  function createRenderer(canvas, data, bridgeEntities = null) {
    const resolvedBridgeEntities = bridgeEntities || (global.CASA_EM_MODULOS_SCENE?.entities || []).filter(entity => entity.kind === 'stone-joint');
    const cache = new Map();
    const bridgeCache = new Map();
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
    function bridgePixels(url) {
      if (!bridgeCache.has(url)) bridgeCache.set(url, pixels(url));
      return bridgeCache.get(url);
    }
    return async function render(state) {
      const ticket = ++revision;
      context.clearRect(0, 0, width, height);
      if (!state.stoneColor) return;
      const id = caseId(state), color = state.stoneColor;
      if (!cache.has(id)) cache.set(id, Promise.all(['neutral','under','objects','mask'].map(k => pixels(data[id][k]))));
      const urls = visibleBridgeAssets(state, resolvedBridgeEntities);
      const bridgesPromise = Promise.all(urls.map(bridgePixels)).catch(error => {
        console.error(error);
        return [];
      });
      try {
        const inputs = await cache.get(id);
        if (ticket !== revision) return;
        const result = recolor(...inputs, color);
        context.putImageData(new ImageData(result, width, height), 0, 0);
        const bridges = await bridgesPromise;
        if (ticket !== revision || !bridges.length) return;
        bridges.forEach(bridge => patchUncoveredBridge(result, inputs[3], bridge, color));
        context.putImageData(new ImageData(result, width, height), 0, 0);
      } catch (error) {
        cache.delete(id);
        if (ticket === revision) {
          document.getElementById('stoneStatus').textContent = 'Não foi possível carregar a cor da pedra. Tente novamente.';
        }
        console.error(error);
      }
    };
  }
  global.CasaStone = Object.freeze({caseId, recolor, visibleBridgeAssets, patchUncoveredBridge, createRenderer});
})(window);
