// AptiPrep frontend: vanilla JS, talks to the Node backend (/api/*)
const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let token = localStorage.getItem('tok'), user = localStorage.getItem('usr'), timer, E, cur, st, ptopic, locked;
document.documentElement.dataset.theme = localStorage.getItem('theme') || 'dark';
const ICON = { 'Percentages': '📈', 'Profit & Loss': '💰', 'Ratio & Proportion': '⚖️', 'Time & Work': '⏱️', 'Speed & Distance': '🚗', 'Averages': '📊', 'Number Series': '🔢', 'Blood Relations': '👪', 'Coding-Decoding': '🔐', 'Simple Interest': '🏦', 'Mix': '🎲' };

async function api(p, b) {
  const r = await fetch('/api/' + p, { method: b ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: b ? JSON.stringify(b) : undefined });
  const d = await r.json();
  if (r.status === 401 && token) { out(); throw 'Session expired'; }
  if (!r.ok) throw d.error || 'Error';
  return d;
}
const theme = () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; localStorage.setItem('theme', t); };
function out() { const b = document.getElementById('bot'); if (b) b.remove(); chat = []; token = user = null; localStorage.removeItem('tok'); localStorage.removeItem('usr'); clearInterval(timer); authView(); }

// ---------- background particles + confetti ----------
(function () {
  const c = $('#bg'), x = c.getContext('2d'); let W, H; const P = [];
  const rs = () => { W = c.width = innerWidth; H = c.height = innerHeight; }; rs(); addEventListener('resize', rs);
  for (let i = 0; i < 70; i++) P.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, vx: (Math.random() - .5) * .5, vy: (Math.random() - .5) * .5 });
  (function a() {
    x.clearRect(0, 0, W, H);
    P.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1;
      x.fillStyle = 'rgba(160,170,255,.7)'; x.beginPath(); x.arc(p.x, p.y, 1.8, 0, 7); x.fill();
      for (let j = i + 1; j < P.length; j++) { const q = P[j], d = Math.hypot(p.x - q.x, p.y - q.y); if (d < 120) { x.strokeStyle = `rgba(140,150,255,${.25 * (1 - d / 120)})`; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(q.x, q.y); x.stroke(); } }
    });
    requestAnimationFrame(a);
  })();
})();
function boom() {
  const c = $('#fx'), x = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
  const P = Array.from({ length: 150 }, () => ({ x: innerWidth / 2, y: innerHeight / 3, vx: (Math.random() - .5) * 15, vy: Math.random() * -14 - 4, s: Math.random() * 8 + 5, c: `hsl(${Math.random() * 360},90%,60%)`, r: Math.random() * 6 })); let f = 0;
  (function a() {
    x.clearRect(0, 0, c.width, c.height);
    P.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .35; p.r += .2; x.fillStyle = p.c; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); });
    if (++f < 140) requestAnimationFrame(a); else x.clearRect(0, 0, c.width, c.height);
  })();
}

// ---------- login / register ----------
function authView(reg = false) {
  app.innerHTML = `<div class="center"><div class="glass login pop"><div class="logo">🧠 Apti<b>Prep</b></div><h1 id="ty"></h1>
  <div class="tabs"><button class="${reg ? '' : 'on'}" onclick="authView(false)">Login</button><button class="${reg ? 'on' : ''}" onclick="authView(true)">Register</button></div>
  <input id="u" placeholder="Username" autocomplete="username"><input id="p" type="password" placeholder="Password" autocomplete="current-password" onkeydown="if(event.key=='Enter')doAuth(${reg})">
  <div class="err" id="er"></div><button class="btn full" onclick="doAuth(${reg})">${reg ? 'Create account 🚀' : 'Login 🔓'}</button></div></div>`;
  const t = 'Crack aptitude. Ace every exam.'; let i = 0; const ty = $('#ty'); const iv = setInterval(() => { if (!ty) return clearInterval(iv); ty.firstChild ? ty.firstChild.nodeValue = t.slice(0, ++i) : ty.append(t.slice(0, ++i)); if (i >= t.length) clearInterval(iv); }, 45);
}
async function doAuth(reg) {
  try {
    const d = await api(reg ? 'register' : 'login', { username: $('#u').value, password: $('#p').value });
    token = d.token; user = d.user; localStorage.setItem('tok', token); localStorage.setItem('usr', user); dash();
  } catch (e) { $('#er').textContent = e; const c = $('.login'); c.classList.remove('shake', 'pop'); void c.offsetWidth; c.classList.add('shake'); }
}

