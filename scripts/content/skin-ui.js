(() => {
  const codec = CopyTownSkinCodec;
  const requests = new Map();
  let selecting = false;

  function send(action, box) {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();
      const timeout = setTimeout(() => {
        requests.delete(requestId);
        reject(new Error('skin-data'));
      }, 3000);
      requests.set(requestId, value => {
        clearTimeout(timeout);
        requests.delete(requestId);
        resolve(value);
      });
      window.postMessage({
        type: 'copytown:skin-read',
        requestId,
        boxId: box.dataset.copytownSkinBox,
        action
      }, location.origin);
    });
  }

  addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin) return;
    if (event.data?.type !== 'copytown:skin-read-result') return;
    if (typeof event.data.requestId !== 'string') return;
    requests.get(event.data.requestId)?.(event.data.value);
  });

  function download(anchorUrl, filename) {
    const anchor = document.createElement('a');
    anchor.href = anchorUrl;
    anchor.download = filename;
    anchor.hidden = true;
    document.documentElement.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(anchorUrl), 10000);
  }

  async function grabSkin(box, button) {
    if (selecting || !box.isConnected) return;
    selecting = true;
    button.disabled = true;
    try {
      const value = await send('snapshot', box);
      if (!value?.ready || !codec.validLook(value.look)) throw new Error('skin-data');
      const content = codec.encode(value);
      const filename = codec.filename(value.name);
      const url = URL.createObjectURL(new Blob([content], { type: 'application/octet-stream' }));
      download(url, filename);
      button.title = 'Skin downloaded';
      button.setAttribute('aria-label', 'Skin downloaded');
      setTimeout(() => {
        button.title = 'Download skin (.ptc)';
        button.setAttribute('aria-label', 'Download skin (.ptc)');
      }, 1500);
    } catch {
      button.title = 'Skin not ready yet';
      button.setAttribute('aria-label', 'Skin not ready yet');
      setTimeout(() => {
        button.title = 'Download skin (.ptc)';
        button.setAttribute('aria-label', 'Download skin (.ptc)');
      }, 1500);
    } finally {
      selecting = false;
      button.disabled = false;
    }
  }

  function buildButton(toggle, box) {
    const group = toggle.closest('.btn-group');
    if (!group) return null;

    const wrap = document.createElement('div');
    wrap.className = 'btn-group btn-group-shadow ct-skin-group';
    wrap.style.marginRight = '5px';

    for (const { name, value } of group.attributes) {
      if (name.startsWith('_ngcontent-')) wrap.setAttribute(name, value);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = toggle.className.replace(/\bdropdown-toggle\b/g, '') + ' ct-skin-download';

    for (const { name, value } of toggle.attributes) {
      if (name.startsWith('_ngcontent-')) button.setAttribute(name, value);
    }

    const icon = document.createElement('span');
    icon.className = 'ct-skin-icon';
    icon.setAttribute('aria-hidden', 'true');
    const maskUrl = chrome.runtime.getURL('assets/ui/skin-wand.png');
    const mask = `url("${maskUrl}") center / contain no-repeat`;
    icon.style.cssText = `display:inline-block;width:1.25em;height:1em;vertical-align:-.125em;background-color:currentColor;mask:${mask};-webkit-mask:${mask};pointer-events:none;`;
    button.append(icon);

    button.title = 'Download skin (.ptc)';
    button.setAttribute('aria-label', 'Download skin (.ptc)');

    for (const type of ['mousedown', 'pointerdown', 'mouseup', 'pointerup', 'keydown', 'keyup']) {
      button.addEventListener(type, event => event.stopPropagation());
    }
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (event.isTrusted) grabSkin(box, button);
    });

    wrap.append(button);
    group.insertAdjacentElement('afterend', wrap);

    const size = toggle.getBoundingClientRect();
    if (size.width && size.height) {
      button.style.width = size.width + 'px';
      button.style.height = size.height + 'px';
    }

    return button;
  }

  function scan() {
    for (const toggle of document.querySelectorAll('pony-box [title="Player options"], .pony-box [title="Player options"]')) {
      const box = toggle.closest('pony-box') || toggle.closest('.pony-box');
      const group = toggle.closest('.btn-group');
      if (!box || !group || box.querySelector('.ct-skin-download')) continue;
      box.dataset.copytownSkinBox ||= crypto.randomUUID();
      buildButton(toggle, box);
    }
  }

  let busy = false;
  async function updateButtons() {
    if (document.hidden || busy) return;
    busy = true;
    try {
      scan();
      for (const button of [...document.querySelectorAll('.ct-skin-download')].slice(0, 8)) {
        const box = button.closest('pony-box') || button.closest('.pony-box');
        if (!box?.getClientRects().length) continue;
        const toggle = box.querySelector('[title="Player options"]');
        const size = toggle?.getBoundingClientRect();
        if (size?.width && size.height) {
          const width = size.width + 'px', height = size.height + 'px';
          if (button.style.width !== width) button.style.width = width;
          if (button.style.height !== height) button.style.height = height;
        }
      }
    } finally {
      busy = false;
    }
  }

  let scheduled = false;
  const observer = new MutationObserver(records => {
    if (scheduled || !records.some(record => [...record.addedNodes].some(node => node.nodeType === 1 && (node.matches('pony-box, .pony-box') || node.querySelector('pony-box, .pony-box'))))) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateButtons();
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  setInterval(updateButtons, 700);
  updateButtons();
})();
