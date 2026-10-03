// AptiPrep backend: pure Node.js, no npm packages needed.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000, ROOT = __dirname;
const BANK = JSON.parse(fs.readFileSync(path.join(ROOT, 'questions.json'), 'utf8'));
const DBF = path.join(ROOT, 'data', 'db.json');
let db = { users: {}, results: [] };
try { db = JSON.parse(fs.readFileSync(DBF, 'utf8')); } catch (e) {}
const save = () => { fs.mkdirSync(path.dirname(DBF), { recursive: true }); fs.writeFileSync(DBF, JSON.stringify(db, null, 1)); };
const sessions = {}, cache = new Map(), exams = {};

// ---------- helpers ----------
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[rnd(0, a.length - 1)];
const shuf = a => a.map(x => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
const fmt = n => String(+n.toFixed(2));
const hash = (p, s) => crypto.scryptSync(p, s, 32).toString('hex');
const newSession = u => { const t = crypto.randomBytes(24).toString('hex'); sessions[t] = u; return t; };
const pub = q => ({ id: q.id, topic: q.topic, q: q.q, opts: q.opts });

// Build a question, shuffle options, remember the answer on the server
function mk(topic, q, opts, ans, exp) {
  const o = shuf(opts), id = crypto.randomBytes(6).toString('hex');
  const full = { id, topic, q, opts: o, a: o.indexOf(ans), exp };
  cache.set(id, full);
  if (cache.size > 8000) cache.delete(cache.keys().next().value);
  return full;
}
function choices(ans, step) {
  const s = new Set([ans]);
  while (s.size < 4) { const c = ans + (Math.random() < .5 ? 1 : -1) * step * rnd(1, 3); if (c > 0) s.add(+c.toFixed(2)); }
  return [...s].map(fmt);
}
const fromBank = b => mk(b.topic, b.q, b.opts, b.opts[b.ans], b.exp);

// ---------- endless random question generators ----------
const G = {
  'Percentages'() {
    const p = pick([5, 10, 15, 20, 25, 30, 40, 60]), n = rnd(2, 40) * 20, a = p * n / 100;
    return mk('Percentages', `What is ${p}% of ${n}?`, choices(a, Math.max(2, Math.round(a / 8))), fmt(a), `${n} × ${p}/100 = ${fmt(a)}.`);
  },
  'Profit & Loss'() {
    const cp = rnd(5, 50) * 20, p = pick([10, 20, 25, 30, 40]), sp = cp * (100 + p) / 100;
    return mk('Profit & Loss', `An article bought for $${cp} is sold at ${p}% profit. What is the selling price ($)?`, choices(sp, Math.round(cp / 10)), fmt(sp), `SP = ${cp} × (100+${p})/100 = ${fmt(sp)}.`);
  },
  'Speed & Distance'() {
    const s = pick([40, 45, 50, 60, 70, 80]), t = rnd(2, 6), d = s * t;
    return mk('Speed & Distance', `A vehicle covers ${d} km in ${t} hours. Average speed (km/h)?`, choices(s, 5), fmt(s), `Speed = distance ÷ time = ${d} ÷ ${t} = ${s}.`);
  },
  'Averages'() {
    const a = Array.from({ length: 4 }, () => rnd(10, 60)); let sum = a.reduce((x, y) => x + y, 0);
    const last = rnd(10, 60) + ((5 - ((sum + 0) % 5)) % 5); a.push(last); sum += last;
    const avg = sum / 5;
    return mk('Averages', `Find the average of ${a.join(', ')}.`, choices(avg, 2), fmt(avg), `Sum = ${sum}; ${sum} ÷ 5 = ${avg}.`);
  },
  'Time & Work'() {
    const [a, b] = pick([[10, 15], [12, 24], [20, 30], [6, 12], [15, 30], [30, 60]]), t = a * b / (a + b);
    return mk('Time & Work', `A can finish a job in ${a} days and B in ${b} days. Working together, how many days?`, choices(t, 2), fmt(t), `1/${a} + 1/${b} = ${a + b}/${a * b}, so ${fmt(t)} days.`);
  },
  'Number Series'() {
    if (Math.random() < .6) {
      const s = rnd(2, 20), d = rnd(2, 9), t = [0, 1, 2, 3, 4].map(i => s + i * d), n = s + 5 * d;
      return mk('Number Series', `${t.join(', ')}, ?`, choices(n, d), fmt(n), `Add ${d} each time, so next is ${n}.`);
    }
    const s = pick([2, 3]), r = pick([2, 3]), t = [0, 1, 2, 3].map(i => s * r ** i), n = s * r ** 4;
    return mk('Number Series', `${t.join(', ')}, ?`, choices(n, s * r), fmt(n), `Multiply by ${r} each time, so next is ${n}.`);
  },
  'Simple Interest'() {
    const P = rnd(2, 20) * 500, r = pick([4, 5, 6, 8, 10]), t = rnd(2, 5), si = P * r * t / 100;
    return mk('Simple Interest', `Find the simple interest on $${P} at ${r}% per year for ${t} years.`, choices(si, Math.round(si / 6)), fmt(si), `SI = P×R×T/100 = ${P}×${r}×${t}/100 = ${si}.`);
  },
  'Ratio & Proportion'() {
    const [a, b] = pick([[2, 3], [3, 5], [1, 4], [3, 7]]), k = rnd(2, 15), S = (a + b) * k, big = Math.max(a, b) * k;
    return mk('Ratio & Proportion', `Divide ${S} in the ratio ${a}:${b}. What is the larger part?`, choices(big, k), fmt(big), `${a + b} parts = ${S}, 1 part = ${k}, larger = ${Math.max(a, b)} × ${k} = ${big}.`);
  }
};
const TOPICS = [...new Set([...BANK.map(b => b.topic), ...Object.keys(G)])];

function question(topic) {
  if (!topic || topic === 'Mix') return Math.random() < .4 ? fromBank(pick(BANK)) : G[pick(Object.keys(G))]();
  const bank = BANK.filter(b => b.topic === topic), gen = G[topic];
  if (gen && (!bank.length || Math.random() < .65)) return gen();
  return fromBank(pick(bank));
}

// ---------- AptiBot (agent) ----------
// Works offline with the built-in knowledge base. If ANTHROPIC_API_KEY is set, Claude answers instead.
const KB = [
  [['percent', 'percentage', 'percentages', '%'], '📈 Percentages\n• x% of N = x × N / 100\n• % change = (change ÷ original) × 100\n• Two successive changes a% and b%: a + b + ab/100\n• +10% then −10% = −1% overall'],
  [['profit', 'loss', 'cost price', 'selling price', 'discount', 'cp', 'sp'], '💰 Profit & Loss\n• Profit = SP − CP, Loss = CP − SP\n• Profit % = Profit ÷ CP × 100\n• SP = CP × (100 + P%) / 100\n• SP = CP × (100 − L%) / 100\n• Discount % = Discount ÷ Marked Price × 100'],
  [['simple interest', 'si'], '🏦 Simple Interest\n• SI = P × R × T / 100\n• Amount = P + SI\n• R = SI × 100 / (P × T), T = SI × 100 / (P × R)'],
  [['compound', 'compound interest', 'ci'], '🏦 Compound Interest\n• A = P (1 + R/100)^n\n• CI = A − P\n• Half-yearly: rate ÷ 2 and time × 2\n• For 2 years, CI − SI = P (R/100)²'],
  [['speed', 'distance', 'train', 'velocity', 'km/h', 'relative'], '🚗 Speed, Distance, Time\n• Speed = Distance ÷ Time\n• km/h → m/s: × 5/18, m/s → km/h: × 18/5\n• Average speed (same distance) = 2xy / (x + y)\n• Relative speed: opposite directions add, same direction subtract\n• Train crossing a pole: Length ÷ Speed; crossing a platform: (L + P) ÷ Speed'],
  [['time and work', 'time work', 'pipe', 'pipes', 'cistern', 'efficiency', 'men'], '⏱️ Time & Work\n• 1 day work = 1 / days\n• A and B together = ab / (a + b) days\n• M1 × D1 / W1 = M2 × D2 / W2\n• Pipes: filling adds, emptying subtracts'],
  [['average', 'averages', 'mean'], '📊 Averages\n• Average = Sum ÷ Count\n• Sum = Average × Count\n• Adding x to n numbers: new avg = (old sum + x) / (n + 1)'],
  [['ratio', 'proportion', 'mixture', 'partnership', 'alligation'], '⚖️ Ratio & Proportion\n• Divide N in a:b → a/(a+b) × N and b/(a+b) × N\n• a:b and b:c → make b equal, then join\n• a:b = c:d → a × d = b × c\n• Alligation: cheaper : dearer = (d − m) : (m − c)'],
  [['series', 'sequence', 'pattern', 'ap', 'gp'], '🔢 Number Series\n• AP: nth term = a + (n − 1)d, Sum = n/2 × (2a + (n − 1)d)\n• GP: nth term = a × r^(n−1)\n• Tricks: check differences, squares, cubes, ×/+ alternating, primes'],
  [['age', 'ages'], '🎂 Problems on Ages\n• Let present age = x; past = x − n; future = x + n\n• Ratio a:b → ages are ak and bk\n• Sum/difference of ages stays: difference never changes with time'],
  [['blood', 'relation', 'relations', 'family', 'uncle', 'aunt'], '👪 Blood Relations\n• Draw a family tree, use + for male and − for female\n• Mother\'s brother = maternal uncle, father\'s sister = aunt\n• Uncle\'s/aunt\'s children = cousins\n• "Only daughter of my mother" = herself'],
  [['coding', 'decoding', 'code', 'coded'], '🔐 Coding-Decoding\n• Letter shift: +1 / −1 / +2 …\n• Position values: A=1 … Z=26\n• Opposite letter = 27 − position (A↔Z)\n• Check reverse order and word-to-number codes'],
  [['permutation', 'permutations', 'combination', 'combinations', 'probability'], '🎲 Permutations, Combinations, Probability\n• nPr = n! / (n − r)!, nCr = n! / (r! (n − r)!)\n• Probability = favourable ÷ total outcomes\n• P(A or B) = P(A) + P(B) − P(A and B)'],
  [['square', 'squares', 'cube', 'cubes', 'shortcut', 'shortcuts', 'trick', 'tricks'], '⚡ Shortcuts\n• (a+b)² = a² + 2ab + b², (a−b)² = a² − 2ab + b², a² − b² = (a+b)(a−b)\n• Square of a number ending in 5: n5² = n(n+1) followed by 25 (35² = 1225)\n• Multiply by 5: × 10 ÷ 2, Multiply by 25: × 100 ÷ 4'],
  [['login', 'register', 'signup', 'password', 'account', 'username', 'logout'], '🔐 Account\nUse the Register tab to create an account, then Login. Passwords are hashed on the server. Use the ⏻ button (top right) to logout.'],
  [['exam', 'exams', 'test', 'timer', 'submit', 'mock'], '📝 Exam\nClick Exam in the top menu: 15 mixed questions, 15 minutes. Use the numbered palette to jump between questions. It auto-submits when time ends. You get your score, topic-wise performance and a full review with explanations.'],
  [['practice', 'topic', 'topics', 'streak', 'next', 'questions', 'question'], '🎯 Practice\nPick a topic on the Dashboard or in Practice. Each Next question gives a new random question with explanation. Every 5 correct in a row gives a surprise 🎉.'],
  [['result', 'results', 'score', 'performance', 'history', 'chart'], '📊 Results\nThe Results tab shows a chart of your last 10 exams and your full history. The Dashboard shows exams taken, best score and average.'],
  [['resources', 'links', 'google', 'websites', 'website'], '🌐 Resources\nThe Resources tab has a Google search box (opens in a new tab) and links to popular aptitude and exam-prep sites.'],
  [['store', 'stored', 'database', 'data', 'saved', 'save'], '💾 Data\nUsers and exam results are saved in data/db.json on the server. Delete that file to reset everything.'],
  [['theme', 'dark', 'light', 'mode'], '🌓 Theme\nClick the 🌓 button in the top bar to switch dark and light mode.'],
  [['hi', 'hello', 'hey', 'help', 'hlo', 'namaste'], '👋 Hi! I\'m AptiBot. Ask me for formulas (percentages, profit & loss, interest, speed, time & work, averages, ratio, series, ages, blood relations, coding-decoding, probability), quick calculations like "20% of 250", or how to use this website.']
];
const norm = s => ' ' + String(s).toLowerCase().replace(/[^a-z0-9%\/ ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
function botKB(msg) {
  const raw = String(msg).trim(), m = raw.match(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/i);
  if (m) return `${m[1]}% of ${m[2]} = ${m[2]} × ${m[1]} / 100 = ${+(m[1] * m[2] / 100).toFixed(4)}`;
  if (raw.length < 60 && /^[\d\s+\-*\/().×÷^]+$/.test(raw) && /\d\s*[+\-*\/×÷^]/.test(raw)) {
    try { const v = Function('"use strict";return (' + raw.replace(/×/g, '*').replace(/÷/g, '/').replace(/\^/g, '**') + ')')(); if (Number.isFinite(v)) return `${raw} = ${+v.toFixed(6)}`; } catch (e) {}
  }
  const n = norm(raw); let best = null, bs = 0;
  for (const [ks, a] of KB) { let s = 0; for (const k of ks) if (n.includes(' ' + k + ' ')) s++; if (s > bs) { bs = s; best = a; } }
  return best || '🤖 I can help with aptitude formulas, quick calculations (like "20% of 250" or "45*12") and how to use this website. Try: "speed formula" or "how does the exam work?"';
}
const SYS = 'You are AptiBot, the assistant inside AptiPrep, an aptitude and reasoning practice website. Help with aptitude/reasoning formulas, step-by-step solutions and tips, and questions about the website. Website features: login/register, Dashboard with topics, Practice (endless random questions with explanations), timed Exam (15 questions, 15 minutes) with score and review, Results history, Resources tab with Google search and prep links, dark/light theme. Be concise (under 150 words). Reply in the language the user writes in. If a question is unrelated, politely steer back to aptitude or the website.';
async function botAI(message, history) {
  const key = process.env.ANTHROPIC_API_KEY; if (!key) return null;
  try {
    const msgs = (Array.isArray(history) ? history : []).slice(-6).filter(h => h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string').map(h => ({ role: h.role, content: h.content.slice(0, 1000) }));
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    msgs.push({ role: 'user', content: String(message).slice(0, 1000) });
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: process.env.AI_MODEL || 'claude-sonnet-5-5', max_tokens: 500, system: SYS, messages: msgs }), signal: AbortSignal.timeout(20000) });
    const d = await r.json(); return (d.content && d.content[0] && d.content[0].text) || null;
  } catch (e) { return null; }
}

