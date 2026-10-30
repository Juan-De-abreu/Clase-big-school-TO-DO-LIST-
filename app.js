const STORAGE_KEY = 'study-diary-sessions';

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

const WEEKLY_GOAL_MINUTES = 600; // 10h = meta semanal

function getTodayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateForDisplay(date) {
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}

function loadSessions() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function getUniqueSessionDates(sessions) {
  const dates = new Set();
  sessions.forEach(session => {
    const date = parseLocalDate(session.date);
    dates.add(date.getTime());
  });
  return Array.from(dates).map(ts => new Date(ts)).sort((a, b) => b - a);
}

function calculateStreak(sessions) {
  const today = getTodayLocal();
  const sessionDates = getUniqueSessionDates(sessions);

  if (sessionDates.length === 0) return 0;

  const todayHasSession = sessionDates.some(d => d.getTime() === today.getTime());

  let streak = 0;
  let checkDate = today;

  if (!todayHasSession) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayHasSession = sessionDates.some(d => d.getTime() === yesterday.getTime());
    if (!yesterdayHasSession) return 0;
    checkDate = yesterday;
  }

  while (true) {
    const hasSession = sessionDates.some(d => d.getTime() === checkDate.getTime());
    if (!hasSession) break;
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

function calculateBestStreak(sessions) {
  const dates = getUniqueSessionDates(sessions);
  if (dates.length === 0) return 0;

  let best = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const diff = (dates[i - 1].getTime() - dates[i].getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      current++;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }
  return best;
}

function getWeekRange() {
  const today = getTodayLocal();
  const day = today.getDay(); // 0=dom, 1=lun...
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday, sunday };
}

function calculateWeeklyMinutes(sessions) {
  const { monday, sunday } = getWeekRange();
  return sessions
    .filter(s => {
      const d = parseLocalDate(s.date);
      return d >= monday && d <= sunday;
    })
    .reduce((sum, s) => sum + s.minutes, 0);
}

function getMonthRange() {
  const today = getTodayLocal();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { firstDay, lastDay };
}

function calculateMonthlyStudyDays(sessions) {
  const { firstDay, lastDay } = getMonthRange();
  const uniqueDates = new Set();
  
  sessions.forEach(s => {
    const d = parseLocalDate(s.date);
    if (d >= firstDay && d <= lastDay) {
      uniqueDates.add(d.getTime());
    }
  });
  return uniqueDates.size;
}

function formatHoursMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

function renderWeekly(sessions) {
  const minutes = calculateWeeklyMinutes(sessions);
  const pct = Math.min((minutes / WEEKLY_GOAL_MINUTES) * 100, 100);
  
  weeklyMinutes.textContent = `${minutes} min`;
  weeklyHours.textContent = formatHoursMinutes(minutes);
  weeklyHours.hidden = minutes === 0;
  
  weeklyProgress.style.width = `${pct}%`;
  weeklyProgress.setAttribute('aria-valuenow', minutes);
}

function renderMonthly(sessions) {
  const days = calculateMonthlyStudyDays(sessions);
  monthlyValue.textContent = days;
}

function renderStreak(sessions) {
  const streak = calculateStreak(sessions);
  const bestStreak = calculateBestStreak(sessions);
  streakValue.textContent = streak;
  bestStreakValue.textContent = bestStreak;
}

function renderSessions(sessions) {
  sessionsList.innerHTML = '';
  sessionCount.textContent = sessions.length;

  if (sessions.length === 0) {
    emptyMessage.hidden = false;
    return;
  }

  emptyMessage.hidden = true;

  const sorted = [...sessions].sort((a, b) => {
    const dateA = parseLocalDate(a.date).getTime();
    const dateB = parseLocalDate(b.date).getTime();
    if (dateB !== dateA) return dateB - dateA;
    return b.id - a.id;
  });

  sorted.forEach(session => {
    const date = parseLocalDate(session.date);
    const li = document.createElement('li');
    li.className = 'session-item';
    li.dataset.id = session.id;
    li.innerHTML = `
      <div class="session-info">
        <span class="session-date">${formatDateForDisplay(date)}</span>
        <span class="session-topic">${escapeHtml(session.topic)}</span>
      </div>
      <div style="display: flex; align-items: center; gap: var(--space-2);">
        <span class="session-minutes">${session.minutes} min</span>
        <button class="session-delete" aria-label="Eliminar sesión" data-id="${session.id}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

  // Event delegation for delete buttons
  sessionsList.querySelectorAll('.session-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      deleteSession(id);
    });
  });
}

function deleteSession(id) {
  const sessions = loadSessions().filter(s => s.id !== id);
  saveSessions(sessions);
  renderAll();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderAll() {
  const sessions = loadSessions();
  renderStreak(sessions);
  renderWeekly(sessions);
  renderMonthly(sessions);
  renderSessions(sessions);
}

function generateId() {
  return Date.now() + Math.random();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const date = dateInput.value;
  const topic = topicInput.value.trim();
  const minutes = parseInt(minutesInput.value, 10);

  if (!date || !topic || !minutes || minutes < 1) return;

  const sessions = loadSessions();
  sessions.push({
    id: generateId(),
    date,
    topic,
    minutes
  });
  saveSessions(sessions);

  topicInput.value = '';
  minutesInput.value = '';
  dateInput.value = formatDateForInput(getTodayLocal());

  renderAll();
  topicInput.focus();
});

dateInput.value = formatDateForInput(getTodayLocal());
renderAll();