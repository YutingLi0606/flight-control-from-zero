K.add({ id: 'rw1', num: 'R1', title: '精读 1：经典控制基线', sub: 'PX4、SE(3)、平坦 + 阻力、INDI、NMPC 对比：每篇做了什么、测出了什么', render(el) {
const S = K.S;

/* ---------- local helpers ---------- */
const plat = rows => `<div class="tblwrap"><table class="tbl">${rows.map(([k, v]) => `<tr><th style="width:7.5em">${k}</th><td>${v}</td></tr>`).join('')}</table></div>`;
const one = (t, cite) => `<div class="idea"><h3>一句话</h3><p>${t}</p><p style="color:var(--soft);font-size:14px;margin:0">${cite}</p></div>`;
const numCls = c => c === 'acc' ? 'sv-n' : c === 'warn' ? 'sv-nw' : c === 'b' ? 'sv-nb' : c === 'bad' ? 'sv-s bad' : 'sv-s';
/* horizontal bar chart; items: [{l: label, v: value, c: colour, t: value text}] */
function bars(x0, y0, w, items, o) {
  o = o || {}; const lw = o.lw || 200, rh = o.rh || 30, bw = w - lw - 100;
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

/* ---------- overview: where each baseline sits in the control stack ---------- */
const ROWS = ['轨迹 / 前馈', '位置 → 想要的加速度', '加速度 → 倾角 + 推力', '姿态环', '角速度 → 力矩', '电机转速'];
const COLS = ['PX4 级联', 'Lee SE(3)', '平坦 + 阻力', 'Tal INDI', 'Sun NMPC/DFBC'];
const CX = c => 170 + c * 128, RY = r => 52 + r * 40;
const cell = (c, r, t, cls, n) => S.box(CX(c) + 3, RY(r) + 3, 122, (n || 1) * 40 - 6, t, '', cls);
const figMap = S.svg(820, 348,
  ROWS.map((t, r) => S.text(160, RY(r) + 25, t, 'sv-s', 'end')).join('') +
  COLS.map((t, c) => S.text(CX(c) + 64, 38, t, 'sv-t')).join('') +
  cell(0, 0, '—', 'dim') + cell(0, 1, '位置 P + 速度 PID', 'px') + cell(0, 2, '倾角 + 推力换算', 'px') + cell(0, 3, '姿态 P', 'px') + cell(0, 4, '角速度 PID', 'px') + cell(0, 5, '混控（不闭环）', 'px') +
  cell(1, 0, '用 ẍ_d 前馈', 'hl') + cell(1, 1, '力控制器 F_d', 'hl') + cell(1, 2, 'z 轴对准 F_d', 'hl') + cell(1, 3, 'SO(3) 姿态误差', 'hl') + cell(1, 4, '力矩 PD + 前馈', 'hl') + cell(1, 5, '—', 'dim') +
  cell(2, 0, '最小 snap 轨迹', 'hl') + cell(2, 1, '+ 阻力前馈', 'hl') + cell(2, 2, '含阻力的姿态', 'hl') + cell(2, 3, '角速度前馈', 'hl') + cell(2, 4, '商用飞控 PD', 'px') + cell(2, 5, '—', 'dim') +
  cell(3, 0, 'jerk / snap 前馈', 'hl') + cell(3, 1, 'PD + 加速度 INDI', 'hl') + cell(3, 2, '推力向量 → 姿态', 'hl') + cell(3, 3, '姿态 PD', 'hl') + cell(3, 4, '角加速度 INDI', 'b') + cell(3, 5, '转速闭环', 'b') +
  cell(4, 0, '参考轨迹', 'hl') + cell(4, 1, 'NMPC 或 DFBC\n（直接算到\n单旋翼推力）', 'hl', 3) + cell(4, 4, 'INDI 300 Hz', 'b') + cell(4, 5, '转速闭环', 'b') +
  `<line x1="168" y1="${RY(4)}" x2="812" y2="${RY(4)}" class="sv-l-warn" stroke-dasharray="7 5" style="stroke-width:3"/>` +
  S.text(490, 314, '' + K.ours('', '橙色粗虚线 = CTBR 接口：外部控制器在线上方工作，线下方是 PX4 原厂') + '', 'sv-s warn') +
  S.text(490, 336, '蓝绿 = 论文自己的部分；橙框 = PX4 / 商用飞控；蓝框 = 要转速反馈、改飞控' + K.ours('', '（只发 CTBR 时无法原样复现）') + '', 'sv-s'),
  '五个经典基线各自负责控制栈的哪几层' + K.ours('', '，以及 CTBR 接口线在哪里') + '');

/* ================= 1. PX4 ================= */
const PB = [10, 145, 280, 415, 550, 685], PN = [['位置环', 'P'], ['速度环', 'PID'], ['倾角 + 推力', '换算'], ['姿态环', 'P'], ['角速度环', 'PID'], ['混控', '→ 4 个电机']];
const figPX4 = S.svg(820, 250,
  `<path d="M10 52 v-10 h525 v10" class="sv-l-acc" style="stroke-width:1.5"/>` + S.text(272, 34, '' + K.ours('', 'offboard 外部控制器可替代这四层（CTBR 输出）') + '', 'sv-s acc') +
  `<path d="M550 52 v-10 h260 v10" class="sv-l-warn" style="stroke-width:1.5"/>` + S.text(680, 34, 'PX4 原厂默认参数', 'sv-s warn') +
  PB.map((x, i) => S.box(x, 62, 125, 58, PN[i][0], PN[i][1], i < 4 ? '' : 'px')).join('') +
  PB.slice(0, 5).map(x => S.arrow(x + 125, 91, x + 143, 91)).join('') +
  S.arrow(207, 172, 207, 122, { c: 'warn' }) + S.text(207, 190, '速度积分 I', 'sv-nw') +
  S.arrow(612, 172, 612, 122, { c: 'warn' }) + S.text(612, 190, '角速度积分 I', 'sv-nw') +
  S.text(410, 226, '风、挂载 → 先变成误差 → 积分器慢慢累加 → 才被抵消。没有扰动模型，也没有扰动估计。', 'sv-s'),
  'PX4 级联：位置 P、速度 PID、倾角推力换算、姿态 P、角速度 PID、混控；对付持续扰动只靠两个积分器');
const figPX4r = S.svg(820, 150, bars(0, 0, 820, [
  { l: 'PX4 原厂飞控', v: 12.3, c: 'warn', t: '12.3 cm' },
  { l: '论文控制器，不补偿下洗', v: 3.2, c: 'b', t: '3.2 cm' },
  { l: '论文控制器 + 下洗补偿', v: 0.7, c: 'acc', t: '0.7 cm' },
], { max: 13, lw: 220, title: '下洗中悬停：各次试验平均高度误差的中位数（Cao 等 2025，Nature）' }), 'FlyingToolbox 中 PX4 与补偿控制器的高度误差对比');

/* ================= 2. Lee SE(3) ================= */
const figLee = S.svg(820, 250,
  S.box(10, 95, 130, 60, '参考', 'x_d, ẋ_d, ẍ_d, 航向') + S.arrow(140, 125, 178, 125) +
  S.box(180, 95, 160, 60, '力控制器', '位置、速度误差 → F_d', 'hl') +
  S.path([[340, 125], [362, 125], [362, 68], [388, 68]], { c: 'acc' }) + S.path([[362, 125], [362, 178], [388, 178]], { c: 'acc' }) +
  S.box(390, 40, 180, 56, '推力大小 f', 'F_d 投影到当前机体 z 轴', 'hl') +
  S.box(390, 150, 180, 56, '期望姿态 R_c', 'z 轴对准 F_d，再按航向转', 'hl') +
  S.arrow(570, 178, 608, 178, { c: 'acc' }) +
  S.box(610, 150, 200, 56, '姿态误差 e_R → 力矩 M', '在旋转矩阵上直接算', 'px') +
  `<path d="M180 30 v-10 h390 v10" class="sv-l-acc" style="stroke-width:1.5"/>` + S.text(375, 14, '' + K.ours('', '经 CTBR 实现时用到这里：f 和 R_c 换成 CTBR 发给 PX4') + '', 'sv-s acc') +
  S.text(710, 232, '' + K.ours('', '经 CTBR 实现时，这一半交给 PX4 角速度环') + '', 'sv-s warn'),
  'Lee SE(3) 几何控制：力控制器给出 F_d，拆成推力大小和期望姿态，再在旋转矩阵上算姿态误差和力矩');
const LO = [340, 196], LS = 5, LFx = 5.48, LFz = 26.88, LT = [LO[0] + LFx * LS, LO[1] - LFz * LS];
const LEE_LINES = ['① F_d = (kₓ×0.5, m·g) = (5.48, 26.88) N', '② |F_d| = 27.43 N，偏离竖直 11.5°', '③ f = F_d·(当前 z 轴) = 26.88 N', '④ e_R = sin 11.5° = 0.200，Ψ = 0.020 < 1'];
function leeStep(k) {
  let b = S.quad(110, 150, 0, 55, { fl: 40, fr: 40 }) + S.text(110, 200, '飞机：水平，悬停', 'sv-s') +
    `<circle cx="230" cy="150" r="7" class="sv-l-warn" fill="none"/>` + S.text(230, 178, '目标（前方 0.5 m）', 'sv-s warn');
  b += `<line x1="${LO[0]}" y1="${LO[1]}" x2="${LO[0]}" y2="${LT[1]}" class="sv-l-b" marker-end="url(#AH-b)"/>` + S.text(LO[0] - 8, 110, 'm·g = 26.88 N', 'sv-nb', 'end');
  b += `<line x1="${LO[0]}" y1="${LO[1]}" x2="${LT[0]}" y2="${LO[1]}" class="sv-l-warn" marker-end="url(#AH-warn)"/>` + S.text(LT[0] + 6, LO[1] + 4, 'kₓ×0.5 = 5.48 N', 'sv-nw', 'start');
  if (k >= 1) b += `<line x1="${LO[0]}" y1="${LO[1]}" x2="${LT[0]}" y2="${LT[1]}" class="sv-l-acc" style="stroke-width:3" marker-end="url(#AH-acc)"/>` + S.text(LT[0] + 8, LT[1] + 10, 'F_d', 'sv-n', 'start') + S.text(LO[0] + 14, LO[1] - 62, '11.5°', 'sv-s acc', 'start');
  if (k >= 2) b += `<line x1="${LT[0]}" y1="${LT[1]}" x2="${LO[0]}" y2="${LT[1]}" class="sv-l-soft" stroke-dasharray="4 3"/>` + S.text(LO[0] - 8, LT[1] + 4, '投影 = 26.88 N', 'sv-s acc', 'end');
  if (k >= 3) b += S.quad(110, 150, 11.5, 55, { c: 'acc' }) + S.text(110, 216, '蓝绿：想要的姿态（前倾 11.5°）', 'sv-s acc');
  return S.svg(820, 230, b + panel(470, 60, LEE_LINES.slice(0, k + 1), k), 'SE(3) 控制器第 ' + (k + 1) + ' 步');
}
const figLeeR = S.svg(820, 140,
  `<line x1="40" y1="70" x2="780" y2="70" class="sv-l-soft"/>` +
  [[40, 't = 0', '姿态误差 178°（几乎倒扣）', 'bad'], [300, 't = 0.88 s', 'Ψ < 1：进入 90° 以内', 'warn'], [600, '之后', '位置误差指数收敛到 0', 'acc']].map(([x, t, s, c]) =>
    `<circle cx="${x + 8}" cy="70" r="6" class="sv-fill-${c}"/>` + S.text(x, 50, t, 'sv-t', 'start') + S.text(x, 98, s, 'sv-s ' + c, 'start')).join('') +
  S.text(40, 130, '数值仿真：m = 4.34 kg。另一例连续切换速度 / 姿态 / 位置模式，含绕机体轴翻转 720° 和 360°。没有实机、没有扰动。', 'sv-s', 'start'),
  'Lee 原文的数值算例：从几乎倒扣恢复');

/* ================= 3. flatness + rotor drag ================= */
function flatFig(drag) {
  const X = [10, 175, 340, 505, 670], T = [['位置曲线 σ(t)', 'x, y, z, 航向'], ['加速度 a', '二阶导'], ['推力 + 倾角', 'a + g 的方向与大小'], ['角速度 ω', '来自 jerk（三阶导）'], ['角加速度 / 力矩', '来自 snap（四阶导）']];
  let b = X.map((x, i) => S.box(x, 70, 140, 60, T[i][0], T[i][1], i === 2 && drag ? 'hl on' : i < 4 ? 'hl' : '')).join('') +
    X.slice(0, 4).map(x => S.arrow(x + 140, 100, x + 163, 100, { c: 'acc' })).join('') +
    `<path d="M10 160 v10 h625 v-10" class="sv-l-acc" style="stroke-width:1.5"/>` + S.text(322, 190, '' + K.ours('', 'CTBR 接口只要到角速度（jerk）这一阶，所以参考用 min-jerk 就够') + '', 'sv-s acc') +
    `<path d="M670 160 v10 h140 v-10" class="sv-l-warn" style="stroke-width:1.5"/>` + S.text(740, 190, 'PX4 角速度环负责', 'sv-s warn');
  if (drag) b += S.box(300, 4, 220, 46, '− 转子阻力 R·D·Rᵀ·v', 'Faessler 2018 加的一项', 'b') + S.arrow(410, 50, 410, 68, { c: 'b' });
  else b += S.text(410, 34, 'Mellinger & Kumar 2011：不含阻力，阻力全靠反馈去扛', 'sv-s');
  return S.svg(820, 205, b, drag ? '平坦前馈加上转子阻力' : '平坦前馈：位置曲线的各阶导数对应各层输入');
}
const circ = (k) => {
  let b = `<circle cx="150" cy="115" r="90" class="sv-l-soft" fill="none"/>` + `<circle cx="150" cy="115" r="3" class="sv-fill-soft"/>` + S.text(150, 135, '圆心', 'sv-s') +
    S.text(150, 222, '俯视：半径 1.8 m，4 m/s', 'sv-s') + `<circle cx="240" cy="115" r="6" class="sv-fill-ink"/>` +
    S.arrow(240, 115, 240, 45, { c: 'b' }) + S.text(248, 50, 'v = 4 m/s', 'sv-nb', 'start') +
    S.arrow(240, 115, 172, 115, { c: 'warn' }) + S.text(205, 105, 'a', 'sv-nw');
  if (k >= 2) b += S.arrow(246, 160, 246, 192, { c: 'bad' }) + S.text(254, 186, '阻力 ≈ 2.2', 'sv-s bad', 'start');
  /* side view triangle */
  const O = [470, 200], sc = 8.5, ax = 8.889 * sc, gz = 9.81 * sc;
  if (k >= 1) b += `<line x1="${O[0]}" y1="${O[1]}" x2="${O[0] + ax}" y2="${O[1]}" class="sv-l-warn" marker-end="url(#AH-warn)"/>` + S.text(O[0] + ax / 2, O[1] + 18, '8.89 m/s²（指向圆心）', 'sv-nw') +
    `<line x1="${O[0]}" y1="${O[1]}" x2="${O[0]}" y2="${O[1] - gz}" class="sv-l-b" marker-end="url(#AH-b)"/>` + S.text(O[0] - 8, O[1] - gz / 2, 'g = 9.81', 'sv-nb', 'end') +
    `<line x1="${O[0]}" y1="${O[1]}" x2="${O[0] + ax}" y2="${O[1] - gz}" class="sv-l-acc" style="stroke-width:3" marker-end="url(#AH-acc)"/>` +
    S.text(O[0] + ax + 8, O[1] - gz + 12, 'c = 13.24 m/s²', 'sv-n', 'start') + S.text(O[0] + 16, O[1] - 30, '42.2°', 'sv-s acc', 'start');
  return b;
};
const FL_T = [
  '<b>参考</b>：Faessler 实验里的圆，半径 1.8 m、速度 4 m/s。向心加速度 a = v²/r = 16 / 1.8 = <b>8.89 m/s²</b>，指向圆心。',
  '<b>平坦</b>：推力方向 = a + g 的方向。倾角 atan(8.89/9.81) = <b>42.2°</b>，每 kg 推力 √(8.89² + 9.81²) = <b>13.24 m/s²</b>，和论文写的 13.24 一致。全程不用积分动力学。',
  '<b>漏掉的一项</b>：论文在这条圆上辨识出 d<sub>x</sub> = 0.544 s⁻¹。粗估阻力加速度 ≈ 0.544 × 4 ≈ <b>2.2 m/s²</b>，约是向心加速度的四分之一。不放进前馈，就只能等误差出来再靠反馈补（这一步是我们的量级估算，不是论文数字）。',
  '<b>结果</b>：把阻力写进前馈后，10 圈 RMS 误差从 <b>17.53 cm 降到 6.54 cm</b>（−63%）；在 8 字上辨识的系数换到圆上也有效（8.16 cm）。',
];
const figFaesR = S.svg(820, 236, bars(0, 0, 820, [
  { l: '圆 · 不考虑阻力', v: 17.53, c: 'warn' }, { l: '圆 · 圆上辨识', v: 6.54, c: 'acc' }, { l: '圆 · 8 字上辨识', v: 8.16, c: 'acc' },
  { l: '8 字 · 不考虑阻力', v: 11.27, c: 'warn' }, { l: '8 字 · 圆上辨识', v: 5.56, c: 'acc' }, { l: '8 字 · 8 字上辨识', v: 5.51, c: 'acc' },
], { max: 18, u: ' cm', lw: 200, title: '10 圈位置 RMS 误差 E_a（Faessler 2018 Table I）' }), 'Faessler 转子阻力前馈的效果');

/* ================= 4. Tal & Karaman INDI ================= */
function talFig(mode) {
  const indi = mode === 'indi';
  let b = S.box(10, 70, 110, 56, '参考', 'x, v, a, jerk, snap') + S.arrow(120, 98, 148, 98) +
    S.box(150, 70, 150, 56, indi ? '位置 PD' : '位置 PD + 积分 ∫', indi ? '→ 想要的加速度 a_c' : '积分器累积误差', indi ? 'hl' : 'b') + S.arrow(300, 98, 328, 98, { c: indi ? 'acc' : 'b' }) +
    S.box(330, 70, 190, 56, indi ? '加速度 INDI' : 'a_c + g → 推力向量', indi ? '(τb_z)_c = (τb_z)_f + a_c − a_f' : '只用模型，不看加速度计', indi ? 'hl on' : 'b') +
    S.arrow(520, 98, 548, 98, { c: indi ? 'acc' : 'b' }) + S.box(550, 70, 120, 56, '姿态 + 角速度', K.ours('', 'PX4'), 'px') + S.arrow(670, 98, 698, 98) +
    S.box(700, 70, 110, 56, '飞机', '+ 风、阻力') +
    S.path([[755, 126], [755, 200], [225, 200], [225, 128]], { c: 'soft', label: '位置、速度', lx: 490, ly: 194 });
  if (indi) b += S.path([[790, 126], [790, 165], [425, 165], [425, 128]], { c: 'acc', label: '加速度计 a_f（已含风力）+ 推力 τ_f', lx: 600, ly: 158 });
  b += S.text(410, 30, indi ? 'INDI：直接量出“差多少加速度”，下一拍就补上' : 'PID：风先把飞机吹偏，积分器再慢慢累加', indi ? 'sv-t' : 'sv-t');
  return S.svg(820, 215, b, indi ? 'INDI 外环：加速度计反馈' : 'PID 外环：积分器');
}
const IN_P = ['风力 −2.74 N → 每 kg −1.0 m/s²', '现在 τb_z = (0, 9.81)，测得 a_f = (−1.0, 0)', '想要 a_c = (0, 0)', '(τb_z)_c = (0, 9.81) − (−1.0, 0) = (1.0, 9.81)', '推力 27.02 N，迎风倾 5.8°'];
function inStep(k) {
  const tilt = k === 4 ? 2.9 : k === 5 ? 5.8 : 0;
  let b = S.quad(150, 130, tilt, 60, { fl: 45, fr: 45 }) + S.arrow(330, 95, 250, 95, { c: 'bad', w: 3 }) + S.text(320, 80, '风', 'sv-s bad');
  b += S.text(150, 210, k === 4 ? '只倾到一半：2.9°' : k === 5 ? '到位：迎风 5.8°' : '机身还水平', 'sv-s');
  const L = k <= 3 ? IN_P.slice(0, k < 3 ? k + 1 : 5) : k === 4 ? ['只倾到一半时：τb_z ≈ (0.5, 9.81)', '测得 a_f ≈ (0.5 − 1.0, 0) = (−0.5, 0)', '指令 = (0.5, 9.81) − (−0.5, 0) = (1.0, 9.81)', '→ 还是同一个目标，不会越加越多'] :
    ['到位后：a = τb_z + g + 风', '= (1.0, 9.81) + (0, −9.81) + (−1.0, 0) = (0, 0)', '没有积分器，也没算风有多大', '风的大小已经“写在”加速度计读数里'];
  return S.svg(820, 230, b + panel(400, 50, L, k <= 3 ? L.length - 1 : 2), 'INDI 外环第 ' + (k + 1) + ' 步');
}
const figTalR = S.svg(820, 196, bars(0, 0, 820, [
  { l: '3D 航点轨迹 · 机头朝前', v: 6.6, c: 'acc' }, { l: '3D 航点轨迹 · 机头固定', v: 6.1, c: 'acc' },
  { l: 'Roulette 曲线 · 完整方法', v: 9.0, c: 'acc' }, { l: 'Roulette · 关掉 jerk/snap 前馈', v: 16.8, c: 'warn' }, { l: 'Roulette · 加阻力板，不重调', v: 7.6, c: 'b' },
], { max: 18, u: ' cm', lw: 230, title: '位置 RMS 误差（Tal & Karaman 2021，Table IV、V；每项单次飞行）' }), 'Tal & Karaman 的跟踪误差');

/* ================= 5. Sun NMPC vs DFBC ================= */
function sunFig(mode) {
  const mpc = mode === 'nmpc';
  let b = S.box(10, 70, 150, 60, mpc ? '参考：未来 1 s 一段' : '参考：当前点 + 各阶导', mpc ? '整段轨迹进优化' : 'a、jerk、snap', 'hl') + S.arrow(160, 100, 188, 100, { c: 'acc' }) +
    S.box(190, 60, 240, 80, mpc ? 'NMPC（100 Hz，约 3 ms）' : 'DFBC（300 Hz，< 0.025 ms）', mpc ? '全模型 + 单旋翼推力上下限' : '平坦前馈 + 反馈 + QP 推力分配', 'hl on') +
    S.arrow(430, 100, 468, 100, { c: 'acc' }) + S.text(449, 128, '单旋翼', 'sv-s acc') + S.text(449, 144, '推力', 'sv-s acc') +
    S.box(470, 70, 160, 60, 'INDI 内环 300 Hz', '两者共用', 'b') + S.arrow(630, 100, 658, 100, { c: 'b' }) +
    S.box(660, 70, 150, 60, '转速闭环 500 Hz', 'RadixFC 飞控板', 'b') +
    S.text(290, 170, mpc ? '优点：能预见推力不够，提前“抄近路”' : '优点：极便宜，对延迟更稳', 'sv-s acc') +
    S.text(290, 192, mpc ? '代价：算得慢；延迟大时对增益敏感' : '代价：参考超出推力极限时跟不住', 'sv-s') +
    S.text(640, 170, '共用：阻力模型', 'sv-s b') + S.text(640, 192, '状态估计（Vicon + IMU EKF）', 'sv-s b');
  return S.svg(820, 210, b, mpc ? 'NMPC 结构' : 'DFBC 结构');
}
const figSunR = S.svg(820, 262, bars(0, 0, 820, [
  { l: 'NMPC + INDI', v: 0.102, c: 'acc' }, { l: 'DFBC + INDI', v: 0.122, c: 'acc' },
  { l: 'NMPC + INDI，去阻力模型', v: 0.249, c: 'b' }, { l: 'DFBC + INDI，去阻力模型', v: 0.271, c: 'b' },
  { l: 'NMPC + PID 内环', v: 0.343, c: 'warn' }, { l: 'NMPC，无 INDI', v: 0.473, c: 'warn' }, { l: 'DFBC，无 INDI', v: 0.982, c: 'bad' },
], { max: 1.0, u: ' m', lw: 230, title: '实机 16 条轨迹（最高 19.4 m/s）平均位置 RMSE（Sun 2022，Table VI、VIII）' }), 'Sun 2022 实机结果');
const figSunL = S.svg(820, 120, bars(0, 0, 820, [
  { l: 'NMPC（无 INDI）', v: 3.450, c: 'b', t: '3.45 m，崩溃 66.7%' }, { l: 'DFBC（无 INDI）', v: 0.669, c: 'acc', t: '0.67 m，崩溃 5.3%' },
], { max: 5, lw: 230, title: '仿真：估计延迟 50 ms，76 条可行轨迹（Table IV）' }), 'Sun 2022 延迟敏感性');

/* ================= page ================= */
const ref = (h, t) => `<a href="#${h}">${t}</a>`;
el.innerHTML = `
<p class="lede">这一页精读五个经典基线。${K.ours('', `它们是评测学习型飞控时必须调好参数再比的经典对手。`)}每篇按同一个顺序看：解决什么、在什么飞机上、方法怎么转、测出了什么、哪里没回答。</p>
${K.fig(figMap, '五个基线在控制栈里各管哪几层。' + K.ours('', '橙色虚线是 CTBR 接口：外部控制器只发“总推力 + 角速度”，线下方是 PX4 原厂。所以只通过这个接口时，Tal、Sun 的内环（蓝）只能引用，不能原样复现。') + '')}
${K.more('展开：怎么读后面的数字', `<ul>
<li>每个数字都写了出处（论文表号）。不同论文的车、轨迹、速度都不同，<b>不能横向比较</b>，只能各自看“加了某个部件后变化多少”。</li>
<li>“全文已读”指读过 arXiv 版全文；正式期刊版若有改动未核对。</li>
<li>Mellinger & Kumar 2011 原文本次没有拿到，所以只讲方法，不列实验数字。</li>
</ul>`)}

<h2>1 · PX4 级联控制：行业默认</h2>
${one('几乎所有真机都在用的开源飞控：一层层 P / PID 串起来，不需要模型，好调、稳。' + K.ours('', '它是“真实车辆自然状态”的参照基线。') + '', '来源：PX4 官方文档（controller diagrams），不是论文。' + K.ours('') + '')}
${plat([['飞机', '' + K.ours('', '任意多旋翼') + ''], ['传感', 'IMU + EKF2 状态估计（<a href="#lest">第 4 课</a>）；位置来自 GPS / 动捕 / VIO'], ['控制接口', '' + K.ours('', '可从任一层接入；offboard 发 CTBR 时只保留角速度环') + ''], ['计算', '飞控板（Pixhawk 一类）'], ['仿真 / 真机', '' + K.ours('', '真机生态；也有官方 SITL 仿真') + '']])}
${K.fig(figPX4, '五层串联，每层只看自己的误差。对抗持续扰动的机制只有两个积分器：风或挂载必须先造成误差，积分器才开始累加。')}
${K.fig(figPX4r, '公开同行评审文献里很少有 PX4 原厂控制器的定量数字。这是少数之一：两机上下堆叠时，上机下洗最高 13.18 m/s、扰动最大 24.9 N（下方飞机重量的 40.2%）。注意三者的试验次数不同。')}
<div class="warnbox"><b>局限：</b>没有同行评审论文给出“PX4 默认参数下跟踪误差随风速怎么变”的曲线；${K.ours('')}单赢 PX4 不足以说明问题，必须同时赢下面几种显式抗扰方法。</div>
${K.ours('', `<p>先复习 `)}${ref('l3', '第 3 课')}（级联）、${ref('l2', '第 2 课')}（PID 的积分项）。</p>
${K.more('出处：PX4 这一节', `<ul>
<li>结构：PX4 官方 controller diagrams${K.ours('', `（全文已读）`)}。文档不讨论积分器以外的扰动抑制；未查到 stock 版的 INDI 模式（未核实）。出厂参数见 ${ref('l3', '第 3 课')} 的展开块。</li>
<li>12.3 / 3.2 / 0.7 cm：Cao 等，“Proximal cooperative aerial manipulation with vertically stacked drones”，<i>Nature</i> 646:576–583 (2025)，正文与 Extended Data Fig. 3b（下方工具箱飞机悬停高度误差，各次试验平均误差的中位数）。13.18 m/s、24.9 N、40.2%：同文正文。${K.ours('', `试验次数：PX4 5、无补偿 8、本法 13。`)}这里 PX4 指它的完整原厂控制器，不是只保留角速度环。</li>
<li>Neural-Fly 表 1 里的“非线性基线”是 SE(3) 型 PID 外环叠在 PX4 姿态环上，不是纯 PX4 位置环，所以没有放在这里。</li>
<li>灰色文献（非同行评审，只读过摘要）：PoliMi 2026 HIL 仿真 Beaufort 1→4 级 RMSE 0.1→1.8 m。不作为证据使用。</li></ul>`)}

<h2>2 · Lee 等 2010：SE(3) 几何控制</h2>
${one('先算“想要多大、朝哪的力”，再把机身 z 轴转过去对准它；姿态误差直接在旋转矩阵上算，所以大角度也不会出现奇异或“绕远路”。', 'T. Lee, M. Leok, N. H. McClamroch，IEEE CDC 2010；本页据 arXiv 1003.2005 v4（扩展版，标题改为复杂机动控制）。')}
${plat([['飞机', '无实机；数值仿真用 m = 4.34 kg、J = diag(0.0820, 0.0845, 0.1377) kg·m²'], ['传感', '假设全状态已知'], ['控制接口', '总推力 + 三轴力矩'], ['计算', '—（理论 + 数值）'], ['仿真 / 真机', '只有数值仿真']])}
${K.fig(figLee, '' + K.ours('', '上半（力控制器 → 推力、期望姿态）经 CTBR 实现时照用；下半（姿态误差 → 力矩）这时由 PX4 角速度环代替，和原文不同。') + '')}
<div class="formula">F_d = −kₓ·eₓ − k_v·e_v + m·g·e₃ + m·ẍ_d<br>f = F_d · R e₃　　e_R = ½(R_cᵀR − RᵀR_c)<sup>∨</sup><div class="where">eₓ、e_v：位置、速度误差；R：当前姿态；R_c：期望姿态；∨ 把反对称矩阵变回三维向量。这里用 z 轴向上的写法（v4 原文 z 轴向下，重力项符号相反）。</div></div>
<div id="wLee"></div>
${K.fig(figLeeR, '原文的验证是数值仿真：从 178° 的倒扣姿态出发，0.88 s 后姿态误差函数 Ψ 降到 1 以下（对应误差小于 90°，进入指数稳定区），之后位置误差指数收敛。')}
<div class="warnbox"><b>局限：</b>只有理论和数值仿真，没有实机、没有风或载荷。只靠反馈抗扰：后人实测中，平坦控制（同一类名义模型控制器）在 Sun 2022 实机上不加 INDI 时平均误差 0.982 m（见第 5 节）。</div>
${K.ours('', `<p>它能经 CTBR 复现。先复习 `)}${ref('l4', '第 5 课')}（姿态表示）、${ref('l5', '第 6 课')}（SE(3)）。</p>
${K.more('出处：Lee 这一节', `<ul><li>4.34 kg、惯量、178°、0.88 s、Ψ &lt; 1、“误差小于 90° 时指数稳定”、720° / 360° 翻转：arXiv 1003.2005 v4 第 IV 节数值算例与命题。${K.ours('', `本次下载 v4 全文核对；`)}CDC 2010 会议版可能与 v4 有差异。</li>
<li>Ψ(R, R_c) = ½ tr(I − R_cᵀR) = 1 − cos(转角)，所以 Ψ &lt; 1 ⇔ 转角 &lt; 90°。</li>
<li>走一遍里的增益 kₓ = 4m、k_v = 3m 和 2.74 kg 是我们为举例取的，不是论文数值；数字已在 node 里复算。</li></ul>`)}

<h2>3 · Mellinger & Kumar 2011 + Faessler 等 2018：平坦前馈，再补上转子阻力</h2>
${one('只要给出位置曲线（和航向），推力、倾角、角速度都能直接算出来（微分平坦）；Faessler 证明加上线性转子阻力后仍然平坦，于是阻力也能事先算进前馈。', 'D. Mellinger, V. Kumar，ICRA 2011（原文未取得，只讲方法）；M. Faessler, A. Franchi, D. Scaramuzza，IEEE RA-L 3(2):620–626, 2018（arXiv 1712.02402 全文）。')}
${plat([['飞机', 'Faessler：610 g，推重比 4'], ['传感', 'OptiTrack 动捕 200 Hz，用于控制和评测；补偿了约 32 ms 平均延迟'], ['控制接口', '<b>CTBR</b>：笔记本 55 Hz 发总推力 + 机体角速度，机载飞控 4 kHz PD 跟踪角速度' + K.ours('', '（与 PX4 offboard 发 CTBR 同构）') + ''], ['计算', '高层在笔记本，内环在商用飞控板'], ['仿真 / 真机', '真机：半径 1.8 m、4 m/s 的圆；Gerono 8 字']])}
<div id="segFlat"></div><div id="figFlat"></div>
<div id="wFlat"></div>
${K.fig(figFaesR, '阻力系数在一条轨迹上辨识（无梯度优化，代价就是跟踪 RMS），换到另一条轨迹上依然有效。论文还说：0.5 m/s 以下没有改善，剩余误差和总推力强相关（真实阻力随推力变）。')}
<div class="warnbox"><b>局限：</b>阻力假设为线性、系数不随推力变；只对比了“有 / 无阻力前馈”，没有和其他控制器比；没有风。</div>
${K.ours('', `<p>拿 SE(3) 类控制器做基线时应带阻力前馈，否则高速时赢它不公平。先复习 `)}${ref('l6', '第 7 课')}（轨迹与平坦）。</p>
${K.more('出处：平坦 + 阻力这一节', `<ul><li>610 g、推重比 4、OptiTrack 200 Hz、32 ms、55 Hz、4 kHz PD、圆半径 1.8 m、4 m/s、c = 13.24 m/s²、d<sub>x</sub> = 0.544 s⁻¹（圆上辨识；d<sub>y</sub> = 0.386）、Table I 六个 E_a 数值、“0.5 m/s 以下无改善”：arXiv 1712.02402 第 V 节与 Table I。−63% 是我们由 17.53 → 6.54 算出；8 字上是 11.27 → 5.51（−51%）。</li>
<li>“阻力 ≈ 2.2 m/s²”是我们用 d<sub>x</sub>·v 做的量级估算，忽略了阻力与姿态的耦合，不是论文数字。</li>
<li>Mellinger & Kumar 的平坦性与最小 snap：方法可从动力学直接推出；原文实验场景与数字未核实，故不列。${K.ours('')}</li></ul>`)}

<h2>4 · Tal & Karaman 2021：INDI + 微分平坦</h2>
${one('平坦前馈负责“已知的”轨迹动力学，INDI 用加速度计（外环）和角加速度（内环）直接量出“还差多少”并补上，全程不建气动模型。', 'E. Tal, S. Karaman，IEEE T-CST 29(3):1203–1218, 2021（arXiv 1809.04048 v2 全文）。')}
${plat([['飞机', '609 g 竞速四旋翼，相邻电机间距 18 cm'], ['传感', 'OptiTrack 360 Hz（平均延迟 18 ms，用 IMU 积分外推补偿）；ADIS IMU 2000 Hz；电机光学编码器约 5000 Hz 测转速'], ['控制接口', '全栈自研：一直算到每个电机的转速并闭环'], ['计算', '机载 STM32H7 自研固件，全部控制 2000 Hz'], ['仿真 / 真机', '真机，约 18 × 7 × 3 m 室内场地']])}
<div id="segTal"></div><div id="figTal"></div>
<div id="wTal"></div>
${K.fig(figTalR, '最高 12.9 m/s、2.12 g 下 6.6 cm。关掉 jerk / snap 前馈误差翻倍；加一块让迎风面积超过 3 倍的纸板，不重调，位置误差不变差（但航向误差最大到 51.7°）。悬停时用绳拉约 3.7 N，位置保持在 4 cm 内。')}
<div class="warnbox"><b>局限：</b>每个实验只飞一次、没有统计；没有和任何其他控制器比；没有风洞。6.6 cm 是敏捷跟踪的数字，不是抗风基准。内环依赖电机编码器。</div>
${K.ours('', `<p>外环（式 17、20，只需加速度计和推力）能经 CTBR 复现；内环要编码器并替换角速度环。先复习 `)}${ref('l7', '第 8 课')}（INDI）。</p>
${K.more('出处：Tal & Karaman 这一节', `<ul><li>609 g、18 cm、2000 Hz、STM32H7、ADIS16477 2000 Hz、编码器约 5000 Hz、OptiTrack 360 Hz / 18 ms、6.6 / 6.1 cm、12.9 m/s、20.8 m/s²（2.12 g）、Table V 的 9.0 / 16.8 / 7.6 cm 和 51.7°、16 × 32 cm 纸板、3.7 N、4 cm：arXiv 1809.04048 v2 第 VI 节、Table IV、V。</li>
${K.ours('')}
<li>式 (20)：(τb_z)_c = (τb_z)_f + a_c − a_f。原文用 z 轴向下（重力 +g·i_z），走一遍里换成 z 轴向上。走一遍的 2.74 kg、风力 2.74 N 是我们举例用的数，已在 node 复算。</li></ul>`)}

<h2>5 · Sun 等 2022：NMPC 和平坦控制正面对比</h2>
${one('同一架飞机、同一个 INDI 内环、同一个阻力模型、先调到相同的名义误差，再比 NMPC 和平坦控制（DFBC）谁在什么条件下更好。', 'S. Sun, A. Romero, P. Foehn, E. Kaufmann, D. Scaramuzza，IEEE T-RO 2022（arXiv 2109.01365 全文）。')}
${plat([['飞机', '0.75 kg，臂长 0.14 m（Agilicious 类平台）'], ['传感', 'Vicon 400 Hz + IMU 500 Hz，EKF 融合；INDI 用转速反馈'], ['控制接口', '单个旋翼的转速指令 → RadixFC 板 500 Hz 转速闭环'], ['计算', '机载 Jetson TX2：DFBC 300 Hz，NMPC 100 Hz（ACADO + qpOASES），INDI 300 Hz'], ['仿真 / 真机', '仿真 144 条椭圆（76 条可行）+ 扰动扫描；实机 30 × 30 × 8 m 动捕场 16 条轨迹 + 3 条超推力轨迹']])}
<div id="segSun"></div><div id="figSun"></div>
${K.fig(figSunR, '两种控制器加 INDI 后几乎打平（0.102 vs 0.122 m）。差别最大的不是选哪种控制器，而是有没有 INDI：去掉 INDI 误差 +364%（NMPC）、+705%（DFBC），去掉阻力模型只 +144% / +122%。3 条超推力轨迹上 NMPC 明显更好（0.550 vs 1.328 m）。')}
${K.fig(figSunL, '延迟是 NMPC 的弱点：30 ms 以上 NMPC 对增益很敏感、崩溃率猛增；平坦控制慢慢变差。“崩溃”定义为飞出参考轨迹包络 ±5 m。')}
<div class="warnbox"><b>局限：</b>所有“+INDI”的数字都依赖转速反馈和单旋翼指令；实机每条轨迹似乎只飞一次；平台推重比高${K.ours('', `（约 4.6，推算），结论未必适用于推重比低的飞机。`)}</div>
${K.ours('', `<p>值得借的是它的协议：先调到相同名义误差、再扫扰动和延迟、用包络定义崩溃。`)}能对照的是“无 INDI”的数字。先复习 ${ref('l8', '第 9 课')}（MPC）、${ref('l10', '第 11 课')}（公平比较）。</p>
${K.more('出处：Sun 这一节', `<ul><li>0.75 kg、0.14 m、TX2、300 / 100 / 300 Hz、RadixFC 500 Hz、Vicon 400 Hz、IMU 500 Hz、30 × 30 × 8 m、144 条（a<sub>max</sub> 10–60 m/s²、V<sub>max</sub> 5–20 m/s、3 种扁度）、包络 b = 5 m：arXiv 2109.01365 第 V 节。</li>
<li>名义误差 0.082 vs 0.085 m（NMPC vs DFBC，无扰动、76 条可行轨迹）：Table IV/V 的 Baseline 行。</li>
<li>实机：Table VIII（0.102 / 0.249 / 0.473 / 0.122 / 0.271 / 0.982 m 与 +144 / +364 / +122 / +705%）、正文 0.343 m（NMPC + PID 内环）、Table VII（0.550 / 1.328 m）。16 条轨迹见 Table VI。<b>注意：</b>Table VI 的均值行里 DFBC+INDI 去阻力为 0.244 m，与 Table VIII 的 0.271 m 不一致；+122% 与 0.271 吻合，这里用 Table VIII。${K.ours('')}</li>
<li>延迟：Table IV（无 INDI）50 ms：NMPC 3.450 ± 2.217 m、崩溃 66.7%；DFBC 0.669 ± 1.247 m、5.3%。正文另有“延迟大于 30 ms 时 NMPC 崩溃 68.0% vs DFBC 6.7%”的概括，口径不同。</li>
<li>NMPC 约 3 ms、DFBC 小于 0.025 ms：第 VI-C 节（计算时间）。${K.ours('', `推重比约 4.6 是推算值，论文未直接给。`)}</li></ul>`)}

<h2>五篇放在一起</h2>
<div class="tblwrap"><table class="tbl">
<tr><th>论文</th><th>平台</th><th>接口</th><th>仿真 / 真机</th><th>靠什么抗扰</th><th>代表结果（不可横比）</th></tr>
<tr><td>PX4 级联</td><td>通用；Cao 2025 中为 6.32 kg 六旋翼</td><td>可从任一层接入</td><td>真机</td><td>速度 / 角速度积分器</td><td>下洗中 12.3 cm（vs 补偿 0.7 cm）</td></tr>
<tr><td>Lee 2010 SE(3)</td><td>4.34 kg（数值）</td><td>推力 + 力矩</td><td>只有数值仿真</td><td>只靠反馈</td><td>178° 倒扣 0.88 s 进入稳定区</td></tr>
<tr><td>平坦 + 阻力（Faessler）</td><td>610 g</td><td>CTBR → 商用飞控</td><td>真机</td><td>阻力写进前馈</td><td>4 m/s 圆 17.53 → 6.54 cm</td></tr>
<tr><td>Tal & Karaman 2021</td><td>609 g</td><td>电机转速（全栈）</td><td>真机，单次</td><td>INDI（加速度计 + 编码器）</td><td>12.9 m/s 下 6.6 cm</td></tr>
<tr><td>Sun 2022</td><td>0.75 kg</td><td>单旋翼转速</td><td>仿真 + 真机</td><td>INDI 内环 + 阻力模型</td><td>19.4 m/s 下 0.102 m（+INDI）</td></tr>
</table></div>

<div class="key"><h3>这一页记住三件事</h3><ul>
<li>经典基线按“扰动怎么处理”分三档：只靠积分器（PX4、单用 SE(3)）→ 把已知部分写进前馈（平坦 + 阻力）→ 直接测量并抵消（INDI）。</li>
<li>Sun 2022 的结论：有没有 INDI 比选 NMPC 还是平坦控制影响大得多；但最强的“+INDI”数字都依赖转速反馈，${K.ours('', `只发 CTBR 时复现不了。`)}</li>
<li>这些数字车不同、轨迹不同，只能各自看“加了某部件变化多少”，不能横比；${K.ours('', `能借的是协议（等名义误差整定、扰动扫描、崩溃定义）。`)}</li>
</ul></div>
<h2>小测验</h2><div id="qrw1"></div>`;

K.steps(el.querySelector('#wLee'), { title: '用数字走一遍 SE(3)：2.74 kg 的飞机悬停，目标在前方 0.5 m（kₓ = 4m，k_v = 3m，举例用）', steps: [
  { svg: leeStep(0), t: '<b>力控制器</b>：位置误差 0.5 m 乘 kₓ = 10.96 N/m，水平要 <b>5.48 N</b>；竖直要托住重力 2.74 × 9.81 = <b>26.88 N</b>。速度误差和参考加速度都是 0。' },
  { svg: leeStep(1), t: '<b>合起来</b>就是想要的力 F_d：大小 <b>27.43 N</b>，偏离竖直 <b>11.5°</b>。机身 z 轴要转到这个方向。' },
  { svg: leeStep(2), t: '<b>推力大小</b>不是 27.43 N，而是 F_d 在<b>当前</b>机体 z 轴上的投影：机身还水平，所以 f = <b>26.88 N</b>。等机身转过去，投影自然变大。这样转动途中不会多推一把。' },
  { svg: leeStep(3), t: '<b>姿态误差</b>直接用旋转矩阵算：大小 sin 11.5° = <b>0.200</b>；误差函数 Ψ = 1 − cos 11.5° = <b>0.020</b>，远小于 1，在指数稳定区里。' + K.ours('', '原文接着算力矩；经 CTBR 实现时把 f 和期望姿态交给 PX4。') + '' },
] });
K.steps(el.querySelector('#wFlat'), { title: '用数字走一遍平坦前馈：Faessler 实验里的圆', steps: FL_T.map((t, k) => ({ svg: S.svg(820, 235, circ(Math.min(k, 2)) + (k === 3 ? S.text(680, 60, '17.53 → 6.54 cm', 'sv-n') + S.text(680, 84, '10 圈 RMS，−63%', 'sv-s') : ''), '平坦前馈第 ' + (k + 1) + ' 步'), t })) });
K.steps(el.querySelector('#wTal'), { title: '用数字走一遍 INDI 外环：悬停时突然来了一阵稳定的风（用 2.74 kg 举例）', steps: [
  { svg: inStep(0), t: '<b>风来了</b>：向后的力 2.74 N，对 2.74 kg 的飞机就是每 kg <b>−1.0 m/s²</b>。控制器不知道这个数。' },
  { svg: inStep(1), t: '<b>测量</b>：机身还水平，推力每 kg (0, 9.81)。加速度计（扣掉重力后）测到 a_f = <b>(−1.0, 0)</b>：风的影响已经在读数里了。' },
  { svg: inStep(2), t: '<b>目标</b>：位置还没偏，位置 PD 说想要的加速度 a_c = <b>(0, 0)</b>。' },
  { svg: inStep(3), t: '<b>增量律</b>：新推力向量 = 现在的 + (想要的 − 测到的) = (0, 9.81) − (−1.0, 0) = <b>(1.0, 9.81)</b>。大小 9.861 → 推力 <b>27.02 N</b>，迎风倾 <b>5.8°</b>。' },
  { svg: inStep(4), t: '<b>如果姿态环只转到一半</b>（2.9°）：测到的加速度只剩 −0.5，算出来的指令还是 (1.0, 9.81)。INDI 不会越加越多，只是一直指向同一个正确目标。' },
  { svg: inStep(5), t: '<b>到位</b>：推力的水平分量 1.0 正好抵消风的 −1.0，加速度为 0。全程没有积分器，也没有估计“风多大”。对比 PID：要先被吹偏，积分器再慢慢累加。' },
] });

/* toggles */
const fF = el.querySelector('#figFlat');
const drawFlat = v => { fF.innerHTML = K.fig(flatFig(v === 'f'), v === 'f' ? 'Faessler：在“加速度”那一格减去转子阻力 R·D·Rᵀ·v（D 为机体三轴的线性阻力系数），推力、倾角、角速度的前馈都随之改变。' : 'Mellinger & Kumar：位置曲线的各阶导数一一对应到各层输入；最小 snap 让四阶导（对应力矩）尽量平滑。'); };
K.seg(el.querySelector('#segFlat'), { label: '看哪一篇', options: [['m', 'Mellinger & Kumar 2011'], ['f', 'Faessler 2018（+ 阻力）']], value: 'm', on: drawFlat }); drawFlat('m');
const fT = el.querySelector('#figTal');
const drawTal = v => { fT.innerHTML = K.fig(talFig(v), v === 'indi' ? 'Tal & Karaman 的外环：多了一条加速度计反馈（蓝绿），扰动在下一拍就被补上。这两层只需加速度计 + 推力，能经 CTBR 在 PX4 上做（Neural-Fly 的 INDI 基线也这样做）。' : '对照：经典 PID 外环。没有加速度反馈，扰动只能等位置误差积累。'); };
K.seg(el.querySelector('#segTal'), { label: '外环用什么', options: [['pid', 'PID（积分器）'], ['indi', 'INDI（加速度计）']], value: 'indi', on: drawTal }); drawTal('indi');
const fS = el.querySelector('#figSun');
const drawSun = v => { fS.innerHTML = K.fig(sunFig(v), '切换两种控制器：只有蓝绿色部分不同，蓝色的 INDI 内环、转速闭环、阻力模型和状态估计完全相同。这就是“公平对比”的做法。'); };
K.seg(el.querySelector('#segSun'), { label: '控制器', options: [['nmpc', 'NMPC'], ['dfbc', 'DFBC（平坦）']], value: 'nmpc', on: drawSun }); drawSun('nmpc');

K.quiz(el.querySelector('#qrw1'), 'rw1', [
  { q: 'Sun 2022 的实机结果里，哪一项改动让误差变化最大？', o: ['把 NMPC 换成平坦控制（DFBC）', '去掉阻力模型', '去掉 INDI 内环', '把轨迹速度从 19.4 m/s 降下来'], a: 2,
    e: '加 INDI 时两种控制器只差 0.102 vs 0.122 m；去掉 INDI 误差 +364%（NMPC）和 +705%（DFBC），去掉阻力模型只 +144% / +122%。内环抗扰比选哪种外环控制器更重要。' },
  { q: 'INDI 外环为什么不需要知道风有多大？', o: ['它离线学过风', '加速度计读数里已经包含了风的效果，增量律直接补“想要的 − 测到的”', '它用积分器慢慢累加', '它假设没有风'], a: 1,
    e: '(τb_z)_c = (τb_z)_f + a_c − a_f：风让测到的加速度 a_f 偏离，指令就多加这么多。代价是需要加速度计、推力测量和滤波，且要求扰动比控制周期变化慢。' },
  { q: K.ours('', '为什么 Tal & Karaman 的 6.6 cm 不能拿来和另一架飞机的仿真误差直接比？'), o: ['它用了 GPS', '它的车、轨迹、接口都不同（609 g、全栈 2 kHz、电机编码器），而且没有风、单次飞行', '它的数字是仿真', '它没有用平坦前馈'], a: 1,
    e: '不同论文的数字只能各自看“加了某部件后变化多少”。' + K.ours('', 'Tal 的内环依赖编码器转速，在原厂 PX4 的 CTBR 接口下拿不到，只能复现它的外环。') + '' },
]);
} });
