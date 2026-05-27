function todayIso() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

const today = todayIso();
const trainingOffsets = [0, 2, 4, 7, 9, 11, 14, 16, 18, 21, 23, 25];
const contrastOffsets = [0, 2, 4, 7, 9, 11];
const defaultSchedule = {
  trainingStartDate: "2026-05-04",
  contrastStartDate: "2026-06-01",
};
const defaultTrainingSelection = { A: ["A1", "A1"], B: ["A1", "A1"] };

const exerciseCatalog = [
  { code: "A1", name: "Frontsquad", defaultBar: 30, mode: "barbell" },
  { code: "A2", name: "Klimmzüge enger Griff supiniert", defaultBar: 0, mode: "bands" },
  { code: "B3", name: "Bankdrücken 0°", defaultBar: 20, mode: "barbell" },
  { code: "B4", name: "RDL", defaultBar: 20, mode: "barbell" },
  { code: "A5", name: "Backsquat Fersen erhöht", defaultBar: 20, mode: "barbell" },
  { code: "A6", name: "LH Rudern supiniert", defaultBar: 0, mode: "dumbbell" },
  { code: "B7", name: "KH Drücken 30°", defaultBar: 0, mode: "dumbbell" },
  { code: "B8", name: "Deadlift", defaultBar: 20, mode: "barbell" },
  { code: "A9", name: "Frontsquat Fersen erhöht", defaultBar: 30, mode: "barbell" },
  { code: "A10", name: "Klimmzüge mittlerer Griff supiniert", defaultBar: 0, mode: "bands" },
  { code: "B11", name: "Hexbardeadlift weniger ROM", defaultBar: 20, mode: "barbell" },
  { code: "B12", name: "Bankdrücken 30°", defaultBar: 20, mode: "barbell" },
  { code: "A13", name: "Backsquat", defaultBar: 20, mode: "barbell" },
  { code: "A14", name: "Dips", defaultBar: 0, mode: "bands" },
  { code: "B15", name: "RDL", defaultBar: 20, mode: "barbell" },
  { code: "B16", name: "Rudern sitzend enger Griff", defaultBar: 0, mode: "dumbbell" },
  { code: "A17", name: "Hexbardeadlift mehr ROM", defaultBar: 20, mode: "barbell" },
  { code: "A18", name: "Klimmzüge breiter Griff supiniert", defaultBar: 0, mode: "bands" },
  { code: "B19", name: "Shoulder Press", defaultBar: 20, mode: "barbell" },
  { code: "B20", name: "Hip Extension 90°", defaultBar: 0, mode: "dumbbell" },
];

const defaultExerciseModes = Object.fromEntries(exerciseCatalog.map((exercise) => [exercise.code, exercise.mode]));

const storageKey = "training-cycle-state-v3";
const legacyKey = "training-block-10-state-v2";
const registrationEnabledKey = "training-registration-enabled";
const registrationAdminEmail = "thstaehli@gmail.com";
const supabaseUrl = "https://rkvjktevdmlikzrcewel.supabase.co";
const supabaseKey = "sb_publishable_VrCUoJ0oDHZLjY4my5dVHA_r91_cWSc";
const supabaseClient = window.supabase?.createClient(supabaseUrl, supabaseKey);
const formatter = new Intl.NumberFormat("de-CH", { maximumFractionDigits: 2 });
let syncUser = null;
let syncTimer = null;
let isApplyingRemoteState = false;
let currentView = "training";
let statsMode = "training";
let selectedPhaseId = null;
let calendarExpanded = false;
let settingsPhaseOpen = false;
let exerciseModesOpen = false;

let state = loadState();
let initialPosition = findInitialPosition();
let currentPhase = initialPosition.phase;
let currentIndex = initialPosition.index;
selectedPhaseId = initialPosition.phaseId || state.selectedPhaseId || state.phases[0]?.id || null;

function addDays(date, days) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat("de-CH", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${isoDate}T12:00:00`));
}

function formatShortDate(isoDate) {
  return new Intl.DateTimeFormat("de-CH", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${isoDate}T12:00:00`));
}

function formatRange(startDate, endDate) {
  const options = { day: "2-digit", month: "2-digit" };
  const dateFormatter = new Intl.DateTimeFormat("de-CH", options);
  return `${dateFormatter.format(new Date(`${startDate}T12:00:00`))} - ${dateFormatter.format(new Date(`${endDate}T12:00:00`))}`;
}

function formatPrDate(isoDate) {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(`${isoDate}T12:00:00`));
}

function formatKg(value) {
  return `${formatter.format(value)} kg`;
}

function nonNegativeNumber(value) {
  return Math.max(0, Number(value || 0));
}

function limitDecimalPlaces(input, places = 2) {
  const [integerPart, decimalPart] = input.value.split(".");
  if (decimalPart?.length > places) {
    input.value = `${integerPart}.${decimalPart.slice(0, places)}`;
  }
}

function clampNumberInput(input) {
  if (input.value === "") return "";
  if (Number(input.value) < 0) {
    input.value = "0";
    return 0;
  }
  limitDecimalPlaces(input);
  return nonNegativeNumber(input.value);
}

const bandSupport = { green: 10, red: 4, black: 2 };
const bandLabels = { green: "Grün", red: "Rot", black: "Schwarz" };

function emptySetValue(mode) {
  return mode === "bands" ? { bands: [], bodyweight: false, extraWeight: "" } : "";
}

function createEmptySets(mode) {
  return Array.from({ length: 4 }, () => emptySetValue(mode));
}

function normalizeSetValue(mode, value) {
  if (mode !== "bands") return value;
  if (typeof value === "object" && value !== null) {
    return {
      bands: Array.isArray(value.bands) ? value.bands : [],
      bodyweight: Boolean(value.bodyweight),
      extraWeight: value.extraWeight ?? "",
    };
  }
  return emptySetValue(mode);
}

function isEmptySet(value) {
  if (typeof value === "object" && value !== null) {
    return !value.bands?.length && !value.bodyweight && (value.extraWeight === "" || Number(value.extraWeight || 0) === 0);
  }
  return value === "";
}

function bandSupportScore(value) {
  return (value.bands || []).reduce((sum, band) => sum + (bandSupport[band] || 0), 0);
}

function bandPerformance(value) {
  const extraWeight = Number(value.extraWeight || 0);
  const support = bandSupportScore(value);
  return {
    support,
    extraWeight,
    rank: extraWeight > 0 ? 2 : value.bodyweight ? 1 : 0,
  };
}

function comparePerformance(a, b) {
  if (!b) return 1;
  if (!a) return -1;
  if (a.kind !== b.kind) return 0;
  if (a.kind === "bands") {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.rank === 2 && a.extraWeight !== b.extraWeight) return a.extraWeight - b.extraWeight;
    return b.support - a.support;
  }
  return a.value - b.value;
}

function formatBandValue(value) {
  const extraWeight = Number(value.extraWeight || 0);
  const bands = value.bands || [];
  if (extraWeight > 0) return `Körpergewicht + ${formatKg(extraWeight)}`;
  if (value.bodyweight) return "Körpergewicht";
  return bands.map((band) => bandLabels[band]).join(" + ");
}

function formatPerformance(performance) {
  if (!performance) return "-";
  if (performance.kind === "bands") return formatBandValue(performance.raw);
  return formatKg(performance.value);
}

function getTrainingRange() {
  return {
    start: addDays(state.schedule.trainingStartDate, trainingOffsets[0]),
    end: addDays(state.schedule.trainingStartDate, trainingOffsets.at(-1)),
  };
}

function getContrastRange() {
  return {
    start: addDays(state.schedule.contrastStartDate, contrastOffsets[0]),
    end: addDays(state.schedule.contrastStartDate, contrastOffsets.at(-1)),
  };
}

function totalWeight(exercise, value) {
  if (exercise.mode === "bands") return null;
  if (exercise.mode === "barbell") {
    return Number(exercise.bar || 0) + Number(value || 0) * 2;
  }

  return Number(value || 0);
}

function bestExerciseValue(meta, entry) {
  if (entry?.skipped) return null;
  if (!entry) return null;
  const performances = entry.sets
    .map((value) => normalizeSetValue(meta.mode, value))
    .filter((value) => !isEmptySet(value))
    .map((value) => performanceForSet(meta, entry, value));
  return performances.reduce((best, current) => (comparePerformance(current, best) > 0 ? current : best), null);
}

function bestExerciseSet(meta, entry) {
  if (entry?.skipped) return null;
  if (!entry) return null;
  return entry.sets
    .map((value, index) => {
      const normalized = normalizeSetValue(meta.mode, value);
      if (isEmptySet(normalized)) return null;
      return {
        performance: performanceForSet(meta, entry, normalized),
        setNumber: index + 1,
      };
    })
    .filter(Boolean)
    .reduce((best, current) => (comparePerformance(current.performance, best?.performance) > 0 ? current : best), null);
}

function exerciseSetPerformance(meta, entry, setIndex) {
  if (entry?.skipped) return null;
  if (!entry?.sets?.[setIndex]) return null;
  const normalized = normalizeSetValue(meta.mode, entry.sets[setIndex]);
  if (isEmptySet(normalized)) return null;
  return {
    performance: performanceForSet(meta, entry, normalized),
    setNumber: setIndex + 1,
  };
}

function performanceForSet(meta, entry, value) {
  if (meta.mode === "bands") {
    return {
      kind: "bands",
      raw: value,
      ...bandPerformance(value),
    };
  }
  return {
    kind: "weight",
    value: totalWeight({ ...meta, bar: entry.bar }, value),
  };
}

function modeLabel(mode) {
  return {
    bands: "Bänder",
    dumbbell: "Hantel",
    cable: "Kabelzug",
    machine: "Maschine",
    bodyweight: "Körpergewicht",
  }[mode] || "Keine Stange";
}

