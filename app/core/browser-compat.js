(function installBrowserCompatibility(global) {
  "use strict";

  if (typeof Object.hasOwn !== "function") {
    Object.hasOwn = function hasOwn(object, property) {
      if (object == null) throw new TypeError("Object.hasOwn called on null or undefined");
      return Object.prototype.hasOwnProperty.call(Object(object), property);
    };
  }

  if (typeof Object.fromEntries !== "function") {
    Object.fromEntries = function fromEntries(entries) {
      const result = {};
      Array.from(entries).forEach((entry) => {
        Object.defineProperty(result, entry[0], {
          configurable: true,
          enumerable: true,
          value: entry[1],
          writable: true
        });
      });
      return result;
    };
  }

  if (typeof global.structuredClone !== "function") {
    // The application only clones JSON-shaped catalog, scene, and configuration data.
    global.structuredClone = function cloneJsonData(value) {
      const serialized = JSON.stringify(value);
      return serialized === undefined ? undefined : JSON.parse(serialized);
    };
  }

  if (global.Element && !global.Element.prototype.replaceChildren) {
    global.Element.prototype.replaceChildren = function replaceChildren() {
      while (this.firstChild) this.removeChild(this.firstChild);
      Array.prototype.forEach.call(arguments, (node) => {
        const child = node && typeof node === "object" && "nodeType" in node
          ? node
          : global.document.createTextNode(String(node));
        this.appendChild(child);
      });
    };
  }
})(window);
