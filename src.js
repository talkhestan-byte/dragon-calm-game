
import './style.css';
import { questionBank } from './questions.js';

// تعداد سؤال‌های هر نوبت بازی
// مقدار باید زوج و بین 2 تا 100 باشد.
const QUESTIONS_PER_GAME = 10;

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function makeRounds() {
  const count = Math.max(
    2,
    Math.min(100, Math.floor(QUESTIONS_PER_GAME / 2) * 2)
  );
  const half = count / 2;

  const words = shuffle(
    questionBank.filter(q => q.category === 'words')
  ).slice(0, half);

  const calm = shuffle(
    questionBank.filter(q => q.category === 'calm')
  ).slice(0, half);

  return shuffle([...words, ...calm]).map(q => {
    // ترتیب گزینه‌ها نیز در هر بازی تغییر می‌کند.
    const options = shuffle(
      q.choices.map((text, index) => ({ text, index }))
    );

    return {
      ...q,
      choices: options.map(o => o.text),
      correct: options.findIndex(o => o.index === q.correct)
    };
  });
}

let rounds = makeRounds();
let phase = 'home';
let idx = 0;
let stars = 0;
let mistakes = 0;
let soundOn = true;
let busy = false;
let breathCount = 0;
let audioCtx;
let musicTimer;
let musicStep = 0;

const app = document.querySelector('#app');

const esc = s => String(s).replace(
  /[&<>"']/g,
  c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c])
);

// ======================
// سیستم صدا و موسیقی
// ======================

function tone(
  freq = 440,
  duration = .12,
  type = 'sine',
  volume = .08,
  delay = 0
) {
  if (!soundOn) return;

  try {
    audioCtx ||= new (
      window.AudioContext ||
      window.webkitAudioContext
    )();

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      volume, now + .015
    );
    gain.gain.exponentialRampToValueAtTime(
      .0001, now + duration
    );

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + duration + .03);

  } catch (e) {
    console.warn('Audio unavailable', e);
  }
}

function fx(name) {
  if (name === 'good') {
    [523, 659, 784, 1046].forEach((n, i) =>
      tone(n, .2, 'triangle', .09, i * .095)
    );
  }

  if (name === 'bad') {
    tone(200, .22, 'sawtooth', .055);
    tone(145, .28, 'sawtooth', .04, .1);
  }

  if (name === 'tap') {
    tone(600, .055, 'sine', .035);
  }

  if (name === 'win') {
    [392, 523, 659, 784, 1046, 1318].forEach(
      (n, i) => tone(n, .26, 'triangle', .08, i * .12)
    );
  }

  if (name === 'breath') {
    tone(330, .45, 'sine', .045);
  }
}

function startMusic() {
  stopMusic();
  if (!soundOn) return;

  const melody = [
    261.6, 329.6, 392, 329.6,
    293.7, 349.2, 440, 392
  ];

  musicTimer = setInterval(() => {
    if (document.hidden || !soundOn) return;

    tone(
      melody[musicStep % melody.length],
      .15,
      'sine',
      .012
    );
    musicStep++;
  }, 470);
}

function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}

// ======================
// طراحی اژدهای آتیشک
// ======================

