K.add({ id: 'rw3', num: 'R3', title: '精读 3：学习型飞控', sub: '从第一个 RL 四旋翼到 Swift、Song、RAPTOR、DATT', render(el) {
const S = Object.assign({}, K.S);
/* box with multi-line title AND multi-line subtitle ('\\n' splits lines) */
S.box = (x, y, w, h, t, s, cls) => {
  const tl = String(t).split('\n'), sl = s ? String(s).split('\n') : [], n = tl.length + sl.length, y0 = y + h / 2 - (n - 1) * 8 + 5;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="sv-box ${cls || ''}"/>` +
    tl.map((l, i) => `<text x="${x + w / 2}" y="${y0 + i * 17}" text-anchor="middle" class="sv-t">${l}</text>`).join('') +
    sl.map((l, i) => `<text x="${x + w / 2}" y="${y0 + (tl.length + i) * 17}" text-anchor="middle" class="sv-s">${l}</text>`).join('');
};

/* ---------- local helpers (page-only) ---------- */
/* horizontal bar chart: rows [{l: label, v: value, c: colour, t: text after bar}] */
const hbar = (W, rows, max, o) => {
  o = o || {};
  const lw = o.lw || 210, bh = 20, gap = 9, top = o.title ? 30 : 6, room = W - lw - 120;
  let b = o.title ? S.text(0, 17, o.title, 'sv-t', 'start') : '';
  rows.forEach((r, i) => {
    const y = top + i * (bh + gap), w = r.v == null ? 0 : Math.max(2, room * r.v / max);
    b += S.text(lw - 8, y + 15, r.l, 'sv-s', 'end');
    if (r.v != null) b += `<rect x="${lw}" y="${y}" width="${w.toFixed(1)}" height="${bh}" rx="3" class="sv-fill-${r.c || 'soft'}"/>`;
    b += S.text(lw + w + 6, y + 15, r.t, r.c === 'bad' || r.v == null ? 'sv-s bad' : 'sv-s', 'start');
  });
  return S.svg(W, top + rows.length * (bh + gap) + 4, b, o.aria || o.title || '');
};
const setup = rows => `<div class="tblwrap"><table class="tbl">${rows.map(r => `<tr><th style="width:8em">${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</table></div>`;
const lim = items => `<div class="warnbox"><b>局限 / 没回答的问题</b><ul>${items.map(t => `<li>${t}</li>`).join('')}</ul></div>`;
const rel = (t, rev) => K.ours('', `<div class="idea"><p><b>先复习：</b>${rev}</p></div>`);
const one = t => `<p><b>一句话：</b>${t}</p>`;

/* ---------- 1. Hwangbo 2017 ---------- */
const figHw = S.svg(820, 215,
  S.box(10, 60, 140, 66, '状态估计', 'Vicon + 机载 IMU') +
  S.text(80, 50, '输入：状态 − 航点', 'sv-s') + S.arrow(150, 93, 208, 52) + S.arrow(150, 93, 208, 140) +
  S.box(210, 20, 170, 62, '策略网络', '学出来的；每步 7 µs', 'hl') +
  S.box(210, 112, 170, 62, '姿态 PD', '低增益，帮训练稳定', 'dim') +
  `<circle cx="430" cy="97" r="15" class="sv-box"/>` + S.text(430, 103, '+', 'sv-t') +
  S.arrow(380, 51, 417, 88) + S.arrow(380, 143, 417, 106) +
  S.arrow(445, 97, 498, 97, { c: 'acc', label: '推力', side: 'above' }) +
  S.box(500, 64, 140, 66, '四个旋翼推力', 'T1…T4（N）', 'hl') +
  S.arrow(640, 97, 668, 97) +
  S.box(670, 64, 140, 66, '电机转速控制', 'AscTec 原厂', 'px') +
  S.path([[740, 130], [740, 200], [80, 200], [80, 128]], { dash: 1, label: '飞机的运动被重新测量', lx: 410, ly: 194 }),
  'Hwangbo 2017：神经网络直接从状态算出四个旋翼推力');
const resHw = hbar(820, [
  { l: '学出的策略：失败率', v: 4, c: 'acc', t: '4 %' },
  { l: '线性 MPC：失败率', v: 71, c: 'b', t: '71 %' },
], 100, { title: '仿真：100 次随机初始状态（姿态在 SO(3) 上均匀抽，其余量在 [−1, 1] 抽），触地算失败', aria: '失败率 4% 对 71%' });

/* ---------- 2. Loquercio 2021 ---------- */
const figLo = S.svg(820, 290,
  S.text(10, 18, '训练：全部在仿真里', 'sv-t', 'start') +
  S.box(10, 32, 200, 66, '特权专家（老师）', '知道完整点云地图和真实状态', 'px') +
  S.arrow(210, 56, 418, 56, { c: 'warn', label: '给 3 条好轨迹（标签）' }) +
  S.box(420, 32, 220, 66, '学生网络', '深度图 + 速度姿态 + 目标方向', 'hl') +
  S.path([[530, 98], [530, 118], [110, 118], [110, 100]], { c: 'acc', dash: 1, label: '学生自己飞，到过的状态再交给专家打标签（DAgger）', lx: 320, ly: 136 }) +
  S.text(10, 176, '部署：真机，全部机载', 'sv-t', 'start') +
  S.box(10, 190, 130, 66, '传感器', 'D435 深度 · T265 VIO') +
  S.arrow(140, 223, 168, 223) +
  S.box(170, 190, 140, 66, '学生网络', '24.7 Hz，TX2', 'hl') +
  S.arrow(310, 223, 348, 223, { label: '轨迹' }) +
  S.box(350, 190, 130, 66, 'PAMPC', '跟踪轨迹，100 Hz', 'b') +
  S.arrow(480, 223, 528, 223, { c: 'warn', label: 'CTBR' }) +
  S.box(530, 190, 140, 66, 'Betaflight', '角速度环 2 kHz', 'px') +
  S.arrow(670, 223, 698, 223) + S.box(700, 190, 110, 66, '电机', '× 4'),
  'Loquercio 2021：仿真里特权老师教学生，真机上学生输出轨迹，MPC 跟踪后发 CTBR');
const resLo = hbar(820, [
  { l: '3 m/s', v: 100, c: 'acc', t: '无坠机' },
  { l: '5 m/s', v: 100, c: 'acc', t: '无坠机' },
  { l: '7 m/s', v: 80, c: 'acc', t: '8 / 10' },
  { l: '10 m/s', v: 60, c: 'acc', t: '60 %' },
], 100, { lw: 90, title: '真机，自然环境（森林、雪山等，共 31 次）：成功率 = 到达目标 5 m 内且不撞', aria: '成功率随速度下降' });

/* ---------- 3. Swift 2023 ---------- */
const figSw = S.svg(820, 300,
  S.text(10, 18, '真机上（全部机载，无动捕）', 'sv-t', 'start') +
  S.box(10, 32, 130, 56, '相机 30 Hz', '') + S.arrow(140, 60, 168, 60) +
  S.box(170, 32, 140, 56, '门检测 CNN', 'TX2 上 40 ms') +
  S.box(10, 104, 130, 56, 'IMU + VIO', '100 Hz') +
  S.arrow(310, 60, 348, 84) + S.arrow(140, 132, 348, 108) +
  S.box(350, 66, 120, 60, '卡尔曼滤波', '融合位姿') +
  S.arrow(470, 96, 508, 96) +
  S.box(510, 62, 150, 68, '控制策略', 'MLP 2×128，100 Hz', 'hl') +
  S.arrow(660, 96, 698, 96, { c: 'warn', label: 'CTBR' }) +
  S.box(700, 62, 110, 68, 'Betaflight', 'PID → 电机', 'px') +
  S.text(10, 196, '训练（仿真里，PPO）', 'sv-t', 'start') +
  S.box(10, 210, 170, 64, '真机试飞约 50 s', '3 次完整飞行') +
  S.arrow(180, 242, 218, 242, { label: '拟合' }) +
  S.box(220, 206, 200, 72, '残差模型', '感知：高斯过程\n动力学：k 近邻（k = 5）', 'b') +
  S.arrow(420, 242, 458, 242, { label: '加进' }) +
  S.box(460, 210, 200, 64, '仿真器', '含 Betaflight 角速度环模型') +
  S.arrow(585, 208, 585, 132, { c: 'acc', label: 'PPO 训练 / 微调策略', side: 'right' }),
  'Swift：感知部分给出位姿，策略输出 CTBR；训练时用少量真机数据修正仿真');
const resSw = hbar(820, [
  { l: '对 A. Vanover', v: 5 / 9, c: 'acc', t: '赢 5 / 9' },
  { l: '对 T. Bitmatta', v: 4 / 7, c: 'acc', t: '赢 4 / 7' },
  { l: '对 M. Schaepper', v: 6 / 9, c: 'acc', t: '赢 6 / 9' },
], 1, { lw: 140, title: '与三位冠军级人类飞手的一对一比赛（合计赢 15 / 25）', aria: 'Swift 胜场' });

/* ---------- 4. Song 2023: toggle OC vs RL ---------- */
const songOC = S.svg(820, 170,
  S.box(10, 50, 100, 66, '赛道', '门的位置') + S.arrow(110, 83, 148, 83) +
  S.box(150, 40, 180, 86, '规划', '时间最优轨迹\n离线，要算数小时', 'px') +
  S.arrow(330, 83, 448, 83, { c: 'warn', label: '轨迹（中间表示）' }) +
  S.box(450, 40, 180, 86, 'MPC 跟踪', '目标：贴紧这条轨迹', 'b') +
  S.arrow(630, 83, 668, 83, { label: 'CTBR' }) + S.box(670, 50, 140, 66, '飞机', '') +
  S.text(410, 160, '模型不准时：轨迹本身用满了推力，偏一点就没有余量，跟不住就撞', 'sv-s bad'),
  '最优控制：先规划后跟踪');
const songRL = S.svg(820, 170,
  S.box(10, 50, 160, 66, '状态 + 后两个门', '的相对位置') + S.arrow(170, 83, 238, 83) +
  S.box(240, 40, 260, 86, '策略网络（PPO）', '目标：每一步朝门的进度\n训练时随机化推力系数和阻力', 'hl') +
  S.arrow(500, 83, 588, 83, { c: 'acc', label: 'CTBR' }) + S.box(590, 50, 140, 66, '飞机', '') +
  S.text(410, 160, '没有中间轨迹：策略可以自己决定离门边留多少余量', 'sv-s acc'),
  '强化学习：直接优化任务目标');
const resSong = hbar(820, [
  { l: '轨迹跟踪（名义模型）', v: 44, c: 'b', t: '44 %' },
  { l: '轨迹跟踪（真实感模型）', v: 0, c: 'bad', t: '0 %' },
  { l: '轮廓控制（名义模型）', v: 76, c: 'b', t: '76 %' },
  { l: '轮廓控制（真实感模型）', v: 20, c: 'b', t: '20 %' },
  { l: 'RL（名义模型）', v: 100, c: 'acc', t: '100 %' },
  { l: 'RL（真实感模型）', v: 100, c: 'acc', t: '100 %' },
], 100, { lw: 190, title: '仿真：50 个随机起点、40 ms 系统延迟，成功率', aria: 'Song 2023 成功率' });

/* ---------- 5. RAPTOR ---------- */
const figRa = S.svg(820, 230,
  S.box(10, 40, 140, 76, '随机抽 1000 架', '四旋翼（参数各不同）') +
  S.arrow(150, 78, 178, 78) +
  S.box(180, 40, 160, 76, '1000 个老师', 'SAC 强化学习\n每个只会飞自己那架', 'px') +
  S.arrow(340, 78, 418, 78, { c: 'warn', label: '动作标签' }) +
  S.box(420, 40, 180, 76, '一个学生', 'GRU，2084 个参数\n只看观测和自己的历史', 'hl') +
  S.arrow(600, 78, 668, 78, { c: 'acc', label: '4 路转速' }) +
  S.box(670, 40, 140, 76, '电机', '绕过 PX4 / Betaflight\n的角速度环', 'px') +
  S.path([[510, 116], [510, 160], [260, 160], [260, 118]], { c: 'acc', dash: 1, label: '学生自己飞（on-policy），老师给它到的状态打标签：元模仿学习', lx: 390, ly: 182 }) +
  S.text(510, 212, 'GRU 的隐状态从历史里“认出”这是哪架飞机：在线适应', 'sv-s acc'),
  'RAPTOR：1000 个专用老师蒸馏成一个自适应学生，直接输出电机转速');
/* walkthrough: numbers checked in tests_visual/RW2/rw3check.js */
const twrLine = (hl) => {
  const X = v => 80 + (v - 1) * 140; let b = '';
  b += `<line x1="${X(1)}" y1="90" x2="${X(5.5)}" y2="90" class="sv-l-soft"/>`;
  b += `<rect x="${X(1.5)}" y="78" width="${X(5) - X(1.5)}" height="24" rx="4" class="sv-fill-warnbg"/>`;
  [1, 2, 3, 4, 5].forEach(v => { b += `<line x1="${X(v)}" y1="86" x2="${X(v)}" y2="94" class="sv-l-soft"/>` + S.text(X(v), 116, v, 'sv-s'); });
  b += S.text(X(3.25), 70, '老师训练时的推重比：Uniform(1.5, 5)', 'sv-s warn');
  b += `<circle cx="${X(3.2)}" cy="90" r="6" class="sv-fill-b"/>` + S.text(X(3.2), 140, 'x500（论文表中约 3.2）', 'sv-s b');
  if (hl) '';
  return S.svg(820, 175, b, '推重比抽样范围');
};
const stepBox = (rows, title) => S.svg(820, 40 + rows.length * 34, S.text(10, 20, title, 'sv-t', 'start') + rows.map((r, i) => S.text(20, 52 + i * 34, r[0], 'sv-s', 'start') + S.text(800, 52 + i * 34, r[1], r[2] || 'sv-n', 'end')).join(''), title);
const resRa = hbar(820, [
  { l: '10 s 一圈（最高 1.05 m/s）', v: 0.11, c: 'acc', t: '0.11 m' },
  { l: '5.5 s 一圈（1.95 m/s）', v: 0.21, c: 'acc', t: '0.21 m' },
  { l: '4.5 s 一圈（2.48 m/s）', v: 0.27, c: 'acc', t: '0.27 m' },
], 0.3, { lw: 210, title: 'PX4 x500 真机，Lissajous 8 字，5 圈，位置 RMSE', aria: 'RAPTOR x500 RMSE' });

/* ---------- 6. DATT ---------- */
const figDa = S.svg(820, 230,
  S.box(10, 20, 170, 56, '未来 0.6 s 参考', '10 个位置点（机体系）', 'px') +
  S.arrow(180, 48, 218, 48) + S.box(220, 20, 130, 56, '前馈编码器', '学出来的', 'hl') +
  S.box(10, 92, 170, 56, '当前状态', 'OptiTrack 50 Hz') +
  S.box(10, 164, 170, 56, 'L1 扰动估计 d̂', '经典自适应，在线算', 'b') +
  S.arrow(350, 48, 418, 100) + S.arrow(180, 120, 418, 120) + S.arrow(180, 192, 418, 140, { c: 'b' }) +
  S.box(420, 86, 150, 70, '策略网络', 'PPO 训练', 'hl') +
  S.arrow(570, 121, 648, 121, { c: 'acc', label: 'CTBR 50 Hz' }) +
  S.box(650, 86, 160, 70, 'Crazyflie 机载', '角速度环 → 电机', 'px'),
  'DATT：参考前馈 + 状态反馈 + 经典扰动估计，三路一起喂给 RL 策略');
const resDa = hbar(820, [
  { l: '平滑轨迹：非线性跟踪', v: 0.098, c: 'b', t: '0.098 m' },
  { l: '平滑轨迹：L1-MPC', v: 0.088, c: 'b', t: '0.088 m' },
  { l: '平滑轨迹：DATT', v: 0.049, c: 'acc', t: '0.049 m' },
  { l: '不可行锯齿：非线性跟踪', v: null, t: '全部坠机' },
  { l: '不可行锯齿：L1-MPC', v: 0.181, c: 'b', t: '0.181 m' },
  { l: '不可行锯齿：DATT', v: 0.083, c: 'acc', t: '0.083 m' },
], 0.2, { lw: 200, title: '真机 Crazyflie，无外部扰动（表 1），平均位置误差', aria: 'DATT 表 1' });
const resDa2 = hbar(820, [
  { l: '平滑 + 板 + 风扇：L1-MPC', v: 0.181, c: 'b', t: '0.181 m' },
  { l: '平滑 + 板 + 风扇：DATT', v: 0.095, c: 'acc', t: '0.095 m' },
  { l: '锯齿 + 板 + 风扇：L1-MPC', v: 0.243, c: 'b', t: '0.243 m' },
  { l: '锯齿 + 板 + 风扇：DATT', v: 0.161, c: 'acc', t: '0.161 m' },
], 0.3, { lw: 200, title: '加挂软纸板 + 3 台风扇（风速未报告，表 2）', aria: 'DATT 表 2' });

el.innerHTML = `
<p class="lede">这一页精读六篇“用学习做飞控”的代表作，按时间排：从 2017 年第一个直接出旋翼推力的 RL 策略，到 2023 年打败人类冠军的 Swift，再到 2026 年号称“一个策略飞所有四旋翼”的 RAPTOR。每篇都看同样几件事：<b>它学了什么、接口在哪一层、在哪里飞、数字在什么条件下测的</b>。</p>
${K.fig(S.svg(820, 150,
  ['电机转速 / 推力', 'CTBR', '轨迹'].map((t, i) => S.box(20 + i * 270, 20, 240, 50, t, ['Hwangbo 2017 · RAPTOR', K.ours('', 'Swift · Song · DATT'), 'Loquercio 2021（再由 MPC 转成 CTBR）'][i], i === 1 ? 'hl' : '')).join('') +
  S.arrow(20, 100, 800, 100, { c: 'soft' }) + S.text(20, 124, '越靠左：网络管得越底层，越要自己保证姿态稳定', 'sv-s', 'start') + S.text(800, 124, '越靠右：越依赖下面的经典控制器', 'sv-s', 'end'),
  '六篇论文的网络输出在哪一层'), '先看“网络的输出接在哪一层”。CTBR（总推力 + 机体角速度）就是第 3 课里交给 PX4 角速度环的那一层' + K.ours('') + '。')}

<h2>1 · Hwangbo 等 2017：第一次让网络直接出旋翼推力</h2>
${one('不预先设计控制结构，用强化学习在仿真里训练一个网络，从状态直接算出四个旋翼的推力，再原样搬到真机上。')}
${setup([['飞机', 'AscTec Hummingbird 四旋翼，0.665 kg'], ['感知', 'Vicon 动捕 + 机载 IMU，多传感器融合'], ['控制接口', '网络输出 4 个旋翼推力（N），由原厂电机转速控制器执行；外加一个低增益姿态 PD'], ['计算', '机载 Intel Compute Stick；策略一次 7 µs（在 Xeon E5-1620 单核上测）'], ['训练', '作者自己提出的确定性同策略算法；约 10 分钟看起来已能飞，代价继续下降到约 25 分钟'], ['仿真 / 真机', '仿真训练，零调整上真机（航点跟踪、手抛恢复）']])}
${K.fig(figHw, '<b>方法</b>：网络输入“当前状态减航点”，所以训练时只学“飞回原点”，用时换航点就行，不需要轨迹。蓝绿色是学出来的部分。')}
${K.fig(resHw, '<b>关键结果</b>：仿真里随机姿态（包括倒扣）起飞，学出的策略只有 4% 触地，对比的线性 MPC 是 71%。真机上把飞机倒着、以约 5 m/s 抛出，策略能稳住。计算：7 µs 对线性 MPC 的约 1000 µs。')}
${lim(['真机实验只有图和视频，没有误差统计；1 m × 1 m 方形航点的误差作者自己说“比高增益经典控制器大”。', '训练里没有任何外部扰动；作者列出的仿真—真机差别：电机减速慢、近地面气动、电池电量与重量分布变化、无线延迟。', '71% 的 MPC 失败率是在“大范围随机初始状态”这种对线性 MPC 不利的条件下测的，不代表正常跟踪时谁更好。'])}
${rel(K.ours(''), '<a href="#l13">第 13 课 强化学习</a>、<a href="#l1">第 1 课 四旋翼物理</a>')}
${K.more('出处：Hwangbo 2017', '<p>J. Hwangbo, I. Sa, R. Siegwart, M. Hutter, “Control of a quadrotor with reinforcement learning,” IEEE RA-L 2(4):2096–2103, 2017；arXiv 1707.05110 v1。数字均读自 arXiv 全文：0.665 kg（表 I）；7 µs 与 1,000 µs（第 IV 节末）；4% 对 71%、100 次（第 IV-D 节）；10 / 25 分钟（第 IV-C 节）；5 m/s 倒扣抛出（摘要）；稳态误差 1.3 cm 为<b>仿真</b>值（结论）。</p>')}

<h2>2 · Loquercio 等 2021（Science Robotics）：特权老师 + DAgger</h2>
${one('在仿真里让一个“什么都知道”的专家教一个“只能看深度相机”的学生，学生学会在森林里高速避障，零样本上真机。')}
${setup([['飞机', '自制竞速机，890 g，推重比 4.4'], ['感知', 'RealSense T265 视觉惯性里程计（200 Hz）+ D435 深度相机；无动捕'], ['控制接口', '网络输出 3 条 1 s 轨迹 → PAMPC 100 Hz 输出 CTBR → Betaflight 2 kHz'], ['计算', '机载 Jetson TX2；网络 24.7 Hz'], ['训练', '仿真里模仿学习（DAgger 式），专家用 Metropolis–Hastings 采样算避障轨迹'], ['仿真 / 真机', '只在仿真训练，零样本上真机']])}
${K.fig(figLo, '<b>方法</b>：老师（橙）看得到完整地图，学生（蓝绿）只看得到真机上也有的东西。学生输出的是轨迹，不是 CTBR；CTBR 由经典的 MPC 算出。')}
${K.fig(resLo, '<b>关键结果</b>（真机）：3、5 m/s 没有坠机，7 m/s 成功 8/10，10 m/s 成功率 60%。仿真森林里，两个经典基线（建图 + 规划的 FastPlanner、运动基元的 Reactive）在 10 m/s 一次都没成功，本方法 60%。')}
${lim(['它学的是<b>避障规划</b>，飞控仍是经典 MPC；没有动力学随机化，没有风。', '作者自己列出高速时的失配来源：气动、电机延迟、电池电压下降。', '真机次数少（自然环境共 31 次），没有和经典方法在真机上同场比较（真机上只和一台商用无人机做过一个过窄门的定性对比）。'])}
${rel(K.ours(''), '<a href="#l12">第 12 课 模仿学习</a>（DAgger）、<a href="#l8">第 9 课 MPC</a>、<a href="#l16">第 16 课 仿真到真机</a>')}
${K.more('出处：Loquercio 2021', '<p>A. Loquercio, E. Kaufmann, R. Ranftl, M. Müller, V. Koltun, D. Scaramuzza, “Learning high-speed flight in the wild,” Science Robotics 6(59), eabg5810, 2021；读的是 arXiv 2110.05113 v1 接收稿。890 g、约 40 N、推重比 4.4、TX2、T265 200 Hz、24.7 Hz、100 Hz、2 kHz 见补充材料 S3；31 次、3/5 m/s 无坠机、7 m/s 8/10、10 m/s 60% 见 “Natural environments”；仿真森林 10 次随机森林、同一种子，结果见 “Forest”。</p>')}

<h2>3 · Kaufmann 等 2023（Nature）：Swift</h2>
${one('用深度强化学习训练的竞速无人机，只用机载传感器，在一对一比赛中赢了三位冠军级人类飞手。')}
${setup([['飞机', '870 g，最大静推力约 35 N，推重比 4.1（与人类飞手的飞机同重同动力）'], ['感知', '机载相机 + IMU：VIO 加门检测，卡尔曼滤波融合；比赛时无动捕'], ['控制接口', '<b>CTBR</b>（质量归一化总推力 + 机体角速度），交给 Betaflight 的 PID'], ['计算', 'Jetson TX2；策略为 2×128 的 MLP，示意图标注 100 Hz'], ['训练', 'PPO，1×10⁸ 次仿真交互约 50 分钟；不做动力学随机化，改用约 50 s 真机数据拟合残差后微调'], ['仿真 / 真机', '仿真训练 + 少量真机数据修正，真机比赛']])}
${K.fig(figSw, '<b>方法</b>：上排是真机上实际运行的部分；下排是训练时怎么让仿真更像真机——不是把参数随机化，而是用 3 次真机飞行测出“仿真哪里不对”（残差），加回仿真里再练。')}
${K.fig(resSw, '<b>关键结果</b>：25 场赢 15 场；最快一圈赛 17.465 s，比最快的人类（A. Vanover，17.956 s）快约 0.5 s。10 场输掉的原因：40% 撞对手，40% 撞门，20% 比人慢。')}
${lim(['任务是竞速：无风、赛道固定，人类飞手练了一周同一条赛道，Swift 的残差模型也是针对这条赛道拟合的。', '不训练撞后恢复；论文也指出 Swift 的感知更新率（30 Hz）低于人类飞手的相机（120 Hz），而反应延迟更低（40 ms 对人类平均 220 ms）。', '没有和经典控制器在同一任务上比较跟踪精度——它比较的对象是人。'])}
${rel(K.ours(''), '<a href="#l13">第 13 课</a>、<a href="#l16">第 16 课</a>、<a href="#l3">第 3 课 PX4 级联</a>')}
${K.more('出处：Kaufmann 2023（Swift）', '<p>E. Kaufmann, L. Bauersfeld, A. Loquercio, M. Müller, V. Koltun, D. Scaramuzza, “Champion-level drone racing using deep reinforcement learning,” Nature 620:982–987, 2023。读的是 Nature 全文 PDF。5/9、4/7、6/9 与 40/40/20% 见 Results；17.465 s 与 17.956 s 见图 4；870 g、35 N、4.1 见 Methods “Drone hardware configuration”；1×10⁸ 步 50 分钟、2×128 MLP 见 Methods “Policy training”；3 次约 50 s、k = 5 见 “Residual model identification”；40 ms / 220 ms 与 30 / 120 Hz 见 Discussion。策略 100 Hz 取自图 2 示意图的标注，正文未另写。</p>')}

<h2>4 · Song 等 2023（Science Robotics）：最优控制 vs 强化学习</h2>
${one('同一个竞速任务上，系统地比较最优控制（OC）和强化学习，并回答“RL 为什么赢”。')}
${setup([['飞机', '三种测试：名义模型（简单刚体）、真实感模型（叶素动量理论）、真机竞速机；“推到极限”实验用 0.52 kg、推重比 12 的自制机'], ['感知', '真机：Vicon + 扩展卡尔曼滤波'], ['控制接口', 'RL 输出质量归一化推力 + 机体角速度（CTBR），反馈频率 100 Hz'], ['计算', '工作站上训练（论文称几分钟；对人类比赛的策略约 10 分钟）'], ['训练', 'PPO，只用名义模型训练，随机化推力系数和阻力系数'], ['仿真 / 真机', '仿真对比 + 真机零样本']])}
<div id="songseg"></div><div id="songfig"></div>
${K.fig(resSong, '<b>关键结果</b>（仿真）：名义模型上，轨迹跟踪单圈最快（4.92 s），但成功率只有 44%；换成真实感模型，两种 OC 方法降到 0% 和 20%，RL 两种模型下都是 100%。')}
<div class="tblwrap"><table class="tbl">
<tr><th>真机</th><th>结果</th><th>注意</th></tr>
<tr><td>轨迹跟踪（满推力）</td><td>起飞后立刻坠机</td><td>原论文 Foehn 2021 降低推力上限后能飞，单圈 6.12 s</td></tr>
<tr><td>轮廓控制</td><td>Romero 等报告平均 5.8 s</td><td>需要专家在赛道上手调参数</td></tr>
<tr><td>RL</td><td>平均 5.35 s，零样本</td><td>—</td></tr>
<tr><td>RL 推到极限</td><td>5 次 × 3 圈，15 圈全部完成；最高 108 km/h、12.58 g</td><td>动捕定位</td></tr>
</table></div>
${lim(['真机上 OC 的 6.12 s、5.8 s 来自各自原论文，<b>不是同一天同一架飞机的配对实验</b>。', '“目标更好”的结论是在竞速（最快通过门）任务上得出的；跟踪精确参考轨迹的任务里，“跟紧轨迹”本身就是任务目标。', '无风、无载荷变化；靠动捕定位。'])}
${rel(K.ours(''), '<a href="#l8">第 9 课 MPC</a>、<a href="#l6">第 7 课 轨迹</a>、<a href="#l13">第 13 课</a>、<a href="#l10">第 11 课 公平比较</a>')}
${K.more('出处：Song 2023', '<p>Y. Song, A. Romero, M. Müller, V. Koltun, D. Scaramuzza, “Reaching the limit in autonomous racing: Optimal control versus reinforcement learning,” Science Robotics 8(82), eadg1462, 2023；读的是 arXiv 2310.10943 v2 接收稿全文' + K.ours('') + '。50 个起点、40 ms 延迟、4.92 / 5.03 / 5.14 s、44 / 76 / 100%、0 / 20 / 100% 见 “RL versus OC” 与图 2C；6.12 s、5.8 s、5.35 s 同节；0.52 kg、推重比 12、63 N、100 Hz、15 圈、108 km/h、12.58 g 见 “Pushing the limit”。' + K.ours('') + '</p>')}

<h2>5 · Eschmann 等 2026（Science Robotics）：RAPTOR</h2>
${one('一个只有 2084 个参数的循环网络，不重新训练就能飞 10 架差别很大的真实四旋翼（31.9 g 到约 2.4 kg），靠的是从飞行历史里在线“认出”自己在飞哪架。')}
${setup([['飞机', '10 架真机（含 PX4 x500，表中重量约 1.2–2.4 kg）+ 2 个仿真器'], ['感知', '室内动捕；户外速度来源论文未说明'], ['控制接口', '<b>4 路电机转速</b>：绕过 PX4 / Betaflight 的角速度环'], ['计算', '训练在一台笔记本（AMD Ryzen 9 7945HX，16 核）'], ['训练', '1000 个 SAC 老师 + 元模仿学习（DAgger 式在线标注）；训练里没有延迟随机化'], ['仿真 / 真机', '仿真训练，零样本上 10 架真机']])}
${K.fig(figRa, '<b>方法</b>：每个老师只会飞自己那一架（它“知道”那架的参数）；学生不知道参数，只能从最近的观测和自己发过的指令里推断。这和第 14 课的 RMA 是同一个思路。')}
<div id="rawalk"></div>
${K.fig(resRa, '<b>关键结果</b>：10 架真机上 10 s 一圈的 8 字，RMSE 0.07–0.19 m（平均 0.11 m）；5.5 s 一圈 0.17–0.29 m（平均 0.20 m）。上图是 x500 一架。户外有“约 7 m/s、阵风 10 m/s”的风，作者只写了“没有看到失稳迹象”。')}
${lim(['<b>没有在任何一架飞机上和经典 PX4 / MPC 控制器比较</b>；对比只有另一篇论文里专为 Crazyflie 训练的策略（5.5 s 8 字 0.17 m，RAPTOR 0.19 m）。', '户外风速怎么测的没写，风下也没有误差数字。', '作者自述：仿真到真机的主要困难不是动力学失配，而是固件里的延迟等实现细节；部分不用 EKF 的飞机出现 z 方向低频振荡，仿真里加 10–30 ms 速度延迟可以复现。训练里没有随机化延迟。', '训练只有刚体对称四旋翼，没有机械臂或移动的质心。'])}
${rel(K.ours(''), '<a href="#l14">第 14 课 学习型自适应</a>、<a href="#l12">第 12 课</a>、<a href="#l3">第 3 课</a>')}
${K.more('出处：RAPTOR', '<p>J. Eschmann, D. Albani, G. Loianno, “RAPTOR: A foundation policy for quadrotor control,” Science Robotics 11(114), eaec1481, 2026；读的是 arXiv 2509.11481 v2 全文（SR 终版未读）。2084 = 368 + 1648 + 68（补充式 S33–S37）；1000 个老师、每个 1 M 步 31 分钟、全部约 34 小时（Results “Pre-Training”）；1.9 h（“Meta-Imitation Learning”）；R² = 0.949、MSE 0.047（线性探针）；推重比 Uniform(1.5, 5)、质量 0.02–5 kg（式 S5–S7）；RMSE 与最高速度见图 5 表；7 m/s / 10 m/s 风见 “Outdoor Tests”；固件延迟与 10–30 ms 速度延迟复现 z 振荡见 Results 中仿真到真机的讨论。“约 3.2”是图 4 表中 x500 的推重比。</p>')}

<h2>6 · Huang 等 2023（CoRL）：DATT，学习型自适应跟踪</h2>
${one('把经典的 L1 自适应扰动估计 d̂ 当作 RL 策略的一个输入，再给策略看未来 0.6 s 的参考，让它既能跟“飞不出来”的轨迹，又能扛扰动。')}
${setup([['飞机', 'Crazyflie 2.1（换装 20 mm 电机），40 g，推重比略低于 2'], ['感知', 'OptiTrack 动捕 50 Hz'], ['控制接口', '<b>CTBR</b> 50 Hz，离板计算，经 2.4 GHz 无线发到机载自写的 PI 角速度环'], ['计算', '离板电脑；推理 3.17 ms（L1-MPC 13.10 ms）'], ['训练', 'PPO；训练扰动只是随机方向的力 + 布朗运动'], ['仿真 / 真机', '仿真训练，零样本上真机']])}
${K.fig(figDa, '<b>方法</b>：三路输入——蓝色的 d̂ 是经典 L1 自适应算出来的（第 8 课的扰动观测器思想），不是学的；学的是策略和前馈编码器。')}
${K.fig(resDa, '无扰动：平滑轨迹 0.049 m 对 L1-MPC 0.088 m；锯齿轨迹上非线性控制器和 L1 自适应全部坠机。')}${K.fig(resDa2, '挂板 + 风扇：DATT 仍最好。训练时只模拟了力扰动，没模拟板和力矩，算零样本泛化。')}
${lim(['风扇风速<b>没有报告</b>，“±”的含义也没定义。', '基线较弱：没有 INDI；作者承认“降低增益也许不坠机，但平滑轨迹会变差”——一套增益兼顾两类轨迹对经典方法不利。', '40 g 小飞机，离板计算，接口频率 50 Hz' + K.ours('') + '。'])}
${rel(K.ours(''), '<a href="#l7">第 8 课 抗干扰</a>、<a href="#l14">第 14 课</a>、<a href="#l13">第 13 课</a>')}
${K.more('出处：DATT', '<p>K. Huang, R. Rana, A. Spitzer, G. Shi, B. Boots, “DATT: Deep adaptive trajectory tracking for quadrotor control,” CoRL 2023, PMLR 229:326–340（卷页两份笔记不一致，投稿前再核）；读的是 arXiv 2310.09053 v3 全文。表 1：每个控制器在同一组 10 条随机多项式 + 10 条锯齿轨迹上各跑 2 次；0.098 / 0.091 / 0.104 / 0.088 / 0.049 m，锯齿 0.183 / 0.181 / 0.083 m，推理 3.17 / 13.10 ms。表 2：0.181 / 0.095 m、0.243 / 0.161 m。H = 0.6 s、10 个参考点、50 Hz 见第 3–4 节。</p>')}

<h2>六篇放在一起</h2>
<div class="tblwrap"><table class="tbl">
<tr><th>论文</th><th>平台</th><th>网络输出</th><th>仿真 / 真机</th><th>学了什么</th><th>最好的结果（条件）</th></tr>
<tr><td>Hwangbo 2017</td><td>Hummingbird 0.665 kg，动捕</td><td>4 个旋翼推力</td><td>仿真训练 → 真机</td><td>整个底层控制器</td><td>仿真随机初始失败 4%（线性 MPC 71%）</td></tr>
<tr><td>Loquercio 2021</td><td>890 g，VIO + 深度</td><td>轨迹（MPC 再转 CTBR）</td><td>仿真训练 → 真机</td><td>避障规划</td><td>真机 7 m/s 成功 8/10</td></tr>
<tr><td>Swift 2023</td><td>870 g，VIO + 门检测</td><td>CTBR → Betaflight</td><td>仿真 + 约 50 s 真机数据</td><td>竞速控制策略</td><td>对人类冠军 15/25 胜</td></tr>
<tr><td>Song 2023</td><td>竞速机，动捕</td><td>CTBR</td><td>仿真对比 + 真机</td><td>竞速控制策略</td><td>真实感模型下成功 100%（OC 0–20%）</td></tr>
<tr><td>RAPTOR 2026</td><td>10 架 31.9 g–约 2.4 kg</td><td>4 路电机转速</td><td>仿真训练 → 真机</td><td>跨机型自适应底层策略</td><td>x500 10 s 8 字 0.11 m（无经典基线）</td></tr>
<tr><td>DATT 2023</td><td>Crazyflie 40 g，动捕</td><td>CTBR 50 Hz</td><td>仿真训练 → 真机</td><td>带扰动估计输入的跟踪策略</td><td>平滑轨迹 0.049 m（L1-MPC 0.088 m）</td></tr>
</table></div>

<div class="key"><h3>这一页记住三件事</h3><ul>
<li><b>先看接口</b>：同样叫“学习型飞控”，有的出电机转速（Hwangbo、RAPTOR），有的出 CTBR（Swift、Song、DATT${K.ours('')}），有的只出轨迹（Loquercio）。接口不同的数字不能直接比。</li>
<li><b>两种训练范式</b>：特权老师 → 学生（Loquercio、RAPTOR）；直接 RL + 让仿真更像真机（Swift 用残差，Song 用随机化）。</li>
<li><b>共同的空缺</b>：多数论文没有在真机上和调好的经典飞控正面比较，也没有定量测过的风。${K.ours('')}</li>
</ul></div>

<h2>小测验</h2><div id="qrw3"></div>`;

/* Song toggle */
const sf = el.querySelector('#songfig');
const showSong = v => { sf.innerHTML = K.fig(v === 'oc' ? songOC : songRL, v === 'oc' ? '<b>最优控制</b>：任务先被翻译成一条轨迹，下层 MPC 的目标只是“贴紧它”。' : '<b>强化学习</b>：没有中间轨迹，奖励直接就是“往门里飞的进度”。论文的结论：RL 赢，不是因为它把目标优化得更好，而是因为<b>它优化的是更好的目标</b>。'); };
K.seg(el.querySelector('#songseg'), { label: '方法示意图', options: [['oc', '最优控制：规划 + 跟踪'], ['rl', '强化学习：直接优化任务']], value: 'oc', on: showSong });
showSong('oc');

/* RAPTOR walkthrough (numbers: 1000*31 min = 516.7 core-h, /16 cores = 32.3 h; 22*16+16 = 368; 16*16*3*2+16*3*2+16 = 1648; 16*4+4 = 68; total 2084) */
K.steps(el.querySelector('#rawalk'), { title: 'RAPTOR 的训练账本', steps: [
  { svg: twrLine(false), t: '<b>抽 1000 架飞机</b>：推重比在 1.5 到 5 之间均匀抽，质量在 0.02 到 5 kg 之间抽（按尺寸均匀，再立方成质量），还有电机延迟、推力曲线等。' },
  '',
  { svg: stepBox([['每个老师训练', '1 M 步，单核 31 分钟'], ['1000 个老师', '1000 × 31 = 31 000 分钟 ≈ 517 核·小时'], ['16 核笔记本并行', '517 ÷ 16 ≈ 32 小时（论文写“约 34 小时”）']], '第 1 阶段：1000 个 SAC 老师'), t: '<b>训练老师</b>：每个老师是普通的强化学习（SAC），因为它知道自己那架的参数，问题简单，单核半小时就收敛。' },
  { svg: stepBox([['输入层', '22 × 16 + 16 = 368'], ['GRU 层（隐状态 16 维）', '16·16·3·2 + 16·3·2 + 16 = 1648'], ['输出层（4 路转速）', '16 × 4 + 4 = 68'], ['合计', '2084 个参数']], '第 2 阶段：学生网络的大小'), t: '<b>蒸馏成一个学生</b>：学生自己飞，老师在旁边给“这一刻该发什么指令”，学生去模仿；1000 个老师全用上，训练 1.9 小时。整个网络只有 2084 个数。' },
  { svg: stepBox([['线性探针：从隐状态预测推重比', 'R² = 0.949'], ['x500 真机，10 s 一圈 8 字', 'RMSE 0.11 m'], ['与经典 PX4 / MPC 的对比', '论文中没有', 'sv-s bad']], '第 3 步：它真的“认出”了飞机吗'), t: '<b>检验</b>：用一条直线就能从 16 维隐状态里读出推重比（R² = 0.949），说明网络确实在做隐式的系统辨识。真机跟踪 x500 RMSE 0.11 m——但没有经典基线作参照，这个数是好是坏没法下结论。' },
].filter(x => x && !(K.PUBLIC && x.ours)) });

K.quiz(el.querySelector('#qrw3'), 'rw3', [
  { q: 'Song 2023 认为强化学习在竞速上胜过最优控制，根本原因是什么？', o: ['RL 的求解器更快、更精确', 'RL 直接优化任务目标（穿门进度），不受“先规划一条轨迹再跟踪”这种中间表示的限制', 'RL 用了更好的飞机', 'RL 用了动捕而 OC 没有'], a: 1,
    e: '论文原话的意思是：RL 的优势不是“把目标优化得更好”，而是“优化了一个更好的目标”。' + K.ours('', '注意这是竞速任务的结论；做“跟踪给定参考”这类任务时，要据此说清各方优化的目标是否对齐。') + '' },
  { q: 'Loquercio 2021 和 RAPTOR 都用“老师 → 学生”。老师比学生多知道什么？', o: ['什么也不多，只是网络更大', '老师能看到真机上拿不到的“特权信息”（完整地图 / 这架飞机的真实参数），学生只能看真实传感器和历史', '老师是人类飞手', '老师用的是真机数据'], a: 1,
    e: '老师因为有特权信息，问题变简单、好训练；学生必须从自己能拿到的观测（深度图，或飞行历史）里把这些信息推断出来。DAgger 式训练让学生自己飞，老师给它到过的状态打标签。' },
  '',
].filter(x => x && !(K.PUBLIC && x.ours)));
} });