// ---------- shell ----------
function shell(active, inner) {
  clearInterval(timer); bot();
  app.innerHTML = `<header class="glass top"><div class="logo">🧠 Apti<b>Prep</b></div><nav>${[['dash', '🏠 Dashboard'], ['prac', '🎯 Practice'], ['exam', '📝 Exam'], ['res', '📊 Results'], ['web', '🌐 Resources']].map(([k, l]) => `<button class="${k == active ? 'on' : ''}" onclick="go('${k}')">${l}</button>`).join('')}</nav>
  <div class="right">${window.deferredInstall ? '<button class="chip" style="cursor:pointer" onclick="installApp()">⬇ Install app</button>' : ''}<button class="ic" onclick="theme()" title="Theme">🌓</button><span class="chip">👤 ${esc(user)}</span><button class="ic" onclick="out()" title="Logout">⏻</button></div></header><main class="fade">${inner}</main>`;
  scrollTo(0, 0);
}
const go = k => ({ dash, prac: () => practice('Mix'), exam: startExam, res: hist, web })[k]();

// ---------- dashboard ----------
async function dash() {
  const [tp, h] = await Promise.all([api('topics'), api('history')]);
  const best = h.length ? Math.max(...h.map(r => r.pct)) : 0, avg = h.length ? Math.round(h.reduce((a, r) => a + r.pct, 0) / h.length) : 0;
  shell('dash', `<h2 class="t">Welcome back, ${esc(user)} 👋</h2><p class="sub">Pick a topic to practice. Questions change every time.</p>
  <div class="stats"><div class="glass stat"><b>${h.length}</b><span>Exams taken</span></div><div class="glass stat"><b>${best}%</b><span>Best score</span></div><div class="glass stat"><b>${avg}%</b><span>Average</span></div></div>
  <div class="grid">${['Mix', ...tp].map((t, i) => `<div class="glass tc" style="--d:${i * .06}s" onclick="practice('${t}')"><span class="em">${ICON[t] || '🧩'}</span><h3>${t === 'Mix' ? 'Random Mix' : t}</h3><p>${t === 'Mix' ? 'All topics shuffled' : 'Practice with explanations'}</p></div>`).join('')}</div>
  <div style="text-align:center;margin-top:30px"><button class="btn" onclick="startExam()">📝 Take a timed exam</button></div>`);
}

// ---------- practice (endless, random questions) ----------
async function practice(t = 'Mix') {
  ptopic = t; st = { s: 0, c: 0, n: 0 };
  const tp = await api('topics');
  shell('prac', `<h2 class="t">🎯 Practice</h2><div class="chips">${['Mix', ...tp].map(x => `<button class="${x == t ? 'on' : ''}" onclick="practice('${x}')">${x}</button>`).join('')}</div><div id="qa"></div>`);
  nextQ();
}
async function nextQ() {
  locked = false; const q = await api('question?topic=' + encodeURIComponent(ptopic)); cur = q;
  $('#qa').innerHTML = `<div class="glass qcard pop"><div class="meta"><span class="chip">${ICON[q.topic] || '🧩'} ${esc(q.topic)}</span><span class="chip">🔥 Streak ${st.s} · ✅ ${st.c}/${st.n}</span></div>
  <h2>${esc(q.q)}</h2><div class="opts">${q.opts.map((o, i) => `<button class="opt" style="--d:${i * .08}s" onclick="check(${i})"><i>${'ABCD'[i]}</i>${esc(o)}</button>`).join('')}</div><div id="fb"></div></div>`;
}
async function check(i) {
  if (locked) return; locked = true;
  const r = await api('check', { id: cur.id, choice: i }), b = document.querySelectorAll('.opt');
  b[r.answer].classList.add('ok'); if (!r.correct) b[i].classList.add('no');
  st.n++; if (r.correct) { st.c++; st.s++; if (st.s % 5 === 0) boom(); } else st.s = 0;
  $('#fb').innerHTML = `<div class="fb"><b>${r.correct ? '🎉 Correct!' : '❌ Not quite.'}</b><br>${esc(r.exp)}</div><div class="row"><span></span><button class="btn" onclick="nextQ()">Next question →</button></div>`;
}

