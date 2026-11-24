K.add({ id: 'l10', num: 11, title: '怎么公平比较控制器', sub: '调参、配对、置信区间、分布内外', render(el) {
const S = K.S;

/* ---- the demo's random model, with a fixed-seed generator so the static figures are reproducible ---- */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const r1 = v => Math.round(v * 10) / 10, mean = a => a.reduce((s, x) => s + x, 0) / a.length;
/* episode k: difficulty dA (shared by A and paired B), dB (B's own episode when unpaired); same formulas as the demo below */
const EP = (() => { const r = rng(30); return Array.from({ length: 20 }, () => {
  const dA = Math.exp(0.6 * gauss(r)), dB = Math.exp(0.6 * gauss(r)), nA = gauss(r), nB = gauss(r);
  return { A: r1(20 * dA * (1 + 0.12 * nA)), Bp: r1(22 * dA * (1 + 0.12 * nB)), Bu: r1(22 * dB * (1 + 0.12 * nB)) }; }); })();
function boot(diffs, seed, n) {
  const r = rng(seed), N = diffs.length, picks = [], means = [];
  for (let k = 0; k < n; k++) { let s = 0; const p = []; for (let i = 0; i < N; i++) { const j = (r() * N) | 0; p.push(j); s += diffs[j]; } picks.push(p); means.push(s / N); }
  const so = means.slice().sort((x, y) => x - y);
  return { picks, means, lo: so[Math.floor(0.025 * n)], hi: so[Math.floor(0.975 * n)] };
}
const E8 = EP.slice(0, 8), DP = E8.map(e => r1(e.Bp - e.A)), DU = E8.map(e => r1(e.Bu - e.A));
const BP = boot(DP, 7, 2000), BU = boot(DU, 7, 2000), mP = mean(DP), mU = mean(DU);
const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2), sg = v => (v > 0 ? '+' : '') + f1(v);

/* small local helpers */
const lin = (a0, a1, b0, b1) => v => b0 + (v - a0) / (a1 - a0) * (b1 - b0);
const dot = (x, y, c, r) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r || 4.5}" class="sv-fill-${c}"/>`;
const axis = (X, v0, v1, ticks, y, unit) => `<line x1="${X(v0)}" y1="${y}" x2="${X(v1)}" y2="${y}" class="sv-l-soft"/>` +
  ticks.map(v => `<line x1="${X(v)}" y1="${y - 4}" x2="${X(v)}" y2="${y + 4}" class="sv-l-soft"/>` + S.text(X(v), y + 18, K.nf(v) + (unit || ''), 'sv-s')).join('');
const zero = (X, y0, y1) => `<line x1="${X(0)}" y1="${y0}" x2="${X(0)}" y2="${y1}" class="sv-l-ink" stroke-dasharray="4 3" style="stroke-width:1.2"/>`;

/* ---- figure: what an untuned opponent does in the demo's model (full build: plus the validation-set tuning results) ---- */
const mA = mean(EP.map(e => e.A)), mB = mean(EP.map(e => e.Bp)), mBu = mB * 1.4;
const bx = lin(0, 40, 0, 150);
const tuneRight =
  S.text(710, 20, '下面实验的模型，20 回合平均', 'sv-s') +
  [['A', mA, 'acc'], ['B 调好', mB, 'b'], ['B 没调', mBu, 'bad']].map((r, i) => { const x = 630 + i * 62, h = bx(r[1]);
    return `<rect x="${x}" y="${200 - h}" width="40" height="${h}" rx="3" class="sv-fill-${r[2]}" opacity=".75"/>` + S.text(x + 20, 194 - h, f1(r[1]), 'sv-s') + S.text(x + 20, 220, r[0], 'sv-s'); }).join('') +
  S.text(710, 242, 'A 领先 ' + f1(mB - mA) + ' mm → ' + f1(mBu - mA) + ' mm', 'sv-s bad');
let figTune = !K.PUBLIC ? '' : S.svg(520, 250, `<g transform="translate(-450,0)">` + tuneRight + `</g>`, '调参能差多少');
if (!K.PUBLIC) ''

/* ---- figure: paired vs unpaired, 20 episodes from the demo's model ---- */
function pairPanel(x0, paired) {
  const X = i => x0 + 62 + i * 16.8, Y = lin(0, 80, 196, 36), D = lin(-60, 60, x0 + 44, x0 + 390);
  let b = S.text(x0 + 200, 18, paired ? '配对：A、B 跑同一批回合' : '不配对：B 跑的是另一批回合', 'sv-t') +
    `<rect x="${x0 + 44}" y="34" width="346" height="164" class="sv-box"/>` +
    [0, 20, 40, 60, 80].map(v => `<line x1="${x0 + 44}" y1="${Y(v)}" x2="${x0 + 390}" y2="${Y(v)}" class="sv-l-grid"/>` + S.text(x0 + 38, Y(v) + 4, v, 'sv-s', 'end')).join('') +
    S.text(x0 + 217, 214, '回合 1 → 20（误差，mm）', 'sv-s');
  EP.forEach((e, i) => { const B = paired ? e.Bp : e.Bu;
    if (paired) b += `<line x1="${X(i)}" y1="${Y(e.A)}" x2="${X(i)}" y2="${Y(B)}" class="sv-l-soft"/>`;
    b += dot(X(i), Y(e.A), 'acc', 4) + dot(X(i) + (paired ? 0 : 5), Y(B), 'b', 4); });
  b += axis(D, -60, 60, [-60, -30, 0, 30, 60], 262) + zero(D, 236, 262) + S.text(x0 + 217, 300, '每回合 B − A（mm）', 'sv-s');
  EP.forEach((e, i) => { const v = (paired ? e.Bp : e.Bu) - e.A; b += dot(D(v), 244 + (i % 3) * 5, v > 0 ? 'acc' : 'warn', 3.4); });
  return b;
}
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
const sdP = sd(EP.map(e => e.Bp - e.A)), sdU = sd(EP.map(e => e.Bu - e.A));
const figPair = S.svg(820, 310, pairPanel(0, false) + pairPanel(420, true), '配对与不配对');

/* ---- walkthrough: bootstrap confidence interval for 8 paired episodes ---- */
const cx8 = i => 80 + i * 92;
function barsSvg(useB, diffs, hl) {
  const H = lin(0, 50, 0, 140);
  let b = S.text(810, 18, '蓝绿 = A　蓝 = B', 'sv-s', 'end');
  E8.forEach((e, i) => { const B = useB(e), x = cx8(i);
    b += `<rect x="${x - 24}" y="${170 - H(e.A)}" width="22" height="${H(e.A)}" rx="2" class="sv-fill-acc" opacity=".8"/>` +
      `<rect x="${x + 2}" y="${170 - H(B)}" width="22" height="${H(B)}" rx="2" class="sv-fill-b" opacity=".8"/>` +
      S.text(x - 1, 164 - H(e.A), f1(e.A), 'sv-s', 'end') + S.text(x + 1, 164 - H(B), f1(B), 'sv-s', 'start') +
      S.text(x, 190, '回合 ' + (i + 1), 'sv-s') + S.text(x, 214, sg(diffs[i]), hl ? 'sv-n' : 'sv-t'); });
  return S.svg(820, 230, `<line x1="40" y1="170" x2="800" y2="170" class="sv-l-soft"/>` + b, '8 个回合的误差');
}
const DX = lin(-4, 8, 80, 760);
const stripSvg = S.svg(820, 200, axis(DX, -4, 8, [-4, -2, 0, 2, 4, 6, 8], 120, '') + zero(DX, 96, 120) +
  DP.map((v, i) => dot(DX(v), 104 - (i % 2) * 14, v > 0 ? 'acc' : 'warn', 6) + S.text(DX(v), 84 - (i % 2) * 14 - 8, '#' + (i + 1), 'sv-s')).join('') +
  `<path d="M${DX(mP)} 134 l-7 12 h14 z" class="sv-fill-ink"/>` + S.text(DX(mP), 166, '平均 ' + f2(mP) + ' mm', 'sv-t') +
  S.text(DX(-4), 190, '← B 更好', 'sv-s', 'start') + S.text(DX(8), 190, 'A 更好 →', 'sv-s', 'end'), '8 个差值和平均');
function chips(k, y) {
  return BP.picks[k].map((j, i) => S.box(40 + i * 82, y, 72, 44, '#' + (j + 1), sg(DP[j]), 'b')).join('') +
    S.text(712, y + 28, '→ 平均 ' + f2(BP.means[k]), 'sv-n', 'start');
}
const HB = (() => { const bins = []; for (let v = -1; v < 6; v += 0.25) bins.push([v, BP.means.filter(m => m >= v && m < v + 0.25).length]); return bins; })();
const HX = lin(-1, 6, 80, 760), HMAX = Math.max(...HB.map(b => b[1]));
function histSvg(cut) {
  let b = axis(HX, -1, 6, [-1, 0, 1, 2, 3, 4, 5, 6], 180, '') + zero(HX, 20, 180);
  HB.forEach(([v, n]) => { const out = cut && (v + 0.125 < BP.lo || v + 0.125 > BP.hi);
    b += `<rect x="${HX(v) + 1}" y="${180 - n / HMAX * 140}" width="${HX(v + 0.25) - HX(v) - 2}" height="${n / HMAX * 140}" class="sv-fill-${out ? 'bad' : 'acc'}" opacity="${out ? 0.5 : 0.7}"/>`; });
  if (cut) b += `<line x1="${HX(BP.lo)}" y1="26" x2="${HX(BP.hi)}" y2="26" class="sv-l-ink" style="stroke-width:4"/>` +
    S.text((HX(BP.lo) + HX(BP.hi)) / 2, 18, '95% 区间 [' + f1(BP.lo) + ', ' + f1(BP.hi) + '] mm', 'sv-t') +
    S.text(HX(-0.55), 160, '最低 2.5%', 'sv-s bad') + S.text(HX(4.9), 160, '最高 2.5%', 'sv-s bad');
  else b += S.text(HX(5.5), 40, '2000 个平均差', 'sv-s', 'end');
  b += S.text(420, 214, '重抽一次得到的平均差（mm）', 'sv-s');
  return S.svg(820, 224, b, '2000 次重抽的平均差分布');
}
const UX = lin(-30, 30, 80, 760);
const unpSvg = S.svg(820, 220, axis(UX, -30, 30, [-30, -20, -10, 0, 10, 20, 30], 150, '') + zero(UX, 20, 150) +
  DU.map((v, i) => dot(UX(v), 136 - (i % 2) * 12, v > 0 ? 'acc' : 'warn', 5)).join('') +
  `<line x1="${UX(BU.lo)}" y1="56" x2="${UX(BU.hi)}" y2="56" class="sv-l-bad" style="stroke-width:5"/>` + S.text(UX(BU.hi) + 8, 61, '不配对 [' + f1(BU.lo) + ', ' + f1(BU.hi) + ']', 'sv-s bad', 'start') +
  `<line x1="${UX(BP.lo)}" y1="30" x2="${UX(BP.hi)}" y2="30" class="sv-l-acc" style="stroke-width:5"/>` + S.text(UX(BP.hi) + 8, 35, '配对 [' + f1(BP.lo) + ', ' + f1(BP.hi) + ']', 'sv-s acc', 'start') +
  S.text(420, 196, '不配对时每回合的差值 B − A（mm）：差值分散得多', 'sv-s'), '不配对的区间');
const steps = [
  { svg: barsSvg(e => e.Bp, DP, true), t: '用下面实验的模型抽 8 个回合，A 和 B 跑<b>同样的回合</b>（配对）。每个回合算一个差值 B − A（下排数字）。有的回合 B 反而更好（#7、#8）。' },
  { svg: stripSvg, t: '8 个差值的平均是 <b>' + f2(mP) + ' mm</b>，看起来 A 更好。但只有 8 个回合，换 8 个回合，平均差会变。它会在多大范围里晃？' },
  { svg: S.svg(820, 120, S.text(40, 30, '从 8 个差值里有放回地抽 8 次（同一个可以被抽中好几次）：', 'sv-t', 'start') + chips(0, 50), '第 1 次重抽'),
    t: '<b>自助法</b>的想法：把手上这 8 个回合当成“全部回合”的缩影，从里面<b>有放回地</b>抽 8 个，算一个平均。这一次抽到 #1 两次、#4 两次，#3、#7 没抽到，平均 <b>' + f2(BP.means[0]) + '</b>。' },
  { svg: S.svg(820, 190, chips(0, 10) + chips(1, 70) + chips(2, 130), '前 3 次重抽'),
    t: '再抽两次：' + f2(BP.means[1]) + '、' + f2(BP.means[2]) + '。每次抽到的回合不一样，平均差也就不一样。这种波动，模拟了“换一批回合”会发生的事。' },
  { svg: histSvg(false), t: '重复 <b>2000 次</b>，得到 2000 个平均差，画成直方图。大约七成落在 1 到 3 之间。' },
  { svg: histSvg(true), t: '去掉最低的 2.5%（50 个）和最高的 2.5%（50 个），剩下的范围 <b>[' + f1(BP.lo) + ', ' + f1(BP.hi) + '] mm</b> 就是 95% 置信区间。整个区间都在 0 的右边，所以（在这个置信水平下）可以说 A 更好。' },
  { svg: unpSvg, t: '同样 8 个 A 的回合，如果 B 跑的是<b>另一批</b>回合（不配对），差值里混进了回合难度的差别，区间变成 <b>[' + f1(BU.lo) + ', ' + f1(BU.hi) + ']</b>，跨过 0，分不出胜负；这批数据的平均差甚至是 ' + f1(mU) + '，方向都错了。' },
];

/* ---- figure: data splits ---- */
const figSplit = S.svg(820, 250,
  S.box(10, 20, 180, 60, '训练集', K.ours('', '只在分布内范围抽'), 'b') +
  S.box(10, 100, 180, 60, K.ours('', '验证集'), K.ours('', '分布内'), 'b') +
  S.box(10, 180, 180, 60, K.ours('', '分布外验证集'), K.ours('', '开发用'), 'b') +
  S.box(320, 20, 200, 60, '学习方法训练', '') +
  S.box(320, 100, 200, 60, '经典方法调参', '学习方法挑快照') +
  S.box(320, 180, 200, 60, '开发分布外鲁棒性', '') +
  S.arrow(190, 50, 318, 50) + S.arrow(190, 130, 318, 130) + S.arrow(190, 210, 318, 210) +
  `<path d="M560 10 v230" class="sv-l-bad" stroke-dasharray="6 4"/>` + S.text(568, 245, '调参前冻结，之后只看不改', 'sv-s bad', 'start') +
  S.box(600, 40, 210, 70, K.ours('', '测试集（分布内）'), K.ours('', '最终成绩'), 'hl') +
  S.box(600, 140, 210, 70, K.ours('', '测试集（分布外）'), K.ours('', '最终成绩'), 'px'),
  '数据划分');

/* ---- figure: what ID and OOD cells look like (wind axis D1 and sensing axis S) ---- */
const WXs = lin(0, 13, 120, 790);
let figCells = !K.PUBLIC ? '' : S.svg(820, 230,
  S.text(10, 24, '例子：恒定风', 'sv-t', 'start') +
  `<rect x="${WXs(0)}" y="44" width="${WXs(6) - WXs(0)}" height="30" rx="4" class="sv-fill-tint"/>` + S.text((WXs(0) + WXs(6)) / 2, 64, '训练：0–6 m/s 随机抽', 'sv-s acc') +
  axis(WXs, 0, 13, [0, 2, 4, 6, 8, 10, 12], 90, '') + S.text(805, 108, 'm/s', 'sv-s', 'end') +
  `<path d="M${WXs(4)} 120 l-7 12 h14 z" class="sv-fill-acc"/>` + S.text(WXs(4), 150, '测试 ID：4', 'sv-n') +
  [9, 12].map(v => `<path d="M${WXs(v)} 120 l-7 12 h14 z" class="sv-fill-warn"/>` + S.text(WXs(v), 150, 'OOD：' + v, 'sv-nw')).join('') +
  S.text(10, 190, '传感器', 'sv-t', 'start') +
  S.box(120, 162, 300, 56, '正常（ID）', '和训练时一样的噪声和延迟', 'hl') +
  S.box(470, 162, 340, 56, '退化（OOD）', '噪声更大、延迟更长、偶尔丢包', 'px'),
  '分布内和分布外的条件');
if (!K.PUBLIC) ''

let figRank = '';
if (!K.PUBLIC) ''

/* ---- figure: link to earlier lessons ---- */
const LINK = [['第 3 课', 'PX4 出厂参数', '原厂参照：故意不调'], ['第 8 课', '平滑与抗干扰的权衡', '指令平滑度也要报'], K.ours('', ['第 9 课', 'MPC 依赖模型和调参', '换个条件可能失效']), K.ours('', ['第 10 课', '手臂前馈', '比较改进时要看配对差'])];
const figLink = S.svg(820, 230, LINK.map((r, i) => S.box(10, 8 + i * 55, 140, 44, r[0], '', 'b') + S.text(170, 36 + i * 55, r[1], 'sv-s', 'start') +
  S.arrow(420, 30 + i * 55, 520, 30 + i * 55, { c: 'acc' }) + S.box(530, 8 + i * 55, 280, 44, r[2], '', 'hl')).join(''), '这一课和前几课的关系');

el.innerHTML = `
<p class="lede">学完前十课，你已经知道有很多种控制器。论文里每个人都说自己的方法最好，那怎么判断谁真的更好？这一课讲公平比较的五条规矩${K.ours('')}。</p>

<h2>规矩一：对手也要调好参数</h2>
${K.ours('', K.fig(figTune, '用下面实验的模型（20 回合平均）：如果只调自己的方法、对手 B 用默认参数（这里假设没调参的 B 误差大 40%），A 的领先会被夸大好几倍。所以每个方法都应该用<b>同样的调参算法、同样的预算</b>调好。', 'narrow'))}
${K.ours('', `${K.more('展开：怎样才算“同样的预算”', `<ul>
<li>每个需要调参的方法都用同一种自动调参算法（例如进化策略或贝叶斯优化），给同样多次的评估；把方法自带的默认参数也算作一个候选。</li>
<li>只在验证集上调，所有候选飞同一批回合。</li>
<li>每个方法只调一套全局参数，不按测试条件分别调。</li>
<li>可以保留一个“故意不调”的参照，比如 PX4 原厂参数，用来说明原厂水平。</li>
</ul>`)}`)}

<h2>规矩二：在同样的条件下比（配对）</h2>
${K.fig(figPair, '每个回合的难度差别很大（同一个 A，误差从几 mm 到 60 多 mm）。<b>左</b>：B 跑的是另一批回合，差值 B − A 主要反映“谁抽到了容易的回合”，从 −51 到 +34 mm 都有（标准差 ' + f1(sdU) + ' mm）。<b>右</b>：A、B 跑完全相同的回合（同样的风、轨迹、随机种子）再逐回合相减，难度抵消，差值集中在 2 mm 附近（标准差 ' + f1(sdP) + ' mm）。')}

<h2>规矩三：给出置信区间，而不是一个数</h2>
<p>“A 比 B 好 2 mm”可能只是运气。<span class="term">置信区间</span>告诉你这个差值有多可信。常用的算法叫<span class="term">自助法</span>（bootstrap）。</p>
<div id="walk10"></div>
${K.more('展开：怎么读区间', `<p>如果 95% 区间整个在 0 的一边，才能（在这个置信水平下）说谁更好；如果跨过 0，就是这些数据还分不出胜负。注意，“分不出胜负”不等于“两者一样好”，可能只是回合数不够。${K.ours('', `常见做法：连续指标用回合层面的百分位自助法（固定随机数生成器，结果可复现）；成功率这类比例用 Wilson 区间；方法之间比较用同一回合两方法之差的配对区间，比两个各自的区间更紧。`)}</p>`)}
<div id="d10"></div>

<h2>规矩四：分开看“见过的”和“没见过的”</h2>
${K.fig(figSplit, '调参、训练用的场景和最终测试用的场景要分开。学习方法只在训练集上训练；经典方法调参、学习方法挑训练快照只用验证集；最终成绩只看测试集，而且测试集在调参之前就冻结（记下指纹，之后核对没被改过）。')}
${K.fig(figCells, '<span class="term">分布内</span>（ID）：和训练时同类的条件，比如风速落在训练范围里。<span class="term">分布外</span>（OOD）：训练时没见过的条件，比如更强的风、传感器变差。')}
${K.ours('', `<p>一个方法在分布内好，不代表在分布外也好。比如只在正常传感器条件下调出来的高增益，到了大延迟、丢包的条件下可能失稳。所以两类结果要分开报告。</p>`)}
${K.ours('')}

<h2>规矩五：不只看误差</h2>
<div class="tblwrap"><table class="tbl">
<tr><th>指标</th><th>为什么要看</th></tr>
<tr><td>跟踪误差</td><td>最直接的“飞得准不准”</td></tr>
<tr><td>成功率</td><td>有没有失控、撞到东西${K.ours('')}</td></tr>
<tr><td>指令平滑度</td><td>指令抖得厉害，真机上电机发热、振动大（第 8 课的权衡）</td></tr>
<tr><td>计算时间</td><td>机载电脑能不能实时跑</td></tr>
</table></div>
${K.ours('', `${K.more('展开：其他常见指标', `<p>还有：扰动后的峰值偏差和恢复时间；推力包络（电机满输出的时间占比、最小电机余量、最大倾角）；功率。中途失败（坠毁、偏离参考太远）的回合要计罚，避免“只统计活下来的回合”造成偏差。结果按条件分别报告，不只报总平均。</p>`)}`)}

<h2>和前几课的关系</h2>
${K.fig(figLink, '前几课讲的是“怎么控制”；这一课讲的是“怎么证明谁控制得更好”。')}

<div class="key"><h3>这一课记住三件事</h3><ul>
<li>对手也要用同样的预算调好参数。</li>
<li>配对比较 + 置信区间：区间跨过 0 就是这些数据还分不出胜负。</li>
<li>分布内和分布外分开报告；误差、成功率、平滑度、计算时间一起看。</li>
</ul></div>
<h2>小测验</h2><div id="q10"></div>`;

K.steps(el.querySelector('#walk10'), { title: '用数字走一遍：8 个回合，置信区间怎么来', steps });

const d = K.demo(el.querySelector('#d10'), '动手', '跑多少回合才能分出胜负',
  '这是一个模拟的比较：A 的真实水平比 B 好约 10%（平均约 2 mm）。每个点是一个回合里“B 的误差 − A 的误差”。改变回合数，切换配对，再点“再抽一批”几次，看结论稳不稳。');
const cv = K.canvas(d, 0.36, 210);
const ctl = K.box(d, 'controls'), ro = K.box(d, 'readout');
const NS = [5, 10, 20, 40, 80, 160, 320];
const sN = K.slider(ctl, { id: 'l10-n', label: '回合数', min: 0, max: 6, step: 1, value: 2, fmt: v => String(NS[v]), on: draw });
const pr = K.seg(ctl, { label: '比较方式', options: [['1', '配对（同样的回合）'], ['0', '不配对']], value: '0', on: draw });
const tu = K.seg(ctl, { label: '对手 B', options: [['1', '调好参数'], ['0', '没调参数']], value: '1', on: draw });
const br = K.box(ctl, 'btnrow'); K.btn(br, '再抽一批', () => { seed(); draw(); }, 'primary');
let pool;
function seed() {
  pool = Array.from({ length: 320 }, () => ({ dA: Math.exp(0.6 * K.randn()), dB: Math.exp(0.6 * K.randn()), nA: K.randn(), nB: K.randn() }));
}
function draw() {
  const N = NS[sN.v], paired = pr.v === '1', bad = tu.v === '0' ? 1.4 : 1;
  const diffs = pool.slice(0, N).map(p => { const dB = paired ? p.dA : p.dB; const A = 20 * p.dA * (1 + 0.12 * p.nA), B = 22 * dB * (1 + 0.12 * p.nB) * bad; return B - A; });
  const m = mean(diffs), boots = [];
  for (let k = 0; k < 2000; k++) { let s = 0; for (let i = 0; i < N; i++) s += diffs[(Math.random() * N) | 0]; boots.push(s / N); }
  boots.sort((x, y) => x - y);
  const lo = boots[Math.floor(0.025 * boots.length)], hi = boots[Math.floor(0.975 * boots.length)];
  const c = K.col(), o = cv.fit(), ctx = o.ctx, L = 50, R = o.w - 20, range = 40;
  const X = v => L + (K.clamp(v, -range, range) + range) / (2 * range) * (R - L), yc = o.h * 0.42;
  ctx.fillStyle = c.panel; ctx.fillRect(0, 0, o.w, o.h);
  ctx.strokeStyle = c.line; ctx.beginPath(); ctx.moveTo(L, yc); ctx.lineTo(R, yc); ctx.stroke();
  K.ticks(-range, range, 8).forEach(v => { ctx.strokeStyle = v === 0 ? c.soft : c.grid; ctx.lineWidth = v === 0 ? 1.5 : 1; ctx.beginPath(); ctx.moveTo(X(v), 20); ctx.lineTo(X(v), o.h - 50); ctx.stroke(); K.text(ctx, String(v), X(v), o.h - 34, c.soft, '11px "JetBrains Mono", monospace', 'center'); });
  K.text(ctx, '← B 更好        每回合的差值 B − A（mm）        A 更好 →', (L + R) / 2, o.h - 14, c.soft, '12px "Noto Sans SC", sans-serif', 'center');
  diffs.forEach((v, i) => { ctx.fillStyle = v > 0 ? c.acc : c.warn; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(X(v), yc + ((i * 37) % 60 - 30) * 0.9, 3.2, 0, 7); ctx.fill(); });
  ctx.globalAlpha = 1;
  const by = o.h - 70;
  ctx.strokeStyle = lo > 0 ? c.ok : c.bad; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(X(lo), by); ctx.lineTo(X(hi), by); ctx.stroke();
  ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(X(m), by, 6, 0, 7); ctx.fill();
  K.text(ctx, '平均差和 95% 置信区间', X(hi) + 10, by + 4, c.soft);
  const verdict = lo > 0 ? '<b class="good">A 确实更好</b>' : hi < 0 ? '<b class="hot">B 更好（和事实相反）</b>' : '<b class="hot">分不出胜负</b>';
  ro.innerHTML = `<span>平均差 <b>${m.toFixed(1)} mm</b></span><span>95% 区间 <b>[${lo.toFixed(1)}, ${hi.toFixed(1)}]</b></span><span>区间宽度 <b>${(hi - lo).toFixed(1)} mm</b></span><span>结论：${verdict}</span>`;
}
seed(); draw();
let lw = 0; K.loop(() => { if (cv.wrap.clientWidth !== lw) { lw = cv.wrap.clientWidth; draw(); } });

K.box(d, 'assume', '<b>这个实验做了哪些简化：</b>每个回合的误差是从设定好的随机分布里抽出来的模拟数据，不是真实飞行结果；A 比 B 好多少是事先设定的，现实中正是要靠实验去估计它。上面的静态图和“一步一步看”用的是同一个分布，只是固定了随机种子。');

K.quiz(el.querySelector('#q10'), 'l10', [
  { q: '为什么要配对比较？', o: ['跑得更快', '所有方法跑相同的回合，回合难度带来的差异被抵消，置信区间更窄', '为了让结果好看', '为了少跑几次'], a: 1,
    e: '回合之间的难度差异往往比方法之间的差异大得多。逐回合相减，难度就抵消了。上面 8 个回合的例子里，配对区间宽约 ' + f1(BP.hi - BP.lo) + ' mm，不配对宽约 ' + f1(BU.hi - BU.lo) + ' mm。' },
  { q: '对手 B 没调参数，会怎样？', o: ['没影响', 'A 的优势被夸大，结论不可信', 'B 反而更好', 'A 的优势会被低估'], a: 1,
    e: '把 B 切到“没调参数”，A 的优势一下变大很多。这不是 A 更好，而是比较不公平。' },
  { q: '自助法里，从 8 个差值“有放回地抽 8 个”，是为了什么？', o: ['让平均差变大', '模拟“换一批回合”时平均差会怎么晃，从而估出它的范围', '去掉坏回合', '凑够 2000 个回合的真实数据'], a: 1,
    e: '每次重抽相当于假装又做了一次 8 回合的实验。重复 2000 次，平均差的分布中间 95% 就是置信区间。它不会产生新的真实数据，回合太少时区间本身也不太准。' },
  { q: '95% 置信区间是 [−0.8, 3.1] mm，能说 A 比 B 好吗？', o: ['能，平均差是正的', '不能，区间跨过 0，没分出胜负', '能，因为上限 3.1 很大', '说明 B 更好'], a: 1,
    e: '区间包含 0，说明这些数据排除不了“真实差值是 0 甚至是负的”。需要更多回合或配对设计，才能下结论。' },
]);
} });
