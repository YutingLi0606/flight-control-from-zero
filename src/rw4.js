K.add({ id: 'rw4', num: 'R4', title: '精读 4：空中操作与世界模型', sub: K.ours('', '带机械臂飞，和“先学模型再学控制”'), render(el) {
const S = Object.assign({}, K.S);
/* box with multi-line title AND multi-line subtitle ('\\n' splits lines) */
S.box = (x, y, w, h, t, s, cls) => {
  const tl = String(t).split('\n'), sl = s ? String(s).split('\n') : [], n = tl.length + sl.length, y0 = y + h / 2 - (n - 1) * 8 + 5;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="sv-box ${cls || ''}"/>` +
    tl.map((l, i) => `<text x="${x + w / 2}" y="${y0 + i * 17}" text-anchor="middle" class="sv-t">${l}</text>`).join('') +
    sl.map((l, i) => `<text x="${x + w / 2}" y="${y0 + (tl.length + i) * 17}" text-anchor="middle" class="sv-s">${l}</text>`).join('');
};

/* ---------- local helpers (page-only) ---------- */
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
const rel = (t, rev) => `<div class="idea"><h3>${K.ours('', '和课程的关系')}</h3><p>${t}</p><p><b>先复习：</b>${rev}</p></div>`;
const one = t => `<p><b>一句话：</b>${t}</p>`;
const stepBox = (rows, title) => S.svg(820, 40 + rows.length * 34, S.text(10, 20, title, 'sv-t', 'start') + rows.map((r, i) => S.text(20, 52 + i * 34, r[0], 'sv-s', 'start') + S.text(800, 52 + i * 34, r[1], r[2] || 'sv-n', 'end')).join(''), title);

/* ---------- overview toggle: decentralised vs centralised (Ruggiero 2018 taxonomy) ---------- */
const figDec = S.svg(820, 200,
  S.box(10, 20, 170, 66, '机械臂控制器', '只管关节', 'b') + S.arrow(180, 53, 288, 53, { label: '关节指令' }) + S.box(290, 20, 140, 66, '机械臂') +
  S.box(10, 120, 170, 66, '飞行控制器', '把臂当外部扰动', 'hl') + S.arrow(180, 153, 288, 153, { c: 'acc', label: '推力 / 角速度' }) + S.box(290, 120, 140, 66, '飞机') +
  S.arrow(360, 86, 360, 118, { c: 'bad', label: '重心偏移、反作用力', side: 'right' }) +
  S.text(610, 70, '两个控制器各管各的', 'sv-t') + S.text(610, 96, '飞控靠扰动估计 / 前馈去“抵消”臂的影响', 'sv-s') +
  S.text(610, 120, '例：SYSU delta 臂（下面第 3 篇）', 'sv-s acc'),
  '分散式：臂和飞机各自控制，臂的影响当扰动');
const figCen = S.svg(820, 200,
  S.box(10, 60, 230, 86, '整体控制器', '一个模型里同时有\n飞机 + 臂的动力学', 'hl') +
  S.arrow(240, 85, 318, 53, { c: 'acc', label: '关节指令' }) + S.arrow(240, 120, 318, 153, { c: 'acc', label: '推力 / 角速度', side: 'below' }) +
  S.box(320, 20, 140, 66, '机械臂') + S.box(320, 120, 140, 66, '飞机') +
  S.text(640, 70, '一个控制器统一算', 'sv-t') + S.text(640, 96, '经典做法：全身 MPC / QP（Lunni、Nava、AM-Bench）', 'sv-s') +
  S.text(640, 120, K.ours('', '学习型全身控制器也属这一类'), 'sv-s acc'),
  '集中式：飞机和臂放进同一个模型统一优化');

/* ---------- Lunni / Nava (abstract-level) ---------- */
const figLN = S.svg(820, 190,
  S.text(10, 18, 'Lunni 2017：NMPC', 'sv-t', 'start') +
  S.box(10, 30, 180, 60, '末端参考轨迹', '', 'px') + S.arrow(190, 60, 228, 60) +
  S.box(230, 26, 190, 68, 'NMPC（机载）', '八旋翼 + 3 自由度臂的模型', 'hl') + S.arrow(420, 60, 458, 60, { c: 'acc' }) +
  S.box(460, 30, 150, 60, '飞机 + 臂', '自由飞行，无接触') +
  S.text(10, 124, 'Nava 2020：QP', 'sv-t', 'start') +
  S.box(10, 136, 180, 50, '多个任务', '力-运动、能量、姿态', 'px') + S.arrow(190, 161, 228, 161) +
  S.box(230, 132, 190, 58, '每一步解一个 QP', '硬约束：接触、摩擦锥…', 'hl') + S.arrow(420, 161, 458, 161, { c: 'acc' }) +
  S.box(460, 136, 150, 50, '飞机 + 臂', '和环境接触') +
  S.text(700, 80, '都是“集中式”', 'sv-t') + S.text(700, 104, '模型 + 在线优化', 'sv-s'),
  'Lunni 2017 与 Nava 2020：用优化统一算飞机和臂');

/* ---------- SYSU delta arm ---------- */
const figSy = S.svg(820, 250,
  S.box(10, 20, 150, 62, '位置参考', '', 'px') + S.arrow(160, 51, 198, 51) +
  S.box(200, 16, 170, 70, '级联 PID + 平坦', '100 Hz', 'hl') +
  S.arrow(370, 51, 528, 51, { c: 'warn', label: 'CTBR（推力 + 角速度）' }) +
  S.box(530, 16, 140, 70, 'PX4', '角速度环 → 电机', 'px') + S.arrow(670, 51, 698, 51) + S.box(700, 16, 110, 70, '飞机 + 臂') +
  S.box(10, 130, 190, 70, 'NDOB 扰动观测器', 'IMU 加速度，50 Hz 滤波', 'b') +
  S.box(220, 130, 210, 70, '臂前馈', '末端加速度 × 载荷质量\n经高通滤波', 'b') +
  S.arrow(105, 130, 250, 88, { c: 'b', label: '低频外力' }) + S.arrow(325, 130, 300, 88, { c: 'b', label: '快速变化部分', side: 'right' }) +
  S.path([[755, 86], [755, 230], [105, 230], [105, 202]], { dash: 1, label: 'IMU、舵机反馈', lx: 430, ly: 224 }),
  'SYSU delta 臂：经典级联外环 + 两路补偿，输出 CTBR 给 PX4');
const resSy = hbar(820, [
  { l: '10 cm/s · 400 g：原版 PX4', v: 0.14, c: 'warn', t: '0.14 m' },
  { l: '10 cm/s · 400 g：只加 NDOB', v: 0.053, c: 'b', t: '0.053 m' },
  { l: '10 cm/s · 400 g：NDOB + 臂前馈', v: 0.029, c: 'acc', t: '0.029 m' },
  { l: '5 cm/s · 200 g：原版 PX4', v: 0.09, c: 'warn', t: '0.09 m' },
  { l: '5 cm/s · 200 g：NDOB + 臂前馈', v: 0.013, c: 'acc', t: '0.013 m' },
], 0.16, { lw: 230, title: '飞机悬停、臂端以给定速度移动载荷：基座位置 RMSE（每条件 3 次平均）', aria: 'SYSU 基座误差' });

/* ---------- AM-Bench ---------- */
const figAm = S.svg(820, 230,
  S.box(10, 20, 150, 70, '任务', '按按钮、推滑块等\n共 12 个', 'px') + S.arrow(160, 55, 178, 55) +
  S.box(180, 20, 140, 70, '策略层', '扩散策略等，20 Hz') + S.arrow(320, 55, 438, 55, { label: '末端或基座目标' }) +
  S.box(440, 14, 180, 82, '控制器（三选一）', '全身 MPC\nIK + 几何 PID · IK + L1', 'hl') +
  S.arrow(620, 55, 688, 55, { c: 'acc', label: '力 / 力矩' }) + S.box(690, 20, 120, 70, '4 种构型', 'Isaac Sim') +
  S.box(10, 140, 800, 70, '扰动：恒定风力 + 线性阻力 · 地效 · 近壁效应 · 旋翼饱和（一阶滞后 47.5 ms）', '指标：成功率、按臂展归一化的末端 / 基座误差、最大倾角、旋翼饱和率', 'b'),
  'AM-Bench：同一套任务、扰动和指标下比较不同控制器与构型');
const resAm = hbar(820, [
  { l: '按按钮：末端目标 + 全身 MPC', v: 100, c: 'acc', t: '成功 100%，饱和 1.41%' },
  { l: '按按钮：基座 + 臂分开 PID', v: 56.7, c: 'b', t: '成功 56.7%，饱和 16.59%' },
], 135, { lw: 230, title: '扩散策略按按钮任务（每任务 30 次）', aria: 'AM-Bench 成功率' });

/* ---------- world model: model-free vs world-model training ---------- */
const figMF = S.svg(820, 170,
  S.box(10, 50, 180, 70, '仿真器', '每一步都真算物理') + S.arrow(190, 70, 318, 70, { label: '大量试飞（Swift 1 亿步）' }) +
  S.box(320, 40, 180, 90, '策略', '', 'hl') + S.arrow(318, 110, 192, 110, { label: '动作', side: 'below' }) +
  S.arrow(500, 85, 598, 85, { c: 'acc', label: '只看到“得分”' }) + S.box(600, 50, 210, 70, '策略梯度（PPO）', '从得分估一个改进方向', 'b') +
  S.text(410, 160, '无模型：不知道“为什么得这个分”，靠大量样本平均出方向', 'sv-s'),
  '无模型强化学习');
const figWM = S.svg(820, 190,
  S.box(10, 20, 160, 66, '数据', '仿真或真机的转移') + S.arrow(170, 53, 228, 53, { label: '拟合' }) +
  S.box(230, 20, 190, 66, '世界模型（学出来的）', '预测下一步状态、奖励', 'hl') +
  S.arrow(420, 53, 478, 53, { c: 'acc', label: '想象' }) +
  S.box(480, 20, 170, 66, '想象出的短轨迹', 'H 步，不用真算物理', 'hl') +
  S.arrow(650, 53, 698, 53, { c: 'acc' }) + S.box(700, 20, 110, 66, '改进策略', '') +
  S.path([[755, 86], [755, 140], [90, 140], [90, 88]], { c: 'acc', dash: 1, label: '新策略去收集新数据，模型再更新', lx: 420, ly: 160 }) +
  S.text(410, 184, '可微的世界模型还能直接给出“动作怎么改、得分怎么变”的梯度（SuperMimic）', 'sv-s acc'),
  '世界模型：先学一个预测模型，再在模型里练策略');

/* ---------- DreamerV3 ---------- */
const resDr = S.svg(820, 150,
  [['Atari', '57 个任务', '2 亿步'], ['ProcGen', '16 个任务', '5000 万步'], ['DMLab', '30 个任务', '1 亿步'], ['Minecraft', '1 个任务', '1 亿步']].map((r, i) =>
    S.box(10 + i * 202, 20, 190, 80, r[0], r[1] + ' · ' + r[2], i === 3 ? 'hl' : '')).join('') +
  S.text(410, 132, '同一套超参数跑全部领域；Minecraft：第一个不用人类数据、不用课程，从零采到钻石', 'sv-s acc'),
  'DreamerV3 基准概览');

/* ---------- SuperMimic ---------- */
const figSM = S.svg(820, 230,
  S.box(10, 20, 180, 70, '① 收集数据', 'MuJoCo Warp 仿真\n50 Hz 控制步') + S.arrow(190, 55, 238, 55) +
  S.box(240, 20, 150, 70, '回放缓存', '旧数据被新数据替换') + S.arrow(390, 55, 438, 55) +
  S.box(440, 20, 180, 70, '② 拟合世界模型', '每次看 k = 8 步的窗口', 'hl') + S.arrow(620, 55, 668, 55, { c: 'acc', label: '冻结' }) +
  S.box(670, 20, 140, 70, '③ 想象 H = 32 步', '加回传感器噪声', 'hl') +
  S.arrow(740, 90, 740, 128, { c: 'acc' }) +
  S.box(540, 130, 270, 70, '沿时间反向传播（BPTT）', '解析梯度直接改策略；critic 估 32 步以后', 'hl') +
  S.path([[540, 165], [100, 165], [100, 92]], { c: 'acc', dash: 1, label: '新策略去收集新数据（三步在一个循环里同时进行）', lx: 320, ly: 186 }),
  'SuperMimic 训练循环');
const resSM = hbar(820, [
  { l: 'SONIC（128 块 L40 × 168 h）', v: 179, c: 'b', t: '179 段失败' },
  { l: 'SuperMimic（1 块 H100 × 3 h）', v: 25, c: 'acc', t: '25 段失败' },
  { l: 'SuperMimic（2 块 GPU × 9.8 h）', v: 0.5, c: 'acc', t: '0 段失败' },
], 200, { lw: 230, title: '129,514 段人体动作基准上跟踪失败的段数', aria: 'SuperMimic 失败数' });

el.innerHTML = `
<p class="lede">这一页分两半。前半是<b>空中操作</b>：飞机带着机械臂飞时，控制要多处理什么，别人怎么做、怎么评。后半是<b>世界模型</b>：先从数据学一个“会预测的模型”，再在模型里练控制器${K.ours('', `。`)}</p>

<h2>先分两类：分散式和集中式</h2>
<div id="amseg"></div><div id="amfig"></div>
${K.more('展开：这个分类从哪来', '<p>Ruggiero、Lippiello、Ollero 2018 年的综述（IEEE RA-L 3(3):1957–1964，全文已读）把空中操作的控制分成“集中式”（整体建模）和“分散式”（互相看成扰动），并指出：臂不能做力矩控制时分散式是合理选择；即使臂有冗余，欠驱动问题仍然存在。</p>')}

<h2>1、2 · Lunni 2017 与 Nava 2020：用优化统一算飞机和臂</h2>
${one('Lunni：机载 NMPC 同时算八旋翼和 3 自由度臂，让末端跟踪参考。Nava：每一步解一个带硬约束的二次规划（QP），同时满足力-运动、能量、姿态等多个任务。')}
${setup([['Lunni 2017', '共轴八旋翼 + 3 自由度臂；机载 NMPC 驱动末端；只做了自由飞行，没有接触（ICUAS 2017）'], ['Nava 2020', '多任务 QP：力-运动混合、能量、姿态；硬约束包括接触、摩擦锥、关节限位和转速上限（IEEE RA-L 2020）'], ['核实程度', '两篇都只读过摘要：没有可靠的平台质量、频率和误差数字，所以这里不引用任何数字']])}
${K.fig(figLN, '<b>方法</b>：两篇都是“集中式”：一个模型里同时有飞机和臂，在线解优化。区别是 NMPC 往前看一段时间，QP 只解当前这一步。')}
${lim(['只读过摘要，无法给出结果数字；Lunni 摘要只提到自由飞行。', '这类方法需要较准的整机模型和足够的机载算力。'])}
${rel(K.ours('', '这是“全身模型 + 在线优化”路线的早期代表；学习型全身控制器则是同一个“集中式”位置上的另一种实现。'), '<a href="#l9">第 10 课 机械臂</a>、<a href="#l8">第 9 课 MPC</a>')}
${K.more('出处：Lunni 2017、Nava 2020', '<p>D. Lunni et al., “Nonlinear model predictive control for aerial manipulation,” ICUAS 2017, pp. 87–93, DOI 10.1109/ICUAS.2017.7991347' + K.ours('', '（摘要）') + '。G. Nava, Q. Sablé, M. Tognon, D. Pucci, A. Franchi, “Direct force feedback control and online multi-task optimization for aerial manipulators,” IEEE RA-L 5(2):331–338, 2020, DOI 10.1109/LRA.2019.2958473' + K.ours('', '（摘要）') + '。</p>')}

<h2>3 · SYSU delta 臂（arXiv 2025）：${K.ours('', `输出 CTBR 给 PX4 的臂扰动补偿`)}</h2>
${one('飞机悬停时 delta 臂搬着载荷移动，臂的运动会推着机身晃；用扰动观测器 + 臂的加速度前馈去抵消，输出仍是发给 PX4 的推力 + 角速度。')}
${setup([['飞机', '整机 1382.2 g，delta 臂 103.4 g（占 7.5%）；载荷 200 / 400 g（400 g 约占系统 29%）'], ['感知', 'IMU 加速度；舵机反馈 100 Hz；位置来源论文没写'], ['控制接口', '级联 PID 100 Hz + 平坦 → <b>CTBR 发给 PX4</b>'], ['计算', '论文没写机载算力'], ['学了什么', '没有学习：全是经典的观测器 + 前馈'], ['仿真 / 真机', '真机']])}
${K.fig(figSy, '<b>方法</b>：两路补偿（蓝）。NDOB 从 IMU 估出低频外力；臂前馈用“末端加速度 × 载荷质量”预先算出臂马上要施加的力，高通滤波后只留快速变化的部分，避免和 NDOB 重复。')}
<div id="sywalk"></div>
${K.fig(resSy, '<b>关键结果</b>：在最难的 10 cm/s、400 g 条件下，基座 RMSE 从原版 PX4 的 0.14 m 降到 0.029 m。末端稳定实验（基座飞小圆）：PX4 0.019–0.048 m，本法 0.005–0.006 m。')}
${lim(['论文没有给增益、高通截止频率、代码，位置来源也没写，复现要自己整定并公开。', '论文内部有不一致：NDOB 一格的最大值小于 RMSE（不可能，应为笔误）；正文 “62.14%” 与图注 “80%” 对不上。', '风中 8 字只给了误差（基座 17 mm、末端 6 mm），<b>风速没量化</b>。', '每条件只有 3 次。'])}
${rel(K.ours('', '它的输出接口是 CTBR 发给原版 PX4（第 3 课讲的 offboard 外环），所以在别的 PX4 飞机上也容易复现和对比。换到别的飞机时，载荷可以同时按“占系统质量比例”和“占臂额定载荷比例”两种口径来定。'), '<a href="#l9">第 10 课</a>、<a href="#l7">第 8 课 抗干扰</a>、<a href="#l3">第 3 课</a>')}
${K.more('出处：SYSU delta 臂', '<p>H. Chen, B. Ye, X. Liang, W. Deng, X. Lyu, “NDOB-based control of a UAV with delta-arm considering manipulator dynamics,” arXiv 2501.06122（v2 2025-10-06，未见期刊）。' + K.ours('', '本页数字取自 arXiv HTML 版全文。') + '基座 RMSE/Max：5 cm/s·200 g PX4 0.09/0.12、NDOB 0.03/0.028、本法 0.013/0.029；5 cm/s·400 g 0.12/0.17、0.042/0.067、0.021/0.044；10 cm/s·400 g 0.14/0.23、0.053/0.11、0.029/0.057。' + K.ours('', '下面“一步一步看”里的百分比是本页自己算的。') + '</p>')}

<h2>4 · AM-Bench（arXiv 2026）：空中操作的统一考场</h2>
${one('在仿真里搭一套固定的任务、扰动和指标，让不同控制器、不同机型在同一条件下比；它不提出新控制器。')}
${setup([['飞机', '4 种构型，例如 UA-Quad：4.41 kg、4 自由度臂、臂展 0.378 m；每个旋翼最大 23 N'], ['感知', '仿真真值'], ['控制接口', '控制器输出<b>机体力 / 力矩</b>（不是 CTBR）+ 臂关节；策略 20 Hz'], ['计算', 'Isaac Sim（Pegasus）'], ['学了什么', '策略层用扩散策略等；控制器是全身 MPC、IK + 几何 PID、IK + L1'], ['仿真 / 真机', '仿真为主，另做了地效的仿真—真机对照']])}
${K.fig(figAm, '<b>方法</b>：基准的价值在下面那一行——扰动怎么加、指标怎么定义都写死了，谁来都按同一把尺子量。')}
${K.fig(resAm, '<b>关键结果</b>：同一个策略，用“末端目标 + 全身 MPC”成功 100%，“基座和臂分开用 PID”只有 56.7%，后者旋翼饱和的步数占比高得多。推滑块时欠驱动四旋翼的归一化末端误差 7.506×10⁻²，全驱动六旋翼 0.990×10⁻²（约 7.6 倍）。加入地效模型后，低空（参考高度 ≤ 0.7 m）末端 z 的仿真—真机 RMSE 从 1.91 cm 降到 0.99 cm。')}
${lim(['风力大小、控制器增益、物理步长都没给。', '控制器输出力 / 力矩，绕过了商用飞控的角速度环' + K.ours('', '，不是 CTBR 接口') + '。', 'CoRL 2026 接收的消息只见于 LinkedIn，未从一手来源确认。'])}
${rel(K.ours('', '它的<b>指标定义</b>（成功率、按臂展归一化的误差、最大倾角、旋翼饱和率）和<b>地效公式</b>可以直接拿来评测、核对自己的空中操作仿真；它的结论是“集中式（全身）比分开控制成功率高”。'), '<a href="#l10">第 11 课 公平比较</a>、<a href="#l9">第 10 课</a>')}
${K.more('出处：AM-Bench', '<p>Y. Wang, D. Lee, X. Guo, … S. Scherer, J. Geng, G. Shi, “AM-Bench: A modular simulation suite and benchmark for aerial manipulation policy learning,” arXiv 2609.00641（2026-09）。' + K.ours('', '数字取自 arXiv HTML 版全文。') + '地效模型 1−ρ(r_p/4z)²，ρ = 3.4，r_p = 0.152 m；旋翼一阶滞后 τ = 47.5 ms；每任务 30 次。“约 7.6 倍”= 7.506 / 0.990，本页自算' + K.ours('') + '。</p>')}

<h3>另外两篇顶刊空中操作（只列要点）</h3>
<div class="tblwrap"><table class="tbl">
<tr><th>论文</th><th>做了什么</th><th>关键数字（条件）</th>${K.ours('', `<th>意义</th>`)}</tr>
<tr><td>Sun 等 2025，Science Robotics</td><td>3–4 架 0.6 kg 四旋翼协同吊运 1.4 kg 载荷；集中式全身最优控制（10 Hz）+ 机载 300 Hz INDI，未用 PX4</td><td>Fast 8 字 0.197 m；风扇“约 5 m/s”（测量方式未说明）；经典基线只在仿真里跑</td><td>${K.ours('', `Science Robotics 上的空中操作控制论文：集中式最优控制`)}</td></tr>
<tr><td>Cao 等 2025，Nature（FlyingToolbox）</td><td>上下叠飞的两机交接工具；MLP 估计下洗力作前馈，纯真机数据训练</td><td>下洗最高 13.18 m/s（风速计 44 点实测）；工具箱机各次平均高度误差的中位数：0.7 cm，原版 PX4 12.3 cm</td><td>${K.ours('', `少数在顶刊上给出 PX4 基线数字的论文：学习型前馈在真机上胜过原版 PX4`)}</td></tr>
</table></div>
${K.more('出处：Sun 2025、Cao 2025', '<p>S. Sun et al., Science Robotics 10(107), eadu8015, 2025（读 arXiv 2501.18802 v2' + K.ours('') + '）。H. Cao et al., Nature 646:576–583, 2025（读 TU Delft OA 终版' + K.ours('') + '）：13.18 m/s、44 个风速点、0.7 / 12.3 / 3.2 cm 已在原文核对。</p>')}

<h2>世界模型：先学会预测，再学控制</h2>
<div id="wmseg"></div><div id="wmfig"></div>

<h2>5 · Hafner 等 2025（Nature）：DreamerV3</h2>
${one('一套固定超参数的世界模型强化学习算法，在 150 多个任务上超过专门调过的方法，并第一次从零在 Minecraft 里采到钻石。')}
${setup([['平台', '游戏和仿真控制任务；<b>论文没有真机实验</b>'], ['世界模型', 'RSSM：编码器把观测压成表示，循环网络按动作往前预测'], ['控制接口', '各任务自己的动作空间'], ['计算', '每个智能体一块 A100 GPU'], ['学了什么', '世界模型 + 在想象里训练的 actor-critic（想象 T = 16 步，折扣 0.997）'], ['仿真 / 真机', '只在仿真 / 游戏']])}
${K.fig(resDr, '<b>关键结果</b>：重点不是某一个分数，而是“同一套设置到处都能用”。归一化、平衡、symlog 变换等技巧让不同量级的奖励和观测都能稳定学习。')}
${lim(['没有真机；没有飞行器。', '世界模型是“像素 / 观测 → 隐表示”的通用模型，没有利用物理结构。'])}
${rel('DreamerV3 证明了“学一个模型、在想象里练策略”可以通用而稳定。它在无人机上的应用：<b>Dream to Fly</b>（Romero 等，ICRA 2026）用 DreamerV3 从像素学竞速飞行，输出 CTBR，在“真机 + 渲染图像”的硬件在环设置下飞到 9 m/s——那是视觉导航，不是抗扰动跟踪。', '<a href="#l15">第 15 课 世界模型</a>、<a href="#l13">第 13 课</a>')}
${K.more('出处：DreamerV3、Dream to Fly', '<p>D. Hafner, J. Pasukonis, J. Ba, T. Lillicrap, “Mastering diverse control tasks through world models,” Nature 640:647–653, 2025；读的是 arXiv 2301.04104 v2 全文。150+ 任务、Minecraft 钻石（摘要）；任务数与步数（图 1a）；T = 16、γ = 0.997（“Actor critic learning”）；单块 A100（表 2）。A. Romero, A. Shenai, I. Geles, E. Aljalbout, D. Scaramuzza, “Dream to fly,” arXiv 2501.14377 v2（ICRA 2026 接收）；CTBR、硬件在环、9 m/s 取自全文摘要与第 III 节。</p>')}

<h3>TD-MPC2（只列思路）</h3>
<p>思路：学一个隐空间里的模型和价值函数，飞行时用模型往前规划几步、用价值函数估更远的部分——相当于“学出来的 MPC”。${K.ours('', `这里只列思路，不引数字。`)}</p>

<h2>6 · Liao 等 2026（arXiv，CoRL 2026 oral）：SuperMimic</h2>
${one('用一个可微的世界模型拟合仿真器数据，策略通过这个模型直接反传梯度来学；人形机器人全身动作跟踪的训练算力因此降了三个数量级以上。')}
${setup([['平台', 'Unitree G1 人形机器人（真机迁移）；<b>没有用在无人机上</b>'], ['数据来源', 'MuJoCo Warp（GPU 版 MuJoCo）的转移数据'], ['控制接口', '关节层，50 Hz 控制步'], ['计算', '1 块 H100 约 3 小时'], ['学了什么', '可微世界模型 + 跟踪策略 + critic，一个循环里同时训练'], ['仿真 / 真机', '仿真训练，迁移到真机 G1']])}
${K.fig(figSM, '<b>方法</b>：和 DreamerV3 的区别在第 ③ 步——不是靠“得分高低”估方向，而是把奖励对动作的<b>解析梯度</b>沿 32 步想象轨迹反传回策略。模型只要在 32 步内准就行，32 步以后由 critic 估。')}
<div id="smwalk"></div>
${K.fig(resSM, '<b>关键结果</b>：1 块 GPU 训练 3 小时，回报超过 SONIC（128 块 GPU 训练 7 天）；129,514 段动作里失败 25 段（SONIC 179 段）；2 块 GPU 9.8 小时后 0 失败。')}
${lim([K.ours('', '只在人形上验证；换到别的平台（例如无人机），世界模型能否学好气动和延迟还不知道') + '。', '比较对象 SONIC 用的是公开权重，GPU 型号不同（L40 对 H100）。', '预印本，期刊未发表。'])}
${rel(K.ours('', '它说明“可微世界模型 + 解析梯度”能大幅降低全身控制的训练算力。这种做法能否用到四旋翼这类气动和延迟更重要的系统上，论文没有回答。'), K.ours('', '<a href="#l15">第 15 课</a>'))}
${K.more('出处：SuperMimic', '<p>Q. Liao, Y. Shao, J. Long, K. Zakka, R. Horowitz, P. Abbeel, K. Sreenath, “SuperMimic: Scaling humanoid whole-body control with one differentiable world model,” arXiv 2610.28480（读 v3 全文，2026-11-19）。1 H100 × 3 h 与 128 L40 × 168 h（图 1）；约 21,000 GPU·h（引言）；>1000×、25 / 179、9.8 h 两块 GPU 0 失败（摘要）；H = 32、k = 8（第 3.2–3.3 节）；MuJoCo Warp、50 Hz、10× / 62× 与约 64× 想象步（图 5 及正文）。</p>')}

${K.ours('')}<h2>本页论文放在一起</h2>
<div class="tblwrap"><table class="tbl">
<tr><th>论文</th><th>平台</th><th>接口</th><th>仿真 / 真机</th><th>学了什么</th><th>最好的结果（条件）</th></tr>
<tr><td>Lunni 2017</td><td>共轴八旋翼 + 3 自由度臂</td><td>NMPC（摘要未给）</td><td>摘要：机载运行，仅自由飞行</td><td>无</td><td>摘要无数字</td></tr>
<tr><td>Nava 2020</td><td>空中机械臂</td><td>QP 多任务</td><td>摘要未明确</td><td>无</td><td>摘要无数字</td></tr>
<tr><td>SYSU delta 臂</td><td>1382.2 g 四旋翼 + delta 臂</td><td>CTBR → PX4</td><td>真机</td><td>无（观测器 + 前馈）</td><td>基座 0.029 m（PX4 0.14 m，10 cm/s·400 g）</td></tr>
<tr><td>AM-Bench</td><td>4 种构型，如 4.41 kg UA-Quad</td><td>力 / 力矩</td><td>仿真</td><td>策略层（扩散策略等）</td><td>全身 MPC 按按钮成功 100%（分开 PID 56.7%）</td></tr>
<tr><td>DreamerV3</td><td>游戏 / 仿真任务</td><td>各任务动作</td><td>仅仿真</td><td>世界模型 + actor-critic</td><td>150+ 任务一套超参数</td></tr>
<tr><td>SuperMimic</td><td>Unitree G1 人形</td><td>关节，50 Hz</td><td>仿真训练 → 真机</td><td>可微世界模型 + 跟踪策略</td><td>失败 25 / 129,514（SONIC 179），1 GPU 3 h</td></tr>
</table></div>

<div class="key"><h3>这一页记住三件事</h3><ul>
<li><b>空中操作分两类</b>：分散式（把臂当扰动，如 SYSU）和集中式（整体建模，如 Lunni、Nava、AM-Bench 的全身 MPC）。${K.ours('')}</li>
<li><b>世界模型 = 先学会预测，再在预测里练</b>；SuperMimic 更进一步，用可微模型直接给策略梯度，算力省三个数量级——但只在人形上验证过。</li>
${K.ours('', `<li><b>评测要统一</b>：AM-Bench 这类基准把任务、扰动和指标写死，不同控制器才能按同一把尺子比较。</li>`)}
</ul></div>

<h2>小测验</h2><div id="qrw4"></div>`;

/* toggles */
const af = el.querySelector('#amfig');
const showAm = v => { af.innerHTML = K.fig(v === 'dec' ? figDec : figCen, v === 'dec' ? '<b>分散式</b>：飞控不知道臂在干什么，只看到“被推了一下”，靠扰动估计和前馈补偿。' : '<b>集中式</b>：控制器同时知道飞机和臂，可以提前协调——比如臂要往前伸，机身先往后让。'); };
K.seg(el.querySelector('#amseg'), { label: '控制结构', options: [['dec', '分散式'], ['cen', '集中式']], value: 'dec', on: showAm });
showAm('dec');
const wf = el.querySelector('#wmfig');
const showWm = v => { wf.innerHTML = K.fig(v === 'mf' ? figMF : figWM, v === 'mf' ? '<b>无模型</b>（第 13 课，Swift、Song、DATT 都是这一类）：每一点改进都要靠大量真实计算的试飞。' : '<b>世界模型</b>（第 15 课）：模型学好后，“试飞”在模型里做，又快又能求梯度。代价是模型不准时策略会钻模型的空子。'); };
K.seg(el.querySelector('#wmseg'), { label: '训练方式', options: [['mf', '无模型 RL'], ['wm', '世界模型']], value: 'mf', on: showWm });
showWm('mf');

/* SYSU walkthrough: (0.14-0.053)/0.14 = 62.1 %, (0.14-0.029)/0.14 = 79.3 %; 400/1382.2 = 28.9 %; 103.4/1382.2 = 7.5 % */
K.steps(el.querySelector('#sywalk'), { title: K.ours('', '把 SYSU 的数字换算成比例'), steps: [
  { svg: stepBox([['整机', '1382.2 g'], ['delta 臂', '103.4 g → 占 7.5 %'], ['最重载荷', '400 g → 400 ÷ 1382.2 = 28.9 %']], '第 1 步：载荷有多重'), t: '<b>先算比例</b>：400 g 载荷差不多是整机的 29%，这是一个很大的扰动。' },
  { svg: stepBox([['原版 PX4', '0.14 m', 'sv-nw'], ['只加 NDOB', '0.053 m → 降 (0.14 − 0.053) ÷ 0.14 = 62 %', 'sv-nb'], ['NDOB + 臂前馈', '0.029 m → 降 (0.14 − 0.029) ÷ 0.14 = 79 %']], '第 2 步：10 cm/s · 400 g，基座 RMSE'), t: '<b>再看改进比例</b>：只加扰动观测器就降 62%，再加臂前馈降 79%。' + K.ours('', '绝对的毫米数不能和别的飞机直接比，') + '但“相对原版 PX4 降了多少”可以对照。' },
  '',
].filter(Boolean) });

/* SuperMimic walkthrough: 128*168 = 21504 GPU-h; 1*3 = 3 GPU-h; 2*9.8 = 19.6 GPU-h */
K.steps(el.querySelector('#smwalk'), { title: 'SuperMimic 的算力账', steps: [
  { svg: stepBox([['SONIC', '128 块 GPU × 168 小时 = 21 504 GPU·小时', 'sv-nb'], ['SuperMimic', '1 块 GPU × 3 小时 = 3 GPU·小时']], '第 1 步：GPU·小时'), t: '<b>GPU·小时</b> = 块数 × 小时数。SONIC 约 2.15 万，SuperMimic 3。直接相除是约 7000 倍，但两边 GPU 型号不同，论文保守地写“超过 1000 倍”。' },
  { svg: stepBox([['零失败那一档', '2 块 GPU × 9.8 小时 = 19.6 GPU·小时'], ['仍比 SONIC 少', '21 504 ÷ 19.6 ≈ 1100 倍（型号不同，仅作量级参考）']], '第 2 步：训练更久到零失败'), t: '<b>想要零失败</b>：再多训一些，也只用了约 20 GPU·小时。' },
  { svg: stepBox([['想象比真算快', '常用批量（2k–16k 并行）下快 10 倍以上，64k 时 62 倍'], ['解析梯度比 PPO 省', '同一个世界模型上，达到 PPO 的最好回报少用约 64 倍想象步']], '第 3 步：省在哪（H100 上测）'), t: '<b>两处省</b>：世界模型推一步比 MuJoCo Warp 真算快得多；在同一个世界模型里，用解析梯度比用 PPO（“看得分猜方向”）少用约 64 倍的想象步数（行走 / 跑步类动作上测的）。' },
] });

K.quiz(el.querySelector('#qrw4'), 'rw4', [
  { q: 'SYSU delta 臂的方法属于哪一类？它的输出接到哪里？', o: ['集中式；输出电机转速', '分散式：把臂的影响当扰动，用观测器 + 前馈抵消；输出推力 + 角速度（CTBR）给 PX4', '集中式全身 MPC；输出力 / 力矩', '端到端学习；输出关节角'], a: 1,
    e: '飞控和臂各管各的，臂对机身的作用被当作扰动来估和补。' + K.ours('', '接口是 CTBR 发给原版 PX4。') + '' },
  { q: 'SuperMimic 和 DreamerV3 都用世界模型。SuperMimic 多做了哪件关键的事？', o: ['用了更大的网络', '世界模型是可微的，策略沿想象轨迹直接反传解析梯度（BPTT），而不是只从得分里估方向', '它在真机上训练', '它不需要仿真器'], a: 1,
    e: 'DreamerV3 在想象里做 actor-critic；SuperMimic 让奖励对动作的梯度穿过冻结的世界模型回到策略，32 步以后的部分由 critic 估。' + K.ours('') + '' },
  '',
].filter(Boolean));
} });
