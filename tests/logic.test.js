'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const logic = require('../logic.js');

function localDate(year, month, day) {
  return new Date(year, month - 1, day);
}

function session(date, minutes, id = 1) {
  return { id, date, topic: 'Tema', minutes };
}

test('getWeekRange devuelve lunes y domingo', () => {
  const range = logic.getWeekRange(localDate(2026, 10, 7));
  assert.equal(logic.formatDateForInput(range.monday), '2026-10-05');
  assert.equal(logic.formatDateForInput(range.sunday), '2026-10-11');

  const sunday = logic.getWeekRange(localDate(2026, 10, 11));
  assert.equal(logic.formatDateForInput(sunday.monday), '2026-10-05');
});

test('getMonthRange cubre el mes completo y el 29 de febrero', () => {
  const october = logic.getMonthRange(localDate(2026, 10, 7));
  assert.equal(logic.formatDateForInput(october.firstDay), '2026-10-01');
  assert.equal(logic.formatDateForInput(october.lastDay), '2026-10-31');

  const february = logic.getMonthRange(localDate(2024, 2, 10));
  assert.equal(logic.formatDateForInput(february.lastDay), '2024-02-29');
});

test('calculateStreak cuenta desde hoy o desde ayer', () => {
  const today = localDate(2026, 10, 7);

  assert.equal(
    logic.calculateStreak(
      [
        session('2026-10-05', 30, 1),
        session('2026-10-06', 30, 2),
        session('2026-10-07', 30, 3)
      ],
      today
    ),
    3
  );

  assert.equal(
    logic.calculateStreak(
      [session('2026-10-05', 30, 1), session('2026-10-06', 30, 2)],
      today
    ),
    2
  );

  assert.equal(logic.calculateStreak([session('2026-10-05', 30, 1)], today), 0);
  assert.equal(
    logic.calculateStreak(
      [session('2026-10-05', 30, 1), session('2026-10-07', 30, 2)],
      today
    ),
    1
  );
  assert.equal(
    logic.calculateStreak(
      [session('2026-10-07', 30, 1), session('2026-10-07', 45, 2)],
      today
    ),
    1
  );
  assert.equal(logic.calculateStreak([], today), 0);
});

test('calculateBestStreak usa fechas únicas y cruza meses', () => {
  const sessions = [
    session('2026-10-05', 30, 1),
    session('2026-10-01', 30, 2),
    session('2026-10-07', 30, 3),
    session('2026-10-02', 30, 4),
    session('2026-10-06', 30, 5),
    session('2026-10-03', 30, 6)
  ];

  assert.equal(logic.calculateBestStreak(sessions), 3);
  assert.equal(
    logic.calculateBestStreak([
      session('2025-12-31', 30, 1),
      session('2026-01-02', 30, 2),
      session('2026-01-01', 30, 3)
    ]),
    3
  );
  assert.equal(logic.calculateBestStreak([]), 0);
  assert.equal(logic.calculateBestStreak([session('2026-10-07', 30)]), 1);
});

test('calculateWeeklyMinutes respeta lunes-domingo', () => {
  const today = localDate(2026, 10, 7);
  const sessions = [
    session('2026-10-04', 100, 1),
    session('2026-10-05', 30, 2),
    session('2026-10-06', 45, 3),
    session('2026-10-11', 60, 4),
    session('2026-10-12', 100, 5)
  ];

  assert.equal(logic.calculateWeeklyMinutes(sessions, today), 135);
});

test('calculateMonthlyStudyDays cuenta días únicos del mes', () => {
  const today = localDate(2026, 10, 7);
  const sessions = [
    session('2026-10-01', 10, 1),
    session('2026-10-01', 20, 2),
    session('2026-10-07', 30, 3),
    session('2026-09-30', 40, 4),
    session('2026-11-01', 50, 5),
    session('2026-02-30', 60, 6)
  ];

  assert.equal(logic.calculateMonthlyStudyDays(sessions, today), 2);
});

test('sortSessionsByDateDesc ordena sin mutar', () => {
  const sessions = [
    session('2026-10-05', 30, 1),
    session('2026-10-07', 30, 2),
    session('2026-10-06', 30, 3),
    session('2026-10-07', 45, 7)
  ];

  const sorted = logic.sortSessionsByDateDesc(sessions);

  assert.deepEqual(
    sorted.map((item) => item.id),
    [7, 2, 3, 1]
  );
  assert.deepEqual(
    sessions.map((item) => item.id),
    [1, 2, 3, 7]
  );
});

test('formatHoursMinutes mantiene el formato de la tarjeta', () => {
  assert.equal(logic.formatHoursMinutes(0), '0 min');
  assert.equal(logic.formatHoursMinutes(45), '45 min');
  assert.equal(logic.formatHoursMinutes(60), '1h');
  assert.equal(logic.formatHoursMinutes(90), '1h 30min');
});
