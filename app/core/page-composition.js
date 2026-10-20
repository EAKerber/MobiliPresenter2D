(function registerPageComposition(global) {
  "use strict";

  // UI-P1/P2 experimental bridge. Contracts are in code, not in published Admin v5.
  const SCHEMA = "PageCompositionExperimental 0.1";
  const KEY = /^[a-z][a-z0-9-]*$/;
  const TYPE = /^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*@[1-9][0-9]*$/;
  const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);

  class CompositionError extends Error {
    constructor(code, path) {
      super(code + ": " + path);
      this.name = "CompositionError";
      this.code = code;
      this.path = path;
    }
  }

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value)
      && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  }

  function assertFields(value, allowed, path) {
    if (!isRecord(value)) throw new CompositionError("invalid-record", path);
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key)) throw new CompositionError("unsupported-field", path + "." + key);
    }
  }

  function resolveOwn(source, ref) {
    if (typeof ref !== "string") throw new CompositionError("invalid-reference", "dataRef");
    const keys = ref.split(".");
    if (!keys.length || keys.some((key) => !KEY.test(key) || FORBIDDEN.has(key))) {
      throw new CompositionError("invalid-reference", ref);
    }
    let value = source;
    for (const key of keys) {
      if (!isRecord(value)) throw new CompositionError("missing-reference", ref);
      const property = Object.getOwnPropertyDescriptor(value, key);
      if (!property) throw new CompositionError("missing-reference", ref);
      if (!Object.hasOwn(property, "value")) throw new CompositionError("invalid-reference", ref);
      value = property.value;
    }
    return value;
  }

  function snapshot(value, seen = new Set(), depth = 0) {
    if (depth > 16) throw new TypeError("payload depth exceeds limit");
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (!isRecord(value) && !Array.isArray(value)) throw new TypeError("not JSON compatible");
    if (seen.has(value)) throw new TypeError("cyclic data");
    seen.add(value);
    let copy;
    if (Array.isArray(value)) {
      if (value.length > 1000) throw new TypeError("array exceeds limit");
      copy = value.map((item) => snapshot(item, seen, depth + 1));
    } else {
      copy = {};
      for (const key of Object.keys(value)) {
        if (FORBIDDEN.has(key)) throw new TypeError("forbidden key");
        const property = Object.getOwnPropertyDescriptor(value, key);
        if (!property || !Object.hasOwn(property, "value")) throw new TypeError("accessors forbidden");
        copy[key] = snapshot(property.value, seen, depth + 1);
      }
    }
    seen.delete(value);
    return Object.freeze(copy);
  }

  function createRegistry(specifications) {
    if (!Array.isArray(specifications)) throw new TypeError("registry must be an array");
    const entries = new Map();
    specifications.forEach((specification) => {
      if (!isRecord(specification) || typeof specification.type !== "string"
        || !TYPE.test(specification.type) || !Array.isArray(specification.variants)
        || !specification.variants.length || specification.variants.some((variant) => !KEY.test(variant))
        || typeof specification.validate !== "function" || typeof specification.render !== "function") {
        throw new TypeError("invalid component definition");
      }
      if (entries.has(specification.type)) throw new TypeError("duplicate component: " + specification.type);
      entries.set(specification.type, Object.freeze({
        ...specification, variants: Object.freeze([...specification.variants])
      }));
    });
    return Object.freeze({ get(type) { return entries.get(type); } });
  }

  function compilePage(manifest, sources, registry) {
    assertFields(manifest, ["schemaVersion", "route", "sections"], "manifest");
    if (manifest.schemaVersion !== SCHEMA) throw new CompositionError("unsupported-schema", "schemaVersion");
    if (typeof manifest.route !== "string" || !/^\/[a-z0-9\-/]*$/.test(manifest.route)) {
      throw new CompositionError("invalid-route", "route");
    }
    if (!isRecord(sources)) throw new CompositionError("invalid-sources", "sources");
    if (!Array.isArray(manifest.sections) || manifest.sections.length > 50) {
      throw new CompositionError("invalid-sections", "sections");
    }
    const ids = new Set();
    const sections = manifest.sections.map((section, index) => {
      const path = "sections[" + index + "]";
      assertFields(section, ["id", "type", "variant", "dataRef"], path);
      if (typeof section.id !== "string" || !KEY.test(section.id)) {
        throw new CompositionError("invalid-id", path + ".id");
      }
      if (ids.has(section.id)) throw new CompositionError("duplicate-id", path + ".id");
      ids.add(section.id);
      const definition = registry?.get?.(section.type);
      if (!definition) throw new CompositionError("unknown-component", path + ".type");
      if (!definition.variants.includes(section.variant)) {
        throw new CompositionError("unsupported-variant", path + ".variant");
      }
      let data;
      try {
        data = snapshot(resolveOwn(sources, section.dataRef));
      } catch (error) {
        if (error instanceof CompositionError) throw error;
        throw new CompositionError("invalid-data", path + ".dataRef");
      }
      let valid = false;
      try { valid = definition.validate(data, section.variant) === true; }
      catch (_) { /* invalid input stays invalid; never infer content */ }
      if (!valid) throw new CompositionError("invalid-data", path + ".dataRef");
      return Object.freeze({ id: section.id, type: section.type, variant: section.variant, data, definition });
    });
    return Object.freeze({ route: manifest.route, sections: Object.freeze(sections) });
  }

  function mountSection(compiled, sectionId, container, documentRef) {
    const section = compiled?.sections?.find((item) => item.id === sectionId);
    if (!section) throw new CompositionError("missing-section", sectionId);
    if (!container || typeof container.replaceChildren !== "function" || !documentRef) {
      throw new TypeError("DOM target and document required");
    }
    // Render into a detached fragment first; never mount half a component.
    const fragment = section.definition.render(section.data, documentRef);
    if (!fragment || fragment.nodeType !== 11) throw new TypeError("renderer must return DocumentFragment");
    container.replaceChildren(fragment);
  }

  const api = Object.freeze({ SCHEMA, CompositionError, createRegistry, compilePage, mountSection });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaPageComposition = api;
})(typeof window === "undefined" ? globalThis : window);
