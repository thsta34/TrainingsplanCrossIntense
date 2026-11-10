const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function setup({ href = 'http://127.0.0.1:4173/', valid = true, emitRecovery = false, marker = null } = {}) {
  const nodes = new Map();
  function node(selector) {
    if (!nodes.has(selector)) nodes.set(selector, {
      value: '', textContent: '', hidden: false, disabled: false, dataset: {}, innerHTML: '',
      classList: { toggle() {}, add() {}, remove() {} },
      addEventListener() {}, setAttribute() {}, querySelectorAll: () => [], querySelector: () => null,
      checkValidity() { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value); }, focus() {},
    });
    return nodes.get(selector);
  }
  const local = new Map([['training-cycle-state-v3', JSON.stringify({ phases: [], pendingSync: true, lastLocalChangedAt: '2026-11-10T08:00:00Z' })]]);
  const session = new Map(marker ? [['training-password-recovery', JSON.stringify({ userId: marker })]] : []);
  const calls = { table: 0, localWrites: 0, update: [], reset: [], signUp: 0, signIn: 0, replace: [] };
  let authCallback;
  const user = { id: 'existing-user-123', email: 'test@example.invalid' };
  const auth = {
    onAuthStateChange(callback) { authCallback = callback; },
    async getSession() {
      if (emitRecovery && valid) authCallback('PASSWORD_RECOVERY', { user });
      return { data: { session: valid ? { user } : null }, error: null };
    },
    async getUser() { return { data: { user: valid ? user : null }, error: valid ? null : { message: 'expired' } }; },
    async updateUser(payload) {
      calls.update.push(payload);
      authCallback?.('USER_UPDATED', { user });
      return { data: { user }, error: null };
    },
    async resetPasswordForEmail(email, options) { calls.reset.push({ email, options }); return { error: null }; },
    async signUp() { calls.signUp++; throw new Error('must not register'); },
    async signInWithPassword() { calls.signIn++; throw new Error('must not log in during recovery'); },
  };
  const context = vm.createContext({
    console, structuredClone, Intl, Date, URL, URLSearchParams, navigator: {},
    setTimeout: () => 0, clearTimeout() {},
    window: {
      location: { href, replace: url => calls.replace.push(url) },
      sessionStorage: { getItem: key => session.get(key) || null, setItem: (key, value) => session.set(key, value), removeItem: key => session.delete(key) },
      supabase: { createClient: () => ({ auth, from() { calls.table++; throw new Error('Unexpected database access'); } }) },
      setTimeout: () => 0, clearTimeout() {}, alert() {},
    },
    document: { querySelector: node, querySelectorAll: () => [], addEventListener() {} },
    localStorage: { getItem: key => local.get(key) || null, setItem: (key, value) => { calls.localWrites++; local.set(key, value); }, removeItem: key => local.delete(key) },
  });
  vm.runInContext(source.slice(0, source.lastIndexOf('\nrenderScreen();')), context);
  return { context, nodes, node, local, session, calls, auth, run: script => vm.runInContext(script, context) };
}

