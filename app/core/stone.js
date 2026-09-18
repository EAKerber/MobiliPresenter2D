(function (global) {
  "use strict";

  const width = 1536, height = 1024;

  function caseId(state) {
    const a = state.visibilityByEntity["module-02"];
    const b = state.visibilityByEntity["module-03"];
    return a ? (b ? "default" : "module-03-hidden") : (b ? "module-02-hidden" : "modules-02-03-hidden");
  }

  function materialKey(material) {
    if (!material) return "original";
    if (material.textureAsset) return "texture:" + material.textureAsset;
    if (/^#[0-9a-f]{6}$/i.test(material.color || "")) return "color:" + material.color;
    return "original";
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
          return {
            data: context.getImageData(0, 0, textureWidth, textureHeight).data,
            width: textureWidth,
            height: textureHeight
          };
        })());
      }
      return materialCache.get(url);
    }

    async function materialSource(material) {
      if (material?.textureAsset) {
        return { type: "texture", ...(await texturePixels(material.textureAsset)) };
      }
      if (/^#[0-9a-f]{6}$/i.test(material?.color || "")) {
        return {
          type: "color",
          rgb: [1, 3, 5].map((index) => Number.parseInt(material.color.slice(index, index + 2), 16))
        };
      }
      return null;
    }

    function compose(neutral, under, objects, mask, source) {
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

        let rgb = source.rgb;
        if (source.type === "texture") {
          const x = pixel % width;
          const y = Math.floor(pixel / width);
          const textureIndex = ((y % source.height) * source.width + (x % source.width)) * 4;
          rgb = [
            source.data[textureIndex],
            source.data[textureIndex + 1],
            source.data[textureIndex + 2]
          ];
        }

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

    async function caseInputs(id) {
      if (!inputCache.has(id)) {
        inputCache.set(
          id,
          Promise.all(
            ["neutral", "under", "objects", "upperMask", "plinthMask"]
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
          const [neutral, under, objects, upperMask, plinthMask] = await caseInputs(id);
          const mask = maskName === "plinth" ? plinthMask : upperMask;
          return compose(neutral, under, objects, mask, await materialSource(material));
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
