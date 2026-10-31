(function (root, factory) {
  'use strict';

  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }

  root.StudyLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const DEFAULT_HEATMAP_PRESET = '12w';
  const HEATMAP_PRESETS = Object.freeze(['4w', '12w', '26w', '52w', 'year']);
  const WEEKS_BY_PRESET = Object.freeze({
    '4w': 4,
    '12w': 12,
    '26w': 26,
    '52w': 52
  });
  const HEATMAP_REFERENCE_MINUTES = 480;

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function parseLocalDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    if (year >= 0 && year < 100) {
      date.setFullYear(year);
    }

    date.setHours(0, 0, 0, 0);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDateForDisplay(date) {
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  }

  function formatDateForAccessibleLabel(date) {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function startOfWeek(date) {
    const day = startOfDay(date);
    return addDays(day, -((day.getDay() + 6) % 7));
  }

  function dayNumber(date) {
    const utc = new Date(0);
    utc.setUTCHours(0, 0, 0, 0);
    utc.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.floor(utc.getTime() / MS_PER_DAY);
  }

  function daysBetween(first, second) {
    return dayNumber(second) - dayNumber(first);
  }

  function getWeekRange(today) {
    const monday = startOfWeek(today);
    return { monday, sunday: addDays(monday, 6) };
  }

  function getMonthRange(today) {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { firstDay, lastDay };
  }

  function getUniqueSessionDayNumbers(sessions) {
    const days = new Set();

    (sessions || []).forEach((session) => {
      const date = parseLocalDate(session && session.date);
      if (date) {
        days.add(dayNumber(date));
      }
    });

    return Array.from(days);
  }

  function calculateStreak(sessions, today) {
    const days = new Set(getUniqueSessionDayNumbers(sessions));
    const todayNumber = dayNumber(today);

    let cursor = todayNumber;
    if (!days.has(cursor)) {
      cursor -= 1;
      if (!days.has(cursor)) {
        return 0;
      }
    }

    let streak = 0;
    while (days.has(cursor)) {
      streak += 1;
      cursor -= 1;
    }

    return streak;
  }

  function calculateBestStreak(sessions) {
    const sorted = getUniqueSessionDayNumbers(sessions).sort((a, b) => a - b);

    if (sorted.length === 0) {
      return 0;
    }

    let best = 1;
    let current = 1;

    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index] === sorted[index - 1] + 1) {
        current += 1;
      } else {
        current = 1;
      }

      if (current > best) {
        best = current;
      }
    }

    return best;
  }

  function calculateWeeklyMinutes(sessions, today) {
    const { monday, sunday } = getWeekRange(today);
    const start = dayNumber(monday);
    const end = dayNumber(sunday);
    let total = 0;

    (sessions || []).forEach((session) => {
      const date = parseLocalDate(session && session.date);
      if (!date) {
        return;
      }

      const number = dayNumber(date);
      const minutes = Number(session.minutes);

      if (number >= start && number <= end && Number.isFinite(minutes) && minutes > 0) {
        total += minutes;
      }
    });

    return total;
  }

  function calculateMonthlyStudyDays(sessions, today) {
    const { firstDay, lastDay } = getMonthRange(today);
    const start = dayNumber(firstDay);
    const end = dayNumber(lastDay);
    const uniqueDays = new Set();

    (sessions || []).forEach((session) => {
      const date = parseLocalDate(session && session.date);
      if (!date) {
        return;
      }

      const number = dayNumber(date);
      if (number >= start && number <= end) {
        uniqueDays.add(number);
      }
    });

    return uniqueDays.size;
  }

  function sortSessionsByDateDesc(sessions) {
    return [...(sessions || [])].sort((first, second) => {
      const firstDate = parseLocalDate(first && first.date);
      const secondDate = parseLocalDate(second && second.date);
      const firstNumber = firstDate ? dayNumber(firstDate) : -Infinity;
      const secondNumber = secondDate ? dayNumber(secondDate) : -Infinity;

      if (firstNumber > secondNumber) {
        return -1;
      }
      if (firstNumber < secondNumber) {
        return 1;
      }

      const firstId = Number(first && first.id);
      const secondId = Number(second && second.id);
      const safeFirst = Number.isFinite(firstId) ? firstId : 0;
      const safeSecond = Number.isFinite(secondId) ? secondId : 0;
      return safeSecond - safeFirst;
    });
  }

  function formatHoursMinutes(totalMinutes) {
    const minutes = Number(totalMinutes);
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;

    if (hours === 0) {
      return `${remainder} min`;
    }
    if (remainder === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainder}min`;
  }

  function weeksForPreset(preset) {
    return WEEKS_BY_PRESET[preset] || null;
  }

  function normalizeHeatmapPreset(value) {
    return HEATMAP_PRESETS.includes(value) ? value : DEFAULT_HEATMAP_PRESET;
  }

  function getHeatmapRange(preset, today) {
    const normalized = normalizeHeatmapPreset(preset);
    const end = startOfDay(today);

    if (normalized === 'year') {
      return {
        start: new Date(end.getFullYear(), 0, 1),
        end
      };
    }

    const weeks = weeksForPreset(normalized);
    const start = addDays(startOfWeek(end), -(weeks - 1) * 7);
    return { start, end };
  }

  function getHeatmapLevel(minutes) {
    const value = Number(minutes);

    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }

    const level = 1 + Math.floor(
      (4 * Math.log(value + 1)) / Math.log(HEATMAP_REFERENCE_MINUTES + 1)
    );

    return Math.min(5, level);
  }

  function aggregateMinutesByDay(sessions, start, end) {
    const minutesByDay = new Map();
    const startNumber = dayNumber(start);
    const endNumber = dayNumber(end);

    (sessions || []).forEach((session) => {
      const date = parseLocalDate(session && session.date);
      if (!date) {
        return;
      }

      const number = dayNumber(date);
      if (number < startNumber || number > endNumber) {
        return;
      }

      const minutes = Number(session.minutes);
      if (!Number.isFinite(minutes) || minutes <= 0) {
        return;
      }

      const key = formatDateForInput(date);
      minutesByDay.set(key, (minutesByDay.get(key) || 0) + minutes);
    });

    return minutesByDay;
  }

  function buildHeatmapWeeks(start, end, minutesByDay) {
    const startDate = startOfDay(start);
    const endDate = startOfDay(end);

    if (dayNumber(endDate) < dayNumber(startDate)) {
      return [];
    }

    const gridStart = startOfWeek(startDate);
    const startNumber = dayNumber(startDate);
    const endNumber = dayNumber(endDate);
    const totalWeeks = Math.floor(daysBetween(gridStart, endDate) / 7) + 1;
    const weeks = [];

    for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex += 1) {
      const week = [];

      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const date = addDays(gridStart, weekIndex * 7 + dayIndex);
        const number = dayNumber(date);

        if (number < startNumber || number > endNumber) {
          week.push(null);
          continue;
        }

        const key = formatDateForInput(date);
        const minutes = minutesByDay.get(key) || 0;
        week.push({
          key,
          date,
          minutes,
          level: getHeatmapLevel(minutes)
        });
      }

      weeks.push(week);
    }

    return weeks;
  }

  function calculateHeatmap(sessions, today, preset) {
    const normalized = normalizeHeatmapPreset(preset);
    const { start, end } = getHeatmapRange(normalized, today);
    const minutesByDay = aggregateMinutesByDay(sessions, start, end);
    const weeks = buildHeatmapWeeks(start, end, minutesByDay);

    return { preset: normalized, start, end, weeks };
  }

  function filterSessionsByDate(sessions, dateKey) {
    return (sessions || []).filter((session) => session && session.date === dateKey);
  }

  function hasSessionsOnDate(sessions, dateKey) {
    return (sessions || []).some((session) => session && session.date === dateKey);
  }

  function nextFilterAfterDelete(filterDate, remainingSessions) {
    if (filterDate === null || filterDate === undefined) {
      return null;
    }

    return hasSessionsOnDate(remainingSessions, filterDate) ? filterDate : null;
  }

  function shouldClearFilterAfterSave(filterDate, savedDate) {
    return filterDate !== null && filterDate !== undefined && filterDate !== savedDate;
  }

  function getAdjacentHeatmapCell(weeks, row, col, direction) {
    const vectors = {
      up: [-1, 0],
      down: [1, 0],
      left: [0, -1],
      right: [0, 1]
    };
    const vector = vectors[direction];

    if (!vector || !Array.isArray(weeks)) {
      return null;
    }

    let nextRow = row + vector[0];
    let nextCol = col + vector[1];

    while (
      nextCol >= 0 &&
      nextCol < weeks.length &&
      nextRow >= 0 &&
      nextRow < 7
    ) {
      if (weeks[nextCol] && weeks[nextCol][nextRow]) {
        return { row: nextRow, col: nextCol };
      }

      nextRow += vector[0];
      nextCol += vector[1];
    }

    return null;
  }

  return {
    HEATMAP_PRESETS,
    DEFAULT_HEATMAP_PRESET,
    HEATMAP_REFERENCE_MINUTES,
    parseLocalDate,
    formatDateForInput,
    formatDateForDisplay,
    formatDateForAccessibleLabel,
    addDays,
    startOfWeek,
    dayNumber,
    daysBetween,
    getWeekRange,
    getMonthRange,
    calculateStreak,
    calculateBestStreak,
    calculateWeeklyMinutes,
    calculateMonthlyStudyDays,
    sortSessionsByDateDesc,
    formatHoursMinutes,
    weeksForPreset,
    normalizeHeatmapPreset,
    getHeatmapRange,
    getHeatmapLevel,
    aggregateMinutesByDay,
    buildHeatmapWeeks,
    calculateHeatmap,
    filterSessionsByDate,
    hasSessionsOnDate,
    nextFilterAfterDelete,
    shouldClearFilterAfterSave,
    getAdjacentHeatmapCell
  };
});
