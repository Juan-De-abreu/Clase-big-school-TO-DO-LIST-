'use strict';

const STORAGE_KEY = 'study-diary-sessions';
const RANGE_STORAGE_KEY = 'study-diary-heatmap-range';
const WEEKLY_GOAL_MINUTES = 600; // 10h = meta semanal
const WEEKDAY_LABELS = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo'
];

const logic = window.StudyLogic;

const dateInput = document.getElementById('dateInput');
const topicInput = document.getElementById('topicInput');
const minutesInput = document.getElementById('minutesInput');
const form = document.getElementById('sessionForm');
const streakValue = document.getElementById('streakValue');
const bestStreakValue = document.getElementById('bestStreakValue');
const sessionsList = document.getElementById('sessionsList');
const emptyMessage = document.getElementById('emptyMessage');
const sessionCount = document.getElementById('sessionCount');
const weeklyMinutes = document.getElementById('weeklyMinutes');
const weeklyHours = document.getElementById('weeklyHours');
const weeklyProgress = document.getElementById('weeklyProgress');
const monthlyValue = document.getElementById('monthlyValue');
const heatmapGrid = document.getElementById('heatmapGrid');
const heatmapScroll = document.getElementById('heatmapScroll');
const heatmapTooltip = document.getElementById('heatmapTooltip');
const clearFilterBtn = document.getElementById('clearFilterBtn');
const sessionsTitle = document.getElementById('sessionsTitle');
const rangeButtons = Array.from(document.querySelectorAll('.heatmap-range-btn'));

let activePreset = readStoredPreset();
let activeFilterDate = null;
let heatmapData = null;
let focusedCell = null;
let lastPointerType = 'mouse';
let lastTapDate = null;
let suppressScrollHide = false;

function getTodayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function readStoredPreset() {
  try {
    return logic.normalizeHeatmapPreset(localStorage.getItem(RANGE_STORAGE_KEY));
  } catch {
    return logic.DEFAULT_HEATMAP_PRESET;
  }
}

function saveStoredPreset(preset) {
  try {
    localStorage.setItem(RANGE_STORAGE_KEY, preset);
  } catch {
    // La preferencia es opcional: si no se puede guardar, se mantiene en memoria.
  }
}

function loadSessions() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Si no se puede guardar, la app sigue funcionando sin persistir.
  }
}

function renderWeekly(sessions, today) {
  const minutes = logic.calculateWeeklyMinutes(sessions, today);
  const pct = Math.min((minutes / WEEKLY_GOAL_MINUTES) * 100, 100);

  weeklyMinutes.textContent = `${minutes} min`;
  weeklyHours.textContent = logic.formatHoursMinutes(minutes);
  weeklyHours.hidden = minutes === 0;

  weeklyProgress.style.width = `${pct}%`;
  weeklyProgress.setAttribute('aria-valuenow', minutes);
}

function renderMonthly(sessions, today) {
  monthlyValue.textContent = logic.calculateMonthlyStudyDays(sessions, today);
}

function renderStreak(sessions, today) {
  streakValue.textContent = logic.calculateStreak(sessions, today);
  bestStreakValue.textContent = logic.calculateBestStreak(sessions);
}

