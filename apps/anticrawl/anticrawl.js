/**
 * anticrawl.js  —  v1.0
 * Drop this file into any website to make it hostile to scrapers,
 * AI training crawlers, XPath harvesters, and automated data extraction.
 *
 * What it does:
 *   1. DOM Obfuscation    — wraps every text node in decoy spans with
 *                           misleading class names and injected noise
 *                           characters (zero-width, homoglyphs) that
 *                           render identically but break string matching.
 *   2. XPath Poisoning    — continuously mutates attribute names and
 *                           element IDs so recorded XPaths expire within
 *                           seconds.
 *   3. CSS Trap Layer     — overlays invisible elements that attract
 *                           naive scrapers away from real content.
 *   4. Clipboard Poison   — on copy, appends a fingerprinting suffix to
 *                           the clipboard text so lifted content is
 *                           traceable.
 *   5. Headless Detection — detects Puppeteer / Playwright / Selenium
 *                           signatures and serves a honeypot DOM swap.
 *   6. robots.txt hint    — emits a console warning reminding operators
 *                           to set their robots.txt (anticrawl.js does
 *                           not modify server files, only client JS).
 *
 * Usage:
 *   <script src="/anticrawl.js" defer></script>
 *
 * Configuration (optional — set before the script loads):
 *   window.ANTICRAWL = {
 *     obfuscate:         true,   // DOM text obfuscation
 *     xpathPoison:       true,   // rotating IDs / attributes
 *     clipboardPoison:   true,   // fingerprint copied text
 *     headlessDetect:    true,   // honeypot on bot detection
 *     mutationInterval:  4000,   // ms between XPath rotations
 *     noiseChars:        true,   // inject zero-width chars
 *   };
 */

