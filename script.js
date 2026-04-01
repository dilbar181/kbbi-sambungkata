/* ============================================
   KBBI — script.js
   Kamus Besar Bahasa Indonesia
   ============================================ */

'use strict';

// ---- STATE ----
let words = [];
let wordsByLetter = {};
let letterCounts = {};
let currentMode = 'prefix';
let currentFilter = null;
let focusedIndex = -1;
const MAX_SUGGESTIONS = 30;
const MAX_RESULTS_DISPLAY = 500;
const CACHE_KEY = 'kbbi_words_v2';
const CACHE_TS_KEY = 'kbbi_ts_v2';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// ---- DOM REFS ----
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const suggestionsWrapper = document.getElementById('suggestionsWrapper');
const suggestionsList = document.getElementById('suggestionsList');
const suggestionsFooter = document.getElementById('suggestionsFooter');
const filterGrid = document.getElementById('filterGrid');
const resultsSection = document.getElementById('resultsSection');
const resultsHeader = document.getElementById('resultsHeader');
const resultsGrid = document.getElementById('resultsGrid');
const resultsEmpty = document.getElementById('resultsEmpty');
const letterStatsGrid = document.getElementById('letterStatsGrid');
const statTotal = document.getElementById('statTotal');
const statLoaded = document.getElementById('statLoaded');
const modalOverlay = document.getElementById('modalOverlay');
const modalWord = document.getElementById('modalWord');
const modalMeta = document.getElementById('modalMeta');
const loadingOverlay = document.getElementById('loadingOverlay');
const btnRandom = document.getElementById('btnRandom');
const btnTheme = document.getElementById('btnTheme');
const sambungHint = document.getElementById('sambungHint');

// ---- UTILITY ----
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function highlightMatch(word, query) {
  if (!query) return escapeHTML(word);
  const escaped = escapeHTML(word);
  const q = escapeHTML(query.toLowerCase());
  const lower = escaped.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return escaped;
  return (
    escaped.slice(0, idx) +
    '<span class="highlight">' + escaped.slice(idx, idx + q.length) + '</span>' +
    escaped.slice(idx + q.length)
  );
}

function numberFmt(n) {
  return n.toLocaleString('id-ID');
}

// ---- BINARY SEARCH (prefix) ----
// Returns index of first word >= prefix
function lowerBound(arr, prefix) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < prefix) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function binaryPrefixSearch(prefix, limit) {
  if (!prefix) return [];
  const p = prefix.toLowerCase();
  const start = lowerBound(words, p);
  const results = [];
  for (let i = start; i < words.length && results.length < limit; i++) {
    if (words[i].startsWith(p)) results.push(words[i]);
    else break;
  }
  return results;
}

// ---- SEARCH ----
function searchWords(query, mode, limit) {
  if (!query) return [];
  const q = query.toLowerCase().trim();
  if (!q) return [];

  if (mode === 'prefix' || mode === 'sambung') {
    return binaryPrefixSearch(q, limit);
  } else {
    // contains — scan all
    const results = [];
    for (let i = 0; i < words.length && results.length < limit; i++) {
      if (words[i].includes(q)) results.push(words[i]);
    }
    return results;
  }
}

// ---- SUGGESTIONS ----
function showSuggestions(query) {
  if (!query || query.trim() === '') {
    hideSuggestions();
    return;
  }

  const matches = searchWords(query, currentMode, MAX_SUGGESTIONS);
  focusedIndex = -1;

  if (matches.length === 0) {
    hideSuggestions();
    return;
  }

  suggestionsList.innerHTML = matches.map((w, i) => `
    <div class="suggestion-item" data-word="${escapeHTML(w)}" data-idx="${i}" role="option">
      ${highlightMatch(w, query)}
      <span class="suggestion-arrow">→</span>
    </div>
  `).join('');

  const total = countMatchesTotal(query);
  suggestionsFooter.textContent = total > MAX_SUGGESTIONS
    ? `${numberFmt(MAX_SUGGESTIONS)} dari ${numberFmt(total)} kata ditemukan — ketik lebih spesifik`
    : `${numberFmt(matches.length)} kata ditemukan`;

  suggestionsWrapper.classList.add('open');

  // Click handler
  suggestionsList.querySelectorAll('.suggestion-item').forEach(el => {
    el.addEventListener('mousedown', e => {
      e.preventDefault();
      selectWord(el.dataset.word);
    });
  });
}

