(() => {
  const encoder = new TextEncoder();
  const bytes = value => ArrayBuffer.isView(value) && value.BYTES_PER_ELEMENT === 1 && value.byteLength > 0 && value.byteLength <= 65535 ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : null;
  const validLook = value => Boolean(bytes(value) && value.length >= 2 && [25, 26, 27].includes(value[0] >>> 2));
  const name = value => (typeof value === 'string' ? value : '').normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, '').trim().slice(0, 160) || 'Pony';
  const filename = value => 'copy-town-' + (name(value).replace(/[<>:"/\\|?*]/g, '_').replace(/[. ]+$/g, '').slice(0, 72) || 'Pony') + '.ptc';
  const base64 = value => btoa(Array.from(value, byte => String.fromCharCode(byte)).join(''));
  function toy(value) {
    if (Number.isInteger(value) && value >= 0 && value <= 65535) return value;
    const data = bytes(value);
    return data ? new Uint8Array(data) : undefined;
  }
  function readToy(pony) {
    const extra = Array.isArray(pony?.options) ? pony.options.find(value => value?.type === 0) : pony?.options;
    return extra?.type === 0 ? toy(extra.toy) : undefined;
  }
  function plain(data, encrypted, key) {
    const raw = bytes(data);
    if (!raw) return null;
    if (!encrypted && validLook(raw)) return new Uint8Array(raw);
    if (!Number.isInteger(key) || key < 1 || key > 0xffffffff) return null;
    const result = raw.map((byte, index) => byte ^ (key >>> ((index % 4) * 8) & 255));
    return validLook(result) ? result : null;
  }
  function spec(code) {
    if (typeof code !== 'string' || code.length > 12000000) return null;
    const getter = /function\s+[\w$]+\s*\(\s*([\w$]+)\s*\)\s*\{\s*return\s+\1\.([\w$]+)\s*&&\s*\(\s*([\w$]+)\s*\(\s*\1\.([\w$]+)\s*\)\s*,\s*\1\.\2\s*=\s*!1\s*\)\s*,\s*\1\.\4\s*\}/.exec(code);
    if (!getter) return null;
    const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const decrypt = new RegExp('function\\s+' + escape(getter[3]) + '\\s*\\(\\s*[\\w$]+\\s*\\)\\s*\\{\\s*return\\s+[\\w$]+\\s*\\(\\s*[\\w$]+\\s*,\\s*([\\w$]+)\\s*\\)\\s*\\}').exec(code);
    if (!decrypt) return null;
    const token = decrypt[1];
    const literal = /^(0x[0-9a-fA-F]+|\d+)$/.test(token) ? token : new RegExp('[,;\\s{]' + escape(token) + '\\s*=\\s*(0x[0-9a-fA-F]+|\\d+)').exec(code)?.[1];
    const key = literal ? Number(literal) : 0;
    return Number.isInteger(key) && key > 0 && key <= 0xffffffff ? { field: getter[4], encrypted: getter[2], key } : null;
  }
  function encode(snapshot) {
    const look = bytes(snapshot?.look);
    if (!validLook(look)) throw new Error('skin-data');
    const extra = toy(snapshot.toy), result = [];
    const u8 = value => result.push(value & 255);
    const u16 = value => { u8(value); u8(value >>> 8); };
    const u32 = value => { u16(value); u16(value >>> 16); };
    const raw = value => { for (const byte of value) u8(byte); };
    const length = value => { value++; while (value >= 128) { u8(value & 127 | 128); value >>>= 7; } u8(value); };
    const data = value => { length(value.length); raw(value); };
    u32(2786829884); u8(4); u8(look[0] >>> 2); length(1);
    u8(typeof extra === 'number' ? 16 : 0); data(encoder.encode(name(snapshot.name))); data(look);
    if (typeof extra === 'number') u16(extra);
    else if (extra) {
      const trailer = encoder.encode(JSON.stringify({ schema: 'copy-town-toys', version: 1, characters: [{ index: 0, toy: { kind: 'custom', codec: 'pony-town-plush', lookVersion: extra[0] >>> 2, lookBase64: base64(extra) } }] }));
      raw(encoder.encode('CTTOY001')); u32(trailer.length); raw(trailer);
    }
    return base64(Uint8Array.from(result));
  }
  function validFile(value) {
    if (typeof value !== 'string' || value.length > 220000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4) return false;
    try { const raw = atob(value); return raw.length >= 12 && [60, 166, 27, 166, 4].every((byte, index) => raw.charCodeAt(index) === byte); } catch { return false; }
  }
  const api = Object.freeze({ bytes, validLook, name, filename, base64, toy, readToy, plain, spec, encode, validFile });
  globalThis.CopyTownSkinCodec = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
