(function () {
  'use strict';

  const data = window.TIMETABLE;
  const STAGE_LABELS = {
    eagle: 'Eagle',
    vulture: 'Vulture',
    buzzard: 'Buzzard',
    hawk: 'Hawk',
    sparrow: 'Sparrow',
    raven: 'Raven',
    quail: 'Quail',
    nightingale: 'Nightingale',
  };

  // Approximate stage pin positions on festival_map.jpg as percentages
  // of the image (left%, top%). Tweak if the map art changes.
  const STAGE_MAP_POS = {
    hawk: { left: 21, top: 22 },
    vulture: { left: 50, top: 20 },
    eagle: { left: 69, top: 25 },
    buzzard: { left: 91, top: 31 },
    raven: { left: 9, top: 30 },
    sparrow: { left: 25, top: 38 },
    nightingale: { left: 42, top: 48 },
    quail: { left: 48, top: 46 },
  };

  // ----- Persistent state (localStorage) -----
  const LS_KEYS = {
    likes: 'joa2026.likes',
    day: 'joa2026.day',
    view: 'joa2026.view',
    stages: 'joa2026.stages',
    likedOnly: 'joa2026.likedOnly',
  };

  function loadLikes() {
    try {
      return new Set(JSON.parse(localStorage.getItem(LS_KEYS.likes) || '[]'));
    } catch (e) {
      return new Set();
    }
  }
  function saveLikes(set) {
    localStorage.setItem(LS_KEYS.likes, JSON.stringify([...set]));
  }

  const state = {
    likes: loadLikes(),
    day: localStorage.getItem(LS_KEYS.day) || pickDefaultDay(),
    view: localStorage.getItem(LS_KEYS.view) || defaultView(),
    likedOnly: localStorage.getItem(LS_KEYS.likedOnly) === '1',
    stages: loadStages(),
  };

  function pickDefaultDay() {
    // Pick the closest upcoming day if during festival, else first day.
    const today = new Date();
    for (const d of data.days) {
      if (new Date(d.date + 'T23:59:59') >= today) return d.key;
    }
    return data.days[0].key;
  }
  function defaultView() {
    return window.matchMedia('(max-width: 900px)').matches ? 'list' : 'grid';
  }
  function loadStages() {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEYS.stages) || 'null');
      if (Array.isArray(saved)) return new Set(saved);
    } catch (e) {}
    // Default: all stages that actually have acts somewhere
    return new Set(activeStages());
  }
  function activeStages() {
    const set = new Set();
    for (const d of data.days) for (const s of data.stages) {
      if (d.stages[s] && d.stages[s].length) set.add(s);
    }
    return [...set];
  }

  // ----- Rendering -----

  function renderDayTabs() {
    const el = document.getElementById('dayTabs');
    el.innerHTML = '';
    for (const d of data.days) {
      const btn = document.createElement('button');
      btn.className = 'day-tab' + (d.key === state.day ? ' active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', d.key === state.day ? 'true' : 'false');
      btn.innerHTML = `<div>${d.key}</div><div style="font-size:10px;opacity:0.8;font-weight:500;text-transform:none;letter-spacing:0">${d.label.split(' ').slice(0,1)} ${d.label.match(/\d+/)?.[0] || ''}</div>`;
      btn.addEventListener('click', () => {
        state.day = d.key;
        localStorage.setItem(LS_KEYS.day, d.key);
        render();
      });
      el.appendChild(btn);
    }
  }

  function renderStageFilters() {
    const el = document.getElementById('stageFilters');
    el.innerHTML = '';
    const stages = activeStages();
    for (const s of stages) {
      const chip = document.createElement('button');
      chip.className = 'stage-chip';
      chip.dataset.stage = s;
      chip.setAttribute('aria-pressed', state.stages.has(s) ? 'true' : 'false');
      chip.textContent = STAGE_LABELS[s] || s;
      chip.addEventListener('click', () => {
        if (state.stages.has(s)) state.stages.delete(s);
        else state.stages.add(s);
        localStorage.setItem(LS_KEYS.stages, JSON.stringify([...state.stages]));
        render();
      });
      el.appendChild(chip);
    }
  }

  function updateToggles() {
    const likedBtn = document.getElementById('likedOnlyBtn');
    likedBtn.setAttribute('aria-pressed', state.likedOnly ? 'true' : 'false');

    const viewBtn = document.getElementById('viewToggle');
    viewBtn.querySelector('.view-lbl').textContent = state.view === 'grid' ? 'Lijst' : 'Grid';
  }

  function getDay() {
    return data.days.find((d) => d.key === state.day);
  }

  function filteredActs() {
    const day = getDay();
    const out = {};
    for (const s of data.stages) {
      if (!state.stages.has(s)) continue;
      const acts = (day.stages[s] || []).filter((a) => {
        if (state.likedOnly && !state.likes.has(actKey(day.key, a))) return false;
        return true;
      });
      if (acts.length) out[s] = acts;
    }
    return out;
  }

  function actKey(dayKey, a) {
    return `${dayKey}:${a.id}`;
  }

  function toggleLike(dayKey, a, els) {
    const k = actKey(dayKey, a);
    if (state.likes.has(k)) state.likes.delete(k);
    else state.likes.add(k);
    saveLikes(state.likes);
    // Update affected DOM in place to avoid full re-render
    document.querySelectorAll(`[data-act-key="${CSS.escape(k)}"]`).forEach((node) => {
      const liked = state.likes.has(k);
      node.classList.toggle('liked', liked);
      const btn = node.querySelector('.like-btn');
      if (btn) {
        btn.classList.toggle('is-liked', liked);
        btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
      }
    });
    if (state.likedOnly) render();
  }

  function makeLikeBtn(dayKey, a) {
    const k = actKey(dayKey, a);
    const liked = state.likes.has(k);
    const btn = document.createElement('button');
    btn.className = 'like-btn' + (liked ? ' is-liked' : '');
    btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
    btn.setAttribute('aria-label', (liked ? 'Verwijder uit' : 'Voeg toe aan') + ' favorieten');
    btn.title = liked ? 'Favoriet — klik om te verwijderen' : 'Markeer als favoriet';
    btn.textContent = '❤';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLike(dayKey, a);
    });
    return btn;
  }

  // ----- List view -----
  function renderList() {
    const list = document.getElementById('listView');
    const day = getDay();
    const grouped = filteredActs();
    list.innerHTML = '';

    const stages = data.stages.filter((s) => grouped[s]);
    if (!stages.length) return;

    for (const s of stages) {
      const group = document.createElement('section');
      group.className = 'stage-group';
      const h2 = document.createElement('h2');
      h2.innerHTML = `<span class="dot" style="background:var(--${s})"></span>${STAGE_LABELS[s]}`;
      group.appendChild(h2);

      const acts = document.createElement('div');
      acts.className = 'acts';
      for (const a of grouped[s]) {
        const k = actKey(day.key, a);
        const liked = state.likes.has(k);
        const card = document.createElement('div');
        card.className = 'act-card' + (liked ? ' liked' : '');
        card.dataset.stage = s;
        card.dataset.actKey = k;
        card.innerHTML = `
          <div class="time">
            <div class="start">${a.start}</div>
            <div>– ${a.end}</div>
          </div>
          <div class="name">${escapeHtml(a.name)}</div>
        `;
        card.appendChild(makeLikeBtn(day.key, a));
        acts.appendChild(card);
      }
      group.appendChild(acts);
      list.appendChild(group);
    }
  }

  // ----- Grid view -----
  function renderGrid() {
    const grid = document.getElementById('gridView');
    const day = getDay();
    grid.innerHTML = '';

    const grouped = filteredActs();
    const stages = data.stages.filter((s) => grouped[s]);
    if (!stages.length) return;

    const totalHours = day.endHour - day.startHour;
    const colWidth = 18; // px per 5 min
    const labelWidth = 110;
    const totalCols = totalHours * 12;
    const stripWidth = totalCols * colWidth;

    const inner = document.createElement('div');
    inner.className = 'grid-inner';
    inner.style.gridTemplateColumns = `${labelWidth}px ${stripWidth}px`;

    // Time header row
    const timeRow = document.createElement('div');
    timeRow.className = 'grid-time-row';
    timeRow.style.gridTemplateColumns = `${labelWidth}px repeat(${totalHours}, ${colWidth * 12}px)`;
    const corner = document.createElement('div');
    corner.className = 'stage-col-header';
    corner.textContent = day.key;
    timeRow.appendChild(corner);
    for (let h = 0; h < totalHours; h++) {
      const cell = document.createElement('div');
      cell.className = 'grid-time-cell';
      const hr = (day.startHour + h) % 24;
      cell.textContent = `${String(hr).padStart(2, '0')}:00`;
      timeRow.appendChild(cell);
    }
    inner.appendChild(timeRow);

    // One row per stage
    for (const s of stages) {
      const row = document.createElement('div');
      row.className = 'grid-stage-row';
      row.style.gridTemplateColumns = `${labelWidth}px ${stripWidth}px`;

      const label = document.createElement('div');
      label.className = 'stage-label';
      label.style.color = `var(--${s})`;
      label.textContent = STAGE_LABELS[s];
      row.appendChild(label);

      const cells = document.createElement('div');
      cells.className = 'grid-cells';
      cells.style.gridTemplateColumns = `repeat(${totalHours}, ${colWidth * 12}px)`;
      cells.style.width = stripWidth + 'px';

      // Hour grid background
      for (let h = 0; h < totalHours; h++) {
        const bg = document.createElement('div');
        bg.className = 'grid-bg-cell';
        cells.appendChild(bg);
      }

      // Absolute-positioned acts
      for (const a of grouped[s]) {
        const k = actKey(day.key, a);
        const liked = state.likes.has(k);
        const btn = document.createElement('button');
        btn.className = 'grid-act' + (liked ? ' liked' : '');
        btn.dataset.stage = s;
        btn.dataset.actKey = k;
        const left = (a.startMin / 5) * colWidth;
        const width = ((a.endMin - a.startMin) / 5) * colWidth - 2;
        btn.style.left = left + 'px';
        btn.style.width = width + 'px';
        btn.innerHTML = `
          <span class="ga-heart" aria-hidden="true">❤</span>
          <div class="ga-name">${escapeHtml(a.name)}</div>
          <div class="ga-time">${a.start} – ${a.end}</div>
        `;
        btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
        btn.title = liked ? 'Favoriet — klik om te verwijderen' : 'Klik om als favoriet te markeren';
        btn.addEventListener('click', () => toggleLike(day.key, a));
        cells.appendChild(btn);
      }

      row.appendChild(cells);
      inner.appendChild(row);
    }

    grid.appendChild(inner);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // ----- Master render -----
  function render() {
    renderDayTabs();
    renderStageFilters();
    updateToggles();

    const gridView = document.getElementById('gridView');
    const listView = document.getElementById('listView');
    const emptyMsg = document.getElementById('emptyMsg');

    if (state.view === 'grid') {
      gridView.hidden = false;
      listView.hidden = true;
      renderGrid();
    } else {
      gridView.hidden = true;
      listView.hidden = false;
      renderList();
    }

    const grouped = filteredActs();
    const hasAny = Object.keys(grouped).length > 0;
    emptyMsg.hidden = hasAny;
  }

  // ----- Event wiring -----
  document.getElementById('likedOnlyBtn').addEventListener('click', () => {
    state.likedOnly = !state.likedOnly;
    localStorage.setItem(LS_KEYS.likedOnly, state.likedOnly ? '1' : '0');
    render();
  });
  document.getElementById('viewToggle').addEventListener('click', () => {
    state.view = state.view === 'grid' ? 'list' : 'grid';
    localStorage.setItem(LS_KEYS.view, state.view);
    render();
  });

  // Festival map overlay
  const mapOverlay = document.getElementById('mapOverlay');
  const mapPins = document.getElementById('mapPins');
  const mapStagePanel = document.getElementById('mapStagePanel');
  const mapDayTabs = document.getElementById('mapDayTabs');
  let mapSelectedStage = null;

  function renderMapDayTabs() {
    mapDayTabs.innerHTML = '';
    for (const d of data.days) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'map-day-tab' + (d.key === state.day ? ' active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', d.key === state.day ? 'true' : 'false');
      btn.textContent = d.key;
      btn.addEventListener('click', () => {
        state.day = d.key;
        localStorage.setItem(LS_KEYS.day, d.key);
        renderDayTabs();
        renderMapDayTabs();
        renderMapPins();
        renderMapStagePanel();
      });
      mapDayTabs.appendChild(btn);
    }
  }

  function renderMapPins() {
    mapPins.innerHTML = '';
    for (const s of data.stages) {
      const pos = STAGE_MAP_POS[s];
      if (!pos) continue;
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'map-pin' + (mapSelectedStage === s ? ' active' : '');
      pin.style.left = pos.left + '%';
      pin.style.top = pos.top + '%';
      pin.style.setProperty('--pin-color', `var(--${s})`);
      pin.dataset.stage = s;
      const likeCount = mapStageLikeCount(s);
      pin.innerHTML =
        `<span class="map-pin-dot"></span>` +
        `<span class="map-pin-label">${escapeHtml(STAGE_LABELS[s])}` +
        (likeCount ? ` <span class="map-pin-badge">❤${likeCount}</span>` : '') +
        `</span>`;
      pin.addEventListener('click', (e) => {
        e.stopPropagation();
        selectMapStage(s);
      });
      mapPins.appendChild(pin);
    }
  }

  function mapStageLikeCount(stage) {
    const day = getDay();
    const acts = (day.stages[stage] || []);
    let n = 0;
    for (const a of acts) if (state.likes.has(actKey(day.key, a))) n++;
    return n;
  }

  function selectMapStage(stage) {
    mapSelectedStage = stage;
    renderMapPins();
    renderMapStagePanel();
  }

  function renderMapStagePanel() {
    if (!mapSelectedStage) {
      mapStagePanel.hidden = true;
      mapStagePanel.innerHTML = '';
      return;
    }
    const day = getDay();
    const stage = mapSelectedStage;
    const acts = (day.stages[stage] || []);
    const rows = acts.map((a) => {
      const liked = state.likes.has(actKey(day.key, a));
      return `<li class="map-act${liked ? ' liked' : ''}">
        <span class="map-act-time">${a.start} – ${a.end}</span>
        <span class="map-act-name">${escapeHtml(a.name)}</span>
        ${liked ? '<span class="map-act-heart" aria-hidden="true">❤</span>' : ''}
      </li>`;
    }).join('');
    mapStagePanel.innerHTML = `
      <div class="map-panel-head" style="border-color: var(--${stage})">
        <span class="map-panel-title" style="color: var(--${stage})">${escapeHtml(STAGE_LABELS[stage])}</span>
        <span class="map-panel-day">${escapeHtml(day.label || day.key)}</span>
        <button class="map-panel-close" type="button" aria-label="Sluit stage">×</button>
      </div>
      <ul class="map-act-list">${rows || '<li class="map-act-empty">Geen optredens op deze dag.</li>'}</ul>
    `;
    mapStagePanel.hidden = false;
    mapStagePanel.querySelector('.map-panel-close').addEventListener('click', () => {
      mapSelectedStage = null;
      renderMapPins();
      renderMapStagePanel();
    });
  }

  const openMap = () => {
    mapSelectedStage = null;
    renderMapDayTabs();
    renderMapPins();
    renderMapStagePanel();
    mapOverlay.hidden = false;
    document.body.classList.add('map-open');
  };
  const closeMap = () => {
    mapOverlay.hidden = true;
    document.body.classList.remove('map-open');
  };
  document.getElementById('mapBtn').addEventListener('click', openMap);
  document.getElementById('mapCloseBtn').addEventListener('click', closeMap);
  mapOverlay.addEventListener('click', (e) => {
    if (e.target === mapOverlay || e.target.classList.contains('map-scroll') || e.target.classList.contains('map-wrap')) {
      closeMap();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !mapOverlay.hidden) closeMap();
  });

  render();
})();
