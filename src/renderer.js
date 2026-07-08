const shell = window.elegantClock;
const storageKey = 'elegant-clock-settings';

const elements = {
  currentDate: document.querySelector('#current-date'),
  currentTime: document.querySelector('#current-time'),
  transparentToggle: document.querySelector('#transparent-toggle'),
  alwaysTopToggle: document.querySelector('#always-top-toggle'),
  minimizeBtn: document.querySelector('#minimize-btn'),
  maximizeBtn: document.querySelector('#maximize-btn'),
  closeBtn: document.querySelector('#close-btn'),
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
  versionLabel: document.querySelector('#version-label')
};

const settings = {
  transparent: true,
  alwaysOnTop: false
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

function toLocalDateTimeValue(date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function loadSettings() {
  try {
    const savedSettings = JSON.parse(localStorage.getItem(storageKey));
    Object.assign(settings, savedSettings);
  } catch {
    localStorage.removeItem(storageKey);
  }
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
}

async function initVersionLabel() {
  const version = await shell?.getVersion();
  elements.versionLabel.textContent = version ? `v${version}` : 'v--';
}

function init() {
  loadSettings();
  elements.targetInput.value = toLocalDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));
  bindEvents();
  applySettings();
  resetCountdown();
  resetStopwatch();
  updateClock();
  initVersionLabel();

  window.setInterval(() => {
    updateClock();
    updateCountdownDisplay();
    updateStopwatchDisplay();
  }, 200);
}

init();
