K.add({ id: 'l3', num: 3, title: '级联控制：PX4 怎么飞', sub: '位置 → 速度 → 姿态 → 角速度，一层套一层', render(el) {
const S = K.S;

/* figure: what PX4 is and where an external (offboard) controller plugs in */
const figPX4 = S.svg(780, 280,
  `<rect x="170" y="96" width="440" height="170" rx="12" class="sv-box" stroke-dasharray="6 5"/>` +
  S.text(186, 258, 'PX4：跑在飞控板（Pixhawk 6C）上的开源飞控软件', 'sv-s', 'start') +
  S.box(20, 160, 120, 70, '传感器', '陀螺仪、定位等') +
  S.box(190, 160, 120, 70, '状态估计', 'EKF2（第 4 课）') +
  S.box(330, 160, 120, 70, '一层层控制', '本课', 'hl') +
  S.box(470, 160, 120, 70, '电机分配', '力矩 → 每个电机') +
  S.box(640, 160, 120, 70, '电调 → 电机', '× 4') +
  S.arrow(140, 195, 188, 195, { label: '读数' }) +
  S.arrow(310, 195, 328, 195) + S.arrow(450, 195, 468, 195) +
  S.arrow(590, 195, 638, 195, { label: '转速' }) +
  S.box(290, 10, 200, 50, '伴随计算机', K.ours('', '外部控制器'), 'px') +
  S.arrow(390, 60, 390, 158, { c: 'warn', label: 'offboard：推力 + 角速度，125 次/秒', side: 'right' }),
  'PX4 读传感器、估计状态、一层层控制、分配到电机；' + K.ours('', '外部控制器（offboard）从外面给它发指令') + '');

/* figure: the cascade */
const BX = [30, 230, 430, 630], BW = 150, NAMES = [['位置环', 'P'], ['速度环', 'PID'], ['姿态环', 'P'], ['角速度环', 'PID']];
const OUTS = ['想要的速度', '想要的倾角 + 推力', '想要的角速度'];
const MEAS = ['位置', '速度', '倾角', '角速度'];
const figCas = S.svg(820, 290,
  `<path d="M30 40 v-10 h550 v10" class="sv-l-warn" style="stroke-width:1.5"/>` + S.text(305, 22, '' + K.ours('', 'offboard 时外部控制器替代这三层（例如 125 次/秒）') + '', 'sv-s warn') +
  `<path d="M630 40 v-10 h150 v10" class="sv-l-soft" style="stroke-width:1.5"/>` + S.text(705, 22, 'PX4 自己做（500 次/秒）', 'sv-s') +
  BX.map((x, i) => S.box(x, 56, BW, 64, NAMES[i][0], NAMES[i][1], i < 3 ? 'hl' : 'px')).join('') +
  OUTS.map((t, i) => S.arrow(BX[i] + BW, 88, BX[i + 1] - 2, 88, { c: 'acc' }) + S.text(BX[i] + BW + 25, 146, t, 'sv-s acc')).join('') +
  S.arrow(705, 120, 705, 168, { c: 'acc', label: '力矩 → 电机', side: 'right' }) +
  MEAS.map((t, i) => S.arrow(BX[i] + 40, 250, BX[i] + 40, 122, { dash: 1 }) + S.text(BX[i] + 46, 205, '测到的' + t, 'sv-s', 'start')).join('') +
  `<rect x="30" y="252" width="750" height="30" rx="6" class="sv-box"/>` + S.text(405, 272, '状态估计（第 4 课）给每一层提供测量值', 'sv-s'),
  '级联控制：每一层的输出是下一层的目标，每一层都拿自己的测量值来比');

/* walkthrough diagrams: the cascade with numbers filled in up to step k */
const VAL_IN = ['目标 2 m，现在 0', '2.4 m/s', '30.2°，31.1 N', '3.5 rad/s'], CALC = ['1.2 × 2', '3 × (2.4 − 0.5)', '8 × (30.2° − 5°)', '0.03 × 25 × 3.5'];
const OUTV = ['2.4 m/s', '5.7 m/s² → 30.2°', '3.5 rad/s', '2.6 N·m'];
function casStep(k) {
  let b = '';
  BX.forEach((x, i) => { b += S.box(x, 40, BW, 70, NAMES[i][0], i <= k ? CALC[i] : NAMES[i][1], (i === k ? 'hl on' : i < k ? 'hl' : 'dim')); });
  for (let i = 0; i < 3; i++) b += S.arrow(BX[i] + BW, 75, BX[i + 1] - 2, 75, { c: i < k ? 'acc' : 'soft' });
  for (let i = 0; i <= Math.min(k, 3); i++) b += S.text(BX[i] + BW / 2, 140, '→ ' + OUTV[i], i === k ? 'sv-n' : 'sv-s');
  b += S.text(BX[0] + BW / 2, 24, VAL_IN[0], 'sv-s');
  return S.svg(820, 160, b, '级联第 ' + (k + 1) + ' 层的计算');
}
const tri = S.svg(820, 230,
  `<line x1="300" y1="200" x2="461" y2="200" class="sv-l-warn" marker-end="url(#AH-warn)"/>` + S.text(380, 220, '水平：5.7 m/s²（要向前加速）', 'sv-nw') +
  `<line x1="300" y1="200" x2="300" y2="24" class="sv-l-b" marker-end="url(#AH-b)"/>` + S.text(292, 110, '竖直：9.81 m/s²', 'sv-nb', 'end') + S.text(292, 128, '（托住重力）', 'sv-s', 'end') +
  `<line x1="300" y1="200" x2="461" y2="24" class="sv-l-acc" style="stroke-width:3" marker-end="url(#AH-acc)"/>` + S.text(400, 92, '推力方向', 'sv-n', 'start') +
  `<path d="M300 150 A50 50 0 0 1 333 162" class="sv-l-ink" style="stroke-width:1.4"/>` + S.text(330, 140, '30.2°', 'sv-t', 'start') +
  S.text(560, 90, 'tan θ = 5.7 / 9.81 → θ = 30.2°', 'sv-t', 'start') +
  S.text(560, 118, '推力 = m·g / cos θ', 'sv-t', 'start') + S.text(560, 142, '= 2.74 × 9.81 / 0.864 = 31.1 N', 'sv-n', 'start'),
  '想要的加速度换算成倾角和总推力');
const split = (th, fl, fr, cap, note) => S.svg(820, 210,
  S.quad(410, 130, th, 90, { fl, fr }) +
  S.text(310, 40, '后桨（左）', 'sv-s') + S.text(510, 40, '前桨（右）', 'sv-s') + S.text(410, 200, cap, 'sv-s') +
  S.text(600, 135, note, 'sv-nw', 'start'), cap);

/* figure: PD of lesson 2 = position loop + velocity loop */
const figPD = S.svg(820, 170,
  S.box(20, 50, 200, 70, '第 2 课的 PD', 'Kp = 3.6，Kd = 3', 'b') +
  S.text(120, 36, '误差、速度', 'sv-s') + S.arrow(220, 85, 262, 85) + S.text(242, 140, '想要的加速度', 'sv-s') +
  S.text(300, 96, '=', 'sv-big') +
  S.box(340, 50, 150, 70, '位置环', '× 1.2', 'hl') + S.arrow(490, 85, 568, 85, { c: 'acc', label: '想要的速度' }) +
  S.box(570, 50, 150, 70, '速度环', '× 3', 'hl') + S.arrow(720, 85, 790, 85, { c: 'acc' }) + S.text(760, 140, '想要的加速度', 'sv-s'),
  '位置环和速度环都只有 P 时，两层合起来就是第 2 课的 PD');

/* figure: why the inner loop must be fast — the demo's own model run offline */
function run(so, si) {
  const q = new K.Quad({ x: -2, z: 2 }), out = []; let t = 0, thd = 0;
  for (let n = 0; n < 2500; n++) {
    const h = 0.002; t += h;
    const vdx = K.clamp(1.2 * so * (2 - q.x), -3, 3), vdz = K.clamp(1.5 * (2 - q.z), -2, 2);
    const ax = 3 * so * (vdx - q.vx), az = 3 * (vdz - q.vz);
    thd = K.clamp(Math.atan2(ax, K.g), -K.rad(35), K.rad(35));
    q.step(h, q.m * (K.g + az) / Math.max(0.5, Math.cos(q.th)), K.att(q, thd, si));
    if (n % 20 === 0) out.push([t, K.deg(thd), K.deg(q.th), q.x]);
  }
  return out;
}
const fast = run(1, 1), slow = run(3, 0.15);
const panel = (x0, data, title) => S.plot(x0, 0, 400, 230, { title, x: [0, 5], y: [-40, 40], xu: 's', yt: [-30, 0, 30],
  series: [{ pts: data.map(p => [p[0], p[1]]), c: 'warn', dash: 1, label: '想要的倾角' }, { pts: data.map(p => [p[0], p[2]]), c: 'acc', label: '实际倾角' }] });
const figTime = S.svg(820, 236, panel(0, fast, '内环快（默认）') + panel(420, slow, '内环慢、外环急'), '内环快时实际倾角紧跟想要的倾角；内环慢时跟不上，来回摆');

el.innerHTML = `
<p class="lede">四旋翼没法“横着推”，只能先歪过去，再借推力往前走（第 1 课）。所以“飞到那里”要拆成一串小问题，一层套一层地算。这叫<span class="term">级联控制</span>。PX4 就是这么飞的。</p>

<h2>先认识 PX4</h2>
${K.fig(figPX4, '<b>PX4</b> 是开源的无人机飞控软件，装在飞机上一块手掌大小的电路板（飞控板）上。它做四件事：读传感器 → 估计状态 → 一层层控制 → 把结果分配给四个电机。' + K.ours('', 'PX4 还有 <b>offboard 模式</b>：机上另一台小电脑（伴随计算机）运行外部控制器，例如每秒 125 次给 PX4 发“总推力 + 角速度”。') + '')}
${K.more('展开：飞行模式、参数、ArduPilot', `<p>PX4 有多种飞行模式。“位置模式”下，遥控器或程序给它目标位置或速度，下面每一层都由 PX4 自己算；offboard 模式下，外部电脑接管上面几层。PX4 里每个增益、每个限制都是一个有名字的<span class="term">参数</span>（比如 MPC_XY_P），可以在地面站软件里查看；${K.ours('', `本课的数值都取 v1.18 的出厂值。`)}另一套常见的开源飞控软件叫 ArduPilot，思路类似。</p>`)}

<h2>一层套一层</h2>
${K.fig(figCas, '每一层都是一个第 2 课那样的小控制器：拿“想要的”减“测到的”，乘一个系数，算出下一层“想要的”。' + K.ours('', 'offboard 发 CTBR 时，蓝绿色三层由外部控制器负责，橙色的角速度环留在 PX4 里。') + '')}
<div id="walk"></div>

<h2>和第 2 课的 PID 是什么关系</h2>
${K.fig(figPD, '位置环：想要的速度 = 1.2 × 误差。速度环：想要的加速度 = 3 × (想要的速度 − 速度)。代进去：想要的加速度 = 3.6 × 误差 − 3 × 速度，<b>正好是第 2 课的 PD</b>（K<sub>p</sub> = 1.2 × 3，K<sub>d</sub> = 3）。')}
<div class="tblwrap"><table class="tbl">
<tr><th>第 2 课里的东西</th><th>在级联里的位置</th></tr>
<tr><td>P、D</td><td>位置环 + 速度环两层合起来（上图）</td></tr>
<tr><td>悬停前馈 m·g</td><td>换算倾角时“竖直方向托住 g”那一项；PX4 里是悬停推力参数 MPC_THR_HOVER，飞行中还会实时估计</td></tr>
<tr><td>积分 I</td><td>PX4 速度环里的积分：被风一直吹、挂了东西时慢慢补上偏差</td></tr>
<tr><td>D 的“刹车”</td><td>角速度环是完整的 PID，D 防止转过头</td></tr>
</table></div>
${K.more('展开：既然一样，为什么要拆成两层？PX4 的出厂参数', `<ul>
<li><b>中间量可以单独限制。</b>“想要的速度最多 3 m/s”，在两层之间加个上限就行（PX4 参数 MPC_XY_VEL_MAX）。</li>
<li><b>可以从中间接进来。</b>遥控器推杆通常代表“想要的速度”，直接从速度环开始。</li>
<li><b>水平方向必须先歪。</b>所以加速度下面还要接姿态环和角速度环；第 2 课只管高度，直接改推力就行。</li>
</ul>
<div class="tblwrap"><table class="tbl">
<tr><th>层</th><th>控制器</th><th>PX4 v1.18 出厂值（前后方向）</th></tr>
<tr><td>位置环</td><td>P</td><td>MPC_XY_P = 0.95</td></tr>
<tr><td>速度环</td><td>PID</td><td>P 1.8，I 0.4，D 0.2（MPC_XY_VEL_*_ACC）</td></tr>
<tr><td>姿态环</td><td>P</td><td>MC_PITCH_P = 4.0</td></tr>
<tr><td>角速度环</td><td>PID</td><td>MC_PITCHRATE_P 0.15，I 0.2，D 0.003（输出是 0–1 的归一化力矩，所以数值小）</td></tr>
</table></div>
<p>频率：真机上取决于飞控板和参数；${K.ours('', `常见的量级是位置 / 速度环几十到上百 Hz、姿态环几百 Hz、角速度环几百到上千 Hz。`)}</p>`)}

<h2>为什么内环要快</h2>
${K.fig(figTime, '用下面实验的同一个模型，让飞机从 −2 m 飞到 +2 m。<b>左</b>：内环快，倾角零点几秒就到位，外环“说到就做到”的假设成立。<b>右</b>：内环慢、外环又急，倾角永远追不上指令，外环不停加码再反向，飞机来回摆。经验上内环要比外环快好几倍（常说 3–10 倍），这是经验法则，不是定理。')}
<div id="d3"></div>

<div class="key"><h3>这一课记住三件事</h3><ul>
<li>PX4 是跑在飞控板上的开源飞控软件：读传感器 → 估计状态 → 一层层控制 → 驱动电机。</li>
<li>级联：位置 → 速度 → 姿态 → 角速度，每层是一个小控制器；位置环 + 速度环合起来就是第 2 课的 PD。</li>
<li>内环要比外环快好几倍；${K.ours('', `offboard 发 CTBR 时，外部控制器替代外面三层，把总推力和角速度交给 PX4。`)}</li>
</ul></div>
<h2>小测验</h2><div id="q3"></div>`;

K.steps(el.querySelector('#walk'), { title: '用数字走一遍：目标在前方 2 m，现在速度 0.5 m/s、已前倾 5°', steps: [
  { svg: casStep(0), t: '<b>位置环</b>：还差 2 − 0 = 2 m，乘 1.2，想要的速度 <b>2.4 m/s</b>。' },
  { svg: casStep(1), t: '<b>速度环</b>：想要 2.4，现在 0.5，差 1.9；乘 3，想要往前加速 <b>5.7 m/s²</b>。' },
  { svg: tri, t: '<b>换算成倾角和推力</b>：水平要 5.7、竖直要托住 9.81，推力只能沿着机身方向，所以要歪 <b>30.2°</b>，总推力 <b>31.1 N</b>（比悬停的 26.9 N 大，因为歪了以后只有一部分推力向上）。' },
  { svg: casStep(2), t: '<b>姿态环</b>：想歪 30.2°，现在 5°，差 25.2°（0.44 rad）；乘 8，想要的转动速度 <b>3.5 rad/s</b>（约 200°/s）。' + K.ours('', 'offboard 的外部控制器算到这里，把“31.1 N + 3.5 rad/s”发给 PX4。') + '' },
  { svg: casStep(3), t: '<b>角速度环（PX4）</b>：想转 3.5 rad/s，现在 0；乘转动惯量 0.03 和增益 25，需要力矩 <b>2.6 N·m</b>。' },
  { svg: split(5, 83, 41, '总推力 31.1 N ± 力矩 2.6 ÷ (2 × 0.25 m)', '往前低头'), t: '<b>分配到电机</b>：后桨 31.1/2 + 5.3 = <b>20.8 N</b>，前桨 <b>10.3 N</b>。后面推得多，机身往前低头，于是开始往前加速。' },
  { svg: split(20, 25, 88, '还差 0.4 m、速度 1.5 m/s：想要的加速度 3 × (0.48 − 1.5) = −3.06 m/s²', '往后仰、刹车'), t: '<b>快到的时候</b>：还差 0.4 m，想要的速度只剩 0.48 m/s，比现在慢 1 m/s，想要的加速度变成 <b>−3.06 m/s²</b>，倾角 <b>−17°</b>。于是前桨推得多（21.9 N 对 6.3 N），机身抬头刹车。没有哪一层专门写“刹车”，它是一层层算出来的。' },
] });

const d = K.demo(el.querySelector('#d3'), '动手', '调内环和外环的快慢',
  '在画面里点一下，设一个新目标位置。先用默认值看它怎么飞过去；再把“内环快慢”拉到最左、“外环快慢”拉到最右，再点一次目标。下面的图里，橙色虚线是外环想要的倾角，蓝绿色是实际倾角。');
const cA = K.canvas(d, 0.42, 220), cB = K.canvas(d, 0.36, 200);
const ctl = K.box(d, 'controls'), ro = K.box(d, 'readout');
const q = new K.Quad({ x: -2, z: 2 });
let tx = 2, tz = 2, t = 0, auto = true, at = 0, thd = 0;
const hb = K.buf(10);
const sO = K.slider(ctl, { id: 'l3-o', label: '外环（位置 + 速度）快慢', min: 0.3, max: 3, step: 0.1, value: 1, fmt: v => '× ' + v.toFixed(1) });
const sI = K.slider(ctl, { id: 'l3-i', label: '内环（姿态 + 角速度）快慢', min: 0.15, max: 2, step: 0.05, value: 1, fmt: v => '× ' + v.toFixed(2) });
const am = K.seg(ctl, { label: '目标', options: [['1', '自动左右切换'], ['0', '我来点']], value: '1', on: v => { auto = v === '1'; } });
const br = K.box(ctl, 'btnrow');
K.btn(br, '重来', () => { q.reset(-2, 2); tx = 2; tz = 2; t = 0; at = 0; hb.clear(); }, 'primary');
K.btn(br, '恢复默认', () => { sO.set(1); sI.set(1); });
cA.cv.addEventListener('pointerdown', ev => {
  const r = cA.cv.getBoundingClientRect(), v = K.view(cA.w, cA.h, -4.5, 4.5, -0.1, 3.8, 8);
  tx = K.clamp(v.ix(ev.clientX - r.left), -4, 4); tz = K.clamp(v.iz(ev.clientY - r.top), 0.5, 3.5); am.set('0');
});
K.loop(dt => {
  K.sub(dt, 0.002, h => {
    t += h;
    if (auto) { at += h; if (at > 5) { at = 0; tx = -tx; } }
    const so = sO.v;
    const vdx = K.clamp(1.2 * so * (tx - q.x), -3, 3), vdz = K.clamp(1.5 * (tz - q.z), -2, 2);
    const ax = 3 * so * (vdx - q.vx), az = 3 * (vdz - q.vz);
    thd = K.clamp(Math.atan2(ax, K.g), -K.rad(35), K.rad(35));
    const T = q.m * (K.g + az) / Math.max(0.5, Math.cos(q.th));
    q.step(h, T, K.att(q, thd, sI.v));
    if (Math.abs(q.th) > K.rad(120) || Math.abs(q.x) > 12) { q.reset(-2, 2); }
  });
  hb.push(t, q.x, tx, K.deg(thd), K.deg(q.th));
  const c = K.col(), a = cA.fit(), v = K.view(a.w, a.h, -4.5, 4.5, -0.1, 3.8, 8), ctx = a.ctx;
  K.grid(ctx, v, c, 1);
  ctx.strokeStyle = c.warn; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(v.X(tx), v.Y(tz), 9, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(v.X(tx) - 13, v.Y(tz)); ctx.lineTo(v.X(tx) + 13, v.Y(tz)); ctx.moveTo(v.X(tx), v.Y(tz) - 13); ctx.lineTo(v.X(tx), v.Y(tz) + 13); ctx.stroke();
  K.drawQuad(ctx, v.X(q.x), v.Y(q.z), q.th, v.s * 1.5, { thrust: [q.T / q.Tmax, q.T / q.Tmax] });
  K.text(ctx, '点击画面设目标', a.w - 10, 18, c.soft, '12px "Noto Sans SC", sans-serif', 'right');
  const b = cB.fit(), w = K.win(t, 10);
  K.plot(b.ctx, 0, 0, b.w / 2, b.h, { title: '水平位置', unit: 'm', x: w, y: [-4.5, 4.5], series: [{ buf: hb, i: 2, color: c.warn, dash: [6, 4], label: '目标' }, { buf: hb, i: 1, color: c.acc, label: '实际' }], xfmt: x => x.toFixed(0) + 's' });
  K.plot(b.ctx, b.w / 2, 0, b.w / 2, b.h, { title: '倾角', unit: '°', x: w, y: [-60, 60], series: [{ buf: hb, i: 3, color: c.warn, dash: [6, 4], label: '外环想要' }, { buf: hb, i: 4, color: c.acc, label: '实际' }], xfmt: x => x.toFixed(0) + 's' });
  const ratio = (8 * sI.v) / (3 * sO.v);
  ro.innerHTML = `<span>内环比外环快 <b class="${ratio < 2 ? 'hot' : 'good'}">${ratio.toFixed(1)} 倍</b></span><span>位置误差 <b>${Math.hypot(tx - q.x, tz - q.z).toFixed(2)} m</b></span><span>倾角 <b>${K.deg(q.th).toFixed(0)}°</b></span>`;
});

K.box(d, 'assume', '<b>这个实验做了哪些简化：</b>只看侧面（二维）；每一环都只用比例（P）作用，没有积分项；“快慢”用一个系数整体缩放，不是 PX4 的实际增益；控制器读真实状态，没有噪声和延迟；不计空气阻力。');

K.quiz(el.querySelector('#q3'), 'l3', [
  { q: '为什么级联控制里通常要求内环比外环快很多？', o: ['内环计算量小', '外环设计时把内环当成立刻能做到的执行器；内环太慢，外环的指令还没执行完就又改了', '传感器更新快', 'PX4 规定的'], a: 1,
    e: '外环每次给出新的倾角目标时，都默认机身马上就会倾到位。内环跟不上，外环就会不停加码，最后来回摆。这是经验法则：快多少才够，要看具体系统。' },
  { q: '高度保持不变时，速度环算出“想要向前加速 a”，它怎么变成倾角？', o: ['θ = a × g', 'θ = arctan(a / g)', 'θ = a / m', '和 a 无关'], a: 1,
    e: '水平要 a，竖直要托住 g，推力方向要同时满足两者，所以 tanθ = a/g。总推力 = m·g / cosθ。如果还要上下加速，g 要换成 g 加上竖直加速度。' },
  { q: '位置环增益 1.2、速度环增益 3（都只有 P），合起来相当于第 2 课哪种控制器？', o: ['K<sub>p</sub> = 4.2 的纯 P 控制器', 'K<sub>p</sub> = 3.6、K<sub>d</sub> = 3 的 PD 控制器', 'K<sub>i</sub> = 3.6 的积分控制器', '和第 2 课没有关系'], a: 1,
    e: '想要的加速度 = 3 × (1.2 × 误差 − 速度) = 3.6 × 误差 − 3 × 速度。所以 K<sub>p</sub> = 1.2 × 3，K<sub>d</sub> = 3。拆成两层的好处是中间的“想要的速度”可以单独限幅，也可以从中间接入速度指令。' },
  { q: K.ours('', 'offboard 模式下用 CTBR 指令时，外部控制器给 PX4 发的是哪一层的指令？'), o: ['目标位置', '目标速度', '总推力 + 三个角速度：只有最里层的角速度环还在 PX4 里', '四个桨的转速'], a: 2,
    e: '这叫 CTBR 指令。' + K.ours('', '位置、速度、姿态三层都由外部控制器负责，PX4 只跑角速度环和电机分配。') + '' },
]);
} });
