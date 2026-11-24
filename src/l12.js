K.add({ id: 'l12', num: 12, title: '神经网络控制器与模仿学习', sub: '控制器就是一个函数；照着专家学，会在没见过的地方出错', render(el) {
const S = K.S;

/*core*/
const DT = 0.02, UMAX = 6, WALL = 1.2, SE = 0.5, SV = 1.0, KNN = 3;
const expert = (e, v) => K.clamp(-4 * e - 3.5 * v, -UMAX, UMAX);          /* the expert: saturated PD on lateral offset e and speed v */
function knn(D, e, v) {   /* imitator: average the expert actions of the 3 nearest stored states; returns [action, nearest distance, [[q, action, index], ...]] */
  const best = [];
  for (let i = 0; i < D.length; i++) {
    const p = D[i], de = (p[0] - e) / SE, dv = (p[1] - v) / SV, q = de * de + dv * dv;
    if (best.length < KNN) { best.push([q, p[2], i]); best.sort((a, b) => a[0] - b[0]); }
    else if (q < best[KNN - 1][0]) { best[KNN - 1] = [q, p[2], i]; best.sort((a, b) => a[0] - b[0]); }
  }
  return [best.reduce((s, b) => s + b[1], 0) / (best.length || 1), best.length ? Math.sqrt(best[0][0]) : 9, best];
}
function step(s, u) {     /* lateral double integrator, light drag, coloured random gust g */
  s.g += (-s.g / 0.5) * DT + 1.2 * Math.sqrt(DT) * K.randn();
  s.v += (u - 0.3 * s.v + s.g) * DT; s.e += s.v * DT; s.t += DT;
  if (Math.abs(s.e) > WALL) s.hit = true;
}
const fresh = () => ({ e: 0.05 * K.randn(), v: 0.1 * K.randn(), g: 0, t: 0, hit: false, emax: 0 });
function rollout(pol, T, push, rec) {
  const s = fresh(); let pushed = false;
  while (s.t < T && !s.hit) {
    if (push && !pushed && s.t >= 1) { s.v += push; pushed = true; }
    if (rec) rec(s.e, s.v);
    step(s, pol(s.e, s.v)); s.emax = Math.max(s.emax, Math.abs(s.e));
  }
  return s;
}
function demos(n) { const D = []; for (let k = 0; k < n; k++) rollout(expert, 10, 0, (e, v) => D.push([e, v, expert(e, v), 0])); return D; }
function dagger(D, n) {   /* the imitator flies (random pushes); the expert only labels the states it visited */
  const pol = (e, v) => knn(D, e, v)[0], add = [];
  for (let k = 0; k < n; k++) { const P = (Math.random() < 0.5 ? -1 : 1) * (1.5 + 1.5 * Math.random()); let i = 0; rollout(pol, 5, P, (e, v) => { if (i++ % 2 === 0) add.push([e, v, expert(e, v), 1]); }); }
  add.forEach(p => D.push(p)); return add.length;
}
/*endcore*/

/*offline: the demo's own model with a fixed random seed (Math.random swapped only during this block) */
function seeded(seed, fn) {
  const keep = Math.random; let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = keep; }
}
const OFF = (() => {
  const D0 = seeded(1, () => demos(3));
  const flyT = (D, pol) => seeded(8, () => { const tr = []; const s = rollout((e, v) => { const r = D ? knn(D, e, v) : [pol(e, v), 0, []]; tr.push({ t: tr.length * DT, e, v, u: r[0], d: r[1], nn: r[2], ex: expert(e, v) }); return r[0]; }, 6, 2.5, null); return { s, tr }; });
  const ex = flyT(null, expert), bc = flyT(D0, null);
  const D1 = D0.slice(), nadd = seeded(101, () => dagger(D1, 6)), dg = flyT(D1, null);
  return { D0, D1, nadd, ex, bc, dg };
})();
const at = (r, t) => r.tr[Math.round(t / DT)];
const f2 = x => (Math.abs(x) < 0.005 ? 0 : x).toFixed(2);

/* state-space panel: e (offset, m) horizontally, v (lateral speed, m/s) vertically */
const EX = [-1.5, 1.5], VY = [-1, 3];
function ss(x0, y0, W, H, o) {
  const L = x0 + 40, R = x0 + W - 8, T = y0 + 10, B = y0 + H - 40;
  const X = e => L + (e - EX[0]) / (EX[1] - EX[0]) * (R - L), Y = v => B - (v - VY[0]) / (VY[1] - VY[0]) * (B - T);
  const inR = p => p[0] >= EX[0] && p[0] <= EX[1] && p[1] >= VY[0] && p[1] <= VY[1];
  let b = `<rect x="${L}" y="${T}" width="${R - L}" height="${B - T}" class="sv-box"/>`;
  [-1, 0, 1, 2, 3].forEach(v => { b += `<line x1="${L}" y1="${Y(v)}" x2="${R}" y2="${Y(v)}" class="sv-l-grid"/>` + S.text(L - 5, Y(v) + 4, v, 'sv-s', 'end'); });
  [-1, 0, 1].forEach(e => { b += S.text(X(e), B + 15, e === -1 ? '−1' : e, 'sv-s'); });
  b += S.text(X(-1.1), T + 14, '↑ 侧向速度 v (m/s)', 'sv-s', 'start') + S.text((L + R) / 2, B + 32, '偏离中线 e (m) →', 'sv-s');
  [-WALL, WALL].forEach(w => { b += `<line x1="${X(w)}" y1="${T}" x2="${X(w)}" y2="${B}" class="sv-l-bad"/>`; });
  b += S.text(X(WALL) + 4, T + 30, '墙', 'sv-s bad', 'start');
  (o.data || []).forEach((D, k) => { const c = k ? 'warn' : 'b'; D.forEach((p, i) => { if ((i % 2 === 0) && inR(p)) b += `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="1.7" class="sv-fill-${c}" opacity=".45"/>`; }); });
  (o.tr || []).forEach(s => { b += `<polyline points="${s.pts.filter(inR).map(p => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ')}" class="sv-l-${s.c}"${s.dash ? ' stroke-dasharray="5 4"' : ''}/>`; });
  (o.nn || []).forEach(p => { b += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="5" class="sv-l-ink" style="stroke-width:1.6"/>`; });
  (o.dot || []).forEach(p => { b += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="6" class="sv-fill-${p[2]}"/>` + (p[3] ? S.text(X(p[0]) + 10, Y(p[1]) + 5, p[3], 'sv-s ' + p[2], 'start') : ''); });
  return b;
}
const trPts = r => r.tr.map(p => [p.e, p.v]);

/* figure: one neuron, numbers of the pushed state */
const P1 = at(OFF.bc, 1.0), zsum = -4 * P1.e - 3.5 * P1.v;
const figNeuron = S.svg(820, 236,
  `<circle cx="110" cy="60" r="24" class="sv-box"/>` + S.text(110, 65, 'e', 'sv-t') + S.text(76, 65, f2(P1.e) + ' m', 'sv-n', 'end') +
  `<circle cx="110" cy="170" r="24" class="sv-box"/>` + S.text(110, 175, 'v', 'sv-t') + S.text(76, 175, f2(P1.v) + ' m/s', 'sv-n', 'end') +
  S.text(90, 218, '输入：偏离、侧向速度', 'sv-s') +
  S.arrow(134, 66, 318, 108, { c: 'acc', label: '× w₁ = −4' }) + S.arrow(134, 164, 318, 128, { c: 'acc', label: '× w₂ = −3.5', side: 'below' }) +
  S.box(320, 80, 150, 76, 'Σ 加权求和 + b', `${f2(-4 * P1.e)} − ${f2(3.5 * P1.v)} + 0`, 'hl') + S.text(395, 176, '= ' + zsum.toFixed(2), 'sv-n') +
  S.arrow(470, 118, 528, 118, { c: 'acc' }) +
  S.box(530, 80, 120, 76, 'f：弯折', '限幅到 ±6', 'hl') +
  `<line x1="545" y1="200" x2="635" y2="200" class="sv-l-grid"/><polyline points="548,212 572,212 608,184 632,184" class="sv-l-ink" style="stroke-width:1.6"/>` + S.text(590, 228, '超过 ±6 就削平', 'sv-s') +
  S.arrow(650, 118, 712, 118, { c: 'acc' }) + S.text(766, 112, '−6.00', 'sv-big') + S.text(766, 136, 'm/s²（满力刹车）', 'sv-s'),
  '一个神经元：输入乘权重、相加、再过一个弯折函数');

/* figure: an MLP and where it plugs in */
const col = (x, n, y0, dy) => Array.from({ length: n }, (_, i) => [x, y0 + i * dy]);
const LAY = [col(110, 6, 40, 34), col(300, 7, 26, 34), col(470, 7, 26, 34), col(640, 4, 74, 34)];
let mlpB = '';
for (let l = 0; l < 3; l++) LAY[l].forEach(a => LAY[l + 1].forEach(c => { mlpB += `<line x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}" class="sv-l-grid"/>`; }));
LAY.forEach((L, l) => L.forEach(p => { mlpB += `<circle cx="${p[0]}" cy="${p[1]}" r="9" class="sv-box ${l === 1 || l === 2 ? 'hl' : ''}"/>`; }));
const figMLP = S.svg(820, 290, mlpB +
  S.text(110, 260, '观测 135 维 + 历史', 'sv-s') + S.text(385, 260, '隐藏层（每个圆 = 一个神经元）', 'sv-s acc') + S.text(640, 230, 'CTBR：推力 + 3 个角速度', 'sv-s') +
  S.arrow(660, 125, 700, 125, { c: 'warn' }) + S.box(702, 92, 110, 66, 'PX4', '角速度环', 'px') +
  S.text(385, 284, '每条连线 = 一个权重；训练 = 一点点改这些权重', 'sv-s'),
  '多层感知机：神经元一层层连起来');

/* figures: data coverage and compounding error (same push, three controllers) */
const figCover = S.svg(420, 300,
  ss(0, 0, 420, 300, { data: [OFF.D0], tr: [{ pts: trPts(OFF.ex), c: 'ink', dash: 1 }, { pts: trPts(OFF.bc), c: 'bad' }] }) +
  S.text(90, 60, '模仿者（红）', 'sv-s bad', 'start') + S.text(90, 210, '蓝点：专家示范', 'sv-s b', 'start'),
  '状态空间里的示范数据和推一把之后的轨迹');
const lag = r => r.tr.map(p => [p.t, Math.abs(p.e)]);
const figComp = S.svg(420, 300, S.plot(0, 0, 420, 300, { title: '|偏离| (m)', x: [0, 6], y: [0, 1.4], xu: 's', yt: [0, 0.5, 1, 1.2],
  hl: [{ v: WALL, label: '墙', c: 'bad' }],
  series: [{ pts: lag(OFF.ex), c: 'soft', dash: 1 }, { pts: lag(OFF.bc), c: 'bad' }, { pts: lag(OFF.dg), c: 'acc' }] }) +
  S.text(200, 90, '模仿者（红）：撞墙', 'sv-s bad', 'start') + S.text(200, 112, 'DAgger 之后（蓝绿）', 'sv-s acc', 'start') + S.text(200, 134, '专家（虚线）', 'sv-s', 'start') +
  S.text(200, 180, '第 1 秒被推一把（2.5 m/s）', 'sv-s', 'start'),
  '同一阵风、同一次推力下三者偏离中线的距离');

/* walkthrough panels */
function wStep(o) {
  const u = o.u, ue = o.ex, Z = 790, X = v => Z + v / 6 * 180;
  let b = ss(0, 0, 440, 260, o.ss);
  b += S.text(470, 40, o.head, 'sv-t', 'start');
  b += S.text(470, 66, o.sub, 'sv-s', 'start');
  [['模仿者', u, o.uc || 'acc', 110], ['专家', ue, 'warn', 160]].forEach(([n, val, c, y]) => {
    b += S.text(470, y + 5, n, 'sv-s', 'start') + `<line x1="${Z}" y1="${y - 14}" x2="${Z}" y2="${y + 14}" class="sv-l-soft"/>` +
      `<rect x="${Math.min(X(val), Z)}" y="${y - 9}" width="${Math.max(1.5, Math.abs(X(val) - Z))}" height="18" rx="3" class="sv-fill-${c}"/>` +
      S.text(Math.min(X(val), Z) - 6, y + 5, val.toFixed(2), c === 'bad' ? 'sv-s bad' : c === 'warn' ? 'sv-nw' : 'sv-n', 'end');
  });
  b += S.text(Z, 192, '0', 'sv-s') + S.text(X(-6), 192, '−6', 'sv-s') + S.text(800, 218, '动作：侧向加速度 (m/s²)，负 = 往回推', 'sv-s', 'end');
  return S.svg(820, 262, b, o.head);
}
const B0 = at(OFF.bc, 0.98), B2 = at(OFF.bc, 1.6), BE = OFF.bc.tr[OFF.bc.tr.length - 1], G1 = at(OFF.dg, 1.0);
const nnPts = p => p.nn.map(n => OFF.D0[n[2]]);
const upTo = (r, t) => r.tr.filter(p => p.t <= t + 1e-9).map(p => [p.e, p.v]);
const walk = [
  { svg: wStep({ ss: { data: [OFF.D0], dot: [[B0.e, B0.v, 'acc']] }, head: `t = 0.98 s：在数据里`, sub: `e = ${f2(B0.e)} m，v = ${f2(B0.v)} m/s`, u: B0.u, ex: B0.ex }),
    t: `平时飞机待在中线附近，状态点就在专家示范（蓝点）里。最近的 3 个示范点就在旁边，模仿者给 <b>${B0.u.toFixed(2)}</b>，专家给 <b>${B0.ex.toFixed(2)}</b>，几乎一样。` },
  { svg: wStep({ ss: { data: [OFF.D0], nn: nnPts(P1), dot: [[P1.e, P1.v, 'bad']] }, head: 't = 1.00 s：被推了 2.5 m/s', sub: `e = ${f2(P1.e)} m，v = ${f2(P1.v)} m/s`, u: P1.u, ex: P1.ex, uc: 'bad' }),
    t: `侧向推一把，速度跳到 <b>${f2(P1.v)} m/s</b>。示范里最快才 ${Math.max(...OFF.D0.map(p => Math.abs(p[1]))).toFixed(2)} m/s，这里一个点都没有。模仿者只能照搬最近的 3 个点（黑圈，都是“几乎没速度”的状态），给 <b>${P1.u.toFixed(2)}</b>；专家会满力刹车 <b>−6.00</b>。` },
  { svg: wStep({ ss: { data: [OFF.D0], tr: [{ pts: upTo(OFF.bc, 1.6), c: 'bad' }], dot: [[B2.e, B2.v, 'bad']] }, head: 't = 1.60 s：越偏越远', sub: `e = ${f2(B2.e)} m，v = ${f2(B2.v)} m/s`, u: B2.u, ex: B2.ex, uc: 'bad' }),
    t: `刹得太轻，飞机继续往墙边走，状态离数据越来越远，模仿者还是只给 <b>${B2.u.toFixed(2)}</b>。一次小错把它带到更陌生的地方，那里错得更多：这就是<span class="term">误差累积</span>。` },
  { svg: wStep({ ss: { data: [OFF.D0], tr: [{ pts: trPts(OFF.ex), c: 'ink', dash: 1 }, { pts: trPts(OFF.bc), c: 'bad' }], dot: [[BE.e, BE.v, 'bad', '撞墙']] }, head: `t = ${(OFF.bc.s.t).toFixed(2)} s：撞墙`, sub: `专家同样被推，最多偏 ${OFF.ex.s.emax.toFixed(2)} m（黑虚线）`, u: BE.u, ex: BE.ex, uc: 'bad' }),
    t: `第 ${(OFF.bc.s.t).toFixed(2)} 秒偏离超过 1.2 m，撞墙。同样的推力，专家最多只偏 <b>${OFF.ex.s.emax.toFixed(2)} m</b>：问题不在“救不回来”，而在模仿者没学过怎么救。` },
  { svg: wStep({ ss: { data: [OFF.D0, OFF.D1.slice(OFF.D0.length)], tr: [{ pts: trPts(OFF.dg), c: 'acc' }], dot: [[G1.e, G1.v, 'acc']] }, head: 'DAgger 之后：同一次推力', sub: `补进 ${OFF.nadd} 个由专家标注的点（橙点）`, u: G1.u, ex: G1.ex }),
    t: `让模仿者自己被推着飞 6 次，专家给它到过的状态标上正确动作（橙点）。再推同样一下，最近的点都是橙点，模仿者给 <b>${G1.u.toFixed(2)}</b>，最多偏 <b>${OFF.dg.s.emax.toFixed(2)} m</b>，刹住了。` },
];

/* figure: the DAgger loop */
const figDAgger = S.svg(820, 190,
  S.box(20, 45, 140, 60, '专家示范', '正常飞行的数据', 'b') + S.arrow(160, 75, 208, 75) +
  S.box(210, 45, 150, 60, '① 训练模仿者', '照着数据学', 'hl') + S.arrow(360, 75, 438, 75, { c: 'acc' }) +
  S.box(440, 45, 160, 60, '② 模仿者自己飞', '会犯错、会偏出去', 'hl') + S.arrow(600, 75, 638, 75, { c: 'acc' }) +
  S.box(640, 45, 165, 60, '③ 专家只标注', '“这里该怎么做”', 'px') +
  S.path([[722, 105], [722, 160], [285, 160], [285, 107]], { c: 'warn', label: '④ 并入数据，重新训练，回到 ①', lx: 500, ly: 152 }) +
  S.text(720, 30, '专家不接管飞行，只回答问题', 'sv-s warn'),
  'DAgger：数据从模仿者自己会去的地方来');

el.innerHTML = `
<p class="lede">前面各课的控制器都是人写公式、调几个增益。换个角度看：<b>控制器就是一个函数</b>，输入状态和目标，输出指令。既然是函数，也可以用数据把它“学”出来。</p>

<h2>一个神经元在算什么</h2>
${K.fig(figNeuron, '每个输入乘一个<b>权重</b> w，加起来再加偏置 b，最后过一个“弯折”函数 f。这里的数字取自下面实验：飞机被推了一把，偏离 −0.01 m、侧向速度 2.54 m/s。巧的是，实验里的<b>专家就是这一个神经元</b>：w = (−4, −3.5)，f = 限幅到 ±6。')}
${K.fig(figMLP, '神经元一层层连起来叫<span class="term">多层感知机</span>（MLP）。' + K.ours('', '学习型飞控常用这样一个网络替换第 3 课级联里的位置环和姿态环，输出 CTBR 交给 PX4。') + '')}
${K.more(K.ours('', '展开：弯折函数、损失和梯度下降'), `<p>f 常用“负数变 0”（ReLU）或 tanh。没有 f，叠多少层都只是一个线性函数。所有 w 和 b 合称网络的<span class="term">权重</span>。<b>训练</b>：先定一个“错得多离谱”的分数，叫<span class="term">损失</span>（loss），再让每个权重朝使损失变小的方向挪一小步，重复成千上万次，这叫<span class="term">梯度下降</span>。</p>${K.ours('')}`)}

<h2>和前几课的关系</h2>
<div class="tblwrap"><table class="tbl">
<tr><th>控制器</th><th>函数的形状</th><th>可调的数</th></tr>
<tr><td>第 2 课 <a href="#l2">PID</a></td><td>三项相加，人定的</td><td>3 个增益，人调</td></tr>
<tr><td>第 6 课 <a href="#l5">SE(3)</a></td><td>从物理推出来</td><td>十来个增益，人调</td></tr>
<tr><td>本课：神经网络</td><td>非常灵活</td><td>成千上万个权重，用数据训练</td></tr>
</table></div>

<h2>行为克隆：照着专家学</h2>
<p>让专家飞很多次，记下每一刻的“状态 → 专家动作”，训练模仿者在这些状态上输出同样的动作。这叫<span class="term">行为克隆</span>（behavior cloning，BC）。问题是：数据只覆盖专家去过的地方。</p>
<div class="figrow">${K.fig(figCover, '蓝点：专家正常飞行 30 秒的全部状态，挤在原点附近。推一把之后，专家（黑虚线）绕一圈回来；模仿者（红）一路偏到墙。')}${K.fig(figComp, '用下面实验的同一个模型离线算出。被推之前三者一样好；被推之后只有模仿者撞墙。')}</div>
<div id="walk"></div>
${K.more('展开：分布偏移的理论结论', `<p>这个现象叫<span class="term">分布偏移</span>（distribution shift）或<span class="term">误差累积</span>（compounding error）：训练数据的状态分布是专家的，部署时的状态分布是模仿者自己的。理论分析（Ross 等，AISTATS 2011 及更早的工作）指出，最坏情况下行为克隆的累计代价随任务步数的平方增长，而不是线性增长。</p>`)}

<h2>DAgger：在模仿者自己去的地方补数据</h2>
${K.fig(figDAgger, '<span class="term">DAgger</span>（Dataset Aggregation，Ross、Gordon、Bagnell，AISTATS 2011）：让模仿者自己飞，请专家给它到过的状态打标签，并入数据再训练。上面第 5 步就是一轮 DAgger 的效果。')}
${K.more('展开：DAgger 的细节和在无人机上的应用', `<p>原论文早期几轮还按比例混入专家动作来飞，这里略去。DAgger 要求专家能对<b>任意</b>状态随时给出答案，人类飞手难做到，仿真里的程序专家可以，所以它在无人机学习里很常见：Loquercio 等（Science Robotics 2021）让看得到环境真实信息的“特权”专家教只看传感器的学生；RAPTOR（Eschmann 等，Science Robotics 2026）用 DAgger 式在线标注把 1000 个强化学习教师蒸馏成一个策略。</p>`)}
<div class="idea"><h3>专家就是天花板</h3><p>模仿学得再好，也只是复现专家，连专家的错一起学。想超过经典控制器，要靠“飞得好不好”的分数（<a href="#l13">第 13 课</a>强化学习），或让教师掌握学生没有的信息（<a href="#l14">第 14 课</a>）。</p></div>

<div id="d12"></div>

<div class="key"><h3>这一课记住三件事</h3><ul>
<li>控制器就是“状态 → 指令”的函数；神经网络是可调数（权重）很多的函数，训练就是不断微调权重让损失变小。</li>
<li>行为克隆只在专家去过的地方可靠；一旦偏出去，错误会越滚越大（分布偏移）。DAgger 让专家标注模仿者自己到过的状态，把这个洞补上。</li>
<li>模仿的上限是专家。想超过经典控制器，要靠奖励（强化学习）或更多信息，而不是照抄它。</li>
</ul></div>
<h2>小测验</h2><div id="q12"></div>`;

K.steps(el.querySelector('#walk'), { title: '用数字走一遍：模仿者被推了一把（右图：两者给出的动作）', steps: walk });

const d = K.demo(el.querySelector('#d12'), '动手', '模仿者被推出数据之外',
  '俯视一条宽 2.4 m 的走廊，飞机沿中线前飞，有随机侧风。右图是状态空间，蓝点是专家示范数据。① 选“专家”，点“侧向推一把”，它能刹住。② 选“模仿者”，先不推，再推一把，看它撞墙。③ 点一次“加入纠正数据（DAgger）”（出现橙点），再推，它能刹住了。');
const cvs = K.box(d, 'cvs');
const cA = K.canvas(cvs, 0.75, 240), cB = K.canvas(cvs, 0.75, 240);
const ctl = K.box(d, 'controls'), ro = K.box(d, 'readout');
let D = demos(3), s = fresh(), acc = 0, hold = 0, sign = 1, pushes = 0, hits = 0, nd = 0, lastD = 0;
const tr = K.buf(4);
const who = K.seg(ctl, { label: '谁在飞', options: [['exp', '专家'], ['bc', '模仿者']], value: 'exp', on: () => { s = fresh(); tr.clear(); pushes = hits = 0; } });
const br = K.box(ctl, 'btnrow');
K.btn(br, '侧向推一把', () => { if (hold > 0) return; s.v += 2.5 * sign; sign = -sign; pushes++; }, 'primary');
K.btn(br, '加入纠正数据（DAgger）', () => { nd += dagger(D, 6); who.set('bc'); });
K.btn(br, '清空纠正数据', () => { D = D.filter(p => !p[3]); nd = 0; s = fresh(); tr.clear(); pushes = hits = 0; });
K.loop(dt => {
  if (hold > 0) { hold -= dt; if (hold <= 0) { s = fresh(); tr.clear(); } }
  else {
    acc += dt;
    while (acc >= DT && !s.hit) {
      acc -= DT;
      let u;
      if (who.v === 'exp') { u = expert(s.e, s.v); lastD = knn(D, s.e, s.v)[1]; } else { const r = knn(D, s.e, s.v); u = r[0]; lastD = r[1]; }
      step(s, u); tr.push(s.t, s.e, s.v);
    }
    if (s.hit) { hits++; hold = 1.2; acc = 0; }
  }
  const c = K.col(), a = cA.fit(), ctx = a.ctx;
  const sc = Math.min(a.w / 7, a.h / 3.2), cy = a.h / 2, X0 = a.w * 0.62, Y = e => cy - e * sc, X = dx => X0 + dx * sc;
  ctx.fillStyle = c.panel; ctx.fillRect(0, Y(WALL), a.w, 2 * WALL * sc);
  ctx.strokeStyle = c.bad; ctx.lineWidth = 3; [WALL, -WALL].forEach(w => { ctx.beginPath(); ctx.moveTo(0, Y(w)); ctx.lineTo(a.w, Y(w)); ctx.stroke(); });
  ctx.strokeStyle = c.warn; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(a.w, cy); ctx.stroke(); ctx.setLineDash([]);
  K.text(ctx, '参考路径（走廊中线）', 8, cy - 6, c.warn); K.text(ctx, '墙', 8, Y(WALL) - 6, c.bad);
  ctx.strokeStyle = c.acc; ctx.lineWidth = 2; ctx.beginPath();
  tr.d.forEach((p, i) => { const x = X(-(s.t - p[0]) * 2), y = Y(p[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
  const qx = X(0), qy = Y(K.clamp(s.e, -1.4, 1.4)), r = sc * 0.22;
  ctx.strokeStyle = hold > 0 ? c.bad : c.ink; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(qx - r, qy - r); ctx.lineTo(qx + r, qy + r); ctx.moveTo(qx + r, qy - r); ctx.lineTo(qx - r, qy + r); ctx.stroke();
  [[-1, -1], [1, 1], [1, -1], [-1, 1]].forEach(([i, j]) => { ctx.beginPath(); ctx.arc(qx + i * r, qy + j * r, r * 0.45, 0, 7); ctx.stroke(); });
  K.text(ctx, '前进方向 →', a.w - 8, a.h - 8, c.soft, null, 'right');
  if (hold > 0) K.text(ctx, '撞墙', qx, qy - r * 2, c.bad, '600 15px "Noto Sans SC", sans-serif', 'center');
  const b = cB.fit(), bx = b.ctx;
  const PX = e => 10 + (e + 1.5) / 3 * (b.w - 20), PY = vv => 26 + (3.2 - vv) / 6.4 * (b.h - 36);
  bx.strokeStyle = c.grid; bx.lineWidth = 1; bx.beginPath(); bx.moveTo(PX(0), PY(-3.2)); bx.lineTo(PX(0), PY(3.2)); bx.moveTo(PX(-1.5), PY(0)); bx.lineTo(PX(1.5), PY(0)); bx.stroke();
  bx.strokeStyle = c.bad; bx.lineWidth = 2; [WALL, -WALL].forEach(w => { bx.beginPath(); bx.moveTo(PX(w), PY(-3.2)); bx.lineTo(PX(w), PY(3.2)); bx.stroke(); });
  D.forEach(p => { bx.fillStyle = p[3] ? c.warn : c.b; bx.globalAlpha = 0.5; bx.fillRect(PX(p[0]) - 1.2, PY(p[1]) - 1.2, 2.4, 2.4); }); bx.globalAlpha = 1;
  bx.strokeStyle = c.acc; bx.lineWidth = 1.2; bx.globalAlpha = 0.7; bx.beginPath(); tr.d.forEach((p, i) => { const x = PX(K.clamp(p[1], -1.5, 1.5)), y = PY(K.clamp(p[2], -3.2, 3.2)); i ? bx.lineTo(x, y) : bx.moveTo(x, y); }); bx.stroke(); bx.globalAlpha = 1;
  bx.fillStyle = c.acc; bx.beginPath(); bx.arc(PX(K.clamp(s.e, -1.5, 1.5)), PY(K.clamp(s.v, -3.2, 3.2)), 5, 0, 7); bx.fill();
  K.text(bx, '状态空间：横轴 偏离中线 (m)，竖轴 侧向速度 (m/s)', 6, 15, c.ink, '500 12.5px "Noto Sans SC", sans-serif');
  K.text(bx, '墙', PX(WALL) + 4, PY(-3), c.bad); K.text(bx, '墙', PX(-WALL) - 4, PY(-3), c.bad, null, 'right');
  const out = lastD > 0.35;
  ro.innerHTML = `<span>专家示范 <b>${D.length - nd} 点</b></span><span>纠正数据 <b>${nd} 点</b></span><span>当前状态 <b class="${out ? 'hot' : 'good'}">${out ? '在数据之外' : '在数据里'}</b></span><span>推了 <b>${pushes}</b> 次，撞墙 <b class="${hits ? 'hot' : ''}">${hits}</b> 次</span>`;
});
K.box(d, 'assume', '<b>这个实验做了哪些简化：</b>只有侧向一个方向（前进只用于画图），侧向加速度直接作为指令，没有姿态和电机延迟；专家是带限幅的 PD；模仿者<b>不是神经网络</b>，而是“最近邻”拟合：取数据里离当前状态最近的 3 个点，平均专家在那里的动作。神经网络在数据外同样没有保证，但出错方式不同。DAgger 每点一次，模仿者带随机推力飞 6 次，专家标注到过的状态，不混入专家动作；侧风、推力、数据量是为现象明显而选的示意值。上面的静态图和“一步一步看”用同一个模型、固定随机种子离线算出；实验里每次随机，数字会略有不同。');

K.quiz(el.querySelector('#q12'), 'l12', [
  { q: '训练一个神经网络控制器时，被“学”出来、不断调整的是什么？', o: ['网络里的权重（成千上万个可调的数）', '网络的层数，训练时会自动增长', 'PX4 角速度环的参数', '飞机的质量和惯量'], a: 0,
    e: '网络的结构是事先定好的，训练只调整权重：每一步让每个权重朝着使损失变小的方向挪一点（梯度下降）。' },
  { q: '一个神经元的权重 w = (−4, −3.5)、b = 0、f = 限幅到 ±6。输入 e = 0.2、v = 0.4，输出是多少？', o: ['−2.2', '−6', '2.2', '−0.8'], a: 0,
    e: '−4 × 0.2 + (−3.5) × 0.4 + 0 = −0.8 − 1.4 = −2.2，没有超过 ±6，限幅不起作用。' },
  { q: '行为克隆得到的模仿者，平时飞得和专家几乎一样，被推一把后却撞墙了。最主要的原因是什么？', o: ['网络太小，记不住', '被推后进入了示范数据里没有的状态，它在那里没学过，越错越远', '专家本身不会刹车', '侧风太大，谁都救不回来'], a: 1,
    e: '这就是分布偏移：示范数据只覆盖专家去过的地方。实验里专家在同样的推力下能刹住，模仿者一出数据就刹不住。' },
  { q: 'DAgger 比行为克隆多做的关键一步是什么？', o: ['多录一些专家正常飞行的数据', '让模仿者自己飞，请专家给它实际到过的状态标注正确动作，并入数据再训练', '把网络换成更大的', '飞慢一点，减少出错'], a: 1,
    e: '多录正常飞行的数据补不上“偏出去以后怎么办”这个洞。DAgger 收集的正是模仿者自己会去到的状态。' },
  { q: '用模仿学习去学一个调好的经典控制器（例如 SE(3)），通常最好能达到什么水平？', o: ['明显超过这个经典控制器', '大致和这个经典控制器一样，它就是上限', '一定比它差很多，没有用处', '取决于网络层数，层数够多就能超过'], a: 1,
    e: '模仿的目标就是复现专家，专家的错误也会一起学去。想超过它，需要奖励信号（强化学习）或者专家拥有学生没有的信息。' },
]);
} });
