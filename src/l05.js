K.add({ id: 'l5', num: 6, title: '几何控制 SE(3)', sub: '直接算“推力该朝哪”，大角度也不出错', render(el) {
const S = K.S;
const m = 2.74, g = K.g, Tmax = 1.95 * m * g;

/* figure: small-angle formulas vs exact, as a function of the wanted horizontal acceleration */
const accs = []; for (let a = 0; a <= 10.001; a += 0.25) accs.push(a);
const pxy = (X0, Y0, W, H, xr, yr) => [v => X0 + 44 + (v - xr[0]) / (xr[1] - xr[0]) * (W - 52), v => Y0 + H - 26 - (v - yr[0]) / (yr[1] - yr[0]) * (H - 52)];
const [ax1, ay1] = pxy(0, 0, 395, 250, [0, 10], [0, 60]), [ax2, ay2] = pxy(415, 0, 395, 250, [0, 10], [50, 105]);
const A3 = 2 * (2 * Math.PI / 3) ** 2, thE = K.deg(Math.atan(A3 / g)), thL = K.deg(A3 / g), hold = 100 * Math.cos(A3 / g);
const dot = (x, y, cls) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" class="sv-fill-${cls}"/>`;
const figSmall = S.svg(810, 272,
  S.plot(0, 0, 395, 250, { title: '倾角（°）', x: [0, 10], y: [0, 60], yt: [0, 20, 40, 60],
    series: [{ pts: accs.map(a => [a, K.deg(a / g)]), c: 'warn', dash: 1 }, { pts: accs.map(a => [a, K.deg(Math.atan(a / g))]), c: 'acc' }] }) +
  dot(ax1(A3), ay1(thL), 'warn') + S.text(ax1(A3) - 8, ay1(thL) - 4, '线性 ' + thL.toFixed(1) + '°', 'sv-s warn', 'end') +
  dot(ax1(A3), ay1(thE), 'acc') + S.text(ax1(A3) + 2, ay1(thE) + 20, '准确 ' + thE.toFixed(1) + '°', 'sv-s acc', 'middle') +
  S.plot(415, 0, 395, 250, { title: '推力里托住重量的部分（%）', x: [0, 10], y: [50, 105], yt: [60, 80, 100],
    series: [{ pts: accs.map(a => [a, 100 * Math.cos(a / g)]), c: 'warn', dash: 1 }, { pts: accs.map(a => [a, 100]), c: 'acc' }] }) +
  dot(ax2(A3), ay2(hold), 'warn') + S.text(ax2(A3) - 8, ay2(hold) + 4, '线性只托住 ' + hold.toFixed(0) + '%', 'sv-s warn', 'end') +
  S.text(405, 268, '横轴：想要的水平加速度（m/s²）；点：下面实验“周期 3 s”时的最大加速度 ' + A3.toFixed(2) + ' m/s²', 'sv-s'),
  '小角度公式（橙色虚线）和准确值（蓝绿色）');

/* figure: the three steps */
const figPipe = S.svg(810, 200,
  S.box(10, 60, 230, 84, '① 想要的总力 F', 'm·(a参考 + PD + g·ẑ)', 'hl') +
  S.box(290, 60, 230, 84, '② 机身 z 轴对准 F', '推力 = F 在 z 轴上的投影', 'hl') +
  S.box(570, 60, 230, 84, '③ 把机身转过去', '误差用 R 算 → 角速度', 'hl') +
  S.arrow(240, 102, 288, 102, { c: 'acc' }) + S.arrow(520, 102, 568, 102, { c: 'acc' }) +
  S.arrow(685, 144, 685, 186, { c: 'warn' }) + S.text(675, 178, '总推力 + 角速度 → PX4', 'sv-s warn', 'end') +
  S.text(125, 40, '一个向量，不是角度', 'sv-s') + S.text(405, 40, '第 5 课：R 第三列 = 推力方向', 'sv-s') + S.text(685, 40, '不经过欧拉角，没有万向锁', 'sv-s'),
  '几何控制三步走');

/* the demo's own model run offline: period 3 s, amplitude 2 m */
function run(per, A) {
  const qg = new K.Quad({ x: 0, z: 2 }), ql = new K.Quad({ x: 0, z: 2 }), w = 2 * Math.PI / per, out = [];
  qg.vx = ql.vx = A * w; let t = 0; const h = 0.002;
  for (let n = 0; n < Math.round(2 * per / h); n++) {
    t += h;
    const xr = A * Math.sin(w * t), vr = A * w * Math.cos(w * t), ar = -A * w * w * Math.sin(w * t);
    { const q = qg, Fx = q.m * (ar + 4 * (xr - q.x) + 3.2 * (vr - q.vx)), Fz = q.m * (K.g + 4 * (2 - q.z) - 3.2 * q.vz);
      const [T, thd] = K.geo(q, Fx, Fz, K.rad(70)); q.step(h, T, K.att(q, thd, 1.5)); }
    { const q = ql, axc = ar + 4 * (xr - q.x) + 3.2 * (vr - q.vx), azc = 4 * (2 - q.z) - 3.2 * q.vz;
      q.step(h, q.m * (K.g + azc), K.att(q, K.clamp(axc / K.g, -1.2, 1.2), 1.5)); }
    if (n % 15 === 0) out.push([t, qg.z, ql.z, Math.abs(xr - qg.x) * 100, Math.abs(xr - ql.x) * 100]);
  }
  return out;
}
const R3 = run(3, 2), zg = Math.min(...R3.map(p => p[1])), zl = Math.min(...R3.map(p => p[2]));
const eg = Math.max(...R3.filter(p => p[0] > 3).map(p => p[3])), el_ = Math.max(...R3.filter(p => p[0] > 3).map(p => p[4]));
const figRun = S.svg(810, 240,
  S.plot(0, 0, 395, 240, { title: '高度（m）', x: [0, 6], y: [1, 2.3], xu: 's', yt: [1.2, 1.6, 2], hl: [{ v: 2, label: '目标 2 m' }],
    series: [{ pts: R3.map(p => [p[0], p[2]]), c: 'warn', label: '线性' }, { pts: R3.map(p => [p[0], p[1]]), c: 'acc', label: '几何' }] }) +
  S.plot(415, 0, 395, 240, { title: '水平误差（cm）', x: [0, 6], y: [0, 50], xu: 's', yt: [0, 20, 40],
    series: [{ pts: R3.map(p => [p[0], p[4]]), c: 'warn', label: '线性' }, { pts: R3.map(p => [p[0], p[3]]), c: 'acc', label: '几何' }] }),
  '同一条轨迹（±2 m，周期 3 s）两种控制器的高度和水平误差');

/* figure: relation to lesson 3 */
const figRel = S.svg(810, 250,
  S.text(10, 30, '第 3 课 级联', 'sv-t', 'start') +
  S.box(10, 42, 180, 60, '位置环 + 速度环', '合起来 = PD', 'px') + S.box(220, 42, 180, 60, '想要的加速度', '先算一个数', 'px') +
  S.box(430, 42, 180, 60, 'tanθ = a / g', '小角度时 θ ≈ a / g', 'px') + S.box(640, 42, 160, 60, '角速度', '→ PX4', 'px') +
  S.arrow(190, 72, 218, 72, { c: 'warn' }) + S.arrow(400, 72, 428, 72, { c: 'warn' }) + S.arrow(610, 72, 638, 72, { c: 'warn' }) +
  S.text(10, 156, '本课 SE(3)', 'sv-t', 'start') +
  S.box(10, 162, 180, 60, 'PD + 前馈 a参考', '同样的误差项', 'hl') + S.box(220, 162, 180, 60, '力向量 F', '方向 + 大小一起算', 'hl') +
  S.box(430, 162, 180, 60, 'z_b 对准 F', '第 5 课 R 第三列', 'hl') + S.box(640, 162, 160, 60, '角速度', '→ PX4', 'hl') +
  S.arrow(190, 192, 218, 192, { c: 'acc' }) + S.arrow(400, 192, 428, 192, { c: 'acc' }) + S.arrow(610, 192, 638, 192, { c: 'acc' }) +
  [100, 310, 520, 720].map((x, i) => `<line x1="${x}" y1="104" x2="${x}" y2="160" class="sv-l-grid" stroke-dasharray="3 3"/>` + S.text(x + 6, 128, ['几乎一样', '数 → 向量', '近似 → 准确', '一样'][i], 'sv-s', 'start')).join(''),
  '和第 3 课级联的对应关系');

/* walkthrough: the turnaround point of the period-3 s trajectory, x = -2 m, a = +8.77 m/s^2 */
const Fx = m * A3, Fz = m * g, Fn = Math.hypot(Fx, Fz), thd = Math.atan2(Fx, Fz);
const thL_r = A3 / g, Tl = m * g, vl = Tl * Math.cos(thL_r), hl_ = Tl * Math.sin(thL_r), azl = (vl - m * g) / m;
const thNow = K.rad(35), Tproj = Fx * Math.sin(thNow) + Fz * Math.cos(thNow), wd = K.clamp(8 * 1.5 * (thd - thNow), -7, 7);
const sc = 4.2; /* px per N */
function forceFig(extra, opt) {
  opt = opt || {}; const ox = 170, oy = 222, k = 6.2, X = ox + Fx * k, Y = oy - Fz * k;
  let b = `<line x1="${ox}" y1="${oy}" x2="${X}" y2="${oy}" class="sv-l-warn" marker-end="url(#AH-warn)"/>` + S.text((ox + X) / 2, oy + 18, 'm·a = ' + Fx.toFixed(1) + ' N', 'sv-nw') +
    `<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${Y}" class="sv-l-b" marker-end="url(#AH-b)"/>` + S.text(ox - 8, (oy + Y) / 2, 'm·g = ' + Fz.toFixed(1) + ' N', 'sv-nb', 'end');
  if (opt.F) b += `<line x1="${ox}" y1="${oy}" x2="${X}" y2="${Y}" class="sv-l-acc" style="stroke-width:3" marker-end="url(#AH-acc)"/>` + S.text(X + 8, Y + 4, 'F = ' + Fn.toFixed(1) + ' N', 'sv-n', 'start') +
    `<path d="M${ox} ${oy - 50} A50 50 0 0 1 ${(ox + 50 * Math.sin(thd)).toFixed(1)} ${(oy - 50 * Math.cos(thd)).toFixed(1)}" class="sv-l-ink" style="stroke-width:1.4"/>` + S.text(ox + 14, oy - 58, K.deg(thd).toFixed(1) + '°', 'sv-t', 'start');
  return S.svg(810, 250, b + extra, '力向量');
}
const trajFig = S.svg(810, 200,
  `<line x1="150" y1="110" x2="660" y2="110" class="sv-l-soft" stroke-dasharray="5 4"/>` + S.text(150, 134, '−2 m', 'sv-s') + S.text(660, 134, '+2 m', 'sv-s') + S.text(405, 134, '参考轨迹：左右往返，周期 3 s', 'sv-s') +
  S.quad(150, 80, 0, 40) + `<circle cx="150" cy="110" r="6" class="sv-fill-warn"/>` +
  S.arrow(150, 160, 260, 160, { c: 'warn' }) + S.text(272, 165, 'a参考 = +' + A3.toFixed(2) + ' m/s²（掉头，加速度最大）', 'sv-nw', 'start') +
  S.text(150, 190, '此刻：x = −2 m，速度 0', 'sv-s', 'start'), '参考轨迹的掉头点');
const linFig = (() => {
  const ox = 200, oy = 190, tx = ox + Tl * sc * Math.sin(thL_r), ty = oy - Tl * sc * Math.cos(thL_r);
  return S.svg(810, 250,
    S.quad(ox, oy, K.deg(thL_r), 55) +
    `<line x1="${ox}" y1="${oy}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}" class="sv-l-warn" style="stroke-width:3" marker-end="url(#AH-warn)"/>` +
    `<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${(oy - vl * sc).toFixed(1)}" class="sv-l-bad" stroke-dasharray="5 4" marker-end="url(#AH-bad)"/>` +
    S.text(ox - 8, (oy - vl * sc - 8).toFixed(1), '竖直 ' + vl.toFixed(1) + ' N', 'sv-s bad', 'end') +
    S.text(tx + 10, ty + 4, '推力 ' + Tl.toFixed(1) + ' N（= m·g）', 'sv-nw', 'start') +
    S.text(490, 90, '倾角 = ' + A3.toFixed(2) + ' / 9.81 = ' + thL_r.toFixed(3) + ' rad = ' + K.deg(thL_r).toFixed(1) + '°', 'sv-t', 'start') +
    S.text(490, 124, '竖直 ' + vl.toFixed(1) + ' N，只托住重量的 ' + (100 * vl / (m * g)).toFixed(0) + '%', 'sv-s bad', 'start') +
    S.text(490, 146, '水平 ' + hl_.toFixed(1) + ' N，比需要的 ' + Fx.toFixed(1) + ' N 少', 'sv-s bad', 'start') +
    S.text(490, 168, '→ 往下掉 ' + (-azl).toFixed(2) + ' m/s²，也跟不上', 'sv-s bad', 'start'), '小角度公式的结果');
})();
const projFig = S.svg(810, 250,
  S.quad(200, 190, 35, 70) +
  `<line x1="200" y1="190" x2="${(200 + Fn * sc * Math.sin(thd)).toFixed(1)}" y2="${(190 - Fn * sc * Math.cos(thd)).toFixed(1)}" class="sv-l-acc" style="stroke-width:2" stroke-dasharray="6 4" marker-end="url(#AH-acc)"/>` +
  S.text((200 + Fn * sc * Math.sin(thd) + 8).toFixed(1), (190 - Fn * sc * Math.cos(thd)).toFixed(1), '想要 F（' + K.deg(thd).toFixed(1) + '°）', 'sv-s acc', 'start') +
  `<line x1="200" y1="190" x2="${(200 + Tproj * sc * Math.sin(thNow)).toFixed(1)}" y2="${(190 - Tproj * sc * Math.cos(thNow)).toFixed(1)}" class="sv-l-ink" style="stroke-width:3" marker-end="url(#AH-ink)"/>` +
  S.text((200 + Tproj * sc * Math.sin(thNow) - 30).toFixed(1), (190 - Tproj * sc * Math.cos(thNow) - 8).toFixed(1), '机身 z 轴（现在 35°）', 'sv-s', 'end') +
  S.text(450, 70, '推力 = F · z_b', 'sv-t', 'start') +
  S.text(450, 96, '= ' + Fx.toFixed(1) + '×sin35° + ' + Fz.toFixed(1) + '×cos35°', 'sv-n', 'start') + S.text(450, 120, '= ' + Tproj.toFixed(1) + ' N', 'sv-n', 'start') +
  S.text(450, 160, '角速度 = 12 × (41.8° − 35°)', 'sv-t', 'start') + S.text(450, 184, '= ' + wd.toFixed(2) + ' rad/s（' + K.deg(wd).toFixed(0) + '°/s）', 'sv-n', 'start') +
  S.text(450, 214, '“' + Tproj.toFixed(1) + ' N + ' + wd.toFixed(2) + ' rad/s”发给 PX4', 'sv-s warn', 'start'), '投影和角速度');

el.innerHTML = `
<p class="lede">2010 年 Lee、Leok 和 McClamroch 提出的<span class="term">几何控制</span>（常写作 SE(3) 控制器）是现在最常用的四旋翼基线之一。它的思路是：先算“我要一个什么样的力向量”，再把推力箭头对准它。零件你都学过了。</p>

<h2>老办法：小角度近似</h2>
${K.fig(figSmall, '很多控制器假设倾角很小（sinθ ≈ θ、cosθ ≈ 1），于是“倾角 ≈ a / g、总推力 ≈ m·g”。加速度 ' + A3.toFixed(2) + ' m/s² 时，它算出 ' + thL.toFixed(1) + '°（准确值 ' + thE.toFixed(1) + '°），推力里只有 ' + hold.toFixed(0) + '% 在托重量：<b>倾角算大、高度往下掉</b>。')}
${K.more('展开：小角度线性化是什么，为什么还有人用', `<div class="formula">倾角 ≈ 想要的水平加速度 / g        总推力 ≈ m·(g + 想要的竖直加速度)
<div class="where">这叫<span class="term">小角度线性化</span>。悬停附近很好用：公式简单，可以用经典的线性控制理论分析稳定性。动作越激进，误差越大；掉下去的高度要等高度反馈出现误差后才能慢慢补回来。</div></div>`)}

<h2>几何控制：三步走</h2>
${K.fig(figPipe, '<b>①</b> PD 误差项 + 参考加速度（前馈）+ 抵消重力，加成一个力向量。<b>②</b> 推力只能沿机身 z 轴，所以让 z 轴转到 F 的方向，推力取 F 在当前 z 轴上的投影。<b>③</b> 姿态误差直接用旋转矩阵算，输出角速度交给 PX4。')}
${K.more('展开：公式和前提', `<div class="formula">F = m·( a<sub>参考</sub> + K<sub>p</sub>·e<sub>位置</sub> + K<sub>d</sub>·e<sub>速度</sub> + g·ẑ )
<div class="where">e<sub>位置</sub> = 参考位置 − 当前位置，e<sub>速度</sub> = 参考速度 − 当前速度；ẑ：竖直向上的单位向量。这里把增益写在括号里面（乘了 m），原论文写在外面，只差一个比例。</div></div>
<p>原论文第 ③ 步直接算出力矩；${K.ours('', `在 CTBR 接口（总推力 + 角速度）下`)}，改为输出想要的角速度，交给 PX4 的角速度环。</p>
<p>几何控制不做小角度近似，但仍依赖模型：质量、推力算得不准，或者有没建模的外力（风、机械臂），照样会有误差。原论文的稳定性证明也有前提（例如初始姿态误差不能太大），并不是对所有初始状态都成立。</p>`)}
<div id="walk"></div>

<h2>同一条轨迹，飞出来差多少</h2>
${K.fig(figRun, '用下面实验的同一个模型离线跑 6 秒。小角度版本每次掉头都往下掉，最低到 <b>' + zl.toFixed(2) + ' m</b>（掉了 ' + ((2 - zl) * 100).toFixed(0) + ' cm）；几何控制最低 <b>' + zg.toFixed(2) + ' m</b>。水平最大误差 ' + el_.toFixed(0) + ' cm 对 ' + eg.toFixed(0) + ' cm。')}
<div id="d5"></div>

<h2>和第 3 课的关系</h2>
${K.fig(figRel, '第 3 课的 PX4 外环也是“先算加速度（推力向量），再换成姿态目标”。几何控制把它写成严格的向量形式：方向和大小一起算，大角度也成立。两者的主要区别在增益结构和姿态误差的算法。')}
${K.more(K.ours('', '展开：出处'), `${K.ours('')}<p>出处：T. Lee, M. Leok, N. H. McClamroch, “Geometric tracking control of a quadrotor UAV on SE(3)”, IEEE CDC 2010。</p>`)}

<div class="key"><h3>这一课记住三件事</h3><ul>
<li>小角度线性化在大机动时会掉高度、算偏倾角。</li>
<li>几何控制先算想要的力向量 F，再把机身 z 轴对准 F。</li>
<li>它不做小角度近似，但仍依赖模型；它是很多方法的基础。</li>
</ul></div>
<h2>小测验</h2><div id="q5"></div>`;

K.steps(el.querySelector('#walk'), { title: '用数字走一遍：±2 m 往返、周期 3 s，在掉头点那一刻', steps: [
  { svg: trajFig, t: '<b>参考</b>：x = 2 sin(2πt/3)。掉头点速度为 0，加速度最大：2 × (2π/3)² = <b>' + A3.toFixed(2) + ' m/s²</b>。先假设飞机正好在参考上（误差为 0），只看前馈。' },
  { svg: forceFig(''), t: '<b>① 算力的两个分量</b>：水平要 m·a = 2.74 × ' + A3.toFixed(2) + ' = <b>' + Fx.toFixed(1) + ' N</b>；竖直要托住重量 2.74 × 9.81 = <b>' + Fz.toFixed(1) + ' N</b>。' },
  { svg: forceFig(S.text(470, 90, '方向：arctan(' + Fx.toFixed(1) + ' / ' + Fz.toFixed(1) + ') = ' + K.deg(thd).toFixed(1) + '°', 'sv-t', 'start') + S.text(470, 118, '大小：√(' + Fx.toFixed(1) + '² + ' + Fz.toFixed(1) + '²) = ' + Fn.toFixed(1) + ' N', 'sv-t', 'start') + S.text(470, 146, '是最大推力 ' + Tmax.toFixed(1) + ' N 的 ' + (100 * Fn / Tmax).toFixed(0) + '%，做得到', 'sv-s', 'start'), { F: 1 }),
    t: '<b>② 合成 F</b>：两个分量加成一个向量，长 <b>' + Fn.toFixed(1) + ' N</b>，偏离竖直 <b>' + K.deg(thd).toFixed(1) + '°</b>。机身 z 轴就该对准这个方向。' },
  { svg: linFig, t: '<b>对比：小角度公式</b>算出倾角 ' + K.deg(thL_r).toFixed(1) + '°（多歪了 ' + (K.deg(thL_r) - K.deg(thd)).toFixed(1) + '°），推力还是 m·g = ' + Tl.toFixed(1) + ' N。竖直只剩 <b>' + vl.toFixed(1) + ' N</b>，飞机以 ' + (-azl).toFixed(2) + ' m/s² 往下掉。' },
  { svg: projFig, t: '<b>③ 机身还没转到位时</b>：假设现在只倾了 35°。推力取 F 在当前 z 轴上的投影 <b>' + Tproj.toFixed(1) + ' N</b>（不浪费在错误的方向上）；差的 6.8° 乘姿态增益 12，得到角速度 <b>' + wd.toFixed(2) + ' rad/s</b>，交给 PX4 的角速度环（第 3 课）。' },
] });

const d = K.demo(el.querySelector('#d5'), '动手', '同一条轨迹，两种控制器',
  '两架飞机同时沿同一条左右往返的轨迹飞：蓝绿色用几何控制，橙色用小角度线性化。把“往返周期”调短，动作变激进，看谁先掉高度。');
const cA = K.canvas(d, 0.42, 220), cB = K.canvas(d, 0.36, 200);
const ctl = K.box(d, 'controls'), ro = K.box(d, 'readout');
const qg = new K.Quad({ x: 0, z: 2 }), ql = new K.Quad({ x: 0, z: 2 });
let t = 0; const hb = K.buf(10);
const sPer = K.slider(ctl, { id: 'l5-p', label: '往返周期（越短越激进）', min: 2.6, max: 10, step: 0.1, value: 6, fmt: v => v.toFixed(1) + ' s', on: reset });
const sA = K.slider(ctl, { id: 'l5-a', label: '往返幅度', min: 0.5, max: 2.5, step: 0.1, value: 2, fmt: v => '±' + v.toFixed(1) + ' m', on: reset });
const br = K.box(ctl, 'btnrow');
K.btn(br, '重来', reset, 'primary');
K.btn(br, '激进一点：3 s', () => sPer.set(3));
function reset() { qg.reset(0, 2); ql.reset(0, 2); t = 0; hb.clear(); const w = 2 * Math.PI / sPer.v; qg.vx = ql.vx = sA.v * w; }
reset();
const Kp = 4, Kd = 3.2;
K.loop(dt => {
  const w = 2 * Math.PI / sPer.v, A = sA.v;
  K.sub(dt, 0.002, h => {
    t += h;
    const xr = A * Math.sin(w * t), vr = A * w * Math.cos(w * t), ar = -A * w * w * Math.sin(w * t), zr = 2;
    { const q = qg; const Fx = q.m * (ar + Kp * (xr - q.x) + Kd * (vr - q.vx)), Fz = q.m * (K.g + Kp * (zr - q.z) - Kd * q.vz);
      const [T, thd] = K.geo(q, Fx, Fz, K.rad(70)); q.step(h, T, K.att(q, thd, 1.5)); }
    { const q = ql; const axc = ar + Kp * (xr - q.x) + Kd * (vr - q.vx), azc = Kp * (zr - q.z) - Kd * q.vz;
      const thd = K.clamp(axc / K.g, -1.2, 1.2), T = q.m * (K.g + azc); q.step(h, T, K.att(q, thd, 1.5)); }
    [qg, ql].forEach(q => { if (Math.abs(q.th) > 2 || q.z <= 0) { const keep = q.ground; q.reset(xr, 2); q.vx = vr; } });
  });
  const xr = A * Math.sin(w * t);
  hb.push(t, qg.z, ql.z, Math.abs(xr - qg.x) * 100, Math.abs(xr - ql.x) * 100);
  const c = K.col(), a = cA.fit(), v = K.view(a.w, a.h, -3.2, 3.2, -0.1, 3.4, 8), ctx = a.ctx;
  K.grid(ctx, v, c, 1);
  ctx.strokeStyle = c.soft; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(v.X(-A), v.Y(2)); ctx.lineTo(v.X(A), v.Y(2)); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = c.soft; ctx.beginPath(); ctx.arc(v.X(xr), v.Y(2), 5, 0, 7); ctx.fill();
  K.drawQuad(ctx, v.X(ql.x), v.Y(ql.z), ql.th, v.s * 1.4, { color: c.warn, label: '线性' });
  K.drawQuad(ctx, v.X(qg.x), v.Y(qg.z), qg.th, v.s * 1.4, { color: c.acc, label: '几何' });
  K.text(ctx, '灰点：参考位置', 10, 18, c.soft);
  const b = cB.fit(), W = K.win(t, 10);
  K.plot(b.ctx, 0, 0, b.w / 2, b.h, { title: '高度', unit: 'm', x: W, y: [1, 2.5], hl: [{ v: 2, color: c.soft, label: '目标 2 m' }], series: [{ buf: hb, i: 2, color: c.warn, label: '线性' }, { buf: hb, i: 1, color: c.acc, label: '几何' }], xfmt: x => x.toFixed(0) + 's' });
  K.plot(b.ctx, b.w / 2, 0, b.w / 2, b.h, { title: '水平误差', unit: 'cm', x: W, y: [0, 60], series: [{ buf: hb, i: 4, color: c.warn, label: '线性' }, { buf: hb, i: 3, color: c.acc, label: '几何' }], xfmt: x => x.toFixed(0) + 's' });
  const amax = A * w * w, tilt = K.deg(Math.atan(amax / K.g)), thr = Math.hypot(K.g, amax) / K.g * 51;
  ro.innerHTML = `<span>最大加速度 <b>${amax.toFixed(1)} m/s²</b></span><span>需要的最大倾角 <b>${tilt.toFixed(0)}°</b></span><span>需要的最大推力 <b class="${thr > 100 ? 'hot' : ''}">${thr.toFixed(0)}%</b>${thr > 100 ? '（超过上限，谁都跟不上）' : ''}</span>`;
});

K.box(d, 'assume', '<b>这个实验做了哪些简化：</b>只看侧面（二维）；两种控制器都直接读真实状态，没有噪声和延迟；不计空气阻力；电机用一阶延迟近似。现象只说明“小角度线性化在大倾角时会出偏差”，不代表两类控制器在真实飞机上的整体优劣。');

K.quiz(el.querySelector('#q5'), 'l5', [
  { q: '几何控制第一步算的是什么？', o: ['想要的倾角', '想要的总力向量 F（包括抵消重力的部分）', '四个桨的转速', '欧拉角'], a: 1,
    e: 'F = m(a参考 + PD 误差项 + g·ẑ)。然后让推力方向对准 F，推力大小取 F 在当前机身 z 轴上的投影。' },
  { q: '小角度线性化的控制器在激进机动时为什么会掉高度？', o: ['电机过热', '它以为推力 m·g 就能托住重量，其实倾斜后竖直分量只有 T·cosθ', '传感器延迟', '积分饱和'], a: 1,
    e: '这就是 cosθ ≈ 1 这个近似的代价。倾角越大，差得越多。' },
  { q: 'PX4 外环和几何控制是什么关系？', o: ['完全无关', '都先算一个推力向量，再换成姿态目标，思路相近', 'PX4 用的是 MPC', 'PX4 不控制姿态'], a: 1,
    e: 'PX4 速度环输出推力向量，再转换成姿态目标。几何控制把这个过程写成了严格的数学形式，大角度也成立。' },
  { q: '掉头点要水平加速 8.77 m/s²。小角度公式给出倾角 51.2°、推力 m·g。竖直方向大约托住了重量的多少？', o: ['100%，推力就是 m·g', '约 63%（cos51.2° ≈ 0.63），所以往下掉', '约 89%', '超过 100%，会往上飞'], a: 1,
    e: '推力 m·g 倾斜 51.2° 后，竖直分量只有 m·g·cos51.2° ≈ 0.63·m·g。几何控制改为让推力沿 F = m(a + g·ẑ) 方向（41.8°），大小 36.1 N，竖直分量正好等于重量。' },
]);
} });
