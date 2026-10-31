'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const logic = require('../logic.js');
const logicPath = path.join(__dirname, '..', 'logic.js');

function localDate(year, month, day) {
  return new Date(year, month - 1, day);
}

function session(date, minutes, id = 1) {
  return { id, date, topic: 'Tema', minutes };
}

test('logic.js exporta un objeto en CommonJS', () => {
  assert.equal(typeof logic, 'object');
  assert.notEqual(logic, null);
});

test('logic.js expone StudyLogic al cargarse como script clásico', () => {
  const source = fs.readFileSync(logicPath, 'utf8');
  const sandbox = {};
  vm.runInNewContext(source, sandbox, { filename: 'logic.js' });
  assert.equal(typeof sandbox.StudyLogic, 'object');
  assert.notEqual(sandbox.StudyLogic, null);
});

test('parseLocalDate valida fechas y conserva el calendario local', () => {
  const leap = logic.parseLocalDate('2024-02-29');
  assert.ok(leap instanceof Date);
  assert.equal(logic.formatDateForInput(leap), '2024-02-29');

  assert.equal(logic.parseLocalDate('2026-02-29'), null);
  assert.equal(logic.parseLocalDate('2026-13-01'), null);
  assert.equal(logic.parseLocalDate('2026-00-10'), null);
  assert.equal(logic.parseLocalDate('2026-04-31'), null);
  assert.equal(logic.parseLocalDate('no-es-fecha'), null);
});

test('formatDateForInput usa componentes locales', () => {
  const date = new Date(2026, 0, 5, 23, 59, 59);
  assert.equal(logic.formatDateForInput(date), '2026-01-05');
});

test('addDays cruza mes y año sin cambiar la hora local', () => {
  assert.equal(
    logic.formatDateForInput(logic.addDays(localDate(2026, 12, 31), 1)),
    '2027-01-01'
  );
  assert.equal(
    logic.formatDateForInput(logic.addDays(localDate(2024, 2, 28), 1)),
    '2024-02-29'
  );
});

test('startOfWeek devuelve el lunes de la semana', () => {
  assert.equal(
    logic.formatDateForInput(logic.startOfWeek(localDate(2026, 10, 7))),
    '2026-10-05'
  );
  assert.equal(
    logic.formatDateForInput(logic.startOfWeek(localDate(2026, 10, 4))),
    '2026-09-28'
  );
  assert.equal(
    logic.formatDateForInput(logic.startOfWeek(localDate(2026, 10, 5))),
    '2026-10-05'
  );
});

test('dayNumber y daysBetween usan días de calendario', () => {
  assert.equal(
    logic.daysBetween(localDate(2026, 1, 1), localDate(2026, 1, 10)),
    9
  );
  assert.equal(
    logic.dayNumber(logic.addDays(localDate(2026, 3, 28), 1)) -
      logic.dayNumber(localDate(2026, 3, 28)),
    1
  );
});

test('los formatos de visualización son textos no vacíos', () => {
  const date = localDate(2026, 10, 7);
  assert.equal(typeof logic.formatDateForDisplay(date), 'string');
  assert.ok(logic.formatDateForDisplay(date).length > 0);
  assert.match(logic.formatDateForAccessibleLabel(date), /2026/);
});

test('getHeatmapLevel aplica la escala logarítmica con referencia 480', () => {
  const cases = [
    [0, 0],
    [1, 1],
    [4, 2],
    [60, 3],
    [120, 4],
    [479, 4],
    [480, 5],
    [5000, 5],
    [-5, 0],
    [NaN, 0]
  ];

  for (const [minutes, expected] of cases) {
    assert.equal(logic.getHeatmapLevel(minutes), expected, `m=${minutes}`);
  }
});

test('normalizeHeatmapPreset solo acepta los cinco presets', () => {
  for (const preset of ['4w', '12w', '26w', '52w', 'year']) {
    assert.equal(logic.normalizeHeatmapPreset(preset), preset);
  }

  for (const invalid of ['8w', '', null, undefined, 12, 'YEAR']) {
    assert.equal(logic.normalizeHeatmapPreset(invalid), '12w');
  }
});

