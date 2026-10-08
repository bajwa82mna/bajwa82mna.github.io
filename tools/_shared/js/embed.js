(function (global) {
  'use strict';

  var HEIGHT_MESSAGE = 'smb:embed-height';
  var THEME_MESSAGE = 'smb:embed-theme';

  function isEmbedded(search) {
    return new URLSearchParams(search || '').get('embed') === '1';
  }

  function isTrustedParentMessage(event) {
    return event.origin === global.location.origin && event.source === global.parent;
  }

  function frameForMessage(event, frames) {
    if (event.origin !== global.location.origin) return null;
    return Array.prototype.find.call(frames || [], function (frame) {
      return frame.contentWindow === event.source;
    }) || null;
  }

  function currentTheme() {
    var explicit = document.documentElement.getAttribute('data-theme');
    if (explicit === 'light' || explicit === 'dark') return explicit;
    return global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function contentHeight() {
    var body = document.body;
    if (!body) return 0;
    var bodyTop = body.getBoundingClientRect().top;
    var bottom = bodyTop;
    Array.prototype.forEach.call(body.children, function (child) {
      if (global.getComputedStyle(child).display === 'none') return;
      var rect = child.getBoundingClientRect();
      var margin = parseFloat(global.getComputedStyle(child).marginBottom) || 0;
      bottom = Math.max(bottom, rect.bottom + margin);
    });
    return Math.ceil(bottom - bodyTop);
  }

  function prepareEmbeddedDocument() {
    document.querySelectorAll('details').forEach(function (details) {
      var summary = details.querySelector('summary');
      if (summary && /how to use/i.test(summary.textContent)) details.open = false;
    });
    document.querySelectorAll('h2,h3').forEach(function (heading) {
      if (/^how to use\b/i.test(heading.textContent.trim())) {
        var section = heading.closest('section,aside');
        if (section) section.classList.add('embed-how-to');
      }
    });
  }

  function startChild() {
    if (!isEmbedded(global.location.search)) return;
    document.addEventListener('DOMContentLoaded', prepareEmbeddedDocument);
    if (global.parent === global) return;
    function sendHeight() {
      var height = contentHeight();
      if (height) global.parent.postMessage({type: HEIGHT_MESSAGE, height: height}, global.location.origin);
    }
    global.addEventListener('message', function (event) {
      if (!isTrustedParentMessage(event) || !event.data || event.data.type !== THEME_MESSAGE) return;
      if (event.data.theme === 'dark' || event.data.theme === 'light') {
        document.documentElement.setAttribute('data-theme', event.data.theme);
        sendHeight();
      }
    });
    document.addEventListener('DOMContentLoaded', function () {
      sendHeight();
      if (global.ResizeObserver) new ResizeObserver(sendHeight).observe(document.body);
    });
    global.addEventListener('load', sendHeight);
  }

  function mountFrames(frames) {
    var list = Array.prototype.slice.call(frames || []);
    function sendTheme(frame) {
      if (frame.contentWindow) frame.contentWindow.postMessage({type: THEME_MESSAGE, theme: currentTheme()}, global.location.origin);
    }
    function onMessage(event) {
      var frame = frameForMessage(event, list);
      if (!frame || !event.data || event.data.type !== HEIGHT_MESSAGE) return;
      var height = Number(event.data.height);
      if (Number.isFinite(height) && height > 0) frame.style.height = Math.ceil(height) + 'px';
    }
    global.addEventListener('message', onMessage);
    list.forEach(function (frame) {
      frame.setAttribute('scrolling', 'no');
      frame.addEventListener('load', function () { sendTheme(frame); });
    });
    if (global.MutationObserver) {
      new MutationObserver(function () { list.forEach(sendTheme); }).observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
    }
    return {sendTheme: function () { list.forEach(sendTheme); }};
  }

  global.EmbedBridge = {
    HEIGHT_MESSAGE: HEIGHT_MESSAGE,
    THEME_MESSAGE: THEME_MESSAGE,
    isEmbedded: isEmbedded,
    isTrustedParentMessage: isTrustedParentMessage,
    frameForMessage: frameForMessage,
    mountFrames: mountFrames
  };

  if (isEmbedded(global.location.search)) document.documentElement.classList.add('is-embedded');
  startChild();
})(window);
