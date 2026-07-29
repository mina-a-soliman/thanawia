/* ============================================================
   app.js  –  Thanawya Results Search
   ============================================================ */

const MAX_GRADE = 320;
const RING_CIRCUMFERENCE = 2 * Math.PI * 30; // ≈ 188.5

/* ── DOM Refs ── */
const input      = document.getElementById('search-input');
const clearBtn   = document.getElementById('clear-btn');
const searchBtn  = document.getElementById('search-btn');
const skeleton   = document.getElementById('skeleton');
const emptyState = document.getElementById('empty-state');
const noResults  = document.getElementById('no-results');
const grid       = document.getElementById('results-grid');
const statsBar   = document.getElementById('stats-bar');
const statsCount = document.getElementById('stats-count');
const statsQuery = document.getElementById('stats-query');

let debounceTimer = null;

/* ── Event Listeners ── */
input.addEventListener('input', () => {
  toggleClear();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => doSearch(), 400);
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    clearTimeout(debounceTimer);
    doSearch();
  }
});

searchBtn.addEventListener('click', () => {
  clearTimeout(debounceTimer);
  doSearch();
});

clearBtn.addEventListener('click', () => {
  input.value = '';
  input.focus();
  toggleClear();
  showEmpty();
});

/* ── Search ── */
async function doSearch() {
  const q = input.value.trim();

  if (!q) {
    showEmpty();
    return;
  }

  showSkeleton();

  try {
    const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    renderResults(data);
  } catch {
    renderResults({ results: [], query: q });
  }
}

/* ── Render ── */
function renderResults({ results, query }) {
  hideSkeleton();
  grid.innerHTML = '';

  if (!results || results.length === 0) {
    statsBar.hidden = true;
    emptyState.hidden = true;
    noResults.hidden = false;
    return;
  }

  noResults.hidden = true;
  emptyState.hidden = true;

  // Stats
  statsBar.hidden = false;
  statsCount.textContent = `${results.length} نتيجة`;
  statsQuery.textContent = `"${query}"`;

  results.forEach((student, idx) => {
    grid.appendChild(buildCard(student, idx));
  });

  // Animate rings after DOM insertion
  requestAnimationFrame(() => {
    document.querySelectorAll('.ring-fill[data-pct]').forEach((ring) => {
      const pct = parseFloat(ring.dataset.pct) / 100;
      const offset = RING_CIRCUMFERENCE * (1 - pct);
      ring.style.strokeDashoffset = offset;
    });
  });
}

/* ── Build Card ── */
function buildCard(s, idx) {
  const pct       = s.percentage !== null ? parseFloat(s.percentage) : null;
  const pctStr    = pct !== null ? `${pct.toFixed(2)}%` : '—';
  const degree    = s.total_degree !== null ? s.total_degree : '—';
  const caseClass = s.case_class || 'fail';
  const caseLabel = s.case_label || '—';

  const card = document.createElement('article');
  card.className  = 'result-card';
  card.setAttribute('role', 'listitem');
  card.style.animationDelay = `${Math.min(idx * 0.04, 0.5)}s`;

  card.innerHTML = `
    <div class="card-header">
      <p class="student-name">${escHtml(s.arabic_name)}</p>
      <span class="badge ${caseClass}">${escHtml(caseLabel)}</span>
    </div>

    <div class="seating-no">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
      رقم الجلوس: <strong>${escHtml(String(s.seating_no))}</strong>
    </div>

    <div class="percentage-area">
      <div class="ring-container" aria-hidden="true">
        <svg class="ring-svg" viewBox="0 0 72 72">
          <circle class="ring-track" cx="36" cy="36" r="30"/>
          <circle
            class="ring-fill ${caseClass}"
            cx="36" cy="36" r="30"
            data-pct="${pct !== null ? pct : 0}"
            style="stroke-dashoffset: ${RING_CIRCUMFERENCE}"
          />
        </svg>
        <div class="ring-label">${pctStr}</div>
      </div>

      <div class="score-details">
        <div class="score-main">
          ${degree} <span>/ ${MAX_GRADE}</span>
        </div>
        <div class="score-label">مجموع الدرجات</div>
        <div class="percentage-pill">${pctStr}</div>
      </div>
    </div>
  `;

  return card;
}

/* ── UI State Helpers ── */
function showSkeleton() {
  emptyState.hidden = true;
  noResults.hidden  = true;
  grid.innerHTML    = '';
  statsBar.hidden   = true;
  skeleton.hidden   = false;
}

function hideSkeleton() {
  skeleton.hidden = true;
}

function showEmpty() {
  emptyState.hidden = false;
  noResults.hidden  = true;
  grid.innerHTML    = '';
  statsBar.hidden   = true;
  skeleton.hidden   = true;
}

function toggleClear() {
  clearBtn.hidden = input.value.length === 0;
}

/* ── Helpers ── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