test('weeksForPreset devuelve el número de columnas', () => {
  assert.equal(logic.weeksForPreset('4w'), 4);
  assert.equal(logic.weeksForPreset('12w'), 12);
  assert.equal(logic.weeksForPreset('26w'), 26);
  assert.equal(logic.weeksForPreset('52w'), 52);
  assert.equal(logic.weeksForPreset('year'), null);
});

test('getHeatmapRange calcula los cinco rangos', () => {
  const today = localDate(2026, 10, 7);
  const expected = [
    ['4w', '2026-09-14'],
    ['12w', '2026-07-20'],
    ['26w', '2026-04-13'],
    ['52w', '2025-10-13'],
    ['year', '2026-01-01']
  ];

  for (const [preset, start] of expected) {
    const range = logic.getHeatmapRange(preset, today);
    assert.equal(logic.formatDateForInput(range.start), start, preset);
    assert.equal(logic.formatDateForInput(range.end), '2026-10-07', preset);
  }

  const fallback = logic.getHeatmapRange('8w', today);
  assert.equal(logic.formatDateForInput(fallback.start), '2026-07-20');
});

test('aggregateMinutesByDay suma, filtra y no muta', () => {
  const today = localDate(2026, 10, 7);
  const start = localDate(2026, 9, 14);
  const sessions = [
    session('2026-10-07', 30, 1),
    session('2026-10-07', 45, 2),
    session('2026-10-07', 60, 3),
    session('2026-10-06', 20, 4),
    session('2026-09-13', 10, 5),
    session('2026-10-08', 15, 6),
    session('2026-02-30', 50, 7),
    session('2026-10-05', -10, 8),
    session('2026-10-05', 'abc', 9)
  ];

  const map = logic.aggregateMinutesByDay(sessions, start, today);

  assert.ok(map instanceof Map);
  assert.equal(map.get('2026-10-07'), 135);
  assert.equal(map.get('2026-10-06'), 20);
  assert.equal(map.has('2026-09-13'), false);
  assert.equal(map.has('2026-10-08'), false);
  assert.equal(map.has('2026-02-30'), false);
  assert.equal(map.has('2026-10-05'), false);
  assert.equal(sessions[0].minutes, 30);
  assert.equal(sessions.length, 9);
});

test('buildHeatmapWeeks genera columnas de 7 días y relleno', () => {
  const today = localDate(2026, 10, 7);
  const start = localDate(2026, 9, 14);
  const minutes = new Map([['2026-10-07', 135]]);
  const weeks = logic.buildHeatmapWeeks(start, today, minutes);

  assert.equal(weeks.length, 4);
  for (const week of weeks) {
    assert.equal(week.length, 7);
  }

  assert.equal(logic.formatDateForInput(weeks[0][0].date), '2026-09-14');
  assert.equal(weeks[0][0].date.getDay(), 1);
  assert.equal(weeks[3][2].key, '2026-10-07');
  assert.equal(weeks[3][2].minutes, 135);
  assert.equal(weeks[3][2].level, 4);
  assert.equal(weeks[3][3], null);
  assert.equal(weeks[3][6], null);
});

test('buildHeatmapWeeks maneja el inicio del año y el relleno', () => {
  const jan1 = localDate(2026, 1, 1);
  const range = logic.getHeatmapRange('year', jan1);
  const weeks = logic.buildHeatmapWeeks(range.start, range.end, new Map());

  assert.equal(weeks.length, 1);
  assert.equal(weeks[0][0], null);
  assert.equal(weeks[0][3].key, '2026-01-01');
  assert.equal(weeks[0][4], null);

  const jan10 = localDate(2026, 1, 10);
  const range10 = logic.getHeatmapRange('year', jan10);
  const weeks10 = logic.buildHeatmapWeeks(range10.start, range10.end, new Map());

  assert.equal(weeks10.length, 2);
  assert.equal(weeks10[0][3].key, '2026-01-01');
  assert.equal(weeks10[1][0].key, '2026-01-05');
  assert.equal(weeks10[1][5].key, '2026-01-10');
  assert.equal(weeks10[1][6], null);
});