function dragon() {
  const angry = phase === 'question' && mistakes > 0;
  const calm = phase === 'finish' || phase === 'correct';

  return `
  <div class="dragon-wrap ${angry ? 'angry' : ''} ${calm ? 'calm' : ''}">
    <svg class="dragon"
         viewBox="0 0 440 350"
         role="img"
         aria-label="اژدهای کارتونی آتیشک">

      <defs>
        <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="${calm ? '#a0f48e' : '#ffb058'}"/>
          <stop offset="1"
                stop-color="${calm ? '#2dba83' : '#e54b4c'}"/>
        </linearGradient>

        <linearGradient id="belly" x1="0" y1="0" x2="0" y2="1">
          <stop stop-color="#fff5bb"/>
          <stop offset="1" stop-color="#ffd27d"/>
        </linearGradient>

        <filter id="glow">
          <feGaussianBlur stdDeviation="6"/>
        </filter>
      </defs>

      <ellipse cx="215" cy="327" rx="145" ry="16"
               fill="#111833" opacity=".2"/>

      <path
        d="M302 240 Q410 185 395 102 Q430 202 342 290 L297 289Z"
        fill="${calm ? '#3bbb81' : '#e85a53'}"
        stroke="#9d394b" stroke-width="5"/>

      <path
        d="M110 195 Q39 97 61 81 Q98 89 161 166Z"
        fill="${calm ? '#77d6a3' : '#f68c79'}"
        stroke="#9e4358" stroke-width="6"/>

      <path
        d="M285 179 Q362 87 385 96 Q377 171 304 231Z"
        fill="${calm ? '#77d6a3' : '#f68c79'}"
        stroke="#9e4358" stroke-width="6"/>

      <path
        d="M160 177 L149 139 L184 152 L190 119
           L220 153 L250 125 L256 164 L285 151 L276 197"
        fill="#ffd16b" stroke="#a85843" stroke-width="5"/>

      <ellipse cx="225" cy="245" rx="111" ry="83"
               fill="url(#body)"
               stroke="#a24b50" stroke-width="6"/>

      <ellipse cx="214" cy="262" rx="65" ry="55"
               fill="url(#belly)"/>

      <path
        d="M139 290 Q93 295 100 320 Q129 336 163 314
           M276 302 Q315 297 327 324 Q295 343 267 318"
        fill="url(#body)"
        stroke="#a24b50"
        stroke-width="6"
        stroke-linecap="round"/>

      <path
        d="M130 174 Q99 116 133 78 Q142 105 162 111
           Q166 64 191 51 Q193 91 213 104
           Q254 56 285 83 Q326 121 307 186Z"
        fill="url(#body)"
        stroke="#a24b50"
        stroke-width="6"/>

      <path
        d="M144 98 Q120 62 135 35 Q153 42 160 83
           M264 88 Q287 48 312 47 Q314 78 289 107"
        fill="#ffe29a"
        stroke="#b85c53"
        stroke-width="5"/>

      <ellipse cx="216" cy="157" rx="113" ry="83"
               fill="url(#body)"
               stroke="#a24b50"
               stroke-width="6"/>

      <ellipse cx="170" cy="150" rx="24" ry="30" fill="white"/>
      <ellipse cx="260" cy="150" rx="24" ry="30" fill="white"/>

      <circle cx="178" cy="155" r="11" fill="#303752"/>
      <circle cx="253" cy="155" r="11" fill="#303752"/>

      <circle cx="181" cy="151" r="4" fill="white"/>
      <circle cx="256" cy="151" r="4" fill="white"/>

      <path
        d="M145 ${angry ? '121' : '128'}
           Q170 ${angry ? '108' : '117'}
           188 ${angry ? '126' : '125'}
           M238 ${angry ? '126' : '125'}
           Q264 ${angry ? '108' : '117'}
           282 ${angry ? '121' : '128'}"
        fill="none"
        stroke="#7f3846"
        stroke-width="7"
        stroke-linecap="round"/>

      <ellipse cx="216" cy="203" rx="78" ry="43"
               fill="${calm ? '#70d99b' : '#ffbd76'}"
               stroke="#a24b50"
               stroke-width="5"/>

      <ellipse cx="180" cy="190" rx="7" ry="5"
               fill="#ab5d56"/>
      <ellipse cx="250" cy="190" rx="7" ry="5"
               fill="#ab5d56"/>

      <path
        d="${angry
          ? 'M178 227 Q215 202 254 227'
          : 'M176 211 Q216 254 255 211'}"
        fill="none"
        stroke="#883c4b"
        stroke-width="7"
        stroke-linecap="round"/>

      <ellipse cx="139" cy="194" rx="15" ry="8"
               fill="#ff7080" opacity=".65"/>
      <ellipse cx="291" cy="194" rx="15" ry="8"
               fill="#ff7080" opacity=".65"/>
    </svg>

    <div class="fire ${calm ? 'bubbles' : ''}"
         aria-hidden="true">
      ${calm ? '🫧 ✨ 🫧' : mistakes ? '🔥🔥🔥' : '🔥'}
    </div>
  </div>`;
}

// ======================
// قلعه و محیط مدرسه
// ======================

function landscape() {
  return `
    <div class="sky-stars">
      ✦ <span>✧</span> ✦ <span>✧</span> ✦
    </div>

    <div class="cloud c1"></div>
    <div class="cloud c2"></div>
    <div class="mountains"></div>

    <div class="castle" aria-hidden="true">
      <div class="tower left"></div>
      <div class="wall"></div>
      <div class="tower right"></div>
      <div class="gate"></div>

      <div class="school-sign">
        دبستان علامه طباطبایی ۲ همدان
      </div>
    </div>

    <div class="grass"></div>
  `;
}

// ======================
// قالب اصلی صفحات
// ======================