function hideSuggestions() {
  suggestionsWrapper.classList.remove('open');
  focusedIndex = -1;
}

function countMatchesTotal(query) {
  const q = query.toLowerCase().trim();
  if (currentMode === 'prefix' || currentMode === 'sambung') {
    const start = lowerBound(words, q);
    let count = 0;
    for (let i = start; i < words.length; i++) {
      if (words[i].startsWith(q)) count++;
      else break;
    }
    return count;
  } else {
    return words.filter(w => w.includes(q)).length;
  }
}

function selectWord(word) {
  searchInput.value = word;
  hideSuggestions();
  searchClear.classList.add('visible');
  showResults(word);
}

// ---- RESULTS ----
function showResults(query) {
  if (!query && !currentFilter) {
    resultsSection.style.display = 'none';
    return;
  }

  resultsSection.style.display = 'block';

  let matches;
  if (query) {
    matches = searchWords(query, currentMode, MAX_RESULTS_DISPLAY);
  } else if (currentFilter) {
    matches = wordsByLetter[currentFilter] || [];
  } else {
    matches = [];
  }

  if (matches.length === 0) {
    resultsHeader.innerHTML = '';
    resultsGrid.innerHTML = '';
    resultsEmpty.style.display = 'block';
    return;
  }

  resultsEmpty.style.display = 'none';

  const label = query
    ? `<strong>${numberFmt(matches.length)}</strong> kata${matches.length === MAX_RESULTS_DISPLAY ? ' (ditampilkan maks. ' + numberFmt(MAX_RESULTS_DISPLAY) + ')' : ''} — "${escapeHTML(query)}" — mode: ${currentMode}`
    : `<strong>${numberFmt(matches.length)}</strong> kata berawalan "<strong>${currentFilter?.toUpperCase()}</strong>"`;

  resultsHeader.innerHTML = label;

  resultsGrid.innerHTML = matches.map((w, i) => `
    <div class="word-card" style="animation-delay:${Math.min(i, 50) * 10}ms" title="${escapeHTML(w)}">
      ${query ? highlightMatch(w, query) : escapeHTML(w)}
    </div>
  `).join('');

  // Click word card → search it
  resultsGrid.querySelectorAll('.word-card').forEach(el => {
    el.addEventListener('click', () => {
      const text = el.textContent.trim();
      searchInput.value = text;
      searchClear.classList.add('visible');
      showResults(text);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ---- FILTER A-Z ----
function buildFilterButtons() {
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  filterGrid.innerHTML = letters.map(l => `
    <button class="filter-btn" data-letter="${l}" title="${letterCounts[l] || 0} kata">
      ${l.toUpperCase()}
    </button>
  `).join('');

  filterGrid.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const letter = btn.dataset.letter;
      if (currentFilter === letter) {
        // deselect
        currentFilter = null;
        btn.classList.remove('active');
        searchInput.value = '';
        searchClear.classList.remove('visible');
        hideSuggestions();
        resultsSection.style.display = 'none';
      } else {
        currentFilter = letter;
        filterGrid.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        searchInput.value = '';
        searchClear.classList.remove('visible');
        hideSuggestions();
        showResults(null);
      }
    });
  });
}

// ---- LETTER STATS ----
function buildLetterStats() {
  const maxCount = Math.max(...Object.values(letterCounts));
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');

  letterStatsGrid.innerHTML = letters.map(l => {
    const count = letterCounts[l] || 0;
    const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
    return `
      <div class="letterstat-card" data-letter="${l}">
        <div class="letterstat-letter">${l.toUpperCase()}</div>
        <div class="letterstat-info">
          <div class="letterstat-count">${numberFmt(count)}</div>
          <div class="letterstat-bar">
            <div class="letterstat-fill" style="width:0%" data-pct="${pct}"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Animate bars after render
  requestAnimationFrame(() => {
    letterStatsGrid.querySelectorAll('.letterstat-fill').forEach(el => {
      el.style.width = el.dataset.pct + '%';
    });
  });

  // Click → filter
  letterStatsGrid.querySelectorAll('.letterstat-card').forEach(el => {
    el.addEventListener('click', () => {
      const letter = el.dataset.letter;
      const btn = filterGrid.querySelector(`[data-letter="${letter}"]`);
      if (btn) btn.click();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ---- RANDOM WORD ----
function showRandomWord() {
  if (!words.length) return;
  const word = words[Math.floor(Math.random() * words.length)];
  const letter = word[0]?.toUpperCase() || '?';
  const count = letterCounts[word[0]] || 0;
  modalWord.textContent = word;
  modalMeta.textContent = `Huruf ${letter} · ${numberFmt(count)} kata berawalan ${letter}`;
  modalOverlay.classList.add('open');
}

// ---- MODE TOGGLE ----
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.dataset.mode;
    sambungHint.classList.toggle('visible', currentMode === 'sambung');
    const q = searchInput.value.trim();
    if (q) {
      showSuggestions(q);
      showResults(q);
    }
  });
});

// ---- KEYBOARD NAV ----
searchInput.addEventListener('keydown', e => {
  const items = suggestionsList.querySelectorAll('.suggestion-item');
  if (!items.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
    updateFocus(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    focusedIndex = Math.max(focusedIndex - 1, -1);
    updateFocus(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (focusedIndex >= 0 && items[focusedIndex]) {
      selectWord(items[focusedIndex].dataset.word);
    } else {
      showResults(searchInput.value.trim());
      hideSuggestions();
    }
  } else if (e.key === 'Escape') {
    hideSuggestions();
  }
});

function updateFocus(items) {
  items.forEach((el, i) => el.classList.toggle('focused', i === focusedIndex));
  if (focusedIndex >= 0) items[focusedIndex]?.scrollIntoView({ block: 'nearest' });
}

// ---- SEARCH INPUT ----
const handleInput = debounce(() => {
  const q = searchInput.value.trim();
  searchClear.classList.toggle('visible', q.length > 0);
  currentFilter = null;
  filterGrid.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));

  if (q) {
    showSuggestions(q);
    showResults(q);
  } else {
    hideSuggestions();
    resultsSection.style.display = 'none';
  }
}, 200);

searchInput.addEventListener('input', handleInput);

searchInput.addEventListener('focus', () => {
  const q = searchInput.value.trim();
  if (q) showSuggestions(q);
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-section')) hideSuggestions();
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.classList.remove('visible');
  hideSuggestions();
  resultsSection.style.display = 'none';
  searchInput.focus();
});

// ---- RANDOM ----
btnRandom.addEventListener('click', showRandomWord);
document.getElementById('modalClose').addEventListener('click', () => modalOverlay.classList.remove('open'));
document.getElementById('modalAnother').addEventListener('click', showRandomWord);
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) modalOverlay.classList.remove('open');
});

// ---- THEME ----
btnTheme.addEventListener('click', () => {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('kbbi_theme', next);
});

// Restore theme
const savedTheme = localStorage.getItem('kbbi_theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

// ---- INIT DATABASE ----
async function loadDatabase() {
  // Try cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const ts = localStorage.getItem(CACHE_TS_KEY);
    if (cached && ts && (Date.now() - parseInt(ts)) < CACHE_TTL) {
      words = JSON.parse(cached);
      onWordsLoaded('cache');
      return;
    }
  } catch (e) {
    // cache error, proceed to fetch
  }

  // Fetch
  try {
    const res = await fetch('kbbi_database.txt');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    words = text
      .split(/\r?\n/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 0);

    // Sort for binary search
    words.sort();

    // Cache
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(words));
      localStorage.setItem(CACHE_TS_KEY, Date.now().toString());
    } catch (e) { /* storage full, ignore */ }

    onWordsLoaded('fetch');
  } catch (err) {
    console.error('Failed to load database:', err);
    statLoaded.textContent = 'ERROR';
    loadingOverlay.classList.add('hidden');
    document.querySelector('.loading-text').textContent = 'Gagal memuat database. Pastikan file kbbi_database.txt ada di folder yang sama.';
    setTimeout(() => loadingOverlay.classList.add('hidden'), 3000);
  }
}

function onWordsLoaded(source) {
  // Build letter index
  wordsByLetter = {};
  letterCounts = {};
  for (const w of words) {
    const l = w[0];
    if (!l || !/[a-z]/.test(l)) continue;
    if (!wordsByLetter[l]) wordsByLetter[l] = [];
    wordsByLetter[l].push(w);
    letterCounts[l] = (letterCounts[l] || 0) + 1;
  }

  // Update stats
  statTotal.textContent = numberFmt(words.length);
  statLoaded.textContent = source === 'cache' ? 'Cache' : 'Dimuat';

  // Build UI
  buildFilterButtons();
  buildLetterStats();

  // Hide loading
  loadingOverlay.classList.add('hidden');
}

// ---- START ----
loadDatabase();
