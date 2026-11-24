K.add({ id: 'l8', num: 9, title: '模型预测控制 MPC', sub: '先预测未来几秒，再挑最好的一串动作', render(el) {
const S = K.S;

/* ---------- the demo's planner (shared by the figures, the walkthrough and the live demo) ---------- */
const WALL = 3, AM = K.g * Math.tan(K.rad(30)), TAU = 0.12, LV = 11, NSEG = 3, NSTEP = 30;
const levels = Array.from({ length: LV }, (_, i) => -AM + 2 * AM * i / (LV - 1));
const degOf = u => K.deg(Math.atan(u / K.g));
/* roll one candidate (3 piecewise-constant tilt commands over horizon H) forward with the model; cost J, ok = no wall */
function roll(s, u, H, xt, keep) {
  const h = H / NSTEP; let x = s.x, v = s.v, a = s.a, J = 0, ok = true; const pts = keep ? [[0, x]] : null;
  for (let n = 0; n < NSTEP; n++) {
    const uc = u[(n * NSEG / NSTEP) | 0]; a += (uc - a) * h / TAU; v += a * h; x += v * h;
    if (keep) pts.push([(n + 1) * h, x]);
    J += ((x - xt) ** 2 + 0.002 * uc * uc) * h;
    if (x > WALL - 0.03) { ok = false; break; }
  }
  if (ok) J += 0.6 * (x - xt) ** 2 + 0.15 * v * v;
  return { J, ok, pts, x, v };
}
function planner(s, H, xt) {
  let best = 1e18, bu = -AM, bp = null, crash = 0;
  for (let i = 0; i < LV; i++) for (let j = 0; j < LV; j++) for (let k = 0; k < LV; k++) {
    const u = [levels[i], levels[j], levels[k]], r = roll(s, u, H, xt, false);
    if (!r.ok) { crash++; continue; }
    if (r.J < best) { best = r.J; bu = u[0]; bp = u; }
  }
  return { bu, bp, best, crash };
}
/* closed loop as in the demo: replan every 0.1 s, plant step 5 ms; gain = 1/1.4 when the model is wrong */
function fly(o) {
  const s = { x: 0, v: 0, a: 0 }, tr = [], plans = []; let mt = 0, u = 0, hit = false, xmax = 0, tHit = null;
  for (let k = 0; k < 6 / 0.005; k++) {
    const t = k * 0.005;
    if (o.pd) u = K.clamp(o.pd * (o.xt - s.x) - 0.9 * Math.sqrt(o.pd) * s.v, -AM, AM);
    else { mt -= 0.005; if (mt <= 0) { const p = planner(s, o.H, o.xt); u = p.bu; plans.push({ t, s: { ...s }, p }); mt = 0.1; } }
    s.a += (u * (o.wrong ? 1 / 1.4 : 1) - s.a) * 0.005 / TAU; s.v += s.a * 0.005; s.x += s.v * 0.005;
    if (s.x > WALL) { s.x = WALL; s.v = 0; s.a = 0; hit = true; if (tHit == null) tHit = t; }
    xmax = Math.max(xmax, s.x);
    if (k % 8 === 0) tr.push([t, s.x]);
  }
  return { tr, plans, hit, x: s.x, xmax, tHit };
}
const XT = 2.8, H0 = 1.5;
const f2 = (v, d) => v.toFixed(d == null ? 2 : d);
const dg = u => f2(degOf(u), 0) + '°';
const seq = u => u.map(dg).join(' / ');

/* ---------- figure: the receding-horizon loop ---------- */
const figLoop = S.svg(820, 250,
  S.box(20, 90, 140, 70, '① 测状态', '位置、速度', '') +
  S.box(210, 20, 170, 70, '② 预测', '每串动作的未来', 'hl') +
  S.box(430, 20, 170, 70, '③ 打分', '误差² + 动作²', 'hl') +
  S.box(650, 90, 150, 70, '④ 挑最好的一串', '不撞墙且总分最低', 'hl') +
  S.box(330, 170, 200, 70, '⑤ 只执行第一小段', '0.1 秒后就扔掉其余', 'px') +
  S.arrow(160, 110, 208, 70, { c: 'acc' }) + S.arrow(380, 55, 428, 55, { c: 'acc' }) + S.arrow(600, 70, 648, 108, { c: 'acc' }) +
  S.arrow(700, 160, 532, 205, { c: 'warn' }) + S.arrow(328, 205, 120, 162, { c: 'warn', label: '下一刻从头再来', side: 'below' }),
  '滚动时域：测状态、预测、打分、挑最好、只执行第一小段，然后重来');

/* ---------- walkthrough: the demo's own planner from the start state, horizon 1.5 s ---------- */
const s0 = { x: 0, v: 0, a: 0 }, P0 = planner(s0, H0, XT);
const FL = fly({ H: H0, xt: XT });
const pl1 = FL.plans[1], pl10 = FL.plans[10];
const iu = idx => idx.map(i => levels[i]);
const CANDS = [[10, 10, 10], [10, 5, 5], [10, 5, 0], [10, 0, 0], [7, 5, 5], [5, 5, 5]].map(c => { const u = iu(c); return { u, r: roll(s0, u, H0, XT, true) }; });
const bestIdx = CANDS.findIndex(c => c.u.every((v, i) => v === P0.bp[i]));
/* plot frame shared by the walkthrough panels */
const PW = 560, PH = 250, pl = 44, pr = PW - 8, pt = 26, pb = PH - 26;
function frame(t0, title) {
  const X = t => pl + (t - t0) / 1.6 * (pr - pl), Y = x => pb - (Math.max(-0.2, Math.min(3.3, x)) + 0.2) / 3.5 * (pb - pt);
  const b = S.plot(0, 0, PW, PH, { title, x: [t0, t0 + 1.6], y: [-0.2, 3.3], xu: 's', yt: [0, 1, 2, 3], hl: [{ v: WALL, c: 'bad', label: '墙 3 m' }, { v: XT, c: 'warn' }] }) + S.text(pl + 6, Y(XT) + 16, '目标 2.8 m', 'sv-s warn', 'start');
  return { X, Y, b };
}
const line = (F, t0, pts, c, o) => `<polyline points="${pts.map(p => F.X(t0 + p[0]).toFixed(1) + ',' + F.Y(p[1]).toFixed(1)).join(' ')}" class="sv-l-${c}"${o && o.dash ? ' stroke-dasharray="5 4"' : ''}${o && o.op ? ` opacity="${o.op}"` : ''}${o && o.w ? ` style="stroke-width:${o.w}"` : ''}/>`;
const cross = (x, y) => `<path d="M${x - 5} ${y - 5} L${x + 5} ${y + 5} M${x - 5} ${y + 5} L${x + 5} ${y - 5}" class="sv-l-bad" style="stroke-width:2.4"/>`;
function candFig(mode) {
  const F = frame(0, '6 种候选未来（位置 m）');
  let b = F.b, side = S.text(PW + 20, 34, '候选（三段倾角）    代价', 'sv-s', 'start');
  CANDS.forEach((c, i) => {
    const isBest = i === bestIdx, col = !c.r.ok ? 'bad' : (mode === 2 && isBest ? 'acc' : mode === 2 ? 'soft' : 'b'), op = mode === 2 && !isBest ? 0.45 : 1;
    b += line(F, 0, c.r.pts, col, { op, w: isBest && mode === 2 ? 3.4 : null });
    const e = c.r.pts[c.r.pts.length - 1];
    if (!c.r.ok) b += cross(F.X(e[0]), F.Y(e[1]));
    b += S.text(F.X(e[0]) + (c.r.ok ? 8 : -10), F.Y(e[1]) + (c.r.ok ? 4 : -10) + (i === 1 ? 14 : 0), String.fromCharCode(65 + i), 'sv-t', c.r.ok ? 'start' : 'end');
    const y = 62 + i * 30, cls = !c.r.ok ? 'sv-s bad' : (mode === 2 && isBest ? 'sv-n' : 'sv-s');
    side += S.text(PW + 20, y, String.fromCharCode(65 + i) + '  ' + seq(c.u), cls, 'start') + S.text(810, y, c.r.ok ? f2(c.r.J) : '撞墙 ✗', cls, 'end');
  });
  side += S.text(PW + 20, 62 + 6 * 30 + 4, mode === 2 ? `1331 种里 ${P0.crash} 种撞墙，直接排除` : '每段 0.5 s，倾角 −30° 到 30°', mode === 2 ? 'sv-s bad' : 'sv-s', 'start');
  return S.svg(820, PH, b + side, '候选未来和它们的代价');
}
function setupFig() {
  let b = `<rect x="560" y="40" width="8" height="140" class="sv-fill-soft"/>` + S.text(564, 30, '墙 3 m', 'sv-s') +
    `<line x1="40" y1="150" x2="560" y2="150" class="sv-l-grid"/>` + `<line x1="528" y1="110" x2="528" y2="170" class="sv-l-warn" style="stroke-width:2"/>` + S.text(528, 190, '目标 2.8 m', 'sv-s warn') +
    S.quad(48, 140, 0, 30, {}) + S.text(48, 190, '现在 0 m，静止', 'sv-s');
  b += S.text(620, 40, '动作菜单（倾角上限 30°）', 'sv-t', 'start');
  levels.forEach((u, i) => { const x = 620 + i * 18; b += `<line x1="${x}" y1="${120 - u * 9}" x2="${x}" y2="120" class="sv-l-acc" style="stroke-width:6"/>`; });
  b += `<line x1="612" y1="120" x2="808" y2="120" class="sv-l-soft"/>` + S.text(620, 190, '−30°', 'sv-s') + S.text(710, 190, '0°', 'sv-s') + S.text(800, 190, '30°', 'sv-s');
  b += S.text(300, 40, `11 档 × 3 段 = 11³ = ${LV ** 3} 种动作串`, 'sv-n') + S.text(300, 64, '每串往前推演 1.5 秒', 'sv-s');
  return S.svg(820, 210, b, 'MPC 的起点和动作菜单');
}
function execFig() {
  const F = frame(0, '只执行第一小段（位置 m）'); const best = CANDS[bestIdx].r.pts;
  let b = F.b + line(F, 0, best, 'acc', { dash: 1, op: 0.6 }) + line(F, 0, best.filter(p => p[0] <= 0.1 + 1e-9), 'acc', { w: 6 });
  b += `<line x1="${F.X(0.1)}" y1="${pt}" x2="${F.X(0.1)}" y2="${pb}" class="sv-l-warn" stroke-dasharray="4 3"/>` + S.text(F.X(0.1) + 6, pt + 16, '0.1 s', 'sv-s warn', 'start');
  const s = pl1.s;
  const side = S.text(PW + 20, 50, '执行 0.1 s 以后：', 'sv-t', 'start') + S.text(PW + 20, 80, '位置 ' + f2(s.x, 3) + ' m', 'sv-n', 'start') + S.text(PW + 20, 104, '速度 ' + f2(s.v) + ' m/s', 'sv-n', 'start') +
    S.text(PW + 20, 128, '加速度 ' + f2(s.a) + ' m/s²', 'sv-n', 'start') + S.text(PW + 20, 170, '虚线部分不执行，', 'sv-s', 'start') + S.text(PW + 20, 190, '下一刻重新算', 'sv-s', 'start');
  return S.svg(820, PH, b + side, '只执行第一小段');
}
function replanFig(P, oldP, title, note) {
  const F = frame(P.t, title);
  let b = F.b;
  if (oldP) { const r = roll(oldP.s, oldP.p.bp, H0, XT, true); b += line(F, oldP.t, r.pts.filter(p => p[0] + oldP.t >= P.t - 1e-9), 'soft', { dash: 1 }); }
  [[5, 5, 5], [0, 0, 0]].forEach(c => { const r = roll(P.s, iu(c), H0, XT, true); if (!r.ok) { b += line(F, P.t, r.pts, 'bad', { op: 0.6 }); const e = r.pts[r.pts.length - 1]; b += cross(F.X(P.t + e[0]), F.Y(e[1])); } });
  const r = roll(P.s, P.p.bp, H0, XT, true);
  b += line(F, P.t, r.pts, 'acc', { w: 3.2 }) + `<circle cx="${F.X(P.t)}" cy="${F.Y(P.s.x)}" r="5" class="sv-fill-acc"/>`;
  const side = S.text(PW + 20, 40, `t = ${f2(P.t, 1)} s 的状态`, 'sv-t', 'start') + S.text(PW + 20, 66, '位置 ' + f2(P.s.x) + ' m，速度 ' + f2(P.s.v) + ' m/s', 'sv-s', 'start') +
    S.text(PW + 20, 104, '新的最好一串：', 'sv-t', 'start') + S.text(PW + 20, 128, seq(P.p.bp), 'sv-n', 'start') + S.text(PW + 20, 152, '代价 ' + f2(P.p.best), 'sv-n', 'start') +
    S.text(PW + 20, 190, `${P.p.crash} / 1331 种会撞墙`, 'sv-s bad', 'start') + S.text(PW + 20, 214, note, 'sv-s', 'start');
  return S.svg(820, PH, b + side, '重新规划');
}
function wholeFig() {
  const b = S.plot(0, 0, 820, 230, { title: '整个过程（位置 m），点是每 0.1 s 一次的重新规划', x: [0, 6], y: [0, 3.3], xu: 's', yt: [0, 1, 2, 3], hl: [{ v: WALL, c: 'bad', label: '墙 3 m' }, { v: XT, c: 'warn' }], series: [{ pts: FL.tr, c: 'acc' }] });
  const X = t => 44 + t / 6 * (812 - 44), Y = x => 204 - x / 3.3 * (204 - 26);
  return S.svg(820, 230, b + S.text(806, Y(XT) + 16, '目标 2.8 m', 'sv-s warn', 'end') + FL.plans.filter((_, i) => i % 2 === 0 && i < 40).map(P => `<circle cx="${X(P.t)}" cy="${Y(P.s.x)}" r="3" class="sv-fill-acc"/>`).join(''), '整个过程');
}

/* ---------- figure: constraints — PD vs MPC (and MPC with a wrong model), computed offline ---------- */
const RPD = fly({ pd: 6, xt: XT }), RW = fly({ H: H0, xt: XT, wrong: true });
const figCon = S.svg(820, 260, S.plot(0, 0, 820, 260, { title: '同样从 0 出发、目标 2.8 m（位置 m）', x: [0, 6], y: [0, 3.3], xu: 's', yt: [0, 1, 2, 3],
  hl: [{ v: WALL, c: 'bad', label: '墙 3 m' }, { v: XT, c: 'warn' }],
  series: [{ pts: RPD.tr, c: 'b', label: 'PD（增益 6）' }, { pts: FL.tr, c: 'acc', label: 'MPC' }, { pts: RW.tr, c: 'bad', dash: 1, label: 'MPC，模型错了' }] }) +
  [[RPD, 'PD 撞墙', 'b'], [RW, '模型错了：撞墙', 'bad']].filter(r => r[0].hit).map(([r, lab, c], i) => { const x = 44 + r.tHit / 6 * (812 - 44), y = 234 - WALL / 3.3 * (234 - 26);
    return `<path d="M${x - 6} ${y - 6} L${x + 6} ${y + 6} M${x - 6} ${y + 6} L${x + 6} ${y - 6}" class="sv-l-bad" style="stroke-width:2.6"/>` + `<line x1="${x}" y1="${y + 6}" x2="${470}" y2="${120 + i * 28}" class="sv-l-${c}" stroke-dasharray="3 3" style="stroke-width:1"/>` + S.text(476, 124 + i * 28, lab + '（' + r.tHit.toFixed(1) + ' s）', 'sv-s ' + c, 'start'); }).join(''),
  'PD、MPC 和模型错了的 MPC');

/* ---------- figure: horizon length vs behaviour, computed offline ---------- */
const HS = [0.1, 0.3, 1.5, 3];
const HR = HS.map(H => fly({ H, xt: XT }));
const figHor = S.svg(820, 440, HR.map((r, i) => S.plot((i % 2) * 420, ((i / 2) | 0) * 220, 400, 210, {
  title: `预测 ${HS[i]} s${HS[i] === 1.5 ? '（默认）' : ''}：6 s 后在 ${f2(r.x)} m`, x: [0, 6], y: [0, 3.3], xu: 's', yt: [0, 1, 2, 3], xt: [0, 2, 4, 6],
  hl: [{ v: WALL, c: 'bad' }, { v: XT, c: 'warn' }], series: [{ pts: r.tr, c: 'acc' }] })).join(''), '不同预测时域下 MPC 的轨迹');

/* ---------- figure: link to earlier lessons ---------- */
const figLink = S.svg(820, 200,
  S.box(320, 66, 180, 70, '本课：MPC', '预测 → 打分 → 挑', 'hl') +
  [[10, 0, '第 1 课 物理', '倾角 → 加速度 = 模型'], [10, 136, '第 2 课 PID', '只看现在的误差'], [630, 0, '第 7 课 轨迹', '参考轨迹给 MPC 往前看'], [630, 136, '第 8 课 抗干扰', 'd̂ 修正模型']]
    .map(([x, y, t, s]) => S.box(x, y, 180, 60, t, s, 'b')).join('') +
  S.arrow(190, 30, 318, 85, { c: 'b' }) + S.arrow(190, 166, 318, 120, { c: 'b' }) + S.arrow(630, 30, 502, 85, { c: 'b' }) + S.arrow(630, 166, 502, 120, { c: 'b' }),
  '本课和前面几课的关系');

el.innerHTML = `
<p class="lede">PID 只看“现在”的误差。<span class="term">模型预测控制</span>（MPC，Model Predictive Control）先用模型推演未来一小段时间，从许多动作串里挑最好的一串。开车看到前面有弯，提前松油门，就是这个意思。</p>

<h2>MPC 每一步做什么</h2>
${K.fig(figLoop, '这叫<span class="term">滚动时域</span>：每次只执行最好那串动作的第一小段，下一刻用新测到的状态从头再算。只执行第一段，是因为模型总有误差，重新测量等于加上了反馈。')}
${K.more('展开：MPC 的数学写法', `<div class="formula">min  Σ<sub>k=0..N</sub> [ 误差<sub>k</sub><sup>2</sup>·Q + 动作<sub>k</sub><sup>2</sup>·R ]     约束：模型方程、推力上下限、倾角上限、障碍
<div class="where">min：在所有可选的动作序列里取总分最小的那一串；k：未来第 k 步；Q、R：误差和动作各占多少权重，就是 MPC 的“调参”；N：往前看几步，叫预测时域。这是最常见的写法，实际中常常还会加一项“最后一步的终点代价”。</div></div>
<p>真实的 MPC 不是把动作一个个试过去，而是用数值优化算法直接求出最好的那一串；下面的实验为了直观，用的是穷举：倾角分 11 档，预测时域分 3 段，每段取一档，共 11³ = 1331 种。代价 = 每一小步的（位置误差² + 0.002 × 动作²）× 时间步长，最后再加终点项 0.6 × 终点误差² + 0.15 × 终点速度²。</p>`)}

<h2>用数字走一遍</h2>
<div id="walk8"></div>

<h2>约束：MPC 怎么“不撞墙”</h2>
${K.fig(figCon, `两种约束：<b>动作约束</b>（倾角不超过 30°）让菜单里根本没有更猛的动作；<b>状态约束</b>（不能越过墙）让撞墙的候选直接出局。<b>PD</b> 只看当前误差，冲过头撞墙；<b>MPC</b> 提前刹车，最远到 ${f2(FL.xmax)} m。但如果模型错了（实际重 40%，刹车比预想的弱），MPC 也会撞墙：约束只在模型准时才可靠。`)}
${K.more('展开：这个比较公平吗', `<p>PD 的阻尼故意设得偏小，所以它会冲过头撞墙；阻尼调得合适的 PD 也可以不撞墙。区别在于：PD 只能靠调参“间接地”避免撞墙，MPC 可以把“不许撞墙”直接写成约束。这个实验是一维的简化模型（倾角直接产生水平加速度，带一阶延迟）。</p>
<p>另外，MPC 最后停在 ${f2(FL.x)} m，离目标差几厘米：动作菜单只有 11 档，最接近 0 的非零倾角是 ±6.6°，再挪一点反而增加代价。真正的数值优化动作是连续的，不会有这个问题。</p>`)}

<h2>预测时域：看多远</h2>
${K.fig(figHor, `同一个规划器只改预测时域。<b>0.1 s</b>：看不到刹车距离，只敢慢慢挪，6 秒后还在 ${f2(HR[0].x)} m。<b>0.3 s</b>：既快又稳。<b>1.5 s</b>：冲到 ${f2(HR[2].xmax)} m，离墙只有几厘米。<b>3 s</b>：三段每段 1 秒，动作太粗，上升反而更慢。`)}
${K.more('展开：为什么不是越长越好', `<p>看得越远，计算量越大，而且模型误差在远处累积得越多；看得太近，又会畏手畏脚或来不及刹车。这个实验里长时域变慢，主要是因为“三段常值动作”的写法让每段变长、动作变粗；真实 MPC 通常把预测时域分成几十步，长时域时问题主要是计算量和模型误差。</p>`)}

<div id="d8"></div>

<h2>和前面几课的关系</h2>
${K.fig(figLink, 'MPC 的预测模型就是第 1 课的“倾角产生加速度”；和第 2 课的 PD 相比，它多了“往前看”；第 7 课的参考轨迹告诉它前面要去哪；第 8 课的扰动估计用来修正模型。')}

<h2>代价</h2>
<p>每一步都要解一个优化问题，计算量大；预测全靠模型，模型错了就不准。</p>
${K.more(K.ours('', '展开：计算量、模型依赖'), `<ul>
<li><b>计算量。</b>四旋翼的非线性 MPC（NMPC）常用 acados 这类专门的求解器，论文里常见每步约一到几毫秒，对机载电脑是不小的负担。</li>
<li><b>依赖模型。</b>模型错了（重了、有风、挂了机械臂），预测就不准。所以实际系统常把 MPC 和第 8 课的扰动估计结合，比如 L1-NMPC（L1 自适应 + 非线性 MPC）、GP-MPC（用高斯过程学模型误差）。</li>
</ul>${K.ours('')}`)}

<div class="key"><h3>这一课记住三件事</h3><ul>
<li>MPC = 预测未来 → 打分 → 挑最好的一串 → 只执行第一步 → 重来。</li>
<li>优点：能直接处理限制（倾角上限、墙），能提前看。</li>
<li>代价：计算量大，依赖模型准确；预测时域太短会畏手畏脚。</li>
</ul></div>
<h2>小测验</h2><div id="q8"></div>`;

K.steps(el.querySelector('#walk8'), { title: '实验里的 MPC 第一次规划：从 0 m 静止出发，目标 2.8 m，墙在 3 m，预测 1.5 s', steps: [
  { svg: setupFig(), t: `倾角只能在 ±30° 内选 11 档；1.5 秒分 3 段，每段选一档，一共 <b>${LV ** 3}</b> 串动作。每一串都用模型往前推演。` },
  { svg: candFig(1), t: `挑 6 串看看。A、B 一直往前冲或不刹够，会撞墙；F 不动，代价 ${f2(CANDS[5].r.J)}（一直离目标 2.8 m）；E 动作太小，到不了。` },
  { svg: candFig(2), t: `撞墙的直接出局（${P0.crash} 串）。剩下的里代价最低的是 <b>${seq(P0.bp)}</b>（代价 ${f2(P0.best)}）：先全力前倾，再放平，最后全力后仰刹车，正好停在目标附近。` },
  { svg: execFig(), t: `只执行第一段（前倾 30°）的头 <b>0.1 秒</b>。之后位置 ${f2(pl1.s.x, 3)} m、速度 ${f2(pl1.s.v)} m/s。剩下的计划扔掉。` },
  { svg: replanFig(pl1, FL.plans[0], 't = 0.1 s 重新规划（位置 m）', '灰色虚线：上一次的计划'), t: `用新状态从头再算 1331 串。新的最好一串是 <b>${seq(pl1.p.bp)}</b>，和上次的计划后半段不一样：每次只信第一段。` },
  { svg: replanFig(pl10, null, `t = ${f2(pl10.t, 1)} s 重新规划（位置 m）`, '红线：“不刹车”的候选'), t: `${f2(pl10.t, 1)} 秒时已到 ${f2(pl10.s.x)} m，速度 ${f2(pl10.s.v)} m/s。现在 <b>${pl10.p.crash}</b> 串都会撞墙，最好一串第一段是后仰 ${f2(-degOf(pl10.p.bp[0]), 0)}°：提前刹车。` },
  { svg: wholeFig(), t: `一共重新规划了 ${FL.plans.length} 次，最远到 <b>${f2(FL.xmax)} m</b>，没撞墙，最后停在 ${f2(FL.x)} m。` },
] });

const d = K.demo(el.querySelector('#d8'), '动手', '靠墙停车',
  '两架飞机同时从左边出发，要停在离墙很近的目标处，最大倾角限制在 30°。上面那条用 PD，下面那条用 MPC，点线是 MPC 预测的未来。先看默认设置下谁撞墙；再把 MPC 的预测时域调到 0.1–0.2 s，看它还能不能到达目标；最后打开“模型错了”。');
const cA = K.canvas(d, 0.3, 190), cB = K.canvas(d, 0.32, 190);
const ctl = K.box(d, 'controls'), ro = K.box(d, 'readout');
const sT = K.slider(ctl, { id: 'l8-t', label: '目标位置（墙在 3 m）', min: 1.5, max: 2.95, step: 0.05, value: 2.8, fmt: v => v.toFixed(2) + ' m', on: restart });
const sK = K.slider(ctl, { id: 'l8-k', label: 'PD 增益（越大越急）', min: 1, max: 12, step: 0.5, value: 6, on: restart });
const sH = K.slider(ctl, { id: 'l8-h', label: 'MPC 预测时域', min: 0.1, max: 3, step: 0.05, value: 1.5, fmt: v => v.toFixed(2) + ' s', on: restart });
const mm = K.seg(ctl, { label: '模型错了（实际重 40%）', options: [['0', '否'], ['1', '是']], value: '0', on: restart });
const br = K.box(ctl, 'btnrow'); K.btn(br, '重新出发', restart, 'primary');
let P, Mq, t, hits = [0, 0], hb = K.buf(8), pred = [], mpcT = 0, ua = 0;
function mk() { return { x: 0, v: 0, a: 0, hit: false }; }
function restart() { P = mk(); Mq = mk(); t = -0.5; hb.clear(); pred = []; mpcT = 0; ua = 0; }
restart();
function plan(s) {
  const p = planner(s, sH.v, sT.v);
  if (p.bp) { const r = roll(s, p.bp, sH.v, sT.v, true); pred = r.pts.filter((_, n) => n > 0 && (n - 1) % 2 === 0).map(q => q[1]); return p.bu; }
  pred = []; return -AM;
}
function adv(s, u, h) { const gain = mm.v === '1' ? 1 / 1.4 : 1; s.a += (u * gain - s.a) * h / TAU; s.v += s.a * h; s.x += s.v * h; if (s.x > WALL) { s.x = WALL; s.v = 0; s.a = 0; if (!s.hit) { s.hit = true; return 1; } } return 0; }
K.loop(dt => {
  K.sub(dt, 0.005, h => {
    t += h;
    if (t < 0) return;
    const xt = sT.v, kp = sK.v, kd = 0.9 * Math.sqrt(kp);
    hits[0] += adv(P, K.clamp(kp * (xt - P.x) - kd * P.v, -AM, AM), h);
    mpcT -= h; if (mpcT <= 0) { ua = plan(Mq); mpcT = 0.1; }
    hits[1] += adv(Mq, ua, h);
    if (t > 6) restart();
  });
  hb.push(Math.max(t, 0), P.x, Mq.x);
  const c = K.col(), a = cA.fit(), ctx = a.ctx, X0 = 40, X1 = a.w - 40, X = x => X0 + (x + 0.2) / (WALL + 0.3) * (X1 - X0);
  const lanes = [a.h * 0.32, a.h * 0.72];
  ctx.fillStyle = c.soft; ctx.fillRect(X(WALL), 10, 6, a.h - 20);
  for (let y = 14; y < a.h - 10; y += 10) { ctx.strokeStyle = c.line; ctx.beginPath(); ctx.moveTo(X(WALL) + 6, y); ctx.lineTo(X(WALL) + 16, y + 8); ctx.stroke(); }
  K.text(ctx, '墙', X(WALL) + 12, a.h - 8, c.soft);
  [[P, 'PD', c.warn], [Mq, 'MPC', c.acc]].forEach(([s, n, col], i) => {
    const y = lanes[i];
    ctx.strokeStyle = c.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(-0.2), y); ctx.lineTo(X(WALL), y); ctx.stroke();
    ctx.strokeStyle = c.bad; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(sT.v), y - 22); ctx.lineTo(X(sT.v), y + 22); ctx.stroke();
    if (i === 1) { ctx.fillStyle = col; pred.forEach(px => { ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(X(px), y, 3, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1; }
    const th = Math.atan(s.a / K.g);
    K.drawQuad(ctx, X(s.x), y, th, 90, { color: col });
    K.text(ctx, n, 6, y + 4, col, '600 13px "Noto Sans SC", sans-serif');
    if (s.hit) K.text(ctx, '撞墙', X(WALL) - 10, y - 18, c.bad, '600 13px "Noto Sans SC", sans-serif', 'right');
  });
  K.text(ctx, '红线：目标', X(-0.2), 16, c.bad);
  const b = cB.fit();
  K.plot(b.ctx, 0, 0, b.w, b.h, { title: '位置', unit: 'm', x: [0, 6], y: [0, 3.2], hl: [{ v: WALL, color: c.soft, label: '墙' }, { v: sT.v, color: c.bad }], series: [{ buf: hb, i: 1, color: c.warn, label: 'PD' }, { buf: hb, i: 2, color: c.acc, label: 'MPC' }], xfmt: x => x.toFixed(0) + 's' });
  ro.innerHTML = `<span>PD 撞墙次数 <b class="${hits[0] ? 'hot' : ''}">${hits[0]}</b></span><span>MPC 撞墙次数 <b class="${hits[1] ? 'hot' : ''}">${hits[1]}</b></span><span>MPC 每 0.1 秒评估 <b>${LV ** 3}</b> 种未来</span>`;
});

K.box(d, 'assume', '<b>这个实验做了哪些简化：</b>只有前后一个方向；倾角到加速度用一阶延迟近似；MPC 用“枚举 11³ 种分段常值动作”代替真正的数值优化；PD 故意调成欠阻尼，用来突出约束的作用，调好的 PD 不一定撞墙；“模型错了”只模拟质量偏差。');

K.quiz(el.querySelector('#q8'), 'l8', [
  { q: 'MPC 算出未来一整串最优动作以后，执行多少？', o: ['全部执行完再重新算', '只执行第一步，下一时刻用新测量从头再算', '执行一半', '随机挑一步'], a: 1,
    e: '这叫滚动时域。只执行第一步，是因为模型和真实世界总有偏差、未来也可能有新情况，用最新测量重新算，等于加上了反馈。' },
  { q: '走一遍里，第一次规划有 181 串动作被直接排除，为什么？', o: ['代价太高', '它们预测会越过墙，违反了状态约束', '倾角超过 30°', '计算超时'], a: 1,
    e: '撞墙的候选不论代价多低都不合格，这就是“约束”。倾角上限则是另一种约束：菜单里根本没有超过 30° 的动作。' },
  { q: '预测时域调得太短，会怎样？', o: ['更准', '看得太近：只能用很保守的动作保证不撞，结果迟迟到不了目标；如果不做保守处理，就会来不及刹车', '计算量变大', '没影响'], a: 1,
    e: '倾角有上限，刹车需要一段距离。预测时域比刹车时间还短时，MPC 看不清后果。实验里它选择了慢慢挪，很久都到不了目标。' },
  { q: 'MPC 的主要代价是什么？', o: ['不能处理约束', '计算量大，而且依赖模型准确', '不能用在四旋翼上', '只能控制高度'], a: 1,
    e: '每一步都要解优化。模型错了，预测就错。所以常和扰动估计一起用。（“不能处理约束”正好说反了：处理约束是 MPC 的长处。）' },
]);
} });
