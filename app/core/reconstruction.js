(function registerReconstructionCore(global) {
  "use strict";

  function parseColor(color) {
    if (!/^#[0-9a-f]{6}$/i.test(color || "")) return null;
    return [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
  }

  function clamp(value, low, high) {
    return Math.min(high, Math.max(low, value));
  }

  function luminance(rgb) {
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  }

  function createRenderer(canvas, data) {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const imageCache = new Map();
    const slotCache = new Map();
    const textureCache = new Map();
    let revision = 0;

    async function imagePixels(url) {
      if (!imageCache.has(url)) {
        imageCache.set(url, (async () => {
          const image = new Image();
          image.src = url;
          await image.decode();
          const scratch = document.createElement("canvas");
          scratch.width = canvas.width;
          scratch.height = canvas.height;
          const ctx = scratch.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          return ctx.getImageData(0, 0, canvas.width, canvas.height);
        })());
      }
      return imageCache.get(url);
    }

    async function slotSource(slot) {
      const key = slot.neutralAsset + "|" + slot.maskAsset;
      if (!slotCache.has(key)) {
        slotCache.set(key, (async () => {
          const [neutral, mask] = await Promise.all([
            imagePixels(slot.neutralAsset),
            imagePixels(slot.maskAsset)
          ]);
          let weightedLuma = 0;
          let alphaMass = 0;
          for (let i = 0; i < neutral.data.length; i += 4) {
            const alpha = mask.data[i] / 255;
            if (!alpha) continue;
            weightedLuma += luminance([neutral.data[i], neutral.data[i + 1], neutral.data[i + 2]]) * alpha;
            alphaMass += alpha;
          }
          return {
            neutral,
            mask,
            averageLuminance: alphaMass ? weightedLuma / alphaMass : 128
          };
        })());
      }
      return slotCache.get(key);
    }

    async function texturePixels(url) {
      if (!url) return null;
      if (!textureCache.has(url)) {
        textureCache.set(url, (async () => {
          const image = new Image();
          image.src = url;
          await image.decode();
          const width = image.naturalWidth || image.width;
          const height = image.naturalHeight || image.height;
          const scratch = document.createElement("canvas");
          scratch.width = width;
          scratch.height = height;
          const ctx = scratch.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(image, 0, 0, width, height);
          const pixels = ctx.getImageData(0, 0, width, height).data;
          let total = 0;
          let samples = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            if (!pixels[i + 3]) continue;
            total += luminance([pixels[i], pixels[i + 1], pixels[i + 2]]);
            samples += 1;
          }
          return { pixels, width, height, averageLuminance: samples ? total / samples : 128 };
        })());
      }
      return textureCache.get(url);
    }

    function textureRgb(texture, pixelIndex) {
      const x = pixelIndex % canvas.width;
      const y = Math.floor(pixelIndex / canvas.width);
      const i = ((y % texture.height) * texture.width + (x % texture.width)) * 4;
      return [texture.pixels[i], texture.pixels[i + 1], texture.pixels[i + 2]];
    }

    async function renderSlot(slot, material) {
      const source = await slotSource(slot);
      const texture = await texturePixels(material?.textureAsset);
      const color = parseColor(material?.color);
      const output = new Uint8ClampedArray(source.neutral.data.length);
      const textureStrength = Number.isFinite(Number(material?.textureStrength))
        ? Number(material.textureStrength)
        : 0.25;
      const usesOriginal = !color && !texture;

      for (let pixel = 0, i = 0; i < source.neutral.data.length; pixel += 1, i += 4) {
        const alpha = source.mask.data[i];
        if (!alpha) continue;

        if (usesOriginal) {
          output[i] = source.neutral.data[i];
          output[i + 1] = source.neutral.data[i + 1];
          output[i + 2] = source.neutral.data[i + 2];
          output[i + 3] = alpha;
          continue;
        }

        const neutralLuma = luminance([
          source.neutral.data[i],
          source.neutral.data[i + 1],
          source.neutral.data[i + 2]
        ]);
        const sceneShade = clamp(neutralLuma / Math.max(1, source.averageLuminance), 0.76, 1.20);

        let base = color || [128, 128, 128];
        if (texture) {
          const sample = textureRgb(texture, pixel);
          if (color) {
            const delta = (luminance(sample) - texture.averageLuminance) / 255;
            const detail = clamp(1 + delta * textureStrength, 0.78, 1.22);
            base = color.map((channel) => channel * detail);
          } else {
            base = sample;
          }
        }

        output[i] = Math.round(clamp(base[0] * sceneShade, 0, 255));
        output[i + 1] = Math.round(clamp(base[1] * sceneShade, 0, 255));
        output[i + 2] = Math.round(clamp(base[2] * sceneShade, 0, 255));
        output[i + 3] = alpha;
      }
      return new ImageData(output, canvas.width, canvas.height);
    }

    function drawImageData(imageData) {
      const scratch = document.createElement("canvas");
      scratch.width = canvas.width;
      scratch.height = canvas.height;
      scratch.getContext("2d").putImageData(imageData, 0, 0);
      context.drawImage(scratch, 0, 0);
    }

    return async function render(input) {
      const ticket = ++revision;
      context.clearRect(0, 0, canvas.width, canvas.height);
      canvas.dataset.active = String(Boolean(input?.visible));
      delete canvas.dataset.renderError;
      if (!input?.visible) return;

      try {
        const [carcass, plinth] = await Promise.all([
          renderSlot(data.slots.carcass, input.carcassMaterial),
          renderSlot(data.slots.plinth, input.plinthMaterial)
        ]);
        if (ticket !== revision) return;
        context.clearRect(0, 0, canvas.width, canvas.height);
        drawImageData(carcass);
        drawImageData(plinth);
        canvas.dataset.renderRevision = String(ticket);
      } catch (error) {
        if (ticket === revision) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          canvas.dataset.renderError = String(error?.message || error);
          console.error(error);
        }
      }
    };
  }

  global.CasaReconstruction = Object.freeze({ createRenderer, parseColor });
})(window);
