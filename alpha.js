(function () {
  'use strict';
  var API = (window.ALPHA_API_URL || '').replace(/\/$/, '');
  var KEY = 'alpha.v2';
  var DEF_SYS = "You are Alpha, a helpful, intelligent, honest, and friendly personal AI assistant. Explain complex topics clearly, follow the user's language preference, admit uncertainty, and provide practical answers. Never pretend to have access to files, tools, websites, or memories that are not available.";
  var SUGGEST = ['Explain a hard topic simply', 'Help me plan my study week', 'Draft a polite email', 'Review my code and find bugs'];
  var IC = { menu: 'M4 6h16M4 12h16M4 18h16', plus: 'M12 5v14M5 12h14', send: 'M12 19V5M5 12l7-7 7 7', stop: 'M7 7h10v10H7z', copy: 'M9 9h10v10H9zM5 15V5h10', x: 'M6 6l12 12M18 6L6 18', edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4', trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13', gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM12 3v3M12 18v3M3 12h3M18 12h3', down: 'M12 4v11M7 11l5 5 5-5M5 20h14', redo: 'M20 11a8 8 0 10-2.3 5.7M20 5v6h-6' };
  var ic = function (n) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + IC[n] + '"/></svg>'; };
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return s.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var st = { convs: [], cur: null, set: { name: 'Alpha', system: DEF_SYS, theme: 'dark', save: true, model: '' } };
  try { var raw = JSON.parse(localStorage.getItem(KEY)); if (raw) { st.convs = raw.convs || []; Object.assign(st.set, raw.set); if (st.convs.some(function (c) { return c.id === raw.cur; })) st.cur = raw.cur; } } catch (e) {}
  var busy = false, ctl = null, errMsg = '', backend = { ok: false, note: '' };

  function persist() { try { localStorage.setItem(KEY, JSON.stringify({ set: st.set, cur: st.cur, convs: st.set.save ? st.convs : [] })); } catch (e) {} }
  function cur() { return st.convs.find(function (c) { return c.id === st.cur; }); }
  function newChat() { if (busy) return; st.cur = null; errMsg = ''; closeSide(); ui(); $('#input').focus(); }
  function sysPrompt() { var n = st.set.name || 'Alpha'; return (n !== 'Alpha' ? 'Your name is ' + n + '. ' : '') + (st.set.system || DEF_SYS); }

  function renderList() {
    var q = $('#search').value.trim().toLowerCase(), ul = $('#list'); ul.innerHTML = '';
    var items = st.convs.filter(function (c) { return !q || c.title.toLowerCase().includes(q) || c.messages.some(function (m) { return m.content.toLowerCase().includes(q); }); })
      .sort(function (a, b) { return b.updated - a.updated; });
    if (!items.length) { ul.innerHTML = '<li class="empty-list">' + (q ? 'No chats match your search.' : 'Your chats will appear here.') + '</li>'; return; }
    items.forEach(function (c) {
      var li = document.createElement('li'); if (c.id === st.cur) li.className = 'on';
      li.innerHTML = '<button class="open"></button><button class="icon" data-r aria-label="Rename chat">' + ic('edit') + '</button><button class="icon" data-d aria-label="Delete chat">' + ic('trash') + '</button>';
      li.firstChild.textContent = c.title;
      li.firstChild.onclick = function () { if (busy) return; st.cur = c.id; errMsg = ''; closeSide(); ui(); };
      li.querySelector('[data-r]').onclick = function () { var t = prompt('Rename chat', c.title); if (t && t.trim()) { c.title = t.trim().slice(0, 60); persist(); ui(); } };
      li.querySelector('[data-d]').onclick = function () { if (busy || !confirm('Delete "' + c.title + '"?')) return; st.convs = st.convs.filter(function (x) { return x !== c; }); if (st.cur === c.id) st.cur = null; persist(); ui(); };
      ul.appendChild(li);
    });
  }

  function msgEl(m, last) {
    var d = document.createElement('div'); d.className = 'msg ' + m.role;
    if (m.role === 'user') { d.innerHTML = '<div class="body"></div>'; d.firstChild.textContent = m.content; return d; }
    d.innerHTML = '<div class="body"></div><div class="actions"><button class="icon" data-copy aria-label="Copy reply">' + ic('copy') + '</button>' + (last ? '<button class="icon" data-regen aria-label="Regenerate reply">' + ic('redo') + '</button>' : '') + '</div>';
    fill(d.firstChild, m);
    if (busy && last) d.querySelector('.actions').hidden = true;
    return d;
  }
  function fill(el, m) { el.innerHTML = m.content ? window.AlphaMD.render(m.content) : '<span class="dots" aria-label="Alpha is thinking"><i></i><i></i><i></i></span>'; }

  function renderLog() {
    var log = $('#log'), c = cur(); log.innerHTML = '';
    if (!c || !c.messages.length) {
      var w = document.createElement('div'); w.className = 'welcome';
      w.innerHTML = '<div class="mark" aria-hidden="true"></div><h2></h2><p>Ask anything. Replies stream in as they are written, and your chats stay on this device.</p><div class="sugg"></div>';
      w.querySelector('h2').textContent = st.set.name || 'Alpha';
      SUGGEST.forEach(function (s) { var b = document.createElement('button'); b.type = 'button'; b.textContent = s; b.onclick = function () { send(s); }; w.querySelector('.sugg').appendChild(b); });
      log.appendChild(w); return;
    }
    c.messages.forEach(function (m, i) { log.appendChild(msgEl(m, i === c.messages.length - 1 && m.role === 'assistant')); });
    if (errMsg) {
      var e = document.createElement('div'); e.className = 'err'; e.setAttribute('role', 'alert');
      e.innerHTML = '<span></span><button class="btn" data-retry>Retry</button>'; e.firstChild.textContent = errMsg; log.appendChild(e);
    }
    log.scrollTop = log.scrollHeight;
  }

  function ui() {
    renderList(); renderLog();
    var c = cur(); $('#title').textContent = c ? c.title : (st.set.name || 'Alpha');
    var s = $('#send'); s.innerHTML = ic(busy ? 'stop' : 'send'); s.setAttribute('aria-label', busy ? 'Stop generating' : 'Send message');
    s.disabled = !busy && !backend.ok;
    var b = $('#banner'); b.hidden = backend.ok && navigator.onLine; b.className = backend.ok ? '' : 'warn';
    b.textContent = !navigator.onLine ? 'You are offline. Reconnect to send messages.' : backend.note;
    if (!navigator.onLine) b.hidden = false;
    document.documentElement.dataset.theme = st.set.theme;
    document.querySelectorAll('[data-ic]').forEach(function (n) { n.innerHTML = ic(n.dataset.ic) + (n.dataset.ic === 'plus' || n.dataset.ic === 'gear' ? '' : ''); });
  }

  function friendly(e) {
    if (e && e.code === 'rate_limit') return 'Too many requests. Wait a minute, then retry.';
    if (e && e.code === 'timeout') return 'The request took too long. Retry in a moment.';
    if (e && e.code === 'not_configured') return 'The server has no API key yet. See ALPHA-SETUP.md.';
    if (e && e.code === 'forbidden') return 'This site is not allowed to use the server. Check ALLOWED_ORIGIN.';
    if (e && e.msg) return e.msg;
    if (!navigator.onLine) return 'You are offline. Reconnect, then retry.';
    return 'Could not reach the Alpha server. Check your connection, then retry.';
  }

  async function ask(c) {
    busy = true; errMsg = ''; ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort('timeout'); }, 90000);
    var a = { role: 'assistant', content: '' }; c.messages.push(a); ui();
    var msgs = c.messages.slice(0, -1).slice(-30).map(function (m) { return { role: m.role, content: m.content }; });
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    var raf = 0, paint = function () { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; var el = document.querySelector('#log .msg:last-of-type .body'); if (el) { fill(el, a); var l = $('#log'); l.scrollTop = l.scrollHeight; } }); };
    try {
      var res = await fetch(API + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal, body: JSON.stringify({ model: st.set.model, system: sysPrompt(), messages: msgs }) });
      if (!res.ok) { var j = {}; try { j = await res.json(); } catch (x) {} throw { code: j.code, msg: j.error }; }
      var rd = res.body.getReader(), dec = new TextDecoder(), buf = '';
      for (;;) {
        var r = await rd.read(); if (r.done) break;
        buf += dec.decode(r.value, { stream: true });
        var i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          var ev = buf.slice(0, i); buf = buf.slice(i + 2);
          var line = ev.split('\n').find(function (l) { return l.indexOf('data:') === 0; }); if (!line) continue;
          var d; try { d = JSON.parse(line.slice(5)); } catch (x) { continue; }
          if (d.type === 'content_block_delta' && d.delta && d.delta.type === 'text_delta') { a.content += d.delta.text; paint(); }
          else if (d.type === 'error') throw { msg: 'The model returned an error. Retry in a moment.' };
        }
      }
      if (!a.content) throw { msg: 'The model returned an empty reply. Retry.' };
    } catch (e) {
      var stopped = ctl && ctl.signal.aborted && ctl.signal.reason !== 'timeout';
      if (!a.content) c.messages.pop();
      if (!stopped) errMsg = friendly(ctl && ctl.signal.aborted ? { code: 'timeout' } : e);
    } finally { clearTimeout(timer); busy = false; ctl = null; c.updated = Date.now(); persist(); ui(); }
  }

  function send(text) {
    text = (text || '').trim(); if (!text || busy || !backend.ok) return;
    var c = cur();
    if (!c) { c = { id: Date.now().toString(36), title: text.slice(0, 40), updated: Date.now(), messages: [] }; st.convs.push(c); st.cur = c.id; }
    c.messages.push({ role: 'user', content: text });
    $('#input').value = ''; grow(); ask(c);
  }

  function grow() { var t = $('#input'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, window.innerHeight * 0.4) + 'px'; }
  function copy(t, btn) { if (!navigator.clipboard) return; navigator.clipboard.writeText(t).then(function () { var o = btn.innerHTML; btn.textContent = 'Copied'; setTimeout(function () { btn.innerHTML = o; }, 1200); }); }
  function openSide() { $('#side').classList.add('open'); }
  function closeSide() { $('#side').classList.remove('open'); }

  $('#form').addEventListener('submit', function (e) { e.preventDefault(); if (busy) { ctl.abort('stop'); } else send($('#input').value); });
  $('#input').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!busy) send(this.value); } });
  $('#input').addEventListener('input', grow);
  $('#newBtn').onclick = newChat; $('#menuBtn').onclick = openSide; $('#closeSide').onclick = closeSide; $('#scrim').onclick = closeSide;
  $('#search').addEventListener('input', renderList);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSide(); });
  window.addEventListener('online', ui); window.addEventListener('offline', ui);
  $('#log').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return; var c = cur();
    if (b.hasAttribute('data-copy-code')) copy(b.closest('.code').querySelector('code').textContent, b);
    else if (b.hasAttribute('data-copy')) { var idx = Array.prototype.indexOf.call($('#log').querySelectorAll('.msg'), b.closest('.msg')); if (c.messages[idx]) copy(c.messages[idx].content, b); }
    else if (b.hasAttribute('data-regen') && !busy) { c.messages.pop(); ask(c); }
    else if (b.hasAttribute('data-retry') && !busy) ask(c);
  });
  $('#exportBtn').onclick = function () {
    var c = cur(); if (!c || !c.messages.length) { alert('Nothing to export yet. Start a chat first.'); return; }
    var md = '# ' + c.title + '\n\n' + c.messages.map(function (m) { return '**' + (m.role === 'user' ? 'You' : st.set.name) + ':**\n\n' + m.content; }).join('\n\n---\n\n') + '\n';
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' })); a.download = c.title.replace(/[^\w-]+/g, '-').slice(0, 40) + '.md'; a.click(); URL.revokeObjectURL(a.href);
  };
  $('#model').onchange = function () { st.set.model = this.value; persist(); };

  var dlg = $('#dlg');
  $('#settingsBtn').onclick = function () { $('#sName').value = st.set.name; $('#sSys').value = st.set.system; $('#sTheme').value = st.set.theme; $('#sSave').checked = st.set.save; closeSide(); dlg.showModal(); };
  $('#resetSys').onclick = function () { $('#sSys').value = DEF_SYS; };
  $('#clearAll').onclick = function () { if (confirm('Delete all chats on this device? This cannot be undone.')) { st.convs = []; st.cur = null; persist(); ui(); } };
  $('#setForm').addEventListener('submit', function () {
    st.set.name = $('#sName').value.trim().slice(0, 30) || 'Alpha'; st.set.system = $('#sSys').value.trim() || DEF_SYS;
    st.set.theme = $('#sTheme').value; st.set.save = $('#sSave').checked;
    if (!st.set.save) st.convs = st.convs.filter(function (c) { return c.id === st.cur; });
    persist(); ui();
  });

  async function init() {
    ui();
    if (!API) { backend.note = 'Alpha is not connected to a server yet. Add your Worker URL in alpha-config.js (see ALPHA-SETUP.md).'; ui(); return; }
    try {
      var r = await fetch(API + '/api/models'); var j = await r.json();
      if (!r.ok) throw 0;
      if (!j.configured) { backend.note = 'The server is running but has no API key or models configured. See ALPHA-SETUP.md.'; }
      else {
        backend.ok = true;
        if (!j.models.includes(st.set.model)) st.set.model = j.models[0];
        if (j.models.length > 1) { var s = $('#model'); s.innerHTML = ''; j.models.forEach(function (m) { var o = document.createElement('option'); o.value = m; o.textContent = m; s.appendChild(o); }); s.value = st.set.model; s.hidden = false; }
      }
    } catch (e) { backend.note = 'Cannot reach the Alpha server. Check the Worker URL and its ALLOWED_ORIGIN setting.'; }
    ui();
  }
  init();
})();
