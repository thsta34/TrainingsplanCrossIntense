const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const nodes = new Map();
function node(selector) {
  if (!nodes.has(selector)) nodes.set(selector, {
    value: '', textContent: '', hidden: false, checked: false, innerHTML: '', dataset: {},
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {}, setAttribute() {}, querySelectorAll() { return []; }, querySelector() { return null; },
  });
  return nodes.get(selector);
}

const context = vm.createContext({
  console, structuredClone, Intl, Date, setTimeout: () => 0, clearTimeout() {}, navigator: {},
  window: { setTimeout: () => 0, clearTimeout() {}, alert() {}, confirm: () => false, supabase: { createClient: () => ({}) } },
  document: { querySelector: node, querySelectorAll: () => [], addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
});
vm.runInContext(source.slice(0, source.lastIndexOf('\nrenderScreen();')), context);

async function run(script) {
  return vm.runInContext(`(async () => { ${script} })()`, context);
}

(async () => {
  await run(`
    syncUser = { id: 'test' };
    state = createInitialState();
    state.phases = [createContrastPhase('2026-10-26')];
    pullCount = 0;
    saveCount = 0;
    pullRemoteState = async () => { pullCount += 1; };
    saveRemoteState = async () => { saveCount += 1; };
    await syncNow();
  `);
  assert.equal(context.pullCount, 1);
  assert.equal(context.saveCount, 0);

  await run(`
    state.pendingSync = true;
    state.lastLocalChangedAt = '2026-10-21T12:00:00Z';
    state.lastRemoteSyncedAt = '2026-10-21T11:00:00Z';
    loadRemoteState = async () => ({ data: { phases: [] }, updated_at: '2026-10-21T11:00:00Z' });
    await syncNow();
  `);
  assert.equal(context.saveCount, 1);

  await run(`
    lastStatus = '';
    setSyncStatus = value => { lastStatus = value; };
    loadRemoteState = async () => ({ data: { phases: [] }, updated_at: '2026-10-21T13:00:00Z' });
    window.confirm = () => false;
    await syncNow();
  `);
  assert.equal(context.saveCount, 1);
  assert.match(context.lastStatus, /abgebrochen/);

  await run(`
    window.confirm = () => true;
    await syncNow();
  `);
  assert.equal(context.saveCount, 2);

  await run(`
    state.pendingSync = true;
    state.lastLocalChangedAt = '2026-10-21T14:00:00Z';
    isInitialAuthLoading = false;
    writeRemoteStateData = async () => {};
    await persistRemoteState();
  `);
  assert.equal(vm.runInContext('state.pendingSync', context), false);
  assert.ok(vm.runInContext('state.lastRemoteSyncedAt', context));
  console.log('PASS: manual sync pulls without pending data, uploads pending data, and requires confirmation before replacing a newer remote state.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
