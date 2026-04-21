/*!
 * Webflow Client Approval Widget v1.0.0
 * Embed in Webflow via: Settings → Custom Code → Footer
 *
 * Usage:
 *   <script src="https://your-cdn.com/widget.js?siteId=YOUR_SITE_ID&apiUrl=https://your-app.onrender.com"></script>
 *
 * Query params:
 *   siteId  – unique identifier for the Webflow staging site (required)
 *   apiUrl  – base URL of your Next.js dashboard API (required)
 */

(function (window, document) {
  'use strict';

  // ─── Config ────────────────────────────────────────────────────────────────
  var scriptEl = document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();

  var src = scriptEl ? scriptEl.src : '';
  var params = {};
  try {
    var urlObj = new URL(src);
    urlObj.searchParams.forEach(function (v, k) { params[k] = v; });
  } catch (e) {
    var qs = src.split('?')[1] || '';
    qs.split('&').forEach(function (p) {
      var kv = p.split('=');
      if (kv[0]) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
  }

  var SITE_ID = params.siteId || 'unknown';
  var API_URL = (params.apiUrl || '').replace(/\/$/, '');
  var H2C_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

  // ─── State ──────────────────────────────────────────────────────────────────
  var state = {
    open: false,
    mode: null,          // 'pin' | 'draw' | 'text' | 'ss'
    drawing: false,
    drawPoints: [],
    pins: [],
    textBoxes: [],
    h2cLoaded: false,
  };

  // ─── Styles ─────────────────────────────────────────────────────────────────
  var css = `
    #wfa-launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483640;
      background: #4F46E5;
      color: #fff;
      border: none;
      border-radius: 50px;
      padding: 12px 20px;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(79,70,229,0.5);
      transition: transform .15s, box-shadow .15s;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #wfa-launcher:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(79,70,229,0.55); }

    #wfa-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483630;
      cursor: crosshair;
      display: none;
    }
    #wfa-overlay.wfa-active { display: block; }

    #wfa-canvas {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    #wfa-toolbar {
      position: fixed;
      bottom: 80px;
      right: 24px;
      z-index: 2147483641;
      background: #fff;
      border-radius: 14px;
      padding: 10px;
      display: none;
      flex-direction: column;
      gap: 6px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.15);
      font-family: system-ui, sans-serif;
    }
    #wfa-toolbar.wfa-active { display: flex; }

    .wfa-tool-btn {
      background: #F3F4F6;
      border: 2px solid transparent;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background .1s, border-color .1s;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }
    .wfa-tool-btn:hover { background: #E5E7EB; }
    .wfa-tool-btn.wfa-selected { background: #EEF2FF; border-color: #4F46E5; color: #4F46E5; }

    .wfa-divider { height: 1px; background: #E5E7EB; margin: 2px 0; }

    #wfa-submit-btn {
      background: #4F46E5;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 9px 14px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    #wfa-submit-btn:hover { background: #4338CA; }
    #wfa-cancel-btn {
      background: #F3F4F6;
      border: none;
      border-radius: 8px;
      padding: 9px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .wfa-pin {
      position: fixed;
      width: 28px;
      height: 28px;
      background: #4F46E5;
      border: 3px solid #fff;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg) translate(-50%, -50%);
      z-index: 2147483635;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      pointer-events: none;
    }

    .wfa-text-input {
      position: fixed;
      z-index: 2147483636;
      background: #fff;
      border: 2px solid #4F46E5;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 13px;
      font-family: system-ui, sans-serif;
      min-width: 180px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      outline: none;
    }

    #wfa-status-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #1F2937;
      color: #fff;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-family: system-ui, sans-serif;
      z-index: 2147483647;
      display: none;
      box-shadow: 0 4px 14px rgba(0,0,0,0.3);
    }
    #wfa-name-prompt {
      position: fixed;
      inset: 0;
      z-index: 2147483645;
      background: rgba(0,0,0,0.4);
      display: none;
      align-items: center;
      justify-content: center;
    }
    #wfa-name-prompt.wfa-active { display: flex; }
    #wfa-name-box {
      background: #fff;
      border-radius: 16px;
      padding: 28px 32px;
      width: 340px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.2);
      font-family: system-ui, sans-serif;
    }
    #wfa-name-box h3 { margin: 0 0 6px; font-size: 16px; color: #111827; }
    #wfa-name-box p  { margin: 0 0 16px; font-size: 13px; color: #6B7280; }
    #wfa-name-box input {
      width: 100%; box-sizing: border-box;
      border: 1px solid #D1D5DB; border-radius: 8px;
      padding: 9px 12px; font-size: 14px; margin-bottom: 12px; outline: none;
    }
    #wfa-name-box input:focus { border-color: #4F46E5; }
    #wfa-name-confirm {
      width: 100%; background: #4F46E5; color: #fff; border: none;
      border-radius: 8px; padding: 10px; font-size: 14px; font-weight: 700; cursor: pointer;
    }
    #wfa-name-confirm:hover { background: #4338CA; }
  `;

  // ─── Inject styles ──────────────────────────────────────────────────────────
  var styleTag = document.createElement('style');
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  // ─── Load html2canvas lazily ────────────────────────────────────────────────
  function loadH2C(cb) {
    if (state.h2cLoaded) { cb(); return; }
    if (window.html2canvas) { state.h2cLoaded = true; cb(); return; }
    var s = document.createElement('script');
    s.src = H2C_CDN;
    s.onload = function () { state.h2cLoaded = true; cb(); };
    s.onerror = function () { showToast('⚠️ Could not load screenshot library'); };
    document.head.appendChild(s);
  }

  // ─── DOM Build ───────────────────────────────────────────────────────────────
  // Launcher button
  var launcher = document.createElement('button');
  launcher.id = 'wfa-launcher';
  launcher.innerHTML = '💬 Review';
  document.body.appendChild(launcher);

  // Toolbar
  var toolbar = document.createElement('div');
  toolbar.id = 'wfa-toolbar';
  toolbar.innerHTML = `
    <button class="wfa-tool-btn" data-mode="pin">📍 Pin</button>
    <button class="wfa-tool-btn" data-mode="draw">✏️ Draw</button>
    <button class="wfa-tool-btn" data-mode="text">💬 Text</button>
    <button class="wfa-tool-btn" data-mode="ss">📸 Screenshot</button>
    <div class="wfa-divider"></div>
    <button id="wfa-submit-btn">✅ Submit</button>
    <button id="wfa-cancel-btn">✖ Cancel</button>
  `;
  document.body.appendChild(toolbar);

  // Overlay + canvas
  var overlay = document.createElement('div');
  overlay.id = 'wfa-overlay';
  var cvs = document.createElement('canvas');
  cvs.id = 'wfa-canvas';
  overlay.appendChild(cvs);
  document.body.appendChild(overlay);

  // Toast
  var toast = document.createElement('div');
  toast.id = 'wfa-status-toast';
  document.body.appendChild(toast);

  // Name prompt
  var namePrompt = document.createElement('div');
  namePrompt.id = 'wfa-name-prompt';
  namePrompt.innerHTML = `
    <div id="wfa-name-box">
      <h3>👋 Who's reviewing?</h3>
      <p>Enter your name so the team knows who left feedback.</p>
      <input id="wfa-name-input" type="text" placeholder="Your name or email" />
      <button id="wfa-name-confirm">Start Reviewing →</button>
    </div>
  `;
  document.body.appendChild(namePrompt);

  // ─── Canvas sizing ───────────────────────────────────────────────────────────
  function resizeCanvas() {
    cvs.width = window.innerWidth;
    cvs.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  var ctx = cvs.getContext('2d');

  // ─── State: collected feedback items ────────────────────────────────────────
  var feedbackItems = [];   // array of { type, x, y, content, screenshotDataUrl }
  var reviewerName = '';

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function showToast(msg, duration) {
    toast.textContent = msg;
    toast.style.display = 'block';
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toast.style.display = 'none'; }, duration || 3000);
  }

  function setMode(mode) {
    state.mode = mode;
    toolbar.querySelectorAll('.wfa-tool-btn').forEach(function (b) {
      b.classList.toggle('wfa-selected', b.dataset.mode === mode);
    });
    if (mode === 'ss') {
      overlay.classList.remove('wfa-active');
    } else {
      overlay.classList.add('wfa-active');
    }
  }

  function redrawCanvas() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    // Draw all stored paths
    feedbackItems.forEach(function (item) {
      if (item.type === 'draw' && item.points && item.points.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(item.points[0].x, item.points[0].y);
        item.points.slice(1).forEach(function (p) { ctx.lineTo(p.x, p.y); });
        ctx.stroke();
      }
    });
    // Live drawing
    if (state.drawPoints.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(state.drawPoints[0].x, state.drawPoints[0].y);
      state.drawPoints.slice(1).forEach(function (p) { ctx.lineTo(p.x, p.y); });
      ctx.stroke();
    }
  }

  function placePinDot(x, y) {
    var dot = document.createElement('div');
    dot.className = 'wfa-pin';
    dot.style.left = x + 'px';
    dot.style.top = y + 'px';
    document.body.appendChild(dot);
    state.pins.push(dot);
  }

  function placeTextBox(x, y) {
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'wfa-text-input';
    input.placeholder = 'Type comment…';
    input.style.left = x + 'px';
    input.style.top = y + 'px';
    document.body.appendChild(input);
    input.focus();
    state.textBoxes.push({ el: input, x: x, y: y });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && input.value.trim()) {
        feedbackItems.push({ type: 'text', x: x, y: y, content: input.value.trim() });
        input.style.borderColor = '#10B981';
        input.disabled = true;
        showToast('📝 Text comment added');
      }
      if (e.key === 'Escape') { input.remove(); }
    });
  }

  // ─── Overlay events ──────────────────────────────────────────────────────────
  overlay.addEventListener('mousedown', function (e) {
    var x = e.clientX, y = e.clientY;

    if (state.mode === 'pin') {
      placePinDot(x, y);
      feedbackItems.push({ type: 'pin', x: x, y: y, content: '' });
      showToast('📍 Pin added');
    } else if (state.mode === 'draw') {
      state.drawing = true;
      state.drawPoints = [{ x: x, y: y }];
    } else if (state.mode === 'text') {
      overlay.classList.remove('wfa-active');
      placeTextBox(x, y);
      setTimeout(function () { overlay.classList.add('wfa-active'); }, 100);
    }
  });

  overlay.addEventListener('mousemove', function (e) {
    if (state.mode === 'draw' && state.drawing) {
      state.drawPoints.push({ x: e.clientX, y: e.clientY });
      redrawCanvas();
    }
  });

  overlay.addEventListener('mouseup', function () {
    if (state.mode === 'draw' && state.drawing) {
      state.drawing = false;
      if (state.drawPoints.length > 1) {
        feedbackItems.push({ type: 'draw', points: state.drawPoints.slice() });
        showToast('✏️ Drawing added');
      }
      state.drawPoints = [];
    }
  });

  // ─── Toolbar button clicks ───────────────────────────────────────────────────
  toolbar.querySelectorAll('.wfa-tool-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var mode = btn.dataset.mode;
      if (mode === 'ss') {
        takeScreenshot();
      } else {
        setMode(mode);
      }
    });
  });

  // ─── Screenshot ──────────────────────────────────────────────────────────────
  function takeScreenshot() {
    overlay.classList.remove('wfa-active');
    toolbar.style.display = 'none';
    launcher.style.display = 'none';

    loadH2C(function () {
      setTimeout(function () {
        window.html2canvas(document.body, { useCORS: true, logging: false }).then(function (canvas) {
          var dataUrl = canvas.toDataURL('image/png');
          feedbackItems.push({ type: 'screenshot', content: 'Full page screenshot', screenshotDataUrl: dataUrl });
          overlay.classList.add('wfa-active');
          toolbar.style.display = 'flex';
          launcher.style.display = 'flex';
          showToast('📸 Screenshot captured!');
        }).catch(function () {
          overlay.classList.add('wfa-active');
          toolbar.style.display = 'flex';
          launcher.style.display = 'flex';
          showToast('⚠️ Screenshot failed — check CORS settings');
        });
      }, 200);
    });
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────
  document.getElementById('wfa-submit-btn').addEventListener('click', function () {
    if (feedbackItems.length === 0) { showToast('⚠️ No feedback to submit yet'); return; }
    submitFeedback();
  });

  function submitFeedback() {
    var payload = {
      siteId: SITE_ID,
      reviewer: reviewerName || 'Anonymous',
      pageUrl: window.location.href,
      pageTitle: document.title,
      items: feedbackItems.map(function (item) {
        return {
          type: item.type,
          x: item.x || null,
          y: item.y || null,
          content: item.content || '',
          screenshotDataUrl: item.screenshotDataUrl || null,
          points: item.points || null,
        };
      }),
      status: 'pending',
      timestamp: new Date().toISOString(),
    };

    var endpoint = API_URL + '/api/feedback';
    var btn = document.getElementById('wfa-submit-btn');
    btn.textContent = '⏳ Sending…';
    btn.disabled = true;

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function () {
        showToast('✅ Feedback submitted! Thank you.', 4000);
        resetWidget();
      })
      .catch(function (err) {
        console.error('[WFA] Submit error', err);
        showToast('❌ Submission failed — please try again');
        btn.textContent = '✅ Submit';
        btn.disabled = false;
      });
  }

  // ─── Cancel ──────────────────────────────────────────────────────────────────
  document.getElementById('wfa-cancel-btn').addEventListener('click', resetWidget);

  function resetWidget() {
    state.open = false;
    state.mode = null;
    state.drawing = false;
    state.drawPoints = [];
    feedbackItems = [];

    overlay.classList.remove('wfa-active');
    toolbar.classList.remove('wfa-active');
    launcher.innerHTML = '💬 Review';

    ctx.clearRect(0, 0, cvs.width, cvs.height);
    state.pins.forEach(function (p) { p.remove(); });
    state.pins = [];
    state.textBoxes.forEach(function (t) { t.el.remove(); });
    state.textBoxes = [];

    var btn = document.getElementById('wfa-submit-btn');
    btn.textContent = '✅ Submit';
    btn.disabled = false;
  }

  // ─── Launcher click ──────────────────────────────────────────────────────────
  launcher.addEventListener('click', function () {
    if (state.open) { resetWidget(); return; }

    if (!reviewerName) {
      namePrompt.classList.add('wfa-active');
      document.getElementById('wfa-name-input').focus();
    } else {
      openWidget();
    }
  });

  document.getElementById('wfa-name-confirm').addEventListener('click', function () {
    var val = document.getElementById('wfa-name-input').value.trim();
    reviewerName = val || 'Anonymous';
    namePrompt.classList.remove('wfa-active');
    openWidget();
  });

  document.getElementById('wfa-name-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('wfa-name-confirm').click();
  });

  function openWidget() {
    state.open = true;
    launcher.innerHTML = '✖ Close';
    toolbar.classList.add('wfa-active');
    setMode('pin');
    showToast('📍 Pin mode active — click anywhere to mark');
  }

})(window, document);
