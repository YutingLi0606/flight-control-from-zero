K.add({ id: 'rw2', num: 'R2', title: '精读 2：抗风与自适应', sub: 'INDI、L1、Neural-Fly、GP-MPC、Neural-Lander：未知的力怎么估出来', render(el) {
const S = K.S;

/* ---------- local helpers ---------- */
const plat = rows => `<div class="tblwrap"><table class="tbl">${rows.map(([k, v]) => `<tr><th style="width:7.5em">${k}</th><td>${v}</td></tr>`).join('')}</table></div>`;
const one = (t, cite) => `<div class="idea"><h3>一句话</h3><p>${t}</p><p style="color:var(--soft);font-size:14px;margin:0">${cite}</p></div>`;
const numCls = c => c === 'acc' ? 'sv-n' : c === 'warn' ? 'sv-nw' : c === 'b' ? 'sv-nb' : c === 'bad' ? 'sv-s bad' : 'sv-s';
function bars(x0, y0, w, items, o) {
  o = o || {}; const lw = o.lw || 200, rh = o.rh || 30, bw = w - lw - 110;
  let b = o.title ? S.text(x0, y0 + 14, o.title, 'sv-t', 'start') : '';
  const top = y0 + (o.title ? 26 : 0);
  items.forEach((it, i) => {
    const y = top + i * rh, L = it.v == null ? 0 : Math.max(2, it.v / o.max * bw);
    b += S.text(x0 + lw - 10, y + rh / 2 + 4, it.l, 'sv-s', 'end');
    if (it.v != null) b += `<rect x="${x0 + lw}" y="${y + 6}" width="${L.toFixed(1)}" height="${rh - 12}" rx="3" class="sv-fill-${it.c || 'soft'}"/>`;
    b += S.text(x0 + lw + L + 8, y + rh / 2 + 5, it.t || String(it.v) + (o.u || ''), numCls(it.c), 'start');
  });
  return b;
}
const panel = (x, y, lines, cur) => lines.map((l, i) => S.text(x, y + i * 26, l, i === cur ? 'sv-n' : 'sv-s', 'start')).join('');
const ref = (h, t) => `<a href="#${h}">${t}</a>`;

/* ---------- overview: one framework, different estimators of the unknown force ---------- */
const EX = [20, 220, 420, 620], EN = [['积分器', '∫ 误差 dt', 'PX4、PID', ''], ['直接测量', '加速度计 − 已知推力', 'INDI（Smeur）', 'hl'], ['在线自适应', '预测误差 → 估计', 'L1（L1Quad）', 'hl'], ['学习的模型', 'φ(x)·â、DNN、GP', 'NF、Lander、GP-MPC', 'hl']];
const figMap = S.svg(820, 300,
  S.text(410, 22, '风、阵风、地效、载荷 → 在平动方程里都是一个未知外力 f_ext', 'sv-t') +
  `<rect x="20" y="36" width="780" height="34" rx="8" class="sv-box"/>` + S.text(410, 58, '可用信号：位置 / 速度误差、加速度计、发出去的推力、状态 x', 'sv-s') +
  EX.map((x, i) => S.arrow(x + 90, 70, x + 90, 92) + S.box(x, 94, 180, 76, EN[i][0], EN[i][1], EN[i][3]) + S.text(x + 90, 188, EN[i][2], i ? 'sv-s acc' : 'sv-s warn')).join('') +
  EX.map(x => S.path([[x + 90, 196], [x + 90, 214], [410, 214], [410, 228]], { c: 'acc' })).join('') +
  S.box(250, 230, 320, 46, '估计值 f̂ → 力指令里减掉', 'f_cmd = m(a_ref − Kp·e − Kd·ė + g) − f̂', 'hl on') +
  S.text(410, 296, '慢 ← 积分器 · 测量 · 自适应 · 学习 → 越来越依赖“扰动长什么样”的先验', 'sv-s'),
  '残差外力估计：四类方法只在估计 f̂ 的那一格不同');

/* ================= 1. Smeur INDI ================= */
function smFig(mode) {
  const cas = mode === '18';
  let b = S.box(10, 60, 130, 56, cas ? '位置 PD' : '飞手 / 外环', cas ? '→ 想要的加速度' : '→ 想要的姿态') + S.arrow(140, 88, 168, 88) +
    (cas ? S.box(170, 60, 170, 56, '外环 INDI', 'Δ(φ, θ, T) 来自加速度差', 'hl on') : S.box(170, 60, 170, 56, '姿态 PD', '→ 想要的角加速度')) +
    S.arrow(340, 88, 368, 88, { c: cas ? 'acc' : 'soft' }) +
    S.box(370, 60, 180, 56, '内环 INDI', 'Δ转速 = G⁻¹(ν − 测到的 Ω̇)', 'hl') + S.arrow(550, 88, 578, 88, { c: 'acc' }) +
    S.box(580, 60, 110, 56, '电机', '512 Hz') + S.arrow(690, 88, 708, 88) + S.box(710, 60, 100, 56, '飞机', '+ 扰动') +
    S.path([[760, 116], [760, 150], [460, 150], [460, 118]], { c: 'acc', label: '陀螺差分 Ω̇ + 转速（同一滤波器）', lx: 610, ly: 168 });
  if (cas) b += S.path([[790, 116], [790, 196], [255, 196], [255, 118]], { c: 'acc', label: '加速度计（已含风力）', lx: 520, ly: 214 });
  b += S.text(410, 30, cas ? '2018：外环也用增量，风力在加速度计里直接被看到' : '2016：只在姿态内环用增量，并用 LMS 在线修正控制效率 G', 'sv-t');
  return S.svg(820, 225, b, cas ? 'Smeur 2018 级联 INDI' : 'Smeur 2016 姿态 INDI');
}
const smStep = k => {
  let b = S.quad(170, 140, k >= 2 ? 0 : k === 1 ? 6 : 0, 80, { fl: 50, fr: 50 }) +
    `<rect x="${170 + 60}" y="${150}" width="18" height="16" rx="2" class="sv-fill-warn"/>` + S.text(240, 190, '42.5 g，距重心约 11 cm', 'sv-s warn');
  const L = ['重物落入 → 重心前移', '俯仰力矩 = 0.0425 × 9.81 × 0.11', '= 0.046 N·m（阶跃，一直存在）', 'INDI：下一拍就测到 Ω̇ 变了 → 直接加转速', 'PID：要等俯仰角出现误差，积分再累加', 'PID 回零约 1.5 s，约是 INDI 的 5 倍'];
  const n = [3, 3, 4, 6][k];
  return S.svg(820, 220, b + panel(400, 40, L.slice(0, n), n - 1), 'Smeur 2016 阶跃力矩第 ' + (k + 1) + ' 步');
};
const figSmR = S.svg(820, 166, bars(0, 0, 820, [
  { l: '风洞射流 · 进 / 出 · INDI', v: 0.21, c: 'acc', t: '0.21 / 0.20 m' }, { l: '风洞射流 · PID', v: 1.51, c: 'warn', t: '1.51 m' },
  { l: '户外起飞（平均风 5.1 m/s）· INDI', v: 0.24, c: 'acc', t: '0.24 m' }, { l: '户外起飞 · PID', v: 0.85, c: 'warn', t: '0.85 m' },
], { max: 1.6, lw: 250, title: '最大位置偏差（Smeur 2018；风洞 7 次平均，户外 PID 12 次、INDI 12 次有效）' }), 'Smeur 2018 结果');

/* ================= 2. L1Quad ================= */
const figL1 = S.svg(820, 240,
  S.box(10, 60, 140, 60, '几何控制', 'Lee 式 SE(3)') + S.arrow(150, 90, 188, 90, { label: 'u_b' }) +
  `<circle cx="205" cy="90" r="14" class="sv-box"/>` + S.text(205, 95, '+', 'sv-t') + S.arrow(219, 90, 258, 90, { c: 'acc' }) +
  S.box(260, 60, 140, 60, '飞机', '+ 未知力 / 力矩 σ') +
  S.path([[400, 90], [440, 90], [440, 160], [416, 160]], { c: 'soft', label: '测到的 v, Ω', lx: 446, ly: 130, anchor: 'start' }) +
  S.box(250, 135, 165, 50, '① 状态预测器', '名义模型 + 当前 σ̂', 'hl') +
  S.arrow(250, 160, 222, 160, { c: 'acc' }) + S.box(60, 135, 160, 50, '② 自适应律', '由预测误差直接解 σ̂', 'hl') +
  S.path([[140, 185], [140, 215], [470, 215], [470, 205]], { c: 'acc' }) +
  S.box(470, 140, 180, 60, '③ 低通 C(s)', '推力 30、力矩 5 / 15 rad/s', 'hl on') +
  S.path([[560, 140], [560, 30], [205, 30], [205, 74]], { c: 'acc', label: 'u_L1 = −C(s)·σ̂', lx: 380, ly: 24 }) +
  S.text(740, 92, '估计可以极快，', 'sv-s acc') + S.text(740, 112, '送进电机的补偿', 'sv-s acc') + S.text(740, 132, '只放低频部分', 'sv-s acc'),
  'L1 自适应三件套：预测器、自适应律、低通滤波，叠加在几何控制上');
const L1_L = ['挂上 200 g：σ = −0.2 × 9.81 = −1.962 N', '一个周期 T_s = 2.5 ms 后：实际速度 −0.00779 m/s', '预测器（还以为 σ̂ = 0）预测 0 → 误差 ṽ = 0.00779', 'σ̂ = −m·exp(A_s·T_s)·ṽ / Φ = −1.950 N（Φ = 0.002484）', '低通 30 rad/s：约 33 ms 送进 63%，100 ms 送进 95%'];
const l1Step = k => {
  let b = S.quad(150, 110, 0, 70, { fl: 45, fr: 45 }) + `<line x1="150" y1="118" x2="150" y2="160" class="sv-l-ink"/>` +
    `<rect x="138" y="160" width="24" height="20" rx="3" class="sv-fill-warn"/>` + S.text(150, 200, '200 g，0.63 kg 的飞机', 'sv-s warn');
  return S.svg(820, 225, b + panel(380, 40, L1_L.slice(0, k + 1), k), 'L1 第 ' + (k + 1) + ' 步');
};
const L1G = [['100 g', 0.004, 0.044, 0.003], ['200 g', 0.004, 0.125, 0.006], ['300 g', 0.007, null, 0.02]];
const figL1R = S.svg(820, 330, bars(0, 0, 820, L1G.flatMap(([w, a, b2, p]) => [
  { l: w + ' · L1 开', v: a, c: 'acc', t: a + ' m' }, { l: w + ' · L1 关', v: b2, c: b2 == null ? 'bad' : 'b', t: b2 == null ? '坠机' : b2 + ' m' }, { l: w + ' · PID', v: p, c: 'warn', t: p + ' m' }]), { max: 0.13, lw: 140, rh: 32, title: '左前电机下挂偏心重物，稳态误差（L1Quad Table II；10–12 s 平均）' }), 'L1Quad 偏心挂重稳态误差');

/* ================= 3. Neural-Fly ================= */
function nfFig(mode) {
  const off = mode === 'off';
  let b;
  if (off) {
    b = S.box(10, 50, 190, 70, '6 种恒定风 × 2 min', '0–6.1 m/s，共 36,000 点') + S.arrow(200, 85, 248, 85, { label: '(x, y)' }) +
      S.box(250, 40, 230, 90, 'DAIML 训练 φ(x)\n（元学习）', '一批解 a*，另一批更新 φ', 'hl on') +
      S.arrow(480, 85, 518, 85, { c: 'acc' }) + S.box(520, 50, 170, 70, '共享基 φ(x)', '11→50→60→50→4', 'hl') +
      S.box(250, 160, 230, 56, '判别器 h', '从 φ(x) 猜“第几种风”', 'b') +
      S.arrow(365, 158, 365, 132, { c: 'b', label: 'φ 要让 h 猜不出', side: 'right' }) +
      S.text(755, 78, '谱归一化：', 'sv-s') + S.text(755, 98, '限制 Lipschitz', 'sv-s') +
      S.text(410, 238, 'x = 速度 3 + 四元数 4 + 电机 PWM 指令 4 = 11 维；y = 残差力（测得加速度 − 名义模型 − 控制力）', 'sv-s');
  } else {
    b = S.box(10, 60, 150, 60, '参考 8 字', '2.5 × 1.5 m，6.28 s/圈') + S.arrow(160, 90, 198, 90) +
      S.box(200, 60, 180, 60, '非线性跟踪 + PD', 'u = … − K·s − φ(x)·â', 'hl') + S.arrow(380, 90, 418, 90, { c: 'acc', label: '力' }) +
      S.box(420, 60, 150, 60, '力 → 姿态 + 推力', '50 Hz，RPi4，Python', 'hl') + S.arrow(570, 90, 608, 90, { c: 'acc', label: 'MAVROS' }) +
      S.box(610, 60, 200, 60, 'PX4 原厂姿态环', '默认参数、默认频率', 'px') +
      S.path([[710, 120], [710, 200], [290, 200], [290, 122]], { c: 'acc', label: '复合自适应：每步更新 12 个数 â（P 自动调增益）', lx: 500, ly: 194 }) +
      S.text(410, 30, '在线：φ 固定不动，只调 â = 三轴 × 4 = 12 维“风况坐标”', 'sv-t');
  }
  return S.svg(820, 250, b, off ? 'Neural-Fly 离线 DAIML' : 'Neural-Fly 在线自适应');
}
const W = [0, 4.2, 8.5, 12.1];
const NFR = { 非线性: [11.9, 10.7, 16.3, 23.9], L1: [4.6, 5.8, 12.1, 22.7], INDI: [7.3, 6.4, 8.5, 10.7], NF: [3.2, 4.0, 5.8, 9.4] };
const nfPlot = S.plot(0, 0, 560, 270, { title: '8 字 RMS 误差 vs 风速（cm）', x: [0, 13], y: [0, 25], xu: '', xt: [0, 4.2, 8.5, 12.1], yt: [0, 5, 10, 15, 20, 25],
  series: [{ pts: W.map((w, i) => [w, NFR['非线性'][i]]), c: 'warn', label: '非线性' }, { pts: W.map((w, i) => [w, NFR.L1[i]]), c: 'b', dash: 1, label: 'L1' }, { pts: W.map((w, i) => [w, NFR.INDI[i]]), c: 'b', label: 'INDI' }, { pts: W.map((w, i) => [w, NFR.NF[i]]), c: 'acc', label: 'NF' }] });
const sxN = v => 44 + v / 13 * (560 - 8 - 44);
const figNFR = S.svg(820, 290, nfPlot +
  `<line x1="${sxN(6.1)}" y1="26" x2="${sxN(6.1)}" y2="244" class="sv-l-soft" stroke-dasharray="4 4"/>` + S.text(sxN(6.1) + 6, 236, '训练最高 6.1 m/s → 右边全是外推', 'sv-s', 'start') +
  S.text(560 + 30, 60, '12.1 m/s（最强风）', 'sv-t', 'start') +
  panel(590, 88, ['非线性 23.9', 'L1 22.7', 'INDI 10.7', 'Neural-Fly 9.4', '正弦风 8.5 + 2.4 sin t：', 'INDI 11.1 · NF 7.6'], 3) +
  S.text(590, 270, '单位 cm；每条件每方法 1 次飞行', 'sv-s', 'start'),
  'Neural-Fly 表 1：四种方法的 RMS 误差随风速变化');
const NF_T = [
  { l: ['摘要：比非线性好 66%，比 L1 好 42%，比 INDI 好 35%', '这几个百分比是怎么来的？论文没写平均方式。'], t: '<b>先看头条数字</b>：论文说平均比 INDI 好 35%。我们用表 1 复算一遍，看它到底说了什么。' },
  { l: ['相对 INDI，逐个风况（mean 误差）：', '0 m/s 54% · 4.2 m/s 37% · 8.5 m/s 35%', '12.1 m/s 14% · 正弦 33%', '五个平均 = 34.7% ≈ 35%'], t: '<b>逐个风况算提升再平均</b>，得到 34.7%（对非线性、L1 同样算得 67%、42%），和论文的 35% / 66% / 42% 吻合。所以“35%”是五种风况的平均，<b>零风那一格贡献最大</b>。' },
  { l: ['12.1 m/s：RMS 10.7 → 9.4 cm（−12%）', 'mean 10.1 → 8.7 cm（−14%）', '差 1.3–1.4 cm；作者说定位精度约 1 cm'], t: '<b>最强风下</b>只好 12–14%，绝对差 1.3–1.4 cm，和作者自己说的定位精度（约 1 cm）是一个量级。INDI 是最难超越的经典基线。' },
  { l: ['NF-Constant（φ 换成常数，同样的自适应律）', '12.1 m/s：12.7 cm，比 INDI 的 10.7 还差', 'NF（学到的 φ）：9.4 cm'], t: '<b>学到的表示有没有用</b>：把 φ 换成常数（相当于卡尔曼式扰动观测器），强风和正弦风下反而不如 INDI。差距 12.7 → 9.4 cm 就是学到的 φ 的贡献。' },
];
const nfStep = k => S.svg(820, 130, panel(30, 36, NF_T[k].l, NF_T[k].l.length - 1), 'Neural-Fly 表 1 读法第 ' + (k + 1) + ' 步');

/* ================= 4. GP-MPC ================= */
const figGP = S.svg(820, 230,
  S.box(10, 40, 160, 60, '名义 MPC 先飞', '记录状态和指令') + S.arrow(170, 70, 188, 70) +
  S.box(190, 40, 220, 60, '残差标签', 'a_e = (实测 v − 预测 v) / δt', 'hl') + S.arrow(410, 70, 428, 70, { c: 'acc' }) +
  S.box(430, 40, 180, 60, '3 个 GP', '每轴一个，20 个诱导点', 'hl') + S.arrow(610, 70, 648, 70, { c: 'acc' }) +
  S.box(650, 40, 160, 60, 'GP 均值', '加进 MPC 的动力学', 'hl on') +
  S.path([[730, 100], [730, 140], [562, 140]], { c: 'acc' }) +
  S.box(380, 120, 180, 56, 'MPC（笔记本 50 Hz）', '求解约 4–5 ms', 'hl') + S.arrow(380, 148, 302, 148, { c: 'acc', label: 'CTBR' }) +
  S.box(140, 120, 160, 56, '机载 PID', '跟踪角速度', 'px') +
  S.text(410, 214, '对照组：同一个 MPC，只把 GP 换成线性转子阻力（RDRv，Faessler 式）', 'sv-s b'),
  'GP-MPC：从飞行数据学加速度残差，放进 MPC 的预测模型');
const GPB = [['0–2', 0.197, 0.132, 0.060], ['2–4', 0.346, 0.287, 0.078], ['4–6', 0.564, 0.381, 0.141], ['6–8', 0.837, 0.463, 0.219], ['8–10', 0.912, null, 0.379]];
const gx = i => 110 + i * 140, gy = v => 240 - v * 200;
const figGPR = S.svg(820, 300,
  S.text(0, 16, '加竖直阻力板（非线性气动）时的圆轨迹 RMSE，按速度段（Torrente 2021 Table III）', 'sv-t', 'start') +
  [0, 0.25, 0.5, 0.75, 1].map(v => `<line x1="60" y1="${gy(v)}" x2="810" y2="${gy(v)}" class="sv-l-grid"/>` + S.text(54, gy(v) + 4, v.toFixed(2), 'sv-s', 'end')).join('') +
  GPB.map(([r, n, d, g], i) => [[n, 'warn', 0], [d, 'b', 1], [g, 'acc', 2]].map(([v, c, j]) => {
    const x = gx(i) + j * 34;
    return v == null ? S.text(x + 14, 236, '坠机', 'sv-s bad') :
      `<rect x="${x}" y="${gy(v).toFixed(1)}" width="28" height="${(v * 200).toFixed(1)}" class="sv-fill-${c}"/>` + S.text(x + 14, gy(v) - 5, v.toFixed(2), c === 'acc' ? 'sv-n' : 'sv-s');
  }).join('') + S.text(gx(i) + 48, 260, r + ' m/s', 'sv-s')).join('') +
  `<rect x="200" y="276" width="14" height="12" class="sv-fill-warn"/>` + S.text(220, 287, '名义 MPC', 'sv-s', 'start') +
  `<rect x="330" y="276" width="14" height="12" class="sv-fill-b"/>` + S.text(350, 287, '线性阻力 RDRv', 'sv-s', 'start') +
  `<rect x="490" y="276" width="14" height="12" class="sv-fill-acc"/>` + S.text(510, 287, 'GP-MPC', 'sv-s', 'start') + S.text(56, 30, 'm', 'sv-s', 'end'),
  'GP-MPC 在阻力板配置下各速度段的误差');

/* ================= 5. Neural-Lander ================= */
const figNL = S.svg(820, 230,
  S.box(10, 40, 170, 60, '飞手手飞约 350 s', '前 250 s 覆盖各高度') + S.arrow(180, 70, 208, 70, { label: '标签' }) +
  S.box(210, 40, 240, 60, 'f_a = m·v̇ − m·g − R·f_u', '名义推力用台架测的 c_T', 'hl') + S.arrow(450, 70, 478, 70, { c: 'acc' }) +
  S.box(480, 40, 200, 60, 'ReLU 网络 f̂_a', '4 个隐层，12 维 → 3 维', 'hl on') +
  S.text(750, 64, '谱归一化：', 'sv-s acc') + S.text(750, 84, 'Lipschitz 有上界', 'sv-s acc') +
  S.path([[580, 100], [580, 150], [432, 150]], { c: 'acc', label: '输入：高度、速度、姿态、上一步指令', lx: 592, ly: 176, anchor: 'start' }) +
  S.box(230, 125, 200, 52, '期望力 = 名义项 − f̂_a', '前馈抵消地效', 'hl') + S.arrow(230, 151, 202, 151, { c: 'acc' }) +
  S.box(10, 125, 190, 52, '不动点迭代解 u', 'u(k) = B₀⁻¹·η(u(k−1))') +
  S.text(410, 214, '谱归一化同时保证：网络输出平滑（外推不乱跳）+ 迭代收敛 + 闭环稳定性证明', 'sv-s'),
  'Neural-Lander：学地效残差力，作前馈抵消');
const figNLR = S.svg(820, 200, bars(0, 0, 820, [
  { l: '跨桌椭圆 · z · 基线', v: 0.153, c: 'warn', t: '0.153 m' }, { l: '跨桌椭圆 · z · Neural-Lander', v: 0.027, c: 'acc', t: '0.027 m' },
  { l: '跨桌椭圆 · x · 基线', v: 0.126, c: 'warn', t: '0.126 m' }, { l: '跨桌椭圆 · x · Neural-Lander', v: 0.079, c: 'acc', t: '0.079 m' },
  { l: '跨桌椭圆 · y · 基线', v: 0.061, c: 'warn', t: '0.061 m' }, { l: '跨桌椭圆 · y · Neural-Lander', v: 0.052, c: 'acc', t: '0.052 m' },
], { max: 0.17, lw: 230, rh: 28, title: '平均误差，椭圆一部分在桌面上方（周期 10 s；Neural-Lander Fig. 5b）' }), 'Neural-Lander 跨桌结果');

el.innerHTML = `
<p class="lede">上一页的基线大多“只靠反馈”。这一页的五篇都在做同一件事：把风、地效、载荷这些看不见的力<b>估出来再抵消</b>，区别只在怎么估。先看总图，再一篇篇看。</p>
${K.fig(figMap, '四类估计方法共用同一个外环：只有“怎么得到 f̂”那一格不同。这也是 Neural-Fly 做公平对比的方式' + K.ours('') + '。GP-MPC 稍有不同：学到的残差放进 MPC 的预测模型里，而不是直接减掉。')}
${K.more('展开：匹配与不匹配（为什么延迟限制所有方法）', `<p>把总推力向量当输入时，平动外力是“匹配”的：估出来直接减掉。但四旋翼欠驱动，水平力只能靠倾斜机身产生，所以抵消要经过姿态环、角速度环和电机的滞后。机械臂带来的力矩落在姿态通道，${K.ours('', `对只发角速度（CTBR）的外环来说`)}是“不匹配”的。这两点决定了任何方法都受延迟和带宽限制（推断，依据见 ${ref('l7', '第 8 课')}）。</p>`)}

<h2>1 · Smeur 等 2016 / 2018：INDI（增量非线性动态逆）</h2>
${one('不去建模“扰动为什么是这么大”，而是直接测出当前的角加速度（2016）和线加速度（2018），按“想要的 − 测到的”增量地改指令；只需要知道控制效率 G。', 'E. J. J. Smeur, Q. Chu, G. C. H. E. de Croon，J. Guidance, Control, and Dynamics 2016（Article in Advance 版全文）；Smeur, de Croon, Chu，Control Engineering Practice 73:79–90, 2018（arXiv 1701.07254 全文）。')}
${plat([['飞机', 'Parrot Bebop（2016：396.2 g）'], ['传感', '机载 IMU 512 Hz + 电机转速；2018 位置用 OptiTrack，但故意只以 4 Hz 发给飞机，模拟 GPS'], ['控制接口', '一直到电机指令（替换了姿态 / 角速度环）'], ['计算', 'Paparazzi 开源飞控，控制 512 Hz'], ['仿真 / 真机', '真机：2016 阶跃力矩；2018 TU Delft 开口射流风洞（2.85 × 2.85 m，设 10 m/s）+ 户外']])}
<div id="segSm"></div><div id="figSm"></div>
<div id="wSm"></div>
${K.fig(figSmR, '风洞实验：每 14 s 在射流中心和 2 m 外两点之间往返，相当于反复穿过一阵强阵风。INDI 偏 0.2 m、3 s 内纠正；PID 偏 1.51 m，差 7 倍以上。PID 基线也用 INDI 姿态内环，只有外环不同。')}
<div class="warnbox"><b>局限：</b>2016 只有时间曲线、没有统计；2018 的指标是<b>最大偏差</b>，不能和 RMS 混用；稳定风里 INDI 每次飞行之间方差比 PID 大（作者归因于加速度计噪声）；内环要转速反馈。</div>
${K.ours('', `<p>先复习 ${ref('l7', '第 8 课')}。</p>`)}
${K.more('出处：Smeur 这一节', `<ul><li>2016：396.2 g、512 Hz、42.5 g 重物、距重心约 11 cm、PID 约 1.5 s、“约是 INDI 的 5 倍”、不用风扇的理由（不可重复、幅值未知）：JGCD 论文第 V-B 节。INDI 约 0.3 s 是我们由“5 倍”推算的，不是论文数字。力矩 0.046 N·m 是我们算的。</li>
<li>2018：2.85 × 2.85 m、10 m/s、14 s、2 m、4 Hz、512 Hz、0.21 m（进，2.0 s）/ 0.20 m（出，16.6 s）、3 s 内纠正、PID 1.51 m、7 次平均：arXiv 1701.07254 v2 第 6 节；户外平均风 5.1 m/s（荷兰气象局 KNMI）、PID 12 次、INDI 13 次（剔除 1 次估计未收敛）、0.24 vs 0.85 m：同文户外起飞实验。</li>
${K.ours('', `<li>注：增益表与正文 K_Ω、K_η 不一致（论文自身问题）。</li>`)}</ul>`)}

<h2>2 · L1Quad（Wu 等 2025）：L1 自适应增广几何控制</h2>
${one('在 Lee 式几何控制上叠一层 L1：预测器 + 自适应律把所有不确定性当成未知力和力矩快速估出来，低通滤波只把低频部分送进执行器；一套参数应付 11 类不确定性。', 'Z. Wu, S. Cheng 等（N. Hovakimyan 组），IEEE T-CST 33(2):597–612, 2025（arXiv 2302.07208 v2 全文）。')}
${plat([['飞机', '0.63 kg 5 寸机（参数表写 0.62 kg）'], ['传感', 'Vicon，经 WiFi 50 Hz 发给飞控，与 IMU 在 ArduPilot EKF 中融合'], ['控制接口', '<b>力矩级</b>：几何控制 + L1 跑在飞控内部，替换了姿态 / 角速度环'], ['计算', 'Pixhawk 4 mini，改过的 ArduPilot 固件，400 Hz'], ['仿真 / 真机', '真机：注入推力扰动、晃水瓶、断桨、地效、下洗、偏心挂重等 11 类；<b>没有风扇 / 风洞</b>']])}
${K.fig(figL1, 'L1 和一般自适应控制的关键区别在第 ③ 步：估计 σ̂ 可以每个周期刷新，但补偿要过低通，所以“适应快”和“不振荡”不再互相牵制。')}
<div id="wL1"></div>
${K.fig(figL1R, 'L1 开的稳态误差都在 7 mm 以内；关掉 L1 的几何控制在 300 g 时坠机。但 PID 的稳态误差和 L1 差不多（100 g 时更小）：L1 的优势主要在恢复时间（100 g：0.77 s vs PID 1.56 s）和快变的大扰动。断 1/4 桨时 1 m 圆 RMSE 4.5 cm，关掉 L1 坠机。')}
<div class="warnbox"><b>局限：</b>没有任何风实验；稳态精度不比 PID 好；改了飞控固件（需要力矩权限）；大多每格一次。</div>
${K.ours('', `<p>先复习 ${ref('l7', '第 8 课')}、${ref('l5', '第 6 课')}。</p>`)}
${K.more('出处：L1 这一节（含 L1-NMPC）', `<ul><li>0.63 kg（正文）/ 0.62 kg（参数表）、Pixhawk 4 mini、ArduPilot、400 Hz、Vicon WiFi 50 Hz、T_s = 0.0025 s、A_s = −diag(5, 5, 5, 10, 10, 10)、截止频率推力 30 rad/s、力矩 5 / 15 rad/s、Table II（稳态误差与整定时间）、断桨 0.045 m：arXiv 2302.07208 v2 第 VI 节、参数表与 Table II。</li>
<li>走一遍是我们的一维简化：只看竖直平动，把 200 g 当成恒定外力，用分段常数自适应律 σ̂ = −m·exp(A_s·T_s)·ṽ / Φ，Φ = (exp(A_s·T_s) − 1)/A_s，参数取自上面的论文值；数字在 node 复算。估计值 −1.950 与真值 −1.962 的小差别来自离散化。</li>
<li>同一思路加在 NMPC 上：Hanover 等，IEEE RA-L 2022（arXiv 2109.04210 全文）。仿真 +660 g 时 NMPC 0.434–0.532 m vs L1-NMPC 0.007–0.032 m；实机 450 g 未知载荷 z 稳态 &lt; 1 cm vs 非自适应 MPC &gt; 35 cm；10 m/s 圆：GP-MPC 0.203、INDI-NMPC 0.048、L1-NMPC 0.047 m。${K.ours('', `L1 加在单旋翼推力上，只发 CTBR 的接口只能做简化版。`)}</li></ul>`)}

<h2>3 · Neural-Fly（O'Connell 等 2022，Science Robotics）</h2>
${one('假说：不同风况下的气动残差力共享同一个依赖状态的表示 φ(x)，风况只是 12 个线性系数 a。离线用 12 分钟数据学 φ，飞行中只在线调 a，于是能像自适应控制一样快、又有稳定性保证。', 'M. O\'Connell, G. Shi, X. Shi, K. Azizzadenesheli, A. Anandkumar, Y. Yue, S.-J. Chung，Science Robotics 7(66), eabm6597, 2022（arXiv 2205.06908 含补充材料全文）。')}
${plat([['飞机', '2.6 kg（补充材料表 S1 为 2.53 kg），推重比 2.2，Pixhawk 4 + <b>原厂 PX4</b>'], ['传感', 'OptiTrack 12 相机（正文 50 Hz，表 S2 写 100 Hz）+ PX4 EKF；定位精度约 1 cm；无转速反馈'], ['控制接口', '位置环在机载电脑上 50 Hz（Python），经 MAVROS 发<b>姿态 + 推力</b>给 PX4 默认姿态环'], ['计算', 'Raspberry Pi 4；执行 + 通信延迟至少 15 ms、常到 30 ms'], ['仿真 / 真机', '真机：Caltech 1296 风扇风洞（最高 12.1 m/s）+ 户外（GPS，风 ≤ 4.9 m/s）']])}
${K.fig(S.svg(820, 120,
  S.box(20, 30, 190, 60, '残差气动力 f(x, w)', '状态 x，风况 w') + S.text(240, 66, '≈', 'sv-big') +
  S.box(270, 30, 200, 60, 'φ(x)', '所有风况共享（离线学）', 'hl') + S.text(495, 66, '×', 'sv-big') +
  S.box(520, 30, 200, 60, 'a(w)', '12 个数（在线估）', 'px') + S.text(760, 66, '补充材料 S2', 'sv-s') + S.text(760, 84, '证明存在', 'sv-s'),
  'Neural-Fly 的假说：残差力 = 共享基 × 风况系数'), '把问题拆成“慢的、共享的”（φ）和“快的、低维的”（a）两部分。论文证明任何解析的 f(x, w) 都能这样分解，所以关键是能不能用很少的数据学到好的 φ。')}
<div id="segNF"></div><div id="figNF"></div>
<div class="formula">u = M·q̈_r + C·q̇_r + g − K·s − φ(x)·â　　s = q̃̇ + Λ·q̃<br>â̇ = −λ·â − P·φᵀR⁻¹(φ·â − y) + P·φᵀ·s<br>Ṗ = −2λP + Q − P·φᵀR⁻¹φ·P<div class="where">第一式：把非线性基线 PID 的积分项换成学习项 φ(x)â。第二式三项：正则（防漂移）、预测误差项（比较 φâ 和实测残差力 y，像卡尔曼滤波）、跟踪误差项（像模型参考自适应）。P 像卡尔曼协方差，自动调增益。理论：误差指数收敛到一个球，半径正比于表示误差 + 噪声，以及风变化有多快。</div></div>
${K.fig(figNFR, '所有方法共用同一套 P、D 增益（在 1 m 阶跃上用非线性基线调好），积分 / 自适应增益各自调到刚出现明显超调或振荡为止，L1 和 INDI 由此用了 5 Hz 一阶滤波。L1 弱风最好、强风退化；INDI 强风下稳。户外 GPS 微风下 8 字 RMS 8.2 cm、mean 7.5 cm。')}
<div id="wNF"></div>
<div class="warnbox"><b>局限：</b>每个风况每个方法只飞一次；只有风扇设定值，没有风速计和湍流度；网络输入用了 4 路电机 PWM${K.ours('', `（只发总推力指令的接口拿不到）`)}；闭环控制器代码未公开；正文与补充材料的质量、动捕频率不一致。</div>
${K.ours('', `<p>先复习 ${ref('l7', '第 8 课')}、${ref('l14', '第 14 课')}。</p>`)}
${K.more('出处：Neural-Fly 这一节', `<ul><li>12 分钟、6 种静风各 2 分钟（0 / 1.3 / 2.5 / 3.7 / 4.9 / 6.1 m/s）、50 Hz、36,000 点、桌面训练约 5 分钟、11 维输入、11 → 50 → 60 → 50 → 4、ReLU、谱归一化、‖a*‖ ≤ γ、三轴共用 φ（a 共 12 维）、判别器 h：arXiv 2205.06908 v2 正文“Offline learning”、Algorithm 1 与实现细节。</li>
<li>2.6 kg / 推重比 2.2、RPi4、MAVROS、50 Hz、OptiTrack 50 Hz（正文）、定位约 1 cm、延迟 15–30 ms：正文实验设置与讨论；2.53 kg、100 Hz：补充材料表 S1 / S2（论文自身不一致）。</li>
<li>表 1 全部数字、8 字 2.5 × 1.5 m、6.28 s、1 热身 + 6 圈、风速 0 / 4.2 / 8.5 / 12.1 m/s 与 8.5 + 2.4 sin(t)：正文“Trajectory tracking performance”与表 1；户外 8.2 / 7.5 cm、风 ≤ 17 km/h（4.9 m/s）：正文与 Fig. 7；增益整定与 5 Hz 滤波：补充材料 S6。66% / 42% / 35%：摘要与引言。</li>
<li>走一遍里的逐风况百分比与“五个平均 ≈ 35%”是我们用表 1 复算的（node）；论文没写平均方式，所以“它是五种风况的平均”是推断。</li></ul>`)}

<h2>4 · Torrente 等 2021：GP-MPC（数据驱动 MPC）</h2>
${one('名义模型在高速时不准；用高斯过程从飞行数据学出“预测的加速度和实际差多少”，只留 20 个诱导点，就能放进实时 MPC。', 'G. Torrente, E. Kaufmann, P. Foehn, D. Scaramuzza，IEEE RA-L 6(2):3769–3776, 2021（arXiv 2102.05773 全文）。')}
${plat([['飞机', '0.8 kg，推重比 5'], ['传感', '动捕（实机）；仿真中用真值里程计'], ['控制接口', '<b>CTBR</b>：笔记本上的 MPC 50 Hz 经无线电发总推力 + 机体角速度，机载 PID 跟踪'], ['计算', '笔记本；20 个诱导点时每次求解约 4–5 ms'], ['仿真 / 真机', '仿真 + 真机；摘要：最高 14 m/s、超过 4 g，高速时误差最多降 70%']])}
${K.fig(figGP, '每个 GP 的输入是机体速度，输出是该轴的加速度残差。它学的是“动力学残差”，控制器仍然是 MPC；对照组只换动力学模型，其他都不变。')}
${K.fig(figGPR, '默认配置下 GP 和线性阻力几乎打平（实机圆：名义 319.7 → GP 172.9 / RDRv 168.3 mm），因为这台紧凑的飞机主要就是线性转子阻力。加一块竖直阻力板制造非线性气动后，GP 在每个速度段都明显更好，线性模型在 8–10 m/s 坠机。')}
<div class="warnbox"><b>局限：</b>只在机体速度上建模（没有风、没有地效）；后来同组的 INDI-NMPC 和 L1-NMPC 都明显更好（Hanover 2022，10 m/s 圆：GP-MPC 0.203 m vs 0.048 / 0.047 m）。</div>
${K.ours('', `<p>先复习 ${ref('l8', '第 9 课')}。</p>`)}
${K.more('出处：GP-MPC 这一节', `<ul><li>0.8 kg、推重比 5:1、50 Hz CTBR、机载 PID、20 个诱导点、4–5 ms、Table II（319.7 / 172.9 / 168.3 mm）、Table III（阻力板各速度段）：arXiv 2102.05773 第 V 节。14 m/s、4 g、70%：摘要（仿真与实机合称）。</li>
<li>Hanover 2022 的 0.203 / 0.048 / 0.047 m：arXiv 2109.04210 表格（同组平台，非同一实验）。</li></ul>`)}

<h2>5 · Neural-Lander（Shi 等 2019）：学地效</h2>
${one('贴地时地效带来额外升力，名义控制器落不到地；用一个带谱归一化的网络学这部分残差力作前馈，既能落准，又能证明闭环稳定。', 'G. Shi, X. Shi, M. O\'Connell, R. Yu, K. Azizzadenesheli, A. Anandkumar, Y. Yue, S.-J. Chung，ICRA 2019（arXiv 1811.08027 全文）。Neural-Fly 同一团队的前作。')}
${plat([['飞机', 'Intel Aero，1.47 kg，机载 Linux（Atom）'], ['传感', '17 相机动捕，位置 / 姿态 / 速度 100 Hz'], ['控制接口', '位置控制器约 10 Hz 给出期望力 → 机载姿态控制（&gt; 100 Hz）和电机'], ['计算', '机载；网络前向在环内'], ['仿真 / 真机', '真机：起飞 / 降落；靠近桌面的椭圆轨迹']])}
${K.fig(figNL, '训练数据只有飞手手飞的一条约 350 s 的连续轨迹：前 250 s 在 0.05–1.5 m 各个高度，后 100 s 随机运动（顺带学到空气阻力）。跨桌实验另采一组近桌数据，并把 x、y 位置加进输入。')}
${K.fig(figNLR, '降落：基线终点高度误差 0.13 m（悬在地面上方落不下去），Neural-Lander 约为 0，x、y 漂移最多降 90%。越过桌边时地效突然消失，z 误差 0.153 → 0.027 m。没加谱归一化的网络在实验中会输出异常指令导致坠机。')}
<div class="warnbox"><b>局限：</b>对照只有名义非线性控制器（作者也试了带积分的版本，称对积分增益敏感），没有和观测器 / INDI 比；没有风；数据只覆盖一种飞机和一种表面。</div>
${K.ours('', `<p>先复习 ${ref('l7', '第 8 课')}、${ref('l14', '第 14 课')}。</p>`)}
${K.more('展开：近表面气动还知道什么（只到摘要级）', `<ul><li>地效、顶效：旋翼离地面或天花板小于约 1 个旋翼直径时推力明显增大；顶效更陡，贴近时会把飞机“吸”上去${K.ours('', `（Hsiao & Chirarattananon 等，摘要级）`)}。</li>
<li>壁效有冲突：Sanchez-Cuevas 等认为可忽略；另一项 2018 年研究（只看过检索摘要）称近侧壁推力下降并有朝壁的滚转力矩。${K.ours('', `无法判断哪方更可信。`)}</li>
<li>这些都没有核到原文数字，所以页面上不列具体推力比。</li></ul>`)}
${K.more('出处：Neural-Lander 这一节', `<ul><li>1.47 kg、17 相机、100 Hz、约 10 Hz 位置控制、&gt; 100 Hz 姿态、约 350 s（0–250 s：0.05–1.5 m；250–350 s 随机运动）、4 个全连接隐层、输入 12 维 / 输出 3 维、谱归一化、不动点迭代 u_k = B₀⁻¹η_d(u_{k−1})、0.13 m → 0、最多 90%、0.153 → 0.027、x 0.126 → 0.079、y 0.061 → 0.052、无谱归一化导致坠机、跨桌模型加入 x-y 位置：arXiv 1811.08027 第 III–VI 节与 Fig. 5b。</li></ul>`)}

<h2>五篇放在一起</h2>
<div class="tblwrap"><table class="tbl">
<tr><th>论文</th><th>平台</th><th>接口</th><th>仿真 / 真机</th><th>学 / 估计什么</th><th>代表结果（不可横比）</th></tr>
<tr><td>Smeur 2016 / 2018 INDI</td><td>Bebop，约 0.4 kg</td><td>电机指令（全栈）</td><td>真机</td><td>不学；直接测加速度 / 角加速度</td><td>10 m/s 射流最大偏差 0.21 vs PID 1.51 m</td></tr>
<tr><td>L1Quad 2025</td><td>0.63 kg</td><td>力矩级（改 ArduPilot）</td><td>真机，无风</td><td>在线估未知力和力矩</td><td>300 g 偏心挂重稳态 0.007 m（L1 关坠机）</td></tr>
<tr><td>Neural-Fly 2022</td><td>2.6 kg，原厂 PX4</td><td>姿态 + 推力 50 Hz</td><td>真机风洞</td><td>离线 φ(x) + 在线 12 维 a</td><td>12.1 m/s 风 9.4 cm（INDI 10.7）</td></tr>
<tr><td>GP-MPC 2021</td><td>0.8 kg</td><td>CTBR 50 Hz</td><td>仿真 + 真机</td><td>GP 学加速度残差，进 MPC 模型</td><td>阻力板 8–10 m/s：0.379 m（线性模型坠机）</td></tr>
<tr><td>Neural-Lander 2019</td><td>1.47 kg</td><td>期望力 ~10 Hz</td><td>真机</td><td>离线 DNN 学地效，无在线适应</td><td>跨桌 z 误差 0.153 → 0.027 m</td></tr>
</table></div>

<div class="key"><h3>这一页记住三件事</h3><ul>
<li>五篇都是“估出未知力再抵消”，只是估法不同：直接测（INDI）、在线自适应（L1）、离线学形状 + 在线调系数（Neural-Fly）、学残差放进模型（GP-MPC、Neural-Lander）。</li>
<li>Neural-Fly 的“比 INDI 好 35%”是五种风况的平均；最强风下只好约 12–14%（1.3–1.4 cm），INDI 是最难超越的经典基线。</li>
<li>INDI、L1Quad 的最好数字都依赖替换飞控内环（转速反馈或力矩权限）；经原厂 PX4 只能复现它们的平动 / 外环部分。</li>
</ul></div>
<h2>小测验</h2><div id="qrw2"></div>`;

/* toggles */
const fSm = el.querySelector('#figSm');
const drawSm = v => { fSm.innerHTML = K.fig(smFig(v), v === '18' ? '2018 把同样的增量思想推到位置环：加速度计已经“感受到”风，外环直接补。内外环必须用同一个滤波器，推力增量才对得上。' : '2016：角加速度来自陀螺差分再滤波，转速也过同一个滤波器做时间对齐；控制效率 G 用 LMS 在线估计（换桨、加护桨时自动修正）。'); };
K.seg(el.querySelector('#segSm'), { label: '看哪一篇', options: [['16', '2016：姿态 INDI'], ['18', '2018：级联 INDI']], value: '18', on: drawSm }); drawSm('18');
const fNF = el.querySelector('#figNF');
const drawNF = v => { fNF.innerHTML = K.fig(nfFig(v), v === 'off' ? '离线（DAIML）：每一步都模仿“在线适应”——用一批数据解出这一风况的最优 a*，再用另一批数据检验，梯度穿过 a* 更新 φ。判别器逼 φ 不去记“这是哪种风”，只编码和风无关的结构。' : '在线：φ 不再变，只调 12 个数 â，和控制同频。注意力指令最后经 MAVROS 交给原厂 PX4 姿态环' + K.ours('') + '。'); };
K.seg(el.querySelector('#segNF'), { label: '哪个阶段', options: [['off', '离线：学 φ'], ['on', '在线：调 a']], value: 'off', on: drawNF }); drawNF('off');

K.steps(el.querySelector('#wSm'), { title: '用数字走一遍 Smeur 2016 的扰动实验：悬停时往机头前的盒子里丢一个重物', steps: [
  { svg: smStep(0), t: '<b>扰动</b>：42.5 g 落进离重心约 11 cm 的盒子，重心前移，产生俯仰力矩 0.0425 × 9.81 × 0.11 ≈ <b>0.046 N·m</b>。它是阶跃，之后一直存在。作者特意不用风扇：不可重复、幅值未知。' },
  { svg: smStep(1), t: '<b>INDI</b>：下一个控制周期（1/512 s）就测到角加速度变了，增量律直接加转速差去顶住。不需要先出现角度误差。' },
  { svg: smStep(2), t: '<b>PID</b>：只能等俯仰角真的偏了，P、D 先反应，积分再慢慢补上这个一直存在的力矩。' },
  { svg: smStep(3), t: '<b>结果</b>：PID 约 <b>1.5 s</b> 才把俯仰角拉回零，论文说约是 INDI 的 <b>5 倍</b>（即 INDI 约 0.3 s，我们推算）。论文只给了时间曲线，没有重复统计。' },
] });
K.steps(el.querySelector('#wL1'), { title: '用数字走一遍 L1（一维简化）：0.63 kg 的飞机悬停时突然挂上 200 g', steps: [
  { svg: l1Step(0), t: '<b>未知力</b>：挂上 200 g，相当于向下多了 <b>1.962 N</b>。控制器不知道。' },
  { svg: l1Step(1), t: '<b>一个周期后</b>（L1Quad 用 T_s = 2.5 ms）：真实速度变成 −3.11 m/s² × 0.0025 s = <b>−0.00779 m/s</b>。' },
  { svg: l1Step(2), t: '<b>① 预测器</b>还以为没有扰动，预测速度 0。预测误差 ṽ = <b>0.00779 m/s</b>：这就是“模型和现实差了多少”的证据。' },
  { svg: l1Step(3), t: '<b>② 分段常数自适应律</b>（A_s = −5）：一步就把误差全部归因到扰动上，σ̂ = <b>−1.950 N</b>，和真值 −1.962 N 几乎一样。估计是瞬间的。' },
  { svg: l1Step(4), t: '<b>③ 低通</b>（推力通道 30 rad/s）：补偿不是一下全加，约 33 ms 加到 63%、100 ms 加到 95%。快估计 + 慢执行，这就是 L1 不容易振荡的原因。' },
] });
K.steps(el.querySelector('#wNF'), { title: '用表 1 的数字读懂“比 INDI 好 35%”', steps: NF_T.map((s, k) => ({ svg: nfStep(k), t: s.t })) });

K.quiz(el.querySelector('#qrw2'), 'rw2', [
  { q: 'Neural-Fly 在线飞行时，到底在更新什么？', o: ['整个神经网络 φ 的权重', '只有 12 个线性系数 â，φ 固定不动', 'PX4 姿态环的增益', '风速计读数'], a: 1,
    e: 'φ(x) 离线用 DAIML 学好就不动了；在线只用复合自适应律更新 â（三轴 × 4 = 12 维），所以能和控制环同频、还能给稳定性保证。' },
  { q: 'L1 自适应里低通滤波 C(s) 的作用是什么？', o: ['让估计变慢', '估计 σ̂ 可以很快，但只把低频部分送进执行器，避免高频振荡', '滤掉位置噪声', '代替积分器'], a: 1,
    e: '这让“适应速度”和“鲁棒性”解耦：自适应律一步就能估出 σ̂（走一遍里 −1.950 N），补偿则按 30 rad/s 的带宽逐渐加上。' },
  { q: '为什么 Smeur 2018 的“0.21 m vs 1.51 m”不能直接和 Neural-Fly 表 1 的厘米数比较？', o: ['单位不同', '一个是穿越射流时的最大偏差，一个是 8 字整圈的 RMS / mean；车、风场、定位也都不同', 'Smeur 用了仿真', 'Neural-Fly 没有风'], a: 1,
    e: '指标定义不同（峰值 vs RMS）、扰动形式不同（空间阶跃阵风 vs 均匀风）、平台不同（0.4 kg Bebop 全栈 vs 2.6 kg 经原厂 PX4）。只能各自看相对自家 PID / 基线的变化。' },
]);
} });
