let currentPatientId = localStorage.getItem('haraka_current_patient_id') || 'demo';

const patientList = document.getElementById('patient-list');
const patientListLabel = document.getElementById('patient-list-label');
const liveIndicator = document.getElementById('live-indicator');

const patientNameEl = document.getElementById('patient-name');
const cardSessionsEl = document.getElementById('card-sessions');
const cardQualityEl = document.getElementById('card-quality');
const cardRepsEl = document.getElementById('card-reps');
const cardLastEl = document.getElementById('card-last');

const sessionBody = document.getElementById('session-body');

const patientCodeInput = document.getElementById('patient-code-input');
const btnLoadPatient = document.getElementById('btn-load-patient');

const programFields = [
  { name: document.getElementById('ex1-name'), reps: document.getElementById('ex1-reps'), sets: document.getElementById('ex1-sets') },
  { name: document.getElementById('ex2-name'), reps: document.getElementById('ex2-reps'), sets: document.getElementById('ex2-sets') },
  { name: document.getElementById('ex3-name'), reps: document.getElementById('ex3-reps'), sets: document.getElementById('ex3-sets') },
];

const btnSendProgram = document.getElementById('btn-send-program');
const programToast = document.getElementById('program-toast');

function keyProgram(id) {
  return `haraka_program_${id}`;
}
function keySessions(id) {
  return `haraka_sessions_${id}`;
}
function keyActive(id) {
  return `haraka_active_${id}`;
}

function loadProgram(id) {
  const raw = localStorage.getItem(keyProgram(id));
  if (!raw) return;
  try {
    const prog = JSON.parse(raw);
    programFields.forEach((f, i) => {
      const item = prog[i];
      if (!item) return;
      f.name.value = item.exercise || 'knee_raise';
      f.reps.value = item.reps || 10;
      f.sets.value = item.sets || 2;
    });
  } catch (_) {}
}

function saveProgram(id) {
  const prog = programFields.map((f) => ({
    exercise: f.name.value,
    reps: parseInt(f.reps.value, 10) || 0,
    sets: parseInt(f.sets.value, 10) || 0,
  }));
  localStorage.setItem(keyProgram(id), JSON.stringify(prog));
}

function formatDate(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function exerciseLabel(key) {
  switch (key) {
    case 'knee_raise':
      return 'Montée de genou';
    case 'arm_raise':
      return 'Élévation du bras';
    case 'squat':
      return 'Squat partiel';
    default:
      return key;
  }
}

function loadSessions(id) {
  const raw = localStorage.getItem(keySessions(id));
  const arr = raw ? JSON.parse(raw) : [];
  const last = arr.slice(0, 5);
  sessionBody.innerHTML = '';
  last.forEach((s) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(s.timestamp)}</td>
      <td>${exerciseLabel(s.exercise)}</td>
      <td>${s.reps}</td>
      <td>${s.score}</td>
      <td>${s.quality}%</td>
      <td>${Math.round(s.duration_seconds / 60)} min</td>
    `;
    sessionBody.appendChild(tr);
  });
  // Stats simples basées sur les données réelles ou vides
  patientNameEl.textContent = `Patient (code : ${id})`;
  if (patientListLabel) {
    patientListLabel.textContent = `Patient (code : ${id})`;
  }
  if (arr.length) {
    const avgQuality = Math.round(
      arr.reduce((acc, s) => acc + (s.quality || 0), 0) / arr.length
    );
    cardQualityEl.textContent = `${avgQuality}%`;
    cardRepsEl.textContent = String(
      arr.reduce((acc, s) => acc + (s.reps || 0), 0)
    );
    const lastSession = arr[0];
    cardLastEl.textContent = formatDate(lastSession.timestamp);
    cardSessionsEl.textContent = `${Math.min(arr.length, 7)}/7`;
  } else {
    cardQualityEl.textContent = '—';
    cardRepsEl.textContent = '0';
    cardLastEl.textContent = 'Aucune session';
    cardSessionsEl.textContent = '0/7';
  }
}

function updateLiveIndicator() {
  const tsRaw = localStorage.getItem(keyActive(currentPatientId));
  if (!tsRaw) {
    liveIndicator.classList.add('off');
    return;
  }
  const ts = Number(tsRaw);
  const now = Date.now();
  const alive = now - ts < 7000;
  if (alive) {
    liveIndicator.classList.remove('off');
  } else {
    liveIndicator.classList.add('off');
  }
}

btnLoadPatient.addEventListener('click', () => {
  const code = (patientCodeInput.value || '').trim();
  if (!code) return;
  currentPatientId = code;
  localStorage.setItem('haraka_current_patient_id', currentPatientId);
  loadProgram(currentPatientId);
  loadSessions(currentPatientId);
  updateLiveIndicator();
});

btnSendProgram.addEventListener('click', () => {
  saveProgram(currentPatientId);
  programToast.style.opacity = '1';
  programToast.textContent = 'Programme envoyé !';
  setTimeout(() => {
    programToast.style.opacity = '0';
  }, 1600);
});

setInterval(updateLiveIndicator, 2000);

if (patientCodeInput) {
  patientCodeInput.value = currentPatientId;
}
loadProgram(currentPatientId);
loadSessions(currentPatientId);
updateLiveIndicator();

