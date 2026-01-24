(function () {
  'use strict';

  function hasGtag() {
    return typeof window.gtag === 'function';
  }

  function isModifiedClick(event) {
    return !!(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
  }

  function getAnchorFromTarget(element) {
    if (!element) return null;
    if (element.tagName === 'A' && element.getAttribute('href')) return element;
    return element.closest ? element.closest('a[href]') : null;
  }

  function isSameTabNavigation(anchor, event) {
    if (!anchor) return false;
    if (isModifiedClick(event)) return false;

    var target = (anchor.getAttribute('target') || '').toLowerCase();
    if (target && target !== '_self') return false;

    if (anchor.hasAttribute('download')) return false;

    var href = anchor.getAttribute('href');
    if (!href) return false;

    // Ignore purely in-page anchors.
    if (href.charAt(0) === '#') return false;

    // Ignore mailto/tel/etc.
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href) && !/^https?:/i.test(href)) return false;

    return true;
  }

  function safeUrl(url) {
    try {
      return new URL(url, window.location.href);
    } catch (e) {
      return null;
    }
  }

  function trimText(text) {
    if (!text) return '';
    return String(text).replace(/\s+/g, ' ').trim().slice(0, 140);
  }

  function buildParams(trackEl, anchorEl) {
    var data = trackEl && trackEl.dataset ? trackEl.dataset : {};
    var params = {};

    if (data.analyticsAction) params.ui_action = data.analyticsAction;
    if (data.analyticsLocation) params.ui_location = data.analyticsLocation;
    if (data.analyticsLabel) params.ui_label = data.analyticsLabel;

    if (data.analyticsBook) params.book_slug = data.analyticsBook;
    if (data.analyticsChapter) params.chapter_slug = data.analyticsChapter;

    // Optional: nice-to-have metadata (kept short to avoid bloating event payloads)
    if (data.analyticsTitle) params.content_title = trimText(data.analyticsTitle);

    if (typeof data.analyticsOutbound !== 'undefined') {
      params.outbound = data.analyticsOutbound === '' || data.analyticsOutbound === 'true';
    }

    // Common context
    params.page_path = window.location.pathname;
    if (document.referrer) params.page_referrer = document.referrer;

    // Link context
    if (anchorEl) {
      var href = anchorEl.getAttribute('href') || '';
      var u = safeUrl(href);
      if (u) {
        params.link_url = u.href;
        params.link_path = u.pathname;
        params.link_domain = u.host;
      } else {
        params.link_url = href;
      }

      var txt = trimText(anchorEl.textContent);
      if (txt) params.link_text = txt;
    }

    return params;
  }

  function sendEvent(eventName, params, callback) {
    if (!hasGtag()) {
      if (typeof callback === 'function') callback();
      return;
    }

    var payload = params || {};

    // GA4 supports event_callback + event_timeout on gtag events.
    payload.transport_type = 'beacon';
    payload.event_timeout = 1000;

    if (typeof callback === 'function') {
      var called = false;
      payload.event_callback = function () {
        if (called) return;
        called = true;
        callback();
      };

      // Hard fallback in case callback isn't invoked.
      setTimeout(function () {
        if (called) return;
        called = true;
        callback();
      }, 1100);
    }

    window.gtag('event', eventName, payload);
  }

  function findTrackElement(target) {
    if (!target || !target.closest) return null;
    return target.closest('[data-analytics-action], [data-analytics-event]');
  }

  function isDebugEnabled() {
    try {
      return new URLSearchParams(window.location.search).has('debug_analytics');
    } catch (e) {
      return false;
    }
  }

  document.addEventListener(
    'click',
    function (event) {
      var trackEl = findTrackElement(event.target);
      if (!trackEl) return;

      var eventName = (trackEl.dataset && trackEl.dataset.analyticsEvent) || 'ui_click';
      var anchor = getAnchorFromTarget(event.target);

      var params = buildParams(trackEl, anchor);

      if (isDebugEnabled() && window.console && typeof window.console.log === 'function') {
        console.log('[analytics]', eventName, params);
      }

      if (anchor && isSameTabNavigation(anchor, event)) {
        event.preventDefault();
        sendEvent(eventName, params, function () {
          window.location.href = anchor.href;
        });
      } else {
        sendEvent(eventName, params);
      }
    },
    { capture: true }
  );
})();
