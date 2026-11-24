K.add({ id: 'l6', num: 7, title: '轨迹规划与微分平坦', sub: '为什么参考轨迹必须平滑，为什么只规划位置就够', render(el) {
const S = K.S;
const m = 2.74, g = K.g, D0 = 2, L0 = 4;

/* the demo's three references (A = -2 -> B = +2) */
function mkRef(typ, D, A, B) {
  return tt => {
    const L = B - A;
    if (tt <= 0) return [A, 0, 0];
    if (typ === 'step') return [B, 0, 0];
    if (typ === 'ramp') return tt >= D ? [B, 0, 0] : [A + L * tt / D, L / D, 0];
    if (tt >= D) return [B, 0, 0];
    const s = tt / D;
    return [A + L * (10 * s ** 3 - 15 * s ** 4 + 6 * s ** 5), L * (30 * s ** 2 - 60 * s ** 3 + 30 * s ** 4) / D, L * (60 * s - 180 * s ** 2 + 120 * s ** 3) / (D * D)];
  };
}
/* the demo's controller and model, run offline for one leg */
function run(typ, ff) {
  const ref = mkRef(typ, D0, -2, 2), q = new K.Quad({ x: -2, z: 1.5 }), out = []; q.reset(-2, 1.5);
  let t = -0.6, n = 0; const h = 0.002;
  while (t < D0 + 1.6) {
    t += h; n++;
    const [xr, vr, ar] = ref(t);
    const Fx = q.m * ((ff ? ar : 0) + K.clamp(4 * (xr - q.x) + 3.2 * (vr - q.vx), -12, 12)), Fz = q.m * (K.g + 4 * (1.5 - q.z) - 3.2 * q.vz);
    const [T, thd] = K.geo(q, Fx, Fz, K.rad(55)); q.step(h, T, K.att(q, thd, 1.5));
    if (n % 10 === 0) out.push([t, xr, q.x, K.deg(q.th), Math.abs(xr - q.x) * 100]);
  }
  return out;
}
const rStep = run('step', 1), rMJ = run('mj', 1), rOff = run('mj', 0);
const mx = (r, i) => Math.max(...r.map(p => Math.abs(p[i])));
const at = (r, tt) => r.reduce((b, p) => Math.abs(p[0] - tt) < Math.abs(b[0] - tt) ? p : b);

/* min-jerk peak quantities (D = 2 s, 4 m) */
const sPk = 0.5 - Math.sqrt(3) / 6, tPk = sPk * D0, R = mkRef('mj', D0, -2, 2)(tPk);
const aPk = R[2], vPk = mkRef('mj', D0, -2, 2)(D0 / 2)[1], tiltPk = K.deg(Math.atan(aPk / g)), TPk = m * Math.hypot(g, aPk);
const j0 = 60 * L0 / D0 ** 3, w0 = j0 / g;

/* figure: step / ramp / min-jerk position, velocity, acceleration */
const ts = []; for (let t = -0.5; t <= 3.0001; t += 0.02) ts.push(t);
const mj = mkRef('mj', D0, -2, 2), rp = mkRef('ramp', D0, -2, 2);
const spike = (t0, up) => [[t0, 0], [t0, up ? 999 : -999], [t0, 0]];
const pl = (x0, title, y, yt, ser) => S.plot(x0, 26, 270, 230, { title, x: [-0.5, 3], y, yt, xu: 's', xt: [0, 1, 2, 3], series: ser });
const figRef = S.svg(810, 262,
  `<line x1="60" y1="12" x2="84" y2="12" class="sv-l-bad" style="stroke-width:2.2"/>` + S.text(90, 16, '阶跃（瞬移）', 'sv-s', 'start') +
  `<line x1="210" y1="12" x2="234" y2="12" class="sv-l-b" stroke-dasharray="6 4"/>` + S.text(240, 16, '匀速直线', 'sv-s', 'start') +
  `<line x1="340" y1="12" x2="364" y2="12" class="sv-l-acc"/>` + S.text(370, 16, '最小 jerk', 'sv-s', 'start') +
  pl(0, '位置（m）', [-2.5, 2.5], [-2, 0, 2], [
    { pts: [[-0.5, -2], [0, -2], [0, 2], [3, 2]], c: 'bad' }, { pts: ts.map(t => [t, rp(t)[0]]), c: 'b', dash: 1 }, { pts: ts.map(t => [t, mj(t)[0]]), c: 'acc' }]) +
  pl(270, '速度（m/s）', [-0.5, 4.5], [0, 2, 4], [
    { pts: [[-0.5, 0], ...spike(0, 1), [3, 0]], c: 'bad' }, { pts: [[-0.5, 0], [0, 0], [0, 2], [2, 2], [2, 0], [3, 0]], c: 'b', dash: 1 }, { pts: ts.map(t => [t, mj(t)[1]]), c: 'acc' }]) +
  pl(540, '加速度（m/s²）', [-8, 8], [-5, 0, 5], [
    { pts: [[-0.5, 0], ...spike(0, 1), [0.03, 0], [2, 0], ...spike(2, 0), [3, 0]], c: 'b', dash: 1 }, { pts: ts.map(t => [t, mj(t)[2]]), c: 'acc' }]) +
  S.text(388, 68, '∞', 'sv-t', 'start') + S.text(626, 68, '∞', 'sv-t', 'start') + S.text(732, 226, '−∞', 'sv-t', 'end'),
  '三种参考线的位置、速度、加速度');

/* figure: flatness chain */
const figChain = S.svg(810, 230,
  ['位置 p', '速度', '加速度', 'jerk', 'snap'].map((n, i) => S.box(10 + i * 162, 20, 128, 50, n, i ? (i + '') + ' 阶导' : '规划器给的', i === 0 ? 'px' : '')).join('') +
  [0, 1, 2, 3].map(i => S.arrow(138 + i * 162, 45, 170 + i * 162, 45, { label: 'd/dt' })).join('') +
  S.box(334, 150, 128, 64, '推力 + 倾角', 'm(a + g)', 'hl') + S.box(496, 150, 128, 64, '角速度', '倾角变多快', 'hl') + S.box(658, 150, 128, 64, '力矩', '桨之间推力差', 'hl') +
  S.arrow(398, 70, 398, 148, { c: 'acc' }) + S.arrow(560, 70, 560, 148, { c: 'acc' }) + S.arrow(722, 70, 722, 148, { c: 'acc' }) +
  S.text(20, 140, '只要给出位置曲线（和机头朝向），', 'sv-s', 'start') + S.text(20, 160, '下面这些都能直接算出来', 'sv-s', 'start') +
  S.text(20, 196, K.ours('', 'CTBR 接口发给 PX4 的'), 'sv-s warn', 'start') + S.text(20, 214, '正是“推力 + 角速度”', 'sv-s warn', 'start'),
  '微分平坦：位置往下求导，一层层得到推力、倾角、角速度、力矩');

/* figure: offline runs */
const figRun = S.svg(810, 250,
  S.plot(0, 0, 395, 250, { title: '实际倾角（°）', x: [-0.6, 3.6], y: [-60, 75], yt: [-50, 0, 50], xu: 's', xt: [0, 1, 2, 3], hl: [{ v: 55, c: 'bad', label: '上限 55°' }],
    series: [{ pts: rStep.map(p => [p[0], p[3]]), c: 'bad', label: '阶跃' }, { pts: rMJ.map(p => [p[0], p[3]]), c: 'acc', label: '平滑' }] }) +
  S.plot(415, 0, 395, 250, { title: '跟踪误差（cm），最小 jerk', x: [-0.6, 3.6], y: [0, 90], yt: [0, 40, 80], xu: 's', xt: [0, 1, 2, 3],
    series: [{ pts: rOff.map(p => [p[0], p[4]]), c: 'warn', label: '前馈关' }, { pts: rMJ.map(p => [p[0], p[4]]), c: 'acc', label: '前馈开' }] }),
  '用下面实验的模型离线飞一趟（−2 m → +2 m，2 s）');

/* figure: relation to earlier lessons */
const figRel = S.svg(810, 150,
  S.box(10, 20, 185, 76, '第 2 课', '悬停前馈 m·g', 'b') + S.box(212, 20, 185, 76, '第 3 课', 'tanθ = a / g', 'b') +
  S.box(414, 20, 185, 76, '第 5 课', '推力方向 = R 第三列', 'b') + S.box(616, 20, 185, 76, '第 6 课', 'F 去掉误差项', 'b') +
  [102, 304, 506, 708].map((x, i) => S.arrow(x, 96, [270, 360, 450, 540][i], 117, { c: 'soft' })).join('') +
  `<rect x="215" y="120" width="380" height="28" rx="6" class="sv-fill-tint"/>` + S.text(405, 139, '本课：T·z_b = m·(p̈ + g·ẑ)，前馈 = m·a参考', 'sv-t'),
  '本课公式里的每一块，前面都见过');

/* walkthrough diagrams */
const sx = v => 44 + (v + 0.6) / 4.2 * 758, sy = (v, y0, y1) => 224 - (v - y0) / (y1 - y0) * 198;
const refFig = S.svg(810, 250, S.plot(0, 0, 810, 250, { title: '最小 jerk 参考：位置 / 速度 / 加速度', x: [-0.6, 3.6], y: [-6.5, 8], yt: [-6, -3, 0, 3, 6], xu: 's', xt: [0, 1, 2, 3],
  series: [{ pts: ts.map(t => [t, mj(t)[0]]), c: 'warn', dash: 1, label: '位置' }, { pts: ts.map(t => [t, mj(t)[1]]), c: 'b', label: '速度' }, { pts: ts.map(t => [t, mj(t)[2]]), c: 'acc', label: '加速度' }] }) +
  `<line x1="${sx(tPk)}" y1="26" x2="${sx(tPk)}" y2="224" class="sv-l-ink" stroke-dasharray="3 3"/>` +
  `<circle cx="${sx(tPk)}" cy="${sy(aPk, -6.5, 8)}" r="5" class="sv-fill-acc"/>` + S.text(sx(tPk) + 10, sy(aPk, -6.5, 8) - 12, 't = ' + tPk.toFixed(2) + ' s：a = ' + aPk.toFixed(2) + ' m/s²（最大）', 'sv-n', 'start'),
  '参考曲线');
const vecFig = S.svg(810, 250, (() => {
  const ox = 170, oy = 215, k = 5.5, X = ox + m * aPk * k, Y = oy - m * g * k, th = Math.atan2(aPk, g);
  return `<line x1="${ox}" y1="${oy}" x2="${X}" y2="${oy}" class="sv-l-warn" marker-end="url(#AH-warn)"/>` + S.text((ox + X) / 2, oy + 18, 'm·a = ' + (m * aPk).toFixed(1) + ' N', 'sv-nw') +
    `<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${Y}" class="sv-l-b" marker-end="url(#AH-b)"/>` + S.text(ox - 8, (oy + Y) / 2, 'm·g = ' + (m * g).toFixed(1) + ' N', 'sv-nb', 'end') +
    `<line x1="${ox}" y1="${oy}" x2="${X}" y2="${Y}" class="sv-l-acc" style="stroke-width:3" marker-end="url(#AH-acc)"/>` + S.text(X + 8, Y + 4, '推力 ' + TPk.toFixed(1) + ' N', 'sv-n', 'start') +
    S.quad(560, 150, K.deg(th), 70) + S.text(560, 236, '机身要倾 ' + tiltPk.toFixed(1) + '°', 'sv-s');
})(), '平坦性第一层');
const rateFig = S.svg(810, 250,
  S.plot(0, 0, 500, 250, { title: '最小 jerk 要求的角速度（°/s）', x: [-0.6, 2.6], y: [-200, 200], yt: [-150, 0, 150], xu: 's', xt: [0, 1, 2],
    series: [{ pts: [[-0.6, 0], [0, 0], ...ts.filter(t => t >= 0 && t <= 2).map(t => { const s = t / D0, a = L0 * (60 * s - 180 * s * s + 120 * s ** 3) / D0 ** 2, j = L0 * (60 - 360 * s + 360 * s * s) / D0 ** 3; return [t, K.deg(g * j / (g * g + a * a))]; }), [2, 0], [2.6, 0]], c: 'acc' }] }) +
  S.text(560, 60, 't = 0 那一刻：', 'sv-t', 'start') +
  S.text(560, 88, 'jerk = 60 × 4 / 2³ = ' + j0 + ' m/s³', 'sv-n', 'start') +
  S.text(560, 114, '角速度 ≈ jerk / g = ' + w0.toFixed(2) + ' rad/s', 'sv-n', 'start') +
  S.text(560, 138, '= ' + K.deg(w0).toFixed(0) + '°/s，从 0 瞬间跳上去', 'sv-s bad', 'start') +
  S.text(560, 180, '→ 最小 snap（七次多项式）', 'sv-s acc', 'start') + S.text(560, 200, '让 jerk 也连续，不再跳', 'sv-s acc', 'start'),
  '平坦性第二层');
const A1 = at(rMJ, tPk), A0 = at(rOff, tPk);
const cmpFig = (on) => {
  const r = on ? A1 : A0, F = on ? m * aPk : 0;
  return S.svg(810, 230,
    S.quad(200, 150, r[3], 70) + S.text(200, 215, '实际倾角 ' + r[3].toFixed(0) + '°（需要 ' + tiltPk.toFixed(1) + '°）', 'sv-s') +
    S.text(400, 50, on ? '前馈开：一开始就给' : '前馈关：只能靠误差', 'sv-t', 'start') +
    S.text(400, 80, on ? 'm·a参考 = 2.74 × ' + aPk.toFixed(2) + ' = ' + F.toFixed(1) + ' N' : '要等误差攒出来，PD 才给力', on ? 'sv-n' : 'sv-nw', 'start') +
    S.text(400, 116, 't = ' + tPk.toFixed(2) + ' s 时误差 ' + r[4].toFixed(0) + ' cm', on ? 'sv-n' : 'sv-nw', 'start') +
    S.text(400, 146, '这一趟最大误差 ' + mx(on ? rMJ : rOff, 4).toFixed(0) + ' cm', on ? 'sv-n' : 'sv-nw', 'start'),
    on ? '前馈开' : '前馈关');
};

el.innerHTML = `
<p class="lede">控制器跟踪的是一条<span class="term">参考轨迹</span>：每一时刻“应该在哪”。这条线画得好不好，对飞得好不好影响很大。这一课讲两件事：轨迹为什么要平滑；为什么只规划位置就够。</p>

<h2>为什么要平滑</h2>
${K.fig(figRef, '<b>阶跃</b>：位置一跳，要求无穷大的速度和加速度。<b>匀速直线</b>：起步和停下时速度一跳，加速度还是无穷大。<b>最小 jerk</b>：三条曲线都连续，最大速度 ' + vPk.toFixed(2) + ' m/s，最大加速度 ' + aPk.toFixed(2) + ' m/s²。')}
${K.fig(figRun, '左：阶跃参考（红）下机身猛甩到 ' + mx(rStep, 3).toFixed(0) + '°（接近上限）；最小 jerk（“平滑”）最大 ' + mx(rMJ, 3).toFixed(0) + '°。右：同一条最小 jerk，开前馈最大误差 <b>' + mx(rMJ, 4).toFixed(0) + ' cm</b>，关掉前馈 <b>' + mx(rOff, 4).toFixed(0) + ' cm</b>。')}
${K.more('展开：最小 jerk 和最小 snap', `<p><span class="term">最小 jerk</span>：让加加速度（jerk，位置的三阶导）的平方积分最小；从静止到静止的一段，解是五次多项式 x = A + L·(10s³ − 15s⁴ + 6s⁵)，s = t / D。<span class="term">最小 snap</span>（Mellinger 和 Kumar 2011）：让四阶导的平方积分最小，一段的解是七次多项式。snap 对应力矩，所以最小 snap 大致相当于让需要的力矩（桨之间的推力差）整体尽量小。</p>${K.ours('', `
<p>下面的实验为了简单，用的是一段最小 jerk。</p>`)}`)}

<h2>微分平坦：只要规划位置</h2>
${K.fig(figChain, '四旋翼有个很好的性质叫<span class="term">微分平坦</span>：给出位置随时间的曲线（再加机头朝向），推力、倾角、角速度、力矩都能靠求导和代数直接算出来，不用解微分方程。所以控制器可以把它们<b>提前算好作为前馈</b>，不用等误差出现。')}
${K.more('展开：公式和前提', `<div class="formula">推力向量  T·z<sub>b</sub> = m·( p̈ + g·ẑ )
<div class="where">T：总推力大小；z<sub>b</sub>：机身 z 轴（推力方向）；p̈：位置的二阶导，即加速度；ẑ：竖直向上的单位向量。这就是第 6 课的 F 去掉误差项（假设完全跟上了参考）。</div></div>
<p>前提：理想刚体模型（不计空气阻力等外力，或者把它们写进模型），而且推力不为零（自由落体时推力方向定不下来）。Mellinger 和 Kumar 2011 年的论文把这个性质系统地用到了四旋翼的轨迹规划和控制上。</p>`)}
<div id="walk"></div>
<div id="d6"></div>

<h2>和前几课的关系</h2>
${K.fig(figRel, '第 2 课的悬停前馈 m·g 只管“托住重量”；这里把它推广成 m·(a参考 + g)，连“要加速”的那一份也提前给。')}

<div class="key"><h3>这一课记住三件事</h3><ul>
<li>微分平坦：给出位置曲线（和机头朝向），推力、倾角、角速度都能直接算出来（理想模型下）。</li>
<li>加速度对应倾角，jerk 对应角速度，snap 对应力矩，所以轨迹要平滑到足够高阶。</li>
<li>参考加速度可以作为前馈直接给控制器，通常能明显减小跟踪误差（模型越准，效果越好）。</li>
</ul></div>
<h2>小测验</h2><div id="q6"></div>`;

K.steps(el.querySelector('#walk'), { title: '用数字走一遍：最小 jerk，2 秒从 −2 m 飞到 +2 m', steps: [
  { svg: refFig, t: '<b>参考线</b>：在 t = ' + tPk.toFixed(2) + ' s 加速度最大，<b>' + aPk.toFixed(2) + ' m/s²</b>；此刻参考位置 ' + R[0].toFixed(2) + ' m、速度 ' + R[1].toFixed(2) + ' m/s。' },
  { svg: vecFig, t: '<b>平坦性第一层：加速度 → 推力和倾角</b>。推力向量 = m·(a + g)：水平 ' + (m * aPk).toFixed(1) + ' N、竖直 ' + (m * g).toFixed(1) + ' N，合起来 <b>' + TPk.toFixed(1) + ' N</b>，倾角 arctan(' + aPk.toFixed(2) + ' / 9.81) = <b>' + tiltPk.toFixed(1) + '°</b>（第 3 课的公式）。' },
  { svg: rateFig, t: '<b>第二层：jerk → 角速度</b>。倾角变多快取决于加速度变多快。加速度最大那一刻 jerk = 0，角速度也是 0；但在 t = 0，最小 jerk 要求角速度从 0 一下跳到 <b>' + K.deg(w0).toFixed(0) + '°/s</b>。' + K.ours('', '这就是为什么很多工作改用最小 snap。') + '' },
  { svg: cmpFig(true), t: '<b>前馈开</b>：控制器在 t = ' + tPk.toFixed(2) + ' s 直接给出 ' + (m * aPk).toFixed(1) + ' N 水平力，PD 只修小误差。此刻误差 <b>' + A1[4].toFixed(0) + ' cm</b>。' },
  { svg: cmpFig(false), t: '<b>前馈关</b>：PD 要先看到误差才出力，此刻误差已经 <b>' + A0[4].toFixed(0) + ' cm</b>，倾角只有 ' + A0[3].toFixed(0) + '°，速度明显落后；这一趟最大误差 <b>' + mx(rOff, 4).toFixed(0) + ' cm</b>，是开前馈的约 ' + (mx(rOff, 4) / mx(rMJ, 4)).toFixed(0) + ' 倍。' },
] });

const d = K.demo(el.querySelector('#d6'), '动手', '从 A 飞到 B 的三种参考线',
  '每次都从左边飞到右边，再飞回来。切换三种参考线，看实际倾角和误差。再把“参考加速度前馈”关掉试试。');
const cA = K.canvas(d, 0.34, 190), cB = K.canvas(d, 0.5, 260);
const ctl = K.box(d, 'controls'), ro = K.box(d, 'readout');
const typ = K.seg(ctl, { label: '参考线', options: [['step', '阶跃（瞬移）'], ['ramp', '匀速直线'], ['mj', '最小 jerk']], value: 'mj', on: restart });
const sD = K.slider(ctl, { id: 'l6-d', label: '飞行时间', min: 0.8, max: 4, step: 0.1, value: 2, fmt: v => v.toFixed(1) + ' s', on: restart });
const ffs = K.seg(ctl, { label: '参考加速度前馈', options: [['1', '开'], ['0', '关']], value: '1', on: restart });
const q = new K.Quad({ x: -2, z: 1.5 });
let t = 0, dir = 1, A = -2, B = 2, hb = K.buf(20), stats = { e: 0, th: 0 }, last = { e: 0, th: 0 };
function restart() { q.reset(-2, 1.5); t = -0.6; dir = 1; A = -2; B = 2; hb.clear(); stats = { e: 0, th: 0 }; }
function ref(tt) {
  const D = sD.v, L = B - A;
  if (tt <= 0) return [A, 0, 0];
  if (typ.v === 'step') return [B, 0, 0];
  if (typ.v === 'ramp') return tt >= D ? [B, 0, 0] : [A + L * tt / D, L / D, 0];
  if (tt >= D) return [B, 0, 0];
  const s = tt / D;
  return [A + L * (10 * s ** 3 - 15 * s ** 4 + 6 * s ** 5), L * (30 * s ** 2 - 60 * s ** 3 + 30 * s ** 4) / D, L * (60 * s - 180 * s ** 2 + 120 * s ** 3) / (D * D)];
}
restart();
const Kp = 4, Kd = 3.2;
K.loop(dt => {
  K.sub(dt, 0.002, h => {
    t += h;
    const [xr, vr, ar] = ref(t);
    const Fx = q.m * ((ffs.v === '1' ? ar : 0) + K.clamp(Kp * (xr - q.x) + Kd * (vr - q.vx), -12, 12)), Fz = q.m * (K.g + Kp * (1.5 - q.z) - Kd * q.vz);
    const [T, thd] = K.geo(q, Fx, Fz, K.rad(55)); q.step(h, T, K.att(q, thd, 1.5));
    stats.e = Math.max(stats.e, Math.abs(xr - q.x)); stats.th = Math.max(stats.th, Math.abs(q.th));
    if (t > sD.v + 1.6) { last = stats; stats = { e: 0, th: 0 }; t = -0.4; dir = -dir; [A, B] = [B, A]; hb.clear(); }
  });
  const [xr, , ar] = ref(t), D = sD.v;
  const need = typ.v === 'mj' ? K.deg(Math.atan(ar / K.g)) * Math.sign(B - A) : null;
  hb.push(t, xr, q.x, need, K.deg(q.th) * Math.sign(B - A), Math.abs(xr - q.x) * 100);
  const c = K.col(), a = cA.fit(), v = K.view(a.w, a.h, -3, 3, -0.1, 2.4, 8), ctx = a.ctx;
  K.grid(ctx, v, c, 1);
  [[A, 'A'], [B, 'B']].forEach(([x, n]) => { ctx.fillStyle = c.soft; ctx.fillRect(v.X(x) - 1, v.Y(0), 2, -v.s * 1.2); K.text(ctx, n === 'A' ? '起点' : '终点', v.X(x), v.Y(0) - v.s * 1.25, c.soft, '12px "Noto Sans SC", sans-serif', 'center'); });
  ctx.fillStyle = c.warn; ctx.beginPath(); ctx.arc(v.X(xr), v.Y(1.5), 5, 0, 7); ctx.fill();
  K.drawQuad(ctx, v.X(q.x), v.Y(q.z), q.th, v.s * 1.3, { thrust: [q.T / q.Tmax, q.T / q.Tmax] });
  K.text(ctx, '橙点：参考位置', 10, 18, c.soft);
  const b = cB.fit(), X = [-0.6, D + 1.6];
  K.plot(b.ctx, 0, 0, b.w, b.h * 0.36, { title: '位置', unit: 'm', x: X, y: [-2.5, 2.5], series: [{ buf: hb, i: 1, color: c.warn, dash: [6, 4], label: '参考' }, { buf: hb, i: 2, color: c.acc, label: '实际' }], xfmt: x => x.toFixed(1) + 's' });
  K.plot(b.ctx, 0, b.h * 0.36, b.w, b.h * 0.36, { title: '倾角（朝飞行方向为正）', unit: '°', x: X, y: [-60, 60], series: [{ buf: hb, i: 3, color: c.warn, dash: [6, 4], label: '平坦性算出的需要值' }, { buf: hb, i: 4, color: c.acc, label: '实际' }], hl: [{ v: 55, color: c.bad, label: '倾角上限 55°' }], xfmt: x => x.toFixed(1) + 's' });
  K.plot(b.ctx, 0, b.h * 0.72, b.w, b.h * 0.28, { title: '跟踪误差', unit: 'cm', x: X, y: [0, 120], series: [{ buf: hb, i: 5, color: c.bad, label: '误差' }], xfmt: x => x.toFixed(1) + 's' });
  ro.innerHTML = `<span>上一趟最大误差 <b>${(last.e * 100).toFixed(0)} cm</b></span><span>上一趟最大倾角 <b>${K.deg(last.th).toFixed(0)}°</b></span>${typ.v === 'mj' ? `<span>最小 jerk 需要的最大倾角 <b>${K.deg(Math.atan(5.77 * 4 / (D * D) / K.g)).toFixed(0)}°</b></span>` : '<span>这种参考线在起点要求<b class="hot">无穷大</b>加速度</span>'}`;
});

K.box(d, 'assume', '<b>这个实验做了哪些简化：</b>只看侧面（二维）；每次只飞一段参考线；控制器读真实状态，没有噪声和延迟；不计空气阻力，所以前馈算出的加速度和实际需要的完全一致——真实飞机上前馈会有误差。');

K.quiz(el.querySelector('#q6'), 'l6', [
  { q: '参考位置突然跳一下（阶跃），对飞机意味着什么？', o: ['没影响', '要求瞬间无穷大的加速度：推力和倾角顶到上限，机身猛甩', '只是速度变快', '控制器会自动变平滑'], a: 1,
    e: '位置跳变，相当于要求无穷大的速度和加速度。物理上做不到，于是倾角和推力都饱和，误差也最大。' },
  { q: '“微分平坦”告诉我们什么？', o: ['四旋翼只能在平地上飞', '只要给出位置曲线（和机头朝向），推力、倾角、角速度都能直接算出来', '轨迹必须是直线', '控制器不需要反馈'], a: 1,
    e: '推力向量 = m(加速度 + g·ẑ)，再往下求导就得到角速度和力矩。所以规划只需要关心位置和机头朝向（前提是理想模型、推力不为零）。' },
  { q: '为什么 Mellinger 和 Kumar 选“最小 snap”而不是“最小加速度”？', o: ['计算更快', 'snap（四阶导）对应力矩，也就是桨之间的推力差；让它小，需要的力矩和电机指令变化都更温和', '论文规定的', '为了飞得更快'], a: 1,
    e: '加速度对应倾角，jerk 对应角速度，snap 对应力矩。电机能直接改变的是力矩，所以压低 snap，就是让对电机的要求尽量温和；同时轨迹的低阶导数（加速度、jerk）也都是连续的。' },
  { q: '最小 jerk 参考在加速度最大处 a = 5.77 m/s²。按平坦性，机身此刻要倾多少度？', o: ['5.77°', 'arctan(5.77 / 9.81) ≈ 30.5°', '90°', '取决于 PD 增益'], a: 1,
    e: '推力向量 = m(a + g·ẑ)，水平 5.77、竖直 9.81，所以倾角 = arctan(5.77/9.81) ≈ 30.5°，总推力 2.74 × √(5.77² + 9.81²) ≈ 31.2 N。这些都能在飞之前算好，作为前馈。' },
]);
} });
