// ============================================================
// Popup script for Vocabulary Builder extension
// ============================================================

import type {
  Language,
  CefrLevel,
  WordEntry,
  WordStatus,
  PageStatsResponse,
  UnknownWordsResponse,
} from '../types';
import * as store from '../storage/store';

// Language selector
const languageSelect = document.getElementById('language') as HTMLSelectElement;
let currentLang: Language = 'en';

// Highlight toggle
const highlightToggle = document.getElementById(
  'highlightToggle'
) as HTMLInputElement;

store.get('highlightEnabled').then((enabled) => {
  highlightToggle.checked = enabled;
});

highlightToggle.addEventListener('change', () => {
  store.set('highlightEnabled', highlightToggle.checked);
});

const unknownList = document.getElementById('unknownList') as HTMLUListElement;
const learningList = document.getElementById(
  'learningList'
) as HTMLUListElement;
const familiarList = document.getElementById(
  'familiarList'
) as HTMLUListElement;
const unknownCount = document.getElementById('unknownCount') as HTMLSpanElement;
const learningCount = document.getElementById(
  'learningCount'
) as HTMLSpanElement;
const familiarCount = document.getElementById(
  'familiarCount'
) as HTMLSpanElement;
const wordCount = document.getElementById('wordCount') as HTMLSpanElement;
const emptyState = document.getElementById('emptyState') as HTMLDivElement;
const tabs = document.querySelectorAll('.tab');
const cefrLevelSelect = document.getElementById(
  'cefrLevel'
) as HTMLSelectElement;
const listActions = document.getElementById('listActions') as HTMLDivElement;
const refreshBtn = document.getElementById('refreshBtn') as HTMLButtonElement;
const copyBtn = document.getElementById('copyBtn') as HTMLButtonElement;
const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;

let activeTab: WordStatus | 'unknown' = 'unknown';
let unknownWords: string[] = [];

// Tab switching
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    activeTab = (tab as HTMLElement).dataset.tab as WordStatus | 'unknown';
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    unknownList.style.display = activeTab === 'unknown' ? '' : 'none';
    learningList.style.display = activeTab === 'learning' ? '' : 'none';
    familiarList.style.display = activeTab === 'familiar' ? '' : 'none';
    if (activeTab === 'unknown') {
      loadUnknownWords();
    } else {
      loadWords();
    }
  });
});

// ============================================================
// Unknown words (temporary, per page load)
// ============================================================

function loadUnknownWords(): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) {
      renderUnknownWords([]);
      return;
    }
    chrome.tabs.sendMessage(
      tabs[0].id,
      { type: 'getUnknownWords' },
      (response: UnknownWordsResponse | undefined) => {
        if (chrome.runtime.lastError || !response) {
          renderUnknownWords([]);
          return;
        }
        unknownWords = response.words;
        renderUnknownWords(unknownWords);
      }
    );
  });
}

function renderUnknownWords(words: string[]): void {
  unknownList.innerHTML = '';
  unknownCount.textContent = String(words.length);
  wordCount.textContent = `${words.length} word${words.length !== 1 ? 's' : ''} on this page`;
  emptyState.style.display = words.length === 0 ? 'block' : 'none';
  // Always show listActions when on unknown tab (for the refresh button),
  // but show copy/download only when there are words
  listActions.style.display = '';
  refreshBtn.style.display = '';
  copyBtn.style.display = words.length > 0 ? '' : 'none';
  downloadBtn.style.display = words.length > 0 ? '' : 'none';
  words.forEach((word) => {
    unknownList.appendChild(createUnknownWordLi(word));
  });
}

function createUnknownWordLi(word: string): HTMLLIElement {
  const li = document.createElement('li');
  li.innerHTML = `
    <div class="word-info">
      <strong>
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#5e35b1;margin-right:6px;"></span>${escapeHtml(word)}
      </strong>
    </div>
    <div class="word-actions">
      <button class="add-learning-btn" data-word="${escapeHtml(word)}" title="Add to learning">+</button>
    </div>
  `;
  return li;
}

