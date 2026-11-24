# 飞控从零学起 · Flight Control from Zero

一套从零讲起的交互式飞控课程（中文）：16 课 + 相关工作导读与 4 页逐篇精读。每课都有讲清机制的图、带具体数字的“一步一步看”、可以直接拖动参数的仿真实验和小测验。

An interactive, from-scratch course on multirotor flight control (in Chinese): 16 lessons plus a guide and four paper-by-paper deep dives into the related work. Every lesson has mechanism diagrams, a step-by-step worked example with concrete numbers, a live simulation you can drag parameters in, and a short quiz.

## 打开 / Open

- 在线 / Online: GitHub Pages（仓库 Settings → Pages → Deploy from a branch → `main` / root）
- 本地 / Locally: 下载 `index.html`，用浏览器直接打开即可，无需服务器、无需安装。Download `index.html` and open it in a browser — no server, no install.

## 内容 / Contents

| 部分 | 课 |
|---|---|
| 第一部分 · 经典飞控 | 1 四旋翼为什么能飞 · 2 反馈控制与 PID · 3 级联控制：PX4 怎么飞 · 4 状态估计 · 5 姿态表示 · 6 几何控制 SE(3) · 7 轨迹规划与微分平坦 · 8 抗干扰：积分、观测器、INDI、L1 · 9 模型预测控制 MPC · 10 带机械臂飞行 · 11 怎么公平比较控制器 |
| 第二部分 · 学习型飞控 | 12 神经网络控制器与模仿学习 · 13 强化学习 · 14 学习型自适应 · 15 世界模型 · 16 从仿真到真机 |
| 第三部分 · 相关工作 | 导读 · 精读 1 经典控制基线 · 精读 2 抗风与自适应 · 精读 3 学习型飞控 · 精读 4 空中操作与世界模型 |

仿真实验都做了简化（多为侧视二维或单方向模型），每个实验下方写明了具体简化了什么；数值用于建立直觉，不代表真机结果。论文数字均注明出处。
The simulations are deliberately simplified (mostly planar or 1-D); each lists its simplifications. Numbers build intuition and are not real-vehicle results. Paper numbers cite their sources.

## 构建 / Build

源码在 `src/`（`kit.js` 工具库、每课一个文件、`shell.html` 页面骨架、`app.js` 导航）。The page is assembled from `src/`:

```
python3 build.py      # -> index.html
```

纯 HTML + JavaScript，无第三方依赖（字体来自 Google Fonts，离线时自动用系统字体）。Plain HTML + JavaScript, no dependencies.

## 许可 / License

- 代码 Code: [MIT](LICENSE)
- 课程文字与图 Course text and figures: [CC BY 4.0](LICENSE-CONTENT)
