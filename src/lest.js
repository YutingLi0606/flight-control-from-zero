K.add({ id: 'lest', num: 4, title: '状态估计：飞机怎么知道自己在哪', sub: '传感器各有毛病，合在一起才可靠', render(el) {
const S = K.S;
/* ---- the demo's model: one height-only flight with a selectable height source (also run offline for the figures) ---- */
const ESTM = 2.74, EST_KP = 6, EST_KD = 4.5, BARO_DT = 0.02;
function rng(seed) { let s = seed >>> 0; const u = () => { s = (s * 1664525 + 1013904223) >>> 0; return (s + 0.5) / 4294967296; }; return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u()); }
function estSim() {
  const St = { z: 1.5, vz: 0, T: ESTM * K.g, t: 0, ze: 1.5, ve: 0, be: 0, zb: 1.5, vb: 0, zbPrev: 1.5, tb: 0, zr: 1.5, zc: 1.5 };
  /* one step of h seconds; o = {src, w, noise, bias, randn} */
  St.step = (h, o) => {
    St.t += h;
    const zr = St.zr = (Math.floor(St.t / 4) % 2) ? 2.5 : 1.5;
    /* accelerometer along z, gravity already removed with the (here: exact) attitude: true acc + bias + noise */
    const am = St.T / ESTM - K.g + o.bias + 0.3 * o.randn();
    /* barometer at 50 Hz: true height + noise; the "baro velocity" is a filtered difference */
    St.tb += h;
    if (St.tb >= BARO_DT) { St.tb -= BARO_DT; const zNew = St.z + o.noise * o.randn(); St.vb += ((zNew - St.zbPrev) / BARO_DT - St.vb) * 0.15; St.zbPrev = zNew; St.zb = zNew; }
    /* estimators */
    const w = o.w, e = St.zb - St.ze;
    if (o.src === 'fuse') { St.ze += (St.ve + 3 * w * e) * h; St.ve += (am - St.be + 3 * w * w * e) * h; St.be -= w * w * w * e * h; }
    else { St.ze += St.ve * h; St.ve += am * h; }
    let zc, vc;
    if (o.src === 'true') { zc = St.z; vc = St.vz; }
    else if (o.src === 'baro') { zc = St.zb; vc = St.vb; }
    else { zc = St.ze; vc = St.ve; }
    St.zc = zc;
    const u = ESTM * (K.g + EST_KP * (zr - zc) - EST_KD * vc);
    St.T += (K.clamp(u, 0, 1.95 * ESTM * K.g) - St.T) * Math.min(1, h / 0.03);
    St.vz += (St.T / ESTM - K.g) * h; St.z += St.vz * h;
    if (St.z < 0) { St.z = 0; if (St.vz < 0) St.vz = 0; }
    if (St.z > 8) { St.z = 8; if (St.vz > 0) St.vz = 0; }
  };
  return St;
}
/* offline run with a fixed random seed: returns samples [t, true z, estimate the controller used, baro reading] and the rms estimate error */
function estRun(src, w, dur, seed, noise, bias) {
  const S = estSim(), rn = rng(seed), out = []; let se = 0, n = 0;
  for (let k = 1; k <= Math.round(dur / 0.004); k++) {
    S.step(0.004, { src, w, noise: noise == null ? 0.25 : noise, bias: bias == null ? 0.1 : bias, randn: rn });
    if (k % 5 === 0) out.push([S.t, S.z, S.zc, S.zb]);
    if (S.t > 4) { se += (S.zc - S.z) ** 2; n++; }
  }
  return { out, rms: Math.sqrt(se / Math.max(1, n)) };
}

/* card with a title and several short lines: lines = [[text, cls], ...] */
function card(x, y, w, h, title, lines, cls) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="sv-box ${cls || ''}"/>` + S.text(x + 12, y + 24, title, 'sv-t', 'start') +
    lines.map((l, i) => S.text(x + 12, y + 48 + i * 20, l[0], l[1] || 'sv-s', 'start')).join('');
}

/* ---------- figure: sensor by sensor ---------- */
const SENS = [
  ['陀螺仪（IMU）', [['测：机身转多快（角速度）'], ['上千次/秒，短时间很准', 'sv-s acc'], ['零偏：积成角度会越漂越远', 'sv-s bad']], 'hl'],
  ['加速度计（IMU）', [['测：比力（推力等，不含重力）'], ['上千次/秒，反应灵敏', 'sv-s acc'], ['零偏：积两次，漂得更快', 'sv-s bad']], 'hl'],
  ['气压计', [['测：气压，每升 1 m 少约 12 Pa'], ['每秒几十次，不会越积越偏', 'sv-s b'], ['噪声几十 cm，天气会让它漂', 'sv-s bad']], 'b'],
  ['卫星定位（GNSS）', [['测：经纬度和海拔'], ['户外有绝对参考，不累积', 'sv-s b'], ['米级误差，室内基本不能用', 'sv-s bad']], 'b'],
  ['测距仪（朝下）', [['测：到下方物体的距离'], ['离地近时很准', 'sv-s b'], ['量程有限，倾斜时读数变长', 'sv-s bad']], 'b'],
  ['磁力计', [['测：地磁场方向 → 朝向'], ['给出绝对朝向', 'sv-s b'], ['电机电流、金属会干扰', 'sv-s bad']], 'b'],
  ['动作捕捉 / 视觉', [['测：位置和朝向'], ['室内动捕可到毫米级', 'sv-s b'], ['要专门场地，几十 ms 延迟', 'sv-s bad']], 'b'],
];
const figSens = S.svg(820, 290,
  SENS.map((s, i) => card(10 + (i % 4) * 202, 10 + Math.floor(i / 4) * 140, 194, 128, s[0], s[1], s[2])).join('') +
  `<rect x="616" y="150" width="194" height="128" rx="8" class="sv-fill-tint" opacity=".5"/>` +
  S.text(628, 180, '两类毛病正好互补：', 'sv-t', 'start') + S.text(628, 210, '蓝绿：快，但会漂', 'sv-s acc', 'start') +
  S.text(628, 236, '蓝：不漂，但慢、抖或有延迟', 'sv-s b', 'start'),
  '七种常见传感器各测什么、各有什么毛病');

/* ---------- figure: drift vs noise, the demo's own model run offline ---------- */
const RUNS = [['acc', '只用加速度计积分'], ['baro', '只用气压计'], ['fuse', '融合']].map(r => [estRun(r[0], 1, 12, 3), r[1], r[0]]);
const tgt = []; for (let t = 0; t <= 12; t += 0.02) tgt.push([t, (Math.floor(t / 4 + 1e-9) % 2) ? 2.5 : 1.5]);
const drPanel = (x0, r) => S.plot(x0, 0, 272, 236, { title: r[1] + '：误差 ' + (r[0].rms * 100).toFixed(0) + ' cm', x: [0, 12], y: [0, 3.5], xu: 's', xt: [0, 4, 8, 12], yt: [0, 1.5, 2.5],
  series: [...(r[2] === 'fuse' ? [{ pts: r[0].out.map(p => [p[0], p[3]]), c: 'soft' }] : []), { pts: tgt, c: 'warn', dash: 1 },
    { pts: r[0].out.map(p => [p[0], p[2]]), c: 'b' }, { pts: r[0].out.map(p => [p[0], p[1]]), c: 'acc' }] });
const figDrift = S.svg(820, 250, RUNS.map((r, i) => drPanel(i * 274, r)).join(''), '三种高度来源下的真实高度和估计值');

/* ---------- figure: the trade-off of the fusion weight (offline, same model, 4 random seeds each) ---------- */
const WS = [0.1, 0.2, 0.3, 0.5, 0.7, 1, 1.5, 2, 3, 5, 7, 10];
const curve = WS.map(w => { let a = 0; for (let sd = 1; sd <= 4; sd++) a += estRun('fuse', w, 24, sd).rms; return [Math.log10(w), a / 4 * 100]; });
const lx = w => 44 + (Math.log10(w) + 1) / 2 * (820 - 52);
const best = curve.reduce((a, p) => p[1] < a[1] ? p : a);
const figTrade = S.svg(820, 260,
  S.plot(0, 0, 820, 250, { title: '估计误差（cm，均方根）随融合权重变化', x: [-1, 1], y: [0, 40], xt: [], yt: [0, 10, 20, 30, 40], series: [{ pts: curve, c: 'b' }] }) +
  [0.1, 0.3, 1, 3, 10].map(w => S.text(lx(w), 239, w === 1 ? '1（实验默认）' : String(w), 'sv-s')).join('') +
  S.text(290, 62, '← 太信加速度计：零偏纠得慢', 'sv-s bad', 'start') + S.text(290, 80, '（权重 0.1 时误差约 1 m，超出图外）', 'sv-s', 'start') +
  S.text(800, 150, '太信气压计：噪声传进来 →', 'sv-s bad', 'end') +
  S.text(lx(Math.pow(10, best[0])), 224 - best[1] / 40 * 198 - 36, '最低约 ' + best[1].toFixed(0) + ' cm', 'sv-n'),
  '融合权重两头都不好');

/* ---------- walkthrough: one predict → measure → correct cycle (numbers) ---------- */
const NL0 = 1.45, NL1 = 1.70, nx = v => 80 + (v - NL0) / (NL1 - NL0) * 680;
function nline(items, extra) {
  let b = `<line x1="60" y1="120" x2="780" y2="120" class="sv-l-ink" style="stroke-width:1.2"/>`;
  [1.45, 1.5, 1.55, 1.6, 1.65, 1.7].forEach(v => { b += `<line x1="${nx(v)}" y1="116" x2="${nx(v)}" y2="124" class="sv-l-ink" style="stroke-width:1"/>` + S.text(nx(v), 142, v.toFixed(2), 'sv-s'); });
  b += S.text(780, 160, '高度（m）', 'sv-s', 'end');
  items.forEach(it => {
    const [v, lab, c, up, an] = it, x = nx(v), y = up > 0 ? 120 - up : 120 - up;
    b += `<line x1="${x}" y1="120" x2="${x}" y2="${up > 0 ? y + 6 : y - 16}" class="sv-l-${c}" style="stroke-width:1.4"/><circle cx="${x}" cy="120" r="5.5" class="sv-fill-${c}"/>` +
      S.text(x + (an === 'end' ? -5 : an === 'start' ? 5 : 0), y, lab, c === 'soft' ? 'sv-t' : 'sv-s ' + c, an);
  });
  return S.svg(820, 200, b + (extra || ''), '高度数轴');
}
const tr = [1.52, '真实 1.52（估计器不知道）', 'acc', -62, 'start'];
const walk = [
  { svg: nline([[1.5, '上一刻的估计 1.500', 'b', 40]], S.text(410, 30, 'IMU 说：正以 0.50 m/s 上升', 'sv-t')),
    t: '<b>上一刻</b>：估计高度 <b>1.500 m</b>，用加速度计积分出的速度 0.50 m/s。气压计每 0.02 s 来一次读数（50 次/秒）。' },
  { svg: nline([[1.5, '1.500', 'b', 40, 'end'], [1.51, '预测 1.510', 'b', 70, 'start']], S.arrow(nx(1.5), 100, nx(1.51) - 4, 100, { c: 'b' }) + S.text(800, 36, '预测：1.500 + 0.50 × 0.02 = 1.510 m', 'sv-nb', 'end')),
    t: '<b>预测</b>：0.02 s 以后应该在 1.500 + 0.50 × 0.02 = <b>1.510 m</b>。这一步只用 IMU，很快，但有零偏就会一点点偏。' },
  { svg: nline([[1.51, '预测 1.510', 'b', 40], [1.66, '气压计 1.66', 'soft', 40], tr],
      `<path d="M${nx(1.51)} 70 v-8 H${nx(1.66)} v8" class="sv-l-warn" style="stroke-width:1.5"/>` + S.text((nx(1.51) + nx(1.66)) / 2, 54, '差 = 1.66 − 1.510 = 0.15 m', 'sv-nw')),
    t: '<b>测量</b>：气压计读到 <b>1.66 m</b>。真实高度其实是 1.52 m，这次读数正好多抖了 14 cm。测量减预测，差 <b>0.15 m</b>。' },
  { svg: nline([[1.51, '预测 1.510', 'b', 40, 'end'], [1.519, '融合后 1.519', 'b', 70, 'start'], [1.66, '气压计 1.66', 'soft', 40], tr],
      S.text(800, 36, '1.510 + 0.06 × 0.15 = 1.519 m', 'sv-nb', 'end')),
    t: '<b>融合</b>：估计值 ← 预测值 + K × 差。K = 0.06（实验默认权重 1 时，每 0.02 s 大约相当于这么多），得到 <b>1.519 m</b>，离真实 1.52 只差 1 mm。' },
  { svg: nline([[1.51, 'K = 0：1.510', 'b', 40, 'end'], [1.519, 'K = 0.06：1.519', 'acc', 70, 'start'], [1.66, 'K = 1：1.66', 'bad', 40]],
      S.text(410, 186, 'K = 1 把 14 cm 噪声原样搬进来；K = 0 永远纠不了零偏', 'sv-s')),
    t: '<b>K 怎么选</b>：K = 1 就是“只用气压计”，噪声原样进来（差 14 cm）；K = 0 就是“只用 IMU”，这一次看着不错，但零偏永远纠不回来。所以取中间。' },
  { svg: (() => {
      const drift = []; for (let t = 0; t <= 10; t += 0.1) drift.push([t, 0.5 * 0.1 * t * t]);
      const Sb = estSim(), rn = rng(1), bb = [[0, 0]];
      for (let k = 1; k <= 1500; k++) { Sb.step(0.004, { src: 'fuse', w: 1, noise: 0.25, bias: 0.1, randn: rn }); if (k % 10 === 0) bb.push([k * 0.004, Sb.be]); }
      return S.svg(820, 230, S.plot(0, 0, 400, 228, { title: '只用 IMU：零偏 0.1 m/s² 造成的高度误差', x: [0, 10], y: [0, 5], xu: 's', yt: [0, 1, 2, 3, 4, 5], series: [{ pts: drift, c: 'bad' }] }) +
        S.text(160, 150, '1 s：5 cm', 'sv-s', 'start') + S.text(330, 60, '10 s：5 m', 'sv-s bad', 'end') +
        S.plot(420, 0, 400, 228, { title: '融合时顺便估计出的零偏（m/s²）', x: [0, 6], y: [-0.05, 0.2], xu: 's', yt: [0, 0.1, 0.2], series: [{ pts: bb, c: 'b' }], hl: [{ v: 0.1, c: 'acc' }] }) + S.text(470, 88, '实际零偏 0.1', 'sv-s acc', 'start'), '零偏');
    })(),
    t: '<b>顺便估计零偏</b>：加速度计零偏 0.1 m/s²，只用 IMU 时误差 = ½ × 0.1 × t²，1 s 才 5 cm，10 s 就 5 m。融合时“测量减预测”老是同一个方向，说明 IMU 有零偏；实验里权重 1 时，3–4 秒后估计出的零偏就在 0.1 附近（上下抖约 0.03），扣掉它，预测就不再漂。' },
];

/* ---------- figure: EKF2 fuses on a delayed time horizon, then IMU pushes the result to now ---------- */
const figEKF = S.svg(820, 230,
  `<line x1="40" y1="150" x2="790" y2="150" class="sv-l-ink" style="stroke-width:1.2" marker-end="url(#AH-ink)"/>` + S.text(790, 172, '时间', 'sv-s', 'end') +
  Array.from({ length: 36 }, (_, i) => `<line x1="${60 + i * 20}" y1="143" x2="${60 + i * 20}" y2="157" class="sv-l-acc" style="stroke-width:1.2"/>`).join('') +
  S.text(60, 190, 'IMU 读数：每一小格一个，很密', 'sv-s acc', 'start') +
  `<line x1="740" y1="40" x2="740" y2="160" class="sv-l-warn" stroke-dasharray="4 4"/>` + S.text(740, 32, '现在', 'sv-t') +
  `<line x1="560" y1="70" x2="560" y2="160" class="sv-l-b" stroke-dasharray="4 4"/>` + S.text(560, 62, '测量那一刻', 'sv-t') +
  `<circle cx="560" cy="150" r="7" class="sv-fill-b"/>` +
  S.path([[566, 100], [700, 100], [736, 100]], { c: 'soft' }) + S.text(650, 92, '测量传过来要几十 ms', 'sv-s') +
  `<path d="M560 136 Q650 112 736 136" class="sv-l-acc" style="stroke-width:2.6" marker-end="url(#AH-acc)"/>` + S.text(650, 216, '② 用这段 IMU 把结果推到“现在”', 'sv-s acc') +
  S.text(400, 120, '① 在“测量那一刻”把测量融合进去', 'sv-s b'),
  'EKF2 先在稍早的时刻融合，再用 IMU 推到现在');

/* ---------- figure: this lesson in the chain of lessons 1–3 ---------- */
const figLink = S.svg(820, 200,
  S.box(10, 60, 120, 64, '传感器', 'IMU、动捕…') + S.box(170, 60, 150, 64, '状态估计', '本课（PX4：EKF2）', 'hl') +
  S.box(380, 60, 170, 64, '级联控制器', '第 3 课，每层像第 2 课', 'b') + S.box(600, 60, 100, 64, '推力 + 转动', '第 1 课', 'b') + S.box(730, 60, 80, 64, '飞机') +
  S.arrow(130, 92, 168, 92) + S.arrow(320, 92, 378, 92, { c: 'acc', label: '估计值', side: 'below' }) + S.arrow(550, 92, 598, 92) + S.arrow(700, 92, 728, 92) +
  S.path([[770, 124], [770, 170], [70, 170], [70, 126]], { c: 'soft' }) + S.text(420, 190, '飞机动了，传感器读数跟着变', 'sv-s') +
  S.text(345, 40, '第 2、3 课的“测到的”其实都是这里的估计值', 'sv-s acc'),
  '状态估计在传感器和控制器之间');

const figS = K.ours('');

el.innerHTML = `
<p class="lede">前几课的控制器都要用“现在的高度、速度、倾角”。没有一个传感器能又准、又快、又不漂地直接给出它们。飞控里专门有一个程序把几个都不完美的读数合成一个可用的值，这叫<span class="term">状态估计</span>。</p>
<div class="warnbox"><p><b>先说清楚前面实验的一个简化：</b>第 1 到 3 课的实验里，控制器读的是仿真算出来的<b>真实</b>值，没有噪声也没有延迟。真实飞机做不到。这一课最后的实验会让控制器改读估计值。</p></div>

<h2>传感器各测什么、各有什么毛病</h2>
${K.fig(figSens, '要估计的是位置（含高度）、速度、姿态（倾角和朝向）、角速度，还要顺带估计传感器自己的偏差。IMU（陀螺仪 + 加速度计）快但会漂；其余的不漂，但慢、抖或有延迟。')}
${K.more('展开：完整对照表', `<div class="tblwrap"><table class="tbl">
<tr><th>传感器</th><th>直接测到的是什么</th><th>优点</th><th>主要毛病</th></tr>
<tr><td><b>陀螺仪</b>（IMU 的一部分）</td><td>机身转动的角速度</td><td>快（PX4 里可到每秒上千次）、短时间内很准</td><td>有一个缓慢变化的偏差（零偏）；积分成角度后误差越积越大</td></tr>
<tr><td><b>加速度计</b>（IMU 的一部分）</td><td>“比力”：除重力以外的合力产生的加速度，也就是推力和空气阻力等。悬停时读数约 9.8 m/s² 朝上，自由落体时读数为 0</td><td>快、反应灵敏</td><td>也有零偏；要先用姿态把重力补回去才能得到真实加速度；积分两次才得到位置，误差增长更快</td></tr>
<tr><td><b>气压计</b></td><td>大气压。海平面附近每升高 1 米，气压约下降 12 帕</td><td>便宜，随时可用</td><td>噪声常有几十厘米；天气变化会让气压在几小时内变化上百帕，相当于几米的漂移；桨下气流、靠近地面或墙面也会干扰读数</td></tr>
<tr><td><b>卫星定位</b>（GNSS，常说的 GPS）</td><td>经纬度和海拔，许多接收机也给速度</td><td>户外有绝对参考，误差不会随时间累积</td><td>普通单频接收机的误差在米级，高度通常比水平方向更差；每秒只更新几次到十几次；室内基本不可用。RTK 等差分技术可以做到厘米级</td></tr>
<tr><td><b>测距仪</b>（激光或超声波，朝下）</td><td>沿着光束方向到下方物体的距离</td><td>近距离离地高度很准</td><td>量程有限；机身倾斜时读数变长（离地高度 ≈ 读数 × cos 倾角）；下面是桌子、草地还是地面，它分不清</td></tr>
<tr><td><b>磁力计</b></td><td>地磁场方向，用来定朝向</td><td>给出绝对朝向</td><td>电机电流和金属物体会干扰</td></tr>
<tr><td><b>动作捕捉 / 视觉</b></td><td>外部相机看机身上的标记点，或机载相机看环境，得到位置和朝向</td><td>室内动作捕捉可到毫米级</td><td>需要专门场地或足够的光照和纹理；数据要经过无线传输，有几十毫秒延迟</td></tr>
</table></div>`)}

<h2>为什么不能只用一个</h2>
${K.fig(figDrift, '用下面实验的同一个模型离线跑 12 秒（目标在 1.5 m 和 2.5 m 之间切换）。蓝绿 = 真实高度，蓝 = 控制器读的估计值，灰 = 气压计读数；标题里是第 4–12 秒估计值相对真实高度的均方根误差。<b>只用加速度计</b>：控制器以为自己一直在目标上，真实高度却漂走了（先掉到地上，又被拉起来乱飞）；<b>只用气压计</b>：噪声直接让飞机跟着抖；<b>融合</b>（实验默认权重 1）：两者都好得多。')}
<div class="formula">估计值 ← 预测值 + K × ( 测量值 − 预测值 )
<div class="where">预测值：用 IMU 往前推出来的；测量值：气压计、卫星定位等的读数；K：0 到 1 之间的权重，越大越相信测量。K 固定的叫<span class="term">互补滤波</span>，按两边的不确定度自动算 K 的叫<span class="term">卡尔曼滤波</span>。</div></div>
<div id="walkest"></div>
${K.fig(figTrade, '同一个模型，把融合权重从 0.1 扫到 10（每个值跑 4 次取平均）。太信加速度计，零偏纠得慢；太信气压计，噪声传进来。中间有一个最好的区间。')}
<div id="dest"></div>

<h2>PX4 里是怎么做的</h2>
${K.fig(figEKF, 'PX4 的状态估计模块叫 <b>EKF2</b>（扩展卡尔曼滤波器，卡尔曼滤波在非线性系统上的常用推广）。慢传感器的测量到得晚，EKF2 就在稍早的“测量那一刻”融合，再用 IMU 把结果快速推到现在：输出既及时，又用上了慢传感器。')}
${K.more('展开：EKF2 估计什么、高度参考源、倾角怎么估', `<ul>
<li>EKF2 估计的量包括姿态、速度、位置、陀螺仪和加速度计零偏、地磁场、风速等。</li>
<li><b>高度长期跟随一个“参考源”</b>，由参数 EKF2_HGT_REF 选择：气压计、卫星定位、测距仪或视觉。PX4 文档里户外的默认配置以卫星定位为高度参考，同时也融合气压计（气压计的偏差会被估计掉）。室内用动作捕捉时，通常改为以视觉为参考。</li>
<li><b>倾角是怎么估出来的</b>：陀螺仪积分会漂；加速度计在飞行时主要测到的是推力方向，不能直接当作“重力朝哪”。EKF2 通过比较“用 IMU 推算的速度”和“测量到的速度或位置”来发现倾角误差：倾角估错了，推算出的水平速度就会和测量对不上。</li>
<li>估计值永远有误差，也有延迟。控制器能做到的精度，不可能好过它所用的估计值。</li>
</ul>`)}

<h2>${K.ours('', `和前几课的关系`)}</h2>
${K.fig(figLink, '第 2 课 PID 里的“现在高度、速度”，第 3 课每一层“测到的”量，真实飞机上都是状态估计给的估计值。')}
${K.ours('')}

<div class="key"><h3>这一课记住三件事</h3><ul>
<li>控制器用的是<b>估计值</b>，不是真实值；估计值有误差，也有延迟。</li>
<li>IMU 快但会漂，气压计、卫星定位、动作捕捉不漂但慢或抖；把两类合起来，并顺便估计 IMU 零偏。</li>
<li>融合的权重是取舍：越信测量越抖，越信 IMU 纠偏越慢。</li>
</ul></div>
<h2>小测验</h2><div id="qest"></div>`;

K.steps(el.querySelector('#walkest'), { title: '用数字走一遍：一次“预测 → 测量 → 融合”', steps: walk });

const d = K.demo(el.querySelector('#dest'), '动手', '控制器读估计出来的高度',
  '飞机在 1.5 m 和 2.5 m 之间来回飞，控制器和第 2 课一样（PD + 悬停前馈），区别是它读的高度来自下面选的“高度来源”。依次切换四种来源，对比真实高度。选“融合”后，再拖动融合权重，看两头各会出什么问题。');
const cvs = K.box(d, 'cvs');
const cA = K.canvas(cvs, 1.0, 260), cB = K.canvas(cvs, 0.8, 260);
const ctl = K.box(d, 'controls'), ro = K.box(d, 'readout');
const src = K.seg(ctl, { label: '控制器读的高度来源', options: [['true', '真实值'], ['baro', '只用气压计'], ['acc', '只用加速度计积分'], ['fuse', '融合']], value: 'true', on: () => reset() });
const sW = K.slider(ctl, { id: 'est-w', label: '融合权重（左：更信加速度计，右：更信气压计）', min: 0.1, max: 10, step: 0.1, value: 1, fmt: v => v.toFixed(1) });
const sN = K.slider(ctl, { id: 'est-n', label: '气压计噪声', min: 0.02, max: 0.5, step: 0.01, value: 0.25, fmt: v => (v * 100).toFixed(0) + ' cm' });
const sB = K.slider(ctl, { id: 'est-b', label: '加速度计零偏', min: 0, max: 0.3, step: 0.01, value: 0.1, fmt: v => v.toFixed(2) + ' m/s²' });
const br = K.box(ctl, 'btnrow'); K.btn(br, '重来', () => reset(), 'primary');
let sim, hb = K.buf(12), eb = K.buf(6), ebEst = K.buf(6);
function reset() { sim = estSim(); hb.clear(); eb.clear(); ebEst.clear(); }
reset();
K.loop(dt => {
  K.sub(dt, 0.004, h => {
    if (src.v === 'acc' && sim.t > 16) reset();
    sim.step(h, { src: src.v, w: sW.v, noise: sN.v, bias: sB.v, randn: K.randn });
    if (sim.t % 4 > 2) eb.push(sim.t, (sim.zr - sim.z) ** 2);
    ebEst.push(sim.t, (sim.zc - sim.z) ** 2);
  });
  const t = sim.t, z = sim.z, zr = sim.zr, zb = sim.zb;
  const zShow = src.v === 'true' ? z : src.v === 'baro' ? zb : sim.ze;
  hb.push(t, z, zShow, zr, zb);
  const c = K.col(), a = cA.fit(), v = K.view(a.w, a.h, -1.2, 1.2, -0.1, 3.6, 10), ctx = a.ctx;
  K.grid(ctx, v, c, 1);
  ctx.strokeStyle = c.warn; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(v.X(-1.2), v.Y(zr)); ctx.lineTo(v.X(1.2), v.Y(zr)); ctx.stroke(); ctx.setLineDash([]);
  K.text(ctx, '目标', v.X(-1.15), v.Y(zr) - 5, c.warn);
  const zs = K.clamp(zShow, -0.1, 3.5);
  ctx.globalAlpha = 0.45; K.drawQuad(ctx, v.X(0.55), v.Y(zs), 0, v.s * 1.1, { color: c.b, label: '它以为的位置' }); ctx.globalAlpha = 1;
  K.drawQuad(ctx, v.X(-0.35), v.Y(K.clamp(z, -0.1, 3.5)), 0, v.s * 1.1, { label: '真实位置' });
  const b = cB.fit(), W = K.win(t, 12);
  K.plot(b.ctx, 0, 0, b.w, b.h, { title: '高度', unit: 'm', x: W, y: [0, 3.5], series: [
    ...(src.v === 'baro' || src.v === 'fuse' ? [{ buf: hb, i: 4, color: c.line, w: 1, label: '气压计读数' }] : []),
    { buf: hb, i: 3, color: c.warn, dash: [6, 4], label: '目标' },
    ...(src.v === 'true' ? [] : [{ buf: hb, i: 2, color: c.b, label: '估计值' }]),
    { buf: hb, i: 1, color: c.acc, label: '真实' }], xfmt: x => x.toFixed(0) + 's' });
  const rms = q => Math.sqrt(q.d.reduce((s, p) => s + p[1], 0) / (q.d.length || 1)) * 100;

  ro.innerHTML = `<span>估计误差（最近 6 s，均方根） <b class="${rms(ebEst) > 10 ? 'hot' : ''}">${rms(ebEst).toFixed(1)} cm</b></span><span>估计出的零偏（实际 ${sB.v.toFixed(2)}） <b>${src.v === 'fuse' ? sim.be.toFixed(2) + ' m/s²' : '—'}</b></span><span>稳定后真实高度离目标（每段后 2 秒，均方根） <b>${rms(eb).toFixed(0)} cm</b></span>`;
});
K.box(d, 'assume', '<b>这个实验做了哪些简化：</b>只有上下一个方向；上面几张图就是用这个模型离线跑出来的（固定了随机数种子）；把“加速度计读数扣掉重力”这一步当作已经做好（真实飞机要靠估计出来的姿态去扣，姿态错了也会带来误差）；没有延迟；气压计没有天气漂移和桨下气流干扰；噪声和零偏的大小是为了让现象明显而选的示意值。');

K.quiz(el.querySelector('#qest'), 'lest', [
  { q: '飞机悬停不动时，机上加速度计在竖直方向读到的大约是多少？', o: ['0', '约 9.8 m/s²，朝上', '约 9.8 m/s²，朝下', '取决于飞行高度'], a: 1,
    e: '加速度计测的是除重力以外的力产生的加速度（比力）。悬停时推力正好托住重力，所以读数约 9.8 m/s² 朝上；要得到真实加速度（此时为 0），必须先把重力补回去。' },
  { q: '只用加速度计积分来算高度，为什么很快就不行了？', o: ['加速度计太慢', '读数里的小零偏积分两次后，误差随时间平方增长', '加速度计测不到竖直方向', '积分在计算机里算不准'], a: 1,
    e: '误差 ≈ ½ × 零偏 × 时间²。0.05 m/s² 的零偏，10 秒后约 2.5 米。实验里选“只用加速度计积分”就能看到它飘走。' },
  { q: '融合时把权重调得非常“信气压计”，会怎样？', o: ['估计值最准', '气压计的噪声几乎原样传进估计值，控制器跟着抖', '零偏会变大', '估计值会越飘越远'], a: 1,
    e: '权重越大，每次测量都把估计值往读数上拉得越狠，噪声也就越多地进入估计值。反过来权重太小，零偏和漂移纠正得慢。两头都不好，要取中间。' },
  { q: '预测高度 1.510 m，气压计读到 1.66 m，融合权重 K = 0.06。融合后的估计值是多少？', o: ['1.510 m', '1.519 m', '1.585 m', '1.66 m'], a: 1,
    e: '估计值 = 预测值 + K × (测量值 − 预测值) = 1.510 + 0.06 × 0.15 = 1.519 m。K = 1 就是直接用读数 1.66 m（把噪声原样搬进来），K = 0 就是只信预测 1.510 m。' },
  { q: '关于 PX4 的高度估计，下面哪一句是对的？', o: ['只用气压计', '只用卫星定位', '由 EKF2 融合多个传感器，长期跟随参数 EKF2_HGT_REF 选定的参考源', '直接用测距仪读数'], a: 2,
    e: '高度参考源可以选气压计、卫星定位、测距仪或视觉。户外默认配置以卫星定位为参考，同时融合气压计；室内动作捕捉时通常改为视觉。' },
]);
} });
