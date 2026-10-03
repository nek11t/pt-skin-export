(() => {
  const fields = new WeakMap();
  const region = value => value && typeof value === 'object' && Number.isSafeInteger(value.x) && Number.isSafeInteger(value.y) && ArrayBuffer.isView(value.tiles) && value.tiles.BYTES_PER_ELEMENT === 1 && value.tiles.length === 64;
  const collection = value => Array.isArray(value) && value.length > 0 && value.length <= 16384 && value.slice(0, 4).every(region);
  function regions(map) {
    if (!map || typeof map !== 'object') return [];
    const cached = fields.get(map);
    if (cached) {
      const value = Object.getOwnPropertyDescriptor(map, cached)?.value;
      if (collection(value)) return value;
      fields.delete(map);
    }
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(map)).slice(0, 200)) {
      if (collection(descriptor.value)) { fields.set(map, key); return descriptor.value; }
    }
    return [];
  }
  const api = Object.freeze({ regions });
  globalThis.CopyTownGameMap = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