// ---------- API ----------
const body = req => new Promise(r => { let d = ''; req.on('data', c => { d += c; if (d.length > 1e5) req.destroy(); }); req.on('end', () => { try { r(JSON.parse(d || '{}')); } catch (e) { r({}); } }); });

async function api(req, u, send) {
  const r = u.pathname.slice(5), m = req.method, b = m === 'POST' ? await body(req) : {};
  if (r === 'register' && m === 'POST') {
    const n = String(b.username || '').trim().toLowerCase(), p = String(b.password || '');
    if (!/^[a-z0-9_]{3,20}$/.test(n)) return send(400, { error: 'Username: 3-20 letters, numbers or _' });
    if (p.length < 4) return send(400, { error: 'Password needs at least 4 characters' });
    if (db.users[n]) return send(400, { error: 'Username already taken' });
    const salt = crypto.randomBytes(8).toString('hex'); db.users[n] = { salt, hash: hash(p, salt) }; save();
    return send(200, { token: newSession(n), user: n });
  }
  if (r === 'login' && m === 'POST') {
    const n = String(b.username || '').trim().toLowerCase(), x = db.users[n];
    if (!x || x.hash !== hash(String(b.password || ''), x.salt)) return send(400, { error: 'Wrong username or password' });
    return send(200, { token: newSession(n), user: n });
  }
  const user = sessions[(req.headers.authorization || '').slice(7)];
  if (!user) return send(401, { error: 'Please login' });
  if (r === 'topics') return send(200, TOPICS);
  if (r === 'question') return send(200, pub(question(u.searchParams.get('topic'))));
  if (r === 'check' && m === 'POST') {
    const q = cache.get(b.id); if (!q) return send(404, { error: 'Question expired' });
    return send(200, { correct: q.a === b.choice, answer: q.a, exp: q.exp });
  }
  if (r === 'exam/start') {
    const qs = [], seen = new Set();
    for (let i = 0, g = 0; qs.length < 15 && g < 200; g++) {
      const q = i % 2 === 0 ? fromBank(pick(BANK)) : G[pick(Object.keys(G))]();
      if (seen.has(q.q)) continue; seen.add(q.q); qs.push(q); i++;
    }
    const id = crypto.randomBytes(8).toString('hex'); exams[id] = { user, qs };
    return send(200, { examId: id, seconds: 900, qs: qs.map(pub) });
  }
  if (r === 'exam/submit' && m === 'POST') {
    const ex = exams[b.examId]; if (!ex || ex.user !== user) return send(404, { error: 'Exam not found' });
    delete exams[b.examId];
    let score = 0; const byTopic = {}, review = [];
    ex.qs.forEach(q => {
      const ch = (b.answers || {})[q.id], ok = ch === q.a; if (ok) score++;
      const t = byTopic[q.topic] = byTopic[q.topic] || [0, 0]; t[1]++; if (ok) t[0]++;
      review.push({ q: q.q, opts: q.opts, chosen: ch == null ? null : ch, answer: q.a, exp: q.exp, topic: q.topic });
    });
    const res = { user, date: new Date().toISOString(), score, total: ex.qs.length, pct: Math.round(score / ex.qs.length * 100), byTopic };
    db.results.push(res); save();
    return send(200, { ...res, review });
  }
  if (r === 'agent' && m === 'POST') {
    const msg = String(b.message || '').trim(); if (!msg) return send(400, { error: 'Type a message' });
    const ai = await botAI(msg, b.history);
    return send(200, ai ? { reply: ai, source: 'ai' } : { reply: botKB(msg), source: 'kb' });
  }
  if (r === 'history') return send(200, db.results.filter(x => x.user === user));
  send(404, { error: 'Not found' });
}

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon' };
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname.startsWith('/api/')) {
    const send = (c, o) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    try { await api(req, u, send); } catch (e) { console.error(e); send(500, { error: 'Server error' }); }
    return;
  }
  const pubDir = ROOT, f = path.join(pubDir, u.pathname === '/' ? 'index.html' : u.pathname);
  if (!f.startsWith(pubDir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log(`AptiPrep running → http://localhost:${PORT}`));