// ---------- exam ----------
async function startExam() {
  const d = await api('exam/start'); E = { id: d.examId, qs: d.qs, a: {}, i: 0, end: Date.now() + d.seconds * 1000 };
  shell('exam', '<div id="ex"></div>'); drawE(); timer = setInterval(tick, 500);
}
function tick() {
  const el = $('#tm'); if (!el) return clearInterval(timer);
  const s = Math.max(0, Math.round((E.end - Date.now()) / 1000));
  el.textContent = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; el.classList.toggle('warn', s < 60);
  if (!s) { clearInterval(timer); submitE(); }
}
function drawE() {
  const q = E.qs[E.i], last = E.i === E.qs.length - 1;
  $('#ex').innerHTML = `<div class="glass qcard pop"><div class="meta"><span class="chip">Question ${E.i + 1} / ${E.qs.length}</span><span class="chip" id="tm"></span></div>
  <div class="bar" style="margin-top:14px"><b id="pb" style="width:${Object.keys(E.a).length / E.qs.length * 100}%"></b></div>
  <h2>${esc(q.q)}</h2><div class="opts">${q.opts.map((o, i) => `<button class="opt ${E.a[q.id] === i ? 'sel' : ''}" style="--d:${i * .06}s" onclick="pickE(${i})"><i>${'ABCD'[i]}</i>${esc(o)}</button>`).join('')}</div>
  <div class="pal">${E.qs.map((x, k) => `<button class="dot ${k == E.i ? 'cur' : ''} ${E.a[x.id] != null ? 'done' : ''}" onclick="E.i=${k};drawE()">${k + 1}</button>`).join('')}</div>
  <div class="row"><button class="btn ghost" ${E.i ? '' : 'disabled'} onclick="E.i--;drawE()">← Previous</button>${last ? '<button class="btn" onclick="submitE(true)">Submit exam ✅</button>' : '<button class="btn" onclick="E.i++;drawE()">Next →</button>'}</div></div>`;
  tick();
}
function pickE(i) {
  E.a[E.qs[E.i].id] = i; document.querySelectorAll('.opt').forEach((b, k) => b.classList.toggle('sel', k === i));
  document.querySelectorAll('.dot')[E.i].classList.add('done'); $('#pb').style.width = Object.keys(E.a).length / E.qs.length * 100 + '%';
}
async function submitE(ask) {
  const left = E.qs.length - Object.keys(E.a).length;
  if (ask && left && !confirm(left + ' question(s) unanswered. Submit anyway?')) return;
  clearInterval(timer); result(await api('exam/submit', { examId: E.id, answers: E.a }));
}
function result(d) {
  const msg = d.pct >= 80 ? '🏆 Outstanding!' : d.pct >= 60 ? '👏 Good job!' : d.pct >= 40 ? '💪 Keep practicing!' : '📚 Revise the topics below';
  shell('exam', `<div class="glass qcard pop" style="text-align:center"><h2>${msg}</h2>
  <div class="ring"><svg width="190" height="190" viewBox="0 0 120 120"><defs><linearGradient id="gr"><stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs><circle class="bgc" cx="60" cy="60" r="54"/><circle class="fg" id="fg" cx="60" cy="60" r="54"/></svg><b>${d.pct}%</b></div>
  <p class="sub">You scored ${d.score} out of ${d.total}</p>
  <div style="text-align:left">${Object.entries(d.byTopic).map(([t, v]) => `<div class="tb"><span>${t}</span><div class="bar"><b style="width:${v[0] / v[1] * 100}%"></b></div><span>${v[0]}/${v[1]}</span></div>`).join('')}</div>
  <div class="row" style="justify-content:center"><button class="btn" onclick="startExam()">Retake 🔁</button><button class="btn ghost" onclick="dash()">Dashboard</button></div></div>
  <h3>Review</h3>${d.review.map((r, i) => `<div class="glass rv"><b>Q${i + 1}. ${esc(r.q)}</b><div>${r.chosen === r.answer ? '✅' : '❌'} Your answer: ${r.chosen == null ? '—' : esc(r.opts[r.chosen])}</div><div class="ex"><b>Correct: ${esc(r.opts[r.answer])}</b> · ${esc(r.exp)}</div></div>`).join('')}`);
  setTimeout(() => $('#fg').style.strokeDashoffset = 339.3 * (1 - d.pct / 100), 100);
  if (d.pct >= 70) boom();
}

// ---------- results history ----------
async function hist() {
  const h = await api('history'), l = h.slice(-10);
  shell('res', `<h2 class="t">📊 My performance</h2>` + (h.length ? `<div class="glass qcard"><div class="chart">${l.map((r, i) => `<div><i style="height:${Math.max(r.pct, 4)}%;animation-delay:${i * .1}s"></i>${r.pct}%</div>`).join('')}</div><p class="sub">Last ${l.length} exams</p></div>
  ${h.slice().reverse().map(r => `<div class="glass rv"><b>${r.score}/${r.total} (${r.pct}%)</b> <span class="ex">${new Date(r.date).toLocaleString()}</span></div>`).join('')}` : '<p class="sub">No exams yet. Take your first one! 📝</p>'));
}

