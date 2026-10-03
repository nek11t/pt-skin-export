(() => {
  if (globalThis.__copyTownSkinBridge) return;
  const codec = CopyTownSkinCodec;
  let rawLooks = new WeakMap(), looks = new WeakMap(), sources = new Map(), game, format, formatURL = '', loadingFormat = false, nextFormatAttempt = 0, discovery, nextDiscovery = 0;
  const components = new WeakMap();
  const readRoots = () => {
    const result = [];
    for (const test of window.getAllAngularTestabilities?.() || []) {
      let injector = test?._destroyRef;
      for (let hop = 0; injector && hop < 10; hop++, injector = injector.parent) {
        if (injector.records instanceof Map) for (const row of injector.records.values()) if (row?.value && typeof row.value === 'object') result.push(row.value);
      }
    }
    return result;
  };
  async function readFormat() {
    if (loadingFormat || Date.now() < nextFormatAttempt) return;
    const url = [...document.scripts].map(script => script.src).find(value => /^https:\/\/pony\.town\/assets\/scripts\/bootstrap-[\w-]+\.js$/.test(value));
    if (!url || url === formatURL) return;
    loadingFormat = true;
    nextFormatAttempt = Date.now() + 15000;
    try {
      const response = await fetch(url, { credentials: 'omit', cache: 'force-cache', signal: AbortSignal.timeout(10000) });
      if (!response.ok || Number(response.headers.get('content-length')) > 12000000) return;
      const value = codec.spec(await response.text());
      if (value) { format = value; formatURL = url; }
    } catch {} finally { loadingFormat = false; }
  }
  function capture(pony, look) {
    if (!pony || typeof pony !== 'object' || !look || typeof look !== 'object') return;
    if (!format) {
      const copy = {};
      for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(look)).slice(0, 60)) {
        if (codec.bytes(descriptor.value)) copy[key] = new Uint8Array(descriptor.value);
        else if (typeof descriptor.value === 'boolean') copy[key] = descriptor.value;
      }
      rawLooks.set(pony, copy); return;
    }
    const candidates = [];
    if (format) candidates.push([look[format.field], look[format.encrypted] === true]);

    for (const [data, encrypted] of candidates) {
      const value = codec.plain(data, encrypted, format?.key);
      if (value) { looks.set(pony, value); return; }
    }
  }
  function attach(source) {
    if (source.game !== game) return;
    if (sources.has(source)) { discovery?.found.add(source); return; }
    const proto = Object.getPrototypeOf(source);
    if (!proto) return;
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === 'constructor') continue;
      const original = Object.getOwnPropertyDescriptor(proto, key)?.value;
      if (typeof original !== 'function') continue;
      const match = Function.prototype.toString.call(original).match(/this\.([\w$]+)\.push\(\{\s*pony\s*:\s*[\w$]+,\s*look\s*:\s*[\w$]+\s*\}\)/);
      if (!match || !Array.isArray(source[match[1]])) continue;
      const own = Object.getOwnPropertyDescriptor(source, key), invoke = own?.value || original;
      if (typeof invoke !== 'function') continue;
      const wrapped = function(pony, look) { try { capture(pony, look); } catch {} return Reflect.apply(invoke, this, arguments); };
      Object.defineProperty(source, key, { configurable: true, writable: true, value: wrapped });
      discovery?.found.add(source);
      sources.set(source, { field: match[1], restore() { if (source[key] === wrapped) { if (own) Object.defineProperty(source, key, own); else delete source[key]; } } });
      return;
    }
  }
  function discover() {
    const roots = readRoots();
    const current = roots.find(value => value?.map && value?.playerCamera?.camera);
    if (current !== game) {
      for (const value of sources.values()) value.restore();
      sources.clear(); rawLooks = new WeakMap(); looks = new WeakMap(); game = current; discovery = null;
    }
    if (!game) return;
    discovery ||= { queue: [[game, 0]], index: 0, seen: new WeakSet(), found: new Set() };
    const began = performance.now();
    for (let count = 0; discovery.index < discovery.queue.length && discovery.index < 12000 && count < 300 && performance.now() - began < 3; count++) {
      const [value, depth] = discovery.queue[discovery.index++];
      if (!value || typeof value !== 'object' || discovery.seen.has(value) || value instanceof Node || ArrayBuffer.isView(value) || value instanceof ArrayBuffer || value instanceof Map || value instanceof Set) continue;
      discovery.seen.add(value);
      if (!Array.isArray(value)) { try { attach(value); } catch {} }
      if (depth >= 5 || sources.has(value)) continue;
      for (const item of Object.values(Object.getOwnPropertyDescriptors(value)).slice(0, 160)) {
        const child = item.value;
        if (child && typeof child === 'object' && discovery.queue.length < 12000) discovery.queue.push([child, depth + 1]);
      }
    }
    if (discovery.found.size || discovery.index >= discovery.queue.length || discovery.index >= 12000) {
      for (const [source, info] of sources) if (!discovery.found.has(source)) { info.restore(); sources.delete(source); }
      discovery = null; nextDiscovery = Date.now() + (sources.size ? 10000 : 1500);
    }
  }
  function scan() {
    for (const [source, info] of sources) {
      const refs = source[info.field];
      if (Array.isArray(refs)) for (const ref of refs.slice(0, 2000)) { try { capture(ref?.pony, ref?.look); } catch {} }
    }
  }
  function component(box) {
    const cached = components.get(box);
    if (cached) return cached;
    const direct = window.ng?.getComponent?.(box);
    if (direct?.pony) { components.set(box, direct); return direct; }
    const app = readRoots().find(value => Array.isArray(value._views) && typeof value.tick === 'function');
    const queue = app?._views.map(value => value._lView || value.lView) || [], seen = new Set();
    for (let index = 0; index < queue.length && index < 5000; index++) {
      const view = queue[index];
      if (!Array.isArray(view) || seen.has(view)) continue;
      seen.add(view);
      if (view[0] === box && view[8]?.pony) { components.set(box, view[8]); return view[8]; }
      for (const child of view) if (Array.isArray(child) && queue.length < 5000) queue.push(child);
    }
    return null;
  }
  function selection(boxId, full) {
    const box = document.querySelector(`[data-copytown-skin-box="${boxId}"]`);
    if (!box || !box.getClientRects().length || game?.R?.isConnected !== true) return { ready: false };
    const selected = component(box)?.pony;
    const id = selected?.j ?? selected?.U ?? selected?.id;
    if (!selected || !(typeof id === 'number' && Number.isSafeInteger(id) || typeof id === 'string' && id.length < 80)) return { ready: false };
    const entityID = value => value?.j ?? value?.U ?? value?.id;
    let pony = entityID(game.C) === id ? game.C : null;
    if (!pony) {
      for (const region of CopyTownGameMap.regions(game.map)) {
        pony = Array.isArray(region.entities) && region.entities.find(value => entityID(value) === id);
        if (pony) break;
      }
    }
    if (!pony) return { ready: false };
    scan();
    if (format && rawLooks.has(pony)) { capture(pony, rawLooks.get(pony)); rawLooks.delete(pony); }
    const look = looks.get(pony);
    const selectedName = codec.name(box.querySelector('.pony-box-name-text')?.textContent || pony.B || pony.name);
    return { ready: Boolean(look), id: String(id), name: selectedName, ...(full && look ? { look: new Uint8Array(look), toy: codec.readToy(pony) } : {}) };
  }
  function receive(event) {
    const data = event.data;
    if (event.source !== window || event.origin !== location.origin || data?.type !== 'copytown:skin-read' || !['status', 'snapshot'].includes(data.action) || typeof data.requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(data.requestId) || typeof data.boxId !== 'string' || !/^[a-f0-9-]{36}$/.test(data.boxId)) return;
    let value = { ready: false };
    try { value = selection(data.boxId, data.action === 'snapshot'); } catch {}
    window.postMessage({ type: 'copytown:skin-read-result', requestId: data.requestId, value }, location.origin);
  }
  let timer, stopped = false;
  function tick() {
    if (stopped) return;
    try {
      if (!format) readFormat();
      if (discovery || Date.now() >= nextDiscovery) discover();
      if (!document.hidden) scan();
    } catch {}
    timer = setTimeout(tick, discovery || !sources.size ? 80 : 350);
  }
  addEventListener('message', receive);
  globalThis.__copyTownSkinBridge = { stop() { stopped = true; clearTimeout(timer); removeEventListener('message', receive); for (const source of sources.values()) source.restore(); sources.clear(); looks = new WeakMap(); delete globalThis.__copyTownSkinBridge; } };
  tick();
})();
