K.add({ id: 'l14', num: 14, title: '学习型自适应：从最近的历史认出扰动', sub: 'Neural-Fly 离线学“形状”、在线调系数；RMA 从历史推断环境', render(el) {
/*SIM14*/
const MS = 2.74, CD = 0.06, KP = 4, KV = 3.2, KI = 2, AMP = 1.5, OM = 1.0, TU = 0.05, MEM = 1.5, ANOISE = 0.5;
const windF = (w, v) => { const r = w - v; return CD * r * Math.abs(r); };
const FEATS = { ok: (x, v) => [1, v, v * v], one: () => [1], bad: (x, v) => [1, x] };
const trueA = w => [CD * w * w, -2 * CD * w, CD]; /* true coefficients (used by the headless test) */
function mkV(mode) {
  return { mode, x: 0, v: AMP * OM, u: 0, I: 0, fh: 0, F: 0, th: [0, 0, 0], P: [[50, 0, 0], [0, 50, 0], [0, 0, 50]] };
}
function rls(V, f, y, lam) {
  const n = f.length, Pf = [];
  for (let i = 0; i < n; i++) { Pf[i] = 0; for (let j = 0; j < n; j++) Pf[i] += V.P[i][j] * f[j]; }
  let den = lam, pr = 0; for (let i = 0; i < n; i++) { den += f[i] * Pf[i]; pr += f[i] * V.th[i]; }
  const e = y - pr, th0 = V.th.slice(); let tr = 0;
  for (let i = 0; i < n; i++) { V.th[i] += Pf[i] / den * e; }
  V.last = { f: f.slice(), pr, y, e, k: Pf.map(q => q / den), th0, th1: V.th.slice(), pd: V.P.map((r, i) => r[i]) };
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { V.P[i][j] = (V.P[i][j] - Pf[i] * Pf[j] / den) / lam; if (i === j) tr += V.P[i][i]; }
  if (tr > 300) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) V.P[i][j] *= 300 / tr;
}
function stepV(V, h, t, w, feat) {
  const xr = AMP * Math.sin(OM * t), vr = AMP * OM * Math.cos(OM * t), ar = -AMP * OM * OM * Math.sin(OM * t);
  const e = xr - V.x, ed = vr - V.v, f = FEATS[feat](V.x, V.v);
  let uc = MS * (ar + KP * e + KV * ed);
  if (V.mode === 'int') { V.I += e * h; uc += MS * KI * V.I; V.fh = -MS * KI * V.I; }
  else { V.fh = 0; for (let i = 0; i < f.length; i++) V.fh += f[i] * V.th[i]; uc -= V.fh; }
  V.u += (uc - V.u) * h / TU;
  V.F = windF(w, V.v);
  const a = (V.u + V.F) / MS;
  V.v += a * h; V.x += V.v * h; V.e = e;
  if (V.mode !== 'int') rls(V, f, MS * (a + ANOISE * K.randn() / Math.sqrt(h / 0.01)) - V.u, Math.exp(-h / MEM));
}

/*END14*/
/*offline: the demo's own model with fixed random seeds (Math.random swapped only during these runs) */
const S = K.S, H5 = 0.005;
function seeded(seed, fn) {
  const keep = Math.random; let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = keep; }
}
function runPair(feat, wfn, T, every) {
  const A = mkV('int'), B = mkV('learn'), log = []; let t = 0, n = 0;
  while (t < T - 1e-9) { t += H5; const w = wfn(t); stepV(A, H5, t, w, 'ok'); stepV(B, H5, t, w, feat); if (n++ % every === 0) log.push([t, A.e * 100, B.e * 100, B.F, A.fh, B.fh]); }
  return log;
}
const rms = (log, i, a, b) => { const s = log.filter(p => p[0] >= a && p[0] < b); return Math.sqrt(s.reduce((q, p) => q + p[i] * p[i], 0) / s.length); };
const OFF = (() => {
  const U = seeded(5, () => { const B = mkV('learn'), out = []; let t = 0;
    for (let n = 1; n <= 1001; n++) { t += H5; stepV(B, H5, t, 8, 'ok'); if (n === 1 || n === 1001) out.push({ t, F: B.F, ...B.last }); }
    return out; });
  const W0 = 4, W1 = 10, TS = 12, cmp = seeded(6, () => runPair('ok', t => t < TS ? W0 : W1, 24, 4));
  const bars = ['ok', 'one', 'bad'].map((f, i) => seeded(7 + i, () => runPair(f, () => 8, 20, 1)));
  return { U, cmp, W0, W1, TS, bars };
})();
const k3 = a => '[' + a.map(x => x.toFixed(3)).join(', ') + ']', v2 = x => (Math.abs(x) < 0.005 ? 0 : x).toFixed(2), vec = a => '[' + a.map(v2).join(', ') + ']';

/* figure: residual force */
const figRes = S.svg(820, 220,
  S.quad(150, 120, 0, 70) +
  S.arrow(150, 100, 150, 30, { c: 'acc', label: '推力（控制器知道）', side: 'right' }) +
  S.arrow(150, 140, 150, 205, { c: 'soft', label: '重力 m·g（知道）', side: 'right' }) +
  S.arrow(20, 120, 70, 120, { c: 'bad', w: 3 }) + S.text(20, 108, '风', 'sv-s bad', 'start') +
  S.text(330, 60, '名义模型的预测：(推力 + 重力) / m', 'sv-t', 'start') +
  S.text(330, 92, '实际测到的加速度 a', 'sv-t', 'start') +
  S.text(330, 136, '残差力 = m·a − (推力 + 重力)', 'sv-n', 'start') +
  S.text(330, 162, '风、质量估错、电池掉压、机械臂反作用力……都在这里', 'sv-s', 'start') +
  S.text(330, 190, '第 8 课的积分、观测器、L1 估的就是它', 'sv-s acc', 'start'),
  '残差力：实际受力和模型预测的差');

/* figure: Neural-Fly offline / online split */
const figSplit = S.svg(820, 270,
  `<rect x="10" y="10" width="300" height="250" rx="12" class="sv-box" stroke-dasharray="6 5"/>` + S.text(160, 34, '起飞前（离线，一次）', 'sv-t') +
  S.box(30, 50, 260, 54, '多种风下的飞行数据', '论文：6 种恒定风，约 12 分钟', 'b') + S.arrow(160, 104, 160, 128) +
  S.box(30, 130, 260, 54, 'DAIML 元学习', '逼 φ 与风况无关', 'b') + S.arrow(160, 184, 160, 208) +
  S.box(30, 210, 260, 40, '基函数 φ(x)：固定下来', '', 'hl') +
  S.arrow(310, 230, 368, 230, { c: 'acc' }) + S.text(339, 252, '带上飞机', 'sv-s acc') +
  `<rect x="370" y="10" width="440" height="250" rx="12" class="sv-box" stroke-dasharray="6 5"/>` + S.text(590, 34, '飞行中（在线，每一拍）', 'sv-t') +
  S.box(385, 50, 95, 54, '状态 x', '速度、姿态…') + S.arrow(480, 77, 498, 77) +
  S.box(500, 50, 95, 54, 'φ(x)', '形状', 'hl') + S.arrow(595, 77, 613, 77) +
  S.box(615, 50, 85, 54, '× a', '几个系数', 'px') + S.arrow(700, 77, 713, 77) +
  S.box(715, 50, 85, 54, '预测 f̂', '控制器减掉', 'hl') +
  S.box(385, 160, 170, 54, '测到的残差力 y', '从实际加速度算') + S.arrow(555, 187, 598, 187) +
  S.box(600, 160, 200, 54, '误差 y − f̂', '') + S.arrow(757, 104, 757, 158) +
  S.arrow(657, 160, 657, 106, { c: 'warn', w: 2.5 }) + S.text(650, 140, '修正 a', 'sv-s warn', 'end') + S.text(592, 240, '用误差修正 a（递推最小二乘）', 'sv-s warn'),
  'Neural-Fly：离线学形状 φ，在线只调系数 a');

/* walkthrough: one recursive least-squares update */
const NAMES = [['状态', 'v (m/s)'], ['特征 φ', '[1, v, v²]'], ['旧系数 a', ''], ['预测 f̂ = φ·a', 'N'], ['测到 y', 'N'], ['误差 e = y − f̂', 'N'], ['增益 k', ''], ['新系数 a', '']];
function strip(u, k, note) {
  const vals = [v2(u.f[1]), vec(u.f), vec(u.th0), v2(u.pr), v2(u.y), v2(u.e), k3(u.k), vec(u.th1)];
  let b = '';
  for (let i = 0; i < 8; i++) {
    const r = i >> 2, c = i % 4, x = 10 + c * 202, y = 20 + r * 100, on = i <= k;
    b += S.box(x, y, 188, 66, NAMES[i][0], '', on ? (i === k ? 'hl on' : 'hl') : 'dim') + (on ? S.text(x + 94, y + 56, vals[i], 'sv-n') : '');
    if (c < 3) b += S.arrow(x + 188, y + 33, x + 200, y + 33, { c: on && i < k ? 'acc' : 'soft' });
  }
  b += S.text(810, 104, '↓ 接下一行', 'sv-s', 'end');
  return S.svg(820, 214, b + S.text(410, 208, note, 'sv-s'), '一次在线更新');
}
const U1 = OFF.U[0], U2 = OFF.U[1];
const walk = [
  { svg: strip(U1, 1, '起飞后第 1 拍（0.005 s），风速 8 m/s'), t: `飞机现在的速度 v = <b>${v2(U1.f[1])} m/s</b>。离线学好的特征（这里直接给定）把它变成三个数 φ = <b>${vec(U1.f)}</b>。` },
  { svg: strip(U1, 3, '系数还都是 0，什么也没学到'), t: `系数 a 从 0 开始，所以预测的风力 f̂ = φ·a = <b>0 N</b>。` },
  { svg: strip(U1, 5, `真实风力 ${v2(U1.F)} N；测量里有噪声`), t: `由实际加速度算出残差力 y = <b>${v2(U1.y)} N</b>（真实风力 ${v2(U1.F)} N，差的是加速度噪声）。误差 e = y − f̂ = <b>${v2(U1.e)} N</b>。` },
  { svg: strip(U1, 7, '开始时不确定度 P = 50，很信新数据'), t: `增益 k = P·φ / (λ + φᵀPφ) = <b>${k3(U1.k)}</b>，新系数 a = 旧 a + k·e = <b>${vec(U1.th1)}</b>。新的预测 φ·a = ${v2(U1.f.reduce((s, f, i) => s + f * U1.th1[i], 0))} N：一开始几乎全信这一次测量。` },
  { svg: strip(U2, 7, `5 秒（1000 拍）之后：真值 a = ${vec(trueA(8))}`), t: `5 秒后，不确定度 P 已缩到 ${U2.pd.map(x => x.toFixed(3)).join('、')}，增益只有 <b>${k3(U2.k)}</b>。这一拍的误差 ${v2(U2.e)} N 大多是噪声，a 只挪了一点点。a ≈ <b>${vec(U2.th1)}</b>，已接近真值 ${vec(trueA(8))}。` },
];

/* figure: integral vs learned features (wind jumps 4 -> 10 m/s at 12 s) */
const C = OFF.cmp, ser = i => C.map(p => [p[0], p[i]]);
const figCmp = S.svg(820, 270,
  S.plot(0, 0, 400, 260, { title: '跟踪误差 (cm)', x: [0, 24], y: [-40, 40], xu: 's', yt: [-30, 0, 30], series: [{ pts: ser(1), c: 'warn' }, { pts: ser(2), c: 'acc' }] }) +
  S.plot(420, 0, 400, 260, { title: '风力 (N)', x: [0, 24], y: [0, 14], xu: 's', yt: [0, 5, 10], series: [{ pts: ser(3), c: 'ink' }, { pts: ser(4), c: 'warn', dash: 1 }, { pts: ser(5), c: 'acc' }] }) +
  S.text(52, 52, '橙：积分', 'sv-s warn', 'start') + S.text(52, 70, '蓝绿：学到的特征 + 在线系数', 'sv-s acc', 'start') +
  S.text(472, 52, '黑：真实  橙虚线：积分的估计  蓝绿：学习的估计', 'sv-s', 'start') +
  S.text(52, 88, `第 ${OFF.TS} 秒起风速 ${OFF.W0} → ${OFF.W1} m/s`, 'sv-s', 'start'),
  '积分与学习特征的对比');
const BR = [['积分', rms(OFF.bars[0], 1, 10, 20), 'warn'], ['特征 [1]', rms(OFF.bars[1], 2, 10, 20), 'b'], ['错的 [1, x]', rms(OFF.bars[2], 2, 10, 20), 'bad'], ['对的 [1, v, v²]', rms(OFF.bars[0], 2, 10, 20), 'acc']];
const figBars = S.svg(520, 180, S.text(10, 20, '风速 8 m/s，第 10–20 秒的误差 RMS (cm)', 'sv-t', 'start') +
  BR.map(([n, v, c], i) => S.text(150, 54 + i * 36, n, 'sv-s', 'end') + `<rect x="160" y="${40 + i * 36}" width="${v * 30}" height="22" rx="3" class="sv-fill-${c}"/>` + S.text(168 + v * 30, 56 + i * 36, v.toFixed(1), 'sv-n', 'start')).join(''),
  '特征选得对不对');

el.innerHTML = `
<p class="lede"><a href="#l7">第 8 课</a>的积分、扰动观测器和 L1 都在飞行中实时估出“控制器不知道的那个力”再抵消掉。学习方法的思路是：<b>先用数据学会扰动大概长什么样，飞行中只需认出“现在是哪一种”</b>。</p>

<h2>残差力：模型没写进去的那部分</h2>
${K.fig(figRes, '“我给了多大推力”和“飞机实际怎么动了”放在一起，差别就是外力。所以最近一小段状态和动作的历史里，藏着残差力的信息。')}

<h2>Neural-Fly：离线学形状，在线调系数</h2>
${K.fig(figSplit, '<span class="term">Neural-Fly</span>（O\'Connell、Shi 等，Science Robotics 2022）把残差力写成 f ≈ φ(x)·a。<b>φ</b> 是神经网络表示的一组<span class="term">基函数</span>，描述力怎么随飞机状态变化，起飞前学好就不动；<b>a</b> 只有几个数，描述“现在是哪种风”，飞行中每一拍更新。')}
${K.more('展开：DAIML、复合自适应律和论文结果', `<p>x 在论文里是速度、姿态四元数和电机 PWM 指令。<span class="term">DAIML</span>（Domain Adversarially Invariant Meta-Learning，域对抗不变元学习）训练时另有一个判别器，试图只看 φ 的输出猜出当时是哪种风；φ 被训练得让它猜不出来，于是风的信息被逼进系数 a，φ 成为与风况无关的表示。论文用 6 种恒定风（0–6.1 m/s）下共约 12 分钟的飞行数据。</p>
<p>在线部分是复合自适应律：同时用“力的预测误差”和“轨迹跟踪误差”更新 a，形式类似卡尔曼滤波。对照 Neural-Fly-Constant 把 φ 换成常数映射，相当于卡尔曼滤波式的扰动观测器（外加跟踪误差项）。论文在风洞 8 字轨迹实验里报告：Neural-Fly 的跟踪误差小于这个常数版本，也小于 INDI、L1 和非线性基线；测试风速最高到 12.1 m/s，超出了训练数据的风速范围。</p>`)}
<div id="walk"></div>

<h2>比一比：积分 vs 学到的特征</h2>
${K.fig(figCmp, `用下面实验的同一个模型离线算出。飞机来回飞时，风力随飞机速度起伏。积分只能补一个慢慢变化的平均力，跟不上起伏，风变大后误差一直在摆（第 18–24 秒 RMS ${rms(C, 1, 18, 24).toFixed(1)} cm）；学到的特征跟得上随速度变的那部分，风突变后约 4 秒重新认出新风，误差回到 ${rms(C, 2, 18, 24).toFixed(1)} cm。`)}
${K.fig(figBars, '在线部分只能调系数，不能改特征。特征选错（只有常数，或用了和风力无关的位置 x），再快的在线更新也只能拟合出一个“最不坏”的近似：这叫<span class="term">模型失配</span>。', 'narrow')}

<h2>和第 8 课的关系</h2>
<div class="tblwrap"><table class="tbl">
<tr><th>方法</th><th>飞行中在估什么</th><th>事先学了什么</th></tr>
<tr><td>第 8 课 <a href="#l7">积分 / 扰动观测器 / L1</a></td><td>一个力（或加速度）</td><td>什么也没学</td></tr>
<tr><td>Neural-Fly</td><td>几个系数 a</td><td>力随状态变化的形状 φ</td></tr>
<tr><td>RMA</td><td>环境编码 z（一次前向计算，权重不变）</td><td>从历史到 z 的网络</td></tr>
</table></div>
${K.more('展开：RMA 的两个阶段', `<p><span class="term">RMA</span>（Rapid Motor Adaptation，Kumar、Fu、Pathak、Malik，RSS 2021，用在四足机器人上）分两个阶段，都在仿真里完成：</p>
<div class="flow"><div class="bx"><b>阶段 1</b><span class="s">策略能看到仿真里的真实环境参数（质量、摩擦、电机强度……），编码器把它压成一个短向量 z（环境编码），策略用强化学习训练</span></div><div class="ar">→</div><div class="bx"><b>阶段 2</b><span class="s">训练一个自适应模块：只读最近的状态和动作历史，用监督学习去回归阶段 1 的 z</span></div><div class="ar">→</div><div class="bx"><b>部署</b><span class="s">策略 + 自适应模块，不再需要任何特权信息</span></div></div>
<p>Neural-Fly 飞行中<b>真的在改参数</b>（a 一直在更新）；RMA 部署时<b>网络权重一个都不变</b>，“自适应”只是从历史里推断出新的 z。共同点：离线学好一个结构，在线只需确定很少几个数。</p>`)}
${K.ours('')}

<div id="d14"></div>
<div class="warnbox"><b>学到的结构只在它学过的范围里可靠。</b>基函数没见过某种扰动的形状，在线怎么调系数都拟合不好；RMA 的环境编码没覆盖某种情况，推断出的 z 也会不对。${K.ours('', `所以评测时要分“分布内 / 分布外”两套测试（第 11 课）。`)}</div>

<div class="key"><h3>这一课记住三件事</h3><ul>
<li>残差力 = 实际受力 − 名义模型的预测；最近的状态和动作历史里藏着它的信息。</li>
<li>Neural-Fly：离线学与风无关的基函数 φ，飞行中只在线更新线性系数 a。RMA：部署时权重不变，从历史推断环境编码 z。</li>
<li>结构对了，在线只需估几个慢变的数，又快又稳；结构错了，在线调参也救不回来。</li>
</ul></div>
<h2>小测验</h2><div id="q14"></div>`;

K.steps(el.querySelector('#walk'), { title: '用数字走一遍：在线最小二乘怎么更新系数 a（实验的模型，风速 8 m/s）', steps: walk });


const d = K.demo(el.querySelector('#d14'), '动手', '在风里来回飞',
  '两架飞机来回跟踪同一条往返轨迹（橙点），风从左吹来，风力随飞机的速度变化（顶风飞时更大）。上面一架用积分补偿，下面一架用“学好的特征 [1, v, v²] + 在线最小二乘系数”。① 默认设置下等 10 秒，比较两者的误差曲线。② 点“风突变”，看谁先回到小误差。③ 把特征切成“只有常数”，再切成“错的特征 [1, x]”，看下面那架的误差怎么变。');
const cA = K.canvas(d, 0.3, 180), cB = K.canvas(d, 0.36, 200);
const ctl = K.box(d, 'controls'), ro = K.box(d, 'readout');
const sW = K.slider(ctl, { id: 'l14-w', label: '风速', min: 3, max: 12, step: 0.5, value: 8, fmt: v => v.toFixed(1) + ' m/s' });
const fs = K.seg(ctl, { label: '学到的特征', options: [['ok', '正确 [1, v, v²]'], ['one', '只有常数 [1]'], ['bad', '错的 [1, x]']], value: 'ok', on: () => { B = mkV('learn'); B.x = A.x; B.v = A.v; } });
const br = K.box(ctl, 'btnrow');
K.btn(br, '风突变（大 ↔ 小）', () => sW.set(sW.v >= 7.5 ? 4 : 10), 'primary');
K.btn(br, '重来', () => { A = mkV('int'); B = mkV('learn'); t = 0; hb.clear(); eb.clear(); });
let A = mkV('int'), B = mkV('learn'), t = 0;
const hb = K.buf(12), eb = K.buf(5);
K.loop(dt => {
  K.sub(dt, 0.005, h => {
    t += h; stepV(A, h, t, sW.v, 'ok'); stepV(B, h, t, sW.v, fs.v);
    [A, B].forEach(V => { if (Math.abs(V.x) > 6 || !isFinite(V.x)) Object.assign(V, mkV(V.mode)); });
    eb.push(t, A.e, B.e);
  });
  hb.push(t, A.e * 100, B.e * 100, B.F, A.fh, B.fh);
  const c = K.col(), a = cA.fit(), ctx = a.ctx, X0 = 30, X1 = a.w - 20, X = x => X0 + (x + 2.2) / 4.4 * (X1 - X0);
  const lanes = [a.h * 0.34, a.h * 0.76], xr = AMP * Math.sin(OM * t);
  for (let i = 0; i < 6; i++) { const y = a.h * (0.12 + 0.15 * i), ph = (t * (0.4 + sW.v * 0.08) + i * 0.37) % 1, x0 = X0 + ph * (X1 - X0) * 0.8; K.arrow(ctx, x0, y, x0 + 10 + sW.v * 2.5, y, c.line, 1.5); }
  [[A, '积分', c.warn], [B, '学习特征', c.acc]].forEach(([V, n, col], i) => {
    const y = lanes[i];
    ctx.strokeStyle = c.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(-2.2), y); ctx.lineTo(X(2.2), y); ctx.stroke();
    ctx.fillStyle = c.warn; ctx.beginPath(); ctx.arc(X(xr), y, 5, 0, 7); ctx.fill();
    K.drawQuad(ctx, X(V.x), y, Math.atan((V.u / MS) / K.g), 80, { color: col });
    K.text(ctx, n, 4, y - 18, col, '600 12px "Noto Sans SC", sans-serif');
  });
  const b = cB.fit(), W = K.win(t, 12);
  K.plot(b.ctx, 0, 0, b.w / 2, b.h, { title: '跟踪误差', unit: 'cm', x: W, y: [-30, 30], series: [{ buf: hb, i: 1, color: c.warn, label: '积分' }, { buf: hb, i: 2, color: c.acc, label: '学习特征' }], xfmt: x => x.toFixed(0) + 's' });
  K.plot(b.ctx, b.w / 2, 0, b.w / 2, b.h, { title: '风力', unit: 'N', x: W, y: [0, 14], series: [{ buf: hb, i: 3, color: c.ink, label: '真实' }, { buf: hb, i: 4, color: c.warn, label: '积分估计', dash: [5, 4] }, { buf: hb, i: 5, color: c.acc, label: '学习估计' }], xfmt: x => x.toFixed(0) + 's' });
  const n = eb.d.length || 1, rA = Math.sqrt(eb.d.reduce((s, p) => s + p[1] * p[1], 0) / n), rB = Math.sqrt(eb.d.reduce((s, p) => s + p[2] * p[2], 0) / n);
  ro.innerHTML = `<span>最近 5 秒误差 RMS：积分 <b class="${rA > rB * 1.5 ? 'hot' : ''}">${(rA * 100).toFixed(1)} cm</b></span><span>学习特征 <b class="${rB < rA ? 'good' : 'hot'}">${(rB * 100).toFixed(1)} cm</b></span><span>当前风力 <b>${B.F.toFixed(1)} N</b>，学习估计 <b>${B.fh.toFixed(1)} N</b></span>`;
});
K.box(d, 'assume', '<b>这个实验做了哪些简化：</b>只有水平一个方向，推力直接作用成水平力（略去姿态环，只保留 0.05 s 的一阶执行滞后）；风力是人为设定的 0.06·(风速 − 飞机速度)²，风始终比飞机快，所以它恰好等于特征 [1, v, v²] 乘三个系数——真实风力没有这么规整；“学好的特征”是直接给定的，没有真的跑 DAIML；在线部分用带遗忘的递推最小二乘（记忆约 1.5 s），只用力的预测误差，不是 Neural-Fly 的复合自适应律；加速度测量只加了白噪声，没有延迟和零偏；积分增益为示意值，没有专门整定。上面的“一步一步看”和对比图用同一个模型、固定随机种子离线算出。');

