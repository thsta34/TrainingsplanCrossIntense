const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const nodes = new Map();
const storage = new Map();
const alerts = [];
function node(selector) {
  if (!nodes.has(selector)) nodes.set(selector, {
    value: selector === '#new-phase-type' ? 'training' : selector === '#new-phase-weeks' ? '4' : '',
    dataset: {}, listeners: {}, classList: { toggle() {}, add() {}, remove() {} },
    addEventListener(event, listener) { this.listeners[event] = listener; },
    setAttribute() {},
    querySelectorAll() { return []; }, querySelector() { return null; },
  });
  return nodes.get(selector);
}
const context = vm.createContext({
  console, structuredClone, Intl, Date, setTimeout: () => 0, clearTimeout() {},
  window: { setTimeout: () => 0, clearTimeout() {}, alert(message) { alerts.push(message); } }, navigator: {},
  document: { querySelector: node, querySelectorAll: () => [], addEventListener() {} },
  localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
});
vm.runInContext(source.slice(0, source.lastIndexOf('\nrenderScreen();')), context);
vm.runInContext('renderScreen = () => {}; renderSetup = () => {}; syncUser = { id: "test" }; state = createInitialState();', context);
const run = script => JSON.parse(JSON.stringify(vm.runInContext(script, context)));
for (const type of ['training', 'contrast']) {
  node('#new-phase-type').value = type;
  node('#new-phase-type').listeners.change({ target: node('#new-phase-type') });
  assert.equal(node('#new-phase-weeks').value, type === 'training' ? '4' : '2');
  for (const [weeks, end] of [[2, '2026-11-06'], [3, '2026-11-13'], [4, '2026-11-20']]) {
    node('#new-phase-date').value = '2026-10-26';
    node('#new-phase-weeks').value = String(weeks);
    vm.runInContext('state = createInitialState(); addPhase();', context);
    const phase = run('state.phases[0]');
    assert.equal(phase.weeks, weeks);
    assert.equal(phase.sessions.length, weeks * 3);
    assert.equal(phase.sessions.at(-1).date, end);
    assert.ok(phase.sessions.every(item => [1, 3, 5].includes(new Date(item.date + 'T12:00:00').getDay())));
    vm.runInContext('state.phases[0].sessions[0].status = "done"; state.phases[0].sessions[0].notes = "keep"; state.phases[0].sessions[0].exercises.TEST = { sets: [3, 4, 5] }; saveState(); state = normalizeAppState(JSON.parse(localStorage.getItem(storageKey)));', context);
    assert.equal(run('state.phases[0].weeks'), weeks);
    assert.equal(run('state.phases[0].sessions.length'), weeks * 3);
    assert.equal(run('state.phases[0].sessions[0].status'), 'done');
    assert.deepEqual(run('state.phases[0].sessions[0].exercises.TEST.sets'), [3, 4, 5]);
    node('#notes').value = 'keep';
    vm.runInContext('selectedPhaseId = state.phases[0].id; currentIndex = 0; updatePhaseStart({ value: "2026-11-02" });', context);
    assert.equal(run('state.phases[0].sessions.length'), weeks * 3);
    assert.equal(run('state.phases[0].sessions[0].notes'), 'keep');
    assert.equal(run('state.phases[0].sessions[0].date'), '2026-11-02');
  }
}
assert.deepEqual(run(`['training', 'contrast'].map(type => {
  const phase = type === 'training' ? createTrainingPhase() : createContrastPhase();
  delete phase.weeks;
  const normalized = normalizePhase(phase);
  return [normalized.weeks, normalized.sessions.length];
})`), [[4, 12], [2, 6]]);
assert.equal(run('phaseEndDate(createContrastPhase("2026-12-21", undefined, [], 3))'), '2027-01-08');
assert.equal(run('phaseEndDate(createContrastPhase("2026-10-26", undefined, [], 3))'), '2026-11-13');
node('#notes').value = 'bleibt erhalten';
vm.runInContext(`
  state = createInitialState();
  state.phases = [createTrainingPhase('2026-10-26', defaultTrainingSelection, [], 2)];
  selectedPhaseId = state.phases[0].id;
  currentIndex = 0;
  state.phases[0].sessions[0].status = 'done';
  state.phases[0].sessions[0].notes = 'bleibt erhalten';
  updatePhaseWeeks({ value: '4' });
`, context);
assert.equal(run('state.phases[0].weeks'), 4);
assert.equal(run('state.phases[0].sessions.length'), 12);
assert.equal(run('state.phases[0].sessions[0].status'), 'done');
assert.equal(run('state.phases[0].sessions[0].notes'), 'bleibt erhalten');
vm.runInContext('updatePhaseWeeks({ value: "3" });', context);
assert.equal(run('state.phases[0].weeks'), 3);
assert.equal(run('state.phases[0].sessions.length'), 9);
context.phaseWeeksSelect = { value: '2' };
vm.runInContext(`
  state.phases[0].sessions[8].status = 'done';
  updatePhaseWeeks(phaseWeeksSelect);
`, context);
assert.equal(run('state.phases[0].weeks'), 3);
assert.equal(run('state.phases[0].sessions.length'), 9);
assert.equal(context.phaseWeeksSelect.value, '3');
assert.equal(alerts.at(-1), 'Die Phase kann nicht verkürzt werden, da es bereits erfasste Trainings hat (dazu gehören geskippte, erledigte oder noch nicht erledigte Trainings). Bitte lösche vorher die betroffenen Trainings.');
const before = run(`(() => {
  const saved = createInitialState();
  saved.phases = [createTrainingPhase('2026-05-04'), createContrastPhase('2026-06-01')];
  saved.pendingSync = true;
  saved.lastLocalChangedAt = '2026-10-21T12:00:00Z';
  saved.lastRemoteSyncedAt = '2026-10-20T12:00:00Z';
  saved.contrastLibrary = [{ name: 'Trizeps Test', mode: 'dumbbell', bar: 0 }];
  saved.phases.forEach(phase => {
    delete phase.weeks;
    phase.sessions.forEach((session, index) => {
      session.status = ['done', 'skipped', 'planned'][index % 3];
      session.notes = 'Notiz ' + index;
      session.exercises.A2 = { bar: 0, mode: 'bands', skipped: index % 2 === 0,
        sets: [{ green: true, red: false, black: true }, { bodyweight: true, extra: 1.25 }, { kz: true, extra: 42.5 }],
        reps: [12, 10, 8] };
      session.exercises.B11 = { bar: 20, mode: 'barbell', sets: [10, 20, 30.25, 15], reps: [12, 10, 6, 8] };
    });
  });
  return saved;
})()`);
context.fixture = structuredClone(before);
const migrated = run('normalizeAppState(structuredClone(fixture))');
for (let i = 0; i < before.phases.length; i++) {
  assert.equal(migrated.phases[i].weeks, i === 0 ? 4 : 2);
  assert.equal(migrated.phases[i].sessions.length, before.phases[i].sessions.length);
  for (let j = 0; j < before.phases[i].sessions.length; j++) {
    const original = before.phases[i].sessions[j];
    const restored = migrated.phases[i].sessions[j];
    for (const key of ['id', 'date', 'training', 'status', 'notes']) assert.deepEqual(restored[key], original[key]);
    for (const code of Object.keys(original.exercises)) assert.deepEqual(restored.exercises[code], original.exercises[code]);
  }
}
assert.equal(migrated.pendingSync, true);
assert.equal(migrated.lastLocalChangedAt, before.lastLocalChangedAt);
assert.equal(migrated.lastRemoteSyncedAt, before.lastRemoteSyncedAt);
assert.ok(migrated.contrastLibrary.some(item => item.name === 'Trizeps Test'));
const empty = run('normalizeAppState(createInitialState())');
assert.equal(empty.phases.length, 0);
context.remoteFixture = structuredClone(migrated);
vm.runInContext('state = normalizeAppState(structuredClone(fixture));', context);
assert.equal(run('shouldProtectLocalState(remoteFixture)'), true);
const previous = run('serializeState()');
vm.runInContext('applyRemoteState(remoteFixture)', context);
assert.deepEqual(JSON.parse(storage.get('training-cycle-state-v3-before-remote-import')).state, previous);
assert.deepEqual(run('state.phases'), migrated.phases);
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.equal(html.includes('new-phase-end'), false);
assert.ok(html.indexOf('id="new-phase-type"') < html.indexOf('id="new-phase-date"'));
assert.ok(html.indexOf('id="new-phase-date"') < html.indexOf('id="new-phase-weeks"'));
for (const email of [null, 'other@example.invalid', 'thstaehli@gmail.com']) {
  context.testEmail = email;
  vm.runInContext('syncUser = testEmail ? { email: testEmail } : null; registrationEnabled = false; renderExerciseModeSettings();', context);
  assert.equal(node('#exercise-mode-list').innerHTML.includes('id="exercise-defaults-note"'), email === 'thstaehli@gmail.com');
}
console.log('PASS: six type/duration combinations; defaults; 6/9/12 sessions; dates and year boundary; full state save/reload; legacy sessions retain IDs, notes, statuses, sets, reps and skip flags; library and sync timestamps retained; empty plan; pending-local protection; backup before remote import; field order.');
console.log('PASS: exercise defaults note visible only to registration admin, including when registration is disabled.');
console.log('PASS: existing phase duration extends safely, shrinks only across empty sessions, and blocks shortening across recorded data.');