function setInputSuffix(mode) {
  return {
    barbell: "/ Seite",
    bands: "Band/Wert",
    dumbbell: "Hantel",
    cable: "Kabelzug",
    machine: "Wert",
    bodyweight: "Wert",
  }[mode] || "Wert";
}

function setSyncStatus(text) {
  document.querySelector("#sync-status").textContent = text;
  document.querySelector("#settings-sync-status").textContent = text;
}

function setLastSyncError(error) {
  const message = error ? error.message || String(error) : "";
  const detail = document.querySelector("#sync-error-detail");
  if (message) {
    localStorage.setItem("training-last-sync-error", message);
  } else {
    localStorage.removeItem("training-last-sync-error");
  }
  if (!detail) return;
  detail.hidden = !message;
  detail.textContent = message ? `Technische Details: ${message}` : "";
}

function friendlyErrorMessage(error) {
  const message = error?.message || String(error);
  if (message.includes("timeout")) {
    return "Supabase antwortet nicht. Bitte Verbindung prüfen und erneut syncen.";
  }
  if (message.includes("parsed.phases[0]") || message.includes("undefined")) {
    return "Der gespeicherte Plan ist leer. Bitte lege in Settings eine neue Phase an.";
  }
  if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
    return "Keine Verbindung zu Supabase. Bitte Internetverbindung prüfen.";
  }
  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "Keine Schreibrechte in Supabase. Bitte RLS/Policies prüfen.";
  }
  if (message.includes("JWT") || message.includes("not authenticated")) {
    return "Login abgelaufen. Bitte ausloggen und erneut einloggen.";
  }
  return "Sync fehlgeschlagen. Bitte neu laden und erneut versuchen.";
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("timeout")), timeoutMs);
    }),
  ]);
}

function renderAuth() {
  const signedIn = Boolean(syncUser);
  const registrationEnabled = localStorage.getItem(registrationEnabledKey) === "true";
  const canManageRegistration = signedIn && syncUser?.email === registrationAdminEmail;
  document.querySelector("#auth-fields").hidden = signedIn;
  document.querySelector("#session-fields").hidden = !signedIn;
  document.querySelector("#session-email").textContent = syncUser?.email || "";
  document.querySelector("#sign-up").hidden = !registrationEnabled;
  document.querySelector("#sync-now").hidden = !signedIn;
  document.querySelector("#registration-toggle").checked = registrationEnabled;
  document.querySelector("#registration-toggle-row").hidden = !canManageRegistration;
  if (!signedIn) {
    setSyncStatus(supabaseClient ? "Nicht verbunden" : "Supabase nicht geladen");
  }
  renderGate();
}

function renderGate() {
  const locked = !syncUser;
  const hasPlan = Boolean(syncUser && state.phases.length);
  document.querySelector("#login-required").hidden = !locked;
  document.querySelector("#empty-plan").hidden = locked || hasPlan;
  document.querySelectorAll(".training-only").forEach((element) => {
    element.hidden = !hasPlan;
  });
  document.querySelector("#pr-callout").hidden = true;
  document.querySelectorAll("#settings-view .setup-card").forEach((card) => {
    card.hidden = locked;
  });
}

function serializeState() {
  return JSON.parse(JSON.stringify(state));
}

function applyRemoteState(remoteState) {
  if (!remoteState) return;
  isApplyingRemoteState = true;
  state = normalizeAppState(remoteState);
  localStorage.setItem(storageKey, JSON.stringify(state));
  const position = findInitialPosition();
  currentPhase = position.phase;
  selectedPhaseId = position.phaseId || state.selectedPhaseId || state.phases[0]?.id || null;
  currentIndex = position.index;
  renderScreen();
  localStorage.setItem(storageKey, JSON.stringify(state));
  isApplyingRemoteState = false;
}

async function loadRemoteState() {
  if (!supabaseClient || !syncUser) return null;
  const { data, error } = await withTimeout(
    supabaseClient
      .from("training_app_states")
      .select("data, updated_at")
      .eq("user_id", syncUser.id)
      .maybeSingle(),
    10000,
  );

  if (error) {
    throw error;
  }

  return data;
}

async function writeRemoteStateData(nextState) {
  const payload = {
    data: JSON.parse(JSON.stringify(nextState)),
    updated_at: new Date().toISOString(),
  };

  const updateResult = await withTimeout(
    supabaseClient
      .from("training_app_states")
      .update(payload)
      .eq("user_id", syncUser.id)
      .select("user_id")
      .maybeSingle(),
    10000,
  );

  if (updateResult.error) {
    throw updateResult.error;
  }

  if (updateResult.data) {
    return;
  }

  const insertResult = await withTimeout(
    supabaseClient.from("training_app_states").insert({
      user_id: syncUser.id,
      ...payload,
    }),
    10000,
  );

  if (!insertResult.error) {
    return;
  }

  if (insertResult.error.code !== "23505") {
    throw insertResult.error;
  }

  const retryResult = await withTimeout(
    supabaseClient
      .from("training_app_states")
      .update(payload)
      .eq("user_id", syncUser.id),
    10000,
  );

  if (retryResult.error) {
    throw retryResult.error;
  }
}

async function saveRemoteState() {
  if (!supabaseClient || !syncUser || isApplyingRemoteState) return;
  setSyncStatus("Speichere...");
  try {
    await writeRemoteStateData(serializeState());
  } catch (error) {
    setLastSyncError(error);
    setSyncStatus(friendlyErrorMessage(error));
    console.error(error);
    return;
  }

  setLastSyncError(null);
  setSyncStatus("Synchronisiert");
}

async function overwriteRemoteState(nextState) {
  if (!supabaseClient || !syncUser) return;
  setSyncStatus("Speichere...");
  try {
    await writeRemoteStateData(nextState);
  } catch (error) {
    setLastSyncError(error);
    setSyncStatus(friendlyErrorMessage(error));
    console.error(error);
    return;
  }
  setLastSyncError(null);
  setSyncStatus("Synchronisiert");
}

function queueRemoteSave() {
  if (!syncUser || isApplyingRemoteState) return;
  setSyncStatus("Änderung vorgemerkt");
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(saveRemoteState, 600);
}

async function syncAfterSignIn() {
  if (!syncUser) return;
  try {
    setSyncStatus("Lade...");
    const remote = await loadRemoteState();
    if (remote?.data && Object.keys(remote.data).length) {
      applyRemoteState(remote.data);
      setSyncStatus("Synchronisiert");
      return;
    }

    await saveRemoteState();
  } catch (error) {
    setSyncStatus(friendlyErrorMessage(error));
    console.error(error);
  }
}

async function pullRemoteState() {
  if (!supabaseClient || !syncUser) {
    setSyncStatus("Nicht verbunden");
    return;
  }

  try {
    setSyncStatus("Lade...");
    const remote = await loadRemoteState();
    if (remote?.data && Object.keys(remote.data).length) {
      if ((!remote.data.phases || !remote.data.phases.length) && state.phases.length) {
        await saveRemoteState();
        return;
      }
      applyRemoteState(remote.data);
      setSyncStatus("Synchronisiert");
      return;
    }

    if (state.phases.length) {
      await saveRemoteState();
      return;
    }

    setSyncStatus("Keine Remote-Daten");
  } catch (error) {
    setSyncStatus(friendlyErrorMessage(error));
    console.error(error);
  }
}

async function signIn() {
  if (!supabaseClient) return;
  const email = document.querySelector("#auth-email").value.trim();
  const password = document.querySelector("#auth-password").value;
  setSyncStatus("Einloggen...");
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    setSyncStatus(error.message);
    return;
  }
  syncUser = data.user;
  renderAuth();
  await syncAfterSignIn();
  setView("training");
}

async function signUp() {
  if (!supabaseClient) return;
  const email = document.querySelector("#auth-email").value.trim();
  const password = document.querySelector("#auth-password").value;
  setSyncStatus("Registriere...");
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    setSyncStatus(error.message);
    return;
  }
  syncUser = data.user;
  renderAuth();
  setSyncStatus(data.session ? "Registriert" : "Bitte E-Mail bestätigen");
  if (data.session) {
    await syncAfterSignIn();
    setView("training");
  }
}

async function signOut() {
  if (!supabaseClient) return;
  await saveRemoteState();
  await supabaseClient.auth.signOut();
  syncUser = null;
  renderAuth();
}

async function initSupabaseAuth() {
  renderAuth();
  if (!supabaseClient) return;

  const { data } = await supabaseClient.auth.getSession();
  syncUser = data.session?.user || null;
  renderAuth();
  if (syncUser) {
    await syncAfterSignIn();
  }

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    syncUser = session?.user || null;
    renderAuth();
  });
}

function getCatalogExercise(code) {
  return exerciseCatalog.find((exercise) => exercise.code === code);
}

function getExerciseTemplate(code, appState = state) {
  const base = getCatalogExercise(code);
  if (!base) return null;
  const mode = appState.exerciseModes?.[code] || base.mode;
  return {
    ...base,
    mode,
    defaultBar: mode === "barbell" ? base.defaultBar || 20 : 0,
  };
}

function blankContrastExercise(slot) {
  return {
    id: `slot-${slot + 1}`,
    name: "",
    mode: "barbell",
    bar: 20,
  };
}

function defaultContrastSelection() {
  return {
    K1: Array.from({ length: 10 }, (_, index) => blankContrastExercise(index)),
    K2: Array.from({ length: 10 }, (_, index) => blankContrastExercise(index)),
  };
}

function normalizeContrastLibrary(library = []) {
  const exercises = new Map();
  library.forEach((exercise) => {
    const name = (exercise.name || "").trim();
    if (!name) return;
    const mode = exercise.mode || "barbell";
    exercises.set(contrastExerciseKey(name), {
      key: contrastExerciseKey(name),
      name,
      mode,
      bar: mode === "barbell" ? Number(exercise.bar || 20) : 0,
    });
  });
  return Array.from(exercises.values()).sort((a, b) => a.name.localeCompare(b.name, "de-CH", { sensitivity: "base" }));
}

