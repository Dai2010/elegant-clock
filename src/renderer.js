const shell = window.elegantClock;
const storageKey = 'elegant-clock-settings';
const reminderStorageKey = 'elegant-clock-reminders';

const elements = {
  currentDate: document.querySelector('#current-date'),
  currentTime: document.querySelector('#current-time'),
  transparentToggle: document.querySelector('#transparent-toggle'),
  alwaysTopToggle: document.querySelector('#always-top-toggle'),
  minimizeBtn: document.querySelector('#minimize-btn'),
  maximizeBtn: document.querySelector('#maximize-btn'),
  closeBtn: document.querySelector('#close-btn'),
  pomodoroStatus: document.querySelector('#pomodoro-status'),
  pomodoroPhase: document.querySelector('#pomodoro-phase'),
  pomodoroCycle: document.querySelector('#pomodoro-cycle'),
  pomodoroDisplay: document.querySelector('#pomodoro-display'),
  pomodoroFocusInput: document.querySelector('#pomodoro-focus-input'),
  pomodoroShortInput: document.querySelector('#pomodoro-short-input'),
  pomodoroLongInput: document.querySelector('#pomodoro-long-input'),
  pomodoroLongEveryInput: document.querySelector('#pomodoro-long-every-input'),
  pomodoroStart: document.querySelector('#pomodoro-start'),
  pomodoroPause: document.querySelector('#pomodoro-pause'),
  pomodoroSkip: document.querySelector('#pomodoro-skip'),
  pomodoroReset: document.querySelector('#pomodoro-reset'),
  countdownStatus: document.querySelector('#countdown-status'),
  countdownDisplay: document.querySelector('#countdown-display'),
  countdownStart: document.querySelector('#countdown-start'),
  countdownPause: document.querySelector('#countdown-pause'),
  countdownReset: document.querySelector('#countdown-reset'),
  durationFields: document.querySelector('#duration-fields'),
  targetFields: document.querySelector('#target-fields'),
  hoursInput: document.querySelector('#hours-input'),
  minutesInput: document.querySelector('#minutes-input'),
  secondsInput: document.querySelector('#seconds-input'),
  targetInput: document.querySelector('#target-input'),
  stopwatchStatus: document.querySelector('#stopwatch-status'),
  stopwatchDisplay: document.querySelector('#stopwatch-display'),
  stopwatchStart: document.querySelector('#stopwatch-start'),
  stopwatchPause: document.querySelector('#stopwatch-pause'),
  stopwatchReset: document.querySelector('#stopwatch-reset'),
  reminderStatus: document.querySelector('#reminder-status'),
  reminderTitleInput: document.querySelector('#reminder-title-input'),
  reminderTimeInput: document.querySelector('#reminder-time-input'),
  reminderNoteInput: document.querySelector('#reminder-note-input'),
  reminderAdd: document.querySelector('#reminder-add'),
  reminderClearDone: document.querySelector('#reminder-clear-done'),
  reminderList: document.querySelector('#reminder-list'),
  versionLabel: document.querySelector('#version-label')
};

const settings = {
  transparent: true,
  alwaysOnTop: false,
  pomodoro: {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4
  }
};

const pomodoro = {
  phase: 'focus',
  running: false,
  deadlineMs: 0,
  remainingMs: 25 * 60 * 1000,
  completedFocusSessions: 0
};

const countdown = {
  mode: 'duration',
  running: false,
  deadlineMs: 0,
  remainingMs: 0,
  finished: false
};

const stopwatch = {
  running: false,
  startMs: 0,
  elapsedMs: 0
};

let reminders = [];
let audioContext;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

const reminderDateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