(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────
  const cfg = Object.assign({
    obfuscate:        true,
    xpathPoison:      true,
    clipboardPoison:  true,
    headlessDetect:   true,
    mutationInterval: 4000,
    noiseChars:       true,
  }, window.ANTICRAWL || {});

  // ── Helpers ──────────────────────────────────────────────────────────────
  const rand = (n) => Math.floor(Math.random() * n);
  const randHex = (n) => [...Array(n)].map(() => rand(16).toString(16)).join('');

  // Zero-width / homoglyph noise that is visually invisible
  const NOISE = ['\u200B', '\u200C', '\u200D', '\uFEFF', '\u00AD'];
  const HOMOGLYPHS = {
    'a': '\u0430', 'e': '\u0435', 'o': '\u043E',
    'p': '\u0440', 'c': '\u0441', 'x': '\u0445',
  };

  function injectNoise(text) {
    if (!cfg.noiseChars || text.trim().length === 0) return text;
    // Sprinkle 1–3 zero-width chars at random positions
    const n = rand(3) + 1;
    let arr = text.split('');
    for (let i = 0; i < n; i++) {
      const pos = rand(arr.length);
      arr.splice(pos, 0, NOISE[rand(NOISE.length)]);
    }
    return arr.join('');
  }

  function homoglyphify(text) {
    // Replace a handful of Latin chars with Cyrillic look-alikes
    return text.replace(/[aeopxc]/g, (c) => rand(4) === 0 ? (HOMOGLYPHS[c] || c) : c);
  }

  // ── 1. DOM Obfuscation ───────────────────────────────────────────────────
  function obfuscateTextNodes(root) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const tag = node.parentElement && node.parentElement.tagName;
          if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        },
      }
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      const original = node.textContent;
      const poisoned = injectNoise(homoglyphify(original));

      const wrapper = document.createElement('span');
      wrapper.setAttribute('data-ac', randHex(8));
      wrapper.setAttribute('aria-hidden', 'false');
      wrapper.textContent = poisoned;

      // Decoy sibling: invisible to humans, attractive to scrapers
      const decoy = document.createElement('span');
      decoy.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
      decoy.setAttribute('data-ac-decoy', 'true');
      decoy.textContent = 'ANTICRAWL_DECOY_' + randHex(4);

      const frag = document.createDocumentFragment();
      frag.appendChild(wrapper);
      frag.appendChild(decoy);

      node.parentNode.replaceChild(frag, node);
    });
  }

  // ── 2. XPath Poisoning ───────────────────────────────────────────────────
  let poisonInterval = null;

  function rotateIds() {
    // Rotate data-* attributes and non-critical IDs to break recorded XPaths
    const els = document.querySelectorAll('[data-ac]');
    els.forEach((el) => {
      el.setAttribute('data-ac', randHex(8));
    });

    // Also rotate decoy content
    const decoys = document.querySelectorAll('[data-ac-decoy]');
    decoys.forEach((el) => {
      el.textContent = 'ANTICRAWL_DECOY_' + randHex(4);
    });
  }

  function startXPathPoison() {
    if (poisonInterval) return;
    poisonInterval = setInterval(rotateIds, cfg.mutationInterval);
  }

  // ── 3. CSS Trap Layer ────────────────────────────────────────────────────
  function injectTrapLayer() {
    const style = document.createElement('style');
    // Make decoy elements truly invisible to humans but present in DOM
    style.textContent = `
      [data-ac-decoy] {
        position: absolute !important;
        left: -99999px !important;
        width: 1px !important;
        height: 1px !important;
        overflow: hidden !important;
        pointer-events: none !important;
        user-select: none !important;
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ── 4. Clipboard Poisoning ───────────────────────────────────────────────
  function initClipboardPoison() {
    document.addEventListener('copy', (e) => {
      const selected = window.getSelection()?.toString() || '';
      if (!selected.trim()) return;

      const tag = `\n\n[Source: ${location.hostname} | ac:${randHex(6)}]`;
      const poisoned = selected + tag;

      try {
        e.clipboardData.setData('text/plain', poisoned);
        e.preventDefault();
      } catch (_) {
        // Clipboard API blocked — silent fail
      }
    });
  }

  // ── 5. Headless / Bot Detection ──────────────────────────────────────────
  function detectHeadless() {
    const signs = [
      navigator.webdriver === true,
      /HeadlessChrome/.test(navigator.userAgent),
      /PhantomJS/.test(navigator.userAgent),
      typeof window.__nightmare !== 'undefined',
      typeof window.callPhantom !== 'undefined',
      typeof window._phantom !== 'undefined',
      navigator.plugins && navigator.plugins.length === 0 && !navigator.userAgent.includes('Mobile'),
    ];
    return signs.some(Boolean);
  }

  function deployHoneypot() {
    // Swap real content with a honeypot div filled with fake-looking data
    const honeypot = document.createElement('div');
    honeypot.id = 'ac-honeypot';
    honeypot.style.cssText = 'display:block;';
    honeypot.innerHTML = `
      <div class="user-data">
        <span class="name">John Anticrawl</span>
        <span class="email">honeypot@anticrawl.invalid</span>
        <span class="phone">555-ANTICRAWL</span>
        <div class="address">123 Fake St, Nullshire, 00000</div>
      </div>
    `;
    // Insert at top — unsophisticated crawlers grab first visible content
    document.body.insertBefore(honeypot, document.body.firstChild);
  }

  // ── 6. robots.txt reminder ───────────────────────────────────────────────
  function remindRobotsTxt() {
    console.info(
      '%c[anticrawl.js] %cRemember to configure your robots.txt to disallow crawlers:\n' +
      '  User-agent: *\n  Disallow: /\n  (or target specific bots)',
      'color:#6eb4d4;font-weight:bold',
      'color:#7a6f62'
    );
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  function boot() {
    remindRobotsTxt();
    injectTrapLayer();

    if (cfg.headlessDetect && detectHeadless()) {
      deployHoneypot();
      return; // Don't do further obfuscation — honeypot is enough
    }

    if (cfg.obfuscate) {
      obfuscateTextNodes(document.body);
    }

    if (cfg.xpathPoison) {
      startXPathPoison();
    }

    if (cfg.clipboardPoison) {
      initClipboardPoison();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