function normalizeContrastSlots(slots = []) {
  return Array.from({ length: 10 }, (_, index) => ({
    ...blankContrastExercise(index),
    ...(slots[index] || {}),
  }));
}

function createTrainingPhase(startDate = defaultSchedule.trainingStartDate, selection = defaultTrainingSelection, existingSessions = []) {
  return {
    id: `phase-training-${startDate}`,
    type: "training",
    startDate,
    selection: structuredClone(selection),
    sessions: createTrainingSessions(startDate, existingSessions),
  };
}

function createContrastPhase(startDate = defaultSchedule.contrastStartDate, contrastSelection = defaultContrastSelection(), existingSessions = []) {
  return {
    id: `phase-contrast-${startDate}`,
    type: "contrast",
    startDate,
    contrastSelection: {
      K1: normalizeContrastSlots(contrastSelection.K1),
      K2: normalizeContrastSlots(contrastSelection.K2),
    },
    sessions: createContrastSessions(startDate, existingSessions),
  };
}

function phaseEndDate(phase) {
  const offsets = phase.type === "training" ? trainingOffsets : contrastOffsets;
  return addDays(phase.startDate, offsets.at(-1));
}

function phaseLabel(phase) {
  return `${phase.type === "training" ? "Training" : "Kontrast"} ${formatRange(phase.startDate, phaseEndDate(phase))}`;
}