function shell(content) {
  app.innerHTML = `
    <div class="game-shell">
      ${landscape()}

      <header>
        <div class="brand">
          <span class="brand-icon">🐉</span>
          <span>
            آتیشک
            <small>اژدهای آرامش</small>
          </span>
        </div>

        <div class="header-actions">
          <button id="sound"
                  class="icon-btn"
                  aria-label="روشن و خاموش کردن صدا">
            ${soundOn ? '🔊' : '🔇'}
          </button>

          <button id="home"
                  class="icon-btn"
                  aria-label="صفحه اول">
            ⌂
          </button>
        </div>
      </header>

      <main>${content}</main>

      <footer>
        با هم مهربان‌تر حرف می‌زنیم 💛
      </footer>
    </div>
  `;

  document.querySelector('#sound').onclick = () => {
    soundOn = !soundOn;

    document.querySelector('#sound').textContent =
      soundOn ? '🔊' : '🔇';

    if (soundOn) {
      fx('tap');
      if (phase !== 'home' && phase !== 'finish') {
        startMusic();
      }
    } else {
      stopMusic();
    }
  };

  document.querySelector('#home').onclick = () => {
    fx('tap');
    home();
  };
}

// ======================
// صفحه شروع
// ======================

function home() {
  phase = 'home';
  idx = 0;
  stars = 0;
  mistakes = 0;
  busy = false;

  stopMusic();

  // انتخاب سؤال‌های جدید برای بازی جدید
  rounds = makeRounds();

  shell(`
    <div class="home-layout">
      <section class="hero">
        ${dragon()}

        <div class="hero-copy">
          <div class="eyebrow">
            🎮 بازی گروهی کلاس هوشمند
          </div>

          <h1>
            اژدهای <em>عصبانیت</em>
          </h1>

          <p>
            آتیشک وقتی ناراحت می‌شود آتش بیرون می‌دهد!
            با انتخاب کلمه‌های مهربان و رفتارهای درست
            کمکش کن آرام شود.
          </p>

          <div class="info-chips">
            <span>📚 بانک ۱۰۰ سؤال</span>
            <span>⭐ ${rounds.length} مرحله</span>
            <span>👦 پایه اول تا سوم</span>
          </div>

          <button class="primary" id="start">
            بزن بریم! <span>🚀</span>
          </button>
        </div>
      </section>

      <div class="tip">
        💡 معلم سؤال را می‌خواند؛ بچه‌ها با هم
        بهترین پاسخ را انتخاب می‌کنند.
      </div>
    </div>
  `);

  document.querySelector('#start').onclick = () => {
    fx('tap');
    startMusic();
    question();
  };
}

// ======================
// نمایش سؤال
// ======================

function question() {
  phase = 'question';
  busy = false;
  mistakes = 0;

  const r = rounds[idx];

  shell(`
    <section class="play-layout">
      <div class="top-progress">
        <span>
          مرحله ${idx + 1} از ${rounds.length}
        </span>

        <div class="track">
          <div style="width:${idx / rounds.length * 100}%"></div>
        </div>

        <span class="score">
          ⭐ ${stars} از ${rounds.length}
        </span>
      </div>

      <div class="play-main">
        <div class="dragon-panel">
          ${dragon()}

          <div class="dragon-name">
            آتیشک منتظر کمک شماست!
          </div>

          <div class="mood-meter">
            <span>🔥 عصبانیت</span>

            <div class="mood-track">
              <div id="mood-fill" style="width:65%"></div>
            </div>

            <span>🧊 آرامش</span>
          </div>
        </div>

        <div class="question-panel">
          <div class="level-label">
            ${r.scene} ${esc(r.title)}
          </div>

          <h2>${esc(r.story)}</h2>

          <p class="prompt">
            بهترین واکنش کدام است؟
          </p>

          <div class="answers">
            ${r.choices.map((x, i) => `
              <button class="answer" data-choice="${i}">
                <span class="choice-number">
                  ${['۱', '۲', '۳'][i]}
                </span>
                <span>${esc(x)}</span>
              </button>
            `).join('')}
          </div>

          <div class="feedback"
               id="feedback"
               role="status"
               aria-live="polite">
          </div>
        </div>
      </div>
    </section>
  `);

  document.querySelectorAll('.answer').forEach(button => {
    button.onclick = () => {
      choose(Number(button.dataset.choice));
    };
  });
}

// ======================
// بررسی پاسخ دانش‌آموز
// ======================