function renderSessions(sessions) {
  const visible = activeFilterDate
    ? logic.filterSessionsByDate(sessions, activeFilterDate)
    : sessions;

  sessionsList.innerHTML = '';
  sessionCount.textContent = visible.length;
  clearFilterBtn.hidden = activeFilterDate === null;

  if (activeFilterDate !== null) {
    const filterDate = logic.parseLocalDate(activeFilterDate);
    clearFilterBtn.setAttribute(
      'aria-label',
      `Limpiar filtro del ${logic.formatDateForAccessibleLabel(filterDate)}`
    );
  } else {
    clearFilterBtn.removeAttribute('aria-label');
  }

  if (visible.length === 0) {
    emptyMessage.textContent = sessions.length === 0
      ? 'No hay sesiones aún. Empieza a estudiar.'
      : 'No hay sesiones en este día.';
    emptyMessage.hidden = false;
    return;
  }

  emptyMessage.hidden = true;

  const sorted = logic.sortSessionsByDateDesc(visible);

  sorted.forEach((session) => {
    const date = logic.parseLocalDate(session.date);
    const li = document.createElement('li');
    li.className = 'session-item';
    li.dataset.id = session.id;
    li.innerHTML = `
      <div class="session-info">
        <span class="session-date">${date ? logic.formatDateForDisplay(date) : session.date}</span>
        <span class="session-topic">${escapeHtml(session.topic)}</span>
      </div>
      <div class="session-actions">
        <span class="session-minutes">${session.minutes} min</span>
        <button type="button" class="session-delete" aria-label="Eliminar sesión" data-id="${session.id}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
    `;
    sessionsList.appendChild(li);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function buildCellLabel(cell) {
  const date = logic.parseLocalDate(cell.key);
  const dateLabel = logic.formatDateForAccessibleLabel(date);
  return cell.minutes > 0
    ? `${dateLabel}: ${cell.minutes} minutos`
    : `${dateLabel}: sin sesiones`;
}

function getCellElement(row, col) {
  return heatmapGrid.querySelector(
    `.heatmap-cell[data-row="${row}"][data-col="${col}"]`
  );
}

function renderHeatmap({ scrollToEnd = false, restoreFocus = false } = {}) {
  if (!heatmapData) return;

  const previousScroll = heatmapScroll.scrollLeft;
  const previousFocus = focusedCell;
  const todayKey = logic.formatDateForInput(heatmapData.end);
  const weeks = heatmapData.weeks;
  const fragment = document.createDocumentFragment();
  const tbody = document.createElement('tbody');

  tbody.setAttribute('role', 'rowgroup');

  for (let row = 0; row < 7; row += 1) {
    const tr = document.createElement('tr');
    tr.setAttribute('role', 'row');
    tr.setAttribute('aria-rowindex', String(row + 1));
    tr.setAttribute('aria-label', WEEKDAY_LABELS[row]);

    for (let col = 0; col < weeks.length; col += 1) {
      const cell = weeks[col][row];

      if (!cell) {
        const padding = document.createElement('td');
        padding.className = 'heatmap-cell is-padding';
        padding.setAttribute('role', 'presentation');
        padding.setAttribute('aria-hidden', 'true');
        tr.appendChild(padding);
        continue;
      }

      const td = document.createElement('td');
      td.className = `heatmap-cell heat-level-${cell.level}`;
      td.dataset.row = String(row);
      td.dataset.col = String(col);
      td.dataset.date = cell.key;
      td.dataset.minutes = String(cell.minutes);
      td.setAttribute('role', 'gridcell');
      td.setAttribute('aria-colindex', String(col + 1));
      td.setAttribute('aria-label', buildCellLabel(cell));
      td.setAttribute('aria-selected', activeFilterDate === cell.key ? 'true' : 'false');

      if (cell.key === todayKey) {
        td.classList.add('is-today');
        td.dataset.today = 'true';
      }

      if (activeFilterDate === cell.key) {
        td.classList.add('is-selected');
      }

      td.tabIndex = -1;
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  fragment.appendChild(tbody);
  heatmapGrid.replaceChildren(fragment);
  heatmapGrid.setAttribute('aria-rowcount', '7');
  heatmapGrid.setAttribute('aria-colcount', String(weeks.length));
  heatmapGrid.setAttribute(
    'aria-label',
    `Mapa de calor de constancia, ${weeks.length} semanas`
  );

  const dataCells = heatmapGrid.querySelectorAll('.heatmap-cell[data-date]');
  const lastCell = dataCells[dataCells.length - 1];
  const todayCell = heatmapGrid.querySelector(`[data-date="${todayKey}"]`);
  const focusTarget = (previousFocus && getCellElement(previousFocus.row, previousFocus.col))
    || todayCell
    || lastCell;

  heatmapGrid
    .querySelectorAll('.heatmap-cell[tabindex="0"]')
    .forEach((element) => {
      element.tabIndex = -1;
    });

  if (focusTarget) {
    focusTarget.tabIndex = 0;
  }

  if (restoreFocus && previousFocus) {
    const target = getCellElement(previousFocus.row, previousFocus.col);
    if (target) {
      target.tabIndex = 0;
      target.focus({ preventScroll: true });
    }
  }

  heatmapScroll.scrollLeft = scrollToEnd ? heatmapScroll.scrollWidth : previousScroll;
}

function updateRangeButtons() {
  rangeButtons.forEach((button) => {
    const isActive = button.dataset.preset === activePreset;
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    button.classList.toggle('is-active', isActive);
  });
}

function renderAll({ scrollToEnd = false } = {}) {
  const sessions = loadSessions();
  const today = getTodayLocal();
  const gridHadFocus = heatmapGrid.contains(document.activeElement);

  renderStreak(sessions, today);
  renderWeekly(sessions, today);
  renderMonthly(sessions, today);

  heatmapData = logic.calculateHeatmap(sessions, today, activePreset);
  renderHeatmap({ scrollToEnd, restoreFocus: gridHadFocus });
  renderSessions(sessions);
  updateRangeButtons();
}

function focusSessionsHeading() {
  sessionsTitle.focus();
}

function clearFilter({ moveFocus = false } = {}) {
  hideTooltip();

  if (activeFilterDate === null) {
    if (moveFocus) focusSessionsHeading();
    return;
  }

  activeFilterDate = null;
  renderAll({ scrollToEnd: false });

  if (moveFocus) {
    focusSessionsHeading();
  }
}

function activateCell(cell) {
  const dateKey = cell.dataset.date;
  const minutes = Number(cell.dataset.minutes);

  if (!dateKey || !Number.isFinite(minutes) || minutes <= 0) {
    return;
  }

  focusedCell = {
    row: Number(cell.dataset.row),
    col: Number(cell.dataset.col)
  };
  activeFilterDate = dateKey;
  renderAll({ scrollToEnd: false });
}

function updateRovingTabindex(cell) {
  heatmapGrid
    .querySelectorAll('.heatmap-cell[tabindex="0"]')
    .forEach((element) => {
      element.tabIndex = -1;
    });
  cell.tabIndex = 0;
}

function focusCell(row, col) {
  const cell = getCellElement(row, col);
  if (!cell) return;

  focusedCell = { row, col };
  updateRovingTabindex(cell);
  cell.focus({ preventScroll: true });

  suppressScrollHide = true;

  if (typeof cell.scrollIntoView === 'function') {
    cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  showTooltip(cell);
  window.setTimeout(() => {
    suppressScrollHide = false;
  }, 150);
}

function showTooltip(cell) {
  const date = logic.parseLocalDate(cell.dataset.date);
  if (!date) return;

  const minutes = Number(cell.dataset.minutes);
  heatmapTooltip.textContent = `${logic.formatDateForDisplay(date)} — ${minutes} min`;
  heatmapTooltip.hidden = false;

  const rect = cell.getBoundingClientRect();
  const tooltipRect = heatmapTooltip.getBoundingClientRect();
  const margin = 8;
  let top = rect.top - tooltipRect.height - margin;
  let left = rect.left + rect.width / 2 - tooltipRect.width / 2;

  if (top < margin) {
    top = rect.bottom + margin;
  }

  top = Math.min(top, window.innerHeight - tooltipRect.height - margin);
  left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin));

  heatmapTooltip.style.top = `${Math.max(margin, top)}px`;
  heatmapTooltip.style.left = `${left}px`;
}

function hideTooltip() {
  heatmapTooltip.hidden = true;
  lastTapDate = null;
}

function deleteSession(id) {
  const sessions = loadSessions().filter((session) => session.id !== id);
  saveSessions(sessions);

  activeFilterDate = logic.nextFilterAfterDelete(activeFilterDate, sessions);
  focusedCell = null;
  renderAll({ scrollToEnd: false });
  focusSessionsHeading();
}

function generateId() {
  return Date.now() + Math.random();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const date = dateInput.value;
  const topic = topicInput.value.trim();
  const minutes = Number.parseInt(minutesInput.value, 10);

  if (!logic.parseLocalDate(date) || !topic || !Number.isFinite(minutes) || minutes < 1) {
    return;
  }

  const sessions = loadSessions();
  sessions.push({
    id: generateId(),
    date,
    topic,
    minutes
  });
  saveSessions(sessions);

  if (logic.shouldClearFilterAfterSave(activeFilterDate, date)) {
    activeFilterDate = null;
    focusedCell = null;
  }

  topicInput.value = '';
  minutesInput.value = '';
  dateInput.value = logic.formatDateForInput(getTodayLocal());

  renderAll({ scrollToEnd: false });
  topicInput.focus();
});

sessionsList.addEventListener('click', (event) => {
  const button = event.target instanceof Element
    ? event.target.closest('.session-delete')
    : null;

  if (!button) return;

  event.stopPropagation();
  deleteSession(Number(button.dataset.id));
});

rangeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const preset = logic.normalizeHeatmapPreset(button.dataset.preset);
    if (preset === activePreset) return;

    activePreset = preset;
    saveStoredPreset(preset);
    activeFilterDate = null;
    focusedCell = null;
    hideTooltip();
    renderAll({ scrollToEnd: true });
    button.focus({ preventScroll: true });
  });
});

