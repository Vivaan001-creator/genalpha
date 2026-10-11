// Small safe Markdown renderer: everything is HTML-escaped first, only http(s) links are allowed.
(function (root) {
  var esc = function (s) { return s.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function inline(s) {
    return s.replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer nofollow">$1</a>');
  }
  function render(src) {
    var blocks = [];
    var t = src.replace(/```(\w*)\n?([\s\S]*?)(```|$)/g, function (m, lang, code) {
      blocks.push('<div class="code"><div class="code-h"><span>' + esc(lang || 'code') + '</span><button type="button" data-copy-code>Copy code</button></div><pre><code>' + esc(code.replace(/\n$/, '')) + '</code></pre></div>');
      return '\u0000' + (blocks.length - 1) + '\u0000';
    });
    t = esc(t);
    var out = [], list = null, tbl = null, para = [];
    function flush() {
      if (para.length) { out.push('<p>' + inline(para.join('<br>')) + '</p>'); para = []; }
      if (list) { out.push('<' + list.t + '>' + list.i.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</' + list.t + '>'); list = null; }
      if (tbl) {
        out.push('<div class="tbl"><table>' + tbl.map(function (r, i) {
          return '<tr>' + r.map(function (c) { var k = i ? 'td' : 'th'; return '<' + k + '>' + inline(c) + '</' + k + '>'; }).join('') + '</tr>';
        }).join('') + '</table></div>');
        tbl = null;
      }
    }
    t.split('\n').forEach(function (ln) {
      var m;
      if (/^\s*$/.test(ln)) return flush();
      if (/^\u0000\d+\u0000$/.test(ln.trim())) { flush(); return out.push(ln.trim()); }
      if ((m = ln.match(/^(#{1,4})\s+(.*)/))) { flush(); var n = m[1].length + 1; return out.push('<h' + n + '>' + inline(m[2]) + '</h' + n + '>'); }
      if ((m = ln.match(/^\s*([-*]|\d+\.)\s+(.*)/))) {
        var ty = /\d/.test(m[1]) ? 'ol' : 'ul';
        if (para.length || tbl || (list && list.t !== ty)) flush();
        list = list || { t: ty, i: [] }; return list.i.push(m[2]);
      }
      if (/^\s*\|.*\|\s*$/.test(ln)) {
        if (para.length || list) flush();
        var cells = ln.trim().slice(1, -1).split('|').map(function (c) { return c.trim(); });
        if (cells.every(function (c) { return /^:?-{2,}:?$/.test(c); })) return;
        tbl = tbl || []; return tbl.push(cells);
      }
      if (list || tbl) flush();
      para.push(ln);
    });
    flush();
    return out.join('').replace(/\u0000(\d+)\u0000/g, function (m, i) { return blocks[i]; });
  }
  root.AlphaMD = { render: render };
  if (typeof module !== 'undefined') module.exports = root.AlphaMD;
})(typeof window !== 'undefined' ? window : globalThis);
