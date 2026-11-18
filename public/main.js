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