function choose(i) {
  if (busy) return;

  const r = rounds[idx];

  const buttons = [
    ...document.querySelectorAll('.answer')
  ];

  const feedback = document.querySelector('#feedback');

  if (i === r.correct) {
    busy = true;
    stars++;
    phase = 'correct';

    fx('good');

    buttons[i].classList.add('right');

    buttons.forEach(button => {
      button.disabled = true;
    });

    document.querySelector('.dragon-wrap')
      .classList.add('calm');

    document.querySelector('.fire').textContent =
      '🫧 ✨ 🫧';

    document.querySelector('.fire')
      .classList.add('bubbles');

    document.querySelector('#mood-fill').style.width =
      '10%';

    feedback.innerHTML = `
      <div class="feedback-good">
        🌟 آفرین قهرمان!
        ${esc(r.lesson)}
      </div>

      <button class="secondary" id="continue">
        ${r.breath
          ? '🌬️ سه نفس آرام با آتیشک'
          : idx === rounds.length - 1
            ? '🏆 مشاهده نتیجه'
            : 'مرحله بعد ←'}
      </button>
    `;

    document.querySelector('#continue').onclick = () => {
      fx('tap');

      if (r.breath) {
        breathing();
      } else {
        advance();
      }
    };

  } else {
    mistakes++;
    fx('bad');

    buttons[i].classList.add('wrong');

    document.querySelector('.dragon-wrap')
      .classList.add('angry');

    document.querySelector('.fire').textContent =
      '🔥🔥🔥';

    document.querySelector('#mood-fill').style.width =
      '92%';

    feedback.innerHTML = `
      <div class="feedback-bad">
        🔥 اوه! این کار ممکن است ناراحتی را بیشتر کند.
        یک راه مهربان‌تر امتحان کن.
      </div>
    `;

    setTimeout(() => {
      buttons[i]?.classList.remove('wrong');
    }, 550);
  }
}

// ======================
// تمرین تنفس
// ======================

function breathing() {
  phase = 'breathing';
  breathCount = 0;
  drawBreath();
}

function drawBreath() {
  shell(`
    <div class="breath-screen">
      <h2>🌬️ تمرین آرامش</h2>

      <p>
        همه با هم سه نفس آرام می‌کشیم.
      </p>

      <div class="breath-orb">
        <span>
          دم آرام…
          <br/>
          بازدم آرام…
        </span>
      </div>

      <div class="breath-count">
        ${breathCount} از ۳ نفس
      </div>

      <button id="breathe" class="primary">
        ${breathCount < 3
          ? 'یک نفس کشیدیم 🌬️'
          : 'آفرین! ادامه بازی 🚀'}
      </button>
    </div>
  `);

  document.querySelector('#breathe').onclick = () => {
    fx('breath');

    if (breathCount < 3) {
      breathCount++;
      drawBreath();
    } else {
      advance();
    }
  };
}

// ======================
// مرحله بعد
// ======================

function advance() {
  if (idx < rounds.length - 1) {
    idx++;
    question();
  } else {
    finish();
  }
}

// ======================
// پایان بازی
// ======================

function finish() {
  phase = 'finish';

  stopMusic();
  fx('win');

  const percent = Math.round(
    stars / rounds.length * 100
  );

  shell(`
    <div class="finish-screen">
      <div class="confetti" aria-hidden="true">
        🎊 ✨ ⭐ 🎉 ✨ 🎊
      </div>

      ${dragon()}

      <h1>
        هورا! قهرمانان آرامش! 🏆
      </h1>

      <p>
        شما به آتیشک یاد دادید که عصبانی شدن
        طبیعی است، اما می‌توانیم مهربانانه
        حرف بزنیم و رفتارمان را کنترل کنیم.
      </p>

      <div class="big-stars">
        ⭐⭐⭐⭐⭐
      </div>

      <div class="trophy">
        🏆 جام قهرمانان آرامش
      </div>

      <p>
        تعداد مراحل: ${rounds.length}
        <br/>
        پاسخ‌های صحیح: ${stars}
        <br/>
        امتیاز: ${percent} درصد
      </p>

      <button class="primary" id="restart">
        دوباره بازی کنیم 🔁
      </button>
    </div>
  `);

  document.querySelector('#restart').onclick = () => {
    fx('tap');
    home();
  };
}

// ======================
// مدیریت موسیقی در پس‌زمینه
// ======================

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopMusic();
  } else if (
    phase !== 'home' &&
    phase !== 'finish' &&
    soundOn
  ) {
    startMusic();
  }
});

// اجرای اولیه بازی
home();
