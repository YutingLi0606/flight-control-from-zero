K.add({ id: 'l16', num: 16, title: '从仿真到真机', sub: '仿真里飞得好，不等于真机上飞得好', render(el) {
const S = K.S;

/* 1-D altitude model: PD + gravity feed-forward with the nominal mass, command delay d, motor lag 30 ms, thrust limit 1.95 g */
const g = 9.81, H = 0.005, TAU = 0.03, TW = 1.95, TEND = 5, NOM_D = 0.02;
const ref = t => { const a = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (10 - 15 * x + 6 * x * x); return 1.5 + a((t - 0.5) / 1.2) - a((t - 3) / 1.2); };
function run(kp, kd, d, r, rec) {
  const q = new Array(Math.round(d / H)).fill(g); let z = 1.5, v = 0, T = g * r, se = 0, k = 0;
  for (let i = 0; i < TEND / H; i++) {
    const e = ref(i * H) - z; q.push(g + kp * e - kd * v); const uc = q.shift();
    T += (K.clamp(uc, 0, TW * g) - T) * H / TAU; v += (T / r - g) * H; z += v * H; se += e * e; k++;
    if (rec && i % 4 === 0) rec.push([i * H, z]);
    if (Math.abs(z - 1.5) > 4) { if (rec) rec.push([i * H, z]); return 1; }
  }
  return Math.min(1, Math.sqrt(se / k));
}
const NG = 24, KP = i => 2 * Math.pow(200, i / (NG - 1)), KD = j => Math.pow(60, j / (NG - 1));
const drSet = (Dm, Mw) => { const s = []; for (let i = 0; i < 8; i++) s.push([Dm * (i + 0.5) / 8, 1 - Mw + 2 * Mw * (((i * 5) % 8) + 0.5) / 8]); return s; };
/* grid search: best gains in the nominal world and (averaged) over a randomized set */
function tune(dr) {
  let bn = [0, 0, 9], br = [0, 0, 9];
  for (let i = 0; i < NG; i++) for (let j = 0; j < NG; j++) {
    const c = run(KP(i), KD(j), NOM_D, 1); if (c < bn[2]) bn = [i, j, c];
    let s = 0; for (const [dd, r] of dr) s += run(KP(i), KD(j), dd, r); s /= dr.length;
    if (s < br[2]) br = [i, j, s];
  }
  return [[KP(bn[0]), KD(bn[1])], [KP(br[0]), KD(br[1])]];
}

/* ---------- static figures (the demo's own model and default settings: randomize delay 0–60 ms, mass ±20 %) ---------- */
const DR0 = drSet(0.06, 0.2), [G0N, G0R] = tune(DR0);
const cm = (G, d, r) => run(G[0], G[1], d, r) * 100;
const dl = Array.from({ length: 31 }, (_, k) => k * 5);
const oE = { x: [0, 150], y: [0, 50] }, LX = v => 44 + v / 150 * (400 - 52);
const rq = [], rnN = [], rnR = []; run(G0N[0], G0N[1], 0.04, 1, rnN); run(G0R[0], G0R[1], 0.04, 1, rnR);
for (let t = 0; t <= TEND; t += 0.02) rq.push([t, ref(t)]);
const e20 = [cm(G0N, 0.02, 1), cm(G0R, 0.02, 1)], e40 = [cm(G0N, 0.04, 1), cm(G0R, 0.04, 1)];
const figCurve = S.svg(820, 260,
  S.plot(0, 0, 400, 260, { title: '跟踪误差（cm）随真机延迟', x: oE.x, y: oE.y, xu: 'ms', xt: [0, 50, 100, 150], yt: [0, 10, 20, 30, 40, 50],
    series: [{ pts: dl.map(x => [x, cm(G0N, x / 1000, 1)]), c: 'b', label: '标准调' }, { pts: dl.map(x => [x, cm(G0R, x / 1000, 1)]), c: 'warn', label: '随机调' }] }) +
  `<rect x="${LX(0)}" y="26" width="${LX(60) - LX(0)}" height="208" class="sv-fill-warn" opacity=".12"/>` +
  `<line x1="${LX(20)}" y1="26" x2="${LX(20)}" y2="234" class="sv-l-b" stroke-dasharray="3 4"/>` + S.text(LX(20) + 4, 48, '标准 20 ms', 'sv-s b', 'start') +
  S.text(LX(44), 172, '随机化范围', 'sv-s warn') +
  S.plot(420, 0, 400, 260, { title: '延迟 40 ms 时的高度', x: [0, TEND], y: [-0.1, 3.2], xu: 's', yt: [0, 1, 2, 3],
    series: [{ pts: rq, c: 'soft', dash: 1, label: '目标' }, { pts: rnN, c: 'b', label: '标准调' }, { pts: rnR, c: 'warn', label: '随机调' }] }),
  '只在标准情况下调的增益，延迟一变大就振荡；在随机世界里调的更平稳');

/* reality gap: what a simple simulator writes vs what a real flight has */
const GAP = [['延迟', '0，或一个固定值', K.ours('', '估计 + 通信 + 计算：几十毫秒')], ['电机', '固定的一阶滞后', K.ours('', '时间常数会变；电池掉压后推力变小')],
  ['传感', '直接读真值', K.ours('', '带噪声、有偏差、有延迟的估计')], ['质量', '2.74 kg，固定', K.ours('', '称重有误差，还可能带载荷')], ['气动', '没有，或简化公式', '风、湍流、旋翼来流、地效 / 顶效']];
const figGap = S.svg(820, 296,
  S.text(205, 22, '仿真里常写成', 'sv-t') + S.text(590, 22, '真机上其实是', 'sv-t') +
  GAP.map((r, i) => { const y = 36 + i * 52; return S.text(36, y + 27, r[0], 'sv-t', 'start') +
    `<rect x="90" y="${y}" width="230" height="40" rx="8" class="sv-box b"/>` + S.text(205, y + 25, r[1], 'sv-s') + S.text(345, y + 27, '≠', 'sv-big') +
    `<rect x="370" y="${y}" width="440" height="40" rx="8" class="sv-box px"/>` + S.text(590, y + 25, r[2], 'sv-s'); }).join(''),
  '现实差距的五个主要来源');

/* domain randomization: one world vs eight worlds that bracket the real one */
const DX = v => 120 + v / 100 * 640;
const figDR = S.svg(820, 236,
  `<line x1="${DX(0)}" y1="196" x2="${DX(100)}" y2="196" class="sv-l-ink" marker-end="url(#AH-ink)"/>` +
  [0, 20, 40, 60, 80, 100].map(v => `<line x1="${DX(v)}" y1="192" x2="${DX(v)}" y2="200" class="sv-l-ink"/>` + S.text(DX(v), 216, v + ' ms', 'sv-s')).join('') +
  S.text(DX(50), 234, '延迟', 'sv-s') +
  S.text(110, 56, '标准调参', 'sv-t', 'end') + S.text(110, 74, '只练一个世界', 'sv-s', 'end') +
  S.quad(DX(20), 70, 0, 24, { c: 'b' }) +
  S.text(110, 136, '域随机化', 'sv-t', 'end') + S.text(110, 154, '8 个世界', 'sv-s', 'end') +
  `<rect x="${DX(0)}" y="104" width="${DX(60) - DX(0)}" height="66" rx="8" class="sv-fill-warnbg"/>` +
  DR0.map(([dd, r], i) => S.quad(DX(dd * 1000), 128 + (i % 2) * 28, 0, 14 + 25 * (r - 0.8), { c: 'warn' })).join('') +
  `<line x1="${DX(40)}" y1="30" x2="${DX(40)}" y2="188" class="sv-l-ink" stroke-dasharray="5 4"/>` + S.text(DX(40) + 6, 40, '真机：40 ms', 'sv-t', 'start') +
  S.text(DX(60) + 10, 140, '延迟 0–60 ms，质量 ±20%（图标大小）', 'sv-s warn', 'start'),
  '域随机化：让真机落在练过的范围里面');

/* walkthrough: system identification with the demo's own motor model */
const STEPD = 0.02, m0 = 2.74, Th = m0 * g;
const stepRec = (() => { const q = new Array(Math.round(STEPD / H)).fill(g); let T = g; const out = []; for (let i = 0; i <= 24; i++) { out.push([i * H * 1000, (T - g) / (0.2 * g) * 100]); q.push(1.2 * g); T += (q.shift() - T) * H / TAU; } return out; })();
const i63 = stepRec.findIndex(p => p[1] >= 63.2), a = stepRec[i63 - 1], b = stepRec[i63];
const t63 = a[0] + (63.2 - a[1]) / (b[1] - a[1]) * (b[0] - a[0]), tauId = t63 - STEPD * 1000;
const oS = { x: [-10, 120], y: [-10, 110] }, SXs = v => 44 + (v + 10) / 130 * (820 - 52), SYs = v => 204 - (v + 10) / 120 * 178;
function stepFig(k) {
  let body = S.plot(0, 0, 820, 230, { title: '指令在 0 ms 从 ' + Th.toFixed(1) + ' N 跳到 ' + (1.2 * Th).toFixed(1) + ' N：实测推力（升了多少 %）', x: oS.x, y: oS.y, xu: 'ms', xt: [0, 20, 40, 60, 80, 100, 120], yt: [0, 63, 100],
    series: [{ pts: [[-10, 0], [0, 0], [0, 100], [120, 100]], c: 'soft', dash: 1 }] });
  if (k >= 1) body += `<rect x="${SXs(0)}" y="30" width="${SXs(STEPD * 1000) - SXs(0)}" height="170" class="sv-fill-grid" opacity=".6"/>` + S.text((SXs(0) + SXs(20)) / 2, 80, '延迟 ' + STEPD * 1000 + ' ms', 'sv-n');
  body += stepRec.filter(p => p[0] <= 120).map(p => `<circle cx="${SXs(p[0])}" cy="${SYs(p[1])}" r="4" class="sv-fill-warn"/>`).join('');
  if (k >= 2) body += `<line x1="${SXs(-10)}" y1="${SYs(63.2)}" x2="${SXs(t63)}" y2="${SYs(63.2)}" class="sv-l-acc" stroke-dasharray="4 4"/><line x1="${SXs(t63)}" y1="${SYs(63.2)}" x2="${SXs(t63)}" y2="${SYs(-10)}" class="sv-l-acc" stroke-dasharray="4 4"/>` +
    S.arrow(SXs(20), 150, SXs(t63), 150, { c: 'acc' }) + S.text((SXs(20) + SXs(t63)) / 2, 142, 'τ ≈ ' + tauId.toFixed(0) + ' ms', 'sv-n');
  if (k >= 3) { const pts = []; for (let t = 0; t <= 120; t += 1) pts.push([t, t < 20 ? 0 : (1 - Math.exp(-(t - 20) / tauId)) * 100]);
    body += `<polyline points="${pts.map(p => SXs(p[0]).toFixed(1) + ',' + SYs(p[1]).toFixed(1)).join(' ')}" class="sv-l-acc"/>` + S.text(SXs(70), SYs(70), '仿真：延迟 20 ms + τ ' + tauId.toFixed(0) + ' ms', 'sv-n', 'start'); }
  return S.svg(820, 230, body, '阶跃响应');
}
const stepMass = S.svg(820, 190,
  S.quad(170, 110, 0, 70, { fl: 48, fr: 48 }) + S.text(170, 30, '悬停：推力正好托住重力', 'sv-s') +
  `<line x1="170" y1="128" x2="170" y2="178" class="sv-l-b" style="stroke-width:2.5" marker-end="url(#AH-b)"/>` + S.text(178, 172, 'm·g', 'sv-nb', 'start') +
  S.text(360, 80, '台架 / 飞行日志读到悬停总推力：' + Th.toFixed(1) + ' N', 'sv-t', 'start') +
  S.text(360, 112, 'm = ' + Th.toFixed(1) + ' ÷ 9.81 = ' + m0.toFixed(2) + ' kg', 'sv-n', 'start') +
  S.text(360, 142, '（也可以直接上秤：结果应该一致）', 'sv-s', 'start'), '用悬停推力反推质量');
const stepLimit = S.svg(820, 210,
  S.text(205, 24, '测得准的：写进仿真', 'sv-t') + S.text(610, 24, '每次飞都不同、或很难测的', 'sv-t') +
  [['质量', m0.toFixed(2) + ' kg'], ['指令延迟', STEPD * 1000 + ' ms'], ['电机时间常数', tauId.toFixed(0) + ' ms']].map((r, i) => S.box(60, 40 + i * 54, 290, 44, r[0] + '：' + r[1], '', 'hl')).join('') +
  [['电量 / 掉压', '每分钟都在变'], ['载荷、风', '每次任务都不同'], ['延迟的波动、气动细节', '很难测全']].map((r, i) => S.box(440, 40 + i * 54, 340, 44, r[0], r[1], 'px')).join('') +
  S.text(610, 206, '→ 交给域随机化或在线适应', 'sv-s warn'), '系统辨识能做和做不到的');

el.innerHTML = `
<p class="lede">学习型控制器几乎都在仿真里训练：真机摔不起，也飞不了几百万次。可仿真只是近似，仿真里很好的控制器搬到真机上常常变差。这段差距叫<span class="term">现实差距</span>（reality gap），跨过它叫 <span class="term">sim-to-real</span>。</p>

<h2>差距从哪来</h2>
${K.fig(figGap, '左边是最简单的仿真，右边是真飞时会遇到的' + K.ours('') + '。训练是优化，它会利用仿真里的一切，包括漏洞：仿真里没有延迟，它就可能学会只在零延迟时才稳的高增益动作。')}

<h2>办法一：系统辨识，把参数量准</h2>
<div id="walk16"></div>

<h2>办法二：域随机化，让控制器见过各种世界</h2>
${K.fig(figDR, '<span class="term">域随机化</span>（domain randomization）：既然不知道真机参数，训练时就每次随机抽一组，让控制器在许多仿真世界里都要表现好。只要随机范围把真机包住，真机就只是“又一个差不多的世界”。')}
${K.fig(figCurve, `用下面实验的同一个高度控制器（PD + 重力前馈），网格搜索 24 × 24 组增益调两次。<b>蓝</b>：只在 20 ms 延迟、质量准确时调，在 20 ms 处误差 ${e20[0].toFixed(1)} cm，比橙色的 ${e20[1].toFixed(1)} cm 好；可延迟到 40 ms 就变成 ${e40[0].toFixed(0)} cm（右图：越晃越大，最后往下掉）。<b>橙</b>：在上图 8 个世界里调，40 ms 时仍是 ${e40[1].toFixed(1)} cm。代价是：随机化让控制器更保守，在标准情况下反而差一些。`)}
${K.more('展开：域随机化的来历和四旋翼上的例子', `<ul>
<li>这个名字来自 Tobin 等人（IROS 2017）：他们随机化仿真图像的渲染方式（颜色、纹理、光照等），只用仿真图像训练的物体定位网络可以直接用在真实图像上。</li>
<li>Peng 等人（ICRA 2018）把同样的想法用在动力学上：随机化质量、摩擦、延迟等参数，训练的机械臂推物体策略直接用在真机上。</li>
<li>四旋翼上的早期例子是 Molchanov 等人（IROS 2019）：网络从状态直接输出电机指令，仿真加了电机滞后和噪声并随机化质量、尺寸、推重比等，同一策略飞了几架大小不同的真机。他们也报告：随机化有帮助，但比不随机化的版本提升不大。</li>
<li><b>随机化不是越多越好。</b>要在所有抽到的世界里都不出事，只能选“对谁都安全”的动作，通常更保守、更慢；范围越宽，在真实参数附近越吃亏。经典控制器调参也一样（上图就是一个两个增益的 PD），只是参数越多、优化越狠，越容易“只适合仿真”。</li>
</ul>`)}

<h2>${K.ours('', `四类办法`)}</h2>
${K.fig(S.svg(820, 150,
  S.box(10, 20, 190, 100, '① 系统辨识', K.ours('', '测质量、推力、电机'), 'hl') + S.box(213, 20, 190, 100, '② 域随机化', K.ours('', '每回合重抽参数'), 'hl') +
  S.box(416, 20, 190, 100, '③ 真实数据修正', K.ours('', '先真飞一小会儿'), K.ours('', 'hl')) + S.box(619, 20, 190, 100, '④ 边飞边适应', '历史窗口、RMA（第 14 课）', 'hl'),
  '四类办法'), '' + K.ours('') + '③ 是先在真机上飞一小会儿，拟合“真机 − 仿真”的差（<span class="term">残差模型</span>），加回仿真再训练；④ 见第 14 课 <a href="#l14">学习型自适应</a>。' + K.ours('') + '')}
${K.more(K.ours('', '展开：Swift、RAPTOR 等例子'), `<ul>
<li><b>Swift</b>（Kaufmann 等，Nature 2023，无人机竞速）：训练时<b>没有</b>做动力学随机化。用 3 次真机飞行（约 50 秒）拟合两个残差模型：视觉里程计的估计误差（高斯过程），动力学的残差加速度（k 近邻回归，k = 5）。加进仿真后再微调策略。</li>
<li>类似思路：Hwangbo 等（Science Robotics 2019，足式机器人）用数据学一个“执行器网络”，替代仿真里不准的电机模型。</li>
<li><b>RAPTOR</b>（Eschmann、Albani、Loianno，Science Robotics 2026）：随机抽 1000 种四旋翼，每种用强化学习训一个“老师”，再蒸馏成一个只有 2084 个参数、带记忆的循环网络。它不知道飞机参数，只能从最近的飞行反应里推断，是“随机化 + 在线适应”的组合；直接输出电机转速（绕过角速度环），飞过 10 架约 32 克到约 2.4 千克的真机。据作者描述，迁移时主要困难是固件延迟而非参数不准；训练中没有随机化延迟。</li>
</ul>${K.ours('')}`)}

<h2>和前面的课</h2>
<div class="tblwrap"><table class="tbl">
<tr><th>前面学过的</th><th>在这一课里</th></tr>
<tr><td>第 2、3 课：增益高 + 有延迟 → 振荡</td><td>标准调的高增益在延迟变大时先坏</td></tr>
<tr><td>第 4 课 <a href="#lest">状态估计</a>：估计晚到、带噪声</td><td>现实差距的第一、三项</td></tr>
<tr><td>第 11 课 <a href="#l10">公平比较</a>：分布内 / 分布外</td><td>随机化范围 = 分布内；超出它的测试 = 分布外</td></tr>
<tr><td>第 14 课 <a href="#l14">学习型自适应</a></td><td>办法 ④：飞的时候推断“这架飞机现在怎样”</td></tr>
</table></div>

<div id="d16"></div>

<div class="key"><h3>这一课记住三件事</h3><ul>
<li>仿真和真机之间总有差距：延迟、电机、噪声、质量、气动。优化得越狠，越可能只适合仿真。</li>
<li>四类办法：测准参数（系统辨识）、让控制器见过各种世界（域随机化）、用真实数据修正仿真（残差模型）、边飞边适应。</li>
<li>随机化是取舍：范围越宽越稳，但在真实参数附近越保守。</li>
</ul></div>
<h2>小测验</h2><div id="q16"></div>`;

K.steps(el.querySelector('#walk16'), { title: '系统辨识：用两次简单实验量出质量、延迟和电机时间常数', steps: [
  { svg: stepMass, t: `<b>质量</b>：悬停时推力正好等于重力。读到悬停推力 ${Th.toFixed(1)} N，除以 9.81，得 <b>${m0.toFixed(2)} kg</b>。` },
  { svg: stepFig(0), t: `<b>阶跃实验</b>：让指令突然加 20%（${Th.toFixed(1)} → ${(1.2 * Th).toFixed(1)} N），每 5 ms 记一次实际推力（橙点）。推力不会瞬间跳上去。` },
  { svg: stepFig(1), t: `<b>延迟</b>：前 ${STEPD * 1000} ms 推力一点没动：指令还在路上。这就是延迟 <b>${STEPD * 1000} ms</b>。` },
  { svg: stepFig(2), t: `<b>电机时间常数</b>：一阶滞后走完 63% 所用的时间叫时间常数 τ。从开始动（20 ms）到 63%（约 ${t63.toFixed(0)} ms），τ ≈ <b>${tauId.toFixed(0)} ms</b>。实验代码里写的是 30 ms，但它每 5 ms 一步的离散近似实际表现为约 ${tauId.toFixed(0)} ms：系统辨识量的是<b>实际表现</b>，不是抄参数表。` },
  { svg: stepFig(3), t: '<b>放回仿真对照</b>：用量到的延迟和 τ 画出仿真曲线（蓝绿色），和实测点重合，说明这两个数量准了。' },
  { svg: stepLimit, t: '<b>极限</b>：质量、延迟、τ 这类固定的量能量准；可电量、载荷、风每次飞都不同，延迟的波动和气动细节也很难测全。这些交给下一节的域随机化。' },
] });

const d = K.demo(el.querySelector('#d16'), '动手', '只在“标准情况”下调参 vs 在随机世界里调参',
  '默认设置就是上面那张图。① 拖“真机实际延迟”到 40 ms，看右图。② 把“随机化：延迟上限”拉到 150 ms 再按“重新调参”：橙色更平，但在 20 ms 处误差变大。③ 横轴切到“质量”：质量偏离很多（×0.6 或 ×1.4 以上）时蓝色才明显变差。');
const cvs = K.box(d, 'cvs');
const cA = K.canvas(cvs, 0.75, 250), cB = K.canvas(cvs, 0.75, 250);
const ctl = K.box(d, 'controls'), ro = K.box(d, 'readout');
const ax = K.seg(ctl, { label: '左图横轴', options: [['d', '真机实际延迟'], ['m', '真机实际质量']], value: 'd', on: () => { dirty = 1; } });
const sRd = K.slider(ctl, { id: 'l16-rd', label: '真机实际延迟', min: 0, max: 150, step: 5, value: 20, fmt: v => v + ' ms', on: () => { dirty = 1; } });
const sRm = K.slider(ctl, { id: 'l16-rm', label: '真机实际质量（相对标准值）', min: 0.6, max: 1.5, step: 0.05, value: 1, fmt: v => '×' + v.toFixed(2), on: () => { dirty = 1; } });
const sD = K.slider(ctl, { id: 'l16-dd', label: '随机化：延迟上限（下限 0）', min: 20, max: 150, step: 10, value: 60, fmt: v => v + ' ms' });
const sM = K.slider(ctl, { id: 'l16-dm', label: '随机化：质量偏差', min: 0, max: 30, step: 5, value: 20, fmt: v => '±' + v + '%' });
const br = K.box(ctl, 'btnrow'); K.btn(br, '重新调参', () => start(), 'primary');

/* the default settings (60 ms, ±20 %) were already tuned for the static figure; reuse them unless the sliders were restored to other values */
let job = null, gN = G0N, gR = null, dirty = 1, dr = null, used = [60, 20];
function start() {
  used = [sD.v, sM.v]; dirty = 1;
  if (used[0] === 60 && used[1] === 20) { gR = G0R; job = null; return; }
  dr = drSet(used[0] / 1000, used[1] / 100); job = { row: 0, br: [0, 0, 9] }; gR = null;
}
function work() {
  const i = job.row;
  for (let j = 0; j < NG; j++) {
    let s = 0; for (const [dd, r] of dr) s += run(KP(i), KD(j), dd, r); s /= dr.length;
    if (s < job.br[2]) job.br = [i, j, s];
  }
  if (++job.row === NG) { gR = [KP(job.br[0]), KD(job.br[1])]; job = null; }
  dirty = 1;
}
start();
K.loop(() => {
  if (job) work();
  if (!dirty) return; dirty = 0;
  const c = K.col(), a = cA.fit(), b = cB.fit(), ready = gN && gR;
  const isD = ax.v === 'd', xs = [], ptsN = [], ptsR = [];
  for (let k = 0; k <= 30; k++) xs.push(isD ? k * 5 : 0.6 + 0.03 * k);
  if (ready) xs.forEach(x => {
    const [dd, r] = isD ? [x / 1000, 1] : [NOM_D, x];
    ptsN.push([x, run(gN[0], gN[1], dd, r) * 100]); ptsR.push([x, run(gR[0], gR[1], dd, r) * 100]);
  });
  const P = K.plot(a.ctx, 0, 0, a.w, a.h, { title: '跟踪误差', unit: 'cm', x: isD ? [0, 150] : [0.6, 1.5], y: [0, 50],
    xfmt: v => isD ? v + 'ms' : '×' + v.toFixed(1),
    series: [{ pts: ptsN, color: c.b, label: '标准调' }, { pts: ptsR, color: c.warn, label: '随机调' }] });
  const ctx = a.ctx; ctx.save(); ctx.globalAlpha = 0.13; ctx.fillStyle = c.warn;
  const lo = isD ? 0 : 1 - used[1] / 100, hi = isD ? used[0] : 1 + used[1] / 100;
  ctx.fillRect(P.X(lo), P.pt, P.X(Math.min(hi, isD ? 150 : 1.5)) - P.X(lo), P.pb - P.pt); ctx.restore();
  const xn = isD ? 20 : 1, xr = isD ? sRd.v : sRm.v;
  [[xn, c.b, '标准', 12], [xr, c.ink, '真机', 28]].forEach(([x, col, s, dy]) => { ctx.save(); ctx.strokeStyle = col; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(P.X(x), P.pt); ctx.lineTo(P.X(x), P.pb); ctx.stroke(); ctx.restore(); K.text(ctx, s, P.X(x) + 3, P.pt + dy, col); });
  K.text(ctx, '浅橙色 = 随机化范围；误差在 50 cm 封顶', P.pl + 4, P.pb - 6, c.soft);
  const rn = [], rr = [], rf = []; let eN = 0, eR = 0;
  if (ready) { eN = run(gN[0], gN[1], sRd.v / 1000, sRm.v, rn); eR = run(gR[0], gR[1], sRd.v / 1000, sRm.v, rr); }
  for (let t = 0; t <= TEND; t += 0.02) rf.push([t, ref(t)]);
  K.plot(b.ctx, 0, 0, b.w, b.h, { title: '真机上的高度响应', unit: 'm', x: [0, TEND], y: [0.8, 3.2], xfmt: v => v + 's',
    series: [{ pts: rf, color: c.soft, dash: [6, 4], label: '目标' }, { pts: rn, color: c.b, label: '标准' }, { pts: rr, color: c.warn, label: '随机' }] });
  const f = G => `P ${G[0].toFixed(0)} / D ${G[1].toFixed(1)}`, cmf = v => (v * 100).toFixed(1) + ' cm';
  ro.innerHTML = ready
    ? `<span>标准情况下调的 <b>${f(gN)}</b></span><span>随机世界里调的 <b>${f(gR)}</b></span><span>在标准情况下的误差 <b>${cmf(run(gN[0], gN[1], NOM_D, 1))}</b> vs <b>${cmf(run(gR[0], gR[1], NOM_D, 1))}</b></span><span>在当前“真机”上 <b class="${eN > eR ? 'hot' : 'good'}">${cmf(eN)}</b> vs <b class="${eR > eN ? 'hot' : 'good'}">${cmf(eR)}</b></span>`
    : `<span>网格搜索中 <b>${job ? job.row : 0} / ${NG}</b> 行</span>`;
});
K.box(d, 'assume', '<b>这个实验（和上面的图）做了哪些简化：</b>只有上下一个方向，控制器只是 PD 加按标准质量算的重力前馈（没有积分，所以质量不准时会有小的静差）；延迟只作用在指令上，固定不变；电机是 30 ms 一阶滞后（每 5 ms 一步的离散近似），推力上限为标准重量的 1.95 倍；没有噪声和风；“随机世界”只有 8 个（延迟均匀分层、质量打散），优化器是 24 × 24 的网格搜索，不是强化学习；系统辨识一步一步看里的“实测”数据也是这个模型生成的，没有噪声。数值是这个玩具模型里的，只说明趋势。');

K.quiz(el.querySelector('#q16'), 'l16', [
  { q: '“现实差距”（reality gap）指的是什么？', o: ['仿真跑得比真实时间慢', '仿真模型和真实物理之间的差别，使仿真里调好的控制器在真机上变差', '真机比仿真更贵', '神经网络太大，真机算不动'], a: 1,
    e: '延迟、电机动态、噪声、质量、气动等在仿真里都只是近似，这些差别合起来就是现实差距。' },
  { q: '阶跃实验里，指令发出后前 20 ms 推力没动，之后再过约 28 ms 升到 63%。这两个数分别是？', o: ['质量和推力', '延迟和电机时间常数', '电机时间常数和延迟', '噪声和偏差'], a: 1,
    e: '“完全没动”的那段是延迟；开始动以后走到 63% 所用的时间是一阶滞后的时间常数 τ。' },
  { q: '把域随机化的范围开得非常宽，最可能出现什么？', o: ['在所有条件下都最好', '更不怕参数变化，但在真实参数附近比专门调的更保守、误差更大', '训练一定失败', '和不随机化完全一样'], a: 1,
    e: '要在所有抽到的世界里都安全，只能选保守的动作。实验里把延迟上限拉到 150 ms，橙色曲线变平，但在 20 ms 处的误差明显变大。' },
  { q: 'Swift（Nature 2023）是怎么跨过现实差距的？', o: ['大范围随机化动力学参数', '用约 50 秒真机飞行数据拟合感知和动力学的残差模型，加进仿真后微调策略', '完全在真机上训练', '把策略换成 PID'], a: 1,
    e: '原文写明训练时没有随机化平台动力学；感知残差用高斯过程，动力学残差用 k 近邻回归，都来自少量真机数据。' },
  { q: '实验里，为什么只在标准情况下调的控制器在延迟变大时先坏？', o: ['它的增益太小', '它选了在 20 ms 延迟下刚好最好的高增益，延迟一大，指令总是“晚到”，高增益就会来回过冲', '它的质量估错了', '网格搜索有错误'], a: 1,
    e: '高增益在小延迟下跟得最紧，但稳定余量小。延迟会让纠正总是来得太晚，增益越高越容易振荡（第 2、3 课）。' },
]);
} });
