// Progressive enhancement only. The page is complete without this file.
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Reveal on scroll, staggered within each grid.
const revealed = document.querySelectorAll('.reveal');
if (calm || !('IntersectionObserver' in window)) {
  revealed.forEach(el => el.classList.add('in'));
} else {
  for (const group of document.querySelectorAll('.cards, .meters, .links')) {
    [...group.children].forEach((el, i) => el.style.setProperty('--d', `${Math.min(i, 7) * 60}ms`));
  }
  const seen = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('in');
      seen.unobserve(entry.target);
      const counter = entry.target.querySelector('[data-count]');
      if (counter) countUp(counter);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
  revealed.forEach(el => seen.observe(el));
}

// Count the benchmark ratios down from parity.
function countUp(el) {
  const target = Number(el.dataset.count);
  const start = performance.now();
  const duration = 1300;
  const frame = now => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = (1 + (target - 1) * eased).toFixed(2);
    if (t < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// Spotlight that follows the pointer across cards.
for (const card of document.querySelectorAll('.card, .link-card')) {
  card.addEventListener('pointermove', event => {
    const box = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${event.clientX - box.left}px`);
    card.style.setProperty('--my', `${event.clientY - box.top}px`);
  });
}

// Rest the illustrations while they are off screen.
if ('IntersectionObserver' in window) {
  const stage = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('paused', !entry.isIntersecting);
  });
  document.querySelectorAll('.machine, .robot-scene').forEach(el => stage.observe(el));
}

// Type the terminal session.
const term = document.getElementById('term');
if (term && !calm) {
  const lines = [...term.querySelectorAll('.t-line')];
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const typed = lines.map(line => {
    const cmd = line.querySelector('[data-type]');
    return cmd ? { cmd, text: cmd.textContent } : null;
  });
  const play = async () => {
    lines.forEach((line, i) => {
      line.classList.add('t-hidden');
      if (typed[i]) typed[i].cmd.textContent = '';
    });
    await sleep(700);
    for (let i = 0; i < lines.length; i++) {
      lines[i].classList.remove('t-hidden');
      if (typed[i]) {
        const caret = document.createElement('span');
        caret.className = 't-caret';
        lines[i].append(caret);
        for (const ch of typed[i].text) {
          typed[i].cmd.textContent += ch;
          await sleep(22 + Math.random() * 38);
        }
        await sleep(350);
        caret.remove();
      } else {
        await sleep(lines[i].classList.contains('t-last') ? 300 : 170);
      }
    }
  };
  play();
}

// Install tabs: pick the visitor's platform, add copy buttons.
for (const box of document.querySelectorAll('[data-tabs]')) {
  const tabs = [...box.querySelectorAll('[role="tab"]')];
  const select = (tab, focus) => {
    for (const other of tabs) {
      const on = other === tab;
      other.setAttribute('aria-selected', on);
      other.tabIndex = on ? 0 : -1;
      document.getElementById(other.getAttribute('aria-controls')).hidden = !on;
    }
    if (focus) tab.focus();
  };
  const platform = (navigator.userAgentData?.platform || navigator.platform || '').toLowerCase();
  const os = platform.includes('mac') ? 'mac' : platform.includes('linux') ? 'linux' : null;
  select(tabs.find(tab => tab.dataset.os === os) || tabs[0]);
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (step) select(tabs[(i + step + tabs.length) % tabs.length], true);
    });
  });
  if (navigator.clipboard) {
    for (const panel of box.querySelectorAll('.panel')) {
      const button = document.createElement('button');
      button.className = 'copy';
      button.type = 'button';
      button.textContent = 'Copy';
      button.addEventListener('click', async () => {
        await navigator.clipboard.writeText(panel.querySelector('pre').textContent.trim() + '\n');
        button.textContent = 'Copied';
        setTimeout(() => { button.textContent = 'Copy'; }, 1600);
      });
      panel.prepend(button);
    }
  }
}

// Show the newest release in the download commands. The page ships with a known-good version.
const versions = document.querySelectorAll('[data-version]');
if (versions.length) {
  fetch('https://api.github.com/repos/ai-haskell-compiler/aihc/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
    .then(response => (response.ok ? response.json() : Promise.reject()))
    .then(release => {
      const version = String(release.tag_name).replace(/^v/, '');
      const names = new Set((release.assets || []).map(asset => asset.name));
      const complete = ['apple-arm64', 'linux-amd64'].every(target => names.has(`aihc-${version}-${target}.tar.gz`));
      if (/^\d+(\.\d+)+$/.test(version) && complete) versions.forEach(el => { el.textContent = version; });
    })
    .catch(() => {});
}

// Theme switch. The inline script in the page head has already set data-theme.
const root = document.documentElement;
const system = matchMedia('(prefers-color-scheme: dark)');
const stored = () => {
  try { return localStorage.getItem('theme'); } catch { return null; }
};
const applyTheme = theme => {
  root.dataset.theme = theme;
  const colour = theme === 'dark' ? '#151318' : '#faf8f3';
  document.querySelectorAll('meta[name="theme-color"]').forEach(meta => { meta.content = colour; });
};
applyTheme(root.dataset.theme);
for (const button of document.querySelectorAll('[data-theme-toggle]')) {
  button.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('theme', next); } catch {}
  });
}
// Follow the system until the visitor has chosen a theme.
system.addEventListener('change', event => {
  if (!stored()) applyTheme(event.matches ? 'dark' : 'light');
});
