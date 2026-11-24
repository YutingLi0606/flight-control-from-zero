K.add({ id: 'l1', num: 1, title: '四旋翼为什么能飞', sub: '推力、力矩，以及为什么要先倾斜才能移动', render(el) {
const S = K.S;
/* numbers of this lesson (same model as the demo: K.Quad, m = 2.74 kg, max thrust = 1.95 × weight) */
const M = 2.74, W = M * K.g, TMAX = 1.95 * W, HOV = 100 / 1.95;   /* 26.88 N, 52.41 N, 51.3 % */
const f2 = v => v.toFixed(2), f1 = v => v.toFixed(1);

/* ---------- figure: hover thrust = 51 % of max ---------- */
const bx0 = 150, bx1 = 770, bsc = (bx1 - bx0) / TMAX;
const figHover = S.svg(820, 170,
  S.text(20, 58, '四个桨合起来', 'sv-t', 'start') +
  `<rect x="${bx0}" y="40" width="${bx1 - bx0}" height="28" rx="5" class="sv-box"/>` +
  `<rect x="${bx0}" y="40" width="${(W * bsc).toFixed(1)}" height="28" rx="5" class="sv-fill-acc" opacity=".8"/>` +
  S.text(bx0 + W * bsc / 2, 30, '悬停：托住重量 2.74 × 9.81 = 26.9 N', 'sv-t') +
  S.text(bx1, 88, '最大 52.4 N（重量的 1.95 倍）', 'sv-s', 'end') +
  S.text(bx0 + W * bsc, 88, '51%', 'sv-n') +
  S.text(20, 128, '每个桨', 'sv-t', 'start') +
  [0, 1, 2, 3].map(i => {
    const x = bx0 + i * 160, w = 140, sc = w / (TMAX / 4);
    return `<rect x="${x}" y="112" width="${w}" height="20" rx="4" class="sv-box"/><rect x="${x}" y="112" width="${(W / 4 * sc).toFixed(1)}" height="20" rx="4" class="sv-fill-acc" opacity=".55"/>` +
      S.text(x + w / 2, 152, '用 6.72 N / 最多 13.1 N', 'sv-s');
  }).join(''),
  '悬停推力占最大推力的 51%');

/* ---------- figure: top view, four ways to change the four rotor speeds ---------- */
/* PX4 quadrotor X: front-right and rear-left spin counter-clockwise, front-left and rear-right clockwise (seen from above) */
function topQuad(cx, cy, fast, slow, title, sub, yaw) {
  const s = 44, r = 25, P = { fl: [-s, -s], fr: [s, -s], rl: [-s, s], rr: [s, s] }, ccw = { fr: 1, rl: 1 };
  let b = `<line x1="${cx - s}" y1="${cy - s}" x2="${cx + s}" y2="${cy + s}" class="sv-l-ink" style="stroke-width:4"/><line x1="${cx + s}" y1="${cy - s}" x2="${cx - s}" y2="${cy + s}" class="sv-l-ink" style="stroke-width:4"/>` +
    `<rect x="${cx - 13}" y="${cy - 15}" width="26" height="30" rx="4" class="sv-fill-ink"/>` +
    `<path d="M${cx} ${cy - 84} l-8 12 h16 z" class="sv-fill-warn"/>` + S.text(cx + 12, cy - 74, '机头', 'sv-s warn', 'start');
  Object.keys(P).forEach(k => {
    const x = cx + P[k][0], y = cy + P[k][1], c = ccw[k] ? 'acc' : 'b', f = fast.includes(k), sl = slow.includes(k);
    b += `<circle cx="${x}" cy="${y}" r="${r}" class="sv-l-${c}" style="stroke-width:${f ? 4.5 : 1.6}"${sl ? ' stroke-dasharray="4 4"' : ''}/>` +
      S.text(x, y + 5, ccw[k] ? '逆' : '顺', 'sv-s ' + c);
    if (f || sl) S;
    if (f || sl) b += S.text(x + (P[k][0] > 0 ? 1 : -1) * (r + 10), y + (P[k][1] > 0 ? 22 : -16), f ? '快' : '慢', f ? 'sv-t' : 'sv-s', P[k][0] > 0 ? 'start' : 'end');
  });
  if (yaw) b += `<path d="M${cx} ${cy - 24} A24 24 0 1 1 ${cx - 24} ${cy}" class="sv-l-warn" marker-end="url(#AH-warn)"/>`;
  return b + S.text(cx, cy + 102, title, 'sv-t') + S.text(cx, cy + 120, sub, 'sv-s');
}
const figFour = S.svg(820, 262,
  topQuad(105, 112, ['fl', 'fr', 'rl', 'rr'], [], '上升：四个一起快', '总推力') +
  topQuad(310, 112, ['fl', 'rl'], ['fr', 'rr'], '左边快、右边慢', '向右倒：滚转（roll）') +
  topQuad(515, 112, ['rl', 'rr'], ['fl', 'fr'], '后面快、前面慢', '机头低下：俯仰（pitch）') +
  topQuad(720, 112, ['fr', 'rl'], ['fl', 'rr'], '“逆”那对快', '机身顺时针转：偏航（yaw）', 1),
  '俯视图：四种改转速的方式，对应总推力、滚转、俯仰、偏航');

/* ---------- figure: thrust is always perpendicular to the body ---------- */
const th20 = K.rad(20), T20 = W / Math.cos(th20), ps = 5.5, cx = 210, cy = 185;
const tipX = cx + T20 * ps * Math.sin(th20), tipY = cy - T20 * ps * Math.cos(th20);
const figVec = S.svg(820, 350,
  S.quad(cx, cy, 20, 78, {}) +
  `<line x1="${cx}" y1="${cy}" x2="${tipX.toFixed(1)}" y2="${tipY.toFixed(1)}" class="sv-l-acc" style="stroke-width:3.5" marker-end="url(#AH-acc)"/>` +
  `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${tipY.toFixed(1)}" class="sv-l-b" marker-end="url(#AH-b)"/>` +
  `<line x1="${cx}" y1="${tipY.toFixed(1)}" x2="${tipX.toFixed(1)}" y2="${tipY.toFixed(1)}" class="sv-l-warn" marker-end="url(#AH-warn)"/>` +
  `<line x1="${cx}" y1="${cy + 12}" x2="${cx}" y2="${cy + 12 + W * ps}" class="sv-l-ink" marker-end="url(#AH-ink)"/>` +
  `<path d="M${cx} ${cy - 60} A60 60 0 0 1 ${(cx + 60 * Math.sin(th20)).toFixed(1)} ${(cy - 60 * Math.cos(th20)).toFixed(1)}" class="sv-l-ink" style="stroke-width:1.2"/>` +
  S.text(cx + 30, cy - 48, '20°', 'sv-t', 'start') +
  S.text((cx + tipX) / 2 + 14, (cy + tipY) / 2 - 10, '推力 28.6 N', 'sv-n', 'start') +
  S.text(cx - 10, tipY + 50, '竖直 26.9 N', 'sv-nb', 'end') +
  S.text(cx + 27, tipY - 12, '水平 9.8 N', 'sv-nw') +
  S.text(cx - 10, cy + 130, '重力 26.9 N', 'sv-s', 'end') +
  S.text(450, 80, '倾斜 θ = 20°，推力开到 28.6 N（最大值的 54.6%）', 'sv-t', 'start') +
  S.text(450, 120, '竖直：28.6 × cos20° = 26.9 N', 'sv-nb', 'start') + S.text(450, 140, '正好托住重量，高度不变', 'sv-s', 'start') +
  S.text(450, 180, '水平：28.6 × sin20° = 9.8 N', 'sv-nw', 'start') + S.text(450, 200, '÷ 2.74 kg = 3.57 m/s²，开始向右加速', 'sv-s', 'start') +
  S.text(450, 244, '推力只能沿机身的“正上方”，', 'sv-s', 'start') + S.text(450, 262, '所以要横着走，只能先把机身歪过去。', 'sv-s', 'start'),
  '倾斜 20° 时推力分成竖直和水平两部分');

/* ---------- figure: thrust needed to hold height vs tilt ---------- */
const need = []; for (let a = 0; a <= 64; a += 1) need.push([a, HOV / Math.cos(K.rad(a))]);
const amax = K.deg(Math.acos(1 / 1.95));
const figNeed = S.svg(420, 250,
  S.plot(0, 0, 420, 250, { title: '保持高度需要的推力（% 最大值）', x: [0, 64], y: [40, 110], xu: '°', xt: [0, 20, 40, 59], yt: [51, 72, 100],
    series: [{ pts: need, c: 'acc' }], hl: [{ v: 100, c: 'bad' }] }) + S.text(52, 48, '最大推力 100%', 'sv-s bad', 'start') +
  `<line x1="${44 + amax / 64 * 368}" y1="26" x2="${44 + amax / 64 * 368}" y2="224" class="sv-l-bad" stroke-dasharray="3 3" style="stroke-width:1"/>` +
  S.text(44 + 20 / 64 * 368, 206, '20° → 55%', 'sv-s acc') + S.text(44 + 45 / 64 * 368 - 10, 118, '45° → 72%', 'sv-s acc', 'end'),
  '保持高度需要的推力随倾角增大');

/* ---------- figure: the demo's own model run offline: tilt 20° with and without extra thrust ---------- */
function run(pct) {
  const q = new K.Quad({ z: 1.5 }), out = [[0, 1.5]];
  for (let n = 1; n <= 1000; n++) { q.step(0.002, pct / 100 * q.Tmax, K.att(q, th20)); if (n % 20 === 0) out.push([n * 0.002, q.z]); }
  return out;
}
const rA = run(HOV), rB = run(HOV / Math.cos(th20));
const figDrop = S.svg(420, 250,
  S.plot(0, 0, 420, 250, { title: '倾 20° 后的高度', x: [0, 2], y: [0, 2], xu: 's', yt: [0, 0.5, 1, 1.5, 2],
    series: [{ pts: rA, c: 'bad', label: '不加推力' }, { pts: rB, c: 'acc', label: '加推力' }] }),
  '推力不变时，倾斜后会掉高度');

/* ---------- figure: 6 things to control, 4 knobs ---------- */
const kx = 20, ax = 320, px = 630, ys = [30, 100, 170, 240], bw = 160, bh = 48;
const figUnder = S.svg(820, 300,
  S.text(kx + bw / 2, 18, '手里的 4 个旋钮', 'sv-s acc') + S.text(ax + bw / 2, 18, '转动角度', 'sv-s') + S.text(px + bw / 2, 18, '要控制的位置', 'sv-s') +
  S.box(kx, ys[0], bw, bh, '总推力', '', 'hl') + S.box(kx, ys[1], bw, bh, '滚转力矩', '', 'hl') + S.box(kx, ys[2], bw, bh, '俯仰力矩', '', 'hl') + S.box(kx, ys[3], bw, bh, '偏航力矩', '', 'hl') +
  S.box(ax, ys[1], bw, bh, '滚转角', '左右歪') + S.box(ax, ys[2], bw, bh, '俯仰角', '前后歪') + S.box(ax, ys[3], bw, bh, '偏航角', '机头朝向') +
  S.box(px, ys[0], bw, bh, '上下 z') + S.box(px, ys[1], bw, bh, '左右 y') + S.box(px, ys[2], bw, bh, '前后 x') +
  S.arrow(kx + bw, ys[0] + 24, px - 2, ys[0] + 24, { c: 'acc', label: '直接（推力本来就向上）' }) +
  [1, 2, 3].map(i => S.arrow(kx + bw, ys[i] + 24, ax - 2, ys[i] + 24, { c: 'acc' })).join('') +
  S.arrow(ax + bw, ys[1] + 24, px - 2, ys[1] + 24, { dash: 1, label: '歪了才有水平推力', side: 'above' }) +
  S.arrow(ax + bw, ys[2] + 24, px - 2, ys[2] + 24, { dash: 1, label: '歪了才有水平推力', side: 'above' }) +
  S.text(px + bw / 2, ys[3] + 30, '朝向只影响往哪边看', 'sv-s'),
  '6 个要控制的量，只有 4 个旋钮：水平位置只能靠“先歪”间接控制');

/* ---------- figure: where an external controller sits (CTBR) ---------- */
const figCTBR = S.svg(820, 200,
  S.box(20, 70, 150, 64, K.ours('', '外部控制器'), '伴随计算机上', 'px') +
  `<rect x="300" y="40" width="360" height="124" rx="12" class="sv-box" stroke-dasharray="6 5"/>` + S.text(480, 186, 'PX4（飞控板上的开源飞控软件，第 3 课细讲）', 'sv-s') +
  S.box(316, 70, 156, 64, '角速度环', '想要的 − 陀螺仪测到的') + S.box(490, 70, 150, 64, '电机分配', '→ 4 个电机') +
  S.box(690, 70, 110, 64, '4 个桨', '转速') +
  S.arrow(170, 102, 314, 102, { c: 'warn', label: '推力 + 3 个角速度' }) + S.text(242, 124, '125 次/秒', 'sv-s warn') +
  S.arrow(472, 102, 488, 102) + S.arrow(640, 102, 688, 102) +
  S.text(95, 56, '决定推多大、怎么转', 'sv-s'),
  K.ours('', '外部控制器只发“总推力 + 角速度”，PX4 再把它变成四个电机的转速'));

/* ---------- walkthrough: hover → tilt → move → brake (side view, 2 rotors = the demo model) ---------- */
const NS = 5;   /* px per N for rotor arrows */
function side(th, TL, TR, lines, extra) {
  return S.svg(820, 220,
    `<line x1="40" y1="200" x2="420" y2="200" class="sv-l-grid"/>` +
    S.quad(230, 140, th, 90, { fl: TL * NS, fr: TR * NS }) +
    S.text(120, 214, '左侧 ' + f2(TL) + ' N', 'sv-n') + S.text(340, 214, '右侧 ' + f2(TR) + ' N', 'sv-n') +
    lines.map((l, i) => S.text(460, 50 + i * 30, l[0], l[1] || 'sv-t', 'start')).join('') + (extra || ''), '侧视图：两侧推力');
}
const Th = W / 2, T2 = T20 / 2;
const steps = [
  { svg: side(0, Th, Th, [['悬停：两侧推力相等', 'sv-t'], ['合力 2 × 13.44 = 26.88 N', 'sv-n'], ['= 重量 2.74 × 9.81，正好托住', 'sv-s'], ['两侧一样大，机身不转', 'sv-s']]),
    t: '<b>悬停</b>：侧面看只有左右两侧（每侧代表两个桨），各 <b>13.44 N</b>，合起来 26.88 N 正好等于重量。' },
  { svg: side(8, Th + 1, Th - 1, [['先转身：左边 +1 N，右边 −1 N', 'sv-t'], ['总推力不变，仍是 26.88 N', 'sv-s'], ['力矩 = (14.44 − 12.44) × 0.25 m = 0.5 N·m', 'sv-n'], ['角加速度 = 0.5 ÷ 0.03 = 16.7 rad/s²', 'sv-n'], ['先加速转、再反向刹住，约 0.29 s 到 20°', 'sv-s']],
      `<path d="M300 70 A80 80 0 0 1 330 100" class="sv-l-warn" marker-end="url(#AH-warn)"/>`),
    t: '<b>先转身</b>：左边多推 1 N、右边少推 1 N。两侧的差乘以力臂 0.25 m，得到 <b>0.5 N·m</b> 的力矩，机身向右歪；大约 <b>0.29 s</b> 歪到 20°。' },
  { svg: side(20, Th, Th, [['歪到 20°，推力还是 26.88 N', 'sv-t'], ['竖直：26.88 × cos20° = 25.26 N', 'sv-nb'], ['比重量少 1.62 N → 往下掉 0.59 m/s²', 'sv-s bad'], ['水平：26.88 × sin20° = 9.19 N', 'sv-nw']]),
    t: '<b>只歪不加推力</b>：竖直分量只剩 <b>25.26 N</b>，托不住 26.88 N 的重量，于是一边往右走、一边往下掉。' },
  { svg: side(20, T2, T2, [['推力加到 28.60 N（54.6%）', 'sv-t'], ['竖直：28.60 × cos20° = 26.88 N，托住了', 'sv-nb'], ['水平：28.60 × sin20° = 9.78 N', 'sv-nw'], ['加速度 9.78 ÷ 2.74 = 3.57 m/s²', 'sv-n'], ['1 s 后：速度 3.57 m/s，走了 1.79 m', 'sv-s']],
      S.arrow(200, 186, 270, 186, { c: 'warn', label: '3.57 m/s²', side: 'above' })),
    t: '<b>加推力</b>：总推力 = 26.88 ÷ cos20° = <b>28.60 N</b>。高度保住了，水平方向 9.78 N 推着它以 <b>3.57 m/s²</b> 加速。' },
  { svg: side(-20, T2, T2, [['刹车：反方向歪 20°', 'sv-t'], ['水平：−9.78 N → −3.57 m/s²', 'sv-nw'], ['从 3.57 m/s 减到 0 要 1 s', 'sv-n'], ['要停下来，也得先转身', 'sv-s']],
      S.arrow(270, 186, 200, 186, { c: 'warn', label: '−3.57 m/s²', side: 'above' })),
    t: '<b>刹车</b>：没有“倒车”可挂，只能往反方向歪 20°，让水平分量朝后，<b>1 s</b> 把 3.57 m/s 减到 0。不管加速还是刹车，第一步都是转身。' },
];

el.innerHTML = `
<p class="lede">一架四旋翼只有四个螺旋桨，它怎么上升、平移、转头？答案一句话：<b>推力总是垂直于机身，想横着走就得先歪过去。</b>后面每一课的飞控方法，都在处理这件事。</p>

<h2>手里只有四个旋钮</h2>
${K.fig(figHover, '飞控能直接改的只有四个桨的转速，转得越快，<span class="term">推力</span>越大。' + K.ours('', '示例飞机（接近 Holybro X500 V2 加机械臂的量级）约 2.74 kg') + '，四个桨开满能推 1.95 倍重量，所以<b>悬停只用 51%</b>。')}
${K.fig(figFour, '四个桨两两反着转（PX4 的 X 型布局）。粗圈 = 转快，虚线圈 = 转慢。每个桨转动时空气会反过来拧机身（<span class="term">反扭矩</span>）；平时两对互相抵消，让“逆”那对快一点，机身就往反方向（顺时针）转头。')}
<p>所以四个转速等价于四个量：<b>一个总推力 + 三个方向的转动力矩</b>（力矩就是“拧”的力）。</p>
${K.more('展开：推力和转速、偏航为什么慢', `<ul>
<li>51% 说的是推力，不是转速。推力大致和转速的平方成正比，51% 的推力大约对应 √0.51 ≈ 71% 的转速。</li>
<li>每个桨最多约 13.1 N（52.4 N ÷ 4），悬停时各用约 6.72 N。</li>
<li>反扭矩产生的偏航力矩比推力差产生的滚转、俯仰力矩小得多，所以四旋翼转头通常比倾斜慢。</li>
</ul>`)}

<h2>推力永远垂直于机身</h2>
${K.fig(figVec, '把推力想成一根插在机身上的箭头：机身歪到哪，箭头就指向哪。竖直分量 <span class="mono">T·cosθ</span> 托住重量，水平分量 <span class="mono">T·sinθ</span> 推着机身走。')}
<div class="figrow">
${K.fig(figNeed, '保持高度需要 51% ÷ cosθ：倾 20° 多 6%，倾 45° 多 41%。最大推力只够倾到约 59°（理想上限）。')}
${K.fig(figDrop, '用下面实验的同一个模型：倾 20° 后推力不变，2 秒掉了 1 米；加到 55% 就不再往下掉（刚开始那 0.3 s 机身还没歪够，多出的推力让它带着约 8 cm/s 慢慢上升）。')}
</div>
<div id="walk1"></div>

<h2>6 个要管的量，只有 4 个旋钮</h2>
${K.fig(figUnder, '位置 3 个 + 转动 3 个，一共 6 个量，手里只有 4 个旋钮。这叫<span class="term">欠驱动</span>。前后、左右没有旋钮能直接推，只能走“先转身、再移动”这条因果链。')}
<div id="d1"></div>

<h2>${K.ours('', `控制器和 PX4 之间的接口：CTBR`)}</h2>
${K.fig(figCTBR, '<b>PX4</b> 是装在飞控板' + K.ours('', '（例如 Pixhawk 6C）上的开源飞控软件。外部控制器（比如跑在伴随计算机上的程序）可以每秒给它发上百次（例如 125 次）') + '“总推力 + 三个方向的角速度”，这种指令叫 <b>CTBR</b>。所以设计控制器，就是决定“推多大力、往哪边转、转多快”。')}
${K.more('展开：CTBR 和上面实验的区别', `<p>CTBR 是 Collective Thrust and Body Rates（总推力加机体角速度）的缩写。PX4 里还有一层自己的<b>角速度控制器</b>：它根据“想要的角速度”和陀螺仪测到的角速度之差算出力矩，再连同总推力一起分配成四个电机的指令（第 3 课细讲）。上面实验里的“推力 + 倾角”方式比 CTBR 还高一层：你给的是想要的<b>角度</b>，CTBR 给的是想要的<b>角速度</b>。至于“推力该是多少”怎么自动算出来，就是第 2 课的内容。</p>`)}

<div class="key"><h3>这一课记住三件事</h3><ul>
<li>四个桨的转速 = 一个总推力 + 三个转动力矩；悬停约用最大推力的 51%。</li>
<li>推力永远垂直于机身，所以想平移必须先倾斜；倾斜时要加推力（÷ cosθ）才能保持高度。</li>
<li>转头靠的是两对桨的反扭矩差，不是推力。</li>
</ul></div>
<h2>小测验</h2><div id="q1"></div>`;

K.steps(el.querySelector('#walk1'), { title: '用数字走一遍：从悬停到向右平移 20°，再刹住', steps });

const d = K.demo(el.querySelector('#d1'), '动手', '侧面看一架四旋翼',
  '先用“推力 + 倾角”方式飞：把倾角拉到 20°，看它往哪边走、会不会掉高度；再把推力加到 55%。然后切到“直接控制两个桨”，试着让它悬停不动，你会发现几乎做不到。');
const cvo = K.canvas(d, 0.46, 240);
const ctl = K.box(d, 'controls');
const ro = K.box(d, 'readout');
const q = new K.Quad({ z: 1.5 });
let crashed = '', trail = [];
const mode = K.seg(ctl, { label: '操作方式', options: [['a', '推力 + 倾角'], ['b', '直接控制两个桨']], value: 'a', on: () => { show(); reset(); } });
const sT = K.slider(ctl, { id: 'l1-T', label: '总推力（占最大值）', min: 0, max: 100, step: 0.1, value: 51.3, fmt: v => v.toFixed(1) + '%' });
const sA = K.slider(ctl, { id: 'l1-A', label: '倾角（正值向右倒）', min: -35, max: 35, step: 1, value: 0, fmt: v => v + '°' });
const sL = K.slider(ctl, { id: 'l1-L', label: '左侧桨', min: 0, max: 100, step: 0.1, value: 51.3, fmt: v => v.toFixed(1) + '%' });
const sR = K.slider(ctl, { id: 'l1-R', label: '右侧桨', min: 0, max: 100, step: 0.1, value: 51.3, fmt: v => v.toFixed(1) + '%' });
const br = K.box(ctl, 'btnrow');
K.btn(br, '重来', reset, 'primary');
K.btn(br, '回到悬停值', () => { sT.set(51.3); sA.set(0); sL.set(51.3); sR.set(51.3); });
function show() { const a = mode.v === 'a'; sT.el.hidden = !a; sA.el.hidden = !a; sL.el.hidden = a; sR.el.hidden = a; }
function reset() { q.reset(0, 1.5); crashed = ''; trail = []; }
show();
K.loop(dt => {
  if (!crashed) K.sub(dt, 0.002, h => {
    let Tc, Mc;
    if (mode.v === 'a') { Tc = sT.v / 100 * q.Tmax; Mc = K.att(q, K.rad(sA.v)); }
    else { const TL = sL.v / 100 * q.Tmax / 2, TR = sR.v / 100 * q.Tmax / 2; Tc = TL + TR; Mc = (TL - TR) * q.L; }
    q.step(h, Tc, Mc);
  });
  if (!crashed) {
    if (Math.abs(q.th) > K.rad(100)) crashed = '翻过去了。点“重来”。';
    else if (q.x < -5.5 || q.x > 5.5 || q.z > 5) crashed = '飞出画面了。点“重来”。';
  }
  trail.push([q.x, q.z]); if (trail.length > 240) trail.shift();
  const o = cvo.fit(), c = K.col(), v = K.view(o.w, o.h, -5.5, 5.5, -0.2, 4.6, 8), ctx = o.ctx;
  K.grid(ctx, v, c, 1);
  ctx.strokeStyle = c.acc; ctx.globalAlpha = 0.35; ctx.lineWidth = 2; ctx.beginPath();
  trail.forEach((p, i) => i ? ctx.lineTo(v.X(p[0]), v.Y(p[1])) : ctx.moveTo(v.X(p[0]), v.Y(p[1]))); ctx.stroke(); ctx.globalAlpha = 1;
  const f = q.T / q.Tmax, dm = q.M / q.L / q.Tmax;
  K.drawQuad(ctx, v.X(q.x), v.Y(q.z), q.th, v.s * 1.6, { thrust: [f + dm, f - dm] });
  const sx = v.X(q.x), sy = v.Y(q.z), L = v.s * 1.1 * f;
  K.arrow(ctx, sx, sy, sx + Math.sin(q.th) * L * 1.4, sy - Math.cos(q.th) * L * 1.4, c.b, 3);
  if (Math.abs(q.th) > 0.02) K.arrow(ctx, sx, sy, sx + Math.sin(q.th) * L * 1.4, sy, c.warn, 3);
  K.text(ctx, '蓝箭头：总推力    橙箭头：推力的水平分量', 10, o.h - 10, c.soft);
  if (crashed) { ctx.fillStyle = c.panel; ctx.globalAlpha = 0.85; ctx.fillRect(0, o.h / 2 - 28, o.w, 56); ctx.globalAlpha = 1; K.text(ctx, crashed, o.w / 2, o.h / 2 + 6, c.bad, '600 18px "Noto Sans SC", sans-serif', 'center'); }
  const lift = q.T * Math.cos(q.th) / (q.m * K.g) * 100;
  ro.innerHTML = `<span>高度 <b>${q.z.toFixed(2)} m</b></span><span>水平速度 <b>${q.vx.toFixed(2)} m/s</b></span><span>倾角 <b>${K.deg(q.th).toFixed(1)}°</b></span>
  <span>竖直分量 / 重量 <b class="${Math.abs(lift - 100) < 2 ? 'good' : 'hot'}">${lift.toFixed(0)}%</b></span>
  ${mode.v === 'a' ? `<span>保持高度需要的推力 <b>${f1(HOV / Math.cos(K.rad(sA.v)))}%</b></span>` : ''}`;
});

K.box(d, 'assume', '<b>这个实验做了哪些简化：</b>只看侧面（二维），只有左右两个桨；电机推力用约 30 ms 的一阶延迟近似；不计空气阻力；“推力 + 倾角”模式里，倾角由一个理想化的内环去跟踪；控制用的是仿真里的真实状态。悬停推力准确值是 1 ÷ 1.95 = 51.3%，正文里四舍五入写成 51%。');

K.quiz(el.querySelector('#q1'), 'l1', [
  { q: '无人机正在悬停，你想让它向<b>左</b>平移。第一步应该怎么做？',
    o: ['四个桨一起加速', '让机身向左倾：右侧两个桨暂时转快一点', '让机身向右倾：左侧两个桨暂时转快一点', '让对角那对桨转快一点'], a: 1,
    e: '推力垂直于机身。机身向左倾，推力就有了朝左的分量。右侧桨更快，右边被抬高，机身就向左倒。',
    h: '想想推力箭头插在机身上：要有向左的分量，机身该往哪边倒？' },
  { q: '用“推力 + 倾角”方式，把倾角拉到 20°，总推力保持 51% 不动，会发生什么？',
    o: ['水平移动，高度不变', '水平移动，同时往下掉', '原地不动', '往上升'], a: 1,
    e: '竖直分量变成 T·cos20° ≈ 0.94T，托不住重量了（上面算过：差 1.62 N）。要把推力加到 51% ÷ cos20° ≈ 55%。',
    h: '倾斜以后，推力箭头竖直方向的那一截变长了还是变短了？' },
  { q: '2.74 kg 的飞机倾 20° 并保持高度，水平加速度大约是多少？',
    o: ['0.59 m/s²', '3.57 m/s²', '9.81 m/s²', '28.6 m/s²'], a: 1,
    e: '保持高度时竖直分量 = 重量，所以水平加速度 = g × tan20° = 9.81 × 0.364 ≈ 3.57 m/s²（推力 28.6 N 的水平分量 9.78 N ÷ 2.74 kg）。0.59 m/s² 是推力不加时往下掉的加速度。' },
  { q: '原地转头（偏航）靠的是什么？',
    o: ['一侧推力比另一侧大', '两对反向旋转的桨的反扭矩不平衡', '机身倾斜', '尾桨'], a: 1,
    e: '对角那对顺时针、另一对逆时针。两对转速不一样，反扭矩不再抵消，机身就会转。这个力矩比较小，所以四旋翼转头通常比倾斜慢。' },
  { q: '如果一架无人机的推力最多只有自身重量的 1.1 倍，在保持高度的前提下，它最多能倾斜多少度？',
    o: ['约 25°', '约 45°', '约 60°', '想倾多少都行'], a: 0,
    e: '要满足 1.1 × cosθ ≥ 1，即 cosθ ≥ 0.91，θ ≤ 24.6°。' + K.ours('', '示例飞机的推重比是 1.95') + '，理论上最多能倾约 59°。这是把推力全部开满的理想上限：实际飞行还要给姿态控制留出推力差的余量，能稳定保持的倾角会更小。推重比越大，能做的机动和抗风余量越大。',
    h: '保持高度要求竖直分量 = 重量，也就是 最大推力 × cosθ ≥ 重量。' },
]);
} });
