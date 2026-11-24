K.add({ id: 'l4', num: 5, title: '姿态怎么表示', sub: '欧拉角、旋转矩阵、四元数，以及万向锁', render(el) {
const S = K.S;

/* rotation helpers (the same matrices the demo below uses) */
const mm = (A, B) => A.map(r => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
const rz = a => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
const ry = a => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
const rx = a => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
const eulR = (y, p, r) => mm(mm(rz(K.rad(y)), ry(K.rad(p))), rx(K.rad(r)));
const apR = (R, p) => [0, 1, 2].map(i => R[i][0] * p[0] + R[i][1] * p[1] + R[i][2] * p[2]);
const col = (R, j) => [R[0][j], R[1][j], R[2][j]];
const n2 = v => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);

/* oblique 3-D sketch: world x (east) to the right, y (north) into the page, z up */
const P3 = (cx, cy, s) => p => [cx + s * (p[0] + 0.45 * p[1]), cy - s * (p[2] + 0.32 * p[1])];
const seg3 = (pr, a, b, cls, extra) => { const A = pr(a), B = pr(b); return `<line x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" x2="${B[0].toFixed(1)}" y2="${B[1].toFixed(1)}" class="${cls}"${extra || ''}/>`; };
function quad3(pr, R, s) {
  let b = ''; const a = 0.42;
  [[a, a], [a, -a], [-a, -a], [-a, a]].forEach(([x, y], i) => {
    const tip = apR(R, [x, y, 0]);
    b += seg3(pr, [0, 0, 0], tip, i < 2 ? 'sv-l-warn' : 'sv-l-ink', ' style="stroke-width:3.5"');
    let d = ''; for (let k = 0; k <= 20; k++) { const t = k / 20 * Math.PI * 2, P = pr(apR(R, [x + 0.17 * Math.cos(t), y + 0.17 * Math.sin(t), 0.04])); d += (k ? 'L' : 'M') + P[0].toFixed(1) + ' ' + P[1].toFixed(1); }
    b += `<path d="${d}" class="${i < 2 ? 'sv-l-warn' : 'sv-l-ink'}" style="stroke-width:1.3"/>`;
  });
  return b;
}
/* body axes of attitude R: [label, colour] for x_b, y_b, z_b; sgn flips y, z for the FRD convention */
function axes3(pr, R, L, labs, sgn) {
  sgn = sgn || 1; const O = pr([0, 0, 0]);
  return [[[L, 0, 0], 'bad', labs[0]], [[0, sgn * L, 0], 'ink', labs[1]], [[0, 0, sgn * L], 'b', labs[2]]].map(([p, c, lab]) => {
    const P = pr(apR(R, p));
    return `<line x1="${O[0]}" y1="${O[1]}" x2="${P[0].toFixed(1)}" y2="${P[1].toFixed(1)}" class="sv-l-${c}" style="stroke-width:2.6" marker-end="url(#AH-${c})"/>` +
      (lab ? S.text(P[0] + (P[0] >= O[0] ? 8 : -8), P[1] + (P[1] > O[1] ? 14 : -4), lab, 'sv-s ' + (c === 'ink' ? '' : c), P[0] >= O[0] ? 'start' : 'end') : '');
  }).join('');
}
function worldAxes(pr, L) {
  return [[[L, 0, 0], '东 x'], [[0, L, 0], '北 y'], [[0, 0, L], '上 z']].map(([p, lab]) => {
    const O = pr([0, 0, 0]), P = pr(p);
    return `<line x1="${O[0]}" y1="${O[1]}" x2="${P[0].toFixed(1)}" y2="${P[1].toFixed(1)}" class="sv-l-soft" stroke-dasharray="4 4"/>` + S.text(P[0] + 4, P[1] - 4, lab, 'sv-s', 'start');
  }).join('');
}
/* a 3x3 matrix drawn with brackets; hc: column to highlight */
function mat(x, y, R, o) {
  o = o || {}; const cw = 64, rh = 24, w = cw * 3 + 10, cls = ['bad', '', 'b'];
  let b = '';
  if (o.hc != null) b += `<rect x="${x + 5 + o.hc * cw}" y="${y - 4}" width="${cw}" height="${rh * 3 + 8}" rx="5" class="sv-fill-tint"/>`;
  b += `<path d="M${x + 6} ${y - 4} h-6 v${rh * 3 + 8} h6 M${x + w - 6} ${y - 4} h6 v${rh * 3 + 8} h-6" class="sv-l-ink" style="stroke-width:1.4"/>`;
  if (o.head) ['x_b 机头', 'y_b 左侧', 'z_b 推力'].forEach((h, j) => { b += S.text(x + 5 + cw * j + cw / 2, y - 12, h, 'sv-s ' + cls[j]); });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const show = !o.cols || o.cols.includes(j);
    b += S.text(x + 5 + cw * j + cw - 10, y + 17 + rh * i, show ? n2(R[i][j]) : '?', show ? (j === o.hc ? 'sv-n' : 'sv-t') : 'sv-s', 'end');
  }
  return b;
}

/* figure: axis conventions */
const prA = P3(190, 170, 95), prB = P3(590, 140, 95), I3 = eulR(0, 0, 0);
const figAxes = S.svg(800, 290,
  S.text(190, 24, '本课：x 机头、y 左、z 上', 'sv-t') + quad3(prA, I3) + axes3(prA, I3, 1, ['x_b 机头', 'y_b 左侧', 'z_b 上 = 推力方向']) +
  S.text(590, 24, 'PX4：x 机头、y 右、z 下（FRD）', 'sv-t') + quad3(prB, I3) + axes3(prB, I3, 1, ['x_b 机头', 'y_b 右侧', 'z_b 下（推力沿 −z_b）'], -1) +
  `<line x1="400" y1="40" x2="400" y2="270" class="sv-l-grid"/>` +
  S.text(190, 280, '橙色两臂 = 机头一侧（和下面实验一致）', 'sv-s'),
  '两种机身坐标轴约定：本课 x 机头 y 左 z 上；PX4 x 机头 y 右 z 下');

/* figure: the three Euler turns */
function topView(cx, cy, psi) {
  const a = -K.rad(psi), L = 62; let b = '';
  [45, -45, 135, -135].forEach((d, i) => { const t = a + K.rad(d); b += `<line x1="${cx}" y1="${cy}" x2="${(cx + L * Math.cos(t)).toFixed(1)}" y2="${(cy + L * Math.sin(t)).toFixed(1)}" class="sv-l-${i < 2 ? 'warn' : 'ink'}" style="stroke-width:3.5"/><circle cx="${(cx + L * Math.cos(t)).toFixed(1)}" cy="${(cy + L * Math.sin(t)).toFixed(1)}" r="14" class="sv-l-${i < 2 ? 'warn' : 'ink'}" style="stroke-width:1.3"/>`; });
  return b + `<line x1="${cx}" y1="${cy}" x2="${(cx + 95 * Math.cos(a)).toFixed(1)}" y2="${(cy + 95 * Math.sin(a)).toFixed(1)}" class="sv-l-bad" marker-end="url(#AH-bad)"/>`;
}
const arc = (cx, cy, r, a0, a1) => `<path d="M${(cx + r * Math.cos(K.rad(a0))).toFixed(1)} ${(cy + r * Math.sin(K.rad(a0))).toFixed(1)} A${r} ${r} 0 0 ${a1 > a0 ? 1 : 0} ${(cx + r * Math.cos(K.rad(a1))).toFixed(1)} ${(cy + r * Math.sin(K.rad(a1))).toFixed(1)}" class="sv-l-ink" style="stroke-width:1.4"/>`;
const figEuler = S.svg(810, 250,
  S.text(130, 22, '① 偏航 ψ：转头（从上往下看）', 'sv-t') + `<line x1="130" y1="130" x2="235" y2="130" class="sv-l-soft" stroke-dasharray="4 4"/>` + S.text(238, 134, '东', 'sv-s', 'start') +
  topView(130, 130, 30) + arc(130, 130, 78, 0, -30) + S.text(218, 100, 'ψ', 'sv-t', 'start') + S.text(130, 236, '绕竖直轴', 'sv-s') +
  S.text(405, 22, '② 俯仰 θ：低头 / 抬头（侧面看）', 'sv-t') + `<line x1="320" y1="140" x2="500" y2="140" class="sv-l-soft" stroke-dasharray="4 4"/>` +
  S.quad(405, 140, 20, 72) + `<line x1="405" y1="140" x2="${(405 + 98 * Math.cos(K.rad(20))).toFixed(1)}" y2="${(140 + 98 * Math.sin(K.rad(20))).toFixed(1)}" class="sv-l-bad" marker-end="url(#AH-bad)"/>` +
  arc(405, 140, 112, 0, 20) + S.text(522, 184, 'θ', 'sv-t', 'start') + S.text(405, 236, '绕机身左右轴（正值 = 机头向下）', 'sv-s') +
  S.text(680, 22, '③ 滚转 φ：左右歪（从后面看）', 'sv-t') + `<line x1="595" y1="140" x2="765" y2="140" class="sv-l-soft" stroke-dasharray="4 4"/>` +
  S.quad(680, 140, -20, 72) + arc(680, 140, 82, 0, -20) + S.text(767, 122, 'φ', 'sv-t', 'start') + S.text(680, 236, '绕机头方向的轴', 'sv-s'),
  '欧拉角：依次转三次');

/* figure: rotation matrix columns + quaternion axis/angle (demo default attitude: yaw 30, pitch 15, roll 0) */
const R0 = eulR(30, 15, 0);
const figMat = S.svg(400, 200, mat(80, 56, R0, { head: 1, hc: 2 }) +
  S.text(200, 170, 'ψ = 30°、θ = 15°、φ = 0 时的 R', 'sv-s') + S.text(200, 188, '每一列 = 机身一根轴在世界里的方向', 'sv-s'), '旋转矩阵的三列');
function qFig(w, h, cx, cy, label) {
  const n = [cx + 40, cy - 110];
  return `<line x1="${cx}" y1="${cy}" x2="${n[0]}" y2="${n[1]}" class="sv-l-acc" style="stroke-width:3" marker-end="url(#AH-acc)"/>` + S.text(n[0] + 8, n[1] + 4, '转轴 n', 'sv-s acc', 'start') +
    `<ellipse cx="${cx + 22}" cy="${cy - 60}" rx="56" ry="17" transform="rotate(20 ${cx + 22} ${cy - 60})" class="sv-l-soft" stroke-dasharray="3 3"/>` +
    `<path d="M${cx - 30} ${cy - 76} A56 17 20 0 0 ${cx + 62} ${cy - 25}" class="sv-l-warn" marker-end="url(#AH-warn)"/>` + S.text(cx - 40, cy - 30, '转 α', 'sv-s warn', 'end') + (label || '');
}
const figQ = S.svg(400, 200, qFig(400, 200, 90, 160,
  S.text(190, 60, 'q = ( cos α/2 ,  sin α/2 · n )', 'sv-t', 'start') + S.text(190, 88, '4 个数，平方和 = 1', 'sv-s', 'start') +
  S.text(190, 120, '例：绕竖直轴转 90°', 'sv-s', 'start') + S.text(190, 142, 'q = (0.71, 0, 0, 0.71)', 'sv-n', 'start')), '四元数：转轴 + 转角');

/* figure: gimbal lock mechanism */
const figLock = S.svg(810, 280,
  S.text(140, 22, '俯仰 0°：两根轴互相垂直', 'sv-t') +
  `<line x1="140" y1="150" x2="140" y2="50" class="sv-l-soft" stroke-dasharray="5 4" marker-end="url(#AH-soft)"/>` + S.text(146, 56, '偏航绕它（竖直轴）', 'sv-s', 'start') +
  S.quad(140, 150, 0, 70) + `<line x1="140" y1="150" x2="250" y2="150" class="sv-l-bad" marker-end="url(#AH-bad)"/>` + S.text(255, 190, '滚转绕它（机头）', 'sv-s bad', 'end') +
  S.text(425, 22, '俯仰 90°：机头朝下，两根轴重合', 'sv-t') +
  `<line x1="425" y1="150" x2="425" y2="50" class="sv-l-soft" stroke-dasharray="5 4" marker-end="url(#AH-soft)"/>` + S.text(445, 50, '偏航绕它', 'sv-s', 'start') +
  S.quad(425, 150, 90, 70) + `<line x1="425" y1="150" x2="425" y2="262" class="sv-l-bad" marker-end="url(#AH-bad)"/>` + S.text(445, 262, '滚转绕它（机头）', 'sv-s bad', 'start') +
  S.text(380, 115, '同一根', 'sv-s warn', 'end') + S.text(380, 131, '竖直线', 'sv-s warn', 'end') +
  `<line x1="575" y1="40" x2="575" y2="262" class="sv-l-grid"/>` +
  S.text(690, 50, '俯仰 90° 时这三组', 'sv-t') + S.text(690, 70, '算出同一个 R：', 'sv-t') +
  S.text(690, 104, '(ψ, φ) = (30°, 0°)', 'sv-n') + S.text(690, 130, '(ψ, φ) = (60°, 30°)', 'sv-n') + S.text(690, 156, '(ψ, φ) = (0°, −30°)', 'sv-n') +
  S.text(690, 194, '只有 ψ − φ = 30° 起作用', 'sv-s warn') + S.text(690, 214, '3 个数只剩 2 个有用', 'sv-s warn'),
  '万向锁的来源：俯仰到 90° 时，偏航轴和滚转轴转到了同一条线上');

/* figure: near the lock a tiny body rotation makes the Euler angles jump (computed with the same matrices) */
const eul = R => [K.deg(Math.atan2(R[1][0], R[0][0])), K.deg(-Math.asin(K.clamp(R[2][0], -1, 1))), K.deg(Math.atan2(R[2][1], R[2][2]))];
const jump = []; for (let p = 0; p <= 89; p += 1) jump.push([p, Math.abs(eul(mm(rx(K.rad(2)), eulR(0, p, 0)))[0])]);
const J = p => jump[p][1];
const PX = (v) => 44 + (v - 0) / 90 * (800 - 52), PY = v => (240 - 26) - v / 70 * (240 - 26 - 26);
const figJump = S.svg(800, 240, S.plot(0, 0, 800, 240, { title: '机身只转 2°，欧拉角里的偏航跳了多少（横轴：开始时的俯仰角）', x: [0, 90], y: [0, 70], xu: '°', yt: [0, 20, 40, 60],
  series: [{ pts: jump, c: 'bad' }] }) +
  `<circle cx="${PX(60)}" cy="${PY(J(60))}" r="4" class="sv-fill-bad"/>` + S.text(PX(60), PY(J(60)) - 10, '俯仰 60°：' + J(60).toFixed(1) + '°', 'sv-s', 'middle') +
  `<circle cx="${PX(89)}" cy="${PY(J(89))}" r="4" class="sv-fill-bad"/>` + S.text(PX(89) - 10, PY(J(89)) + 4, '俯仰 89°：' + J(89).toFixed(0) + '°', 'sv-s bad', 'end'),
  '俯仰越接近 90°，同样一个 2° 的小转动，在欧拉角里变化越大');

/* figure: link to earlier / later lessons */
const figRel = S.svg(810, 120,
  S.box(10, 10, 180, 70, '第 1 课', '推力垂直于机身') + S.box(215, 10, 180, 70, '第 3 课（侧面）', '推力方向 (sinθ, cosθ)') +
  S.box(420, 10, 180, 70, '本课（三维）', '推力方向 = R 的第三列', 'hl') + S.box(625, 10, 175, 70, '第 6 课', '把第三列对准想要的力', 'b') +
  S.arrow(190, 45, 213, 45) + S.arrow(395, 45, 418, 45) + S.arrow(600, 45, 623, 45) +
  S.text(405, 108, '同一句话“推力沿着机身 z 轴”，越写越一般', 'sv-s'), '和前后几课的关系');

/* walkthrough diagrams */
const prW = P3(170, 150, 100);
const wv = (R, lab, right) => S.svg(800, 250, worldAxes(prW, 1.25) + quad3(prW, R) + axes3(prW, R, 1, lab) + right, '数字例子');
const vec = (x, y, name, v, cls) => S.text(x, y, name + ' = (' + v.map(n2).join(', ') + ')', cls || 'sv-t', 'start');
const Rz30 = eulR(30, 0, 0);
const Tn = 2.74 * K.g / Math.cos(K.rad(15)), Fv = col(R0, 2).map(v => v * Tn), Fh = Math.hypot(Fv[0], Fv[1]);
const wQ = R => { const tr = R[0][0] + R[1][1] + R[2][2], s = Math.sqrt(tr + 1) * 2; return [s / 4, (R[2][1] - R[1][2]) / s, (R[0][2] - R[2][0]) / s, (R[1][0] - R[0][1]) / s]; };
const Q0 = wQ(R0), A0 = 2 * Math.acos(Q0[0]), N0 = Q0.slice(1).map(v => v / Math.sin(A0 / 2));
const thrustFig = S.svg(800, 250,
  S.quad(230, 170, 15, 80) +
  `<line x1="230" y1="170" x2="${230 + 7.2 * 6}" y2="${170 - 26.9 * 6}" class="sv-l-acc" style="stroke-width:3" marker-end="url(#AH-acc)"/>` + S.text(286, 18, '推力 ' + Tn.toFixed(1) + ' N', 'sv-n', 'start') +
  `<line x1="230" y1="170" x2="230" y2="${170 - 26.9 * 6}" class="sv-l-b" stroke-dasharray="5 4" marker-end="url(#AH-b)"/>` + S.text(222, 60, '竖直 ' + Fv[2].toFixed(1) + ' N', 'sv-nb', 'end') + S.text(222, 78, '= 重量 m·g', 'sv-s', 'end') +
  `<line x1="230" y1="${170 - 26.9 * 6}" x2="${230 + 7.2 * 6}" y2="${170 - 26.9 * 6}" class="sv-l-warn" marker-end="url(#AH-warn)"/>` +
  S.text(460, 70, '推力向量 = T × (R 第三列)', 'sv-t', 'start') +
  S.text(460, 96, '= ' + Tn.toFixed(1) + ' × (0.22, 0.13, 0.97)', 'sv-n', 'start') +
  S.text(460, 122, '= (' + Fv.map(v => v.toFixed(1)).join(', ') + ') N', 'sv-n', 'start') +
  S.text(460, 160, '水平合力 ' + Fh.toFixed(1) + ' N，朝东偏北 30°', 'sv-nw', 'start') + S.text(460, 182, '→ 飞机开始往那个方向加速', 'sv-s', 'start') +
  S.text(230, 238, '侧面看：机身倾 15°，推力跟着倾 15°', 'sv-s'), '推力向量');
const quatFig = S.svg(800, 230, qFig(800, 230, 140, 190,
  S.text(330, 50, '同一个姿态 = 绕轴 n 转 α', 'sv-t', 'start') +
  vec(330, 82, 'n', N0, 'sv-n') + S.text(330, 108, 'α = ' + K.deg(A0).toFixed(1) + '°，α/2 = ' + K.deg(A0 / 2).toFixed(2) + '°', 'sv-n', 'start') +
  S.text(330, 142, 'q = (cos α/2, sin α/2 · n)', 'sv-t', 'start') + S.text(330, 168, '= (' + Q0.map(v => v.toFixed(3)).join(', ') + ')', 'sv-n', 'start') +
  S.text(330, 200, '0.96² + 0.03² + 0.13² + 0.26² = 1', 'sv-s', 'start')), '四元数');

el.innerHTML = `
<p class="lede">前几课只在侧面看，一个倾角就够。真实的飞机在三维里，朝向（<span class="term">姿态</span>）要三个数才能说清。有三种常用写法：欧拉角给人看，旋转矩阵给控制推导用，四元数给飞控程序算。</p>

<h2>先约定坐标轴</h2>
${K.fig(figAxes, '机身自己带三根轴。本课用左图（z 朝上，推力沿 z<sub>b</sub>）；PX4 用右图（z 朝下，推力沿 −z<sub>b</sub>）。只差符号，道理一样。')}
${K.more('展开：世界坐标的约定', `<p>本课的世界坐标是“x 东、y 北、z 上”（ENU），下面的实验也是。PX4 的世界坐标是“x 北、y 东、z 下”（NED），偏航从正北算起。读别人的代码或日志时，先查清它用哪一套。</p>`)}

<h2>方法一：欧拉角，三个转角</h2>
${K.fig(figEuler, '从“放平、机头朝东”开始，依次转三次：先转头（偏航 ψ），再低头（俯仰 θ），最后左右歪（滚转 φ）。人看得懂，所以遥控器、地面站、日志显示都用它。')}
${K.more('展开：转动顺序也是约定', `<p>先转哪个、后转哪个，以及角度从哪个方向算起，都是约定，不同软件可能不同。这里用的是飞行器最常见的“偏航 → 俯仰 → 滚转”（Z-Y-X）顺序，下面的实验也一样。顺序换了，同样三个数会得到不同的姿态。</p>`)}

<h2>方法二：旋转矩阵 · 方法三：四元数</h2>
<div class="figrow">${K.fig(figMat, '<b>旋转矩阵 R</b>：把机身三根轴在世界里的方向排成三列。<b>第三列就是推力方向</b>（z 朝上约定下），第 6 课的几何控制直接用它。')}${K.fig(figQ, '<b>四元数</b>：任何朝向都能看成“绕某根轴转某个角度”，把轴和角打包成 4 个数。PX4 内部存姿态、算姿态误差都用它。')}</div>
${K.more('展开：四元数的细节', `<div class="formula">q = ( cos(α/2),  sin(α/2)·n<sub>x</sub>,  sin(α/2)·n<sub>y</sub>,  sin(α/2)·n<sub>z</sub> )
<div class="where">n = (n<sub>x</sub>, n<sub>y</sub>, n<sub>z</sub>)：转轴方向（长度为 1）；α：转过的角度。4 个数的平方和恒等于 1（单位四元数）。</div></div>
<p>它只用 4 个数（矩阵要 9 个），没有万向锁，两个姿态之间也好插值；缺点是人眼看不懂，所以 PX4 显示给人看时再换成欧拉角。q 和 −q 表示同一个姿态：−q 对应“绕 n 转 α + 360°”，多转一整圈，结果一样。代码里常约定 w ≥ 0，避免两种写法来回跳。（注意：绕 −n 转 −α 得到的还是 q 本身，不是 −q。）</p>`)}
<div id="walk"></div>

<h2>万向锁：欧拉角的毛病</h2>
${K.fig(figLock, '俯仰正好到 90° 时，偏航和滚转变成绕同一根轴转，三个数只剩两个有用，这叫<span class="term">万向锁</span>。丢掉自由度的是<b>这种写法</b>，飞机本身照样能往任何方向转。')}
${K.fig(figJump, '用同样的矩阵算：机身绕东西方向的轴只转 2°。从俯仰 60° 开始，欧拉角里的偏航只变 ' + J(60).toFixed(1) + '°；从俯仰 89° 开始，偏航和滚转各跳 ' + J(89).toFixed(0) + '°。控制器如果拿欧拉角算误差，指令也会跟着跳。所以做大机动的控制器内部不用欧拉角。')}
${K.more('展开：平时为什么没感觉', `<p>正常悬停和巡航时俯仰离 ±90° 很远，所以人看欧拉角没问题。俯仰 +90° 时只有“偏航 − 滚转”有意义，−90° 时只有“偏航 + 滚转”有意义；下面的实验里可以直接试。</p>`)}
<div id="d4"></div>

<h2>和其他课的关系</h2>
${K.fig(figRel, '')}
<div class="tblwrap"><table class="tbl">
<tr><th></th><th>几个数</th><th>万向锁</th><th>谁在用</th></tr>
<tr><td>欧拉角</td><td>3</td><td>有</td><td>人看、遥控器、日志显示</td></tr>
<tr><td>旋转矩阵</td><td>9</td><td>无</td><td>几何控制推导（第 6 课）</td></tr>
<tr><td>四元数</td><td>4</td><td>无</td><td>PX4 内部计算、姿态估计（第 4 课）</td></tr>
</table></div>

<div class="key"><h3>这一课记住三件事</h3><ul>
<li>欧拉角直观，但俯仰到 ±90° 时会万向锁（是表示方法的问题，不是飞机的问题）。</li>
<li>旋转矩阵的第三列就是推力方向（z 朝上的约定下；PX4 的 z 朝下，差一个负号）。</li>
<li>四元数 = 转轴 + 转角，4 个数，没有万向锁，PX4 内部用它。</li>
</ul></div>
<h2>小测验</h2><div id="q4"></div>`;

K.steps(el.querySelector('#walk'), { title: '用数字走一遍：偏航 30°、俯仰 15°、滚转 0（就是下面实验的默认姿态）', steps: [
  { svg: wv(I3, ['', '', ''], mat(470, 80, I3, { head: 1 }) + S.text(570, 200, '放平、机头朝东：R = 单位矩阵', 'sv-s')),
    t: '<b>起点</b>：放平、机头朝东。机身三根轴和世界三根轴重合，R 是单位矩阵。' },
  { svg: wv(Rz30, ['x_b 机头', '', ''], mat(470, 80, Rz30, { head: 1, cols: [0] }) + vec(470, 200, '机头', col(Rz30, 0), 'sv-n')),
    t: '<b>偏航 30°</b>：绕竖直轴转头。机头变成 (cos30°, sin30°, 0) = <b>(0.87, 0.50, 0)</b>，朝东偏北。这就是 R 的第一列。' },
  { svg: wv(R0, ['x_b 机头', '', 'z_b 推力'], mat(470, 80, R0, { head: 1, cols: [0, 2], hc: 2 }) + vec(470, 200, '推力方向', col(R0, 2), 'sv-n')),
    t: '<b>俯仰 15°（低头）</b>：机头往下压，变成 <b>(0.84, 0.48, −0.26)</b>；机身正上方跟着往前倒，变成 <b>(0.22, 0.13, 0.97)</b>。竖直分量 0.97 就是 cos15°。' },
  { svg: wv(R0, ['x_b', 'y_b', 'z_b'], mat(470, 80, R0, { head: 1, hc: 2 }) + S.text(570, 200, '滚转 0，左侧轴只被偏航转过：(−0.50, 0.87, 0)', 'sv-s')),
    t: '<b>整个 R</b>：三列分别是机头、左侧、推力方向。这 9 个数就是下面实验右边显示的矩阵。' },
  { svg: thrustFig,
    t: '<b>推力向量</b>：想保持高度，竖直分量要等于重量 2.74 × 9.81 = 26.9 N，所以 T = 26.9 / 0.97 = <b>' + Tn.toFixed(1) + ' N</b>。乘上第三列，水平还剩 <b>' + Fh.toFixed(1) + ' N</b>，推着飞机往东偏北加速。这正是第 3 课“先歪再走”的三维版本。' },
  { svg: quatFig,
    t: '<b>换成四元数</b>：同一个姿态也等于绕轴 (−0.12, 0.44, 0.89) 转 <b>' + K.deg(A0).toFixed(1) + '°</b>，打包成 q = <b>(0.958, −0.034, 0.126, 0.257)</b>。只用 4 个数，平方和是 1。' },
] });

const d = K.demo(el.querySelector('#d4'), '动手', '转动一架三维的四旋翼',
  '拖动三个角度，右边会实时显示旋转矩阵和四元数。把俯仰拉到 90°，然后分别拖滚转和偏航，看看它们是不是变成了同一个动作。拖动画面可以换视角。');
const cvs = K.box(d, 'cvs');
const cv = K.canvas(cvs, 0.85, 280);
const info = K.box(cvs, 'formula', '');
info.style.fontSize = '14px';
const ctl = K.box(d, 'controls');
const sY = K.slider(ctl, { id: 'l4-y', label: '偏航 ψ（转头）', min: -180, max: 180, step: 1, value: 30, fmt: v => v + '°' });
const sP = K.slider(ctl, { id: 'l4-p', label: '俯仰 θ（正值机头向下）', min: -90, max: 90, step: 1, value: 15, fmt: v => v + '°' });
const sR = K.slider(ctl, { id: 'l4-r', label: '滚转 φ（左右歪）', min: -180, max: 180, step: 1, value: 0, fmt: v => v + '°' });
const br = K.box(ctl, 'btnrow');
K.btn(br, '放平', () => { sY.set(0); sP.set(0); sR.set(0); });
K.btn(br, '俯仰 90°', () => sP.set(90), 'primary');
let az = K.rad(35), elv = K.rad(22), drag = null;
cv.cv.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY, az, elv]; cv.cv.setPointerCapture(e.pointerId); });
cv.cv.addEventListener('pointermove', e => { if (!drag) return; az = drag[2] - (e.clientX - drag[0]) * 0.01; elv = K.clamp(drag[3] + (e.clientY - drag[1]) * 0.01, -0.2, 1.4); });
cv.cv.addEventListener('pointerup', () => { drag = null; });
const mul = (A, B) => A.map((r, i) => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
const Rz = a => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
const Ry = a => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
const Rx = a => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
const ap = (R, p) => [0, 1, 2].map(i => R[i][0] * p[0] + R[i][1] * p[1] + R[i][2] * p[2]);
function quat(R) {
  const tr = R[0][0] + R[1][1] + R[2][2]; let w, x, y, z;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; w = s / 4; x = (R[2][1] - R[1][2]) / s; y = (R[0][2] - R[2][0]) / s; z = (R[1][0] - R[0][1]) / s; }
  else if (R[0][0] > R[1][1] && R[0][0] > R[2][2]) { const s = Math.sqrt(1 + R[0][0] - R[1][1] - R[2][2]) * 2; w = (R[2][1] - R[1][2]) / s; x = s / 4; y = (R[0][1] + R[1][0]) / s; z = (R[0][2] + R[2][0]) / s; }
  else if (R[1][1] > R[2][2]) { const s = Math.sqrt(1 + R[1][1] - R[0][0] - R[2][2]) * 2; w = (R[0][2] - R[2][0]) / s; x = (R[0][1] + R[1][0]) / s; y = s / 4; z = (R[1][2] + R[2][1]) / s; }
  else { const s = Math.sqrt(1 + R[2][2] - R[0][0] - R[1][1]) * 2; w = (R[1][0] - R[0][1]) / s; x = (R[0][2] + R[2][0]) / s; y = (R[1][2] + R[2][1]) / s; z = s / 4; }
  if (w < 0) { w = -w; x = -x; y = -y; z = -z; }
  return [w, x, y, z];
}
const f2 = v => (v >= 0 ? '&nbsp;' : '') + v.toFixed(2);
K.loop(() => {
  const R = mul(mul(Rz(K.rad(sY.v)), Ry(K.rad(sP.v))), Rx(K.rad(sR.v)));
  const c = K.col(), o = cv.fit(), ctx = o.ctx, S = Math.min(o.w, o.h) * 0.36, cx = o.w / 2, cy = o.h * 0.55;
  const pr = p => { const x1 = p[0] * Math.cos(az) - p[1] * Math.sin(az), y1 = p[0] * Math.sin(az) + p[1] * Math.cos(az); return [cx + y1 * S, cy - (p[2] * Math.cos(elv) - x1 * Math.sin(elv)) * S]; };
  const line = (a, b, col, w, dash) => { const A = pr(a), B = pr(b); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.setLineDash([]); };
  for (let i = -2; i <= 2; i++) { line([i * 0.5, -1, -0.9], [i * 0.5, 1, -0.9], c.grid, 1); line([-1, i * 0.5, -0.9], [1, i * 0.5, -0.9], c.grid, 1); }
  [[[1.1, 0, 0], c.bad, '东 x'], [[0, 1.1, 0], c.ok, '北 y'], [[0, 0, 1.1], c.b, '上 z']].forEach(([p, col, lab]) => { line([0, 0, 0], p, col, 1, [4, 4]); const P = pr(p); K.text(ctx, lab, P[0] + 4, P[1], col, '11px "Noto Sans SC", sans-serif'); });
  const a = 0.36, rot = [[a, a], [a, -a], [-a, -a], [-a, a]];
  rot.forEach(([x, y], i) => {
    line([0, 0, 0], ap(R, [x, y, 0]), i < 2 ? c.warn : c.ink, 4);
    ctx.strokeStyle = i < 2 ? c.warn : c.ink; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let k = 0; k <= 24; k++) { const t = k / 24 * Math.PI * 2, P = pr(ap(R, [x + 0.16 * Math.cos(t), y + 0.16 * Math.sin(t), 0.04])); k ? ctx.lineTo(P[0], P[1]) : ctx.moveTo(P[0], P[1]); }
    ctx.stroke();
  });
  const O = pr([0, 0, 0]);
  [[[0.85, 0, 0], c.bad, '机头 x_b'], [[0, 0.85, 0], c.ok, '左侧 y_b'], [[0, 0, 0.85], c.b, '推力方向 z_b']].forEach(([p, col, lab]) => { const P = pr(ap(R, p)); K.arrow(ctx, O[0], O[1], P[0], P[1], col, 3); K.text(ctx, lab, P[0] + 6, P[1] - 4, col, '600 12px "Noto Sans SC", sans-serif'); });
  K.text(ctx, '拖动画面换视角；橙色两臂是机头一侧', 10, o.h - 10, c.soft);
  const Q = quat(R), ang = 2 * Math.acos(K.clamp(Q[0], -1, 1)), sn = Math.sin(ang / 2);
  const ax = sn > 1e-4 ? [Q[1] / sn, Q[2] / sn, Q[3] / sn] : [0, 0, 1];
  const lock = Math.abs(sP.v) >= 89;
  info.innerHTML = `<div style="color:var(--soft);font-family:var(--f-body)">旋转矩阵 R（每一列是机身一根轴在世界里的方向）</div>
<div style="display:grid;grid-template-columns:repeat(3,auto);gap:2px 18px;justify-content:start;margin:6px 0 2px">
<span style="color:var(--bad)">x_b</span><span style="color:var(--ok)">y_b</span><span style="color:var(--b)">z_b 推力</span>
${[0, 1, 2].map(i => [0, 1, 2].map(j => `<span>${f2(R[i][j])}</span>`).join('')).join('')}</div>
<div style="color:var(--soft);font-family:var(--f-body);margin-top:10px">四元数 q = (w, x, y, z)</div>
<div>(${Q.map(f2).join(', ')})</div>
<div style="color:var(--soft);font-family:var(--f-body);margin-top:10px">等价于：绕轴 (${ax.map(v => v.toFixed(2)).join(', ')}) 转 ${K.deg(ang).toFixed(0)}°</div>
${lock ? '<div style="margin-top:10px;color:var(--bad);font-family:var(--f-body);font-weight:600">万向锁：现在拖滚转和拖偏航，机身做的是同一个动作（俯仰 +90° 时只有“偏航 − 滚转”有意义，−90° 时只有“偏航 + 滚转”有意义）。</div>' : ''}`;
});

