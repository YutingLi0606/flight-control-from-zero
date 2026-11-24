K.add({ id: 'l13', num: 13, title: '强化学习', sub: '没有老师，只有分数：试、评分、往好的方向改一点', render(el) {
/*core*/
const DT = 0.02, NSTEP = 200, Z0 = 1.0, ZR = 1.8, AMAX = 9, TAU = 0.08, EOUT = 1.0, CE = 0.3;
const SC = [4, 2, 3], TH0 = [0.125, 0.5, 0], NPAIR = 8, SIG = 0.15, LR = 0.08;   /* params = th * SC: kp, kd, bias */
const par = th => th.map((x, j) => x * SC[j]);
function rng(seed) {      /* small seeded generator: uniform u() and normal n() */
  let a = seed >>> 0;
  const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { u, n: () => { let x = 0, y = 0; while (!x) x = u(); while (!y) y = u(); return Math.sqrt(-2 * Math.log(x)) * Math.cos(2 * Math.PI * y); } };
}
/* one episode: climb from Z0 to ZR. u = kp e - kd v + b (acceleration on top of hover), first-order lag TAU.
   reward per step: tracking term (pos: +exp kernel, neg: -e^2) - c (du/AMAX)^2 - CE (thrust/hover)^2; ends early if |e| > EOUT */
function episode(th, c, neg, log) {
  const [kp, kd, b] = par(th);
  let z = Z0, v = 0, a = 0, up = 0, R = 0, n = 0, end = false;
  for (; n < NSTEP; n++) {
    const u = K.clamp(kp * (ZR - z) - kd * v + b, -AMAX, AMAX), du = (u - up) / AMAX; up = u;
    a += (u - a) * DT / TAU; v += a * DT; z += v * DT;
    const e2 = (ZR - z) * (ZR - z), T = (K.g + a) / K.g;
    const rT = neg ? -e2 : Math.exp(-e2 / 0.1), rS = -c * du * du, rE = -CE * T * T;
    R += rT + rS + rE;
    if (log) log.push([(n + 1) * DT, z, u, rT, rS, rE]);
    if (e2 > EOUT * EOUT) { end = true; n++; break; }
  }
  return { R, n, end };
}
function esStep(th, c, neg, g) {   /* evolution strategies: try +-random tweaks, move toward the better-ranked ones */
  const rs = [], eps = [], grad = th.map(() => 0); let steps = 0;
  for (let i = 0; i < NPAIR; i++) {
    const ep = th.map(() => g.n()), p = episode(th.map((x, j) => x + SIG * ep[j]), c, neg), m = episode(th.map((x, j) => x - SIG * ep[j]), c, neg);
    rs.push(p.R, m.R); eps.push(ep); steps += p.n + m.n;
  }
  const sorted = rs.slice().sort((x, y) => x - y), rank = r => sorted.indexOf(r) / (rs.length - 1) - 0.5;
  for (let i = 0; i < NPAIR; i++) { const d = rank(rs[2 * i]) - rank(rs[2 * i + 1]); for (let j = 0; j < th.length; j++) grad[j] += d * eps[i][j] / (NPAIR * SIG); }
  return { th: th.map((x, j) => x + LR * grad[j]), steps, rs, eps };
}
/*endcore*/

/*offline: the demo's own episode / trainer, seed 3 (deterministic: the trainer has its own seeded generator) */
const S = K.S;
function trainOff(c, neg, seed) {
  let th = TH0.slice(), steps = 0, first = null; const g = rng(seed), curve = [[0, episode(th, c, neg).R]];
  for (let i = 0; i < 200; i++) { const r = esStep(th, c, neg, g); if (!i) first = { th0: th.slice(), ...r }; th = r.th; steps += r.steps; curve.push([i + 1, episode(th, c, neg).R]); }
  return { th, curve, steps, first };
}
const OFF = (() => {
  const L0 = []; episode(TH0, 0, false, L0);
  const t0 = trainOff(0, false, 3), t30 = trainOff(30, false, 3), tn = trainOff(0, true, 3);
  const L1 = [], L30 = [], Ln = [], Lh = []; episode(t0.th, 0, false, L1); episode(t30.th, 30, false, L30);
  const Rn0 = episode(TH0, 0, true, Ln), Rh = episode(tn.th, 0, true, Lh);
  const t90 = L => { const p = L.find(q => q[1] >= Z0 + 0.9 * (ZR - Z0)); return p ? p[0] : null; };
  const tv = L => L.reduce((s, p, i) => s + (i ? Math.abs(p[2] - L[i - 1][2]) : 0), 0);
  return { L0, t0, t30, L1, L30, Ln, Lh, Rn0, Rh, t90, tv };
})();
const rOf = p => p[3] + p[4] + p[5];
const R0 = OFF.L0.reduce((s, p) => s + rOf(p), 0), G0 = OFF.L0.reduce((s, p, i) => s + Math.pow(0.99, i) * rOf(p), 0);
const sg = (x, d) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(d == null ? 3 : d);

/* figure: agent–environment loop */
const figLoop = S.svg(820, 250,
  S.box(360, 20, 220, 70, '智能体（策略）', '神经网络控制器', 'hl') +
  S.box(360, 160, 220, 70, '环境', '仿真器：飞机、风、PX4 角速度环') +
  S.path([[580, 55], [740, 55], [740, 195], [584, 195]], { c: 'acc', label: '动作：CTBR 指令', lx: 732, ly: 130, anchor: 'end' }) +
  S.path([[360, 205], [190, 205], [190, 45], [356, 45]], { c: 'soft', label: '状态：位置、速度、姿态…', lx: 180, ly: 130, anchor: 'end' }) +
  S.path([[360, 185], [250, 185], [250, 70], [356, 70]], { c: 'warn' }) + S.text(258, 132, '奖励：一个分数', 'sv-s warn', 'start') +
  S.text(480, 132, '每一步转一圈', 'sv-s') + S.text(480, 150, '一个回合 = 从开始到结束', 'sv-s'),
  '强化学习的循环：智能体出动作，环境回状态和奖励');

/* walkthrough panels: altitude + reward curve */
const TMAX = NSTEP * DT;
function rPanel(k, o) {
  o = o || {};
  const L = o.L || OFF.L0, p = L[Math.min(k, L.length) - 1], z = p[1], Yz = v => 230 - (v - 0.5) / 1.7 * 200;
  let b = `<line x1="16" y1="${Yz(ZR)}" x2="170" y2="${Yz(ZR)}" class="sv-l-warn" stroke-dasharray="6 4"/>` + S.text(170, Yz(ZR) - 6, '目标 1.8 m', 'sv-s warn', 'end') +
    `<line x1="16" y1="${Yz(ZR - EOUT)}" x2="170" y2="${Yz(ZR - EOUT)}" class="sv-l-bad"/>` + S.text(170, Yz(ZR - EOUT) + 16, '出界线', 'sv-s bad', 'end') +
    S.quad(58, Yz(z), 0, 32, { c: o.bad ? 'bad' : 'ink' }) + S.text(58, Yz(z) - 20, 'z = ' + z.toFixed(2) + ' m', 'sv-n');
  b += o.mid ? o.mid : '';
  b += S.plot(420, 0, 400, 250, o.plot || { title: '每一步的奖励 r', x: [0, TMAX], y: [-0.4, 0.8], xu: 's', yt: [-0.3, 0, 0.3, 0.6],
    series: [{ pts: L.map(q => [q[0], rOf(q)]), c: 'acc' }, { pts: [[p[0], -0.4], [p[0], 0.8]], c: 'soft', dash: 1 }] });
  return S.svg(820, 252, b, '回合里的一步');
}
const parts = p => S.text(180, 50, `t = ${p[0].toFixed(2)} s（第 ${Math.round(p[0] / DT)} 步）`, 'sv-t', 'start') +
  S.text(180, 82, '跟踪 exp(−误差²/0.1)', 'sv-s', 'start') + S.text(400, 82, sg(p[3]), 'sv-n', 'end') +
  S.text(180, 108, '平滑（这里 c = 0）', 'sv-s', 'start') + S.text(400, 108, sg(p[4]), 'sv-n', 'end') +
  S.text(180, 134, '能耗 −0.3·(推力/悬停)²', 'sv-s', 'start') + S.text(400, 134, sg(p[5]), 'sv-nw', 'end') +
  `<line x1="180" y1="146" x2="400" y2="146" class="sv-l-soft"/>` + S.text(180, 170, '这一步奖励 r', 'sv-t', 'start') + S.text(400, 170, sg(rOf(p)), 'sv-n', 'end') +
  S.text(180, 200, '误差 = 1.8 − ' + p[1].toFixed(2) + ' = ' + (ZR - p[1]).toFixed(2) + ' m', 'sv-s', 'start');
const P = n => OFF.L0[n - 1];
const disc = OFF.L0.map((q, i) => [q[0], Math.pow(0.99, i) * rOf(q)]);
const cum = L => { let s = 0; return [[0, 0]].concat(L.map(q => [q[0], s += rOf(q)])); };
const walk = [
  { svg: rPanel(1, { mid: parts(P(1)) }), t: `<b>第 1 步</b>：初始策略很软，飞机还在 1.0 m，离目标 0.8 m，跟踪项几乎是 0；能耗每步都扣 0.3。这一步 r = <b>${sg(rOf(P(1)))}</b>。` },
  { svg: rPanel(100, { mid: parts(P(100)) }), t: `<b>第 100 步（2 s）</b>：爬到 ${P(100)[1].toFixed(2)} m，误差 ${(ZR - P(100)[1]).toFixed(2)} m，跟踪项涨到 ${P(100)[3].toFixed(3)}，r = <b>${sg(rOf(P(100)))}</b>。` },
  { svg: rPanel(200, { mid: parts(P(200)) }), t: `<b>第 200 步（4 s，回合结束）</b>：误差只剩 ${(ZR - P(200)[1]).toFixed(2)} m，r = <b>${sg(rOf(P(200)))}</b>。完美跟踪每步最多约 +0.7。` },
  { svg: rPanel(200, { mid: S.text(180, 70, '回报 = r₁ + r₂ + … + r₂₀₀', 'sv-t', 'start') + S.text(180, 110, '= ' + R0.toFixed(1), 'sv-big', 'start') + S.text(180, 150, '训练后（种子 3）：' + OFF.t0.curve[200][1].toFixed(1), 'sv-n', 'start'),
      plot: { title: '累计奖励', x: [0, TMAX], y: [-10, 120], xu: 's', yt: [0, 40, 80, 120], series: [{ pts: cum(OFF.L0), c: 'soft', dash: 1 }, { pts: cum(OFF.L1), c: 'acc' }] } }),
    t: `把 200 步加起来，就是这个回合的<span class="term">回报</span>：初始策略 <b>${R0.toFixed(1)}</b>（虚线）。训练后的策略 0.5 秒就爬到位，回报 <b>${OFF.t0.curve[200][1].toFixed(1)}</b>（实线）。训练的目标就是让回报变大。` },
  { svg: rPanel(200, { mid: S.text(180, 60, '打折：第 k 步乘 0.99^(k−1)', 'sv-t', 'start') + S.text(180, 92, '第 100 步 × ' + Math.pow(0.99, 99).toFixed(2), 'sv-s', 'start') + S.text(180, 116, '第 200 步 × ' + Math.pow(0.99, 199).toFixed(2), 'sv-s', 'start') + S.text(180, 156, '打折回报 = ' + G0.toFixed(1), 'sv-n', 'start') + S.text(180, 180, '不打折 = ' + R0.toFixed(1), 'sv-s', 'start'),
      plot: { title: '奖励 r（实线）和打折后的奖励（蓝）', x: [0, TMAX], y: [-0.4, 0.8], xu: 's', yt: [-0.3, 0, 0.3, 0.6], series: [{ pts: OFF.L0.map(q => [q[0], rOf(q)]), c: 'acc' }, { pts: disc, c: 'b' }] } }),
    t: `常用<span class="term">折扣</span> γ：越远的奖励算得越轻。γ = 0.99 时，第 100 步只算 ${Math.pow(0.99, 99).toFixed(2)} 倍。后面的正分被压小，前面的负分占了上风，打折回报变成 <b>${G0.toFixed(1)}</b>。（实验的训练器用的是不打折的总和。）` },
  { svg: rPanel(OFF.Lh.length, { L: OFF.Lh, bad: 1, mid: S.text(180, 60, '改成“扣分”写法：r = −误差² …', 'sv-t', 'start') + S.text(180, 96, '老实飞满 4 s：' + OFF.Rn0.R.toFixed(1), 'sv-s', 'start') + S.text(180, 122, `第 ${OFF.Rh.n} 步掉出界：` + OFF.Rh.R.toFixed(1), 'sv-n', 'start') + S.text(180, 156, '早结束，扣得少', 'sv-s bad', 'start'),
      plot: { title: '累计奖励（扣分写法）', x: [0, TMAX], y: [-110, 0], xu: 's', yt: [-100, -50, 0], series: [{ pts: cum(OFF.Ln), c: 'soft', dash: 1 }, { pts: cum(OFF.Lh), c: 'bad' }] } }),
    t: `如果跟踪项写成每步扣 误差²，每一步都是负分，回合越短扣得越少。训练（种子 3）找到的“最优”是 <b>${(OFF.Rh.n * DT).toFixed(2)} s</b> 就往下掉出界，回报 ${OFF.Rh.R.toFixed(1)}，好过老实飞的 ${OFF.Rn0.R.toFixed(1)}。这就是<span class="term">奖励漏洞</span>。` },
];

/* figure: one ES update (seed 3, first iteration), projected on (kp, bias), and the PPO clip */
const F = OFF.t0.first, rk = (() => { const s = F.rs.slice().sort((a, b) => a - b); return r => s.indexOf(r) / (F.rs.length - 1); })();
const KX = [-0.6, 1.6], BY = [-1.6, 1.6], ex0 = 44, ex1 = 392, ey0 = 30, ey1 = 250;
const EX = v => ex0 + (v - KX[0]) / (KX[1] - KX[0]) * (ex1 - ex0), EY = v => ey1 - (v - BY[0]) / (BY[1] - BY[0]) * (ey1 - ey0);
let esB = `<rect x="${ex0}" y="${ey0}" width="${ex1 - ex0}" height="${ey1 - ey0}" class="sv-box"/>` + S.text(ex0, 18, '一次更新：在两个参数上看（第三个参数“阻尼”略去）', 'sv-t', 'start') +
  S.text((ex0 + ex1) / 2, ey1 + 18, '比例 kp', 'sv-s') + S.text(ex0 - 6, (ey0 + ey1) / 2, '偏置 b', 'sv-s', 'end');
const c0 = [TH0[0] * SC[0], TH0[2] * SC[2]];
F.eps.forEach((e, i) => [1, -1].forEach((sgn, j) => {
  const kp = (TH0[0] + sgn * SIG * e[0]) * SC[0], bb = (TH0[2] + sgn * SIG * e[2]) * SC[2], R = F.rs[2 * i + j], good = rk(R) >= 0.5;
  esB += `<line x1="${EX(c0[0])}" y1="${EY(c0[1])}" x2="${EX(kp)}" y2="${EY(bb)}" class="sv-l-grid"/>` +
    `<circle cx="${EX(kp)}" cy="${EY(bb)}" r="${4 + 6 * rk(R)}" class="${good ? 'sv-fill-acc' : 'sv-fill-soft'}" opacity="${good ? 0.85 : 0.4}"/>`;
}));
const nth = [F.th[0] * SC[0], F.th[2] * SC[2]], best = Math.max(...F.rs), worst = Math.min(...F.rs);
esB += S.arrow(EX(c0[0]), EY(c0[1]), EX(nth[0]), EY(nth[1]), { c: 'warn', w: 3 }) + `<circle cx="${EX(c0[0])}" cy="${EY(c0[1])}" r="5" class="sv-fill-ink"/>` +
  S.text(EX(c0[0]) + 8, EY(c0[1]) + 18, '现在', 'sv-s', 'start') +
  S.text(ex0, 284, `大圆 = 得分高（最高 ${best.toFixed(1)}）；小灰圆 = 得分低（最低 ${worst.toFixed(1)}）`, 'sv-s', 'start') + S.text(ex0, 300, '橙箭头：这一步走到的新参数', 'sv-s warn', 'start');
/* PPO clipped objective for one action, advantage +1 / −1 */
const rr = Array.from({ length: 61 }, (_, i) => 0.5 + i / 60);
const ppo = A => rr.map(r => [r, Math.min(r * A, K.clamp(r, 0.8, 1.2) * A)]);
const figES = S.svg(820, 306, esB + S.plot(420, 0, 400, 270, { title: 'PPO：概率变化超过 ±20% 就不再加分', x: [0.5, 1.5], y: [-1.6, 1.4], xt: [0.5, 0.8, 1, 1.2, 1.5], yt: [-1, 0, 1],
  series: [{ pts: ppo(1), c: 'acc' }, { pts: ppo(-1), c: 'b' }, { pts: [[0.8, -1.6], [0.8, 1.4]], c: 'soft', dash: 1 }, { pts: [[1.2, -1.6], [1.2, 1.4]], c: 'soft', dash: 1 }] }) +
  S.text(640, 288, '新策略 / 旧策略 做这个动作的概率之比', 'sv-s') + S.text(800, 62, '比预期好的动作', 'sv-s acc', 'end') + S.text(476, 180, '比预期差的动作', 'sv-s b', 'start'),
  '进化策略的一次更新，以及 PPO 的“每次只改一点”');

/* figure: learning curve + what it learned (seed 3) */
const figCurve = S.svg(820, 290,
  S.plot(0, 0, 400, 260, { title: '学习曲线（种子 3）：回报', x: [0, 200], y: [-20, 120], yt: [0, 40, 80, 120], series: [{ pts: OFF.t0.curve, c: 'acc' }] }) +
  S.text(222, 284, `横轴：更新次数（共试飞 ${(OFF.t0.steps / 1e4).toFixed(0)} 万步）`, 'sv-s') +
  S.plot(420, 0, 400, 260, { title: '学到的起飞（高度 m）', x: [0, TMAX], y: [0.9, 2], xu: 's', yt: [1, 1.4, 1.8], hl: [{ v: ZR, c: 'warn' }],
    series: [{ pts: OFF.L0.map(q => [q[0], q[1]]), c: 'soft', dash: 1 }, { pts: OFF.L1.map(q => [q[0], q[1]]), c: 'acc' }, { pts: OFF.L30.map(q => [q[0], q[1]]), c: 'b' }] }) +
  S.text(800, 160, '虚线：训练前', 'sv-s', 'end') + S.text(800, 180, '蓝绿：c = 0', 'sv-s acc', 'end') + S.text(800, 200, '蓝：c = 30（重视平滑）', 'sv-s b', 'end'),
  '学习曲线和学到的行为');

el.innerHTML = `
<p class="lede">上一课的模仿学习需要专家，最多和专家一样好。<span class="term">强化学习</span>（reinforcement learning，RL）不要专家，只要一个打分规则：控制器自己去飞，看得分，再往得分高的方向改一点。</p>

<h2>一个循环</h2>
${K.fig(figLoop, '<b>智能体</b>（agent）' + K.ours('', '就是控制器；') + '它从状态算动作的那个函数叫<b>策略</b>（policy）。<b>环境</b>是它以外的一切。每一步环境回一个<b>奖励</b>（reward）。从开始到结束的一次尝试叫一个<b>回合</b>（episode）。')}
${K.more('展开：术语对照表', `<div class="tblwrap"><table class="tbl">
<tr><th>术语</th><th>意思</th><th>${K.ours('', `在无人机飞控里`)}</th></tr>
<tr><td><b>智能体</b>（agent）</td><td>做决定、会学习的那一方</td><td>神经网络控制器</td></tr>
<tr><td><b>环境</b>（environment）</td><td>智能体以外的一切</td><td>仿真器：飞机、风、PX4 角速度环</td></tr>
<tr><td><b>状态 / 观测</b></td><td>每一刻看到的信息</td><td>估计的位置、速度、姿态、未来参考</td></tr>
<tr><td><b>动作</b>（action）</td><td>每一刻的输出</td><td>CTBR 指令（第 12 课）</td></tr>
<tr><td><b>奖励</b>（reward）</td><td>每一步给的一个分数</td><td>跟得准加分，动作抖、费电扣分</td></tr>
<tr><td><b>策略</b>（policy）</td><td>从状态到动作的函数</td><td>就是控制器本身</td></tr>
<tr><td><b>回合</b>（episode）</td><td>一次完整尝试</td><td>飞一条参考轨迹，或中途坠毁而提前结束</td></tr>
</table></div>`)}

<h2>奖励和回报</h2>
<p>目标是让一个回合里奖励的总和——<span class="term">回报</span>（return）——尽量大。下面用实验里的起飞任务（从 1.0 m 爬到 1.8 m，每步 0.02 s，共 200 步）算一遍。</p>
<div id="walk"></div>
${K.more(K.ours('', '展开：折扣的取值、稀疏与稠密奖励'), `${K.ours('', `<p>常见取值 γ = 0.99，有效“视野”约 100 步：每秒 125 步时约 0.8 秒，实验每秒 50 步时约 2 秒。</p>`)}
<p>只在“到达目标”时给 1 分叫<span class="term">稀疏奖励</span>，智能体要碰巧到达过一次才知道往哪改，学得极慢；每一步按误差连续给分叫<span class="term">稠密奖励</span>。跟踪控制几乎都用稠密奖励。</p>
<p>奖励漏洞（reward hacking）：智能体最大化的是你<b>写下</b>的奖励，而不是你<b>心里想</b>的目标（Amodei 等 2016 年《Concrete Problems in AI Safety》把它列为一类典型问题）。所以学出来的控制器必须在独立测试集上用真实指标检验，不能只看训练得分。</p>`)}

<h2>怎么改：试一批，往好的方向挪</h2>
${K.fig(figES, '<b>左</b>：实验的训练器（进化策略）做的第一次更新，数字是真的。把参数朝 8 对相反方向各挪一点去试飞，按得分排名，往得分高的那些方向走一小步（橙箭头）。<b>右</b>：PPO 做的是同一件事的“动作版”：比预期好的动作，概率调高；但新旧概率之比超过 1.2（或低于 0.8）就不再加分，所以每次只改一点。')}
${K.more('展开：策略梯度、价值网络、PPO、探索', `<p><span class="term">策略梯度</span>（policy gradient）：某个动作之后的结果<b>比预期好</b>，就把在那个状态下做这个动作的概率调高；比预期差就调低。“预期”由另一个网络来估，叫<span class="term">价值网络</span>（critic）。这和上一课的梯度下降是同一套办法，只是方向来自得分，不来自专家答案。</p>
<p>方向是从一批有噪声的试飞里估出来的，一次改太多，策略可能突然变差，训练就崩了。<span class="term">PPO</span>（Proximal Policy Optimization；Schulman 等，2017，arXiv）把概率之比的变化限制在一个比例内（论文实验取 ±20%）。Swift 竞速无人机（Kaufmann 等，Nature 2023）${K.ours('', `就用它`)}。</p>
<p><span class="term">探索</span>：只做目前认为最好的动作，就发现不了更好的，所以训练时要加随机性。噪声太小学得慢；太大则飞得乱、得分信号被噪声淹没。</p>`)}

<h2>学习曲线</h2>
${K.fig(figCurve, `用实验的训练器、随机种子 3 离线算出。<b>左</b>：回报从 ${OFF.t0.curve[0][1].toFixed(1)} 涨到 ${OFF.t0.curve[200][1].toFixed(1)}，中间还先跌了一下。<b>右</b>：c = 0 时 ${OFF.t90(OFF.L1).toFixed(2)} s 就到 90%；把“动作变化”的扣分权重 c 调到 30，要 ${OFF.t90(OFF.L30).toFixed(2)} s，但动作总变化从 ${OFF.tv(OFF.L1).toFixed(0)} 降到 ${OFF.tv(OFF.L30).toFixed(0)} m/s²。奖励怎么写，就是强化学习的调参。`)}
${K.more('展开：为什么要几百万步、为什么要 GPU', `<p>每次改进都要靠大量试飞来估方向。实验只有 3 个参数，也要试飞几十万步；神经网络有成千上万个权重，需要的多得多。Swift 用了约 1 亿步仿真交互（约 50 分钟训练）。真机上这样试既慢又会摔，所以几乎都在仿真里训练。</p>
${K.ours('', `<p>GPU 并行仿真（例如 MuJoCo Warp、Isaac Gym 一类）可以让上千个仿真世界同时飞。按每秒 125 步算，2000 万步相当于约 44 小时的总飞行时间，并行后能在远短于此的时间里完成。</p>`)}`)}

<h2>和前几课的关系</h2>
<div class="tblwrap"><table class="tbl">
<tr><th></th><th>谁定“往哪改”</th><th>能不能超过参照</th></tr>
<tr><td>第 2 课 <a href="#l2">调 PID</a></td><td>人看曲线、改增益</td><td>—</td></tr>
<tr><td>第 12 课 <a href="#l12">模仿学习</a></td><td>专家的答案</td><td>最多和专家一样</td></tr>
<tr><td>本课：强化学习</td><td>奖励（得分）</td><td>可以，只要奖励写对</td></tr>
</table></div>

<div id="d13"></div>

<div class="key"><h3>这一课记住三件事</h3><ul>
<li>强化学习 = 自己试 → 按奖励打分 → 往得分高的方向改一点；策略就是控制器。</li>
<li>奖励设计是新的调参：跟踪和平滑、能耗互相拉扯；写错了，它会钻空子。</li>
<li>PPO 每次只改一点以保持稳定；代价是需要海量试飞，所以要在 GPU 上并行仿真。</li>
</ul></div>
<h2>小测验</h2><div id="q13"></div>`;

K.steps(el.querySelector('#walk'), { title: '用数字走一遍：训练前的策略飞一个回合', steps: walk });
const d = K.demo(el.querySelector('#d13'), '动手', '在浏览器里训练一个起飞控制器',
  '任务：从 1.0 m 悬停爬到 1.8 m 并停住。控制器只有 3 个参数（比例、阻尼、偏置），一开始很软。① 点“开始训练”，看学习曲线上升、飞行从慢慢爬变成快速到位，记下“到达 90% 用时”和“动作总变化”。② 把平滑权重拉到 30（会自动重训），动作变平缓、上升变慢。③ 把“跟踪项”切到“扣分”，重训：它学会直接往下掉出范围，让回合提前结束。④ 多点几次“换随机种子”，看结果是否每次一样。');
const cvs = K.box(d, 'cvs');
const cA = K.canvas(cvs, 1.0, 260), cB = K.canvas(cvs, 1.0, 260);
const ctl = K.box(d, 'controls'), ro = K.box(d, 'readout');

const NIT = 200;
let th, it, steps, curve, g, seed = 3, run = false, acc = 0, log = [], res, rt = 0;
const sC = K.slider(ctl, { id: 'l13-c', label: '平滑权重 c（动作变化扣分）', min: 0, max: 30, step: 1, value: 0, on: () => restart(true) });
const form = K.seg(ctl, { label: '跟踪项', options: [['pos', '加分：exp(−误差²/0.1)'], ['neg', '扣分：−误差²']], value: 'pos', on: () => restart(true) });
const br = K.box(ctl, 'btnrow');
const bRun = K.btn(br, '开始训练', () => { if (it >= NIT) restart(true); else { run = !run; label(); } }, 'primary');
K.btn(br, '从头重新训练', () => restart(true));
K.btn(br, '换随机种子', () => { seed++; restart(true); });
const label = () => { bRun.textContent = it >= NIT ? '再训练一次' : run ? '暂停' : '开始训练'; };
function evalPolicy() { log = [[0, Z0, 0]]; res = episode(th, sC.v, form.v === 'neg', log); }
function restart(go) { th = TH0.slice(); it = 0; steps = 0; curve = []; g = rng(seed); run = !!go; evalPolicy(); curve.push([0, res.R]); rt = 0; label(); }
restart(false);
K.loop(dt => {
  if (run && it < NIT) {
    acc += dt;
    while (acc > 0.04 && it < NIT) { acc -= 0.04; const r = esStep(th, sC.v, form.v === 'neg', g); th = r.th; steps += r.steps; it++; evalPolicy(); curve.push([it, res.R]); }
    if (it >= NIT) { run = false; label(); }
  }
  rt += dt; const tEnd = log[log.length - 1][0]; if (rt > tEnd + 1.2) rt = 0;
  const k = Math.min(log.length - 1, Math.round(rt / DT)), zc = log[k][1];
  const c = K.col(), a = cA.fit(), ctx = a.ctx, v = K.view(a.w, a.h, -1.3, 1.3, -0.1, 3.1, 10);
  K.grid(ctx, v, c, 1);
  ctx.strokeStyle = c.warn; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(v.X(-1.3), v.Y(ZR)); ctx.lineTo(v.X(1.3), v.Y(ZR)); ctx.stroke();
  ctx.strokeStyle = c.bad; ctx.lineWidth = 1; [ZR - EOUT, ZR + EOUT].forEach(z => { ctx.beginPath(); ctx.moveTo(v.X(-1.3), v.Y(z)); ctx.lineTo(v.X(1.3), v.Y(z)); ctx.stroke(); }); ctx.setLineDash([]);
  K.text(ctx, '目标 1.8 m', v.X(-1.25), v.Y(ZR) - 5, c.warn); K.text(ctx, '超出这两条线，回合提前结束', v.X(-1.25), v.Y(ZR - EOUT) + 14, c.bad);
  const f = K.clamp((K.g + log[k][2]) / (2 * K.g), 0, 1);
  K.drawQuad(ctx, v.X(0), v.Y(zc), 0, v.s * 1.3, { thrust: [f, f], color: res.end && k === log.length - 1 ? c.bad : c.ink });
  if (res.end && k === log.length - 1) K.text(ctx, '回合提前结束', v.X(0), v.Y(zc) + 40, c.bad, '600 14px "Noto Sans SC", sans-serif', 'center');
  const b = cB.fit(), H = b.h, ys = curve.map(p => p[1]), lo = Math.min(...ys), hi = Math.max(...ys), pd = Math.max(5, (hi - lo) * 0.1);
  K.plot(b.ctx, 0, 0, b.w, H * 0.4, { title: '学习曲线：回报（横轴：更新次数）', x: [0, NIT], y: [Math.floor(lo - pd), Math.ceil(hi + pd)], series: [{ pts: curve, color: c.acc }] });
  K.plot(b.ctx, 0, H * 0.4, b.w, H * 0.3, { title: '当前策略的高度', unit: 'm', x: [0, NSTEP * DT], y: [0.6, 2.9], series: [{ pts: log, i: 1, color: c.acc, label: '高度' }], hl: [{ v: ZR, color: c.warn }], xfmt: x => x.toFixed(0) + 's' });
  K.plot(b.ctx, 0, H * 0.7, b.w, H * 0.3, { title: '指令：推力产生的加速度（悬停之外）', unit: 'm/s²', x: [0, NSTEP * DT], y: [-9, 9], series: [{ pts: log, i: 2, color: c.b }], xfmt: x => x.toFixed(0) + 's' });
  let t90 = null, tv = 0; for (let i = 1; i < log.length; i++) { if (t90 === null && log[i][1] >= Z0 + 0.9 * (ZR - Z0)) t90 = log[i][0]; tv += Math.abs(log[i][2] - log[i - 1][2]); }
  const p = par(th);
  ro.innerHTML = `<span>更新次数 <b>${it} / ${NIT}</b></span><span>已试飞 <b>${(steps / 1000).toFixed(0)} 千步</b>（约 ${(steps * DT / 60).toFixed(0)} 分钟飞行）</span><span>参数 比例 ${p[0].toFixed(1)}，阻尼 ${p[1].toFixed(1)}，偏置 ${p[2].toFixed(1)}</span><span>到达 90% 用时 <b>${t90 === null ? '—' : t90.toFixed(2) + ' s'}</b></span><span>动作总变化 <b>${tv.toFixed(0)} m/s²</b></span><span>回合 <b class="${res.end ? 'hot' : 'good'}">${res.end ? '第 ' + (res.n * DT).toFixed(2) + ' s 提前结束' : '飞满 4 s'}</b></span><span>随机种子 <b>${seed}</b></span>`;
});
K.box(d, 'assume', '<b>这个实验做了哪些简化：</b>只有上下一个方向，指令直接是“悬停之外的加速度”，经 0.08 s 一阶延迟生效，没有噪声和风，每个回合完全相同；控制器只有 3 个参数，不是神经网络；学习算法<b>不是 PPO</b>，而是更简单的<span class="term">进化策略</span>（evolution strategies）：每次把参数随机朝 8 对相反方向各挪一点去试飞，按得分排名，往得分高的方向走一小步。它和 PPO 共有“试飞—打分—小步改进”的思路，但 PPO 是在动作上加噪声、并用价值网络估计每个动作好多少。每一步奖励 = 跟踪项 − c·(指令变化/9)² − 0.3·(推力/悬停推力)²；偏离目标超过 1 m 回合结束。在 1–10 号随机种子上：“加分”写法在 c = 0、10、30 时 10 次都没有钻空子；“扣分”写法 10 次里有 9 次学会提前结束回合（种子 1 没有）。上面的“一步一步看”和静态图用同一套代码离线算出（种子 3）。');

K.quiz(el.querySelector('#q13'), 'l13', [
  { q: '在强化学习里，“策略”（policy）指的是什么？', o: ['每一步给的分数', '从状态到动作的函数，也就是控制器本身', '仿真器', '一次完整的试飞'], a: 1,
    e: '分数是奖励，仿真器是环境，一次完整试飞是回合。策略就是“看到什么状态做什么动作”，' + K.ours('', '在学习型飞控里就是神经网络控制器。') + '' },
  { q: '把奖励里“动作变化”的扣分权重调大，学出来的控制器通常会怎样？', o: ['动作更平缓，但到达目标更慢', '动作更猛，到达更快', '完全没有变化', '一定会坠毁'], a: 0,
    e: '平滑和快速互相拉扯。实验里 c 从 0 调到 30，到达 90% 的时间变长，动作总变化明显减少。怎么配权重，就是强化学习里的调参。' },
  { q: 'PPO 名字里的“近端”（proximal）限制的是什么？', o: ['飞机离目标的距离', '每次更新后，新策略不能离旧策略太远', '网络的层数', '训练用的仿真世界数量'], a: 1,
    e: '改进的方向是从有噪声的试飞里估出来的，一次改太多可能让策略突然变差。PPO 把每次的变化限制在一个比例内，用多次小步换稳定。' },
  { q: '实验里“扣分：−误差²”的写法学会了一头掉出范围、提前结束回合。根本原因是什么？', o: ['学习算法有 bug', '每一步的奖励都是负的，回合越早结束扣得越少，它最大化的是写下的奖励', '控制器参数太少', '平滑权重太大'], a: 1,
    e: '这就是奖励漏洞：智能体忠实地最大化你写下的东西。换成每步为正的“加分”写法，提前结束就要丢掉后面的分数，它就不会这样做。' },
]);
} });