clearFilterBtn.addEventListener('click', () => {
  clearFilter({ moveFocus: true });
});

heatmapGrid.addEventListener('focusin', (event) => {
  const cell = event.target.closest('.heatmap-cell[data-date]');
  if (!cell) return;

  focusedCell = {
    row: Number(cell.dataset.row),
    col: Number(cell.dataset.col)
  };
  updateRovingTabindex(cell);
  showTooltip(cell);
});

heatmapGrid.addEventListener('focusout', (event) => {
  if (event.relatedTarget instanceof Node && heatmapGrid.contains(event.relatedTarget)) {
    return;
  }
  hideTooltip();
});

heatmapGrid.addEventListener('pointerover', (event) => {
  if (event.pointerType !== 'mouse') return;

  const cell = event.target.closest('.heatmap-cell[data-date]');
  if (cell) showTooltip(cell);
});

heatmapGrid.addEventListener('pointerout', (event) => {
  if (event.pointerType !== 'mouse') return;

  const cell = event.target.closest('.heatmap-cell[data-date]');
  if (!cell) return;

  if (event.relatedTarget instanceof Node && cell.contains(event.relatedTarget)) {
    return;
  }

  if (document.activeElement === cell) return;
  hideTooltip();
});

heatmapGrid.addEventListener('mouseleave', () => {
  if (!heatmapGrid.contains(document.activeElement)) {
    hideTooltip();
  }
});

