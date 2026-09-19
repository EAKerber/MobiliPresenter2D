(function (global) {
  "use strict";

  const width = 1536, height = 1024;

  function caseId(state) {
    const a = state.visibilityByEntity["module-02"];
    const b = state.visibilityByEntity["module-03"];
    return a ? (b ? "default" : "module-03-hidden") : (b ? "module-02-hidden" : "modules-02-03-hidden");
  }

  function parseColor(color) {
    if (!/^#[0-9a-f]{6}$/i.test(color || "")) return null;
    return [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
  }

  function materialKey(material) {
    if (!material) return "original";
    const hasTexture = Boolean(material.textureAsset);
    const color = parseColor(material.color);
    if (!hasTexture && !color) return "original";
    return [
      material.materialType || "generic",
      hasTexture ? material.textureAsset : "no-texture",
      material.color || "no-color",
      material.textureStrength ?? ""
    ].join(":");
  }

  function createRenderer(stoneCanvas, plinthCanvas, data) {
    const inputCache = new Map();
    const materialCache = new Map();
    const renderCache = new Map();
    let revision = 0;

    const stoneContext = stoneCanvas.getContext("2d");
    const plinthContext = plinthCanvas.getContext("2d");

    async function fullCanvasPixels(url) {
      const image = new Image();
      image.src = url;
      await image.decode();
      const scratch = document.createElement("canvas");
      scratch.width = width;
      scratch.height = height;
      const context = scratch.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, width, height).data;
    }

    async function texturePixels(url) {
      if (!materialCache.has(url)) {
        materialCache.set(url, (async () => {
          const image = new Image();
          image.src = url;
          await image.decode();
          const textureWidth = image.naturalWidth || image.width;
          const textureHeight = image.naturalHeight || image.height;
          const scratch = document.createElement("canvas");
          scratch.width = textureWidth;
          scratch.height = textureHeight;
          const context = scratch.getContext("2d", { willReadFrequently: true });
          context.drawImage(image, 0, 0, textureWidth, textureHeight);
          const data = context.getImageData(0, 0, textureWidth, textureHeight).data;
          let totalLuminance = 0, samples = 0;
          for (let index = 0; index < data.length; index += 4) {
            if (!data[index + 3]) continue;
            totalLuminance += data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
            samples += 1;
          }
          return {
            data,
            width: textureWidth,
            height: textureHeight,
            averageLuminance: samples ? totalLuminance / samples : 128
          };
        })());
      }
      return materialCache.get(url);
    }

    async function materialSource(material) {
      const materialType = material?.materialType || "stone";
      const color = parseColor(material?.color);
      const texture = material?.textureAsset ? await texturePixels(material.textureAsset) : null;
      if (!texture && !color) return null;
      return {
        materialType,
        rgb: color,
        texture,
        textureStrength: Number.isFinite(Number(material?.textureStrength)) ? Number(material.textureStrength) : 0.35
      };
    }

    function textureRgb(source, pixel) {
      if (!source.texture) return source.rgb;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      const index = ((y % source.texture.height) * source.texture.width + (x % source.texture.width)) * 4;
      return [
        source.texture.data[index],
        source.texture.data[index + 1],
        source.texture.data[index + 2]
      ];
    }

    function composeStone(neutral, under, objects, mask, source) {
      const result = new Uint8ClampedArray(neutral.length);
      if (!source) return new ImageData(result, width, height);

      for (let pixel = 0, index = 0; pixel < width * height; pixel += 1, index += 4) {
        const coverage = mask[index] / 255;
        if (!coverage) continue;
        const background = 1 - objects[index + 3] / 255;
        const luminance = (
          under[index] * 0.2126 +
          under[index + 1] * 0.7152 +
          under[index + 2] * 0.0722
        ) / 180;
        const shade = Math.min(1.35, Math.max(0.35, luminance));
        const rgb = textureRgb(source, pixel) || source.rgb;
        if (!rgb) continue;
        for (let channel = 0; channel < 3; channel += 1) {
          const target = Math.min(255, rgb[channel] * shade);
          result[index + channel] = Math.round(
            neutral[index + channel] +
            (target - under[index + channel]) * background * coverage
          );
        }
        result[index + 3] = Math.round(255 * coverage);
      }
      return new ImageData(result, width, height);
    }

    function composeMdf(mask, source, shade) {
      const result = new Uint8ClampedArray(width * height * 4);
      if (!source?.rgb) return new ImageData(result, width, height);

      for (let pixel = 0, index = 0; pixel < width * height; pixel += 1, index += 4) {
        const coverage = mask[index] / 255;
        if (!coverage) continue;
        let detail = 1;
        if (source.texture) {
          const texture = textureRgb(source, pixel);
          const luminance = texture[0] * 0.2126 + texture[1] * 0.7152 + texture[2] * 0.0722;
          const delta = (luminance - source.texture.averageLuminance) / 255;
          detail = Math.min(1.22, Math.max(0.78, 1 + delta * source.textureStrength));
        }
        const sceneShade = shade ? Math.min(1.10, Math.max(0.86, shade[index] / 128)) : 1;
        for (let channel = 0; channel < 3; channel += 1) {
          result[index + channel] = Math.round(Math.min(255, source.rgb[channel] * detail * sceneShade));
        }
        result[index + 3] = Math.round(255 * coverage);
      }
      return new ImageData(result, width, height);
    }

    async function caseInputs(id) {
      if (!inputCache.has(id)) {
        inputCache.set(
          id,
          Promise.all(
            ["neutral", "under", "objects", "upperMask", "plinthMask", "plinthShade"]
              .map((key) => fullCanvasPixels(data[id][key]))
          )
        );
      }
      return inputCache.get(id);
    }

    async function rendered(id, maskName, material) {
      const key = id + "|" + maskName + "|" + materialKey(material);
      if (!renderCache.has(key)) {
        renderCache.set(key, (async () => {
          const [neutral, under, objects, upperMask, plinthMask, plinthShade] = await caseInputs(id);
          const mask = maskName === "plinth" ? plinthMask : upperMask;
          const source = await materialSource(material);
          return source?.materialType === "mdf"
            ? composeMdf(mask, source, plinthShade)
            : composeStone(neutral, under, objects, mask, source);
        })());
      }
      return renderCache.get(key);
    }

    return async function render(state, materials = {}) {
      const ticket = ++revision;
      stoneContext.clearRect(0, 0, width, height);
      plinthContext.clearRect(0, 0, width, height);

      const id = caseId(state);
      try {
        const jobs = [];
        if (materialKey(materials.upper) !== "original") {
          jobs.push(rendered(id, "upper", materials.upper).then((image) => [stoneContext, image]));
        }
        if (materialKey(materials.plinth) !== "original") {
          jobs.push(rendered(id, "plinth", materials.plinth).then((image) => [plinthContext, image]));
        }
        const images = await Promise.all(jobs);
        if (ticket !== revision) return;
        images.forEach(([context, image]) => context.putImageData(image, 0, 0));
      } catch (error) {
        inputCache.delete(id);
        if (ticket === revision) console.error(error);
      }
    };
  }

  global.CasaStone = Object.freeze({ caseId, createRenderer, materialKey });
})(window);
