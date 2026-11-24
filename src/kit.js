'use strict';
/* Shared toolkit: UI controls, canvas helpers, plots, quiz, a planar quadrotor model. */
const K = { lessons: [] };
(function () {
  const root = document.documentElement;
  K.add = L => K.lessons.push(L);
  /* public (open-source) build: build.py --public sets window.FC_PUBLIC before this file runs.
     K.ours(html, alt): content that only the full build shows; the public build shows alt (default nothing). */
  K.PUBLIC = typeof window !== 'undefined' && window.FC_PUBLIC === true;
  K.ours = (html, alt) => K.PUBLIC ? (alt || '') : html;
  K.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  K.deg = r => r * 180 / Math.PI;
  K.rad = d => d * Math.PI / 180;
  K.g = 9.81;
  K.randn = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  K.col = function () {
    const s = getComputedStyle(root), g = n => s.getPropertyValue(n).trim();
    return { bg: g('--bg'), panel: g('--panel'), ink: g('--ink'), soft: g('--soft'), line: g('--line'), grid: g('--grid'),
      acc: g('--accent'), b: g('--b'), warn: g('--warn'), bad: g('--bad'), ok: g('--ok'), tint: g('--tint') };
  };
  K.h = function (html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  /* animation loops, stopped when the lesson changes */
  K.loops = new Set();
  K.loop = function (fn) {
    const L = { on: true, last: null };
    const f = ts => {
      if (!L.on) return;
      if (L.last == null) L.last = ts;
      let dt = (ts - L.last) / 1000; L.last = ts;
      if (dt > 0.05) dt = 0.05;
      if (!document.hidden && dt > 0) fn(dt);
      L.raf = requestAnimationFrame(f);
    };
    L.raf = requestAnimationFrame(f);
    L.stop = () => { L.on = false; cancelAnimationFrame(L.raf); };
    K.loops.add(L); return L;
  };
  K.stopAll = () => { K.loops.forEach(l => l.stop()); K.loops.clear(); };
  K.sub = (dt, h, fn) => { const n = Math.max(1, Math.round(dt / h)); const hh = dt / n; for (let i = 0; i < n; i++) fn(hh); };

  /* controls */
  K.slider = function (parent, o) {
    const w = K.h(`<div class="ctl"><label for="${o.id}"><span>${o.label}</span><output for="${o.id}"></output></label><input type="range" id="${o.id}" min="${o.min}" max="${o.max}" step="${o.step}" value="${o.value}"></div>`);
    parent.appendChild(w);
    const inp = w.querySelector('input'), out = w.querySelector('output');
    const fmt = o.fmt || (v => String(v));
    const api = { el: w, v: +inp.value };
    const upd = fire => { api.v = +inp.value; out.textContent = fmt(api.v); if (fire && o.on) o.on(api.v); };
    inp.addEventListener('input', () => upd(true)); upd(false);
    api.set = v => { inp.value = v; upd(true); };
    return api;
  };
  K.seg = function (parent, o) {
    const w = K.h(`<div class="ctl seg-wrap"><span class="lab">${o.label}</span><div class="seg" role="group" aria-label="${o.label}"></div></div>`);
    const box = w.querySelector('.seg');
    const api = { el: w, v: String(o.value) };
    const paint = () => box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === api.v)));
    o.options.forEach(([v, l]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = l; b.dataset.v = String(v);
      b.addEventListener('click', () => api.set(v)); box.appendChild(b);
    });
    api.set = v => { api.v = String(v); paint(); if (o.on) o.on(api.v); };
    paint(); parent.appendChild(w); return api;
  };
  K.btn = function (parent, label, fn, cls) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn' + (cls ? ' ' + cls : ''); b.textContent = label;
    b.addEventListener('click', fn); parent.appendChild(b); return b;
  };
  K.demo = function (el, tag, title, hint) {
    const d = K.h(`<div class="demo"><div class="demo-head"><span class="tag">${tag}</span><h3>${title}</h3>${hint ? `<p>${hint}</p>` : ''}</div></div>`);
    el.appendChild(d); return d;
  };
  K.box = function (parent, cls, html) { const e = K.h(`<div class="${cls}">${html || ''}</div>`); parent.appendChild(e); return e; };

  /* canvas with device-pixel-ratio handling; draw in CSS pixels */
  K.canvas = function (parent, ratio, minH) {
    const wrap = document.createElement('div'); wrap.className = 'cv';
    const cv = document.createElement('canvas'); wrap.appendChild(cv); parent.appendChild(wrap);
    const o = { cv, wrap, ctx: cv.getContext('2d'), w: 0, h: 0 };
    o.fit = function () {
      const w = wrap.clientWidth || 600, h = Math.max(minH || 0, Math.round(w * ratio)), d = window.devicePixelRatio || 1;
      if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); cv.style.height = h + 'px'; }
      o.ctx.setTransform(d, 0, 0, d, 0, 0); o.w = w; o.h = h;
      const c = K.col(); o.ctx.fillStyle = c.bg; o.ctx.fillRect(0, 0, w, h);
      return o;
    };
    o.fit(); return o;
  };
  /* world (metres, z up) -> screen mapping with equal scale */
  K.view = function (W, H, x0, x1, z0, z1, pad) {
    pad = pad == null ? 12 : pad;
    const s = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (z1 - z0));
    const ox = (W - s * (x1 - x0)) / 2, oy = (H - s * (z1 - z0)) / 2;
    return { s, X: x => ox + (x - x0) * s, Y: z => H - oy - (z - z0) * s, x0, x1, z0, z1,
      ix: px => x0 + (px - ox) / s, iz: py => z0 + (H - oy - py) / s };
  };
  K.grid = function (ctx, v, c, step) {
    step = step || 1;
    ctx.save(); ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
    for (let x = Math.ceil(v.x0 / step) * step; x <= v.x1 + 1e-9; x += step) { ctx.beginPath(); ctx.moveTo(v.X(x), v.Y(v.z0)); ctx.lineTo(v.X(x), v.Y(v.z1)); ctx.stroke(); }
    for (let z = Math.ceil(v.z0 / step) * step; z <= v.z1 + 1e-9; z += step) { ctx.beginPath(); ctx.moveTo(v.X(v.x0), v.Y(z)); ctx.lineTo(v.X(v.x1), v.Y(z)); ctx.stroke(); }
    ctx.strokeStyle = c.soft; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(v.X(v.x0), v.Y(0)); ctx.lineTo(v.X(v.x1), v.Y(0)); ctx.stroke();
    ctx.fillStyle = c.soft; ctx.font = '11px ' + 'ui-monospace, monospace'; ctx.textAlign = 'right'; ctx.fillText('网格 1 m', v.X(v.x1) - 6, v.Y(v.z0) - 6);
    ctx.restore();
  };
  K.arrow = function (ctx, x1, y1, x2, y2, color, w) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy); if (L < 2) return;
    const ux = dx / L, uy = dy / L, hl = Math.min(10, L * 0.4);
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w || 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - ux * hl * 0.6, y2 - uy * hl * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - ux * hl - uy * hl * 0.5, y2 - uy * hl + ux * hl * 0.5); ctx.lineTo(x2 - ux * hl + uy * hl * 0.5, y2 - uy * hl - ux * hl * 0.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  K.text = function (ctx, s, x, y, color, font, align) {
    ctx.save(); ctx.fillStyle = color; ctx.font = font || '12px "Noto Sans SC", sans-serif'; ctx.textAlign = align || 'left'; ctx.fillText(s, x, y); ctx.restore();
  };
  /* side view of a quadrotor; th > 0 tilts right (clockwise on screen) */
  K.drawQuad = function (ctx, sx, sy, th, s, o) {
    o = o || {}; const c = K.col(); const col = o.color || c.ink;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(th); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    const L = 0.25 * s, lw = Math.max(2, s * 0.025);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    if (o.arm) {
      const l = o.arm.len * s, ph = o.arm.phi;
      ctx.save(); ctx.strokeStyle = o.arm.color || c.warn; ctx.fillStyle = o.arm.color || c.warn; ctx.lineWidth = lw * 1.2;
      ctx.beginPath(); ctx.moveTo(0, 0.03 * s); ctx.lineTo(Math.sin(ph) * l, 0.03 * s + Math.cos(ph) * l); ctx.stroke();
      ctx.beginPath(); ctx.arc(Math.sin(ph) * l, 0.03 * s + Math.cos(ph) * l, lw * 2.2, 0, 7); ctx.fill(); ctx.restore();
    }
    ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L, 0); ctx.stroke();
    ctx.fillRect(-0.07 * s, -0.035 * s, 0.14 * s, 0.07 * s);
    [-L, L].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, -0.05 * s); ctx.stroke();
      ctx.save(); ctx.globalAlpha *= 0.45; ctx.beginPath(); ctx.ellipse(px, -0.06 * s, 0.12 * s, 0.016 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });
    if (o.thrust) {
      const [fl, fr] = o.thrust, tc = o.thrustColor || c.acc;
      [[-L, fl], [L, fr]].forEach(([px, f]) => { if (f > 0.01) K.arrow(ctx, px, -0.09 * s, px, -0.09 * s - f * 0.55 * s, tc, 2.5); });
    }
    if (o.label) { ctx.rotate(-th); K.text(ctx, o.label, 0, 0.2 * s + 6, col, '600 12px "Noto Sans SC", sans-serif', 'center'); }
    ctx.restore();
  };

  /* time-series buffer and plot */
  K.buf = function (win) {
    const b = { d: [], win };
    b.push = (t, ...v) => { b.d.push([t, ...v]); while (b.d.length && b.d[0][0] < t - win) b.d.shift(); };
    b.clear = () => { b.d.length = 0; };
    return b;
  };
  K.ticks = function (a, b, n) {
    const span = b - a; if (span <= 0) return [a];
    const s0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(s0))), r = s0 / mag;
    const step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag, out = [];
    for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  };
  K.nf = v => v === 0 ? '0' : Math.abs(v) >= 10 ? v.toFixed(0) : Math.abs(v) >= 1 ? (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)) : v.toFixed(2);
  /* o: {x:[t0,t1], y:[y0,y1], title, unit, series:[{buf|pts, i, color, dash, w, label}], hl:[{v,color,label}], xlab} */
  K.plot = function (ctx, x, y, w, h, o) {
    const c = K.col();
    ctx.save();
    const pl = x + 46, pr = x + w - 10, pt = y + 24, pb = y + h - 22;
    const [t0, t1] = o.x, [y0, y1] = o.y;
    const X = t => pl + (t - t0) / (t1 - t0) * (pr - pl), Y = v => pb - (K.clamp(v, y0, y1) - y0) / (y1 - y0) * (pb - pt);
    ctx.fillStyle = c.panel; ctx.fillRect(x, y, w, h);
    ctx.font = '11px "JetBrains Mono", ui-monospace, monospace'; ctx.lineWidth = 1;
    K.ticks(y0, y1, 4).forEach(v => {
      ctx.strokeStyle = v === 0 ? c.line : c.grid; ctx.beginPath(); ctx.moveTo(pl, Y(v)); ctx.lineTo(pr, Y(v)); ctx.stroke();
      ctx.fillStyle = c.soft; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(K.nf(v), pl - 6, Y(v));
    });
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    K.ticks(t0, t1, 5).forEach(t => { ctx.fillStyle = c.soft; ctx.fillText(o.xfmt ? o.xfmt(t) : K.nf(t), X(t), pb + 5); });
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = c.ink; ctx.font = '500 12.5px "Noto Sans SC", sans-serif';
    ctx.fillText(o.title + (o.unit ? '（' + o.unit + '）' : ''), pl, y + 15);
    let lx = pr;
    ctx.textAlign = 'right'; ctx.font = '12px "Noto Sans SC", sans-serif';
    (o.series || []).slice().reverse().forEach(s => {
      if (!s.label) return;
      const tw = ctx.measureText(s.label).width;
      ctx.fillStyle = c.soft; ctx.fillText(s.label, lx, y + 15);
      ctx.strokeStyle = s.color; ctx.lineWidth = 2.5; ctx.setLineDash(s.dash || []);
      ctx.beginPath(); ctx.moveTo(lx - tw - 22, y + 11); ctx.lineTo(lx - tw - 6, y + 11); ctx.stroke(); ctx.setLineDash([]);
      lx -= tw + 34;
    });
    (o.hl || []).forEach(l => {
      ctx.strokeStyle = l.color; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(pl, Y(l.v)); ctx.lineTo(pr, Y(l.v)); ctx.stroke(); ctx.setLineDash([]);
      if (l.label) { ctx.fillStyle = l.color; ctx.textAlign = 'left'; ctx.font = '11px "Noto Sans SC", sans-serif'; ctx.fillText(l.label, pl + 4, Y(l.v) - 4); }
    });
    ctx.save(); ctx.beginPath(); ctx.rect(pl, pt - 2, pr - pl, pb - pt + 4); ctx.clip();
    (o.series || []).forEach(s => {
      const pts = s.pts || (s.buf ? s.buf.d : []); if (!pts.length) return;
      ctx.strokeStyle = s.color; ctx.lineWidth = s.w || 2; ctx.setLineDash(s.dash || []); ctx.lineJoin = 'round';
      ctx.beginPath(); let first = true;
      for (const p of pts) { const v = p[s.i == null ? 1 : s.i]; if (v == null || !isFinite(v)) { first = true; continue; } const px = X(p[0]), py = Y(v); if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py); }
      ctx.stroke(); ctx.setLineDash([]);
    });
    ctx.restore();
    ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.strokeRect(pl, pt - 2, pr - pl, pb - pt + 4);
    ctx.restore();
    return { X, Y, pl, pr, pt, pb };
  };
  K.win = (t, w) => [Math.max(0, t - w), Math.max(w, t)];

  /* quiz + progress */
  K.progress = (() => { try { return JSON.parse(localStorage.getItem('fc-course-v1') || '{}') || {}; } catch (e) { return {}; } })();
  K.markDone = id => { K.progress[id] = 1; try { localStorage.setItem('fc-course-v1', JSON.stringify(K.progress)); } catch (e) { } if (K.onProgress) K.onProgress(); };
  K.quiz = function (parent, lid, qs) {
    const box = K.h('<div class="quiz"></div>');
    const st = K.h('<p class="quiz-state"></p>');
    const check = () => {
      const n = box.querySelectorAll('.q[data-done]').length;
      if (n === qs.length) { st.textContent = '全部答对，这一课完成了。可以进入下一课。'; st.classList.add('done'); K.markDone(lid); }
      else st.textContent = `已答对 ${n} / ${qs.length} 题。`;
    };
    qs.forEach((q, qi) => {
      const it = K.h(`<div class="q"><p><b>${qi + 1}.</b> ${q.q}</p><div class="opts"></div><p class="expl" hidden></p></div>`);
      const opts = it.querySelector('.opts'), ex = it.querySelector('.expl');
      q.o.forEach((t, oi) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.innerHTML = t;
        b.addEventListener('click', () => {
          opts.querySelectorAll('.opt').forEach(x => x.classList.remove('right', 'wrong'));
          const ok = oi === q.a; b.classList.add(ok ? 'right' : 'wrong'); ex.hidden = false;
          ex.innerHTML = ok ? '<b class="okt">对。</b>' + q.e : '<b class="badt">不对。</b>' + (q.h || '再想想上面讲的内容。');
          if (ok) { it.dataset.done = '1'; check(); }
        });
        opts.appendChild(b);
      });
      box.appendChild(it);
    });
    box.appendChild(st); check(); parent.appendChild(box);
  };


  /* ---------- visual helpers: inline-SVG diagrams (K.S), figures, step-through walkthroughs, collapsible details ----------
     Colours come from page CSS classes (sv-*), so every diagram follows the light / dark theme. */
  let sid = 0;
  const esc = t => String(t == null ? '' : t);
  K.S = {
    /* wrap a body in an <svg>; in the body, write marker-end="url(#AH-acc)" etc. (soft, acc, warn, b, bad, ink) */
    svg(w, h, body, label) {
      const id = 'sv' + (++sid);
      const mk = ['soft', 'acc', 'warn', 'b', 'bad', 'ink'].map(c => `<marker id="${id}-${c}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="sv-f-${c}"/></marker>`).join('');
      return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}"><defs>${mk}</defs>${body.replace(/#AH-(\w+)/g, (m, c) => '#' + id + '-' + c)}</svg>`;
    },
    /* box with a title t and optional subtitle s; cls: '' | 'hl' | 'px' | 'b' | 'dim' | 'on' (space separated) */
    box(x, y, w, h, t, s, cls) {
      const cy = y + h / 2, lines = esc(t).split('\n'), n = lines.length + (s ? 1 : 0), y0 = cy - (n - 1) * 8 + 5;
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="sv-box ${cls || ''}"/>` +
        lines.map((l, i) => `<text x="${x + w / 2}" y="${y0 + i * 17}" text-anchor="middle" class="sv-t">${l}</text>`).join('') +
        (s ? `<text x="${x + w / 2}" y="${y0 + lines.length * 17}" text-anchor="middle" class="sv-s">${s}</text>` : '');
    },
    /* arrow from (x1,y1) to (x2,y2); o: {c: colour, label, dash, side: 'above'|'below'|'left'|'right', w} */
    arrow(x1, y1, x2, y2, o) {
      o = o || {}; const c = o.c || 'soft', mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      let lab = '';
      if (o.label) {
        const side = o.side || 'above', dx = side === 'left' ? -6 : side === 'right' ? 6 : 0, dy = side === 'below' ? 15 : side === 'above' ? -6 : 4;
        lab = `<text x="${mx + dx}" y="${my + dy}" text-anchor="${side === 'left' ? 'end' : side === 'right' ? 'start' : 'middle'}" class="sv-s ${o.lc || ''}">${o.label}</text>`;
      }
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="sv-l-${c}"${o.dash ? ' stroke-dasharray="5 4"' : ''}${o.w ? ` style="stroke-width:${o.w}"` : ''} marker-end="url(#AH-${c})"/>` + lab;
    },
    /* polyline arrow through points [[x,y],...] */
    path(pts, o) {
      o = o || {}; const c = o.c || 'soft';
      return `<polyline points="${pts.map(p => p.join(',')).join(' ')}" class="sv-l-${c}"${o.dash ? ' stroke-dasharray="5 4"' : ''} marker-end="url(#AH-${c})"/>` +
        (o.label ? `<text x="${o.lx}" y="${o.ly}" text-anchor="${o.anchor || 'middle'}" class="sv-s">${o.label}</text>` : '');
    },
    text(x, y, t, cls, anchor) { return `<text x="${x}" y="${y}" text-anchor="${anchor || 'middle'}" class="${cls || 'sv-s'}">${t}</text>`; },
    /* side-view quadrotor centred at (cx,cy); th: tilt in degrees (+ = leans right); s: half-span in px;
       o: {fl, fr: thrust arrow lengths in px for left / right rotor, c: colour class suffix, label} */
    quad(cx, cy, th, s, o) {
      o = o || {}; const c = o.c || 'ink', r = s * 0.42;
      let b = `<g transform="translate(${cx} ${cy}) rotate(${th})">` +
        `<line x1="${-s}" y1="0" x2="${s}" y2="0" class="sv-l-${c}" style="stroke-width:3"/>` +
        `<rect x="${-s * 0.22}" y="${-s * 0.11}" width="${s * 0.44}" height="${s * 0.22}" rx="3" class="sv-fill-${c}"/>` +
        [-s, s].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="${-s * 0.16}" class="sv-l-${c}" style="stroke-width:2.5"/><ellipse cx="${x}" cy="${-s * 0.19}" rx="${r}" ry="${s * 0.05}" class="sv-fill-${c}" opacity=".35"/>`).join('');
      if (o.fl) b += `<line x1="${-s}" y1="${-s * 0.3}" x2="${-s}" y2="${-s * 0.3 - o.fl}" class="sv-l-acc" style="stroke-width:2.5" marker-end="url(#AH-acc)"/>`;
      if (o.fr) b += `<line x1="${s}" y1="${-s * 0.3}" x2="${s}" y2="${-s * 0.3 - o.fr}" class="sv-l-acc" style="stroke-width:2.5" marker-end="url(#AH-acc)"/>`;
      b += '</g>';
      if (o.label) b += `<text x="${cx}" y="${cy + s * 0.5 + 12}" text-anchor="middle" class="sv-s">${o.label}</text>`;
      return b;
    },
  };
  /* static line chart inside an svg body: o = {x:[x0,x1], y:[y0,y1], title, xlab, ylab, xt:[ticks], yt:[ticks],
     series:[{pts:[[x,y],...], c:'acc'|'warn'|'b'|'bad'|'soft', dash, label}], hl:[{v, label, c}]} */
  K.S.plot = function (X0, Y0, W, H, o) {
    const pl = X0 + 44, pr = X0 + W - 8, pt = Y0 + 26, pb = Y0 + H - 26;
    const sx = v => pl + (v - o.x[0]) / (o.x[1] - o.x[0]) * (pr - pl), sy = v => pb - (Math.max(o.y[0], Math.min(o.y[1], v)) - o.y[0]) / (o.y[1] - o.y[0]) * (pb - pt);
    let b = `<rect x="${pl}" y="${pt}" width="${pr - pl}" height="${pb - pt}" class="sv-box"/>`;
    (o.yt || K.ticks(o.y[0], o.y[1], 4)).forEach(v => { b += `<line x1="${pl}" y1="${sy(v)}" x2="${pr}" y2="${sy(v)}" class="sv-l-grid"/><text x="${pl - 5}" y="${sy(v) + 4}" text-anchor="end" class="sv-s">${K.nf(v)}</text>`; });
    (o.xt || K.ticks(o.x[0], o.x[1], 5)).forEach(v => { b += `<text x="${sx(v)}" y="${pb + 15}" text-anchor="middle" class="sv-s">${K.nf(v)}${o.xu || ''}</text>`; });
    (o.hl || []).forEach(l => { b += `<line x1="${pl}" y1="${sy(l.v)}" x2="${pr}" y2="${sy(l.v)}" class="sv-l-${l.c || 'soft'}" stroke-dasharray="4 4" style="stroke-width:1.2"/>` + (l.label ? `<text x="${pr - 4}" y="${sy(l.v) - 4}" text-anchor="end" class="sv-s ${l.c || ''}">${l.label}</text>` : ''); });
    (o.series || []).forEach(se => { b += `<polyline points="${se.pts.map(p => sx(p[0]).toFixed(1) + ',' + sy(p[1]).toFixed(1)).join(' ')}" class="sv-l-${se.c || 'acc'}"${se.dash ? ' stroke-dasharray="6 4"' : ''}/>`; });
    if (o.title) b += `<text x="${pl}" y="${Y0 + 15}" text-anchor="start" class="sv-t" style="font-size:13px">${o.title}</text>`;
    let lx = pr; (o.series || []).slice().reverse().forEach(se => { if (!se.label) return; const tw = [...se.label].reduce((w, ch) => w + (ch.charCodeAt(0) > 255 ? 12.5 : 7), 0) + 4; b += `<text x="${lx}" y="${Y0 + 15}" text-anchor="end" class="sv-s">${se.label}</text><line x1="${lx - tw - 18}" y1="${Y0 + 11}" x2="${lx - tw - 4}" y2="${Y0 + 11}" class="sv-l-${se.c || 'acc'}"${se.dash ? ' stroke-dasharray="4 3"' : ''}/>`; lx -= tw + 26; });
    return b;
  };
  /* figure HTML (for use inside a lesson's innerHTML template) */
  K.fig = (svg, cap, cls) => `<figure class="svgfig ${cls || ''}">${svg}${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
  /* collapsible "more detail" block */
  K.more = (summary, html) => `<details class="more"><summary>${summary}</summary><div class="more-body">${html}</div></details>`;
  /* step-through walkthrough: o = {title, steps: [{svg, t}]}; each step shows its own diagram + one short text */
  K.steps = function (parent, o) {
    const w = K.h(`<div class="steps"><div class="steps-head"><span class="tag">一步一步看</span><h3>${o.title}</h3></div><div class="steps-fig"></div><div class="steps-text"></div><div class="steps-nav"><button type="button" class="btn">← 上一步</button><span class="steps-dots"></span><button type="button" class="btn primary">下一步 →</button></div></div>`);
    parent.appendChild(w);
    const fig = w.querySelector('.steps-fig'), tx = w.querySelector('.steps-text'), dots = w.querySelector('.steps-dots');
    const [bp, bn] = w.querySelectorAll('.steps-nav button');
    let i = 0;
    const show = () => {
      const st = o.steps[i]; fig.innerHTML = st.svg || ''; tx.innerHTML = `<b class="steps-n">${i + 1} / ${o.steps.length}</b> ${st.t}`;
      dots.innerHTML = o.steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
      bp.disabled = i === 0; bn.disabled = i === o.steps.length - 1;
    };
    bp.addEventListener('click', () => { if (i > 0) { i--; show(); } });
    bn.addEventListener('click', () => { if (i < o.steps.length - 1) { i++; show(); } });
    show(); return w;
  };

  /* planar quadrotor (side view). th > 0: tilted toward +x. Two rotors at +-L. */
  K.Quad = class {
    constructor(o) {
      o = o || {};
      this.m = o.m || 2.74; this.L = 0.25; this.I = o.I || 0.03; this.tau = 0.03;
      this.Tmax = o.Tmax || 1.95 * 2.74 * K.g;
      this.reset(o.x || 0, o.z == null ? 2 : o.z);
    }
    reset(x, z) { Object.assign(this, { x, z, vx: 0, vz: 0, th: 0, w: 0, T: this.m * K.g, M: 0, ax: 0, az: 0, al: 0, ground: false }); }
    hoverT(m) { return (m || this.m) * K.g; }
    /* Tc: commanded total thrust (N); Mc: commanded torque (N m, + tilts toward +x); F: external force; Mx: external torque; mTot: mass for translation */
    step(dt, Tc, Mc, F, Mx, mTot) {
      const a = Math.min(1, dt / this.tau);
      Tc = K.clamp(Tc, 0, this.Tmax); this.T += (Tc - this.T) * a;
      const Mm = this.L * Math.max(0.3, Math.min(this.T, this.Tmax - this.T));
      Mc = K.clamp(Mc, -Mm, Mm); this.M += (Mc - this.M) * a;
      const m = mTot || this.m; F = F || [0, 0];
      this.ax = (this.T * Math.sin(this.th) + F[0]) / m;
      this.az = (this.T * Math.cos(this.th) + F[1]) / m - K.g;
      this.al = (this.M + (Mx || 0)) / this.I;
      this.vx += this.ax * dt; this.vz += this.az * dt; this.w += this.al * dt;
      this.x += this.vx * dt; this.z += this.vz * dt; this.th += this.w * dt;
      if (this.z < 0) { this.z = 0; if (this.vz < 0) this.vz = 0; this.vx *= 0.97; this.w *= 0.9; this.th *= 0.96; this.ground = true; } else this.ground = false;
    }
  };
  /* attitude + rate loop (what PX4 does inside): returns torque command */
  K.att = (q, thd, si, ff) => { si = si || 1; const wd = K.clamp(8 * si * (thd - q.th), -7, 7); return q.I * 25 * si * (wd - q.w) + (ff || 0); };
  /* force vector -> thrust + tilt (geometric way) */
  K.geo = (q, Fx, Fz, maxTilt) => {
    maxTilt = maxTilt || K.rad(60);
    if (Fz < 0.1) Fz = 0.1;
    const thd = K.clamp(Math.atan2(Fx, Fz), -maxTilt, maxTilt);
    const T = Math.max(0, Fx * Math.sin(q.th) + Fz * Math.cos(q.th));
    return [T, thd];
  };
})();
