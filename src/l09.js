K.add({ id: 'l9', num: 10, title: '带机械臂飞行', sub: '手臂一动，重心和反作用力怎么扰动机身', render(el) {
const S = K.S;
/* the demo's model: body 2.2 kg, arm = massless rod 0.4 m + 0.5 kg point mass at the tip; rotors at +-0.25 m */
const mb = 2.2, ma = 0.5, la = 0.4, MT = mb + ma, Kp = 3, Kd = 3.5;

/* local drawing helpers: a hovering quad with the arm hanging below (phi in degrees, 0 = straight down, + = toward the right) */
const tipOf = (cx, cy, phi, Lp) => [cx + Lp * Math.sin(K.rad(phi)), cy + 6 + Lp * Math.cos(K.rad(phi))];
function armQuad(cx, cy, phi, s, Lp, o) {
  o = o || {}; const [tx, ty] = tipOf(cx, cy, phi, Lp);
  return S.quad(cx, cy, 0, s, { fl: o.fl, fr: o.fr }) +
    `<line x1="${cx}" y1="${cy + 6}" x2="${tx}" y2="${ty}" class="sv-l-warn" style="stroke-width:4"/>` +
    `<circle cx="${tx}" cy="${ty}" r="8" class="sv-fill-warn"/>`;
}
/* curved arrow: arc of radius r around (cx,cy) from angle a0 to a1 (degrees, screen angles, clockwise positive) */
function arc(cx, cy, r, a0, a1, c) {
  const p = a => [cx + r * Math.cos(K.rad(a)), cy + r * Math.sin(K.rad(a))], [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 ${a1 > a0 ? 1 : 0} ${x1.toFixed(1)} ${y1.toFixed(1)}" class="sv-l-${c}" marker-end="url(#AH-${c})"/>`;
}

/* figure 1: centre-of-mass offset with numbers (arm 0.5 kg, 0.4 m, held at 60 deg) */
const W1 = ma * K.g, lev1 = la * Math.sin(K.rad(60)), tq1 = W1 * lev1, d1 = tq1 / (2 * 0.25), h1 = MT * K.g / 2;
const [t1x, t1y] = tipOf(230, 140, 60, 160);
const figCoM = S.svg(820, 330,
  armQuad(230, 140, 60, 100, 160, { fl: (h1 - d1) * 5, fr: (h1 + d1) * 5 }) +
  S.text(130, 22, (h1 - d1).toFixed(1) + ' N', 'sv-n') + S.text(330, 22, (h1 + d1).toFixed(1) + ' N', 'sv-n') +
  S.arrow(t1x, t1y + 10, t1x, t1y + 80, { c: 'bad', w: 2.6 }) + S.text(t1x + 10, t1y + 60, '重力 ' + W1.toFixed(1) + ' N', 'sv-s bad', 'start') +
  `<path d="M${230} ${t1y - 40} A40 40 0 0 0 ${230 + 40 * Math.sin(K.rad(60))} ${146 + 40 * Math.cos(K.rad(60))}" class="sv-l-ink" style="stroke-width:1.2"/>` + S.text(244, 214, '60°', 'sv-s', 'start') +
  `<line x1="230" y1="146" x2="230" y2="312" class="sv-l-grid" stroke-dasharray="4 4"/>` +
  `<line x1="230" y1="300" x2="${t1x}" y2="300" class="sv-l-ink" style="stroke-width:1.2" marker-start="url(#AH-ink)" marker-end="url(#AH-ink)"/>` +
  S.text((230 + t1x) / 2, 322, '力臂 0.4 × sin 60° = ' + lev1.toFixed(2) + ' m', 'sv-s') +
  S.text(470, 70, '① 手臂的重力：0.5 kg × 9.81 = ' + W1.toFixed(1) + ' N', 'sv-t', 'start') +
  S.text(470, 108, '② 栽倒力矩 = 力 × 力臂（第 1 课）', 'sv-t', 'start') +
  S.text(490, 130, '= ' + W1.toFixed(1) + ' × ' + lev1.toFixed(2) + ' = ' + tq1.toFixed(2) + ' N·m', 'sv-n', 'start') +
  S.text(470, 168, '③ 每个桨离中心 0.25 m，要顶住这个力矩：', 'sv-t', 'start') +
  S.text(490, 190, tq1.toFixed(2) + ' ÷ 0.25 = 两桨差 ' + (2 * d1).toFixed(1) + ' N', 'sv-n', 'start') +
  S.text(470, 228, '④ 悬停时每个桨本来推 ' + h1.toFixed(1) + ' N（2.7 kg 的一半）', 'sv-t', 'start') +
  S.text(490, 250, '手臂这侧 ' + (h1 + d1).toFixed(1) + ' N，另一侧 ' + (h1 - d1).toFixed(1) + ' N', 'sv-n', 'start'),
  '手臂伸到 60° 停住：手臂的重量偏在一侧，产生持续的栽倒力矩');

/* figure 2: reaction force and reaction torque (schematic) */
const [t2x, t2y] = tipOf(190, 110, 30, 130), tg = [Math.cos(K.rad(30)), -Math.sin(K.rad(30))];
const figReact = S.svg(820, 290,
  S.text(190, 22, '反作用力：手臂加速', 'sv-t') +
  armQuad(190, 110, 30, 80, 130) +
  S.arrow(t2x + 12 * tg[0], t2y + 12 * tg[1], t2x + 80 * tg[0], t2y + 80 * tg[1], { c: 'warn', w: 2.6 }) +
  S.text(t2x + 86 * tg[0] + 6, t2y + 86 * tg[1], '手臂往前上方加速', 'sv-s warn', 'start') +
  S.arrow(180, 112, 180 - 66 * tg[0], 112 - 66 * tg[1], { c: 'bad', w: 2.6 }) +
  S.text(60, 155, '机身被往反方向推', 'sv-s bad') +
  S.text(190, 275, '力 = −手臂质量 × 手臂的加速度（牛顿第三定律）', 'sv-s') +
  `<line x1="410" y1="20" x2="410" y2="280" class="sv-l-grid"/>` +
  S.text(620, 22, '反扭矩：关节转动', 'sv-t') +
  armQuad(620, 110, 30, 80, 130) +
  arc(620, 116, 34, 125, 72, 'warn') + S.text(560, 175, '舵机拧手臂', 'sv-s warn', 'end') +
  arc(620, 110, 46, -160, -100, 'bad') + S.text(568, 58, '同时反向拧机身', 'sv-s bad', 'end') +
  S.text(620, 275, '另外手臂重力那一项（左图）也算在这个力矩里', 'sv-s'),
  '手臂动起来以后多出的两种影响：力和力矩，方向都和手臂的动作相反');

/* figure 3: the three ways to handle it, as block diagrams */
function row(y0, title, res, comp) {
  const cy = y0 + 100;
  let b = S.text(10, y0 + 18, title, 'sv-t', 'start') + S.text(810, y0 + 18, res, 'sv-s', 'end') +
    S.box(10, cy - 20, 80, 40, '参考', '') + S.arrow(90, cy, 128, cy) +
    S.box(130, cy - 25, 140, 50, '位置控制器', '第 2、3 课', 'hl') +
    `<circle cx="420" cy="${cy}" r="12" class="sv-box"/>` + S.text(420, cy + 5, '+', 'sv-t') +
    S.arrow(432, cy, 478, cy) + S.box(480, cy - 25, 140, 50, '飞机', '机身 + 手臂') +
    S.arrow(620, cy, 700, cy, { label: '位置' }) +
    S.box(380, y0 + 140, 80, 34, '手臂', '', 'px') + S.arrow(420, y0 + 140, 420, cy + 14, { c: 'bad' }) + S.text(428, y0 + 132, '力 + 力矩', 'sv-s bad', 'start') +
    S.path([[660, cy], [660, y0 + 188], [200, y0 + 188], [200, cy + 27]], {}) + S.text(560, y0 + 184, '测到的位置', 'sv-s');
  if (comp) {
    b += `<circle cx="330" cy="${cy}" r="12" class="sv-box hl"/>` + S.text(330, cy + 5, '−', 'sv-t') + S.arrow(270, cy, 316, cy) + S.arrow(342, cy, 406, cy);
    b += comp;
  } else b += S.arrow(270, cy, 406, cy);
  return b;
}
const figWays = S.svg(820, 600,
  row(0, '① 当成扰动不管', '等误差出现，控制器再慢慢顶回来', '') +
  row(200, '② 前馈补偿', '事先用公式算出来，提前抵消', S.box(130, 226, 180, 44, '手臂公式', '角度、角速度、角加速度', 'hl') + S.path([[310, 248], [330, 248], [330, 286]], { c: 'acc' })) +
  row(400, '③ 扰动观测器（第 8 课）', '从测到的加速度反推，总要晚一拍', S.box(470, 428, 160, 40, '观测器', '测到的 − 预期的加速度', 'hl') +
    S.path([[680, 500], [680, 448], [632, 448]], { c: 'acc' }) + S.path([[470, 448], [330, 448], [330, 486]], { c: 'acc' }) + S.text(400, 440, '估计值', 'sv-s acc')),
  '三种办法的区别在于“手臂的力从哪里知道”：不管、用公式事先算、事后从测量里估');

/* the demo's model run offline (same equations as the live demo below); noise of the observer from a fixed-seed generator */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function run(mode, swing, angle, dur) {
  const r = rng(1), gn = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const q = new K.Quad({ m: mb, x: 0, z: 2 }); q.Tmax = 1.95 * 2.74 * K.g; q.I = 0.03 + ma * la * la; q.reset(0, 2); q.T = MT * K.g;
  let t = 0, ph = 0, dph = 0, ddph = 0, dx = 0, dz = 0, dM = 0; const out = [];
  for (let n = 0; n < dur / 0.002; n++) {
    const h = 0.002; t += h;
    const tgt = swing ? K.rad(70) * Math.sin(2 * Math.PI * 0.7 * t) : K.rad(angle);
    ddph = 196 * (tgt - ph) - 2 * 0.9 * 14 * dph; dph += ddph * h; ph += dph * h;
    const pw = ph - q.th, dpw = dph - q.w, s = Math.sin(pw), co = Math.cos(pw);
    const F = [-ma * la * (ddph * co - dpw * dpw * s), -ma * la * (ddph * s + dpw * dpw * co)];
    const tau = ma * (la * la * ddph + la * (s * q.az + co * q.ax)) + ma * K.g * la * s;
    const ex = -q.x, ez = 2 - q.z; let Fx = MT * (Kp * ex - Kd * q.vx), Fz = MT * (K.g + Kp * ez - Kd * q.vz), Mff = 0;
    if (mode === 'ff') { Fx -= F[0]; Fz -= F[1]; Mff = -tau; }
    if (mode === 'dob') {
      const al = 1 - Math.exp(-2 * Math.PI * 8 * h);
      const rx = MT * (q.ax + 0.5 * gn()) - q.T * Math.sin(q.th), rz = MT * (q.az + K.g + 0.5 * gn()) - q.T * Math.cos(q.th), rM = q.I * (q.al + 5 * gn()) - q.M;
      dx += (rx - dx) * al; dz += (rz - dz) * al; dM += (rM - dM) * al; Fx -= dx; Fz -= dz; Mff = -dM;
    }
    const [T, thd] = K.geo(q, Fx, Fz, K.rad(45));
    q.step(h, T, K.att(q, thd, 1.5, Mff), F, tau, MT);
    if (n % 10 === 0) out.push([t, Math.hypot(ex, ez) * 100, q.x * 100, K.deg(q.th), K.deg(thd)]);
  }
  return out;
}
const SW = { none: run('none', 1, 0, 15), ff: run('ff', 1, 0, 15), dob: run('dob', 1, 0, 15) };
const avg = k => { const w = SW[k].filter(p => p[0] > 5); return w.reduce((s, p) => s + p[1], 0) / w.length; };
const still = run('none', 0, 60, 8), last = still[still.length - 1];
const win = k => SW[k].filter(p => p[0] >= 6 && p[0] <= 10).map(p => [p[0], p[1]]);
const figSwing = S.svg(820, 250, S.plot(0, 0, 800, 250, { title: '手臂来回挥动（±70°，0.7 Hz）时的位置误差', x: [6, 10], y: [0, 12], xu: ' s', yt: [0, 4, 8, 12],
  series: [{ pts: win('none'), c: 'bad', label: '不补偿' }, { pts: win('dob'), c: 'b', label: '观测器' }, { pts: win('ff'), c: 'acc', label: '前馈' }] }),
  '演示模型离线跑出的误差曲线');

/* walkthrough: the feed-forward for one arm state, with the demo's formulas (body level and not accelerating) */
const wP = 30, wdP = 4, wddP = 15, wsP = Math.sin(K.rad(wP)), wcP = Math.cos(K.rad(wP));
const aT = la * wddP, aC = la * wdP * wdP, arx = la * (wddP * wcP - wdP * wdP * wsP), arz = la * (wddP * wsP + wdP * wdP * wcP);
const Frx = -ma * arx, Frz = -ma * arz, tG = ma * K.g * la * wsP, tI = ma * la * la * wddP, tau = tG + tI;
const Fcx = -Frx, Fcz = MT * K.g - Frz, split = tau / (2 * 0.25), Tc = Fcz;
const WX = 200, WY = 70, WL = 130, [wtx, wty] = tipOf(WX, WY, wP, WL);
const u = (v, f) => v.toFixed(f == null ? 1 : f);
function wfig(extra, right) {
  return S.svg(820, 250, armQuad(WX, WY, wP, 80, WL, extra.q || {}) + (extra.body || '') + right.map((l, i) => S.text(420, 50 + i * 30, l[0], l[1] || 'sv-t', 'start')).join(''), '前馈计算的一步');
}
const steps = [
  { svg: wfig({}, [['手臂此刻的状态（举例）：'], ['角度 φ = 30°', 'sv-nw'], ['角速度 = 4 rad/s（正往外甩）', 'sv-nw'], ['角加速度 = 15 rad/s²（还在加速）', 'sv-nw'], ['机身：水平、没有加速度', 'sv-s']]),
    t: '手臂的动作是我们自己下的指令，所以这一刻的 <b>φ、φ̇、φ̈</b> 事先就知道。为了算得简单，假设机身此刻水平、没有加速度。' },
  { svg: wfig({ body: S.arrow(wtx + 10 * wcP, wty - 10 * wsP, wtx + 70 * wcP, wty - 70 * wsP, { c: 'warn' }) + S.text(wtx + 70, wty - 30, '切向 ' + u(aT) + ' m/s²', 'sv-s warn', 'start') +
      S.arrow(wtx - 14 * wcP - 10 * wsP, wty + 14 * wsP - 10 * wcP, wtx - 14 * wcP - 70 * wsP, wty + 14 * wsP - 70 * wcP, { c: 'b' }) + S.text(wtx - 50, wty - 40, '向心 ' + u(aC) + ' m/s²', 'sv-s b', 'end') },
    [['手臂末端（0.5 kg 那一点）的加速度：'], ['切向 = 臂长 × 角加速度 = 0.4 × 15 = ' + u(aT) + ' m/s²', 'sv-n'], ['向心 = 臂长 × 角速度² = 0.4 × 4² = ' + u(aC) + ' m/s²', 'sv-nb'], ['合起来：向前 ' + u(arx) + '，向上 ' + u(arz) + ' m/s²', 'sv-t']]),
    t: '末端绕关节转圈：沿着转动方向的<b>切向加速度</b>来自 φ̈，指向关节的<b>向心加速度</b>来自 φ̇²。两者合成：向前 <b>' + u(arx) + '</b>、向上 <b>' + u(arz) + ' m/s²</b>。' },
  { svg: wfig({ body: S.arrow(WX, WY + 4, WX + Frx * 25, WY + 4 - Frz * 14, { c: 'bad', w: 2.8 }) + S.text(WX - 20, WY + 80, '推机身', 'sv-s bad', 'end') },
    [['反作用力 = −0.5 kg × 末端加速度'], ['水平：−0.5 × ' + u(arx) + ' = ' + u(Frx) + ' N（往后推）', 'sv-n'], ['竖直：−0.5 × ' + u(arz) + ' = ' + u(Frz) + ' N（往下拉）', 'sv-n']]),
    t: '手臂往前上方加速，机身就被往后下方推：后 <b>' + u(-Frx) + ' N</b>、下 <b>' + u(-Frz) + ' N</b>。' },
  { svg: wfig({ body: arc(WX, WY, 50, -160, -110, 'bad') + S.text(WX - 50, WY - 40, '拧机身', 'sv-s bad', 'end') },
    [['作用在机身上的力矩：'], ['重力项 0.5 × 9.81 × 0.4 × sin 30° = ' + u(tG, 2), 'sv-n'], ['转动项 0.5 × 0.4² × 15 = ' + u(tI, 2), 'sv-n'], ['合计 ' + u(tau, 2) + ' N·m，往手臂那侧歪', 'sv-t']]),
    t: '<b>重力项</b>就是上面图 1 的栽倒力矩（这里力臂是 0.4 × sin30° = 0.2 m）；<b>转动项</b>是舵机拧手臂加速时，反过来拧机身的部分。合计 <b>' + u(tau, 2) + ' N·m</b>。' },
  { svg: S.svg(820, 250,
      S.box(20, 30, 240, 60, '控制器原来要的力', '水平 0，竖直 2.7 × 9.81 = ' + u(MT * K.g)) + S.text(290, 66, '+', 'sv-big') +
      S.box(320, 30, 220, 60, '抵消反作用力', '水平 +' + u(Fcx) + '，竖直 +' + u(-Frz), 'hl') + S.text(570, 66, '=', 'sv-big') +
      S.box(600, 30, 200, 60, '发出去的力', '水平 ' + u(Fcx) + '，竖直 ' + u(Fcz) + ' N', 'hl') +
      S.box(320, 140, 220, 60, '抵消力矩', '−' + u(tau, 2) + ' N·m', 'hl') + S.text(430, 230, '前馈就是把算出来的力和力矩“反着加上去”', 'sv-s'), '前馈加到指令里'),
    t: '前馈：把反作用力和力矩<b>反着加</b>到控制器的指令里。竖直方向多要 <b>' + u(-Frz) + ' N</b>，水平方向要往前 <b>' + u(Fcx) + ' N</b>，再加一个 <b>−' + u(tau, 2) + ' N·m</b> 的力矩。' },
  { svg: S.svg(820, 250, S.quad(230, 170, 0, 110, { fl: (Tc / 2 - split) * 5, fr: (Tc / 2 + split) * 5 }) +
      S.text(120, 30, u(Tc / 2 - split) + ' N', 'sv-n') + S.text(340, 30, u(Tc / 2 + split) + ' N', 'sv-n') + S.text(340, 235, '手臂这一侧', 'sv-s') +
      S.text(450, 70, '总推力 ' + u(Tc) + ' N（悬停只要 ' + u(MT * K.g) + ' N）', 'sv-t', 'start') +
      S.text(450, 100, '两桨差 ' + u(tau, 2) + ' ÷ 0.25 = ' + u(2 * split) + ' N', 'sv-t', 'start') +
      S.text(450, 130, '每个桨：' + u(Tc / 2) + ' ± ' + u(split) + ' N', 'sv-n', 'start') +
      S.text(450, 160, '往手臂那侧倾 arctan(' + u(Fcx) + ' / ' + u(Fcz) + ') = ' + u(K.deg(Math.atan2(Fcx, Fcz))) + '°', 'sv-t', 'start'), '分配到两个桨'),
    t: '分到两个桨：手臂那侧 <b>' + u(Tc / 2 + split) + ' N</b>，另一侧 <b>' + u(Tc / 2 - split) + ' N</b>；机身再往前倾 ' + u(K.deg(Math.atan2(Fcx, Fcz))) + '° 提供那 ' + u(Fcx) + ' N 的水平力。这些都在误差出现<b>之前</b>就做了。' },
];

/* figure: link to earlier lessons */
const LINK = [['第 1 课', '力矩 = 力 × 力臂', '重心偏移的栽倒力矩'], ['第 2 课', '已知的力用前馈（m·g）', '手臂前馈'], ['第 8 课', '扰动观测器、INDI、L1', '把手臂当扰动估出来'], ['第 9 课', 'MPC：带模型往前预测', '飞机 + 手臂一起优化']];
const figLink = S.svg(820, 230, LINK.map((r, i) => S.box(10, 8 + i * 55, 140, 44, r[0], '', 'b') + S.text(170, 36 + i * 55, r[1], 'sv-s', 'start') +
  S.arrow(420, 30 + i * 55, 520, 30 + i * 55, { c: 'acc' }) + S.box(530, 8 + i * 55, 280, 44, r[2], '', 'hl')).join(''), '这一课和前几课的关系');

let figBench = '';
if (!K.PUBLIC) ''

el.innerHTML = `
<p class="lede">${K.ours('', `空中机械臂就是在无人机下面挂一条轻量机械臂。`)}手臂一动，整架飞机的受力就变了。这一课先用数字看手臂带来的三种影响，再看三种应对办法。</p>

<h2>影响一：重心偏移</h2>
${K.fig(figCoM, '手臂伸出去停住不动，它的重量就偏在一侧，像一直有人按着飞机的一边。要飞平，手臂那一侧的桨必须一直多推 ' + (2 * d1).toFixed(1) + ' N。数字是下面实验的示意值（机身 2.2 kg，手臂 0.5 kg、长 0.4 m）。')}

<h2>影响二、三：反作用力和反扭矩</h2>
${K.fig(figReact, '手臂<b>加速或减速</b>时才出现。手臂被往前甩，机身就被往后推；舵机拧手臂，机身也被反向拧。动得越快影响越大，快速甩一下就是一个冲击。')}
${K.more('展开：三种影响对照表', `<div class="tblwrap"><table class="tbl">
<tr><th>影响</th><th>什么时候出现</th><th>对机身的效果</th></tr>
<tr><td><b>重心偏移</b></td><td>手臂伸向一侧，哪怕不动</td><td>整机的重心偏离了推力的中心，重力产生一个持续的“栽倒力矩”，不补偿的话机身会往手臂那边歪</td></tr>
<tr><td><b>反作用力</b></td><td>手臂加速、减速</td><td>手臂往前甩，机身就被往后推（牛顿第三定律）</td></tr>
<tr><td><b>反扭矩</b></td><td>手臂关节加速、减速转动（或顶住重力）</td><td>舵机拧手臂的同时，也在反方向拧机身</td></tr>
</table></div>
<p>第一种是缓慢、持续的；后两种随手臂动作快慢而定。手臂越重、越长、动得越快，影响越大。</p>`)}

<h2>三种应对办法</h2>
${K.fig(figWays, '<b>①</b> 不管它：先出现误差，控制器再顶回来。<b>②</b> 前馈：手臂的动作是我们自己下的指令，用物理公式事先算出力和力矩、提前抵消（第 2 课“已知的力用前馈”）。<b>③</b> 观测器：不用手臂模型，从测到的加速度反推（第 8 课），但总要晚一拍。')}
${K.more('展开：各自的代价，以及第四种办法', `<ul>
<li><b>当成扰动（观测器）</b>：好处是不用知道手臂的模型；坏处是总要晚一拍，先出现误差才能估出来。</li>
<li><b>前馈补偿</b>：计划的角度、角速度、角加速度事先都知道（也可以用关节传感器测）。坏处是要知道手臂的质量、长度等参数，而且舵机实际的动作和指令会有偏差，模型不准就补不准。两者也可以同时用${K.ours('')}。</li>
<li><b>整机一起优化</b>：把飞机和手臂写进同一个模型，用 MPC（第 9 课）或其他在线优化同时规划两者。这是考虑得最全面的做法，例如 Lunni 等 2017 用非线性 MPC 同时规划飞机和手臂；坏处是模型复杂、计算量大，而且同样依赖模型准确。</li>
</ul>`)}
<div id="walk9"></div>

<h2>三种办法放在一起比</h2>
${K.fig(figSwing, '用下面实验的同一个模型离线跑：手臂来回挥动时，最近 10 秒的平均位置误差：不补偿 <b>' + avg('none').toFixed(1) + ' cm</b>，观测器 <b>' + avg('dob').toFixed(1) + ' cm</b>，前馈 <b>' + avg('ff').toFixed(1) + ' cm</b>。前馈事先知道，所以最小；但也不是 0，因为推力和姿态改变需要时间。')}
${K.more('展开：手臂停在 60° 不动时会怎样', `<p>同一个模型，不补偿、手臂停在 60°：最后机身是水平的，但飞机停在离目标约 <b>${last[2].toFixed(0)} cm</b> 的地方（往手臂那侧偏）。原因：这个实验的姿态控制里没有积分项，要产生顶住 ${tq1.toFixed(2)} N·m 的力矩，“想要的倾角”必须和实际倾角一直差约 ${Math.abs(last[4] - last[3]).toFixed(1)}°；而这个倾角指令来自位置环，于是位置误差一直留着。真实飞控（比如 PX4）的姿态和角速度环有积分项，能慢慢把这个偏差补掉，但要先出现误差、过一段时间。</p>`)}
<div id="d9"></div>

${K.ours('')}<h2>和前几课的关系</h2>
${K.fig(figLink, '这一课没有新工具：力矩公式、前馈、观测器、MPC 都是前面学过的，这里只是用到了手臂上。')}

<div class="key"><h3>这一课记住三件事</h3><ul>
<li>手臂带来三种影响：重心偏移（慢、持续），反作用力和反扭矩（快、冲击）。</li>
<li>手臂动作是我们自己下的指令，所以可以前馈补偿；扰动观测器不用模型但会晚一拍。</li>
<li>考虑最全面的做法是把飞机和手臂放进同一个模型整体优化（如 MPC），代价是复杂、计算量大。</li>
</ul></div>
<h2>小测验</h2><div id="q9"></div>`;

K.steps(el.querySelector('#walk9'), { title: '用数字走一遍：手臂在 30°、正往外甩，前馈要补多少', steps });

const d = K.demo(el.querySelector('#d9'), '动手', '悬停时挥动手臂',
  '先把手臂角度拉到 60° 并停住，看飞机停在哪里。再打开“来回挥动”，切换三种补偿方式比较误差。参数是示意值：机身 2.2 kg，手臂 0.5 kg、长 0.4 m。');
const cA = K.canvas(d, 0.38, 210), cB = K.canvas(d, 0.36, 200);
const ctl = K.box(d, 'controls'), ro = K.box(d, 'readout');
const sP = K.slider(ctl, { id: 'l9-p', label: '手臂角度（0 = 垂直向下）', min: -90, max: 90, step: 1, value: 0, fmt: v => v + '°' });
const sw = K.seg(ctl, { label: '来回挥动', options: [['0', '关'], ['1', '开']], value: '0' });
const sF = K.slider(ctl, { id: 'l9-f', label: '挥动频率', min: 0.2, max: 1.5, step: 0.05, value: 0.7, fmt: v => v.toFixed(2) + ' Hz' });
const md = K.seg(ctl, { label: '补偿方式', options: [['none', '不补偿'], ['ff', '前馈补偿'], ['dob', '扰动观测器']], value: 'none' });
const br = K.box(ctl, 'btnrow'); K.btn(br, '重来', () => reset(), 'primary');
const q = new K.Quad({ m: mb, x: 0, z: 2 });
q.Tmax = 1.95 * 2.74 * K.g; q.I = 0.03 + ma * la * la;
let t, ph, dph, ddph, dx, dz, dM, hb = K.buf(10), eb = K.buf(5);
function reset() { q.reset(0, 2); q.T = MT * K.g; t = 0; ph = 0; dph = 0; ddph = 0; dx = dz = dM = 0; hb.clear(); eb.clear(); }
reset();
K.loop(dt => {
  K.sub(dt, 0.002, h => {
    t += h;
    const tgt = sw.v === '1' ? K.rad(70) * Math.sin(2 * Math.PI * sF.v * t) : K.rad(sP.v);
    const wn = 14, z = 0.9;
    ddph = wn * wn * (tgt - ph) - 2 * z * wn * dph; dph += ddph * h; ph += dph * h;
    const pw = ph - q.th, dpw = dph - q.w, ddpw = ddph, s = Math.sin(pw), co = Math.cos(pw);
    const arx = la * (ddpw * co - dpw * dpw * s), arz = la * (ddpw * s + dpw * dpw * co);
    const F = [-ma * arx, -ma * arz];
    const tau = ma * (la * la * ddpw + la * (s * q.az + co * q.ax)) + ma * K.g * la * s;
    const ex = -q.x, ez = 2 - q.z;
    let Fx = MT * (Kp * ex - Kd * q.vx), Fz = MT * (K.g + Kp * ez - Kd * q.vz), Mff = 0;
    if (md.v === 'ff') { Fx -= F[0]; Fz -= F[1]; Mff = -tau; }
    if (md.v === 'dob') {
      const al = 1 - Math.exp(-2 * Math.PI * 8 * h);
      const rx = MT * (q.ax + 0.5 * K.randn()) - q.T * Math.sin(q.th), rz = MT * (q.az + K.g + 0.5 * K.randn()) - q.T * Math.cos(q.th);
      const rM = q.I * (q.al + 5 * K.randn()) - q.M;
      dx += (rx - dx) * al; dz += (rz - dz) * al; dM += (rM - dM) * al;
      Fx -= dx; Fz -= dz; Mff = -dM;
    }
    const [T, thd] = K.geo(q, Fx, Fz, K.rad(45));
    q.step(h, T, K.att(q, thd, 1.5, Mff), F, tau, MT);
    eb.push(t, Math.hypot(ex, ez));
    if (Math.abs(q.th) > 1.6 || Math.abs(q.x) > 6 || q.z <= 0) reset();
  });
  hb.push(t, Math.hypot(q.x, q.z - 2) * 100, K.deg(q.th), K.deg(ph));
  const c = K.col(), a = cA.fit(), v = K.view(a.w, a.h, -2.5, 2.5, -0.1, 3, 8), ctx = a.ctx;
  K.grid(ctx, v, c, 1);
  ctx.strokeStyle = c.soft; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(v.X(0), v.Y(2), 8, 0, 7); ctx.stroke();
  K.drawQuad(ctx, v.X(q.x), v.Y(q.z), q.th, v.s * 1.6, { arm: { len: la, phi: ph }, thrust: [q.T / q.Tmax + q.M / q.L / q.Tmax, q.T / q.Tmax - q.M / q.L / q.Tmax] });
  K.text(ctx, '灰圈：悬停目标；橙色：机械臂', 10, 18, c.soft);
  const b = cB.fit(), W = K.win(t, 10);
  K.plot(b.ctx, 0, 0, b.w / 2, b.h, { title: '位置误差', unit: 'cm', x: W, y: [0, 40], series: [{ buf: hb, i: 1, color: c.acc, label: '误差' }], xfmt: x => x.toFixed(0) + 's' });
  K.plot(b.ctx, b.w / 2, 0, b.w / 2, b.h, { title: '角度', unit: '°', x: W, y: [-80, 80], series: [{ buf: hb, i: 3, color: c.warn, label: '手臂' }, { buf: hb, i: 2, color: c.acc, label: '机身倾角' }], xfmt: x => x.toFixed(0) + 's' });
  const n = eb.d.length || 1, em = eb.d.reduce((s, p) => s + p[1], 0) / n;
  ro.innerHTML = `<span>最近 5 秒平均误差 <b>${(em * 100).toFixed(1)} cm</b></span><span>机身倾角 <b>${K.deg(q.th).toFixed(1)}°</b></span><span>手臂重力造成的力矩 <b>${(ma * K.g * la * Math.sin(ph - q.th)).toFixed(2)} N·m</b></span>`;
});

K.box(d, 'assume', '<b>这个实验做了哪些简化：</b>只看侧面（二维）；手臂简化为一根无质量的杆加末端一个点质量，只在竖直平面内摆；前馈用的手臂模型和仿真完全一致（真实情况下会有误差）；观测器用精确的推力和带白噪声的加速度，没有延迟；控制器读真实状态；姿态控制没有积分项；参数是示意值。');

K.quiz(el.querySelector('#q9'), 'l9', [
  { q: '手臂静止地伸向前方，对机身的主要影响是什么？', o: ['没有影响', '手臂重量偏在一侧，产生持续的栽倒力矩，需要前后桨差速顶住', '机身被往后推', '机身转头'], a: 1,
    e: '这是重心偏移。手臂不动也一直存在。不补偿的话，姿态控制要靠误差去顶：如果姿态控制里没有积分项（比如这个实验），就会一直留着误差（这个实验里是飞机停在偏离目标约 ' + last[2].toFixed(0) + ' cm 处）；有积分项的话，也要先出现误差，过一段时间才补回来。' },
  { q: '手臂 0.5 kg、长 0.4 m，停在 30°（离竖直方向）不动。手臂重力对机身的栽倒力矩约是多少？', o: ['0.2 N·m', '约 0.98 N·m', '约 1.96 N·m', '0，因为手臂没动'], a: 1,
    e: '重力 0.5 × 9.81 = 4.9 N，力臂 0.4 × sin30° = 0.2 m，力矩 = 4.9 × 0.2 ≈ 0.98 N·m。手臂不动也有这一项；动起来时还要再加上转动项。' },
  { q: '要做前馈补偿，需要知道什么？', o: ['风速', '手臂的角度、角速度、角加速度，以及手臂的质量和长度', '电池电压', '什么都不需要'], a: 1,
    e: '手臂的动作是我们自己下的指令，所以计划的运动是已知的；质量和长度需要事先测量。' },
  { q: '扰动观测器补偿手臂的影响，主要缺点是？', o: ['完全没用', '要先出现加速度误差才能估出来，总是晚一拍；快速挥动时跟不上', '需要手臂模型', '只能补偿重力'], a: 1,
    e: '它不需要手臂模型，但只能“事后发现”。前馈是“事前知道”，模型准的话对快速动作更有效。两者也可以同时用' + K.ours('') + '。' },
]);
} });
