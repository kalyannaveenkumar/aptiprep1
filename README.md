# AptiPrep – Aptitude & Reasoning Platform

Full-stack project: Node.js backend (no npm packages) + HTML/CSS/JavaScript frontend.

## Run on your laptop
1. Install Node.js (LTS) from https://nodejs.org
2. Open a terminal in this folder and run:  `node server.js`
3. Open http://localhost:3000 in your browser. Register, then login.

## Features
- Register / login (passwords hashed with scrypt, token sessions)
- Practice: endless random questions (27 hand-written + auto-generated with random numbers), instant answer + explanation, streak counter
- Timed exam (15 questions, 15 minutes), question palette, score ring, topic-wise performance, full review
- Results history chart, dark/light theme, animated background, confetti
- Resources hub with Google search and exam-prep links

## Structure
- server.js        – HTTP server, REST API, question generators, auth (backend)
- questions.json   – hand-written question bank (add your own!)
- data/db.json     – users and exam results (created automatically)
- public/          – index.html, style.css, app.js (frontend)

## API
POST /api/register, POST /api/login, GET /api/topics, GET /api/question?topic=,
POST /api/check, GET /api/exam/start, POST /api/exam/submit, GET /api/history

## Add questions
Edit questions.json: { "topic": "...", "q": "...", "opts": ["a","b","c","d"], "ans": 0, "exp": "..." }  (ans = index of the right option)

## Ideas to extend (for your resume)
Switch db.json to MongoDB/SQLite, add a leaderboard, deploy on Render or Railway (set PORT env var), add JWT + HTTPS.

## AptiBot (chat agent)
Floating 🤖 button (bottom right). It answers aptitude formulas, quick calculations ("20% of 250", "45*12") and questions about the website using a built-in knowledge base (works offline).
To make it a full AI assistant, set your Anthropic API key before starting the server:
- Windows (cmd):  `set ANTHROPIC_API_KEY=your_key_here` then `node server.js`
- Mac/Linux:      `ANTHROPIC_API_KEY=your_key_here node server.js`
Without a key it automatically uses the built-in knowledge base. Needs Node.js 18 or newer.

## Install as an app (PWA)
The site is an installable Progressive Web App (manifest.json + sw.js + icons in public/).
1. Host the project online over HTTPS (Render, Railway, etc.). PWAs install only from HTTPS or localhost.
2. Open the link in Chrome on Android, then tap "Install app" (or the ⬇ Install app button inside the site).
3. iPhone: open in Safari, Share, then Add to Home Screen.
4. After you change any frontend file, bump VERSION in public/sw.js so users get the update.