heatmapGrid.addEventListener('click', (event) => {
  const cell = event.target.closest('.heatmap-cell[data-date]');
  if (!cell) return;

  if (lastPointerType === 'touch') {
    if (lastTapDate === cell.dataset.date) {
      lastTapDate = null;
      activateCell(cell);
    } else {
      lastTapDate = cell.dataset.date;
      showTooltip(cell);
    }
    return;
  }

  activateCell(cell);
});

heatmapGrid.addEventListener('keydown', (event) => {
  const cell = event.target.closest('.heatmap-cell[data-date]');
  if (!cell) return;

  const directions = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right'
  };

  if (directions[event.key]) {
    event.preventDefault();
    const next = logic.getAdjacentHeatmapCell(
      heatmapData.weeks,
      Number(cell.dataset.row),
      Number(cell.dataset.col),
      directions[event.key]
    );

    if (next) focusCell(next.row, next.col);
    return;
  }

  if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault();
    activateCell(cell);
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    clearFilter({ moveFocus: false });
    hideTooltip();
  }
});

document.addEventListener('pointerdown', (event) => {
  lastPointerType = event.pointerType || 'mouse';

  const target = event.target instanceof Element ? event.target : null;
  if (!target || !target.closest('.heatmap-cell[data-date]')) {
    hideTooltip();
  }
}, true);

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;

  if (activeFilterDate !== null) {
    clearFilter({ moveFocus: false });
  }

  hideTooltip();
});

heatmapScroll.addEventListener('scroll', () => {
  if (suppressScrollHide) return;
  hideTooltip();
}, { passive: true });

window.addEventListener('scroll', () => {
  if (suppressScrollHide) return;
  hideTooltip();
}, { passive: true });

window.addEventListener('resize', () => {
  hideTooltip();
});

dateInput.value = logic.formatDateForInput(getTodayLocal());
renderAll({ scrollToEnd: true });