K.quiz(el.querySelector('#q14'), 'l14', [
  { q: 'Neural-Fly 飞行中实时更新的是哪一部分？', o: ['整个神经网络的全部权重', '只有线性系数 a；基函数 φ 离线学好后固定不变', '什么都不更新', '只更新 PID 增益'], a: 1,
    e: 'φ 离线用 DAIML 学好，描述力随状态变化的“形状”；飞行中只用复合自适应律更新 a，描述当前的风。' },
  { q: 'RMA 部署时，自适应模块在做什么？', o: ['在线做梯度下降，改策略网络的权重', '从最近的状态和动作历史推断环境编码 z，网络权重不变', '读取真实的摩擦系数', '每隔几秒重新训练一次策略'], a: 1,
    e: '自适应模块在阶段 2 被训练成“看历史、回归 z”。部署时它只是做前向计算，没有任何权重在变。' },
  { q: '实验里“正确特征 + 在线系数”为什么比积分好？', o: ['它的传感器更准', '风力随速度变化的那部分由特征承担，在线只需估同一风况下不变的几个系数，所以既能跟上随速度变的力，又不用等误差积累', '它的 PD 增益更大', '它事先知道风速'], a: 1,
    e: '积分只能补一个慢慢变化的平均力，飞机来回飞时风力随速度起伏，它跟不上。两架飞机的 PD 增益完全相同。' },
  { q: '把特征换成错的 [1, x]，会怎样？', o: ['在线系数会自动把它修正成对的', '无论系数怎么调都拟合不好随速度变化的力，误差回升——这叫模型失配', '误差变得比正确特征更小', '飞机立刻失控'], a: 1,
    e: '在线部分只能调系数，不能改特征本身。结构错了，再快的在线更新也只能拟合出一个“最不坏”的近似。' },
]);
} });
