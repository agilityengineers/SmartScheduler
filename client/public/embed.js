(function() {
  'use strict';

  var SmartScheduler = window.SmartScheduler || {};

  // Inline embed: find data-url div and load iframe
  function initInline() {
    var containers = document.querySelectorAll('#smartscheduler-embed[data-url]');
    containers.forEach(function(container) {
      var url = container.getAttribute('data-url');
      if (!url || container.querySelector('iframe')) return;
      var iframe = document.createElement('iframe');
      iframe.src = url + '?embed=true';
      iframe.style.width = '100%';
      iframe.style.minHeight = container.style.minHeight || '600px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('title', 'SmartScheduler Booking');
      container.appendChild(iframe);
    });
  }

  // Popup widget: create floating button
  function initPopupWidget() {
    var scripts = document.querySelectorAll('script[data-type="popup"][data-url]');
    scripts.forEach(function(script) {
      var url = script.getAttribute('data-url');
      var color = script.getAttribute('data-color') || '#4F46E5';
      var text = script.getAttribute('data-text') || 'Schedule a Meeting';

      if (document.querySelector('.smartscheduler-popup-btn')) return;

      var btn = document.createElement('button');
      btn.className = 'smartscheduler-popup-btn';
      btn.textContent = text;
      btn.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;' +
        'padding:12px 24px;border:none;border-radius:50px;cursor:pointer;' +
        'font-size:16px;font-weight:600;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.15);' +
        'transition:transform 0.2s,box-shadow 0.2s;background-color:' + color + ';';
      btn.onmouseenter = function() { btn.style.transform = 'scale(1.05)'; };
      btn.onmouseleave = function() { btn.style.transform = 'scale(1)'; };
      btn.onclick = function() { SmartScheduler.open(url); };
      document.body.appendChild(btn);
    });
  }

  // Open popup modal with booking page
  SmartScheduler.open = function(url) {
    // Remove existing overlay
    var existing = document.getElementById('smartscheduler-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'smartscheduler-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;' +
      'background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';

    var modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:12px;width:90%;max-width:520px;' +
      'max-height:90vh;overflow:hidden;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.2);';

    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'position:absolute;top:8px;right:12px;z-index:1;' +
      'background:none;border:none;font-size:28px;cursor:pointer;color:#666;' +
      'width:36px;height:36px;display:flex;align-items:center;justify-content:center;';
    closeBtn.onclick = function() { overlay.remove(); };

    var iframe = document.createElement('iframe');
    iframe.src = url + '?embed=true';
    iframe.style.cssText = 'width:100%;height:80vh;border:none;';
    iframe.setAttribute('title', 'SmartScheduler Booking');

    modal.appendChild(closeBtn);
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  };

  // Close popup
  SmartScheduler.close = function() {
    var overlay = document.getElementById('smartscheduler-overlay');
    if (overlay) overlay.remove();
  };

  window.SmartScheduler = SmartScheduler;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initInline();
      initPopupWidget();
    });
  } else {
    initInline();
    initPopupWidget();
  }
})();
