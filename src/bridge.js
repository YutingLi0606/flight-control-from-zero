K.add({ id: 'bridge', num: '→', title: '导读：从课程到论文', sub: '每篇论文先复习哪一课，按什么顺序精读', render(el) {
el.innerHTML = `
<p class="lede">两部分学完，你已经有了读飞控论文需要的主要基础概念。${K.ours('', `这一页把常被引用的飞控论文和课程一一对上，然后告诉你按什么顺序读后面四页精读。`)}</p>

<h2>经典方法：每篇论文对应哪一课</h2>
<div class="tblwrap"><table class="tbl">
<tr><th>论文 / 系统</th><th>一句话说清它做了什么</th><th>先复习</th></tr>
<tr><td>PX4 级联控制器</td><td>位置 → 速度 → 姿态 → 角速度，每层一个 P 或 PID</td><td><a href="#l3">第 3 课</a></td></tr>
<tr><td>Lee 2010，SE(3) 几何控制</td><td>先算想要的力向量，再把推力方向对准它，不依赖小角度近似</td><td><a href="#l5">第 6 课</a></td></tr>
<tr><td>Mellinger &amp; Kumar 2011，最小 snap</td><td>利用微分平坦，规划一条四阶导最小的位置曲线</td><td><a href="#l6">第 7 课</a></td></tr>
<tr><td>Faessler 2018，转子阻力</td><td>把螺旋桨在高速时产生的阻力写成模型，作为前馈补上</td><td><a href="#l6">第 7 课</a>、<a href="#l7">第 8 课</a></td></tr>
<tr><td>Smeur 2016；Tal &amp; Karaman 2021，INDI</td><td>根据“想要的加速度 − 测到的加速度”增量地修正指令，相当于实时估出外力并抵消</td><td><a href="#l7">第 8 课</a></td></tr>
<tr><td>L1 自适应、L1Quad、L1-NMPC</td><td>状态预测器 + 自适应律 + 低通滤波，快速估计未知力</td><td><a href="#l7">第 8 课</a>、<a href="#l8">第 9 课</a></td></tr>
<tr><td>Sun 2022，NMPC 与平坦控制对比</td><td>同一架飞机上比较 MPC 和几何 / 平坦控制，看谁在什么条件下更好</td><td><a href="#l5">第 6 课</a>、<a href="#l8">第 9 课</a>、<a href="#l10">第 11 课</a></td></tr>
<tr><td>Torrente 2021，GP-MPC</td><td>MPC 的模型不准，用高斯过程从数据里学出模型误差补上</td><td><a href="#l8">第 9 课</a></td></tr>
<tr><td>Foehn 2021，时间最优（SR）</td><td>在推力上限内规划穿过一串航点的最快轨迹；论文实验里比顶尖人类选手飞得快</td><td><a href="#l6">第 7 课</a></td></tr>
<tr><td>Neural-Fly 2022（SR）、Neural-Lander 等</td><td>扰动观测的思路，但用数据学出“风力和状态的关系”</td><td><a href="#l7">第 8 课</a></td></tr>
<tr><td>近地面、近天花板气动</td><td>贴近表面时推力会变，本质上是一种和位置有关的扰动</td><td><a href="#l7">第 8 课</a></td></tr>
<tr><td>空中操作：Lunni 2017、Nava 2020、AM-Bench 等</td><td>处理机械臂的重心偏移和反作用力，或把飞机和手臂放进同一个模型整体优化（如 MPC）</td><td><a href="#l9">第 10 课</a></td></tr>
<tr><td>各篇论文的实验设计</td><td>对手有没有调参、有没有配对、有没有区分分布内外</td><td><a href="#l10">第 11 课</a></td></tr>
</table></div>

<h2>学习型方法：每篇论文对应哪一课</h2>
<div class="tblwrap"><table class="tbl">
<tr><th>论文 / 系统</th><th>一句话说清它做了什么</th><th>先复习</th></tr>
<tr><td>Loquercio 2021（SR）、RAPTOR（SR 2026）</td><td>先训练能看到更多信息的“老师”，再用 DAgger 一类的方法把它教给只能看到真实传感器的“学生”</td><td><a href="#l12">第 12 课</a></td></tr>
<tr><td>PPO（Schulman 2017）、Swift（Nature 2023）、Song 2023（SR）</td><td>在仿真里靠奖励和大量试飞学控制策略；Song 2023 在竞速任务上比较了强化学习和最优控制，认为强化学习的优势主要来自直接优化任务目标，而不是先规划轨迹再跟踪</td><td><a href="#l13">第 13 课</a></td></tr>
<tr><td>Neural-Fly 2022（SR）、RMA 2021（RSS）</td><td>离线学“扰动和状态的关系”或“从历史认出环境”的模块，飞行时在线快速适应</td><td><a href="#l7">第 8 课</a>、<a href="#l14">第 14 课</a></td></tr>
<tr><td>Dreamer / DreamerV3、TD-MPC / TD-MPC2、SuperMimic</td><td>从数据学一个预测模型，在模型里规划或训练策略</td><td><a href="#l8">第 9 课</a>、<a href="#l15">第 15 课</a></td></tr>
<tr><td>领域随机化、执行器 / 残差模型（如 Swift）</td><td>缩小仿真和真机的差距，或让策略对差距不敏感</td><td><a href="#lest">第 4 课</a>、<a href="#l16">第 16 课</a></td></tr>${K.ours('')}
</table></div>

<h2>接下来：四页精读</h2>
<div class="tblwrap"><table class="tbl">
<tr><th>精读</th><th>内容</th><th>先复习</th></tr>
<tr><td><a href="#rw1">精读 1：经典控制基线</a></td><td>PX4 级联、SE(3)、平坦与转子阻力、INDI、NMPC 与平坦控制对比</td><td>第 3、6、7、8、9 课</td></tr>
<tr><td><a href="#rw2">精读 2：抗风与自适应</a></td><td>INDI、L1、Neural-Fly、GP-MPC、Neural-Lander</td><td>第 8、14 课</td></tr>
<tr><td><a href="#rw3">精读 3：学习型飞控</a></td><td>Hwangbo、Loquercio、Swift、Song、RAPTOR、DATT</td><td>第 12、13、16 课</td></tr>
<tr><td><a href="#rw4">精读 4：空中操作与世界模型</a></td><td>空中机械臂、AM-Bench、DreamerV3、SuperMimic</td><td>第 10、15 课</td></tr>
</table></div>
${K.ours('', `<p>每篇都讲：解决什么问题、平台和设置、方法示意图、关键结果（带出处）、局限、先复习哪一课。</p>
<h2>建议的阅读顺序</h2>
<ol>
<li><b>控制基础与经典方法</b>：先读精读 1，对照第一张表回到对应的课。</li>
<li><b>自适应与抗风</b>：精读 2，主要是第 8 课和第 14 课，重点看 Neural-Fly。</li>
<li><b>学习型飞控</b>：精读 3，对应第 12、13、16 课，重点看 Swift、Song、RAPTOR。</li>
<li><b>空中操作与世界模型</b>：最后读精读 4，对应第 10、15 课。</li>
</ol>
<p>每篇论文最好对照原文一起读：精读页里的数字都标了出处（表号、节号），可以回原文核对。</p>`)}`;
} });