function clampNumber(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function formatDuration(milliseconds, withTenths = false) {
  const safeMs = Math.max(0, Math.floor(milliseconds));
  const totalSeconds = Math.floor(safeMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((safeMs % 1000) / 100);
  const base = [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
  const prefix = days > 0 ? `${days}天 ` : '';

  return `${prefix}${base}${withTenths ? `.${tenths}` : ''}`;
}

function formatPomodoroDuration(milliseconds) {
  const safeMs = Math.max(0, Math.floor(milliseconds));
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
  }

  return [minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

function toLocalDateTimeValue(date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function normalizeSettings() {
  settings.transparent = settings.transparent !== false;
  settings.alwaysOnTop = Boolean(settings.alwaysOnTop);
  settings.pomodoro = {
    focusMinutes: clampNumber(settings.pomodoro?.focusMinutes, 1, 180),
    shortBreakMinutes: clampNumber(settings.pomodoro?.shortBreakMinutes, 1, 60),
    longBreakMinutes: clampNumber(settings.pomodoro?.longBreakMinutes, 1, 120),
    longBreakEvery: clampNumber(settings.pomodoro?.longBreakEvery, 1, 12)
  };
}

function loadSettings() {
  try {
    const savedSettings = JSON.parse(localStorage.getItem(storageKey));
    Object.assign(settings, savedSettings);
  } catch {
    localStorage.removeItem(storageKey);
  }

  normalizeSettings();
}

function saveSettings() {
  localStorage.setItem(storageKey, JSON.stringify(settings));
}

function applySettings() {
  document.body.classList.toggle('transparent', settings.transparent);
  document.body.classList.toggle('opaque', !settings.transparent);
  elements.transparentToggle.checked = settings.transparent;
  elements.alwaysTopToggle.checked = settings.alwaysOnTop;
  shell?.setAlwaysOnTop(settings.alwaysOnTop);
}

function syncPomodoroInputs() {
  elements.pomodoroFocusInput.value = String(settings.pomodoro.focusMinutes);
  elements.pomodoroShortInput.value = String(settings.pomodoro.shortBreakMinutes);
  elements.pomodoroLongInput.value = String(settings.pomodoro.longBreakMinutes);
  elements.pomodoroLongEveryInput.value = String(settings.pomodoro.longBreakEvery);
}

function readPomodoroConfig() {
  settings.pomodoro = {
    focusMinutes: clampNumber(elements.pomodoroFocusInput.value, 1, 180),
    shortBreakMinutes: clampNumber(elements.pomodoroShortInput.value, 1, 60),
    longBreakMinutes: clampNumber(elements.pomodoroLongInput.value, 1, 120),
    longBreakEvery: clampNumber(elements.pomodoroLongEveryInput.value, 1, 12)
  };

  syncPomodoroInputs();
  saveSettings();
  return settings.pomodoro;
}

function getPomodoroPhaseLabel(phase = pomodoro.phase) {
  if (phase === 'shortBreak') {
    return '短休息';
  }

  if (phase === 'longBreak') {
    return '长休息';
  }

  return '专注';
}

function getPomodoroPhaseDurationMs(phase = pomodoro.phase) {
  const config = settings.pomodoro;
  if (phase === 'shortBreak') {
    return config.shortBreakMinutes * 60 * 1000;
  }

  if (phase === 'longBreak') {
    return config.longBreakMinutes * 60 * 1000;
  }

  return config.focusMinutes * 60 * 1000;
}

function setPomodoroStatus(message) {
  elements.pomodoroStatus.textContent = message;
}

function playAlertTone() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    return;
  }

  try {
    audioContext ||= new AudioContextConstructor();
    audioContext.resume?.();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.42);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.45);
  } catch {
    audioContext = undefined;
  }
}

function showAlert(title, body, focus = false) {
  playAlertTone();
  const notificationPromise = shell?.showNotification?.({ title, body, focus });
  notificationPromise?.catch?.(() => {});
}

function updatePomodoroDisplay() {
  if (pomodoro.running) {
    pomodoro.remainingMs = Math.max(0, pomodoro.deadlineMs - Date.now());

    if (pomodoro.remainingMs === 0) {
      completePomodoroPhase(false);
      return;
    }

    setPomodoroStatus('进行中');
  }

  elements.pomodoroPhase.textContent = getPomodoroPhaseLabel();
  elements.pomodoroCycle.textContent = `已完成 ${pomodoro.completedFocusSessions} 个番茄`;
  elements.pomodoroDisplay.value = formatPomodoroDuration(pomodoro.remainingMs);
}

function startPomodoro() {
  if (pomodoro.running) {
    return;
  }

  readPomodoroConfig();
  pomodoro.remainingMs ||= getPomodoroPhaseDurationMs();
  pomodoro.running = true;
  pomodoro.deadlineMs = Date.now() + pomodoro.remainingMs;
  setPomodoroStatus('进行中');
  updatePomodoroDisplay();
}

function pausePomodoro() {
  if (!pomodoro.running) {
    return;
  }

  pomodoro.remainingMs = Math.max(0, pomodoro.deadlineMs - Date.now());
  pomodoro.running = false;
  setPomodoroStatus('已暂停');
  updatePomodoroDisplay();
}

function completePomodoroPhase(manual) {
  const finishedPhase = pomodoro.phase;
  const finishedLabel = getPomodoroPhaseLabel(finishedPhase);
  const config = readPomodoroConfig();
  pomodoro.running = false;

  if (finishedPhase === 'focus' && !manual) {
    pomodoro.completedFocusSessions += 1;
  }

  if (finishedPhase === 'focus') {
    const shouldUseLongBreak = pomodoro.completedFocusSessions > 0
      && pomodoro.completedFocusSessions % config.longBreakEvery === 0;
    pomodoro.phase = shouldUseLongBreak ? 'longBreak' : 'shortBreak';
  } else {
    pomodoro.phase = 'focus';
  }

  const nextLabel = getPomodoroPhaseLabel();
  pomodoro.remainingMs = getPomodoroPhaseDurationMs();
  setPomodoroStatus(manual ? `已跳过，准备${nextLabel}` : `阶段完成，准备${nextLabel}`);

  if (!manual) {
    const body = finishedPhase === 'focus'
      ? `${finishedLabel}结束，${nextLabel}时间到了。`
      : `${finishedLabel}结束，准备开始专注。`;
    showAlert('番茄钟', body, true);
  }

  updatePomodoroDisplay();
}

function resetPomodoro() {
  readPomodoroConfig();
  pomodoro.phase = 'focus';
  pomodoro.running = false;
  pomodoro.deadlineMs = 0;
  pomodoro.completedFocusSessions = 0;
  pomodoro.remainingMs = getPomodoroPhaseDurationMs();
  setPomodoroStatus('待开始');
  updatePomodoroDisplay();
}

function readDurationMs() {
  const hours = clampNumber(elements.hoursInput.value, 0, 999);
  const minutes = clampNumber(elements.minutesInput.value, 0, 59);
  const seconds = clampNumber(elements.secondsInput.value, 0, 59);

  elements.hoursInput.value = String(hours);
  elements.minutesInput.value = String(minutes);
  elements.secondsInput.value = String(seconds);

  return ((hours * 3600) + (minutes * 60) + seconds) * 1000;
}

function readTargetMs() {
  if (!elements.targetInput.value) {
    return Number.NaN;
  }

  return new Date(elements.targetInput.value).getTime();
}

function setCountdownStatus(message) {
  elements.countdownStatus.textContent = message;
}

function setCountdownMode(mode) {
  countdown.mode = mode;
  countdown.running = false;
  countdown.finished = false;
  elements.durationFields.hidden = mode !== 'duration';
  elements.targetFields.hidden = mode !== 'target';
  resetCountdown();
}

function updateCountdownDisplay() {
  const now = Date.now();
  let remainingMs = countdown.remainingMs;

  if (countdown.running) {
    remainingMs = Math.max(0, countdown.deadlineMs - now);
    countdown.remainingMs = remainingMs;

    if (remainingMs === 0) {
      countdown.running = false;
      countdown.finished = true;
      setCountdownStatus('已完成');
    } else {
      setCountdownStatus('进行中');
    }
  }

  elements.countdownDisplay.value = formatDuration(remainingMs);
}

function startCountdown() {
  const now = Date.now();
  countdown.finished = false;

  if (countdown.mode === 'duration') {
    const remainingMs = countdown.remainingMs > 0 ? countdown.remainingMs : readDurationMs();
    if (remainingMs <= 0) {
      setCountdownStatus('请输入大于 0 的时长');
      updateCountdownDisplay();
      return;
    }

    countdown.remainingMs = remainingMs;
    countdown.deadlineMs = now + remainingMs;
  } else {
    const targetMs = readTargetMs();
    if (!Number.isFinite(targetMs) || targetMs <= now) {
      setCountdownStatus('请选择未来时间');
      updateCountdownDisplay();
      return;
    }

    countdown.deadlineMs = targetMs;
    countdown.remainingMs = targetMs - now;
  }

  countdown.running = true;
  setCountdownStatus('进行中');
  updateCountdownDisplay();
}

function pauseCountdown() {
  if (!countdown.running) {
    return;
  }

  countdown.remainingMs = Math.max(0, countdown.deadlineMs - Date.now());
  countdown.running = false;
  setCountdownStatus('已暂停');
  updateCountdownDisplay();
}

function resetCountdown() {
  countdown.running = false;
  countdown.finished = false;
  countdown.remainingMs = countdown.mode === 'duration'
    ? readDurationMs()
    : Math.max(0, readTargetMs() - Date.now());

  if (!Number.isFinite(countdown.remainingMs)) {
    countdown.remainingMs = 0;
  }

  setCountdownStatus('待开始');
  updateCountdownDisplay();
}

function startStopwatch() {
  if (stopwatch.running) {
    return;
  }

  stopwatch.running = true;
  stopwatch.startMs = performance.now() - stopwatch.elapsedMs;
  elements.stopwatchStatus.textContent = '进行中';
}

function pauseStopwatch() {
  if (!stopwatch.running) {
    return;
  }

  stopwatch.elapsedMs = performance.now() - stopwatch.startMs;
  stopwatch.running = false;
  elements.stopwatchStatus.textContent = '已暂停';
}

function resetStopwatch() {
  stopwatch.running = false;
  stopwatch.startMs = 0;
  stopwatch.elapsedMs = 0;
  elements.stopwatchStatus.textContent = '待开始';
  updateStopwatchDisplay();
}

function updateStopwatchDisplay() {
  const elapsedMs = stopwatch.running ? performance.now() - stopwatch.startMs : stopwatch.elapsedMs;
  elements.stopwatchDisplay.value = formatDuration(elapsedMs, true);
}

function loadReminders() {
  try {
    const savedReminders = JSON.parse(localStorage.getItem(reminderStorageKey));
    reminders = Array.isArray(savedReminders)
      ? savedReminders.filter((reminder) => Number.isFinite(reminder?.scheduledAt))
      : [];
  } catch {
    localStorage.removeItem(reminderStorageKey);
    reminders = [];
  }
}

function saveReminders() {
  localStorage.setItem(reminderStorageKey, JSON.stringify(reminders));
}

function createReminderId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sortReminders(reminderList) {
  return [...reminderList].sort((first, second) => {
    if (first.done !== second.done) {
      return Number(first.done) - Number(second.done);
    }

    return first.scheduledAt - second.scheduledAt;
  });
}

function updateReminderStatus() {
  const pendingReminders = reminders
    .filter((reminder) => !reminder.done)
    .sort((first, second) => first.scheduledAt - second.scheduledAt);
  const doneCount = reminders.length - pendingReminders.length;

  if (pendingReminders.length > 0) {
    const nextTime = reminderDateFormatter.format(new Date(pendingReminders[0].scheduledAt));
    elements.reminderStatus.textContent = `${pendingReminders.length} 个待提醒 · 下一个 ${nextTime}`;
  } else if (doneCount > 0) {
    elements.reminderStatus.textContent = `${doneCount} 个已提醒`;
  } else {
    elements.reminderStatus.textContent = '暂无提醒';
  }
}

function renderReminders() {
  elements.reminderList.replaceChildren();

  for (const reminder of sortReminders(reminders)) {
    const item = document.createElement('li');
    item.className = 'reminder-item';
    item.classList.toggle('done', Boolean(reminder.done));

    const content = document.createElement('div');
    const title = document.createElement('p');
    const meta = document.createElement('p');
    const note = document.createElement('p');
    const actions = document.createElement('div');
    const toggleButton = document.createElement('button');
    const deleteButton = document.createElement('button');

    title.className = 'reminder-title';
    title.textContent = reminder.title;
    meta.className = 'reminder-meta';
    meta.textContent = `${reminder.done ? '已提醒' : '待提醒'} · ${reminderDateFormatter.format(new Date(reminder.scheduledAt))}`;
    note.className = 'reminder-note';
    note.textContent = reminder.note || '无备注';

    actions.className = 'reminder-item-actions';
    toggleButton.type = 'button';
    toggleButton.className = 'reminder-toggle';
    toggleButton.dataset.id = reminder.id;
    toggleButton.textContent = reminder.done ? '恢复' : '完成';
    deleteButton.type = 'button';
    deleteButton.className = 'reminder-delete';
    deleteButton.dataset.id = reminder.id;
    deleteButton.textContent = '删除';

    content.append(title, meta, note);
    actions.append(toggleButton, deleteButton);
    item.append(content, actions);
    elements.reminderList.append(item);
  }

  updateReminderStatus();
}

function setDefaultReminderTime() {
  elements.reminderTimeInput.value = toLocalDateTimeValue(new Date(Date.now() + 10 * 60 * 1000));
}

function addReminder() {
  const title = elements.reminderTitleInput.value.trim() || '提醒';
  const scheduledAt = new Date(elements.reminderTimeInput.value).getTime();
  const note = elements.reminderNoteInput.value.trim();

  if (!Number.isFinite(scheduledAt) || scheduledAt <= Date.now()) {
    elements.reminderStatus.textContent = '请选择未来的提醒时间';
    return;
  }

  reminders.push({
    id: createReminderId(),
    title,
    note,
    scheduledAt,
    createdAt: Date.now(),
    done: false
  });

  elements.reminderTitleInput.value = '';
  elements.reminderNoteInput.value = '';
  setDefaultReminderTime();
  saveReminders();
  renderReminders();
}

function toggleReminderDone(id) {
  const reminder = reminders.find((item) => item.id === id);
  if (!reminder) {
    return;
  }

  reminder.done = !reminder.done;
  reminder.notifiedAt = reminder.done ? Date.now() : undefined;
  saveReminders();
  renderReminders();
}

function deleteReminder(id) {
  reminders = reminders.filter((reminder) => reminder.id !== id);
  saveReminders();
  renderReminders();
}

function clearDoneReminders() {
  reminders = reminders.filter((reminder) => !reminder.done);
  saveReminders();
  renderReminders();
}

function checkReminders() {
  const now = Date.now();
  let changed = false;

  for (const reminder of reminders) {
    if (!reminder.done && reminder.scheduledAt <= now) {
      reminder.done = true;
      reminder.notifiedAt = now;
      changed = true;
      showAlert(`提醒：${reminder.title}`, reminder.note || '提醒时间到了。', true);
    }
  }

  if (changed) {
    saveReminders();
    renderReminders();
  } else {
    updateReminderStatus();
  }
}

function updateClock() {
  const now = new Date();
  elements.currentDate.textContent = dateFormatter.format(now);
  elements.currentTime.textContent = timeFormatter.format(now);
}

function bindEvents() {
  elements.transparentToggle.addEventListener('change', () => {
    settings.transparent = elements.transparentToggle.checked;
    saveSettings();
    applySettings();
  });

  elements.alwaysTopToggle.addEventListener('change', () => {
    settings.alwaysOnTop = elements.alwaysTopToggle.checked;
    saveSettings();
    applySettings();
  });

  elements.minimizeBtn.addEventListener('click', () => shell?.minimize());
  elements.maximizeBtn.addEventListener('click', () => shell?.toggleMaximize());
  elements.closeBtn.addEventListener('click', () => shell?.close());

  [
    elements.pomodoroFocusInput,
    elements.pomodoroShortInput,
    elements.pomodoroLongInput,
    elements.pomodoroLongEveryInput
  ].forEach((input) => {
    input.addEventListener('change', () => {
      if (!pomodoro.running) {
        resetPomodoro();
      } else {
        readPomodoroConfig();
      }
    });
  });

  elements.pomodoroStart.addEventListener('click', startPomodoro);
  elements.pomodoroPause.addEventListener('click', pausePomodoro);
  elements.pomodoroSkip.addEventListener('click', () => completePomodoroPhase(true));
  elements.pomodoroReset.addEventListener('click', resetPomodoro);

  document.querySelectorAll('input[name="countdown-mode"]').forEach((input) => {
    input.addEventListener('change', () => setCountdownMode(input.value));
  });

  [elements.hoursInput, elements.minutesInput, elements.secondsInput, elements.targetInput].forEach((input) => {
    input.addEventListener('change', () => {
      if (!countdown.running) {
        resetCountdown();
      }
    });
  });

  elements.countdownStart.addEventListener('click', startCountdown);
  elements.countdownPause.addEventListener('click', pauseCountdown);
  elements.countdownReset.addEventListener('click', resetCountdown);
  elements.stopwatchStart.addEventListener('click', startStopwatch);
  elements.stopwatchPause.addEventListener('click', pauseStopwatch);
  elements.stopwatchReset.addEventListener('click', resetStopwatch);

  elements.reminderAdd.addEventListener('click', addReminder);
  elements.reminderClearDone.addEventListener('click', clearDoneReminders);
  elements.reminderList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-id]');
    if (!button) {
      return;
    }

    if (button.classList.contains('reminder-delete')) {
      deleteReminder(button.dataset.id);
    } else if (button.classList.contains('reminder-toggle')) {
      toggleReminderDone(button.dataset.id);
    }
  });
}

async function initVersionLabel() {
  const version = await shell?.getVersion();
  elements.versionLabel.textContent = version ? `v${version}` : 'v--';
}

function init() {
  loadSettings();
  loadReminders();
  syncPomodoroInputs();
  elements.targetInput.value = toLocalDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));
  setDefaultReminderTime();
  bindEvents();
  applySettings();
  resetPomodoro();
  resetCountdown();
  resetStopwatch();
  renderReminders();
  updateClock();
  initVersionLabel();

  window.setInterval(() => {
    updateClock();
    updatePomodoroDisplay();
    updateCountdownDisplay();
    updateStopwatchDisplay();
  }, 200);

  window.setInterval(checkReminders, 1000);
}

init();
