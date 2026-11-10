const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const storage = new Map();
const nodes = new Map();
const rows = new Map();
const writes = [];
let activeUser = { id: 'B', email: 'new@example.invalid' };
let callback;
let deferredRead = null;
let deferredUpdate = null;
const node = selector => {
  if (!nodes.has(selector)) nodes.set(selector, {
    value: '', hidden: false, textContent: '', dataset: {}, innerHTML: '',
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {}, setAttribute() {}, querySelectorAll: () => [], querySelector: () => null,
  });
  return nodes.get(selector);
};
const client = {
  auth: {
    onAuthStateChange(fn) { callback = fn; },
    async getSession() { return { data: { session: activeUser ? { user: activeUser } : null }, error: null }; },
  },
  from(table) {
    let id;
    let payload;
    return {
      select() { return this; },
      eq(key, value) { if (key === 'user_id') id = value; return this; },
      update(value) { payload = value; return this; },
      async maybeSingle() {
        if (table === 'training_app_settings') return { data: { value: false }, error: null };
        assert.equal(id, activeUser.id, 'REST request must target current authenticated account');
        if (payload) {
          writes.push({ id, payload: structuredClone(payload) });
          if (deferredUpdate) return deferredUpdate;
          if (!rows.has(id)) return { data: null, error: null };
          rows.set(id, structuredClone(payload));
          return { data: { user_id: id }, error: null };
        }
        if (deferredRead) return deferredRead;
        return { data: rows.has(id) ? structuredClone(rows.get(id)) : null, error: null };
      },
      async insert(value) {
        assert.equal(value.user_id, activeUser.id);
        writes.push({ id: value.user_id, payload: structuredClone(value) });
        rows.set(value.user_id, structuredClone(value));
        return { error: null };
      },
    };
  },
};
const context = vm.createContext({
  console, structuredClone, Intl, Date, URL, URLSearchParams, navigator: {},
  setTimeout: () => 0, clearTimeout() {},
  window: { supabase: { createClient: () => client }, setTimeout: () => 0, clearTimeout() {}, alert() {}, confirm: () => false },
  document: { querySelector: node, querySelectorAll: () => [], addEventListener() {} },
  localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
});
vm.runInContext(source.slice(0, source.lastIndexOf('\nrenderScreen();')), context);
const run = script => vm.runInContext(script, context);
run('renderScreen = () => {}; renderSetup = () => {};');
const legacy = run(`JSON.stringify({ ...createInitialState(), pendingSync:true, lastLocalChangedAt:'2026-11-10T08:00:00Z',
  phases:[createTrainingPhase('2026-11-02')], contrastLibrary:[{name:'PRIVATE-A',mode:'dumbbell',bar:0}] })`);
storage.set('training-cycle-state-v3', legacy);
const aRemote = JSON.parse(legacy);
aRemote.pendingSync = false;
rows.set('A', { data: aRemote, updated_at: '2026-11-10T09:00:00Z' });
const switchTo = id => {
  activeUser = id ? { id, email: id + '@example.invalid' } : null;
  callback('SIGNED_IN', activeUser ? { user: activeUser } : null);
};

(async () => {
  await run('initSupabaseAuth()');
  assert.equal(run('state.phases.length'), 0);
  assert.equal(run('state.contrastLibrary.length'), 0);
  assert.equal(writes.length, 0, 'new account must not upload legacy data');
  assert.equal(storage.get('training-cycle-state-v3'), legacy);
  assert.equal(storage.get('training-cycle-state-v3:unassigned-backup'), legacy);
  assert.equal(run('activeStateUserId'), 'B');
  switchTo('A');
  await run('syncAfterSignIn()');
  assert.equal(run('state.contrastLibrary[0].name'), 'PRIVATE-A');
  assert.equal(run('state.ownerUserId'), 'A');
  run(`state.phases[0].sessions[0].notes = 'A-local-only'; saveState();`);
  const cachedA = storage.get('training-cycle-state-v3:user:A');
  switchTo('B');
  assert.equal(run('state.phases.length'), 0);
  assert.equal(run('state.contrastLibrary.length'), 0);
  assert.equal(storage.get('training-cycle-state-v3:user:A'), cachedA);
  await run('syncAfterSignIn()');
  assert.equal(writes.length, 0);
  run(`state.phases = [createContrastPhase('2026-11-09')]; state.phases[0].sessions[0].notes = 'B-only'; saveState();`);
  await run('saveRemoteState()');
  assert.equal(writes.length, 2); // update finds no row; insert creates B's row
  assert.ok(writes.every(write => write.id === 'B'));
  assert.ok(writes.every(write => !JSON.stringify(write.payload).includes('PRIVATE-A')));
  assert.equal(rows.get('A').data.phases[0].sessions[0].notes, '');
  const bSnapshot = run('JSON.stringify(state)');
  switchTo(null);
  assert.equal(run('state.phases.length'), 0);
  assert.equal(run('syncUser'), null);
  switchTo('A');
  assert.equal(run('state.phases[0].sessions[0].notes'), 'A-local-only');
  await run('syncAfterSignIn()');
  assert.equal(run('state.phases[0].sessions[0].notes'), 'A-local-only');
  assert.throws(() => run(`applyRemoteState({ownerUserId:'B',phases:[]})`), /anderen Benutzer/);

  // An old account's response must not replace the newly active account.
  let resolveRead;
  deferredRead = new Promise(resolve => { resolveRead = resolve; });
  const oldRead = run('syncAfterSignIn()');
  switchTo('B');
  const beforeRead = run('JSON.stringify(state)');
  resolveRead({ data: aRemote, updated_at: '2026-11-10T10:00:00Z' });
  await oldRead;
  deferredRead = null;
  assert.equal(run('JSON.stringify(state)'), beforeRead);

  // An in-flight update must never fall back to an insert for a different user.
  switchTo('A');
  let resolveUpdate;
  deferredUpdate = new Promise(resolve => { resolveUpdate = resolve; });
  const countBefore = writes.length;
  const oldSave = run('persistRemoteState()');
  assert.equal(writes.length, countBefore + 1);
  assert.equal(writes.at(-1).id, 'A');
  switchTo('B');
  const beforeSave = run('JSON.stringify(state)');
  resolveUpdate({ data: null, error: null });
  await oldSave;
  deferredUpdate = null;
  assert.equal(writes.length, countBefore + 1);
  assert.equal(run('JSON.stringify(state)'), beforeSave);

  // A queued save is tied to its account generation, even for A -> B -> A.
  switchTo('A');
  let releaseQueue;
  context.queueGate = new Promise(resolve => { releaseQueue = resolve; });
  run('remoteSaveChain = queueGate');
  const queued = run('saveRemoteState()');
  switchTo('B');
  switchTo('A');
  const beforeQueue = writes.length;
  releaseQueue();
  await queued;
  assert.equal(writes.length, beforeQueue);
  switchTo('B');
  assert.deepEqual(JSON.parse(run('JSON.stringify(state.phases)')), JSON.parse(bSnapshot).phases);
  assert.equal(run('state.ownerUserId'), 'B');
  assert.equal(storage.get('training-cycle-state-v3'), legacy);
  console.log('PASS: separate A/B caches and libraries; unowned legacy data quarantined unchanged; new user starts empty without uploads; logout clears memory; original pending edits retained; owned server reads only; mismatched owner rejected; delayed reads, in-flight writes and queued saves cannot cross accounts.');
})().catch(error => { console.error(error); process.exitCode = 1; });
