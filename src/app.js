(function () {
  const nav = document.getElementById('nav'), main = document.getElementById('main');
  const home = { id: 'home', num: '', title: '课程首页', sub: '' };
  const all = [home].concat(K.lessons);
  const PARTS = [{ name: '第一部分 · 经典飞控', has: L => typeof L.num === 'number' && L.num <= 11 },
    { name: '第二部分 · 学习型飞控', has: L => typeof L.num === 'number' && L.num >= 12 },
    { name: '第三部分 · 相关工作', has: L => L.id === 'bridge' || /^rw/.test(L.id) }];
  const numbered = () => K.lessons.filter(L => typeof L.num === 'number');
  const partOf = L => PARTS.find(P => P.has(L));
  const firstOf = L => { const P = partOf(L); return P && K.lessons.find(x => P.has(x)) === L; };
  function renderNav(cur) {
    const items = K.lessons.map(L => { const P = partOf(L), sep = P && firstOf(L) ? `<li class="part" aria-hidden="true">${P.name}</li>` : ''; return sep + `<li><a href="#${L.id}" ${L.id === cur ? 'aria-current="page"' : ''}><span class="n">${L.num === '→' ? '→' : typeof L.num === 'number' ? String(L.num).padStart(2, '0') : L.num}</span><span class="t">${L.title}</span><span class="ck">${K.progress[L.id] ? '✓' : ''}</span></a></li>`; }).join('');
    nav.innerHTML = `<p class="brand">飞控从零学起</p><p class="brand-sub">经典飞控 + 学习型飞控，每课都能动手</p>
      <ol><li><a href="#home" ${cur === 'home' ? 'aria-current="page"' : ''}><span class="n">00</span><span class="t">课程首页</span><span class="ck"></span></a></li><li class="sep" aria-hidden="true"></li>${items}</ol>`;
  }
  function renderHome(el) {
    const done = numbered().filter(L => K.progress[L.id]).length, total = numbered().length;
    const cards = list => `<div class="cards">${list.map(L => `<a class="card ${K.progress[L.id] ? 'done' : ''}" href="#${L.id}"><span class="n">${L.num === '→' ? '导读' : typeof L.num === 'number' ? '第 ' + L.num + ' 课' : '精读 ' + L.num.slice(1)}${K.progress[L.id] ? ' · 已完成' : ''}</span><span class="t">${L.title}</span><span class="s">${L.sub}</span></a>`).join('')}</div>`;
    el.innerHTML = `
<p class="eyebrow">飞控入门 · 共 ${total} 课</p>
<h1>从“四旋翼为什么能飞”到读懂飞控论文</h1>
<p class="lede">这套课程从零讲起，不假设你学过控制理论。每课讲一个概念，配一个可以直接拖动参数的仿真实验，最后用几道小题确认理解。第一部分（第 1–11 课）讲经典飞控，${K.ours('', `第二部分（第 12–16 课）讲学习型飞控，第三部分逐篇精读相关论文。`)}</p>
<div class="idea"><h3>怎么学</h3><ol>
<li>先读文字，建立直觉。每个概念最多一个公式，每个符号都有中文解释。</li>
<li>做“动手”实验。按灰色说明里的步骤拖参数，亲眼看到现象，比读十遍公式有用。</li>
<li>答小测验。全部答对，这一课就会在左边打勾（进度只存在你这个浏览器里）。</li>
${K.ours('', `<li>卡住了就回到“和第 N 课的关系”里提到的前面几课复习。</li>`)}
</ol></div>
<p>已完成 <b>${done}</b> / ${total} 课。</p>
${PARTS.map(P => `<h2>${P.name}</h2>` + cards(K.lessons.filter(L => partOf(L) === P))).join('')}
<p class="small" style="color:var(--soft);font-size:14px">${K.ours('', `第一部分的仿真实验用一架示例飞机：质量约 2.74 kg，推重比约 1.95，悬停约用 51% 推力，接近 Holybro X500 V2 加一个小机械臂的量级。`)}第二部分的实验多用一维或二维的简化模型，专门用来展示一个现象。为了让现象清楚，所有实验都做了简化（只看侧面或单一方向、电机用一阶延迟、大多不计空气阻力、多数实验里控制器直接读真实状态），每个实验下面都写明了它具体简化了什么。数值只用来建立直觉，${K.ours('', `不代表真机的结果。`)}</p>`;
  }
  function go() {
    K.stopAll();
    let id = (location.hash || '#home').slice(1);
    if (!all.some(L => L.id === id)) id = 'home';
    renderNav(id);
    main.innerHTML = '';
    const wrap = document.createElement('article'); wrap.className = 'lesson'; main.appendChild(wrap);
    if (id === 'home') renderHome(wrap);
    else {
      const L = K.lessons.find(x => x.id === id), i = K.lessons.indexOf(L);
      const head = K.h(`<div style="display:flex;flex-direction:column;gap:10px"><p class="eyebrow">${L.num === '→' ? '第三部分 · 导读' : typeof L.num === 'number' ? '第 ' + L.num + ' 课 / 共 ' + numbered().length + ' 课' : '第三部分 · 相关工作精读 ' + L.num.slice(1)}</p><h1>${L.title}</h1></div>`);
      wrap.appendChild(head);
      const body = document.createElement('div'); body.style.cssText = 'display:flex;flex-direction:column;gap:18px'; wrap.appendChild(body);
      L.render(body);
      const prev = i > 0 ? K.lessons[i - 1] : home, next = K.lessons[i + 1];
      wrap.appendChild(K.h(`<div class="pager"><a href="#${prev.id}"><span class="d">上一页</span>${prev.title}</a>${next ? `<a href="#${next.id}" style="text-align:right;margin-left:auto"><span class="d">下一页</span>${next.title}</a>` : ''}</div>`));
    }
    window.scrollTo(0, 0);
  }
  K.onProgress = () => { const id = (location.hash || '#home').slice(1); renderNav(all.some(L => L.id === id) ? id : 'home'); };
  window.addEventListener('hashchange', go);
  go();
})();
