// Highlight toggle
const highlightToggle = document.getElementById('highlightToggle');

chrome.storage.local.get({ highlightEnabled: true }, (data) => {
  highlightToggle.checked = data.highlightEnabled;
});

highlightToggle.addEventListener('change', () => {
  chrome.storage.local.set({ highlightEnabled: highlightToggle.checked });
});

const learningList = document.getElementById('learningList');
const familiarList = document.getElementById('familiarList');
const learningCount = document.getElementById('learningCount');
const familiarCount = document.getElementById('familiarCount');
const wordCount = document.getElementById('wordCount');
const emptyState = document.getElementById('emptyState');
const tabs = document.querySelectorAll('.tab');
const thresholdSelect = document.getElementById('threshold');
const listActions = document.getElementById('listActions');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');

let activeTab = 'learning';

// Tab switching
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    activeTab = tab.dataset.tab;
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    learningList.style.display = activeTab === 'learning' ? '' : 'none';
    familiarList.style.display = activeTab === 'familiar' ? '' : 'none';
    loadWords();
  });
});

function loadWords() {
  chrome.storage.local.get({ words: [] }, (data) => {
    renderWords(data.words);
  });
}

function saveWords(words) {
  chrome.storage.local.set({ words });
}

function renderWords(words) {
  learningList.innerHTML = '';
  familiarList.innerHTML = '';

  const learningWords = [];
  const familiarWords = [];

  words.forEach(entry => {
    const status = entry.status || 'familiar';
    if (status === 'learning') {
      learningWords.push(entry);
    } else {
      familiarWords.push(entry);
    }
  });

  learningCount.textContent = learningWords.length;
  familiarCount.textContent = familiarWords.length;
  wordCount.textContent = `${words.length} word${words.length !== 1 ? 's' : ''} total`;
  emptyState.style.display = words.length === 0 ? 'block' : 'none';

  const activeCount = activeTab === 'learning' ? learningWords.length : familiarWords.length;
  listActions.style.display = activeCount > 0 ? '' : 'none';

  learningWords.forEach(entry => {
    learningList.appendChild(createWordLi(entry, 'learning'));
  });

  familiarWords.forEach(entry => {
    familiarList.appendChild(createWordLi(entry, 'familiar'));
  });
}

function createWordLi(entry, status) {
  const li = document.createElement('li');
  const dotColor = status === 'learning' ? '#e65100' : '#4CAF50';
  const actionBtn = status === 'learning'
    ? `<button class="promote-btn" data-word="${escapeHtml(entry.word)}" title="Mark as familiar">&#x2713;</button>`
    : `<button class="demote-btn" data-word="${escapeHtml(entry.word)}" title="Move back to learning">&#x21A9;</button>`;

  li.innerHTML = `
    <div class="word-info">
      <strong>
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dotColor};margin-right:6px;"></span>${escapeHtml(entry.word)}
      </strong>
    </div>
    <div class="word-actions">
      ${actionBtn}
      <button class="delete-btn" data-word="${escapeHtml(entry.word)}">&times;</button>
    </div>
  `;
  return li;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Handle promote, demote, and delete using word as identifier
function handleWordAction(action, targetWord) {
  chrome.storage.local.get({ words: [] }, (data) => {
    let words = data.words;
    if (action === 'promote') {
      words = words.map(e =>
        e.word.toLowerCase() === targetWord ? { ...e, status: 'familiar' } : e
      );
    } else if (action === 'demote') {
      words = words.map(e =>
        e.word.toLowerCase() === targetWord ? { ...e, status: 'learning' } : e
      );
    } else if (action === 'delete') {
      words = words.filter(e => e.word.toLowerCase() !== targetWord);
    }
    saveWords(words);
    renderWords(words);
  });
}

learningList.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const word = btn.dataset.word.toLowerCase();
  if (btn.classList.contains('promote-btn')) {
    handleWordAction('promote', word);
  } else if (btn.classList.contains('delete-btn')) {
    handleWordAction('delete', word);
  }
});

familiarList.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const word = btn.dataset.word.toLowerCase();
  if (btn.classList.contains('demote-btn')) {
    handleWordAction('demote', word);
  } else if (btn.classList.contains('delete-btn')) {
    handleWordAction('delete', word);
  }
});

// Threshold setting
chrome.storage.local.get({ commonWordThreshold: 3000 }, (data) => {
  thresholdSelect.value = data.commonWordThreshold;
});

thresholdSelect.addEventListener('change', () => {
  chrome.storage.local.set({ commonWordThreshold: Number(thresholdSelect.value) });
});

loadWords();

// Copy and Download handlers
function getActiveWords(callback) {
  chrome.storage.local.get({ words: [] }, (data) => {
    const filtered = data.words
      .filter(e => (e.status || 'familiar') === activeTab)
      .map(e => e.word);
    callback(filtered);
  });
}

copyBtn.addEventListener('click', () => {
  getActiveWords((words) => {
    if (words.length === 0) return;
    navigator.clipboard.writeText(words.join('\n')).then(() => {
      const original = copyBtn.innerHTML;
      copyBtn.textContent = '\u2713';
      setTimeout(() => { copyBtn.innerHTML = original; }, 1500);
    });
  });
});

downloadBtn.addEventListener('click', () => {
  getActiveWords((words) => {
    if (words.length === 0) return;
    const blob = new Blob([words.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab + '-words.txt';
    a.click();
    URL.revokeObjectURL(url);
  });
});

// Load page stats from active tab's content script
const pageStatsEl = document.getElementById('pageStats');
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs[0]) return;
  chrome.tabs.sendMessage(tabs[0].id, { type: 'getPageStats' }, (response) => {
    if (chrome.runtime.lastError || !response) {
      pageStatsEl.style.display = 'none';
      return;
    }
    pageStatsEl.innerHTML =
      '<span class="stat"><span class="dot" style="background:#5e35b1;"></span><strong style="color:#5e35b1;">' + response.unfamiliar + '</strong><span class="label">unfamiliar</span></span>' +
      '<span class="stat"><span class="dot" style="background:#e65100;"></span><strong style="color:#e65100;">' + response.learning + '</strong><span class="label">learning</span></span>' +
      '<span class="stat"><span class="dot" style="background:#4CAF50;"></span><strong style="color:#4CAF50;">' + response.familiar + '</strong><span class="label">familiar</span></span>';
  });
});
