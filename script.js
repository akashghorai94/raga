// --- 1. Classical Tuning System & Data ---
const BASE_SA = 130.81; // Base frequency C3 in Hz

// Classical Just Intonation Ratios relative to Sa
const SWARA_RATIOS = {
  'Sa': 1,
  're': 16/15,   // Komal Re
  'Re': 9/8,     // Shuddha Re
  'ga': 6/5,     // Komal Ga
  'Ga': 5/4,     // Shuddha Ga
  'Ma': 4/3,     // Shuddha Ma
  'MA': 45/32,   // Teevra Ma
  'Pa': 3/2,     // Pa
  'dha': 8/5,    // Komal Dha
  'Dha': 5/3,    // Shuddha Dha
  'ni': 9/5,     // Komal Ni
  'Ni': 15/8,    // Shuddha Ni
  'Sa2': 2       // High Sa (Tar Saptak)
};

const ALL_SWARAS = ['Sa2', 'Ni', 'ni', 'Dha', 'dha', 'Pa', 'MA', 'Ma', 'Ga', 'ga', 'Re', 're', 'Sa'];
const STEPS = 16;

const RAGAS = {
  bhairav: {
    name: "Raga Bhairav",
    time: "Early Morning (6 AM - 9 AM)",
    mood: "Devotional, Tranquil, Majestic",
    allowedSwaras: ['Sa', 're', 'Ga', 'Ma', 'Pa', 'dha', 'Ni', 'Sa2'],
    description: "Uses Komal Re (re) and Komal Dha (dha). Revered as a foundational morning Raga associated with Lord Shiva.",
    preset: {0: 'Sa', 2: 're', 4: 'Ga', 6: 'Ma', 8: 'Pa', 10: 'dha', 12: 'Ni', 14: 'Sa2'}
  },
  yaman: {
    name: "Raga Yaman",
    time: "First Octave of Night (6 PM - 9 PM)",
    mood: "Peaceful, Joyful, Serene",
    allowedSwaras: ['Sa', 'Re', 'Ga', 'MA', 'Pa', 'Dha', 'Ni', 'Sa2'],
    description: "Features Teevra Ma (MA). Widely taught as the fundamental evening Raga in Indian Classical Music.",
    preset: {0: 'Ni', 2: 'Re', 4: 'Ga', 6: 'MA', 8: 'Pa', 10: 'Dha', 12: 'Ni', 14: 'Sa2'}
  },
  bhupali: {
    name: "Raga Bhupali",
    time: "First Octave of Night (6 PM - 9 PM)",
    mood: "Bhakti (Devotional), Grand",
    allowedSwaras: ['Sa', 'Re', 'Ga', 'Pa', 'Dha', 'Sa2'],
    description: "A Pentatonic (Audav) scale completely omitting Ma and Ni. Creates an uplifting, harmonious atmosphere.",
    preset: {0: 'Sa', 2: 'Re', 4: 'Ga', 6: 'Pa', 8: 'Dha', 10: 'Sa2', 12: 'Dha', 14: 'Pa'}
  },
  malkauns: {
    name: "Raga Malkauns",
    time: "Late Midnight (12 AM - 3 AM)",
    mood: "Meditative, Deep, Introspective",
    allowedSwaras: ['Sa', 'ga', 'Ma', 'dha', 'ni', 'Sa2'],
    description: "Ancient pentatonic midnight Raga omitting Re and Pa. Uses all soft (Komal) notes for a profound feel.",
    preset: {0: 'Sa', 3: 'ga', 6: 'Ma', 9: 'dha', 12: 'ni', 14: 'Sa2'}
  },
  kafi: {
    name: "Raga Kafi",
    time: "Late Night / Spring Season",
    mood: "Playful, Romantic",
    allowedSwaras: ['Sa', 'Re', 'ga', 'Ma', 'Pa', 'Dha', 'ni', 'Sa2'],
    description: "Features Komal Ga (ga) and Komal Ni (ni). Forms the base for many folk songs and classical compositions.",
    preset: {0: 'Sa', 2: 'Re', 4: 'ga', 6: 'Ma', 8: 'Pa', 10: 'Dha', 12: 'ni', 14: 'Sa2'}
  }
};

// --- 2. State Management ---
let currentRagaKey = 'bhairav';
let isPlaying = false;
let tanpuraActive = false;
let currentStep = 0;
let tempo = 120;
let timerId = null;
let gridData = {}; 

// Web Audio API Variables
let audioCtx = null;
let tanpuraNodes = [];

// --- 3. Web Audio Engine ---
function ensureAudioContext() {
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioCtxClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Synthesize Sitar/Plucked Instrument Sound
function playSwaraSound(swaraName) {
  ensureAudioContext();
  if (!audioCtx) return;

  const freq = BASE_SA * SWARA_RATIOS[swaraName];
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, now);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(freq * 3.5, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + 0.85);
}

// Continuous Tanpura Ambient Drone
function toggleTanpura() {
  ensureAudioContext();
  const btn = document.getElementById('tanpuraBtn');

  if (tanpuraActive) {
    tanpuraNodes.forEach(node => {
      try { node.stop(); } catch(e){}
    });
    tanpuraNodes = [];
    tanpuraActive = false;
    btn.classList.remove('btn-active');
  } else {
    const droneFreqs = [BASE_SA / 2, BASE_SA * (SWARA_RATIOS['Pa'] / 2), BASE_SA];
    const now = audioCtx.currentTime;

    droneFreqs.forEach(freq => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      const lfo = audioCtx.createOscillator();
      lfo.frequency.setValueAtTime(0.2, now);
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.setValueAtTime(0.02, now);

      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      gain.gain.setValueAtTime(0.06, now);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      lfo.start(now);

      tanpuraNodes.push(osc, lfo);
    });

    tanpuraActive = true;
    btn.classList.add('btn-active');
  }
}

