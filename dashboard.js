const patientsMeta = {
  youssef: {
    label: 'Youssef M. — Genou post‑op',
    baseline: { sessions: '4/5', quality: '81%', reps: '127', last: 'Hier 18:32' },
  },
  fatima: {
    label: 'Fatima A. — Épaule',
    baseline: { sessions: '3/5', quality: '72%', reps: '98', last: 'Hier 11:10' },
  },
  omar: {
    label: 'Omar K. — Dos',
    baseline: { sessions: '5/5', quality: '89%', reps: '154', last: 'Aujourd’hui 09:05' },
  },
};

let currentPatientId = 'youssef';

const patientList = document.getElementById('patient-list');
const liveIndicator = document.getElementById('live-indicator');

const patientNameEl = document.getElementById('patient-name');
const cardSessionsEl = document.getElementById('card-sessions');
const cardQualityEl = document.getElementById('card-quality');
const cardRepsEl = document.getElementById('card-reps');
const cardLastEl = document.getElementById('card-last');

const sessionBody = document.getElementById('session-body');

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

  const meta = patientsMeta[id];
  if (meta) {
    patientNameEl.textContent = meta.label;
    cardSessionsEl.textContent = meta.baseline.sessions;
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
    } else {
      cardQualityEl.textContent = meta.baseline.quality;
      cardRepsEl.textContent = meta.baseline.reps;
      cardLastEl.textContent = meta.baseline.last;
    }
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

patientList.addEventListener('click', (e) => {
  const item = e.target.closest('.patient-item');
  if (!item) return;
  const id = item.dataset.id;
  currentPatientId = id;
  document.querySelectorAll('.patient-item').forEach((el) => el.classList.remove('active'));
  item.classList.add('active');
  loadProgram(id);
  loadSessions(id);
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

loadProgram(currentPatientId);
loadSessions(currentPatientId);
updateLiveIndicator();