K.box(d, 'assume', '<b>这个实验做了哪些简化：</b>这里只演示几何上的旋转怎么表示，没有任何动力学和控制。');

K.quiz(el.querySelector('#q4'), 'l4', [
  { q: '旋转矩阵 R 的第三列代表什么？', o: ['机头方向', '机身正上方在世界里的方向，也就是推力方向', '重力方向', '速度方向'], a: 1,
    e: '每一列是机身一根轴在世界坐标里的方向。第三列是机身 z 轴，按本课 z 朝上的约定，推力就沿着它（PX4 用 z 朝下，推力沿反方向）。' },
  { q: '欧拉角的俯仰到 90° 时会出什么问题？', o: ['角度超出范围报错', '偏航和滚转变成绕同一根轴转，这种表示丢掉一个自由度（万向锁）', '四元数失效', '没有问题'], a: 1,
    e: '这时三个角度只剩两个有用。附近机身稍微一转，角度数值就可能剧烈变化，所以 PX4 这类飞控内部用四元数而不是欧拉角来算姿态误差。' },
  { q: '四元数 q 和 −q 是什么关系？', o: ['方向相反的两个姿态', '同一个姿态', '一个是另一个的倒数', '没有关系'], a: 1,
    e: '−q 相当于绕 n 转 α + 360°，多转一整圈，姿态不变。代码里常约定 w ≥ 0，避免两种写法来回跳。（注意：绕 −n 转 −α 其实就是同一个 q，不是 −q。）' },
  { q: '偏航 30°、俯仰 15°、滚转 0 时，R 的第三列是 (0.22, 0.13, 0.97)。总推力 27.8 N 时，推力的竖直分量大约是多少？', o: ['27.8 N，推力全部向上', '27.8 × 0.97 ≈ 26.9 N，正好等于重量', '27.8 × 0.22 ≈ 6.2 N', '0，推力是水平的'], a: 1,
    e: '推力向量 = T × 第三列，竖直分量 = 27.8 × 0.97 ≈ 26.9 N = 2.74 × 9.81，刚好托住重量；剩下的水平分量约 7.2 N 推着飞机往东偏北加速。' },
]);
} });