test('calculateHeatmap integra rango, agregación y niveles', () => {
  const today = localDate(2026, 10, 7);
  const sessions = [
    session('2026-10-07', 30, 1),
    session('2026-10-07', 45, 2),
    session('2026-10-07', 60, 3),
    session('2026-10-06', 20, 4)
  ];

  const data = logic.calculateHeatmap(sessions, today, '4w');

  assert.equal(data.preset, '4w');
  assert.equal(logic.formatDateForInput(data.start), '2026-09-14');
  assert.equal(logic.formatDateForInput(data.end), '2026-10-07');
  assert.equal(data.weeks.length, 4);
  assert.equal(data.weeks[3][2].minutes, 135);
  assert.equal(data.weeks[3][2].level, 4);
  assert.equal(data.weeks[3][1].minutes, 20);
});

test('calculateHeatmap normaliza un preset inválido', () => {
  const data = logic.calculateHeatmap([], localDate(2026, 10, 7), '8w');
  assert.equal(data.preset, '12w');
  assert.equal(data.weeks.length, 12);
  assert.ok(data.weeks.flat().every((cell) => cell === null || cell.level === 0));
});

test('el año bisiesto incluye el 29 de febrero', () => {
  const today = localDate(2024, 3, 1);
  const range = logic.getHeatmapRange('year', today);
  const sessions = [session('2024-02-29', 60, 1)];
  const data = logic.calculateHeatmap(sessions, today, 'year');
  const cell = data.weeks.flat().find((item) => item && item.key === '2024-02-29');

  assert.ok(cell);
  assert.equal(cell.minutes, 60);
  assert.equal(cell.level, 3);
  assert.equal(logic.formatDateForInput(range.start), '2024-01-01');
});

test('el filtro por fecha es puro y completo', () => {
  const sessions = [
    session('2026-10-07', 30, 1),
    session('2026-10-07', 45, 2),
    session('2026-10-06', 20, 3)
  ];

  const filtered = logic.filterSessionsByDate(sessions, '2026-10-07');
  assert.equal(filtered.length, 2);
  assert.equal(sessions.length, 3);
  assert.equal(logic.hasSessionsOnDate(sessions, '2026-10-07'), true);
  assert.equal(logic.hasSessionsOnDate(sessions, '2026-10-05'), false);
});

test('las transiciones del filtro siguen las reglas', () => {
  assert.equal(logic.nextFilterAfterDelete(null, []), null);
  assert.equal(
    logic.nextFilterAfterDelete('2026-10-07', [session('2026-10-07', 30)]),
    '2026-10-07'
  );
  assert.equal(
    logic.nextFilterAfterDelete('2026-10-07', [session('2026-10-06', 30)]),
    null
  );

  assert.equal(logic.shouldClearFilterAfterSave(null, '2026-10-07'), false);
  assert.equal(logic.shouldClearFilterAfterSave('2026-10-07', '2026-10-06'), true);
  assert.equal(logic.shouldClearFilterAfterSave('2026-10-07', '2026-10-07'), false);
});

test('getAdjacentHeatmapCell salta relleno y respeta bordes', () => {
  const cell = (key) => ({ key });
  const weeks = [
    [cell('a'), null, null, null, null, null, null],
    [null, null, null, null, null, null, null],
    [cell('c'), null, null, null, null, null, null]
  ];

  assert.deepEqual(logic.getAdjacentHeatmapCell(weeks, 0, 0, 'right'), {
    row: 0,
    col: 2
  });
  assert.equal(logic.getAdjacentHeatmapCell(weeks, 0, 2, 'right'), null);
  assert.equal(logic.getAdjacentHeatmapCell(weeks, 0, 0, 'up'), null);
  assert.equal(logic.getAdjacentHeatmapCell(weeks, 0, 0, 'down'), null);
});

test('getAdjacentHeatmapCell navega sobre el mapa real', () => {
  const today = localDate(2026, 10, 7);
  const weeks = logic.calculateHeatmap([], today, '4w').weeks;

  const left = logic.getAdjacentHeatmapCell(weeks, 2, 3, 'left');
  assert.deepEqual(left, { row: 2, col: 2 });
  assert.equal(weeks[left.col][left.row].key, '2026-09-30');

  const up = logic.getAdjacentHeatmapCell(weeks, 2, 3, 'up');
  assert.deepEqual(up, { row: 1, col: 3 });
  assert.equal(weeks[up.col][up.row].key, '2026-10-06');

  assert.equal(logic.getAdjacentHeatmapCell(weeks, 2, 3, 'right'), null);
  assert.equal(logic.getAdjacentHeatmapCell(weeks, 2, 3, 'down'), null);
});
