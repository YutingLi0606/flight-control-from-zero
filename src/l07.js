K.add({ id: 'l7', num: 8, title: '抗干扰：积分、观测器、INDI、L1', sub: '风和机械臂带来的未知力，怎么估出来再抵消掉', render(el) {
const S = K.S;

/* ---------- the demo's own model, run offline (same constants as the live demo below) ---------- */
const M = 2.74, KP = 3, KD = 3, KI = 1.5, NOISE = 1.0, H = 0.002;
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function sim(mode, fc, o) {
  const R = rng(o.seed || 1), randn = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const q = new K.Quad({ x: 0, z: 2 }); let t = 0, Ix = 0, Iz = 0, dx = 0, dz = 0, ou = 0, prev = 0, se = 0, sj = 0, n = 0;
  const tr = [];
  for (let k = 0; k < o.T / H; k++) {
    t += H;
    ou += -ou * H / 1.5 + Math.sqrt(2 * H / 1.5) * randn();
    let vw = o.wind * (1 + (o.gust ? 0.3 * ou + 0.25 * Math.sin(2 * Math.PI * t / 3.7) : 0));
    if (o.stepAt != null && t < o.stepAt) vw = 0;
    const vrel = vw - q.vx, Fw = 0.06 * vrel * Math.abs(vrel);
    const ex = -q.x, ez = 2 - q.z;
    let Fx = q.m * (KP * ex - KD * q.vx), Fz = q.m * (K.g + KP * ez - KD * q.vz);
    if (mode === 'pid') { Ix = K.clamp(Ix + ex * H, -6, 6); Iz = K.clamp(Iz + ez * H, -6, 6); Fx += q.m * KI * Ix; Fz += q.m * KI * Iz; }
    if (mode === 'dob') {
      const axm = q.ax + NOISE * randn(), azm = q.az + NOISE * randn();
      const rx = q.m * axm - q.T * Math.sin(q.th), rz = q.m * (azm + K.g) - q.T * Math.cos(q.th);
      const al = 1 - Math.exp(-2 * Math.PI * fc * H); dx += (rx - dx) * al; dz += (rz - dz) * al;
      Fx -= dx; Fz -= dz;
    }
    const [T, thd] = K.geo(q, Fx, Fz, K.rad(50)); const rate = (thd - prev) / H; prev = thd;
    q.step(H, T, K.att(q, thd, 1.5), [Fw, 0]);
    if (t > 5) { se += Math.hypot(ex, ez); sj += rate * rate; n++; }
    if (k % 25 === 0) tr.push([t, q.x * 100]);
  }
  return { err: se / n * 100, jit: K.deg(Math.sqrt(sj / n)), tr };
}

/* walkthrough numbers: hover, an 8 m/s wind arrives */
const W = M * K.g, FW = 0.06 * 8 * 8, AX = FW / M, al = f => 1 - Math.exp(-2 * Math.PI * f * H);
const A4 = al(4), A30 = al(30), D1 = A4 * FW, D63 = FW * (1 - Math.pow(1 - A4, 20));
const SD = f => M * NOISE * Math.sqrt(al(f) / (2 - al(f)));
const TILT = K.deg(Math.atan2(FW, W)), OFF = FW / (M * KP);
const f1 = (v, d) => v.toFixed(d == null ? 2 : d);

/* ---------- figure: forces the controller knows / does not know ---------- */
const figForces = S.svg(820, 250,
  S.quad(230, 140, 0, 80, {}) +
  S.arrow(230, 118, 230, 30, { c: 'acc', w: 3 }) + S.text(240, 40, '推力 T：控制器自己给的，知道', 'sv-s acc', 'start') +
  S.arrow(230, 150, 230, 230, { c: 'soft', w: 3 }) + S.text(240, 226, '重力 m·g：知道', 'sv-s', 'start') +
  S.arrow(40, 140, 132, 140, { c: 'bad', w: 3 }) + S.text(40, 128, '风：不知道', 'sv-s bad', 'start') +
  S.text(560, 34, '控制器不知道的力（扰动）', 'sv-t') +
  [['风、阵风', '大小方向一直在变'], ['机械臂甩动', '第 10 课'], ['贴近地面 / 天花板', '桨下气流被挡住'], ['电池电压下降', '同样的指令推力变弱']]
    .map((r, i) => S.box(420 + (i % 2) * 145, 52 + ((i / 2) | 0) * 90, 135, 74, r[0], r[1], '')).join(''),
  '控制器只知道自己的推力和重力；风等其他力看不见');

/* ---------- figure: where each method gets its estimate ---------- */
const LANES = [
  ['积分', '第 2 课', '', ['位置误差 e', '要先被吹偏'], ['一直累加 e', '× Ki × m'], ['加到力 F 上', '慢慢补上偏差'], '几秒'],
  ['扰动观测器', 'DOB', 'hl', ['测到的加速度', '+ 已知推力、重力'], ['m·a − 推力 − 重力', '= 没解释掉的力'], ['低通滤波 → d̂', '从 F 里减掉'], '零点几秒'],
  ['INDI', '增量动态逆', 'hl', ['测到的加速度', '（滤波后）'], ['想要的 a − 测到的 a', '还差多少加速度'], ['上一刻推力 + m×差', '增量修正'], '零点几秒'],
  ['L1 自适应', 'Hovakimyan、Cao', 'hl', ['预测器', '用模型预测速度'], ['预测 − 实际', '快速更新估计 σ̂'], ['低通 C(s) 后再用', '估计快、输出平滑'], '可很快'],
];
const figLanes = S.svg(820, 470,
  S.text(220, 20, '估计从哪里来', 'sv-s') + S.text(460, 20, '怎么算', 'sv-s') + S.text(695, 20, '怎么用', 'sv-s') +
  LANES.map((L, i) => {
    const y = 34 + i * 108;
    return S.box(10, y, 120, 76, L[0], L[1], L[2] === 'hl' ? '' : 'b') +
      S.box(150, y, 150, 76, L[3][0], L[3][1], i === 0 ? '' : 'px') + S.arrow(300, y + 38, 348, y + 38) +
      S.box(350, y, 220, 76, L[4][0], L[4][1], L[2]) + S.arrow(570, y + 38, 618, y + 38) +
      S.box(620, y, 190, 76, L[5][0], L[5][1], '') +
      S.text(70, y + 94, '反应：' + L[6], i === 0 ? 'sv-s b' : 'sv-s acc');
  }).join(''),
  '四种方法估计未知力的位置');

/* ---------- figure: reaction to an 8 m/s wind that starts at t = 1 s (no gusts) ---------- */
const stepR = ['pd', 'pid', 'dob'].map(m => sim(m, 4, { wind: 8, gust: false, T: 12, stepAt: 1 }).tr);
const figStep = S.svg(820, 260, S.plot(0, 0, 820, 260, { title: '被吹偏的距离（cm），风在第 1 秒开始吹', x: [0, 12], y: [-10, 50], xu: 's', yt: [0, 20, 40],
  series: [{ pts: stepR[0], c: 'soft', dash: 1, label: 'PD' }, { pts: stepR[1], c: 'b', label: 'PD + 积分' }, { pts: stepR[2], c: 'acc', label: 'PD + 观测器 4 Hz' }] }),
  '三种控制器遇到同一阵风');

/* ---------- figure: speed vs noise trade-off, computed offline from the demo ---------- */
const FCS = [0.5, 1, 2, 4, 8, 15, 30];
const TR = [true, false].map(g => {
  const o = { wind: 8, gust: g, T: 30 };
  return { pd: sim('pd', 0, o), pid: sim('pid', 0, o), dob: FCS.map(f => sim('dob', f, o)) };
});
function scatter(X0, d, ymax, title, yt, low0) {
  const Wd = 400, Hh = 280, pl = X0 + 44, pr = X0 + Wd - 8, pt = 26, pb = Hh - 26;
  const sx = v => pl + v / 1000 * (pr - pl), sy = v => pb - Math.min(v, ymax) / ymax * (pb - pt);
  let b = S.plot(X0, 0, Wd, Hh, { title, x: [0, 1000], y: [0, ymax], yt, xt: [0, 250, 500, 750], series: [{ pts: d.dob.map(r => [r.jit, r.err]), c: 'acc' }] });
  d.dob.forEach((r, i) => { b += `<circle cx="${sx(r.jit)}" cy="${sy(r.err)}" r="4" class="sv-fill-acc"/>`; if (i === 0 || i >= 3) b += S.text(sx(r.jit) + (i === 0 ? 2 : 0), sy(r.err) + (i === 0 && low0 ? 18 : -9), FCS[i] + ' Hz', 'sv-s acc', i === 0 ? 'start' : i === 6 ? 'end' : 'middle'); });
  b += `<rect x="${sx(d.pid.jit) - 4}" y="${sy(d.pid.err) - 4}" width="8" height="8" class="sv-fill-b"/>` + S.text(sx(d.pid.jit) + 10, sy(d.pid.err) + (d.pid.err > ymax * 0.5 ? 16 : -8), 'PD + 积分 ' + f1(d.pid.err, 1) + ' cm', 'sv-s b', 'start');
  b += S.text(pr - 6, pt + 18, 'PD：' + f1(d.pd.err, 0) + ' cm，在图外', 'sv-s', 'end');
  return b;
}
const figTrade = S.svg(820, 300,
  scatter(0, TR[0], 12, '有阵风（实验默认）', [0, 4, 8, 12]) + scatter(420, TR[1], 2, '平稳的风', [0, 1, 2], true) +
  S.text(410, 296, '横轴：指令抖动（°/s），越右越抖；纵轴：平均位置误差（cm），越低越好', 'sv-s'),
  '观测器截止频率越高越抖，误差下降却越来越少');
const G = TR[0], ST = TR[1];

/* ---------- walkthrough diagrams ---------- */
const windQuad = (th, extra) => S.quad(210, 120, th, 70, {}) + S.arrow(20, 120, 80, 120, { c: 'bad', w: 3 }) + S.text(20, 105, '风 ' + f1(FW) + ' N', 'sv-nw', 'start') + (extra || '');
const wk1 = S.svg(820, 220, windQuad(0, S.arrow(210, 100, 210, 30, { c: 'acc', w: 3 }) + S.text(220, 40, 'T = ' + f1(W, 1) + ' N，竖直', 'sv-n', 'start')) +
  S.text(380, 60, '风速 8 m/s → 风力 0.06 × 8² = ' + f1(FW) + ' N', 'sv-t', 'start') +
  S.text(380, 90, '是重力 ' + f1(W, 1) + ' N 的 ' + f1(FW / W * 100, 0) + '%', 'sv-s', 'start') +
  S.text(380, 130, '控制器此刻：推力 ' + f1(W, 1) + ' N、倾角 0°', 'sv-t', 'start') +
  S.text(380, 158, '外力估计 d̂ = 0（还什么都不知道）', 'sv-n', 'start'), '风刚吹来');
const wk2 = S.svg(820, 220, windQuad(0, S.arrow(210, 175, 290, 175, { c: 'warn', w: 2.5 }) + S.text(250, 200, '实际在加速', 'sv-s warn')) +
  S.text(380, 50, '测到的水平加速度', 'sv-s', 'start') + S.text(380, 76, 'a = ' + f1(FW) + ' ÷ ' + M + ' = ' + f1(AX) + ' m/s²', 'sv-nw', 'start') +
  S.text(380, 120, '自己的推力本该产生的水平加速度', 'sv-s', 'start') + S.text(380, 146, 'T·sin 0° ÷ m = 0 m/s²', 'sv-n', 'start') +
  S.text(380, 186, '两者对不上：有一个看不见的力在推', 'sv-t', 'start'), '测到的和预期的对不上');
const bar = (x, y, v, cls, lab) => `<rect x="${x}" y="${y}" width="${v * 90}" height="26" rx="4" class="${cls}"/>` + S.text(x - 8, y + 18, lab, 'sv-s', 'end');
const wk3 = S.svg(820, 220,
  bar(250, 40, FW, 'sv-fill-warn', '测到的合力 m·a') + S.text(260 + FW * 90, 58, f1(M * AX) + ' N', 'sv-nw', 'start') +
  `<line x1="250" y1="86" x2="252" y2="86" class="sv-l-acc" style="stroke-width:8"/>` + S.text(242, 92, '已知的力 T·sinθ', 'sv-s', 'end') + S.text(262, 92, '0 N', 'sv-n', 'start') +
  S.text(250, 140, '差 = ' + f1(M * AX) + ' − 0 = ' + f1(FW) + ' N：这就是“没解释掉的力”', 'sv-t', 'start') +
  S.text(250, 172, '竖直方向：' + M + ' × (0 + 9.81) − ' + f1(W, 1) + ' = 0，没有未知力', 'sv-s', 'start'), '没解释掉的力');
function filtPlot(noise) {
  const R = rng(7), randn = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const ser = [30, 4].map(f => { let d = 0; const p = [[0, 0]]; const a = al(f); for (let k = 1; k <= 200; k++) { const r = FW + (noise ? M * NOISE * randn() : 0); d += (r - d) * a; p.push([k * H, d]); } return p; });
  return S.plot(0, 0, 820, 220, { title: noise ? '加上噪声以后的 d̂（N），虚线 = 真实风力' : '没有噪声时 d̂ 怎么长上去（N）', x: [0, 0.4], y: [0, noise ? 8 : 6], xu: 's', yt: [0, FW, noise ? 8 : 6].map(v => +v.toFixed(2)),
    hl: [{ v: FW, c: 'warn', label: noise ? '' : '真实风力 ' + f1(FW) + ' N' }],
    series: [{ pts: ser[0], c: 'b', label: '截止 30 Hz' }, { pts: ser[1], c: 'acc', label: '截止 4 Hz' }] });
}
const wk4 = S.svg(820, 220, filtPlot(false), 'd̂ 的收敛');
const wk5 = S.svg(820, 220, filtPlot(true), '噪声下的 d̂');
const wk6 = S.svg(820, 220,
  S.quad(210, 130, -TILT, 70, {}) + S.arrow(20, 130, 80, 130, { c: 'bad', w: 3 }) + S.text(20, 115, '风 ' + f1(FW) + ' N', 'sv-nw', 'start') +
  S.arrow(210, 110, 210 - 80 * Math.sin(K.rad(TILT)), 110 - 80 * Math.cos(K.rad(TILT)), { c: 'acc', w: 3 }) +
  S.text(210, 205, '迎着风歪 ' + f1(TILT, 1) + '°', 'sv-n') +
  S.text(380, 60, '力 F 减掉 d̂ = ' + f1(FW) + ' N', 'sv-t', 'start') +
  S.text(380, 88, '倾角 = arctan(' + f1(FW) + ' ÷ ' + f1(W, 1) + ') = ' + f1(TILT, 1) + '°', 'sv-n', 'start') +
  S.text(380, 130, '只用 PD：要偏 ' + f1(FW) + ' ÷ (' + M + ' × 3) = ' + f1(OFF * 100, 0) + ' cm', 'sv-nb', 'start') +
  S.text(380, 154, '才能让 Kp × 误差 顶住风', 'sv-s', 'start') +
  S.text(380, 190, '用观测器：不用先被吹偏', 'sv-t', 'start'), '抵消');

/* ---------- figure: link to earlier / later lessons ---------- */
const figLink = S.svg(820, 230,
  S.box(320, 80, 180, 70, '本课：估计 d̂', '再从力里减掉', 'hl') +
  [[10, 10, '第 2 课 PID', '积分 I = 最慢的估计'], [10, 150, '第 3 课 PX4', '速度环积分抗风'], [630, 10, '第 4 课 状态估计', '加速度从 IMU 来，带噪声'],
   [630, 150, '第 6 课 SE(3)', 'd̂ 从力 F 里减掉'], [320, 0, '第 10 课 机械臂', '能算出来的力：前馈'], [320, 170, '第 9 课 MPC', '模型不准时配合 d̂']]
    .map(([x, y, t, s]) => S.box(x, y, 180, 58, t, s, 'b')).join('') +
  S.arrow(190, 50, 318, 100, { c: 'b' }) + S.arrow(190, 175, 318, 130, { c: 'b' }) + S.arrow(630, 40, 502, 100, { c: 'b' }) +
  S.arrow(502, 130, 630, 175, { c: 'acc' }) + S.arrow(410, 58, 410, 78, { c: 'b' }) + S.arrow(410, 150, 410, 168, { c: 'acc' }),
  '本课和其他课的关系');

el.innerHTML = `
<p class="lede">控制器只知道重力和自己的推力。风、机械臂甩动、近地气流、电压下降这些它不知道的力，统称<span class="term">扰动</span>。这一课比较四种“把扰动估出来再抵消”的办法。</p>

<h2>控制器看不见的力</h2>
${K.fig(figForces, '实验里 8 m/s 的风大约是 3.8 N，相当于飞机重量的 14%。控制器没有风速传感器，只能从“飞机的动作和预期不一样”里推断出它。')}

<h2>四种办法：估计从哪里来</h2>
${K.fig(figLanes, '<b>积分</b>要等位置先偏了才开始累，所以慢。<b>观测器</b>和 <b>INDI</b> 直接比较测到的加速度和自己推力该产生的加速度，下一刻就能看到外力。<b>L1</b> 用一个预测器的误差去快速更新估计，再单独滤波后才用。')}
${K.more('展开：四种思路的优缺点（含前馈）', `<div class="tblwrap"><table class="tbl">
<tr><th>思路</th><th>怎么做</th><th>优点</th><th>缺点</th></tr>
<tr><td><b>积分</b>（第 2 课）</td><td>误差一直在，就一直加力</td><td>简单，PX4 就有</td><td>要先出现误差，再花几秒补上；变化快的风来不及</td></tr>
<tr><td><b>前馈</b></td><td>事先知道这个力，就直接加上</td><td>不用等误差出现，最快；模型准时也最准</td><td>得事先知道。风没法事先知道，机械臂的运动可以（第 10 课）</td></tr>
<tr><td><b>扰动观测器 / INDI</b></td><td>测加速度，和“自己的推力本该产生的加速度”比，差出来的就是外力，下一刻直接减掉</td><td>反应快，不用知道扰动的模型</td><td>加速度计很吵，要滤波；滤得狠就慢，滤得轻指令就抖</td></tr>
<tr><td><b>L1 自适应</b></td><td>同样是在线估计未知力，但把“估计”和“滤波”分开设计</td><td>估计可以很快；在论文给出的假设下，有稳定性和误差界的理论保证</td><td>参数多，调起来复杂</td></tr>
</table></div>`)}

<h2>一个观测器更新，用数字走一遍</h2>
<div id="walk7"></div>
${K.more('展开：完整公式，INDI、L1、Neural-Fly 的出处', `<div class="formula">外力估计  d̂ = 低通滤波[ m·a<sub>测量</sub> − ( T·z<sub>b</sub> − m·g·ẑ ) ]
<div class="where">d̂：外力的估计值；m：质量；a<sub>测量</sub>：飞机在世界坐标里的实际加速度（由加速度计读数换算得到；加速度计本身测不到重力造成的那部分加速度，换算时要补上）；T·z<sub>b</sub>：自己的推力向量；m·g·ẑ：重力。估出 d̂ 以后，第 6 课的力 F 里减掉它即可。注意：质量或推力本身算得不准，误差也会被当成“外力”一起估进来，这有时反而是好事（顺便补偿了模型误差）。</div></div>
<p><span class="term">INDI</span>（增量非线性动态逆，Smeur 等 2016、Tal 和 Karaman 2021）就是这个思路的一种做法：不去建扰动的模型，每一刻只根据“测到的”和“想要的”加速度之差，增量地修正推力。把“上一刻推力 + m × (想要的 a − 测到的 a)”展开，和“想要的力 − d̂”几乎是同一个式子，所以它和观测器很接近。相关论文报告它在强风和强扰动下效果很好。INDI 常常也用在角速度环里（根据测到的角加速度修正力矩，最好配合电机转速测量）；${K.ours('', `如果只能通过 CTBR 接口发指令，角速度环属于原版 PX4、改不了，就只能在外环（推力向量这一层）用 INDI 的思路。`)}</p>
<p><span class="term">L1 自适应控制</span>（Hovakimyan 和 Cao 等人提出）：用一个“状态预测器”预测飞机该怎么动，预测和实际的差用来快速更新扰动估计，再经过一个低通滤波器才送去控制。快速估计和平滑输出被分开，可以分别调。</p>
<p>后来的 <span class="term">Neural-Fly</span>（O'Connell 等 2022，Science Robotics）再进一步：先用数据学出一组描述“风力怎么随飞机状态变化”的基函数，飞行中只在线调整一小组线性系数。论文在风洞实验中报告，它的跟踪误差比 INDI、L1 等基线更小。</p>`)}

<h2>谁反应快</h2>
${K.fig(figStep, `用下面实验的同一个模型，风在第 1 秒突然吹起（8 m/s，无阵风）。<b>PD</b> 被吹偏 ${f1(OFF * 100, 0)} cm 后停在那里，回不去。<b>积分</b>先被吹偏，再花好几秒拉回来。<b>观测器</b>（4 Hz）零点几秒就把风估出来，最多只偏几厘米。`)}

<h2>速度和抖动的权衡</h2>
${K.fig(figTrade, `每个点是用实验模型飞 30 秒的结果（加速度计噪声 1 m/s²）。<b>左</b>：有阵风时，观测器截止频率从 0.5 Hz 调到 4 Hz，误差从 ${f1(G.dob[0].err, 1)} 降到 ${f1(G.dob[3].err, 1)} cm；再调到 30 Hz，误差只再降到 ${f1(G.dob[6].err, 1)} cm，抖动却涨到 ${f1(G.dob[6].jit, 0)} °/s。<b>右</b>：风很平稳时，<b>积分反而比观测器好</b>（${f1(ST.pid.err, 2)} cm 对 ${f1(ST.dob[3].err, 2)} cm）：恒定的力积分能补得很准，观测器却一直在吃噪声。`)}
${K.more('展开：为什么不能只看误差', `<p>观测器的截止频率调高，估计快、误差小，但指令会抖。真机上指令太抖会让电机发热、振动变大。${K.ours('', `所以比较控制器时最好同时统计“误差”和“指令平滑度”，不让一个控制器靠疯狂抖动来换小误差。`)}</p><p>这些点来自一个二维简化模型，加速度测量只有白噪声，没有零偏和延迟。噪声更大或有延迟时，截止频率太高甚至会让误差变大。所以右图的结论只说明“在平稳风里积分可以赢”，不能推出某种方法绝对更好。</p>`)}

<div id="d7"></div>

<h2>和其他课的关系</h2>
${K.fig(figLink, '第 2 课的积分是最慢、最简单的扰动估计；本课的观测器用的加速度来自第 4 课的状态估计；估出的 d̂ 直接从第 6 课的力 F 里减掉。第 9 课的 MPC 和第 10 课的机械臂也会用到它。')}

<div class="key"><h3>这一课记住三件事</h3><ul>
<li>扰动 = 控制器不知道的力：风、机械臂、近地面气流、电压下降。</li>
<li>积分要等误差出现，慢；观测器 / INDI 用“测到的加速度 − 自己推力该产生的加速度”实时估出外力；前馈最快，但要事先知道。</li>
<li>传感器有噪声时，估计越快，指令越抖；在平稳的风里，简单的积分可能更好。</li>
</ul></div>
<h2>小测验</h2><div id="q7"></div>`;

K.steps(el.querySelector('#walk7'), { title: `悬停时 8 m/s 的风吹来，观测器（截止 4 Hz，每 2 ms 更新一次）怎么算`, steps: [
  { svg: wk1, t: `飞机 ${M} kg，悬停推力 ${f1(W, 1)} N。风吹来，风力 <b>${f1(FW)} N</b>。控制器的外力估计还是 0。` },
  { svg: wk2, t: `下一刻测到水平加速度 <b>${f1(AX)} m/s²</b>。可推力是竖直的，按自己的推力算，水平加速度应该是 0。` },
  { svg: wk3, t: `牛顿第二定律：测到的合力 ${M} × ${f1(AX)} = ${f1(FW)} N，已知的力只有 0。差出来的 <b>${f1(FW)} N</b> 就算作外力。` },
  { svg: wk4, t: `不能一下全信（测量有噪声），只往里走一小步：d̂ ← d̂ + ${f1(A4, 3)} × (${f1(FW)} − d̂)，第一次更新后 <b>${f1(D1)} N</b>。约 ${f1(1 / (2 * Math.PI * 4), 2)} 秒（20 次）后到 63%，即 <b>${f1(D63)} N</b>。30 Hz 每步走 ${f1(A30, 2)}，快得多。` },
  { svg: wk5, t: `加速度计噪声 1 m/s²，乘质量后每次测量带 ±${f1(M * NOISE)} N 的噪声。滤波后，4 Hz 的 d̂ 还抖 ±<b>${f1(SD(4))} N</b>，30 Hz 抖 ±<b>${f1(SD(30))} N</b>：快了，也吵了。` },
  { svg: wk6, t: `d̂ 稳定在 ${f1(FW)} N 后，从力 F 里减掉，飞机迎风歪 <b>${f1(TILT, 1)}°</b> 顶住风，不用先被吹偏。只用 PD 要偏 <b>${f1(OFF * 100, 0)} cm</b>。` },
] });

const d = K.demo(el.querySelector('#d7'), '动手', '在风里悬停',
  '把风速调到 10 m/s，打开阵风。依次切换三种控制器，看位置误差。用观测器时，再拖动截止频率，看“指令抖动”怎么变。最后关掉阵风，比较积分和观测器。');
const cA = K.canvas(d, 0.36, 200), cB = K.canvas(d, 0.38, 210);
const ctl = K.box(d, 'controls'), ro = K.box(d, 'readout');
const sW = K.slider(ctl, { id: 'l7-w', label: '平均风速', min: 0, max: 14, step: 0.5, value: 8, fmt: v => v.toFixed(1) + ' m/s' });
const gu = K.seg(ctl, { label: '阵风', options: [['1', '有'], ['0', '无']], value: '1' });
const md = K.seg(ctl, { label: '控制器', options: [['pd', 'PD'], ['pid', 'PD + 积分'], ['dob', 'PD + 扰动观测器']], value: 'pd', on: () => { Ix = 0; Iz = 0; } });
const sF = K.slider(ctl, { id: 'l7-f', label: '观测器截止频率', min: 0.5, max: 30, step: 0.5, value: 4, fmt: v => v.toFixed(1) + ' Hz' });
const br = K.box(ctl, 'btnrow');
K.btn(br, '重来', () => { q.reset(0, 2); Ix = Iz = dx = dz = 0; hb.clear(); eb.clear(); }, 'primary');
const q = new K.Quad({ x: 0, z: 2 });
let t = 0, Ix = 0, Iz = 0, dx = 0, dz = 0, ou = 0, Fw = 0, prevThd = 0, thdRate = 0;
const hb = K.buf(10), eb = K.buf(5);
const Kp = KP, Kd = KD, Ki = KI;
K.loop(dt => {
  K.sub(dt, 0.002, h => {
    t += h;
    ou += -ou * h / 1.5 + Math.sqrt(2 * h / 1.5) * K.randn();
    const vw = sW.v * (1 + (gu.v === '1' ? 0.3 * ou + 0.25 * Math.sin(2 * Math.PI * t / 3.7) : 0));
    const vrel = vw - q.vx; Fw = 0.06 * vrel * Math.abs(vrel);
    const ex = -q.x, ez = 2 - q.z;
    let Fx = q.m * (Kp * ex - Kd * q.vx), Fz = q.m * (K.g + Kp * ez - Kd * q.vz);
    if (md.v === 'pid') { Ix = K.clamp(Ix + ex * h, -6, 6); Iz = K.clamp(Iz + ez * h, -6, 6); Fx += q.m * Ki * Ix; Fz += q.m * Ki * Iz; }
    if (md.v === 'dob') {
      const axm = q.ax + NOISE * K.randn(), azm = q.az + NOISE * K.randn();
      const rx = q.m * axm - q.T * Math.sin(q.th), rz = q.m * (azm + K.g) - q.T * Math.cos(q.th);
      const al = 1 - Math.exp(-2 * Math.PI * sF.v * h); dx += (rx - dx) * al; dz += (rz - dz) * al;
      Fx -= dx; Fz -= dz;
    }
    const [T, thd] = K.geo(q, Fx, Fz, K.rad(50));
    thdRate = (thd - prevThd) / h; prevThd = thd;
    q.step(h, T, K.att(q, thd, 1.5), [Fw, 0]);
    eb.push(t, Math.hypot(ex, ez), thdRate);
    if (Math.abs(q.x) > 8) q.reset(0, 2);
  });
  const est = md.v === 'dob' ? dx : md.v === 'pid' ? q.m * Ki * Ix : null;
  hb.push(t, -q.x * 100, Fw, est);
  const c = K.col(), a = cA.fit(), v = K.view(a.w, a.h, -3, 3, -0.1, 3, 8), ctx = a.ctx;
  K.grid(ctx, v, c, 1);
  for (let i = 0; i < 7; i++) { const y = v.Y(0.4 + i * 0.4), ph = ((t * (1 + sW.v * 0.25) + i * 0.37) % 1); const x0 = v.X(-3) + ph * a.w * 0.5; if (sW.v > 0.2) K.arrow(ctx, x0, y, x0 + 12 + sW.v * 3, y, c.line, 1.5); }
  ctx.strokeStyle = c.warn; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(v.X(0), v.Y(2), 8, 0, 7); ctx.stroke();
  K.drawQuad(ctx, v.X(q.x), v.Y(q.z), q.th, v.s * 1.4, { thrust: [q.T / q.Tmax, q.T / q.Tmax] });
  K.text(ctx, '风从左往右吹；橙圈是悬停目标', 10, 18, c.soft);
  const b = cB.fit(), Wn = K.win(t, 10);
  K.plot(b.ctx, 0, 0, b.w / 2, b.h, { title: '被吹偏的距离', unit: 'cm', x: Wn, y: [-20, 120], series: [{ buf: hb, i: 1, color: c.acc, label: '偏离' }], xfmt: x => x.toFixed(0) + 's' });
  K.plot(b.ctx, b.w / 2, 0, b.w / 2, b.h, { title: '风力', unit: 'N', x: Wn, y: [-2, 16], series: [{ buf: hb, i: 2, color: c.warn, label: '真实' }, { buf: hb, i: 3, color: c.acc, label: '控制器的估计' }], xfmt: x => x.toFixed(0) + 's' });
  const n = eb.d.length || 1, em = eb.d.reduce((s, p) => s + p[1], 0) / n, jr = Math.sqrt(eb.d.reduce((s, p) => s + p[2] * p[2], 0) / n);
  ro.innerHTML = `<span>最近 5 秒平均误差 <b>${(em * 100).toFixed(1)} cm</b></span><span>指令抖动（倾角指令变化率） <b class="${K.deg(jr) > 80 ? 'hot' : ''}">${K.deg(jr).toFixed(0)} °/s</b></span><span>当前风力 <b>${Fw.toFixed(1)} N</b>（重力的 ${(Fw / (q.m * K.g) * 100).toFixed(0)}%）</span>`;
});

K.box(d, 'assume', '<b>这个实验做了哪些简化：</b>只看侧面（二维）；风力用一个简化公式，不是完整的气动模型；控制器读真实位置和速度；观测器用的推力是精确已知的，加速度测量只加了白噪声，没有零偏和延迟，这比真实情况乐观。在这个实验的平稳风里，积分项的误差可以比观测器还小，所以不要从这个实验推出某种方法绝对更好。');

K.quiz(el.querySelector('#q7'), 'l7', [
  { q: '风一直稳定地吹，只用 PD 控制器，会怎样？', o: ['完全不受影响', '被吹偏一个固定的距离，一直回不去', '越吹越远直到飞走', '会翻'], a: 1,
    e: '风力要靠位置误差乘 Kp 去抵消，所以必须偏一段距离才能产生足够的力（实验里 8 m/s 的风要偏约 47 cm）。加积分能消掉这段，但需要时间（这个实验里要几秒）。' },
  { q: '飞机 2.74 kg，推力竖直（倾角 0°），测到水平加速度 1.40 m/s²。观测器（滤波前）估出的水平外力是多少？', o: ['0 N', '1.40 N', '约 3.84 N', '26.9 N'], a: 2,
    e: '测到的合力 = 2.74 × 1.40 ≈ 3.84 N；自己推力的水平分量 = 0。差出来的 3.84 N 就是外力。（滤波后要过零点几秒才真正到这个值。）' },
  { q: '扰动观测器怎么“看见”风？', o: ['有风速传感器', '测到的加速度，减去自己推力和重力本该产生的加速度，差值就是外力', '看 GPS', '靠积分'], a: 1,
    e: '牛顿第二定律：合力 = 质量 × 加速度。已知的力扣掉，剩下的就算作未知的外力。不需要知道风是怎么来的（但需要推力、质量算得比较准）。' },
  { q: '把观测器的截止频率从 4 Hz 调到 30 Hz，会怎样？', o: ['误差变大，指令更平滑', '反应更快、误差略小，但指令明显更抖', '没有变化', '飞机会翻'], a: 1,
    e: '加速度计噪声很大。截止频率高，噪声也一起进来了。这就是速度和平滑之间的权衡。（在这个实验里误差只小一点；噪声更大或延迟更大时，截止频率太高甚至会让误差变大。）' },
  { q: 'L1 自适应控制和简单的扰动观测器，最主要的区别是？', o: ['L1 用神经网络', 'L1 把“快速估计”和“低通滤波输出”分开设计：估计可以很快，输出由滤波器保持平滑', 'L1 不需要传感器', 'L1 只能用在固定翼'], a: 1,
    e: '状态预测器 + 自适应律 + 低通滤波器，三件套。估计可以很快，送出去的控制量由滤波器保持平滑；在论文的假设下还有稳定性的理论保证。' },
]);
} });