// ---------- resources ----------
const R = [['IndiaBIX', 'https://www.indiabix.com', 'Aptitude, reasoning, verbal with answers'], ['GeeksforGeeks', 'https://www.geeksforgeeks.org', 'Aptitude and placement prep'], ['PrepInsta', 'https://prepinsta.com', 'Company placement preparation'], ['Sanfoundry', 'https://www.sanfoundry.com', 'MCQ practice sets'], ['Smartkeeda', 'https://www.smartkeeda.com', 'Banking and SSC quizzes'], ['Testbook', 'https://testbook.com', 'Mock tests for govt exams'], ['Adda247', 'https://www.adda247.com', 'Banking, SSC, state exams'], ['Oliveboard', 'https://www.oliveboard.in', 'Online mock tests'], ['SSC', 'https://ssc.gov.in', 'Staff Selection Commission'], ['IBPS', 'https://www.ibps.in', 'Bank exams'], ['UPSC', 'https://upsc.gov.in', 'Civil services'], ['CAT', 'https://iimcat.ac.in', 'MBA entrance'], ['TCS NextStep', 'https://nextstep.tcs.com', 'TCS hiring / NQT']];
const gs = q => window.open('https://www.google.com/search?q=' + encodeURIComponent(q), '_blank', 'noopener');
function web() {
  shell('web', `<h2 class="t">🌐 Resources Hub</h2><div class="glass qcard"><b>Search Google (live results open in a new tab)</b><input id="gq" placeholder="e.g. SSC CGL percentage questions" onkeydown="if(event.key=='Enter')gs($('#gq').value)"><button class="btn full" onclick="gs($('#gq').value)">Search 🔍</button></div>
  <div class="grid" style="margin-top:18px">${R.map((r, i) => `<a class="glass link" style="--d:${i * .05}s" href="${r[1]}" target="_blank" rel="noopener noreferrer"><b>${r[0]} ↗</b><p>${r[2]}</p></a>`).join('')}</div>`);
}

// ---------- AptiBot chat widget ----------
let chat = [];
function bot() {
  if ($('#bot')) return;
  const d = document.createElement('div'); d.id = 'bot';
  d.innerHTML = `<div class="glass bp" id="bp" hidden><div class="bh"><b>🤖 AptiBot</b><button class="ic" onclick="botToggle()">✕</button></div><div class="bm" id="bm"></div>
  <div class="bq">${['Percentage formula', 'Speed formula', 'How does the exam work?', 'Time and work formula'].map(q => `<button onclick="botSend('${q}')">${q}</button>`).join('')}</div>
  <div class="bi"><input id="bin" placeholder="Ask about formulas or the website…" onkeydown="if(event.key=='Enter')botSend()"><button class="btn" onclick="botSend()">➤</button></div></div><button class="bfab" onclick="botToggle()" title="Ask AptiBot">🤖</button>`;
  document.body.append(d);
  botAdd('bot', 'Hi! I am AptiBot 👋 Ask me formulas, quick calculations like "20% of 250", or how to use this website.');
}
function botAdd(role, text) {
  const m = $('#bm'), el = document.createElement('div'); el.className = role; el.innerHTML = esc(text).replace(/\n/g, '<br>');
  m.append(el); m.scrollTop = m.scrollHeight; return el;
}
function botToggle() { const p = $('#bp'); p.hidden = !p.hidden; if (!p.hidden) $('#bin').focus(); }
async function botSend(t) {
  const inp = $('#bin'), text = (t || inp.value).trim(); if (!text) return; inp.value = '';
  botAdd('user', text); const typing = botAdd('bot', '…'); const hist = chat.slice(-6);
  chat.push({ role: 'user', content: text });
  try { const r = await api('agent', { message: text, history: hist }); typing.innerHTML = esc(r.reply).replace(/\n/g, '<br>'); chat.push({ role: 'assistant', content: r.reply }); }
  catch (e) { typing.textContent = 'Sorry, something went wrong: ' + e; }
  $('#bm').scrollTop = $('#bm').scrollHeight;
}

user && token ? dash().catch(out) : authView();

// ---------- PWA: service worker + install button ----------
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.deferredInstall = e; if (token) { const r = document.querySelector('.right'); if (r && !r.querySelector('.chip[onclick]')) r.insertAdjacentHTML('afterbegin', '<button class="chip" style="cursor:pointer" onclick="installApp()">⬇ Install app</button>'); } });
async function installApp() { const e = window.deferredInstall; if (!e) return; e.prompt(); await e.userChoice; window.deferredInstall = null; document.querySelectorAll('.chip[onclick="installApp()"]').forEach(b => b.remove()); }
addEventListener('appinstalled', () => { window.deferredInstall = null; });