unknownList.addEventListener('click', (e: MouseEvent) => {
  const btn = (e.target as HTMLElement).closest('button');
  if (!btn || !btn.classList.contains('add-learning-btn')) return;
  const word = btn.dataset.word?.toLowerCase();
  if (!word) return;

  store.getWords(currentLang).then((words) => {
    if (!words.some((e) => e.word.toLowerCase() === word)) {
      words.unshift({ word, status: 'learning' });
      saveWords(words);
    }
    // Optimistic removal from unknown list
    unknownWords = unknownWords.filter((w) => w !== word);
    renderUnknownWords(unknownWords);
    // Update learning badge count
    loadWords();
  });
});

refreshBtn.addEventListener('click', () => {
  loadUnknownWords();
});

// ============================================================
// Persistent word lists (learning / familiar)
// ============================================================

function loadWords(): void {
  store.getWords(currentLang).then(renderWords);
}

function saveWords(words: WordEntry[]): void {
  store.setWords(currentLang, words);
}

function renderWords(words: WordEntry[]): void {
  learningList.innerHTML = '';
  familiarList.innerHTML = '';

  const learningWords: WordEntry[] = [];
  const familiarWords: WordEntry[] = [];

  words.forEach((entry) => {
    const status = entry.status || 'familiar';
    if (status === 'learning') {
      learningWords.push(entry);
    } else {
      familiarWords.push(entry);
    }
  });

  learningCount.textContent = String(learningWords.length);
  familiarCount.textContent = String(familiarWords.length);

  // Only update toolbar if not on the unknown tab
  if (activeTab !== 'unknown') {
    const activeCount =
      activeTab === 'learning' ? learningWords.length : familiarWords.length;
    wordCount.textContent = `${words.length} word${
      words.length !== 1 ? 's' : ''
    } total`;
    emptyState.style.display = words.length === 0 ? 'block' : 'none';
    listActions.style.display = activeCount > 0 ? '' : 'none';
    refreshBtn.style.display = 'none';
    copyBtn.style.display = '';
    downloadBtn.style.display = '';
  }

  learningWords.forEach((entry) => {
    learningList.appendChild(createWordLi(entry, 'learning'));
  });

  familiarWords.forEach((entry) => {
    familiarList.appendChild(createWordLi(entry, 'familiar'));
  });
}

