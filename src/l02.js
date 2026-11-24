K.add({ id: 'l2', num: 2, title: '反馈控制与 PID', sub: '看误差、算动作：比例、积分、微分各管什么', render(el) {
const S = K.S;
const m = 2.74, Tmax = 1.95 * m * K.g, W = m * K.g;

/* one step of the height-only model used by the demo and by the offline figures (h seconds) */
function pidStep(st, h, kp, kd, ki, zr, ff, load) {
  const mt = m + (load ? 0.5 : 0), e = zr - st.z;
  if (ki > 0) st.I = K.clamp(st.I + e * h, -3 / Math.max(ki, 0.1), 3 / Math.max(ki, 0.1)); else st.I = 0;
  const u = (ff ? m * K.g : 0) + m * (kp * e + ki * st.I - kd * st.vz);
  st.T += (K.clamp(u, 0, Tmax) - st.T) * Math.min(1, h / 0.03);
  st.vz += (st.T / mt - K.g) * h; st.z += st.vz * h;
  if (st.z < 0) { st.z = 0; if (st.vz < 0) st.vz = 0; }
  if (st.z > 6) { st.z = 6; if (st.vz > 0) st.vz = 0; }
  return u;
}
/* offline run: start at z0, target 1.5 m, load attached at loadAt; returns [t, z] every 0.02 s */
function sim(kp, kd, ki, z0, loadAt, dur) {
  const st = { z: z0, vz: 0, T: W, I: 0 }, out = [[0, z0]];
  for (let n = 1; n <= dur / 0.002; n++) { pidStep(st, 0.002, kp, kd, ki, 1.5, true, n * 0.002 > loadAt); if (n % 10 === 0) out.push([n * 0.002, st.z]); }
  return out;
}

/* ---------- figure: the feedback loop with this lesson's numbers ---------- */
const figLoop = S.svg(820, 190,
  S.text(40, 40, '目标 1.5 m', 'sv-nw') + S.arrow(80, 55, 146, 55, { c: 'warn' }) +
  `<circle cx="160" cy="55" r="13" class="sv-box"/>` + S.text(160, 60, '−', 'sv-t') +
  S.arrow(173, 55, 258, 55, { c: 'acc', label: '误差 0.3 m' }) +
  S.box(260, 20, 170, 70, '控制器', 'PID：算该推多大', 'hl') +
  S.arrow(430, 55, 548, 55, { c: 'acc', label: '推力 27.98 N' }) +
  S.box(550, 20, 150, 70, '飞机', '推力 − 重力 → 动起来') +
  S.path([[700, 55], [770, 55], [770, 150], [160, 150], [160, 70]], { c: 'soft' }) +
  S.text(465, 142, '测到的高度 1.2 m（传感器，第 4 课）', 'sv-s') +
  S.text(465, 178, '每秒重复 125 次：测 → 比 → 算 → 推', 'sv-s acc'),
  '反馈回路：拿目标减测量得到误差，控制器把误差变成推力');

/* ---------- figure: what P, D, I each look at ---------- */
const zig = (x, y0, y1) => { let d = `M${x} ${y0}`; const n = 8, dy = (y1 - y0) / n; for (let i = 1; i <= n; i++) d += ` L${x + (i % 2 ? 10 : -10)} ${y0 + dy * i - dy / 2} L${x} ${y0 + dy * i}`; return `<path d="${d}" class="sv-l-acc" style="stroke-width:1.6"/>`; };
const figTerms = S.svg(820, 230,
  /* P: spring to the target */
  `<line x1="30" y1="50" x2="240" y2="50" class="sv-l-warn" stroke-dasharray="6 5"/>` + S.text(34, 42, '目标', 'sv-s warn', 'start') +
  zig(135, 52, 128) + S.quad(135, 140, 0, 46, {}) +
  S.text(210, 100, '误差 e', 'sv-s', 'start') + `<line x1="200" y1="52" x2="200" y2="138" class="sv-l-soft" marker-end="url(#AH-soft)"/>` +
  S.text(135, 192, 'P 比例：像弹簧', 'sv-t') + S.text(135, 212, '离目标越远，拉得越猛', 'sv-s') +
  /* D: brake against the velocity */
  S.quad(410, 110, 0, 46, {}) +
  S.arrow(470, 140, 470, 70, { c: 'b', label: '速度 v', side: 'right' }) +
  S.arrow(350, 70, 350, 140, { c: 'acc', label: '−Kd·v', side: 'left' }) +
  S.text(410, 192, 'D 微分：像刹车', 'sv-t') + S.text(410, 212, '动得越快，反方向推得越多', 'sv-s') +
  /* I: area under the error */
  `<line x1="580" y1="150" x2="790" y2="150" class="sv-l-ink" style="stroke-width:1"/><line x1="580" y1="150" x2="580" y2="40" class="sv-l-ink" style="stroke-width:1"/>` +
  `<path d="M580 150 L580 80 C620 82 640 100 680 108 S760 112 790 112 L790 150 Z" class="sv-fill-acc" opacity=".25"/>` +
  `<path d="M580 80 C620 82 640 100 680 108 S760 112 790 112" class="sv-l-acc"/>` +
  S.text(586, 48, '误差 e', 'sv-s', 'start') + S.text(790, 168, '时间', 'sv-s', 'end') + S.text(690, 136, '∫e dt = 面积', 'sv-n') +
  S.text(685, 192, 'I 积分：像记账', 'sv-t') + S.text(685, 212, '差了多久、差多少都记下来，慢慢补上', 'sv-s'),
  'P 看误差，D 看速度，I 看误差的累计');

/* ---------- figure: the demo's model run offline, three presets, 0.5 kg attached at t = 5 s ---------- */
const rP = sim(6, 0, 0, 1.0, 5, 10), rPD = sim(6, 4, 0, 1.0, 5, 10), rPID = sim(6, 4, 4, 1.0, 5, 10);
const pan = (x0, data, title, c) => S.plot(x0, 0, 272, 230, { title, x: [0, 10], y: [0.5, 2.5], xu: 's', xt: [0, 5, 10], yt: [0.5, 1, 1.5, 2, 2.5],
  series: [{ pts: data, c }], hl: [{ v: 1.5, c: 'warn' }] }) + `<line x1="${x0 + 44 + 110}" y1="26" x2="${x0 + 44 + 110}" y2="204" class="sv-l-soft" stroke-dasharray="2 3" style="stroke-width:1"/>` +
  S.text(x0 + 44 + 114, 200, '挂 0.5 kg', 'sv-s', 'start');
const figResp = S.svg(820, 232,
  pan(0, rP, '只用 P（Kp 6）', 'bad') + pan(274, rPD, 'P + D（Kd 4）', 'b') + pan(548, rPID, 'PID（Ki 4）', 'acc'),
  '三种预设：从 1.0 m 飞到 1.5 m，第 5 秒挂上 0.5 kg');

/* ---------- walkthrough diagrams ---------- */
const Z0 = 610, SC = 80;   /* zero line x, px per m/s² */
const TERMS = [['P 项', '6 × 0.3', 1.8, 'acc'], ['I 项', '4 × 0.05', 0.2, 'acc'], ['D 项', '−4 × 0.4', -1.6, 'b'], ['合计', '× 2.74 kg = 1.10 N', 0.4, 'warn']];
function scene(load, zq, note, noLab) {
  const y = z => 200 - z * 110;
  return `<line x1="30" y1="${y(0)}" x2="300" y2="${y(0)}" class="sv-l-grid"/>` +
    `<line x1="30" y1="${y(1.5)}" x2="300" y2="${y(1.5)}" class="sv-l-warn" stroke-dasharray="6 5"/>` + S.text(34, y(1.5) - 6, '目标 1.5 m', 'sv-s warn', 'start') +
    S.quad(150, y(zq), 0, 40, {}) + (load ? `<line x1="150" y1="${y(zq) + 6}" x2="150" y2="${y(zq) + 26}" class="sv-l-soft"/><rect x="141" y="${y(zq) + 26}" width="18" height="14" class="sv-fill-warn"/>` : '') +
    (noLab ? '' : S.text(100, y(zq) + 5, zq.toFixed(2) + ' m', 'sv-n', 'end')) + (note || '');
}
function bars(k) {
  let b = `<line x1="${Z0}" y1="20" x2="${Z0}" y2="200" class="sv-l-ink" style="stroke-width:1"/>` + S.text(Z0, 214, '0', 'sv-s') + S.text(800, 214, '想要的加速度 m/s²', 'sv-s', 'end');
  TERMS.forEach((r, i) => {
    const yy = 30 + i * 44, on = i <= k, x0 = Math.min(Z0, Z0 + r[2] * SC), w = Math.abs(r[2] * SC);
    b += S.text(350, yy + 17, r[0], on ? 'sv-t' : 'sv-s', 'start');
    if (on) b += `<rect x="${x0}" y="${yy}" width="${w}" height="24" rx="3" class="sv-fill-${r[3]}" opacity="${i === k ? 0.9 : 0.5}"/>` +
      S.text(r[2] > 0 ? Z0 + r[2] * SC + 6 : Z0 + r[2] * SC - 6, yy + 17, (r[2] > 0 ? '+' : '') + r[2].toFixed(1), 'sv-n', r[2] > 0 ? 'start' : 'end') +
      S.text(r[2] > 0 ? Z0 - 8 : Z0 + 8, yy + 17, r[1], 'sv-s', r[2] > 0 ? 'end' : 'start');
  });
  return b;
}
const vArrow = S.arrow(215, 100, 215, 60, { c: 'b', label: '0.4 m/s 向上', side: 'right' });
const stepPID = k => S.svg(820, 230, scene(false, 1.2, vArrow) + bars(k), 'PID 各项');
const thrustBar = (parts, note) => {
  const x0 = 60, sc = 700 / Tmax; let x = x0, b = `<rect x="${x0}" y="80" width="700" height="34" rx="5" class="sv-box"/>`;
  parts.forEach(p => { b += `<rect x="${x.toFixed(1)}" y="80" width="${(p[0] * sc).toFixed(1)}" height="34" class="sv-fill-${p[1]}" opacity=".75"/>` + S.text(x + p[0] * sc / 2, p[3] ? 142 : 70, p[2], p[3] ? 'sv-n' : 'sv-t'); x += p[0] * sc; });
  return S.svg(820, 230, b + S.text(760, 142, '最大 52.4 N', 'sv-s', 'end') + S.text(410, 190, note, 'sv-t'), '推力组成');
};
const ffBar = thrustBar([[W, 'acc', '悬停前馈 m·g = 26.88 N'], [1.10, 'warn', '+1.10 N', 1]], '合计 27.98 N，约占最大推力的 53%');
const areaFig = (() => {
  const x0 = 380, y0 = 180, sx = 330 / 0.18, sy = 300;
  return S.svg(820, 230, scene(false, 1.2, vArrow) +
    `<line x1="${x0}" y1="${y0}" x2="790" y2="${y0}" class="sv-l-ink" style="stroke-width:1"/><line x1="${x0}" y1="${y0}" x2="${x0}" y2="30" class="sv-l-ink" style="stroke-width:1"/>` +
    `<path d="M${x0} ${y0} L${x0} ${y0 - 0.45 * sy} C${x0 + 60} ${y0 - 0.42 * sy} ${x0 + 120} ${y0 - 0.33 * sy} ${x0 + 160} ${y0 - 0.3 * sy} L${x0 + 160} ${y0} Z" class="sv-fill-acc" opacity=".25"/>` +
    `<rect x="${x0 + 160}" y="${y0 - 0.3 * sy}" width="${0.008 * sx}" height="${0.3 * sy}" class="sv-fill-warn" opacity=".8"/>` +
    S.text(x0 + 80, y0 - 20, '已有 0.05', 'sv-n') + S.text(x0 + 182, y0 - 0.3 * sy + 18, '+ 0.3 × 0.008 = 0.0024', 'sv-nw', 'start') +
    S.text(x0 + 6, 42, '误差 e', 'sv-s', 'start') + S.text(790, y0 + 16, '时间', 'sv-s', 'end') + S.text(x0 + 182, y0 - 0.3 * sy + 44, '新累加值 0.0524 m·s', 'sv-t', 'start'),
    '积分更新');
})();
const loadPD = S.svg(820, 230, scene(true, 1.2,
  S.arrow(240, 200 - 1.5 * 110, 240, 200 - 1.2 * 110 - 2, { c: 'bad', label: '低 30 cm', side: 'right' })) +
  S.text(380, 60, '多出的重力：0.5 × 9.81 = 4.9 N', 'sv-t', 'start') + S.text(380, 92, '前馈不知道，只能靠 P 项：', 'sv-s', 'start') +
  S.text(380, 118, '2.74 × 6 × e = 4.9 N', 'sv-n', 'start') + S.text(380, 146, 'e = 4.9 ÷ 16.4 ≈ 0.30 m', 'sv-n', 'start') +
  S.text(380, 180, '误差不为 0 才有力：永远低一截', 'sv-s bad', 'start'), '挂上 0.5 kg，只用 P + D');
const pidLoad = sim(6, 4, 4, 1.5, 0, 6);
const loadPID = S.svg(820, 230, scene(true, 1.5, S.text(150, 120, '稳定后回到 1.50 m', 'sv-n'), 1) +
  S.plot(360, 0, 460, 228, { title: '挂上 0.5 kg 后的高度（PID）', x: [0, 6], y: [1.1, 1.6], xu: 's', yt: [1.2, 1.3, 1.4, 1.5], series: [{ pts: pidLoad, c: 'acc' }], hl: [{ v: 1.5, c: 'warn' }] }) +
  S.text(560, 190, '最低约 1.25 m，约 3 s 回到 2 cm 以内', 'sv-s', 'start'), '挂上 0.5 kg，PID');
const noFF = S.svg(820, 230,
  `<line x1="30" y1="200" x2="300" y2="200" class="sv-l-grid"/><line x1="30" y1="35" x2="300" y2="35" class="sv-l-warn" stroke-dasharray="6 5"/>` + S.text(34, 29, '目标 1.5 m', 'sv-s warn', 'start') +
  S.quad(150, 192, 0, 40, {}) + S.text(150, 222, '落在地面上', 'sv-s bad') +
  S.arrow(250, 35, 250, 194, { c: 'bad', label: '最大误差 1.5 m', side: 'right' }) +
  S.text(380, 60, '没有前馈：26.88 N 全靠 P 项', 'sv-t', 'start') + S.text(380, 92, '2.74 × 6 × e = 26.88 N', 'sv-n', 'start') +
  S.text(380, 120, 'e = 9.81 ÷ 6 ≈ 1.6 m', 'sv-n', 'start') + S.text(380, 156, '可目标离地面只有 1.5 m，误差到不了 1.6 m', 'sv-s bad', 'start') +
  S.text(380, 180, '→ 推力永远不够，一直落到地上', 'sv-s bad', 'start'), '关掉前馈');

/* ---------- figure: gains too high (same model) ---------- */
const rOK = sim(6, 4, 0, 1.0, 99, 4), rHot = sim(40, 1, 0, 1.0, 99, 4);
const figHot = S.svg(820, 240,
  S.plot(0, 0, 820, 240, { title: '从 1.0 m 飞到 1.5 m', x: [0, 4], y: [0.6, 2.4], xu: 's', yt: [1, 1.5, 2],
    series: [{ pts: rOK, c: 'acc', label: '温和' }, { pts: rHot, c: 'bad', label: '调太猛' }], hl: [{ v: 1.5, c: 'warn' }] }),
  '增益太大时一直上下晃');

/* ---------- figure: link to lesson 1, and where this goes next ---------- */
const figLink = S.svg(820, 250,
  S.text(140, 22, '第 1 课', 'sv-s b') + S.text(470, 22, '这一课', 'sv-s acc') + S.text(730, 22, '后面', 'sv-s') +
  S.box(30, 36, 220, 56, '旋钮：总推力', '四个桨一起加减', 'b') + S.box(330, 36, 280, 56, 'PID 自动算出总推力该多大', '每秒 125 次', 'hl') +
  S.box(30, 110, 220, 56, '悬停用 51% 推力', '26.9 N 托住重量', 'b') + S.box(330, 110, 280, 56, '前馈 m·g = 26.88 N', '事先算好直接给', 'hl') +
  S.box(30, 184, 220, 56, '手动拨桨几乎停不住', '人手太慢', 'b') + S.box(330, 184, 280, 56, '反馈：测 → 比 → 算，马上重复', 'P、I、D', 'hl') +
  [64, 138, 212].map(y => S.arrow(250, y, 328, y, { c: 'acc' })).join('') +
  S.box(670, 36, 130, 56, '第 3 课', '水平方向也一层层用') + S.box(670, 110, 130, 56, '第 4 课', '测量值从哪来') + S.box(670, 184, 130, 56, '第 8 课', '更快地抗干扰') +
  [64, 138, 212].map(y => S.arrow(610, y, 668, y, { dash: 1 })).join(''),
  '第 1 课给出旋钮，这一课决定旋钮拧多少');

el.innerHTML = `
<p class="lede">上一课你试过：直接拨两个桨，几乎没法让它停在空中。飞控的办法是每秒上百次地“看一眼差多少，算出该怎么改”。这叫<span class="term">反馈控制</span>，最常用的形式叫 PID。</p>

<h2>反馈：看误差，改动作</h2>
${K.fig(figLoop, '只看高度：目标 1.5 m，测到 1.2 m，<span class="term">误差</span> = 1.5 − 1.2 = 0.3 m。差得多就多推，超过了就少推，然后马上重复。')}
${K.more('展开：多快重复一次', `<p>${K.ours('', `外面的位置控制器通常每秒重复几十到上百次（例如 125 次）；PX4 最里面的角速度环更快，真机上通常每秒几百到上千次（取决于飞控板和参数）。`)}</p>`)}

<h2>PID 的三项</h2>
<div class="formula">推力 = 悬停推力 m·g + m × ( K<sub>p</sub>·e + K<sub>i</sub>·∫e dt − K<sub>d</sub>·v )
<div class="where">e：高度误差（m）；∫e dt：误差随时间的累加；v：上下速度（向上为正）；K<sub>p</sub>、K<sub>i</sub>、K<sub>d</sub>：三个可调的<span class="term">增益</span>。</div></div>
${K.fig(figTerms, '三项各看一样东西。P 把它拉向目标，D 给 P 踩刹车，I 消掉一直存在的偏差。最前面的 m·g 不属于 PID，叫<span class="term">前馈</span>：重力事先知道，就直接给，不用等掉下去再去“挣”。')}
${K.fig(figResp, '用下面实验的同一个模型跑出来：<b>只用 P</b> 停不下来（电机有延迟，还越晃越大）；<b>P + D</b> 很快停稳，但挂上 0.5 kg 后低了一截；<b>PID</b> 挂上以后几秒内又回到 1.5 m。')}
${K.more('展开：三项的对照表和几点说明', `<div class="tblwrap"><table class="tbl">
<tr><th>项</th><th>它做什么</th><th>生活里的类比</th><th>只有它会怎样</th></tr>
<tr><td><b>P</b> 比例</td><td>误差越大，推得越猛</td><td>一根弹簧，把你拉向目标</td><td>来回晃，停不下来：没有东西让它减速（这里不计空气阻力；真实飞机的阻力会让晃动慢慢减小一些，但通常不足以代替 D）</td></tr>
<tr><td><b>D</b> 微分</td><td>速度越快，越往反方向用力</td><td>汽车减震器，或者快到路口提前踩刹车</td><td>单独用只会让它慢下来，不会把它拉回目标；它的作用是给 P “刹车”，减少过冲</td></tr>
<tr><td><b>I</b> 积分</td><td>误差一直存在，就一直往上加力</td><td>记账：差了多久、差了多少都记下来，慢慢补上</td><td>单独用很难稳住：反应慢，又容易晃；一般和 P、D 一起用</td></tr>
</table></div>
<ul><li>D 项本来是“误差变化有多快”。目标高度不动时，误差变化率正好等于 −v，所以这里直接写成 −K<sub>d</sub>·v。</li>
<li>增益的单位分别是 1/s²、1/s³、1/s，括号里那一项是加速度（m/s²），再乘质量就是力（N）。</li>
<li>前馈的一般原则：事先知道、而且能算准的力，用前馈直接给；反馈负责不知道的部分和前馈算不准的部分。后面每一课都会用到。</li></ul>`)}

<h2>具体算一遍</h2>
<div id="walk2"></div>
<div id="d2"></div>

<h2>为什么调参难</h2>
${K.fig(figHot, '同一个模型：<b>温和</b> = K<sub>p</sub> 6、K<sub>d</sub> 4；<b>调太猛</b> = K<sub>p</sub> 40、K<sub>d</sub> 1。电机从收到指令到推力真的上来要约 30 ms，等推力上来机身已经冲过头，于是反向猛推，一直上下晃。<b>延迟</b>（还有传感器噪声）限制了增益能调多大。')}
${K.more('展开：噪声和稳态误差', `<p>增益越大，传感器噪声也被放大得越多，这是限制增益的另一个常见原因。挂上物体以后前馈给的悬停推力不够，P 项要靠误差来补，于是稳稳地低一截，这叫<span class="term">稳态误差</span>。积分项能消掉它，但需要时间（在这个实验的增益下要几秒）。机械臂抓东西、风一直吹都会造成这种问题，第 8 课会专门讲更快的办法。延迟也和第 3 课“为什么要分层”有关。</p>`)}

<h2>和第 1 课的关系</h2>
${K.fig(figLink, '第 1 课告诉你手里有哪个旋钮（总推力），这一课决定每一刻把它拧到多少。同样的思路第 3 课会一层层套到水平方向上。')}

<div class="key"><h3>这一课记住三件事</h3><ul>
<li>反馈 = 测误差 → 算动作 → 马上重复。</li>
<li>P 拉向目标，D 负责刹车，I 消掉一直存在的偏差。</li>
<li>已知的力用前馈直接给，反馈管未知的部分。延迟（还有噪声）限制了增益能调多大。</li>
</ul></div>
<h2>小测验</h2><div id="q2"></div>`;

K.steps(el.querySelector('#walk2'), { title: '用数字走一遍：目标 1.5 m，现在 1.2 m，正以 0.4 m/s 上升，累加值 0.05 m·s', steps: [
  { svg: stepPID(-1), t: '用实验里“PID”预设：m = 2.74 kg，K<sub>p</sub> = 6，K<sub>i</sub> = 4，K<sub>d</sub> = 4，每 0.008 s 算一次。先算<b>误差</b>：e = 1.5 − 1.2 = <b>0.3 m</b>。' },
  { svg: stepPID(0), t: '<b>P 项</b>：6 × 0.3 = <b>+1.8 m/s²</b>。离目标还远，往上推。' },
  { svg: stepPID(1), t: '<b>I 项</b>：4 × 0.05 = <b>+0.2 m/s²</b>。过去一直偏低，再多补一点。' },
  { svg: stepPID(2), t: '<b>D 项</b>：−4 × 0.4 = <b>−1.6 m/s²</b>。已经在快速上升，提前刹车。' },
  { svg: stepPID(3), t: '<b>相加</b>：1.8 + 0.2 − 1.6 = <b>+0.4 m/s²</b>，乘质量 2.74 kg 得 <b>+1.10 N</b>。P 想猛推，D 把大部分抵消了。' },
  { svg: ffBar, t: '<b>加上悬停前馈</b> m·g = 2.74 × 9.81 = 26.88 N，最终推力指令 <b>27.98 N</b>，约占最大推力 52.4 N 的 53%。只比悬停多推 1.1 N，这就是“刹车”。' },
  { svg: areaFig, t: '<b>更新累加值</b>，留给下一次：0.05 + 0.3 × 0.008 = <b>0.0524 m·s</b>。0.008 s 以后，用新的高度和速度再算一遍。' },
  { svg: loadPD, t: '<b>挂上 0.5 kg，只用 P + D</b>：稳定后速度为 0，D 项为 0。多出的 4.9 N 只能靠 P 项：e = 4.9 ÷ (2.74 × 6) ≈ <b>0.30 m</b>。它会稳在比目标低 30 cm 的地方（<span class="term">稳态误差</span>）。' },
  { svg: loadPID, t: '<b>挂上 0.5 kg，用 PID</b>：积分一直累加，直到 I 项单独补足 4.9 N，即 ∫e dt = 4.9 ÷ (2.74 × 4) ≈ <b>0.45 m·s</b>，这时 e 回到 0。实验模型里最低掉到约 1.25 m，约 3 秒回到 2 cm 以内。' },
  { svg: noFF, t: '<b>关掉前馈</b>：整整 26.88 N 都要靠 P 项，需要 e = 9.81 ÷ 6 ≈ <b>1.6 m</b>。目标只有 1.5 m 高，误差最大也就 1.5 m，所以它一直落到地面上。' },
] });

const d = K.demo(el.querySelector('#d2'), '动手', '只管高度的 PID',
  '依次点“只用 P”“P + D”“PID”三个预设，每次点“挂上 0.5 kg”看看高度会怎样。再试试“调太猛”和关掉悬停前馈。读数栏实时显示四项各给了多少牛，可以和上面的算例对照。');
const cvs = K.box(d, 'cvs');
const cvA = K.canvas(cvs, 1.0, 260), cvB = K.canvas(cvs, 0.8, 260);
const ctl = K.box(d, 'controls'), ro = K.box(d, 'readout');
const st = { z: 1.5, vz: 0, T: W, I: 0 };
let t = 0, load = false;
const hb = K.buf(12);
const sKp = K.slider(ctl, { id: 'l2-kp', label: 'Kp 比例', min: 0, max: 40, step: 0.5, value: 6 });
const sKd = K.slider(ctl, { id: 'l2-kd', label: 'Kd 微分', min: 0, max: 12, step: 0.25, value: 0 });
const sKi = K.slider(ctl, { id: 'l2-ki', label: 'Ki 积分', min: 0, max: 15, step: 0.5, value: 0 });
const sZ = K.slider(ctl, { id: 'l2-z', label: '目标高度', min: 0.5, max: 3, step: 0.1, value: 1.5, fmt: v => v.toFixed(1) + ' m' });
const ff = K.seg(ctl, { label: '悬停前馈 m·g', options: [['1', '开'], ['0', '关']], value: '1' });
const br = K.box(ctl, 'btnrow');
const bl = K.btn(br, '挂上 0.5 kg', () => { load = !load; bl.textContent = load ? '取下物体' : '挂上 0.5 kg'; });
K.btn(br, '重来', () => { Object.assign(st, { z: 1.5, vz: 0, T: W, I: 0 }); t = 0; hb.clear(); });
const pr = K.box(ctl, 'btnrow');
[['只用 P', 6, 0, 0], ['P + D', 6, 4, 0], ['PID', 6, 4, 4], ['调太猛', 40, 1, 0]].forEach(([n, p, dd, i]) => K.btn(pr, n, () => { sKp.set(p); sKd.set(dd); sKi.set(i); st.I = 0; }));
K.loop(dt => {
  K.sub(dt, 0.002, h => { pidStep(st, h, sKp.v, sKd.v, sKi.v, sZ.v, ff.v === '1', load); t += h; });
  const z = st.z, vz = st.vz, T = st.T, I = st.I;
  hb.push(t, z, sZ.v, T / Tmax * 100);
  const c = K.col();
  const a = cvA.fit(), ctx = a.ctx, v = K.view(a.w, a.h, -1.2, 1.2, -0.1, 3.6, 10);
  K.grid(ctx, v, c, 1);
  ctx.strokeStyle = c.warn; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(v.X(-1.2), v.Y(sZ.v)); ctx.lineTo(v.X(1.2), v.Y(sZ.v)); ctx.stroke(); ctx.setLineDash([]);
  K.text(ctx, '目标', v.X(-1.15), v.Y(sZ.v) - 5, c.warn);
  const zz = Math.min(z, 3.5), f = T / Tmax;
  K.drawQuad(ctx, v.X(0), v.Y(zz), 0, v.s * 1.5, { thrust: [f, f] });
  if (load) { ctx.strokeStyle = c.soft; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(v.X(0), v.Y(zz) + 6); ctx.lineTo(v.X(0), v.Y(zz) + 34); ctx.stroke(); ctx.fillStyle = c.warn; ctx.fillRect(v.X(0) - 9, v.Y(zz) + 34, 18, 16); }
  const b = cvB.fit(), w = K.win(t, 10);
  K.plot(b.ctx, 0, 0, b.w, b.h * 0.6, { title: '高度', unit: 'm', x: w, y: [0, 3.5], series: [{ buf: hb, i: 2, color: c.warn, dash: [6, 4], label: '目标' }, { buf: hb, i: 1, color: c.acc, label: '实际' }], xfmt: x => x.toFixed(0) + 's' });
  K.plot(b.ctx, 0, b.h * 0.6, b.w, b.h * 0.4, { title: '推力', unit: '占最大值 %', x: w, y: [0, 100], series: [{ buf: hb, i: 3, color: c.b, label: '推力' }], hl: [{ v: 51, color: c.soft, label: '悬停 51%' }], xfmt: x => x.toFixed(0) + 's' });
  const e = sZ.v - z;
  ro.innerHTML = `<span>高度误差 <b class="${Math.abs(e) > 0.05 ? 'hot' : 'good'}">${(e * 100).toFixed(0)} cm</b></span><span>上下速度 <b>${vz.toFixed(2)} m/s</b></span><span>前馈 <b>${(ff.v === '1' ? m * K.g : 0).toFixed(1)} N</b></span><span>P 项 <b>${(m * sKp.v * e).toFixed(1)} N</b></span><span>I 项 <b>${(m * sKi.v * I).toFixed(1)} N</b></span><span>D 项 <b>${(-m * sKd.v * vz).toFixed(1)} N</b></span><span>推力指令合计（限幅前） <b>${((ff.v === '1' ? m * K.g : 0) + m * (sKp.v * e + sKi.v * I - sKd.v * vz)).toFixed(1)} N</b></span><span>挂物体后理论上 P+D 会低 <b>${sKp.v > 0 ? (0.5 * K.g / (m * sKp.v) * 100).toFixed(0) + ' cm' : '—'}</b></span>`;
});

K.box(d, 'assume', '<b>这个实验做了哪些简化：</b>只有竖直一个方向；控制器直接读真实高度和速度，没有噪声和延迟（真实飞机要靠第 4 课的状态估计得到它们）；电机用约 30 ms 的一阶延迟近似；不计空气阻力；积分项加了限幅；为了画面平滑，实验里控制器每 0.002 s 算一次，比真实的 125 Hz（每 0.008 s）更频繁。上面的图和“挂上 0.5 kg”的数字都是用这个模型离线跑出来的。');

K.quiz(el.querySelector('#q2'), 'l2', [
  { q: '只用 P 的时候，无人机上下一直晃，停不下来。缺的是哪一项？', o: ['P 不够大', 'D：负责刹车', 'I：负责记账', '前馈'], a: 1,
    e: 'P 只会把它往目标拉，到了目标附近速度还很大，于是冲过头。D 看速度，快到目标时往反方向用力，相当于刹车。' },
  { q: '用 K<sub>p</sub> = 6、K<sub>d</sub> = 4（不用 I）：误差 0.3 m，正以 0.4 m/s 上升。括号里算出的加速度是多少？', o: ['+3.4 m/s²', '+1.8 m/s²', '+0.2 m/s²', '−1.6 m/s²'], a: 2,
    e: 'P 项 6 × 0.3 = 1.8，D 项 −4 × 0.4 = −1.6，相加 +0.2 m/s²。再乘质量、加上前馈 m·g，才是推力指令。' },
  { q: '挂上物体以后，高度一直比目标低一截。靠哪一项把它消掉？', o: ['P', 'D', 'I', '把目标设高一点'], a: 2,
    e: '误差一直在，积分就一直累加，推力越补越多，直到误差归零。代价是需要时间（这个实验里要几秒）。' },
  { q: '为什么要单独加一个“悬停推力 m·g”的前馈？', o: ['因为重力事先就知道，没必要等出现误差再去补', '为了让增益可以调小', '为了防止电机过热', '没什么用，P 会自己补上'], a: 0,
    e: '关掉前馈时，P + D 要靠误差来“挣”这份推力：需要 9.81 ÷ 6 ≈ 1.6 m 的误差，会一直掉到地上。事先知道、又能算准的力，一般都用前馈直接给。' },
  { q: '把 K<sub>p</sub> 调到 40，反而晃得更厉害。根本原因是什么？', o: ['传感器坏了', '电机有延迟，猛推之后等推力上来已经冲过头了', '重力变了', '积分太大'], a: 1,
    e: '控制器的指令要过几十毫秒才变成真的推力（这个实验里电机延迟约 30 ms）。增益越大，每次修正越猛，延迟造成的过冲也越大。所以延迟是限制增益上限的主要原因之一。' },
]);
} });