(async () => {
  const registration = setup({ valid: false });
  registration.auth.signUp = async () => ({ data: { user: { id: 'new-user' }, session: null }, error: null });
  registration.node('#auth-email').value = 'new@example.invalid';
  registration.node('#auth-password').value = 'test-only-password';
  const registrationBefore = registration.run('JSON.stringify(state)');
  registration.run('setLastSyncError({ message: "old RLS error" }); isInitialAuthLoading = false;');
  registration.calls.localWrites = 0;
  await registration.run('signUp()');
  assert.equal(registration.run('syncUser'), null);
  assert.equal(registration.node('#auth-fields').hidden, false);
  assert.equal(registration.node('#session-fields').hidden, true);
  assert.equal(registration.node('#sync-now').hidden, true);
  assert.equal(registration.node('#sync-error-detail').hidden, true);
  assert.match(registration.node('#settings-sync-status').textContent, /bestätige/);
  await registration.run('syncNow(); saveRemoteState(); queueRemoteSave();');
  assert.equal(registration.calls.table, 0);
  assert.equal(registration.calls.localWrites, 0);
  assert.equal(registration.run('JSON.stringify(state)'), registrationBefore);
  registration.auth.signUp = async () => ({ data: { user: { id: 'new-user' }, session: { user: { id: 'new-user' } } }, error: null });
  registration.run('syncAfterSignIn = async () => {}; setView = () => {};');
  await registration.run('signUp()');
  assert.equal(registration.run('syncUser.id'), 'new-user');
  console.log('PASS: registration without session stays logged out, blocks sync, clears stale RLS errors and preserves data; valid registration session remains supported.');
  const request = setup();
  request.node('#auth-email').value = 'test@example.invalid';
  await request.run('requestPasswordReset()');
  assert.deepEqual(JSON.parse(JSON.stringify(request.calls.reset)), [{ email: 'test@example.invalid', options: { redirectTo: 'http://127.0.0.1:4173/?password-reset=1' } }]);
  assert.equal(request.calls.table, 0);
  assert.equal(request.calls.localWrites, 0);
  request.node('#auth-email').value = '';
  await request.run('requestPasswordReset()');
  assert.equal(request.calls.reset.length, 1);
  request.auth.resetPasswordForEmail = async () => ({ error: { status: 429 } });
  request.node('#auth-email').value = 'test@example.invalid';
  await request.run('requestPasswordReset()');
  assert.match(request.node('#password-reset-status').textContent, /Zu viele Anfragen/);

  const recovery = setup({ href: 'http://127.0.0.1:4173/?password-reset=1#access_token=test&type=recovery', emitRecovery: true });
  recovery.run(`state.phases = [createTrainingPhase('2026-11-02')];
    state.phases[0].sessions[0].exercises.A1 = { sets: [10, 20, 30], reps: [12, 10, 8], skipped: false, bar: 20 };
    state.phases[0].sessions[0].notes = 'do not change';`);
  const before = recovery.run('JSON.stringify(state)');
  const storedBefore = recovery.local.get('training-cycle-state-v3');
  await recovery.run('initSupabaseAuth()');
  assert.equal(recovery.run('passwordRecoveryActive'), true);
  assert.equal(recovery.run('syncUser.id'), 'existing-user-123');
  assert.equal(recovery.node('#recovery-password-fields').hidden, false);
  await recovery.run(`saveState(); saveState({markDirty:false}); queueRemoteSave(); applyRemoteState({phases:[]});
    saveRemoteState(); persistRemoteState(); syncAfterSignIn(); pullRemoteState(); syncNow(); loadRemoteState();
    writeRemoteStateData({phases:[]}); overwriteRemoteState({phases:[]}); signIn(); signUp(); signOut();`);
  assert.equal(recovery.calls.table, 0);
  assert.equal(recovery.calls.localWrites, 0);
  assert.equal(recovery.calls.signUp, 0);
  assert.equal(recovery.calls.signIn, 0);
  recovery.node('#recovery-password').value = 'secure-test-password';
  recovery.node('#recovery-password-confirm').value = 'different';
  await recovery.run('updateRecoveryPassword({ preventDefault() {} })');
  assert.equal(recovery.calls.update.length, 0);
  assert.match(recovery.node('#recovery-status').textContent, /nicht überein/);
  recovery.node('#recovery-password-confirm').value = 'secure-test-password';
  await recovery.run('updateRecoveryPassword({ preventDefault() {} })');
  assert.equal(recovery.calls.update.length, 1);
  assert.deepEqual(Object.keys(recovery.calls.update[0]), ['password']);
  assert.equal(recovery.run('syncUser.id'), 'existing-user-123');
  assert.equal(recovery.run('recoveryComplete'), true);
  assert.equal(recovery.run('passwordRecoveryActive'), true);
  assert.equal(recovery.run('JSON.stringify(state)'), before);
  assert.equal(recovery.local.get('training-cycle-state-v3'), storedBefore);
  assert.equal(recovery.calls.localWrites, 0);
  assert.equal(recovery.calls.table, 0);
  assert.equal(recovery.node('#recovery-password').value, '');
  recovery.run('finishPasswordRecovery()');
  assert.deepEqual(recovery.calls.replace, ['http://127.0.0.1:4173/']);
  assert.equal(recovery.session.has('training-password-recovery'), false);

  for (const options of [
    { href: 'http://127.0.0.1:4173/?password-reset=1#error=access_denied&error_code=otp_expired', valid: false },
    { href: 'http://127.0.0.1:4173/?password-reset=1', valid: false },
    { marker: 'another-user' },
  ]) {
    const invalid = setup(options);
    await invalid.run('initSupabaseAuth()');
    invalid.node('#recovery-password').value = invalid.node('#recovery-password-confirm').value = 'secure-test-password';
    await invalid.run('updateRecoveryPassword({ preventDefault() {} })');
    assert.equal(invalid.calls.update.length, 0);
    assert.equal(invalid.calls.table, 0);
    assert.equal(invalid.calls.localWrites, 0);
    assert.equal(invalid.node('#recovery-password-fields').hidden, true);
  }
  const resumed = setup({ marker: 'existing-user-123' });
  await resumed.run('initSupabaseAuth()');
  assert.equal(resumed.node('#recovery-password-fields').hidden, false);
  resumed.auth.getUser = async () => ({ data: { user: { id: 'different-user' } }, error: null });
  resumed.node('#recovery-password').value = resumed.node('#recovery-password-confirm').value = 'secure-test-password';
  await resumed.run('updateRecoveryPassword({ preventDefault() {} })');
  assert.equal(resumed.calls.update.length, 0);
  assert.equal(resumed.calls.localWrites, 0);
  console.log('PASS: email request, validation and rate limit; recovery startup before sync; password-only update on verified existing user; identical user ID, state and local storage; no database requests; expired/missing links; wrong-user rejection; reload resume; explicit return to training.');
})().catch(error => { console.error(error); process.exitCode = 1; });