function createWordLi(entry: WordEntry, status: WordStatus): HTMLLIElement {
  const li = document.createElement('li');
  const dotColor = status === 'learning' ? '#e65100' : '#4CAF50';
  const actionBtn =
    status === 'learning'
      ? `<button class="promote-btn" data-word="${escapeHtml(
          entry.word
        )}" title="Mark as familiar">&#x2713;</button>`
      : `<button class="demote-btn" data-word="${escapeHtml(
          entry.word
        )}" title="Move back to learning">&#x21A9;</button>`;

  li.innerHTML = `
    <div class="word-info">
      <strong>
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dotColor};margin-right:6px;"></span>${escapeHtml(
    entry.word
  )}
      </strong>
    </div>
    <div class="word-actions">
      ${actionBtn}
      <button class="delete-btn" data-word="${escapeHtml(
        entry.word
      )}">&times;</button>
    </div>
  `;
  return li;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Handle promote, demote, and delete using word as identifier
function handleWordAction(
  action: 'promote' | 'demote' | 'delete',
  targetWord: string
): void {
  store.getWords(currentLang).then((words) => {
    let updated: WordEntry[];
    if (action === 'promote') {
      updated = words.map((e) =>
        e.word.toLowerCase() === targetWord
          ? { ...e, status: 'familiar' as const }
          : e
      );
    } else if (action === 'demote') {
      updated = words.map((e) =>
        e.word.toLowerCase() === targetWord
          ? { ...e, status: 'learning' as const }
          : e
      );
    } else {
      updated = words.filter((e) => e.word.toLowerCase() !== targetWord);
    }
    saveWords(updated);
    renderWords(updated);
  });
}

learningList.addEventListener('click', (e: MouseEvent) => {
  const btn = (e.target as HTMLElement).closest('button');
  if (!btn) return;
  const word = btn.dataset.word?.toLowerCase();
  if (!word) return;
  if (btn.classList.contains('promote-btn')) {
    handleWordAction('promote', word);
  } else if (btn.classList.contains('delete-btn')) {
    handleWordAction('delete', word);
  }
});

familiarList.addEventListener('click', (e: MouseEvent) => {
  const btn = (e.target as HTMLElement).closest('button');
  if (!btn) return;
  const word = btn.dataset.word?.toLowerCase();
  if (!word) return;
  if (btn.classList.contains('demote-btn')) {
    handleWordAction('demote', word);
  } else if (btn.classList.contains('delete-btn')) {
    handleWordAction('delete', word);
  }
});

// Language setting — load and handle changes
chrome.storage.local.get(
  { language: 'en', words: null, words_en: null },
  (data: Record<string, unknown>) => {
    // Migration: move old `words` key to `words_en`
    if (data.words !== null && data.words_en === null) {
      store.set('words_en', data.words as WordEntry[]);
      store.remove('words');
    }

    currentLang = (data.language as Language) || 'en';
    languageSelect.value = currentLang;
    loadWords();
    loadUnknownWords();
  }
);

languageSelect.addEventListener('change', () => {
  currentLang = languageSelect.value as Language;
  store.set('language', currentLang);
  loadWords();
  if (activeTab === 'unknown') loadUnknownWords();
});

// CEFR level setting
chrome.storage.local.get(
  { cefrLevel: null, commonWordThreshold: null },
  (data: Record<string, unknown>) => {
    if (!data.cefrLevel && data.commonWordThreshold) {
      // Migrate old threshold to CEFR level
      const map: Record<number, CefrLevel> = {
        1000: 'A2',
        2000: 'B1',
        3000: 'B2',
        5000: 'C1',
        7000: 'C2',
        10000: 'C2',
      };
      const level = (map[data.commonWordThreshold as number] || 'B2') as CefrLevel;
      store.set('cefrLevel', level);
      store.remove('commonWordThreshold');
      cefrLevelSelect.value = level;
    } else {
      cefrLevelSelect.value = (data.cefrLevel as CefrLevel) || 'B2';
    }
  }
);

cefrLevelSelect.addEventListener('change', () => {
  store.set('cefrLevel', cefrLevelSelect.value as CefrLevel);
});

// Copy and Download handlers
function getActiveWords(callback: (words: string[]) => void): void {
  if (activeTab === 'unknown') {
    callback([...unknownWords]);
    return;
  }
  store.getWords(currentLang).then((words) => {
    const filtered = words
      .filter((e) => (e.status || 'familiar') === activeTab)
      .map((e) => e.word);
    callback(filtered);
  });
}

copyBtn.addEventListener('click', () => {
  getActiveWords((words) => {
    if (words.length === 0) return;
    navigator.clipboard.writeText(words.join('\n')).then(() => {
      const original = copyBtn.innerHTML;
      copyBtn.textContent = '\u2713';
      setTimeout(() => {
        copyBtn.innerHTML = original;
      }, 1500);
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
    a.download = activeTab + '-words-' + currentLang + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  });
});

// Load page stats from active tab's content script
const pageStatsEl = document.getElementById('pageStats') as HTMLDivElement;
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs[0]?.id) return;
  chrome.tabs.sendMessage(
    tabs[0].id,
    { type: 'getPageStats' },
    (response: PageStatsResponse | undefined) => {
      if (chrome.runtime.lastError || !response) {
        pageStatsEl.style.display = 'none';
        return;
      }
      pageStatsEl.innerHTML =
        '<span class="stat"><span class="dot" style="background:#5e35b1;"></span><strong style="color:#5e35b1;">' +
        response.unfamiliar +
        '</strong><span class="label">unfamiliar</span></span>' +
        '<span class="stat"><span class="dot" style="background:#e65100;"></span><strong style="color:#e65100;">' +
        response.learning +
        '</strong><span class="label">learning</span></span>' +
        '<span class="stat"><span class="dot" style="background:#4CAF50;"></span><strong style="color:#4CAF50;">' +
        response.familiar +
        '</strong><span class="label">familiar</span></span>';
    }
  );
});