// --- 4. User Interface Renderer ---
function renderGrid() {
  const gridContainer = document.getElementById('sequencerGrid');
  const currentRaga = RAGAS[currentRagaKey];

  gridContainer.innerHTML = '';

  // Render Swara Rows
  ALL_SWARAS.forEach(swara => {
    const row = document.createElement('div');
    row.className = 'row';

    const label = document.createElement('div');
    label.className = 'swara-label';
    label.innerText = swara;
    row.appendChild(label);

    const cellsContainer = document.createElement('div');
    cellsContainer.className = 'grid-cells';

    const isAllowed = currentRaga.allowedSwaras.includes(swara);

    for (let s = 0; s < STEPS; s++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.swara = swara;
      cell.dataset.step = s;

      if (!isAllowed) {
        cell.classList.add('disabled');
      } else {
        if (gridData[s] === swara) {
          cell.classList.add('active');
        }

        cell.addEventListener('click', () => {
          ensureAudioContext();
          
          if (gridData[s] === swara) {
            delete gridData[s];
            cell.classList.remove('active');
          } else {
            const activeInCol = gridContainer.querySelector(`.cell[data-step="${s}"].active`);
            if (activeInCol) activeInCol.classList.remove('active');

            gridData[s] = swara;
            cell.classList.add('active');
            playSwaraSound(swara);
          }
        });
      }

      cellsContainer.appendChild(cell);
    }

    row.appendChild(cellsContainer);
    gridContainer.appendChild(row);
  });

  // Render Step Indicators Row
  const stepRow = document.createElement('div');
  stepRow.className = 'row step-indicators-row';

  const stepLabel = document.createElement('div');
  stepLabel.className = 'swara-label';
  stepLabel.style.color = 'var(--text-muted)';
  stepLabel.innerText = 'Step';
  stepRow.appendChild(stepLabel);

  const dotsContainer = document.createElement('div');
  dotsContainer.className = 'grid-cells';

  for (let s = 0; s < STEPS; s++) {
    const dot = document.createElement('div');
    dot.className = 'step-dot';
    dot.id = `step-dot-${s}`;
    dotsContainer.appendChild(dot);
  }

  stepRow.appendChild(dotsContainer);
  gridContainer.appendChild(stepRow);

  // Update Lore Panel
  document.getElementById('ragaInfo').innerHTML = `
    <strong>${currentRaga.name}</strong> • <em>Time: ${currentRaga.time}</em><br>
    <strong>Mood:</strong> ${currentRaga.mood}<br>
    <span style="color: var(--text-muted); font-size: 0.85rem; margin-top: 4px; display: inline-block;">${currentRaga.description}</span>
  `;
}

// --- 5. Playback Loop Engine ---
function stepLoop() {
  const prevStep = (currentStep - 1 + STEPS) % STEPS;
  document.getElementById(`step-dot-${prevStep}`)?.classList.remove('active');
  document.querySelectorAll(`.cell[data-step="${prevStep}"]`).forEach(c => c.classList.remove('playing'));

  document.getElementById(`step-dot-${currentStep}`)?.classList.add('active');
  
  const activeSwara = gridData[currentStep];
  if (activeSwara) {
    const activeCell = document.querySelector(`.cell[data-swara="${activeSwara}"][data-step="${currentStep}"]`);
    if (activeCell) {
      activeCell.classList.add('playing');
      playSwaraSound(activeSwara);
    }
  }

  currentStep = (currentStep + 1) % STEPS;
}

function togglePlay() {
  ensureAudioContext();
  const btn = document.getElementById('playBtn');

  if (isPlaying) {
    clearInterval(timerId);
    timerId = null;
    isPlaying = false;
    btn.innerText = '▶ Play Loop';
    btn.classList.remove('btn-active');
    
    document.querySelectorAll('.step-dot').forEach(d => d.classList.remove('active'));
    document.querySelectorAll('.cell').forEach(c => c.classList.remove('playing'));
    currentStep = 0;
  } else {
    isPlaying = true;
    btn.innerText = '⏸ Pause';
    btn.classList.add('btn-active');
    
    stepLoop();
    const intervalMs = (60 / tempo / 4) * 1000;
    timerId = setInterval(stepLoop, intervalMs);
  }
}

function loadPreset() {
  gridData = { ...RAGAS[currentRagaKey].preset };
  renderGrid();
}

// --- 6. Event Listeners ---
document.getElementById('ragaSelect').addEventListener('change', (e) => {
  currentRagaKey = e.target.value;
  gridData = {};
  renderGrid();
});

document.getElementById('tempoSlider').addEventListener('input', (e) => {
  tempo = parseInt(e.target.value, 10);
  document.getElementById('tempoVal').innerText = tempo;
  
  if (isPlaying) {
    clearInterval(timerId);
    const intervalMs = (60 / tempo / 4) * 1000;
    timerId = setInterval(stepLoop, intervalMs);
  }
});

document.getElementById('playBtn').addEventListener('click', togglePlay);
document.getElementById('tanpuraBtn').addEventListener('click', toggleTanpura);
document.getElementById('presetBtn').addEventListener('click', loadPreset);
document.getElementById('clearBtn').addEventListener('click', () => {
  gridData = {};
  renderGrid();
});

// Unlock audio policies across browsers
window.addEventListener('touchstart', ensureAudioContext, { once: true });
window.addEventListener('click', ensureAudioContext, { once: true });

// Initial render
renderGrid();
