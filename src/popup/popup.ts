// ============================================================
// Popup script for Vocabulary Builder extension
// ============================================================

import type {
  Language,
  CefrLevel,
  WordEntry,
  WordStatus,
  PageStatsResponse,
} from '../types';

// Language selector
const languageSelect = document.getElementById('language') as HTMLSelectElement;
let currentLang: Language = 'en';

function getWordsKey(): `words_${Language}` {
  return `words_${currentLang}`;
}

// Highlight toggle
const highlightToggle = document.getElementById(
  'highlightToggle'
) as HTMLInputElement;

chrome.storage.local.get(
  { highlightEnabled: true },
  (data: { highlightEnabled?: boolean }) => {
    highlightToggle.checked = data.highlightEnabled ?? true;
  }
);

highlightToggle.addEventListener('change', () => {
  chrome.storage.local.set({ highlightEnabled: highlightToggle.checked });
});

const learningList = document.getElementById(
  'learningList'
) as HTMLUListElement;
const familiarList = document.getElementById(
  'familiarList'
) as HTMLUListElement;
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
const copyBtn = document.getElementById('copyBtn') as HTMLButtonElement;
const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;

let activeTab: WordStatus = 'learning';

// Tab switching
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    activeTab = (tab as HTMLElement).dataset.tab as WordStatus;
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    learningList.style.display = activeTab === 'learning' ? '' : 'none';
    familiarList.style.display = activeTab === 'familiar' ? '' : 'none';
    loadWords();
  });
});

function loadWords(): void {
  const key = getWordsKey();
  chrome.storage.local.get(
    { [key]: [] },
    (data: Record<string, WordEntry[]>) => {
      renderWords(data[key]);
    }
  );
}

function saveWords(words: WordEntry[]): void {
  const key = getWordsKey();
  chrome.storage.local.set({ [key]: words });
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
  wordCount.textContent = `${words.length} word${
    words.length !== 1 ? 's' : ''
  } total`;
  emptyState.style.display = words.length === 0 ? 'block' : 'none';

  const activeCount =
    activeTab === 'learning' ? learningWords.length : familiarWords.length;
  listActions.style.display = activeCount > 0 ? '' : 'none';

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
  const key = getWordsKey();
  chrome.storage.local.get(
    { [key]: [] },
    (data: Record<string, WordEntry[]>) => {
      let words = data[key];
      if (action === 'promote') {
        words = words.map((e) =>
          e.word.toLowerCase() === targetWord
            ? { ...e, status: 'familiar' as const }
            : e
        );
      } else if (action === 'demote') {
        words = words.map((e) =>
          e.word.toLowerCase() === targetWord
            ? { ...e, status: 'learning' as const }
            : e
        );
      } else if (action === 'delete') {
        words = words.filter((e) => e.word.toLowerCase() !== targetWord);
      }
      saveWords(words);
      renderWords(words);
    }
  );
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
      chrome.storage.local.set({ words_en: data.words });
      chrome.storage.local.remove('words');
    }

    currentLang = (data.language as Language) || 'en';
    languageSelect.value = currentLang;
    loadWords();
  }
);

languageSelect.addEventListener('change', () => {
  currentLang = languageSelect.value as Language;
  chrome.storage.local.set({ language: currentLang });
  loadWords();
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
      const level = map[data.commonWordThreshold as number] || 'B2';
      chrome.storage.local.set({ cefrLevel: level });
      chrome.storage.local.remove('commonWordThreshold');
      cefrLevelSelect.value = level;
    } else {
      cefrLevelSelect.value = (data.cefrLevel as CefrLevel) || 'B2';
    }
  }
);

cefrLevelSelect.addEventListener('change', () => {
  chrome.storage.local.set({ cefrLevel: cefrLevelSelect.value });
});

// Copy and Download handlers
function getActiveWords(callback: (words: string[]) => void): void {
  const key = getWordsKey();
  chrome.storage.local.get(
    { [key]: [] },
    (data: Record<string, WordEntry[]>) => {
      const filtered = data[key]
        .filter((e) => (e.status || 'familiar') === activeTab)
        .map((e) => e.word);
      callback(filtered);
    }
  );
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
