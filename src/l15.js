K.add({ id: 'l15', num: 15, title: '世界模型与基于模型的强化学习', sub: '从数据学一个“会预测的模型”，再在它里面规划或练习', render(el) {
const S = K.S;

/*SIM15*/
const AM = K.g * Math.tan(K.rad(30)), U = 2 * AM, DT = 0.05, WALL = 3, KDR = 0.03, X0 = -6, XT = 2.7, HOR = 1.0;
const trueAcc = (v, u) => AM * Math.tanh(u / AM) - KDR * v * Math.abs(v);
/* R: random source (Math.random in the demo; a seeded one for the static figures) */
const gauss = R => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const seeded = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
function collect(N, frac, R) {
  R = R || Math.random; const D = []; let v = 0, u = 0;
  for (let i = 0; i < N; i++) {
    if (i % 6 === 0) u = (2 * R() - 1) * frac * U;
    const v1 = v + trueAcc(v, u) * DT;
    D.push([v + 0.02 * gauss(R), u, (v1 - v) / DT + 0.3 * gauss(R)]); v = v1;
  }
  return D;
}
function fit(D) {
  const M = [[1e-3, 0, 0], [0, 1e-3, 0]];
  for (const [v, u, y] of D) { const f = [v, u]; for (let i = 0; i < 2; i++) { M[i][2] += f[i] * y; for (let j = 0; j < 2; j++) M[i][j] += f[i] * f[j]; } }
  const det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
  return [(M[0][2] * M[1][1] - M[0][1] * M[1][2]) / det, (M[0][0] * M[1][2] - M[1][0] * M[0][2]) / det];
}
const mdlOf = th => (v, u) => th[0] * v + th[1] * u;
function roll(f, x, v, seq, n) { const out = []; for (let k = 0; k < n; k++) { v += f(v, seq[(k * 3 / n) | 0]) * DT; x += v * DT; out.push(x); } return out; }
const LV = 11, levels = Array.from({ length: LV }, (_, i) => -U + 2 * U * i / (LV - 1));
function plan(f, x0, v0) {
  const N = Math.round(HOR / DT); let best = 1e18, bs = null;
  for (const a1 of levels) for (const a2 of levels) for (const a3 of levels) {
    const s = [a1, a2, a3]; let x = x0, v = v0, J = 0, ok = true;
    for (let n = 0; n < N; n++) { const u = s[(n * 3 / N) | 0]; v += f(v, u) * DT; x += v * DT; J += ((x - XT) ** 2 + 0.002 * u * u) * DT; if (x > WALL - 0.03) { ok = false; break; } }
    if (!ok) continue; J += 0.6 * (x - XT) ** 2 + 0.15 * v * v;
    if (J < best) { best = J; bs = s; }
  }
  return bs || [-U, -U, -U];
}
function horizonErr(f, n, trials, R) {
  R = R || Math.random; const e = new Array(n).fill(0);
  for (let i = 0; i < trials; i++) {
    const v = (2 * R() - 1) * 8, s = [0, 1, 2].map(() => (2 * R() - 1) * U);
    const p = roll(f, 0, v, s, n), q = roll(trueAcc, 0, v, s, n);
    for (let k = 0; k < n; k++) e[k] += Math.abs(p[k] - q[k]) / trials;
  }
  return e;
}
function mkRun() { return { x: X0, v: 0, u: 0, seq: null, tp: 0, hit: false }; }
function stepRun(R, f, h) {
  if (R.hit) return;
  R.tp -= h; if (R.tp <= 1e-9) { R.seq = plan(f, R.x, R.v); R.u = R.seq[0]; R.tp = 0.1; }
  R.v += trueAcc(R.v, R.u) * h; R.x += R.v * h;
  if (R.x > WALL) { R.x = WALL; R.v = 0; R.hit = true; }
}
/*END15*/

/* plot-area mapping identical to K.S.plot, for shading and dots drawn on top of a plot */
const pmap = (X0p, Y0p, W, H, o) => { const pl = X0p + 44, pr = X0p + W - 8, pt = Y0p + 26, pb = Y0p + H - 26;
  return { pl, pr, pt, pb, sx: v => pl + (v - o.x[0]) / (o.x[1] - o.x[0]) * (pr - pl), sy: v => pb - (Math.max(o.y[0], Math.min(o.y[1], v)) - o.y[0]) / (o.y[1] - o.y[0]) * (pb - pt) }; };
const band = (m, a, b, cls) => `<rect x="${m.sx(a)}" y="${m.pt}" width="${m.sx(b) - m.sx(a)}" height="${m.pb - m.pt}" class="${cls || 'sv-fill-soft'}" opacity=".14"/>`;
const dot = (x, y, cls, r) => `<circle cx="${x}" cy="${y}" r="${r || 4.5}" class="${cls}"/>`;

/* ---------- static figures: the demo's own model, fitted on seeded data ---------- */
const thW = fit(collect(1000, 1, seeded(1))), thN = fit(collect(1000, 0.2, seeded(1)));
const fW = mdlOf(thW), fN = mdlOf(thN);
const NR = 30, BRK = [-U, -U, -U];
const rT = roll(trueAcc, 0, 6, BRK, NR), rW = roll(fW, 0, 6, BRK, NR), rN = roll(fN, 0, 6, BRK, NR);
const pts = r => [[0, 0]].concat(r.map((x, k) => [(k + 1) * DT, x]));
const NH = 40, eW = horizonErr(fW, NH, 300, seeded(2)), eN = horizonErr(fN, NH, 300, seeded(2));
const epts = e => e.map((x, k) => [(k + 1) * DT, x]);
const figRoll = S.svg(820, 250,
  S.plot(0, 0, 400, 250, { title: '同一串动作，往前推 1.5 s', x: [0, 1.5], y: [-4.5, 3.5], xu: 's', xt: [0, 0.5, 1, 1.5], yt: [-4, -2, 0, 2],
    series: [{ pts: pts(rT), c: 'warn', dash: 1, label: '真实' }, { pts: pts(rW), c: 'acc', label: '宽数据' }, { pts: pts(rN), c: 'bad', label: '窄数据' }] }) +
  S.plot(420, 0, 400, 250, { title: '平均预测误差（m）', x: [0, 2], y: [0, 4], xu: 's', yt: [0, 1, 2, 3, 4],
    series: [{ pts: epts(eW), c: 'acc', label: '宽数据' }, { pts: epts(eN), c: 'bad', label: '窄数据' }] }),
  '模型往前预测越久，和真实差得越多');

/* coverage: acceleration vs action at v = 0, and closed-loop MPC runs on the true plant */
const uu = Array.from({ length: 61 }, (_, i) => -U + 2 * U * i / 60);
const oA = { x: [-U, U], y: [-12, 12] }, mA = pmap(0, 0, 400, 250, oA);
const runOf = f => { const R = mkRun(), out = [[0, R.x]]; for (let i = 1; i <= 700; i++) { stepRun(R, f, 0.01); if (i % 5 === 0) out.push([i * 0.01, R.x]); } return { out, hit: R.hit }; };
const runW = runOf(fW), runN = runOf(fN);
const figCov = S.svg(820, 250,
  S.plot(0, 0, 400, 250, { title: '速度为 0 时：动作 → 加速度', x: oA.x, y: oA.y, xt: [-10, -5, 0, 5, 10], yt: [-10, -5, 0, 5, 10],
    series: [{ pts: uu.map(u => [u, trueAcc(0, u)]), c: 'warn', dash: 1, label: '真实' }, { pts: uu.map(u => [u, fW(0, u)]), c: 'acc', label: '宽数据' }, { pts: uu.map(u => [u, fN(0, u)]), c: 'bad', label: '窄数据' }] }) +
  band(mA, -0.2 * U, 0.2 * U) +
  S.text(mA.sx(0), mA.pt + 16, '窄数据只在灰色这段', 'sv-s') +
  dot(mA.sx(-U), mA.sy(fN(0, -U)), 'sv-fill-bad') + dot(mA.sx(-U), mA.sy(trueAcc(0, -U)), 'sv-fill-warn') +
  S.text(mA.pl + 8, mA.sy(8.5), '满刹车（最左端）：', 'sv-s', 'start') +
  S.text(mA.pl + 8, mA.sy(6), '窄数据模型以为 ' + fN(0, -U).toFixed(1), 'sv-s bad', 'start') +
  S.text(mA.pl + 8, mA.sy(3.5), '真实只有 ' + trueAcc(0, -U).toFixed(1), 'sv-s warn', 'start') +
  S.plot(420, 0, 400, 250, { title: 'MPC 用学到的模型去停车（位置 m）', x: [0, 7], y: [-6.5, 4], xu: 's', yt: [-6, -3, 0, 3], hl: [{ v: WALL, c: 'bad', label: '墙' }],
    series: [{ pts: runW.out, c: 'acc', label: '宽数据' }, { pts: runN.out, c: 'bad', label: '窄数据' }] }),
  '数据没覆盖到的地方，模型在瞎猜；规划器恰好会去那里');

/* ---------- walkthrough: fit a tiny world model with four records ---------- */
const REC = [[0, 2], [2, -3], [-3, 1], [4, 3]].map(([v, u]) => [v, u, trueAcc(v, u)]);
const thE = fit(REC), fE = mdlOf(thE);
const f2 = x => (x < 0 ? '−' : '') + Math.abs(x).toFixed(2), f1 = x => (x < 0 ? '−' : '') + Math.abs(x).toFixed(1);
function recTable(withPred) {
  const cols = withPred ? [70, 190, 310, 450, 600, 730] : [110, 270, 430, 610];
  const head = ['记录', '速度 v', '动作 u', '测到的加速度'].concat(withPred ? ['模型预测', '差'] : []);
  let b = head.map((h, i) => S.text(cols[i], 30, h, 'sv-t')).join('') + `<line x1="20" y1="42" x2="800" y2="42" class="sv-l-grid" style="stroke-width:1.5"/>`;
  REC.forEach((r, k) => {
    const y = 72 + k * 32, p = fE(r[0], r[1]);
    const cells = [String(k + 1), f1(r[0]), f1(r[1]), f2(r[2])].concat(withPred ? [f2(p), (p - r[2] >= 0 ? '+' : '−') + Math.abs(p - r[2]).toFixed(2)] : []);
    b += cells.map((c, i) => S.text(cols[i], y, c, i === 3 ? 'sv-nw' : i === 4 ? 'sv-n' : i === 5 ? 'sv-s' : 'sv-s')).join('');
  });
  b += S.text(410, 196, '单位：速度 m/s；动作 = 想要的加速度、加速度都是 m/s²', 'sv-s');
  return S.svg(820, 206, b, '四条飞行记录');
}
const stepFit = S.svg(820, 206,
  S.text(410, 50, '加速度 ≈ c₁ × 速度 + c₂ × 动作', 'sv-big') +
  S.text(410, 90, '最小二乘：挑 c₁、c₂，让 4 条记录里“预测 − 测到”的平方和最小', 'sv-s') +
  S.box(200, 112, 190, 62, 'c₁ = ' + f2(thE[0]), '速度带来的阻力', 'hl') +
  S.box(430, 112, 190, 62, 'c₂ = ' + f2(thE[1]), '动作的效果', 'hl'), '拟合结果');
const oX = { x: [-U, U], y: [-12, 12] }, mX = pmap(0, 0, 820, 230, oX);
const stepOut = S.svg(820, 230,
  S.plot(0, 0, 820, 230, { title: '速度为 0 时：动作 → 加速度', x: oX.x, y: oX.y, xt: [-10, -5, 0, 5, 10], yt: [-10, -5, 0, 5, 10],
    series: [{ pts: uu.map(u => [u, trueAcc(0, u)]), c: 'warn', dash: 1, label: '真实' }, { pts: uu.map(u => [u, fE(0, u)]), c: 'acc', label: '学到的直线' }] }) +
  band(mX, -3, 3) +
  REC.map(r => dot(mX.sx(r[1]), mX.sy(r[2]), 'sv-fill-ink', 4)).join('') + S.text(mX.sx(0), mX.pb - 8, '4 条记录都在这一段', 'sv-s') +
  dot(mX.sx(-U), mX.sy(fE(0, -U)), 'sv-fill-acc') + S.text(mX.sx(-U) + 10, mX.sy(fE(0, -U)) + 4, '模型：' + f1(fE(0, -U)) + ' m/s²', 'sv-n', 'start') +
  dot(mX.sx(-U), mX.sy(trueAcc(0, -U)), 'sv-fill-warn') + S.text(mX.sx(-U) + 10, mX.sy(trueAcc(0, -U)) + 4, '真实：' + f1(trueAcc(0, -U)) + ' m/s²', 'sv-nw', 'start'),
  '在数据之外，直线和真实曲线分开');
const stopDist = F => { let x = 0, v = 6; while (v > 0) { v += F(v, -U) * DT; x += v * DT; } return x; };
const dM = stopDist(fE), dT = stopDist(trueAcc), SX = x => 80 + x / 3.4 * 660;
const stepStop = S.svg(820, 170,
  `<line x1="${SX(0)}" y1="90" x2="${SX(3.3)}" y2="90" class="sv-l-ink" style="stroke-width:2"/>` +
  `<rect x="${SX(WALL)}" y="40" width="10" height="90" class="sv-fill-soft"/>` + S.text(SX(WALL) + 5, 150, '墙 3 m', 'sv-s') +
  S.quad(SX(0), 84, 0, 26, {}) + S.text(SX(0), 130, '6 m/s，开始满力刹车', 'sv-s') +
  `<line x1="${SX(dM)}" y1="60" x2="${SX(dM)}" y2="120" class="sv-l-acc" style="stroke-width:3"/>` + S.text(SX(dM), 50, '模型以为停在 ' + dM.toFixed(1) + ' m', 'sv-n') +
  `<line x1="${SX(dT)}" y1="60" x2="${SX(dT)}" y2="120" class="sv-l-warn" style="stroke-width:3"/>` + S.text(SX(dT) - 6, 140, '实际停在 ' + dT.toFixed(1) + ' m', 'sv-nw', 'end'),
  '刹车距离：模型和真实');

el.innerHTML = `
<p class="lede"><a href="#l8">第 9 课</a>的 MPC 用人写的物理公式当模型。把这个模型换成<b>从飞行数据里学出来的</b>，就叫<span class="term">世界模型</span>：控制器先在“脑子里”试动作，再决定真的怎么做。</p>

<h2>先学模型，再在模型里想</h2>
${K.fig(S.svg(820, 262,
  S.box(10, 90, 140, 76, '真实飞机', '（或仿真器）') + S.box(220, 90, 150, 76, '数据', '(状态, 动作, 下一状态)') +
  S.box(440, 90, 150, 76, '世界模型 fθ', '预测下一拍', 'hl') + S.box(660, 90, 150, 76, '在模型里想象', '试很多串动作', 'hl') +
  S.arrow(150, 128, 218, 128, { label: '记录' }) + S.arrow(370, 128, 438, 128, { label: '拟合' }) + S.arrow(590, 128, 658, 128, { c: 'acc', label: '问模型' }) +
  S.path([[735, 168], [735, 222], [80, 222], [80, 170]], { c: 'acc', label: '挑出的动作去真飞（规划），或用想象的轨迹练策略', lx: 410, ly: 246 }) +
  S.text(515, 46, '第 9 课：这个方框是人写的公式', 'sv-s b') + S.text(515, 68, '本课：从数据学出来', 'sv-s acc'),
  '学模型、在模型里想象、再去真飞的循环'),
  'ŝ<sub>k+1</sub> = f<sub>θ</sub>(s<sub>k</sub>, a<sub>k</sub>)：现在这样做，下一拍会怎样。用它的强化学习叫<span class="term">基于模型的强化学习</span>（MBRL），好处是省数据：模型能“想象”出很多条练习。')}
<div class="tblwrap"><table class="tbl">
<tr><th>和前面的课</th><th>模型从哪来</th><th>怎么用</th></tr>
<tr><td>第 9 课 <a href="#l8">MPC</a></td><td>人写的物理公式</td><td>在模型里试动作串，执行第一步</td></tr>
<tr><td>第 13 课 <a href="#l13">PPO</a></td><td>不要模型（无模型）</td><td>直接试错改策略</td></tr>
<tr><td>本课</td><td>从数据学</td><td>拿来规划，或在想象中练策略</td></tr>
</table></div>
${K.more('展开：三种用法和代表工作', `<div class="tblwrap"><table class="tbl">
<tr><th>用法</th><th>怎么做</th><th>代表工作</th></tr>
<tr><td><b>拿来规划</b></td><td>像第 9 课的 MPC：在模型里试很多串动作，挑最好的，只执行第一步</td><td>PETS（Chua 等，NeurIPS 2018）：多个概率神经网络组成集成作模型，采样式 MPC 规划</td></tr>
<tr><td><b>在想象中练策略</b></td><td>让策略在模型里“做梦”，用想象出来的轨迹训练策略，真飞时直接用策略</td><td>Dreamer（Hafner 等，ICLR 2020）：在学到的隐空间里想象，actor-critic 沿模型反传梯度来学；DreamerV3（Nature 2025）用一套固定超参数跑了 150 多个任务</td></tr>
<tr><td><b>两者结合</b></td><td>短时域规划 + 学到的价值函数估计“时域之后还能拿多少分”</td><td>TD-MPC（Hansen、Wang、Su，ICML 2022）；TD-MPC2（Hansen、Su、Wang，ICLR 2024）把它扩展到多任务、更大模型</td></tr>
</table></div>
<p>f<sub>θ</sub> 通常是神经网络，θ 用记录下来的（状态，动作，下一状态）数据拟合；很多方法还让它同时预测奖励。TD-MPC 的模型不去重建完整观测，只在一个隐空间（latent space）里预测对控制有用的量（下一隐状态、奖励、价值）。Dreamer 最初是从图像学习的，所以它的模型带一个能重建图像的解码器。</p>`)}

<h2>一步一步：拟合一个最小的世界模型</h2>
<div id="walk15"></div>

<h2>坑一：预测越远，错得越多</h2>
${K.fig(figRoll, `下面实验的模型，用“宽数据”（动作覆盖全范围）和“窄数据”（只有 20% 以内的小动作）各拟合一次。<b>左</b>：从 6 m/s 一直满力刹车，窄数据模型 0.5 s 时差 ${(rT[9] - rN[9]).toFixed(1)} m，1.5 s 时差 ${(rT[NR - 1] - rN[NR - 1]).toFixed(1)} m：每步的预测又是下一步的输入，错误越叠越大。<b>右</b>：平均情况也一样。所以这类方法大多只往前想很短一段。`)}

<h2>坑二、三：数据覆盖不到的地方，规划器偏要去</h2>
${K.fig(figCov, `<b>左</b>：真实飞机满动作时饱和（橙色弯下来），窄数据模型只见过灰色那段，把直线外推了出去。<b>右</b>：MPC 只认模型的分数，偏偏挑中模型最乐观的满刹车：窄数据版本晚刹车，${runN.hit ? '撞墙' : '冲到墙边'}；宽数据版本${runW.hit ? '也撞了' : '停住了'}。`)}
${K.more(K.ours('', '展开：怎么防这些坑'), `<ul>
<li><b>误差累积</b>：MBPO（Janner 等，NeurIPS 2019）专门讨论“该信模型多远”；TD-MPC 用价值函数代替更远的预测。${K.ours('', `常见的自检是分别报告 1 步和多步的预测误差，并和“速度不变”的朴素预测作对照。`)}</li>
<li><b>钻空子</b>：用模型集成估计不确定性；用当前策略不断采新数据、重新拟合模型。${K.ours('')}</li>
<li><b>数据覆盖</b>：模型只在见过数据的地方可靠；数据里没有大动作、高速度，模型在那里就是瞎猜。三个坑连在一起：覆盖不到的地方模型最容易错，规划器往往恰好被吸引到那里，而远处的预测本来就累积了误差。</li>
</ul>${K.ours('', `
<p>还有一类做法让策略直接在可微的世界模型里学：在短的想象轨迹上沿模型反传梯度，例如 <span class="term">SuperMimic</span>（Liao 等，arXiv 2026，用在人形机器人上）。</p>`)}`)}

<div id="d15"></div>

<div class="key"><h3>这一课记住三件事</h3><ul>
<li>世界模型 = 从数据学到的“下一拍会怎样”的预测器；可以拿来规划（MPC），也可以在里面练策略（想象）。</li>
<li>误差随预测步数累积，所以想象和规划通常只看短的一段，远处交给价值函数。</li>
<li>优化器会钻模型的空子，而模型在数据覆盖不到的地方最不可信。</li>
</ul></div>
<h2>小测验</h2><div id="q15"></div>`;

K.steps(el.querySelector('#walk15'), { title: '用 4 条记录学“加速度 ≈ c₁·速度 + c₂·动作”', steps: [
  { svg: recTable(false), t: '<b>采数据</b>：飞一会儿，记下 4 个时刻的速度、给的动作和测到的加速度。动作都不大（|u| ≤ 3）。' },
  { svg: stepFit, t: `<b>拟合</b>：模型只有两个数。最小二乘给出 c₁ = <b>${f2(thE[0])}</b>（速度越快，阻力越往回拉），c₂ = <b>${f2(thE[1])}</b>（给 1 份动作，得到约 0.9 份加速度）。` },
  { svg: recTable(true), t: '<b>在数据上检查</b>：4 条记录的预测和实测最多差 0.11 m/s²。在见过的范围里，这个模型很好用。' },
  { svg: stepOut, t: `<b>用到数据之外</b>：满力刹车 u = ${f1(-U)} 时，模型说加速度 <b>${f1(fE(0, -U))}</b>，真实飞机已经饱和，只有 <b>${f1(trueAcc(0, -U))}</b>。模型以为刹车比实际猛将近一倍。` },
  { svg: stepStop, t: `<b>后果</b>：从 6 m/s 满力刹车，模型以为 <b>${dM.toFixed(1)} m</b> 就能停住，实际要 <b>${dT.toFixed(1)} m</b>。信这个模型的 MPC 会等到离墙很近才刹车，于是撞墙。下面的实验就是这件事。` },
] });

const d = K.demo(el.querySelector('#d15'), '动手', '用学来的模型靠墙停车',
  '第 9 课的靠墙停车，模型换成学出来的直线。① 默认能停住吗（偶尔也会撞）？② “数据范围”拖到 20%，点“重新采集并拟合”：红点（用的动作）还在灰点（数据）里吗？③ 数据量拖到 20 再试。④ 切到“真实模型”对照。');
const cA = K.canvas(d, 0.24, 160), cB = K.canvas(d, 0.36, 210);
const ctl = K.box(d, 'controls'), ro = K.box(d, 'readout');
const sN = K.slider(ctl, { id: 'l15-n', label: '数据量（样本数）', min: 20, max: 2000, step: 20, value: 1000 });
const sR = K.slider(ctl, { id: 'l15-r', label: '数据范围（占最大动作的比例）', min: 10, max: 100, step: 5, value: 100, fmt: v => v + '%' });
const mm = K.seg(ctl, { label: 'MPC 用的模型', options: [['learn', '学到的'], ['true', '真实模型（对照）']], value: 'learn', on: () => { R = mkRun(); t = 0; hb.clear(); } });
const br = K.box(ctl, 'btnrow');
K.btn(br, '重新采集并拟合', refit, 'primary');
K.btn(br, '重新出发', () => { R = mkRun(); t = 0; hb.clear(); });
let D, th, f, R, t = 0, hits = 0, runs = 0, eh = [];
const hb = K.buf(8), useF = () => mm.v === 'true' ? trueAcc : f;
function refit() {
  D = collect(sN.v, sR.v / 100); th = fit(D); f = mdlOf(th);
  eh = horizonErr(f, NH, 300); R = mkRun(); t = 0; hb.clear();
}
refit();
K.loop(dt => {
  K.sub(dt, 0.01, h => {
    t += h; const was = R.hit; stepRun(R, useF(), h); if (R.hit && !was) hits++;
    if (t > 7) { runs++; R = mkRun(); t = 0; hb.clear(); }
  });
  hb.push(t, R.x);
  const c = K.col(), a = cA.fit(), ctx = a.ctx, XA = 30, XB = a.w - 30, X = x => XA + (x - X0 + 0.3) / (WALL - X0 + 0.6) * (XB - XA), y = a.h * 0.55;
  ctx.fillStyle = c.soft; ctx.fillRect(X(WALL), 10, 6, a.h - 20); K.text(ctx, '墙', X(WALL) + 10, a.h - 8, c.soft);
  ctx.strokeStyle = c.bad; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(XT), y - 26); ctx.lineTo(X(XT), y + 26); ctx.stroke();
  ctx.strokeStyle = c.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(X0 - 0.3), y); ctx.lineTo(X(WALL), y); ctx.stroke();
  if (R.seq) {
    const n = Math.round(HOR / DT), p = roll(useF(), R.x, R.v, R.seq, n), q = roll(trueAcc, R.x, R.v, R.seq, n);
    for (let k = 1; k < n; k += 2) {
      ctx.fillStyle = c.acc; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(X(Math.min(p[k], WALL + 0.3)), y - 14, 3, 0, 7); ctx.fill();
      ctx.strokeStyle = c.warn; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(X(Math.min(q[k], WALL + 0.3)), y + 14, 3, 0, 7); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  K.drawQuad(ctx, X(R.x), y, Math.atan(trueAcc(0, R.u) / K.g), 70, { color: c.ink });
  K.text(ctx, '上排实心点：模型预测的未来 1 s　下排空心圈：同样的动作在真实飞机上会怎样', 8, 16, c.soft);
  if (R.hit) K.text(ctx, '撞墙', X(WALL) - 8, y - 30, c.bad, '600 13px "Noto Sans SC", sans-serif', 'right');
  const b = cB.fit(), w2 = b.w / 2;
  const P = K.plot(b.ctx, 0, 0, w2, b.h, { title: '数据覆盖：横轴速度 m/s，纵轴动作', x: [-10, 10], y: [-U, U], xfmt: v => v.toFixed(0) });
  b.ctx.save(); b.ctx.fillStyle = c.soft; b.ctx.globalAlpha = 0.5;
  for (let i = 0; i < D.length; i += Math.ceil(D.length / 600)) { b.ctx.fillRect(P.X(K.clamp(D[i][0], -10, 10)) - 1, P.Y(D[i][1]) - 1, 2.5, 2.5); }
  b.ctx.globalAlpha = 1; b.ctx.fillStyle = c.bad; b.ctx.beginPath(); b.ctx.arc(P.X(K.clamp(R.v, -10, 10)), P.Y(R.u), 5, 0, 7); b.ctx.fill(); b.ctx.restore();
  const em = Math.max(0.5, ...eh);
  K.plot(b.ctx, w2, 0, w2, b.h, { title: '预测误差随预测时长', unit: 'm', x: [0, NH * DT], y: [0, Math.ceil(em * 2) / 2], series: [{ pts: eh.map((e, k) => [(k + 1) * DT, e]), color: c.acc, label: '学到的模型' }], xfmt: v => v.toFixed(1) + 's' });
  ro.innerHTML = `<span>撞墙 <b class="${hits ? 'hot' : ''}">${hits}</b> 次 / 已飞 ${runs + 1} 趟</span><span>模型认为的动作效果 c₂ = <b>${th[1].toFixed(2)}</b>（真实：小动作 1.00，满动作约 ${(AM * Math.tanh(U / AM) / U).toFixed(2)}）</span><span>预测 0.5 s / 2 s 的平均误差 <b>${eh[9].toFixed(2)} / ${eh[NH - 1].toFixed(2)} m</b></span>`;
});
K.box(d, 'assume', '<b>这个实验（和上面的图）做了哪些简化：</b>只有水平一个方向，没有姿态环和电机滞后，动作直接是“想要的加速度”；“真实飞机”本身是人为设定的玩具模型（满动作附近 tanh 饱和 + 二次阻力 0.03·v|v|）；世界模型是对特征 [速度, 动作] 的线性最小二乘，不是神经网络，位置由速度积分得到、不需要学；数据是随机动作（每 0.3 s 换一次）下的一段连续飞行，带少量测量噪声（上面的静态图用固定随机种子，一步一步看里的 4 条记录不带噪声）；MPC 沿用第 9 课的穷举（11³ 串三段常值动作，看 1 s，每 0.1 s 重算），没有集成、不确定性估计，也不会边飞边补数据；预测误差曲线在随机速度和随机动作上统计，代表的是全范围的平均情况。');

K.quiz(el.querySelector('#q15'), 'l15', [
  { q: '世界模型是什么？', o: ['一张环境地图', '从数据学到的预测器：给定当前状态和动作，预测下一拍的状态（常常还有奖励）', '物理引擎的源代码', '策略网络的另一个名字'], a: 1,
    e: '它回答“如果我现在这样做，下一拍会怎样”。有了它，就能在里面规划，或者让策略在里面练习。' },
  { q: '模型往前预测的步数越多，误差通常会怎样？', o: ['越来越小', '越来越大，因为每一步的预测又成了下一步的输入，误差一步步叠加', '始终不变', '和步数无关，只和数据量有关'], a: 1,
    e: '这叫误差累积（compounding error）。所以 Dreamer、SuperMimic 只想象短的一段，TD-MPC 用价值函数代替更远的预测。' },
  { q: '只用小动作的数据拟合模型后，MPC 撞了墙。最根本的原因是？', o: ['MPC 的优化算错了', '模型在数据之外是错的（以为大动作刹车更猛），而规划器恰好挑中了这些模型最乐观的动作', '墙的位置变了', '数据太多导致过拟合'], a: 1,
    e: '一步一步看里：模型以为满刹车有 10.3 m/s²，真实飞机饱和后只有 5.5。优化器只认模型的分数，于是被吸引到模型最乐观、也最不可信的地方：数据覆盖和“钻空子”两个坑同时出现。' },
  { q: 'TD-MPC 怎么弥补“只往前规划很短一段”？', o: ['把预测时域设成无穷长', '短时域规划，时域之后的回报用学到的价值函数来估计', '完全不规划，只用策略', '改用 PID'], a: 1,
    e: '近处靠模型逐步预测，远处交给价值函数，这样既避开了长时域的误差累积，又不至于短视。' },
]);
} });