function sortPhases(phases) {
  return phases.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function dedupePhases(phases) {
  const seen = new Set();
  return sortPhases(
    phases.filter((phase) => {
      const key = `${phase.type}-${phase.startDate}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  );
}

function normalizePhase(phase) {
  if (phase.type === "contrast") {
    return createContrastPhase(phase.startDate, phase.contrastSelection || defaultContrastSelection(), phase.sessions || []);
  }

  return createTrainingPhase(phase.startDate, phase.selection || defaultTrainingSelection, phase.sessions || []);
}

function createTrainingSessions(startDate = defaultSchedule.trainingStartDate, existingSessions = []) {
  let aCount = 0;
  let bCount = 0;

  return trainingOffsets.map((offset, index) => {
    const training = index % 2 === 0 ? "A" : "B";
    const pairOccurrence = training === "A" ? ++aCount : ++bCount;
    const existing = existingSessions[index] || {};

    return {
      id: `training-${index + 1}`,
      phase: "training",
      date: addDays(startDate, offset),
      training,
      pairOccurrence,
      status: existing.status || "planned",
      notes: existing.notes || "",
      exercises: existing.exercises || {},
    };
  });
}

function createContrastSessions(startDate = defaultSchedule.contrastStartDate, existingSessions = []) {
  let k1Count = 0;
  let k2Count = 0;

  return contrastOffsets.map((offset, index) => {
    const training = index % 2 === 0 ? "K1" : "K2";
    const occurrence = training === "K1" ? ++k1Count : ++k2Count;
    const existing = existingSessions[index] || {};

    return {
      id: `contrast-${index + 1}`,
      phase: "contrast",
      date: addDays(startDate, offset),
      training,
      occurrence,
      status: existing.status || "planned",
      notes: existing.notes || "",
      exercises: existing.exercises || {},
    };
  });
}

function seedKnownWorkout(trainingSessions) {
  const session = trainingSessions.find((item) => item.date === "2026-05-25" && item.training === "B");
  if (!session) return;

  session.status = "done";
  session.exercises.B11 = { bar: 20, sets: [20, 35, 40, 35] };
  session.exercises.B12 = { bar: 20, sets: [5, 10, 13.75, 10] };
}

function normalizeOldState(oldState) {
  const trainingPhase = createTrainingPhase(
    oldState.schedule?.trainingStartDate || defaultSchedule.trainingStartDate,
    oldState.selection || defaultTrainingSelection,
    oldState.trainingSessions || oldState.sessions || [],
  );
  const contrastPhase = createContrastPhase(
    oldState.schedule?.contrastStartDate || defaultSchedule.contrastStartDate,
    oldState.contrastSelection || defaultContrastSelection(),
    oldState.contrastSessions || [],
  );

  return {
    activePhase: "training",
    schedule: structuredClone(defaultSchedule),
    selectedPhaseId: oldState.selectedPhaseId || trainingPhase.id,
    phases: dedupePhases([trainingPhase, contrastPhase]),
    exerciseModes: oldState.exerciseModes || structuredClone(defaultExerciseModes),
    selection: oldState.selection || defaultTrainingSelection,
    contrastSelection: oldState.contrastSelection || defaultContrastSelection(),
    contrastLibrary: normalizeContrastLibrary(oldState.contrastLibrary || []),
    prs: oldState.prs || {},
    trainingSessions: trainingPhase.sessions,
    contrastSessions: contrastPhase.sessions,
  };
}

function normalizeAppState(rawState) {
  const parsed = rawState || {};
  parsed.activePhase = parsed.activePhase || "training";
  parsed.schedule = parsed.schedule || structuredClone(defaultSchedule);
  parsed.selection = parsed.selection || defaultTrainingSelection;
  parsed.contrastSelection = parsed.contrastSelection || defaultContrastSelection();
  parsed.contrastSelection.K1 = normalizeContrastSlots(parsed.contrastSelection.K1);
  parsed.contrastSelection.K2 = normalizeContrastSlots(parsed.contrastSelection.K2);
  parsed.prs = parsed.prs || {};
  parsed.contrastLibrary = normalizeContrastLibrary(parsed.contrastLibrary || []);
  parsed.exerciseModes = { ...structuredClone(defaultExerciseModes), ...(parsed.exerciseModes || {}) };
  parsed.trainingSessions = createTrainingSessions(parsed.schedule.trainingStartDate, parsed.trainingSessions || parsed.sessions || []);
  parsed.contrastSessions = createContrastSessions(parsed.schedule.contrastStartDate, parsed.contrastSessions || []);

  if (!parsed.phases) {
    parsed.phases = normalizeOldState(parsed).phases;
  }

  parsed.phases = dedupePhases(parsed.phases.map(normalizePhase));
  mergeContrastExercisesIntoLibrary(parsed);
  parsed.selectedPhaseId = parsed.selectedPhaseId || parsed.phases[0]?.id || null;
  ensureAllSessionExercises(parsed);
  return parsed;
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    return normalizeAppState(JSON.parse(saved));
  }

  const legacy = localStorage.getItem(legacyKey);
  if (legacy) {
    return normalizeAppState(normalizeOldState(JSON.parse(legacy)));
  }

  const initialState = {
    activePhase: "training",
    schedule: structuredClone(defaultSchedule),
    selectedPhaseId: `phase-training-${defaultSchedule.trainingStartDate}`,
    phases: dedupePhases([
      createTrainingPhase(defaultSchedule.trainingStartDate),
      createContrastPhase(defaultSchedule.contrastStartDate),
    ]),
    exerciseModes: structuredClone(defaultExerciseModes),
    selection: structuredClone(defaultTrainingSelection),
    contrastSelection: defaultContrastSelection(),
    contrastLibrary: [],
    prs: {},
    trainingSessions: createTrainingSessions(defaultSchedule.trainingStartDate),
    contrastSessions: createContrastSessions(defaultSchedule.contrastStartDate),
  };
  ensureAllSessionExercises(initialState);
  return initialState;
}

function createInitialState() {
  const initialState = {
    activePhase: "training",
    schedule: structuredClone(defaultSchedule),
    selectedPhaseId: null,
    phases: [],
    exerciseModes: structuredClone(defaultExerciseModes),
    selection: structuredClone(defaultTrainingSelection),
    contrastSelection: defaultContrastSelection(),
    contrastLibrary: [],
    prs: {},
    trainingSessions: [],
    contrastSessions: [],
  };
  ensureAllSessionExercises(initialState);
  return initialState;
}

function saveState() {
  rebuildPrs();
  mergeContrastExercisesIntoLibrary(state);
  state.activePhase = currentPhase;
  state.selectedPhaseId = selectedPhaseId;
  const firstTraining = state.phases.find((phase) => phase.type === "training");
  const firstContrast = state.phases.find((phase) => phase.type === "contrast");
  if (firstTraining) {
    state.schedule.trainingStartDate = firstTraining.startDate;
    state.selection = firstTraining.selection;
    state.trainingSessions = firstTraining.sessions;
  }
  if (firstContrast) {
    state.schedule.contrastStartDate = firstContrast.startDate;
    state.contrastSelection = firstContrast.contrastSelection;
    state.contrastSessions = firstContrast.sessions;
  }
  localStorage.setItem(storageKey, JSON.stringify(state));
  queueRemoteSave();
}

function getSelectedPhase() {
  return state.phases.find((phase) => phase.id === selectedPhaseId) || state.phases[0] || null;
}

function activeSessions() {
  return getSelectedPhase()?.sessions || [];
}

function getCurrentSession() {
  return activeSessions()[currentIndex];
}

function getSelectedTrainingExercises(training, appState = state, phase = getSelectedPhase()) {
  return (phase.selection || appState.selection)[training]
    .map((code) => getExerciseTemplate(code, appState))
    .filter(Boolean);
}

function getSelectedContrastExercises(training, appState = state, phase = getSelectedPhase()) {
  return (phase.contrastSelection || appState.contrastSelection)[training]
    .map((exercise, index) => ({
      code: `${training}-${index + 1}`,
      name: exercise.name.trim(),
      mode: exercise.mode,
      defaultBar: exercise.mode === "barbell" ? Number(exercise.bar || 20) : 0,
      bar: exercise.mode === "barbell" ? Number(exercise.bar || 20) : 0,
    }))
    .filter((exercise) => exercise.name);
}

function getSelectedExercises(session = getCurrentSession()) {
  if (!session) return [];
  if (session.phase === "contrast") {
    return getSelectedContrastExercises(session.training, state, getSelectedPhase());
  }

  return getSelectedTrainingExercises(session.training, state, getSelectedPhase());
}

function ensureSessionExercises(appState, session) {
  const phase = appState.phases?.find((item) => item.sessions?.some((phaseSession) => phaseSession.id === session.id)) || getSelectedPhase();
  const selected =
    session.phase === "contrast"
      ? getSelectedContrastExercises(session.training, appState, phase)
      : getSelectedTrainingExercises(session.training, appState, phase);
  const nextExercises = { ...session.exercises };

  selected.forEach((meta) => {
    nextExercises[meta.code] = session.exercises[meta.code] || {
      code: meta.code,
      name: meta.name,
      mode: meta.mode,
      bar: meta.defaultBar,
      sets: createEmptySets(meta.mode),
    };
    const snapshotMode = nextExercises[meta.code].mode || meta.mode;
    nextExercises[meta.code].mode = snapshotMode;
    nextExercises[meta.code].name = nextExercises[meta.code].name || meta.name;
    nextExercises[meta.code].sets = nextExercises[meta.code].sets.map((value) => normalizeSetValue(snapshotMode, value));
  });

  session.exercises = nextExercises;
}

function ensureAllSessionExercises(appState) {
  if (appState.phases) {
    appState.phases.forEach((phase) => phase.sessions.forEach((session) => ensureSessionExercises(appState, session)));
    return;
  }
  appState.trainingSessions.forEach((session) => ensureSessionExercises(appState, session));
  appState.contrastSessions.forEach((session) => ensureSessionExercises(appState, session));
}

function effectiveOccurrenceAt(index) {
  const sessions = activeSessions();
  const session = sessions[index];
  if (session.status === "skipped") {
    return null;
  }

  return sessions
    .slice(0, index + 1)
    .filter((item) => item.training === session.training && item.status !== "skipped").length;
}

function calculatePrs(beforeDate = null) {
  const prs = {};
  const fallbackPrs = {};

  const trainingSessions = state.phases
    .filter((phase) => phase.type === "training")
    .flatMap((phase) =>
      phase.sessions.map((session, index) => ({
        phase,
        session,
        index,
      })),
    )
    .sort((a, b) => a.session.date.localeCompare(b.session.date));

  trainingSessions.forEach(({ phase, session, index }) => {
    if (beforeDate && session.date >= beforeDate) return;
    if (session.status !== "done") return;

    const occurrence = effectiveOccurrenceInPhase(phase, index);

    Object.entries(session.exercises).forEach(([code, entry]) => {
      if (entry.skipped) return;
      const meta = { ...getCatalogExercise(code), mode: entry.mode || getCatalogExercise(code)?.mode, name: entry.name || getCatalogExercise(code)?.name };
      if (!meta) return;

      const value = bestExerciseValue(meta, entry);
      if (value === null) return;

      const target = occurrence >= 5 ? prs : fallbackPrs;
      if (!target[code] || comparePerformance(value, target[code].performance || target[code]) > 0) {
        target[code] = {
          performance: value,
          date: session.date,
          sessionId: session.id,
          source: occurrence >= 5 ? "pr-window" : "fallback",
        };
      }
    });
  });

  return { ...fallbackPrs, ...prs };
}

function effectiveOccurrenceInPhase(phase, index) {
  const session = phase.sessions[index];
  if (session.status === "skipped") return null;
  return phase.sessions
    .slice(0, index + 1)
    .filter((item) => item.training === session.training && item.status !== "skipped").length;
}

function rebuildPrs() {
  state.prs = calculatePrs();
}

function findInitialPosition() {
  const allSessions = state.phases
    .flatMap((phase) => phase.sessions.map((session, index) => ({ phaseId: phase.id, phase: phase.type, index, date: session.date })))
    .sort((a, b) => a.date.localeCompare(b.date));

  const todaySession = allSessions.find((session) => session.date === today);
  if (todaySession) {
    return { phase: todaySession.phase, phaseId: todaySession.phaseId, index: todaySession.index };
  }

  const nextSession = allSessions.find((session) => session.date > today);
  if (nextSession) {
    return { phase: nextSession.phase, phaseId: nextSession.phaseId, index: nextSession.index };
  }

  const lastSession = allSessions.at(-1);
  if (!lastSession) {
    return { phase: "training", phaseId: null, index: 0 };
  }
  return { phase: lastSession.phase, phaseId: lastSession.phaseId, index: lastSession.index };
}

function statusText(status) {
  return {
    planned: "Geplant",
    done: "Erledigt",
    skipped: "Geskippt",
  }[status];
}

function exerciseNames(session) {
  let exercises = [];
  try {
    exercises = getSelectedExercises(session);
  } catch (error) {
    console.error(error);
  }
  if (!exercises.length) {
    return "<em>Übungen festlegen</em>";
  }

  return exercises
    .map((exercise) => {
      const isSkipped = Boolean(session.exercises?.[exercise.code]?.skipped);
      return `<em class="${isSkipped ? "exercise-name-skipped" : ""}">${exercise.code} - ${exercise.name}</em>`;
    })
    .join("");
}

function renderSetup() {
  const grid = document.querySelector("#setup-grid");
  const scheduleSettings = document.querySelector("#schedule-settings");
  if (!selectedPhaseId && state.phases.length) {
    selectedPhaseId = state.phases[0].id;
  }
  const phase = getSelectedPhase();
  const phaseList = document.querySelector("#phase-list");
  const phaseEditor = document.querySelector("#phase-editor");
  phaseEditor.hidden = !settingsPhaseOpen;

  phaseList.innerHTML = state.phases
    .map(
      (item) => `
        <div class="phase-list-item ${item.id === selectedPhaseId ? "active" : ""}" data-phase-item-id="${item.id}">
          <button class="phase-select" type="button" data-phase-id="${item.id}">
            <strong>${phaseLabel(item)}</strong>
            <span>${item.sessions.length} Trainings</span>
          </button>
          <div class="phase-actions">
            <button class="small-icon-button" type="button" data-toggle-phase-id="${item.id}" aria-label="Phase verwalten">${item.id === selectedPhaseId && settingsPhaseOpen ? "-" : "+"}</button>
            <button class="phase-delete" type="button" data-delete-phase-id="${item.id}" aria-label="Phase löschen">Löschen</button>
          </div>
        </div>
      `,
    )
    .join("");

  const selectedPhaseItem = phaseList.querySelector(`[data-phase-item-id="${selectedPhaseId}"]`);
  if (selectedPhaseItem) {
    selectedPhaseItem.appendChild(phaseEditor);
  }

  try {
    renderExerciseModeSettings();
  } catch (error) {
    console.error(error);
  }

  if (!phase) {
    document.querySelector("#setup-label").textContent = "Planung";
    scheduleSettings.innerHTML = "";
    grid.className = "setup-grid";
    grid.innerHTML = `
      <section class="exercise empty-state">
        <h2>Keine Phase ausgewählt</h2>
        <p>Wähle oben ein Startdatum und füge ein Training oder Kontrastprogramm hinzu.</p>
      </section>
    `;
    return;
  }

  if (phase.type === "training") {
    document.querySelector("#setup-label").textContent = "4 Wochen";
    scheduleSettings.innerHTML = `
      <label>
        <span>Training startet</span>
        <input type="date" value="${phase.startDate}" data-phase-start />
      </label>
    `;
    const options = exerciseCatalog
      .map((exercise) => `<option value="${exercise.code}">${exercise.code} - ${exercise.name}</option>`)
      .join("");

    grid.className = "setup-grid";
    grid.innerHTML = ["A", "B"]
      .flatMap((training) =>
        [0, 1].map(
          (slot) => `
            <label>
              <span>Training ${training} · Übung ${slot + 1}</span>
              <select data-select-training="${training}" data-select-slot="${slot}">${options}</select>
            </label>
          `,
        ),
      )
      .join("");

    document.querySelectorAll("[data-select-training]").forEach((select) => {
      select.value = phase.selection[select.dataset.selectTraining][Number(select.dataset.selectSlot)];
    });
    return;
  }

  document.querySelector("#setup-label").textContent = "2 Wochen";
  scheduleSettings.innerHTML = `
    <label>
      <span>Kontrast startet</span>
      <input type="date" value="${phase.startDate}" data-phase-start />
    </label>
  `;
  grid.className = "contrast-setup";
  grid.innerHTML = ["K1", "K2"]
    .map(
      (training) => `
        <section class="contrast-column">
          <h3>${training === "K1" ? "Kontrast 1" : "Kontrast 2"}</h3>
          ${phase.contrastSelection[training]
            .map((exercise, index) => renderContrastSetupRow(training, exercise, index))
            .join("")}
        </section>
      `,
    )
    .join("");
}

function modeOptions(selectedMode) {
  return `
    <option value="barbell" ${selectedMode === "barbell" ? "selected" : ""}>Stange</option>
    <option value="dumbbell" ${selectedMode === "dumbbell" ? "selected" : ""}>Hantel</option>
    <option value="cable" ${selectedMode === "cable" ? "selected" : ""}>Kabelzug</option>
    <option value="bands" ${selectedMode === "bands" ? "selected" : ""}>Bänder</option>
    <option value="machine" ${selectedMode === "machine" ? "selected" : ""}>Maschine</option>
    <option value="bodyweight" ${selectedMode === "bodyweight" ? "selected" : ""}>Körpergewicht</option>
  `;
}

function renderExerciseModeSettings() {
  const container = document.querySelector("#exercise-mode-list");
  container.hidden = !exerciseModesOpen;
  document.querySelector("#toggle-exercise-modes").textContent = exerciseModesOpen ? "-" : "+";
  document.querySelector("#toggle-exercise-modes").setAttribute("aria-label", exerciseModesOpen ? "Übungsverwaltung einklappen" : "Übungsverwaltung anzeigen");
  const trainingRows = exerciseCatalog
    .map((exercise) => {
      const mode = state.exerciseModes?.[exercise.code] || exercise.mode;
      return `
        <label class="exercise-mode-row">
          <span>${exercise.code} - ${exercise.name}</span>
          <select data-exercise-mode="${exercise.code}">
            ${modeOptions(mode)}
          </select>
        </label>
      `;
    })
    .join("");

  const contrastRows = collectGlobalContrastExercises().map(renderGlobalContrastManagementRow).join("");

  container.innerHTML = `
    <section class="exercise-management-section">
      <h3>Training</h3>
      ${trainingRows}
    </section>
    <section class="exercise-management-section">
      <h3>Kontrast</h3>
      ${contrastRows ? `<div class="contrast-management-list">${contrastRows}</div>` : `<div class="empty-state compact-empty"><p>Noch keine Kontrastübungen eingetragen.</p></div>`}
    </section>
  `;
}

function contrastExerciseKey(name) {
  return name.trim().toLocaleLowerCase("de-CH");
}

function collectGlobalContrastExercises() {
  return normalizeContrastLibrary(state.contrastLibrary || []);
}

function mergeContrastExercisesIntoLibrary(appState = state) {
  const exercises = new Map(normalizeContrastLibrary(appState.contrastLibrary || []).map((exercise) => [exercise.key, exercise]));

  appState.phases
    .filter((phase) => phase.type === "contrast")
    .forEach((phase) => {
      ["K1", "K2"].forEach((training) => {
        phase.contrastSelection[training].forEach((exercise) => {
          const name = exercise.name.trim();
          if (!name) return;
          const key = contrastExerciseKey(name);
          if (!exercises.has(key)) {
            exercises.set(key, {
              key,
              name,
              mode: exercise.mode,
              bar: exercise.mode === "barbell" ? Number(exercise.bar || 20) : 0,
            });
          }
        });
      });
    });

  appState.contrastLibrary = normalizeContrastLibrary(Array.from(exercises.values()));
  return appState.contrastLibrary;
}

function renderGlobalContrastManagementRow(exercise) {
  return `
    <div class="contrast-row contrast-management-row">
      <label>
        <span>Kontrastübung</span>
        <input type="text" value="${exercise.name}" placeholder="Name" data-contrast-global-key="${exercise.key}" data-contrast-global-field="name" />
      </label>
      <label>
        <span>Typ</span>
        <select data-contrast-global-key="${exercise.key}" data-contrast-global-field="mode">
          ${modeOptions(exercise.mode)}
        </select>
      </label>
      <label class="${exercise.mode === "barbell" ? "" : "hidden-field"}">
        <span>Stange</span>
        <input type="number" inputmode="decimal" min="0" step="0.25" value="${exercise.bar}" data-contrast-global-key="${exercise.key}" data-contrast-global-field="bar" />
      </label>
      <button class="phase-delete" type="button" data-delete-contrast-key="${exercise.key}" aria-label="${exercise.name} löschen">Löschen</button>
    </div>
  `;
}

function renderContrastSetupRow(training, exercise, index) {
  const listId = `contrast-exercise-options-${training}-${index}`;
  const options = collectGlobalContrastExercises()
    .map((item) => `<option value="${item.name}"></option>`)
    .join("");

  return `
    <div class="contrast-row">
      <label>
        <span>Übung ${index + 1}</span>
        <input type="text" value="${exercise.name}" placeholder="Name" list="${listId}" data-contrast-training="${training}" data-contrast-slot="${index}" data-contrast-field="name" />
        <datalist id="${listId}">${options}</datalist>
      </label>
      <label>
        <span>Typ</span>
        <select data-contrast-training="${training}" data-contrast-slot="${index}" data-contrast-field="mode">
          <option value="barbell" ${exercise.mode === "barbell" ? "selected" : ""}>Stange</option>
          <option value="dumbbell" ${exercise.mode === "dumbbell" ? "selected" : ""}>Hantel</option>
          <option value="cable" ${exercise.mode === "cable" ? "selected" : ""}>Kabelzug</option>
          <option value="bands" ${exercise.mode === "bands" ? "selected" : ""}>Bänder</option>
          <option value="machine" ${exercise.mode === "machine" ? "selected" : ""}>Maschine</option>
          <option value="bodyweight" ${exercise.mode === "bodyweight" ? "selected" : ""}>Körpergewicht</option>
        </select>
      </label>
      <label class="${exercise.mode === "barbell" ? "" : "hidden-field"}">
        <span>Stange</span>
        <input type="number" inputmode="decimal" min="0" step="0.25" value="${exercise.bar}" data-contrast-training="${training}" data-contrast-slot="${index}" data-contrast-field="bar" />
      </label>
    </div>
  `;
}

function renderCalendar() {
  const calendar = document.querySelector("#calendar-grid");
  document.querySelector("#toggle-calendar").textContent = calendarExpanded ? "-" : "+";
  document.querySelector("#toggle-calendar").setAttribute("aria-label", calendarExpanded ? "Kalender einklappen" : "Kalender anzeigen");
  const sessions = activeSessions();
  const visibleSessions = calendarExpanded
    ? sessions.map((session, index) => ({ session, index }))
    : sessions
        .map((session, index) => ({ session, index }))
        .filter(({ index }) => Math.floor(index / 3) === Math.floor(currentIndex / 3));

  calendar.innerHTML = visibleSessions
    .map(({ session, index }) => {
      const isSelected = index === currentIndex;
      const occurrence = session.phase === "training" ? effectiveOccurrenceAt(index) : session.occurrence;
      const isPrBadge = session.phase === "training" && occurrence === 5;
      const title =
        session.phase === "training"
          ? occurrence
            ? `Training ${session.training} - ${occurrence}`
            : `Training ${session.training} - geskippt`
          : `${session.training === "K1" ? "Kontrast 1" : "Kontrast 2"} - ${occurrence}`;

      return `
        <button
          class="calendar-day ${isSelected ? "selected" : ""} ${session.status} ${isPrBadge ? "pr-day" : ""}"
          type="button"
          data-session-index="${index}"
        >
          <span>${formatShortDate(session.date)}</span>
          <strong>${title}</strong>
          <div class="calendar-exercises">${exerciseNames(session)}</div>
          <small>${statusText(session.status)}</small>
        </button>
      `;
    })
    .join("");
}

function renderPhasePicker() {
  const select = document.querySelector("#phase-select");
  select.innerHTML = state.phases
    .map((phase) => `<option value="${phase.id}">${phaseLabel(phase)}</option>`)
    .join("");
  select.value = selectedPhaseId || "";
}

function contrastBestBefore(name, mode, beforeDate) {
  const targetName = contrastExerciseKey(name || "");
  if (!targetName) return null;
  let bestMatch = null;

  state.phases
    .filter((phase) => phase.type === "contrast")
    .flatMap((phase) => phase.sessions)
    .filter((session) => session.status === "done" && session.date < beforeDate)
    .forEach((session) => {
      Object.values(session.exercises || {}).forEach((entry) => {
        if (contrastExerciseKey(entry.name || "") !== targetName) return;
        const entryMode = entry.mode || mode || "barbell";
        if (mode && entryMode !== mode) return;
        const meta = {
          code: entry.name || name,
          name: entry.name || name,
          mode: entryMode,
          defaultBar: entryMode === "barbell" ? Number(entry.bar || 20) : 0,
        };
        const best = bestExerciseSet(meta, entry);
        if (!best) return;
        if (!bestMatch || comparePerformance(best.performance, bestMatch.performance) > 0) {
          bestMatch = {
            performance: best.performance,
            date: session.date,
            setNumber: best.setNumber,
          };
        }
      });
    });

  return bestMatch;
}

function renderExercises() {
  const session = getCurrentSession();
  const form = document.querySelector("#workout-form");
  const priorPrs = session.phase === "training" ? calculatePrs(session.date) : {};
  const selectedExercises = getSelectedExercises(session);

  if (!selectedExercises.length) {
    form.innerHTML = `
      <section class="exercise empty-state">
        <h2>Übungen festlegen</h2>
        <p>Öffne Settings und trage dort zuerst die fixen Übungen für dieses Kontrasttraining ein.</p>
      </section>
    `;
    return;
  }

  form.innerHTML = selectedExercises
    .map((meta) => {
      const entry = session.exercises[meta.code] || { bar: meta.defaultBar, sets: createEmptySets(meta.mode) };
      const displayMeta = { ...meta, mode: entry.mode || meta.mode, name: entry.name || meta.name };
      const isSkipped = Boolean(entry.skipped);
      const highlightedSet = highlightedSetIndex(session, displayMeta, entry);
      const pr = priorPrs[meta.code];
      const prLabel = pr ? `<p class="pr-label">PR: ${formatPerformance(pr.performance || pr)} · ${formatPrDate(pr.date)}</p>` : "";
      const contrastBest = session.phase === "contrast" ? contrastBestBefore(displayMeta.name, displayMeta.mode, session.date) : null;
      const contrastBestLabel = contrastBest
        ? `<p class="pr-label">Bestleistung: ${formatPerformance(contrastBest.performance)} · ${formatPrDate(contrastBest.date)}</p>`
        : "";
      const barControl =
        displayMeta.mode === "barbell"
          ? `
            <label>
              <span>Stange</span>
              <input type="number" inputmode="decimal" min="0" step="0.25" name="${meta.code}-bar" value="${entry.bar}" data-bar="${meta.code}" ${isSkipped ? "disabled" : ""} />
            </label>
          `
          : `
            <div class="bodyweight-pill">${modeLabel(displayMeta.mode)}</div>
          `;

      return `
        <section class="exercise ${isSkipped ? "exercise-skipped" : ""}" data-exercise="${meta.code}">
          <div class="exercise-head">
            <div>
              <p class="code">${meta.code}</p>
              <h2>${displayMeta.name}</h2>
              ${isSkipped ? `<p class="skip-note">Übung geskippt</p>` : prLabel || contrastBestLabel}
            </div>
            <div class="exercise-actions">
              <button class="exercise-skip-button ${isSkipped ? "active" : ""}" type="button" data-toggle-exercise-skip="${meta.code}">
                ${isSkipped ? "Skip aufheben" : "Übung skippen"}
              </button>
              ${barControl}
            </div>
          </div>
          <div class="sets" aria-label="Sätze für ${meta.code}">
            ${entry.sets.map((value, index) => renderSetRow(displayMeta, value, index, highlightedSet, isSkipped)).join("")}
          </div>
        </section>
      `;
    })
    .join("");

  form.insertAdjacentHTML(
    "beforeend",
    `
      <section class="notes">
        <label>
          <span>Notizen</span>
          <textarea id="notes" rows="3" placeholder="Gefühl, Technik, Besonderheiten">${session.notes || ""}</textarea>
        </label>
      </section>
    `,
  );
}

function highlightedSetIndex(session, meta, entry) {
  if (session.phase !== "contrast") return 2;
  const best = bestExerciseSet(meta, entry);
  return best ? best.setNumber - 1 : 2;
}

function renderSetRow(meta, value, index, highlightedSet = 2, disabled = false) {
  if (meta.mode === "bands") {
    return renderBandSetRow(meta, normalizeSetValue(meta.mode, value), index, highlightedSet, disabled);
  }
  const setNumber = index + 1;
  const isHeavySet = index === highlightedSet;
  const suffix = setInputSuffix(meta.mode);

  return `
    <div class="set-row ${isHeavySet ? "heavy" : ""}">
      <div class="set-number">Satz ${setNumber}</div>
      <label class="side-input" aria-label="${meta.code} Satz ${setNumber}">
        <input
          type="number"
          inputmode="decimal"
          min="0"
          step="0.25"
          value="${value}"
          data-exercise="${meta.code}"
          data-set="${index}"
          ${disabled ? "disabled" : ""}
        />
        <span>${suffix}</span>
      </label>
      <div class="total" data-total="${meta.code}-${index}"></div>
    </div>
  `;
}

function renderBandSetRow(meta, value, index, highlightedSet = 2, disabled = false) {
  const setNumber = index + 1;
  const isHeavySet = index === highlightedSet;
  const bands = value.bands || [];
  const bodyweight = Boolean(value.bodyweight);

  return `
    <div class="set-row band-set-row ${isHeavySet ? "heavy" : ""}">
      <div class="set-number">Satz ${setNumber}</div>
      <div class="band-controls" data-exercise="${meta.code}" data-set="${index}">
        ${["green", "red", "black"]
          .map(
            (band) => `
              <label class="band-toggle">
                <input type="checkbox" data-band="${band}" ${bands.includes(band) ? "checked" : ""} ${disabled ? "disabled" : ""} />
                <span>${bandLabels[band]}</span>
              </label>
            `,
          )
          .join("")}
        <label class="band-toggle bodyweight-toggle">
          <input type="checkbox" data-bodyweight ${bodyweight ? "checked" : ""} ${disabled ? "disabled" : ""} />
          <span>Körper</span>
        </label>
        <label class="band-extra">
          <span>Zusatz</span>
          <input type="number" inputmode="decimal" min="0" step="0.25" value="${value.extraWeight}" data-band-extra ${disabled ? "disabled" : ""} />
        </label>
      </div>
      <div class="total" data-total="${meta.code}-${index}"></div>
    </div>
  `;
}

function syncFromInputs() {
  const session = getCurrentSession();
  if (!session) return;
  ensureSessionExercises(state, session);

  document.querySelectorAll("[data-bar]").forEach((input) => {
    const code = input.dataset.bar;
    if (!session.exercises[code]) return;
    session.exercises[code].bar = clampNumberInput(input);
  });

  document.querySelectorAll("[data-set]").forEach((input) => {
    const code = input.dataset.exercise;
    if (!session.exercises[code]) return;
    session.exercises[code].sets[Number(input.dataset.set)] = input.value === "" ? "" : clampNumberInput(input);
  });

  document.querySelectorAll(".band-controls").forEach((controls) => {
    const code = controls.dataset.exercise;
    if (!session.exercises[code]) return;
    const setIndex = Number(controls.dataset.set);
    const extraInput = controls.querySelector("[data-band-extra]");
    const extraWeight = extraInput.value === "" ? "" : clampNumberInput(extraInput);
    const bodyweight = controls.querySelector("[data-bodyweight]").checked || Number(extraWeight || 0) > 0;
    const bands = bodyweight ? [] : Array.from(controls.querySelectorAll("[data-band]:checked")).map((input) => input.dataset.band);
    session.exercises[code].sets[setIndex] = { bands, bodyweight, extraWeight };
  });

  const notes = document.querySelector("#notes");
  if (notes) {
    session.notes = notes.value;
  }
}

function safeSyncFromInputs() {
  try {
    syncFromInputs();
  } catch (error) {
    console.error(error);
    setSyncStatus("Eingaben konnten nicht gelesen werden");
  }
}

function normalizeBandChoice(event) {
  const controls = event.target.closest(".band-controls");
  if (!controls) return;
  if (event.target.matches("[data-bodyweight]") && event.target.checked) {
    controls.querySelectorAll("[data-band]").forEach((input) => {
      input.checked = false;
    });
  }
  if (event.target.matches("[data-band]") && event.target.checked) {
    controls.querySelector("[data-bodyweight]").checked = false;
    controls.querySelector("[data-band-extra]").value = "";
  }
  if (event.target.matches("[data-band-extra]") && Number(event.target.value || 0) > 0) {
    controls.querySelector("[data-bodyweight]").checked = true;
    controls.querySelectorAll("[data-band]").forEach((input) => {
      input.checked = false;
    });
  }
}

function updateTotals() {
  const session = getCurrentSession();

  getSelectedExercises(session).forEach((meta) => {
    const code = meta.code;
    const entry = session.exercises[code];
    if (!entry) return;

    entry.sets.forEach((value, index) => {
      const target = document.querySelector(`[data-total="${code}-${index}"]`);
      if (!target) return;
      if (entry.skipped) {
        target.textContent = "Geskippt";
        return;
      }
      const normalized = normalizeSetValue(meta.mode, value);
      target.textContent = isEmptySet(normalized)
        ? "-"
        : meta.mode === "bands"
          ? formatBandValue(normalized)
          : formatKg(totalWeight({ ...meta, bar: entry.bar }, normalized));
    });
  });
}

function updateSummary() {
  const session = getCurrentSession();
  const summary = document.querySelector("#summary-grid");
  if (!summary || !session) return;
  ensureSessionExercises(state, session);
  const currentPrs = calculatePrs();
  const selectedExercises = getSelectedExercises(session);

  if (!selectedExercises.length) {
    summary.innerHTML = "";
    return;
  }

  summary.innerHTML = selectedExercises
    .map((meta) => {
      const code = meta.code;
      const entry = session.exercises[code];
      if (entry.skipped) {
        return `
          <div class="summary-card muted-card">
            <div>
              <span class="label">${code}</span>
              <div>Übung geskippt</div>
            </div>
            <strong>-</strong>
          </div>
        `;
      }
      const performances = entry.sets
        .map((value) => normalizeSetValue(meta.mode, value))
        .map((value) => (isEmptySet(value) ? null : performanceForSet(meta, entry, value)));
      const heavySet = performances[2];
      const best = performances.reduce((bestValue, current) => (comparePerformance(current, bestValue) > 0 ? current : bestValue), null);
      const display = heavySet ? formatPerformance(heavySet) : formatPerformance(best);
      const storedPr = session.phase === "training" ? currentPrs[code] : null;
      const prLine = storedPr ? `<div class="summary-note">Aktueller PR: ${formatPerformance(storedPr.performance || storedPr)} · ${formatPrDate(storedPr.date)}</div>` : "";

      return `
        <div class="summary-card">
          <div>
            <span class="label">${code}</span>
            <div>Schwerster Satz: Satz 3</div>
            ${prLine}
          </div>
          <strong>${display}</strong>
        </div>
      `;
    })
    .join("");
}

function collectTrainingStats() {
  const stats = {};

  state.phases
    .filter((phase) => phase.type === "training")
    .forEach((phase) => {
      phase.sessions.forEach((session) => {
        if (session.status !== "done") return;

        Object.entries(session.exercises || {}).forEach(([code, entry]) => {
          if (entry.skipped) return;
          const catalog = getCatalogExercise(code);
          const meta = {
            ...catalog,
            code,
            name: entry.name || catalog?.name || code,
            mode: entry.mode || getExerciseTemplate(code)?.mode || catalog?.mode || "barbell",
          };
          const best = exerciseSetPerformance(meta, entry, 2);
          if (!best) return;

          if (!stats[code] || comparePerformance(best.performance, stats[code].performance) > 0) {
            stats[code] = {
              code,
              name: meta.name,
              date: session.date,
              setNumber: best.setNumber,
              setLabel: "PB-Satz",
              performance: best.performance,
            };
          }
        });
      });
    });

  return Object.values(stats).sort((a, b) => a.code.localeCompare(b.code, "de-CH", { numeric: true }));
}

function collectContrastStats() {
  const stats = {};

  state.phases
    .filter((phase) => phase.type === "contrast")
    .forEach((phase) => {
      phase.sessions.forEach((session) => {
        if (session.status !== "done") return;

        Object.values(session.exercises || {}).forEach((entry) => {
          if (entry.skipped) return;
          const name = (entry.name || "").trim();
          if (!name) return;
          const mode = entry.mode || "barbell";
          const meta = {
            code: name,
            name,
            mode,
            defaultBar: mode === "barbell" ? Number(entry.bar || 20) : 0,
          };
          const best = bestExerciseSet(meta, entry);
          if (!best) return;
          const key = `${name.toLocaleLowerCase("de-CH")}::${mode}`;

          if (!stats[key] || comparePerformance(best.performance, stats[key].performance) > 0) {
            stats[key] = {
              code: name,
              name: modeLabel(mode),
              date: session.date,
              setNumber: best.setNumber,
              setLabel: "Schwerster Satz",
              performance: best.performance,
            };
          }
        });
      });
    });

  return Object.values(stats).sort((a, b) => a.code.localeCompare(b.code, "de-CH", { sensitivity: "base" }));
}

function renderStats() {
  const grid = document.querySelector("#stats-grid");
  if (!grid) return;

  document.querySelectorAll("[data-stat-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.statMode === statsMode);
  });

  if (!syncUser) {
    grid.innerHTML = `
      <div class="empty-state">
        <h2>Einloggen erforderlich</h2>
        <p>Bitte melde dich in Settings an, damit deine Statistik geladen werden kann.</p>
      </div>
    `;
    return;
  }

  const items = statsMode === "training" ? collectTrainingStats() : collectContrastStats();
  if (!items.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <h2>Noch keine PBs</h2>
        <p>Erledigte Trainings mit eingetragenen Sätzen erscheinen hier automatisch.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = items
    .map(
      (item) => `
        <div class="summary-card">
          <div>
            <span class="label">${item.code}</span>
            <div>${item.name}</div>
            <div class="summary-meta">${item.setLabel}: Satz ${item.setNumber} · ${formatPrDate(item.date)}</div>
          </div>
          <strong>${formatPerformance(item.performance)}</strong>
        </div>
      `,
    )
    .join("");
}

function renderScreen() {
  renderGate();
  renderStats();
  if (!syncUser) return;
  if (!state.phases.length) {
    renderEmptyPlan();
    renderSetup();
    return;
  }
  if (!state.phases.some((phase) => phase.id === selectedPhaseId)) {
    selectedPhaseId = state.phases[0]?.id || null;
  }
  currentIndex = Math.max(0, Math.min(currentIndex, activeSessions().length - 1));
  const session = getCurrentSession();
  const phase = getSelectedPhase();
  if (!session || !phase) {
    renderEmptyPlan();
    renderSetup();
    return;
  }
  ensureAllSessionExercises(state);
  rebuildPrs();

  const range = { start: phase.startDate, end: phaseEndDate(phase) };
  const week = session.phase === "training" ? Math.floor(currentIndex / 3) + 1 : Math.floor(currentIndex / 3) + 1;
  const occurrence = session.phase === "training" ? effectiveOccurrenceAt(currentIndex) : session.occurrence;
  const isSkipped = session.status === "skipped";
  const isPr = session.phase === "training" && occurrence >= 5;

  renderPhasePicker();

  document.querySelector("#block-label").textContent = `${session.phase === "training" ? "Training" : "Kontrast"} ${formatRange(range.start, range.end)} · Woche ${week}`;
  document.querySelector("#training-title").textContent =
    session.phase === "training" ? `Training ${session.training}` : session.training === "K1" ? "Kontrast 1" : "Kontrast 2";
  document.querySelector("#date-pill").textContent = formatDate(session.date);
  document.querySelector("#session-position").textContent = `Training ${currentIndex + 1} / ${activeSessions().length}`;
  document.querySelector("#session-status").textContent = statusText(session.status);
  document.querySelector("#occurrence-label").textContent = session.phase === "training" ? (occurrence ? `${occurrence} / 6` : "-") : `${occurrence} / 3`;
  document.querySelector("#focus-label").textContent = isSkipped ? "Pause" : isPr ? "PR-Tag" : session.phase === "training" ? "Aufbau" : "Kontrast";
  document.querySelector("#pr-callout").hidden = !isPr;
  document.querySelector("#prev-session").disabled = currentIndex === 0;
  document.querySelector("#next-session").disabled = currentIndex === activeSessions().length - 1;
  document.querySelector("#skip-session").textContent = session.status === "skipped" ? "Skip aufheben" : "Training skippen";
  document.querySelector("#complete-session").classList.toggle("active", session.status === "done");
  document.querySelector("#skip-session").classList.toggle("active", session.status === "skipped");

  renderSetup();
  renderCalendar();
  renderExercises();
  updateTotals();
  renderStats();
}

function renderEmptyPlan() {
  document.querySelector("#block-label").textContent = "Kein Plan";
  document.querySelector("#training-title").textContent = "Training";
  document.querySelector("#date-pill").textContent = "-";
  document.querySelector("#phase-select").innerHTML = "";
  document.querySelector("#calendar-grid").innerHTML = `
    <div class="empty-state">
      <h2>Keine Phase angelegt</h2>
      <p>Öffne Settings und lege dein erstes Training oder Kontrastprogramm an.</p>
    </div>
  `;
  document.querySelector("#session-position").textContent = "-";
  document.querySelector("#session-status").textContent = "Kein Plan";
  document.querySelector("#occurrence-label").textContent = "-";
  document.querySelector("#focus-label").textContent = "-";
  document.querySelector("#workout-form").innerHTML = "";
  renderStats();
}

function updateAndSave() {
  syncFromInputs();
  updateTotals();
  renderStats();
  renderCalendar();
  saveState();
}

function updateWorkoutInputs(event) {
  normalizeBandChoice(event);
  updateAndSave();
}

function updateBandChoiceAfterClick(event) {
  if (!event.target.closest(".band-controls")) return;
  window.setTimeout(() => {
    normalizeBandChoice(event);
    updateAndSave();
  }, 0);
}

function refreshContrastHighlight() {
  syncFromInputs();
  if (getCurrentSession()?.phase !== "contrast") return;
  renderExercises();
  updateTotals();
  saveState();
}

function toggleExerciseSkipped(code) {
  syncFromInputs();
  const session = getCurrentSession();
  if (!session?.exercises?.[code]) return;
  session.exercises[code].skipped = !session.exercises[code].skipped;
  saveState();
  renderScreen();
}

function setStatus(status) {
  syncFromInputs();
  getCurrentSession().status = status;
  saveState();
  renderScreen();
}

function updateTrainingSelection(select) {
  syncFromInputs();
  const phase = getSelectedPhase();
  const training = select.dataset.selectTraining;
  const slot = Number(select.dataset.selectSlot);
  phase.selection[training][slot] = select.value;
  ensureAllSessionExercises(state);
  saveState();
  renderScreen();
}

function syncContrastExerciseSnapshots(phase, training, slot) {
  const exercise = phase.contrastSelection[training][slot];
  const code = `${training}-${slot + 1}`;
  phase.sessions
    .filter((session) => session.training === training && session.status !== "done")
    .forEach((session) => {
      const entry = session.exercises?.[code];
      if (!entry) return;
      const previousMode = entry.mode || exercise.mode;
      entry.name = exercise.name;
      entry.mode = exercise.mode;
      entry.bar = exercise.mode === "barbell" ? Number(exercise.bar || 20) : 0;
      entry.sets =
        previousMode === exercise.mode
          ? (entry.sets || createEmptySets(exercise.mode)).map((value) => normalizeSetValue(exercise.mode, value))
          : createEmptySets(exercise.mode);
    });
}

function updateGlobalContrastExercise(input) {
  syncFromInputs();
  const key = input.dataset.contrastGlobalKey;
  const field = input.dataset.contrastGlobalField;
  const source = collectGlobalContrastExercises().find((exercise) => exercise.key === key);
  if (!source) return;

  const nextName = field === "name" ? input.value.trim() : source.name;
  const nextMode = field === "mode" ? input.value : source.mode;
  const nextBar = field === "bar" ? clampNumberInput(input) : source.bar;
  if (!nextName) return;

  state.contrastLibrary = normalizeContrastLibrary(
    (state.contrastLibrary || []).map((exercise) =>
      exercise.key === key || contrastExerciseKey(exercise.name) === key
        ? { key: contrastExerciseKey(nextName), name: nextName, mode: nextMode, bar: nextMode === "barbell" ? nextBar || 20 : 0 }
        : exercise,
    ),
  );

  state.phases
    .filter((phase) => phase.type === "contrast")
    .forEach((phase) => {
      ["K1", "K2"].forEach((training) => {
        phase.contrastSelection[training].forEach((exercise, slot) => {
          if (contrastExerciseKey(exercise.name) !== key) return;
          exercise.name = nextName;
          exercise.mode = nextMode;
          exercise.bar = nextMode === "barbell" ? nextBar || 20 : 0;
          syncContrastExerciseSnapshots(phase, training, slot);
        });
      });

      phase.sessions.forEach((session) => {
        Object.values(session.exercises || {}).forEach((entry) => {
          if (contrastExerciseKey(entry.name || "") !== key) return;
          entry.name = nextName;
          entry.mode = nextMode;
          entry.bar = nextMode === "barbell" ? nextBar || 20 : 0;
          entry.sets = (entry.sets || createEmptySets(nextMode)).map((value) => normalizeSetValue(nextMode, value));
        });
      });
    });

  ensureAllSessionExercises(state);
  saveState();
  renderScreen();
}

function deleteGlobalContrastExercise(key) {
  const exercise = collectGlobalContrastExercises().find((item) => item.key === key);
  if (!exercise) return;
  const confirmed = window.confirm(`${exercise.name} aus der globalen Kontrastliste löschen? Bereits erfasste Trainings bleiben bestehen.`);
  if (!confirmed) return;

  state.contrastLibrary = normalizeContrastLibrary((state.contrastLibrary || []).filter((item) => item.key !== key && contrastExerciseKey(item.name) !== key));
  saveState();
  renderScreen();
}

function updateContrastSelection(input) {
  syncFromInputs();
  const phase = input.dataset.contrastPhaseId
    ? state.phases.find((item) => item.id === input.dataset.contrastPhaseId)
    : getSelectedPhase();
  if (!phase) return;
  const training = input.dataset.contrastTraining;
  const slot = Number(input.dataset.contrastSlot);
  const field = input.dataset.contrastField;
  phase.contrastSelection[training][slot][field] = field === "bar" ? clampNumberInput(input) : input.value;
  if (field === "name") {
    const existing = collectGlobalContrastExercises().find((exercise) => contrastExerciseKey(exercise.name) === contrastExerciseKey(input.value));
    if (existing) {
      phase.contrastSelection[training][slot].mode = existing.mode;
      phase.contrastSelection[training][slot].bar = existing.mode === "barbell" ? Number(existing.bar || 20) : 0;
    } else if (input.value.trim()) {
      const exercise = phase.contrastSelection[training][slot];
      state.contrastLibrary = normalizeContrastLibrary([
        ...(state.contrastLibrary || []),
        {
          name: input.value.trim(),
          mode: exercise.mode,
          bar: exercise.mode === "barbell" ? Number(exercise.bar || 20) : 0,
        },
      ]);
    }
  }
  if (field === "mode" && input.value !== "barbell") {
    phase.contrastSelection[training][slot].bar = 0;
  }
  syncContrastExerciseSnapshots(phase, training, slot);
  ensureAllSessionExercises(state);
  saveState();
  renderScreen();
}

function updatePhaseStart(input) {
  syncFromInputs();
  const phase = getSelectedPhase();
  phase.startDate = input.value;
  phase.id = `phase-${phase.type}-${phase.startDate}`;
  phase.sessions =
    phase.type === "training"
      ? createTrainingSessions(phase.startDate, phase.sessions)
      : createContrastSessions(phase.startDate, phase.sessions);
  selectedPhaseId = phase.id;
  state.phases = dedupePhases(state.phases);
  ensureAllSessionExercises(state);
  currentIndex = Math.min(currentIndex, activeSessions().length - 1);
  saveState();
  renderScreen();
}

function updateExerciseMode(select) {
  state.exerciseModes[select.dataset.exerciseMode] = select.value;
  saveState();
  renderSetup();
}

function addPhase() {
  syncFromInputs();
  const startDate = document.querySelector("#new-phase-date").value;
  const type = document.querySelector("#new-phase-type").value;
  if (!startDate) return;

  const phase = type === "training" ? createTrainingPhase(startDate) : createContrastPhase(startDate);
  const existing = state.phases.find((item) => item.id === phase.id);
  const targetPhase = existing || phase;
  if (existing) {
    selectedPhaseId = existing.id;
  } else {
    state.phases.push(phase);
    state.phases = dedupePhases(state.phases);
    selectedPhaseId = phase.id;
  }
  currentPhase = targetPhase.type;
  currentIndex = 0;
  state.selectedPhaseId = selectedPhaseId;
  state.activePhase = currentPhase;
  ensureAllSessionExercises(state);
  saveState();
  renderSetup();
  renderScreen();
}

function deletePhase(phaseId) {
  const phase = state.phases.find((item) => item.id === phaseId);
  if (!phase) return;
  const confirmed = window.confirm(`${phaseLabel(phase)} löschen?`);
  if (!confirmed) return;

  state.phases = state.phases.filter((item) => item.id !== phaseId);
  if (selectedPhaseId === phaseId) {
    const position = findInitialPosition();
    selectedPhaseId = position.phaseId || state.phases[0]?.id || null;
    currentPhase = position.phase;
    currentIndex = position.index;
  }
  saveState();
  renderScreen();
}

async function resetAppState() {
  const confirmed = window.confirm("App zurücksetzen? Alle erfassten Trainings, Phasen, Werte und PRs werden gelöscht. Die Übungsverwaltung bleibt erhalten.");
  if (!confirmed) return;

  const preservedExerciseModes = structuredClone(state.exerciseModes || defaultExerciseModes);
  const preservedContrastLibrary = normalizeContrastLibrary(state.contrastLibrary || []);
  state = createInitialState();
  state.exerciseModes = preservedExerciseModes;
  state.contrastLibrary = preservedContrastLibrary;
  const position = findInitialPosition();
  selectedPhaseId = position.phaseId || state.phases[0]?.id || null;
  currentPhase = position.phase;
  currentIndex = position.index;
  localStorage.setItem(storageKey, JSON.stringify(state));
  renderScreen();
  if (syncUser) {
    await overwriteRemoteState(state);
  }
  setSyncStatus(syncUser ? "Neu gestartet" : "Lokal neu gestartet");
}

function setView(view) {
  if (currentView === "training" && view !== "training") {
    safeSyncFromInputs();
    saveState();
  }

  if (view === "training") {
    const position = findInitialPosition();
    selectedPhaseId = position.phaseId || state.selectedPhaseId || state.phases[0]?.id || null;
    currentPhase = position.phase;
    currentIndex = position.index;
  }

  currentView = view;
  document.querySelector("#training-view").hidden = view !== "training";
  document.querySelector("#stats-view").hidden = view !== "stats";
  document.querySelector("#settings-view").hidden = view !== "settings";
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  renderScreen();
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  setView(button.dataset.view);
});

document.querySelector("#phase-select").addEventListener("change", (event) => {
  safeSyncFromInputs();
  saveState();
  const targetPhase = state.phases.find((phase) => phase.id === event.target.value);
  if (!targetPhase) return;
  selectedPhaseId = targetPhase.id;
  currentPhase = targetPhase.type;
  currentIndex = 0;
  renderScreen();
});

document.querySelector("#settings-view").addEventListener("change", (event) => {
  const scheduleInput = event.target.closest("[data-phase-start]");
  if (scheduleInput) {
    updatePhaseStart(scheduleInput);
    return;
  }

  const trainingSelect = event.target.closest("[data-select-training]");
  if (trainingSelect) {
    updateTrainingSelection(trainingSelect);
    return;
  }

  const globalContrastInput = event.target.closest("[data-contrast-global-key]");
  if (globalContrastInput) {
    updateGlobalContrastExercise(globalContrastInput);
    return;
  }

  const contrastInput = event.target.closest("[data-contrast-training]");
  if (contrastInput) {
    updateContrastSelection(contrastInput);
    return;
  }

  const exerciseModeInput = event.target.closest("[data-exercise-mode]");
  if (exerciseModeInput) {
    updateExerciseMode(exerciseModeInput);
  }
});

document.querySelector("#phase-list").addEventListener("click", (event) => {
  const toggleButton = event.target.closest("[data-toggle-phase-id]");
  if (toggleButton) {
    const phaseId = toggleButton.dataset.togglePhaseId;
    if (selectedPhaseId === phaseId) {
      settingsPhaseOpen = !settingsPhaseOpen;
    } else {
      selectedPhaseId = phaseId;
      currentPhase = getSelectedPhase().type;
      currentIndex = 0;
      settingsPhaseOpen = true;
    }
    renderScreen();
    return;
  }

  const deleteButton = event.target.closest("[data-delete-phase-id]");
  if (deleteButton) {
    deletePhase(deleteButton.dataset.deletePhaseId);
    return;
  }

  const button = event.target.closest("[data-phase-id]");
  if (!button) return;
  safeSyncFromInputs();
  saveState();
  selectedPhaseId = button.dataset.phaseId;
  currentPhase = getSelectedPhase().type;
  currentIndex = 0;
  settingsPhaseOpen = false;
  renderScreen();
});

document.querySelector("#exercise-mode-list").addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-contrast-key]");
  if (!deleteButton) return;
  deleteGlobalContrastExercise(deleteButton.dataset.deleteContrastKey);
});

document.querySelector("#add-phase").addEventListener("click", addPhase);
document.querySelector("#reset-app-state").addEventListener("click", resetAppState);
document.querySelector("#toggle-exercise-modes").addEventListener("click", () => {
  exerciseModesOpen = !exerciseModesOpen;
  renderExerciseModeSettings();
});

document.querySelector("#workout-form").addEventListener("input", updateWorkoutInputs);
document.querySelector("#workout-form").addEventListener("change", updateWorkoutInputs);
document.querySelector("#workout-form").addEventListener("focusout", refreshContrastHighlight);
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-toggle-exercise-skip]");
  if (!button) return;
  event.preventDefault();
  toggleExerciseSkipped(button.dataset.toggleExerciseSkip);
});
document.querySelector("#workout-form").addEventListener("click", updateBandChoiceAfterClick);
document.querySelector("#calendar-grid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-session-index]");
  if (!button) return;
  safeSyncFromInputs();
  saveState();
  currentIndex = Number(button.dataset.sessionIndex);
  renderScreen();
});
document.querySelector("#toggle-calendar").addEventListener("click", () => {
  calendarExpanded = !calendarExpanded;
  renderCalendar();
});

document.querySelector("#stats-view").addEventListener("click", (event) => {
  const button = event.target.closest("[data-stat-mode]");
  if (!button) return;
  statsMode = button.dataset.statMode;
  renderStats();
});

document.querySelector("#prev-session").addEventListener("click", () => {
  safeSyncFromInputs();
  saveState();
  currentIndex = Math.max(0, currentIndex - 1);
  renderScreen();
});

document.querySelector("#next-session").addEventListener("click", () => {
  safeSyncFromInputs();
  saveState();
  currentIndex = Math.min(activeSessions().length - 1, currentIndex + 1);
  renderScreen();
});

document.querySelector("#complete-session").addEventListener("click", () => setStatus("done"));
document.querySelector("#skip-session").addEventListener("click", () => {
  setStatus(getCurrentSession().status === "skipped" ? "planned" : "skipped");
});
document.querySelector("#sign-in").addEventListener("click", signIn);
document.querySelector("#sign-up").addEventListener("click", signUp);
document.querySelector("#registration-toggle").addEventListener("change", (event) => {
  if (syncUser?.email !== registrationAdminEmail) {
    renderAuth();
    return;
  }
  localStorage.setItem(registrationEnabledKey, event.target.checked ? "true" : "false");
  renderAuth();
});
document.querySelector("#auth-action").addEventListener("click", signOut);
document.querySelector("#sync-now").addEventListener("click", pullRemoteState);

renderScreen();
saveState();
initSupabaseAuth();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
