(function () {
  const TROPICAL_YEAR = 365.2425;
  const JULIAN_YEAR = 365.25;
  const ISLAMIC_YEAR = 354.367;
  const ENOCHIC_YEAR = 364;
  const EGYPTIAN_YEAR = 365;
  const HEBREW_MEAN_YEAR = 365.246822206;

  const JDN_ANCHOR = gregorianToJdn(1, 1, 1);
  const JDN_MAYA_CREATION = 584283;
  const JDN_HIJRA = gregorianToJdn(622, 7, 19);
  const JDN_KALI_START = gregorianToJdn(-3101, 2, 18);
  const JDN_HEBREW_EPOCH = 347995;
  const JDN_FRENCH_START = gregorianToJdn(1792, 9, 22);
  const JDN_BAHAI_START = gregorianToJdn(1844, 3, 21);
  const JDN_SOVIET_START = gregorianToJdn(1929, 10, 1);
  const JDN_SOVIET_END = gregorianToJdn(1931, 12, 1);
  const JDN_ZORO_START = gregorianToJdn(632, 6, 16);
  const TODAY = getTodayGregorian();

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const MAYA_TZOLKIN_NAMES = [
    "Imix", "Ik'", "Ak'bal", "K'an", "Chikchan", "Kimi", "Manik'", "Lamat", "Muluk", "Ok",
    "Chuwen", "Eb'", "B'en", "Ix", "Men", "K'ib'", "Kab'an", "Etz'nab'", "Kawak", "Ajaw"
  ];
  const MAYA_HAAB_MONTHS = [
    "Pop", "Wo", "Sip", "Sotz'", "Sek", "Xul", "Yaxk'in", "Mol", "Ch'en",
    "Yax", "Sak'", "Keh", "Mak", "K'ank'in", "Muwan", "Pax", "K'ayab", "Kumk'u", "Wayeb"
  ];
  const CHINESE_STEMS = ["Jia", "Yi", "Bing", "Ding", "Wu", "Ji", "Geng", "Xin", "Ren", "Gui"];
  const CHINESE_BRANCHES = ["Zi", "Chou", "Yin", "Mao", "Chen", "Si", "Wu", "Wei", "Shen", "You", "Xu", "Hai"];
  const FRENCH_MONTHS = [
    "Vendemiaire", "Brumaire", "Frimaire", "Nivose", "Pluviose", "Ventose",
    "Germinal", "Floreal", "Prairial", "Messidor", "Thermidor", "Fructidor", "Sansculottides"
  ];
  const DISCORDIAN_SEASONS = ["Chaos", "Discord", "Confusion", "Bureaucracy", "The Aftermath"];
  const ETHIOPIAN_MONTHS = [
    "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit",
    "Miazia", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume"
  ];
  const ZORO_MONTHS = [
    "Farvardin", "Ardibehesht", "Khordad", "Tir", "Amardad", "Shahrivar",
    "Mehr", "Aban", "Adar", "Dae", "Bahman", "Aspandarmad", "Gatha Days"
  ];

  const EPOCH_SETS = {
    christ: [
      { id: "anchor", label: "1 CE", note: "Christ-era anchor", year: 1, month: 1, day: 1 },
      { id: "hijra", label: "622 CE", note: "Hijri epoch", year: 622, month: 7, day: 19 },
      { id: "fr", label: "1793 CE", note: "French Revolutionary period", year: 1793, month: 1, day: 1 },
      { id: "today", label: "Today", note: "Current day", year: TODAY.year, month: TODAY.month, day: TODAY.day },
      { id: "future1", label: "5000 CE", note: "Future checkpoint", year: 5000, month: 1, day: 1 },
      { id: "future2", label: "10000 CE", note: "Deep future", year: 10000, month: 1, day: 1 }
    ],
    deep: [
      { id: "gt", label: "8000 BCE", note: "Neolithic dawn (Gobekli Tepe)", year: 1 - 8000, month: 1, day: 1 },
      { id: "maya", label: "3114 BCE", note: "Maya creation anchor", year: -3113, month: 8, day: 11 },
      { id: "anchor", label: "1 CE", note: "Christ-era anchor", year: 1, month: 1, day: 1 },
      { id: "today", label: "Today", note: "Current day", year: TODAY.year, month: TODAY.month, day: TODAY.day },
      { id: "future", label: "10000 CE", note: "Deep future", year: 10000, month: 1, day: 1 },
      { id: "end", label: "12000 CE", note: "Extended horizon", year: 12000, month: 1, day: 1 }
    ]
  };

  const CALENDARS = [
    { id: "gregorian", name: "Gregorian", type: "Modern solar", meanYear: TROPICAL_YEAR, compute: computeGregorian },
    { id: "julian", name: "Julian", type: "Legacy solar", meanYear: JULIAN_YEAR, compute: computeJulian },
    { id: "islamic", name: "Islamic Hijri", type: "Pure lunar", meanYear: ISLAMIC_YEAR, compute: computeIslamic },
    { id: "enochic", name: "Enochic", type: "364-day fixed", meanYear: ENOCHIC_YEAR, compute: computeEnochic },
    { id: "maya_long", name: "Maya Long Count", type: "Mesoamerican", meanYear: null, compute: computeMayaLong },
    { id: "maya_cycle", name: "Maya Haab + Tzolkin", type: "Mesoamerican cycles", meanYear: 365, compute: computeMayaCycles },
    { id: "egyptian", name: "Egyptian Civil", type: "365-day wandering year", meanYear: EGYPTIAN_YEAR, compute: computeEgyptian },
    { id: "hebrew", name: "Hebrew", type: "Luni-solar metonic", meanYear: HEBREW_MEAN_YEAR, compute: computeHebrew },
    { id: "chinese", name: "Chinese Traditional", type: "Sexagenary cycle", meanYear: TROPICAL_YEAR, compute: computeChinese },
    { id: "kali", name: "Hindu Kali Yuga", type: "Long era system", meanYear: TROPICAL_YEAR, compute: computeKaliYuga },
    { id: "french", name: "French Republican", type: "Revolutionary solar", meanYear: TROPICAL_YEAR, compute: computeFrenchRepublican },
    { id: "discordian", name: "Discordian", type: "Erisian", meanYear: 365, compute: computeDiscordian },
    { id: "holocene", name: "Holocene", type: "Human Era", meanYear: TROPICAL_YEAR, compute: computeHolocene },
    { id: "ethiopian", name: "Ethiopian", type: "Ge'ez", meanYear: TROPICAL_YEAR, compute: computeEthiopian },
    { id: "soviet", name: "Soviet Revolutionary", type: "5-day cycle", meanYear: null, compute: computeSoviet },
    { id: "bahai", name: "Baha'i", type: "Bad'i", meanYear: TROPICAL_YEAR, compute: computeBahai },
    { id: "zoro", name: "Zoroastrian Shahenshahi", type: "365-day tradition", meanYear: 365, compute: computeZoroastrian }
  ];

  const el = {
    epochSet: document.getElementById("epoch-set"),
    customYear: document.getElementById("custom-year"),
    customEra: document.getElementById("custom-era"),
    customMonth: document.getElementById("custom-month"),
    customDay: document.getElementById("custom-day"),
    birthYear: document.getElementById("birth-year"),
    birthEra: document.getElementById("birth-era"),
    birthMonth: document.getElementById("birth-month"),
    birthDay: document.getElementById("birth-day"),
    todayReadonly: document.getElementById("today-readonly"),
    birthdaySummary: document.getElementById("birthday-summary"),
    ageList: document.getElementById("age-list"),
    customSummary: document.getElementById("custom-summary"),
    calendarFilter: document.getElementById("calendar-filter"),
    syncTable: document.getElementById("sync-table"),
    inspectorTitle: document.getElementById("inspector-title"),
    inspectorSubtitle: document.getElementById("inspector-subtitle"),
    inspectorBody: document.getElementById("inspector-body"),
    inspectorFormula: document.getElementById("inspector-formula"),
    enochicBar: document.getElementById("enochic-bar"),
    egyptianBar: document.getElementById("egyptian-bar"),
    enochicValue: document.getElementById("enochic-value"),
    egyptianValue: document.getElementById("egyptian-value"),
    driftFormula: document.getElementById("drift-formula"),
    seasonalList: document.getElementById("seasonal-list"),
    seasonalFormula: document.getElementById("seasonal-formula"),
    stabilityList: document.getElementById("stability-list")
  };

  const state = {
    selectedCellKey: null,
    cellMap: new Map(),
    visibleCalendars: new Set(CALENDARS.map((item) => item.id))
  };

  init();

  function init() {
    fillMonthSelect();
    fillDaySelect();
    fillBirthMonthSelect();
    fillBirthDaySelect();
    if (el.todayReadonly) {
      el.todayReadonly.value = formatLongDate(TODAY.year, TODAY.month, TODAY.day);
    }
    renderCalendarFilter();
    bindEvents();
    renderAll();
  }

  function bindEvents() {
    el.epochSet.addEventListener("change", renderAll);
    el.customYear.addEventListener("input", renderAll);
    el.customEra.addEventListener("change", renderAll);
    el.customMonth.addEventListener("change", () => {
      fillDaySelect();
      renderAll();
    });
    el.customDay.addEventListener("change", renderAll);
    el.birthYear.addEventListener("input", renderAll);
    el.birthEra.addEventListener("change", renderAll);
    el.birthMonth.addEventListener("change", () => {
      fillBirthDaySelect();
      renderAll();
    });
    el.birthDay.addEventListener("change", renderAll);
    el.syncTable.addEventListener("click", onTableClick);
  }

  function fillMonthSelect() {
    el.customMonth.innerHTML = MONTH_NAMES.map((name, idx) => `<option value="${idx + 1}">${name}</option>`).join("");
    el.customMonth.value = "1";
  }

  function fillDaySelect() {
    const month = Number(el.customMonth.value || 1);
    const maxDays = daysInGregorianMonth(2024, month);
    const selected = Number(el.customDay.value || 1);
    const options = [];
    for (let d = 1; d <= maxDays; d += 1) {
      options.push(`<option value="${d}">${d}</option>`);
    }
    el.customDay.innerHTML = options.join("");
    el.customDay.value = String(Math.min(selected, maxDays));
  }

  function fillBirthMonthSelect() {
    if (!el.birthMonth) return;
    el.birthMonth.innerHTML = MONTH_NAMES.map((name, idx) => `<option value="${idx + 1}">${name}</option>`).join("");
    el.birthMonth.value = "1";
  }

  function fillBirthDaySelect() {
    if (!el.birthDay) return;
    const month = Number(el.birthMonth.value || 1);
    const maxDays = daysInGregorianMonth(2024, month);
    const selected = Number(el.birthDay.value || 1);
    const options = [];
    for (let d = 1; d <= maxDays; d += 1) {
      options.push(`<option value="${d}">${d}</option>`);
    }
    el.birthDay.innerHTML = options.join("");
    el.birthDay.value = String(Math.min(selected, maxDays));
  }

  function renderCalendarFilter() {
    el.calendarFilter.innerHTML = CALENDARS.map((calendar) => `
      <label class="calendar-chip">
        <input type="checkbox" data-cal-id="${calendar.id}" checked>
        <span>${calendar.name}</span>
      </label>
    `).join("");

    el.calendarFilter.addEventListener("change", (event) => {
      const box = event.target.closest("input[data-cal-id]");
      if (!box) return;
      if (box.checked) {
        state.visibleCalendars.add(box.dataset.calId);
      } else {
        state.visibleCalendars.delete(box.dataset.calId);
      }
      renderAll();
    });
  }
  function renderAll() {
    renderCustomSummary();
    renderSyncTable();
    renderBirthdayPanel();
    renderDriftPanel();
    renderSeasonalPanel();
    renderStabilityPanel();
  }

  function renderCustomSummary() {
    const custom = readCustomEpoch();
    el.customSummary.textContent = `Custom row: ${formatLongDate(custom.year, custom.month, custom.day)} (astronomical year ${custom.year}).`;
  }

  function renderBirthdayPanel() {
    if (!el.birthdaySummary || !el.ageList) return;

    const birth = readBirthDate();
    const todayJdn = gregorianToJdn(TODAY.year, TODAY.month, TODAY.day);
    const birthJdn = gregorianToJdn(birth.year, birth.month, birth.day);

    if (birthJdn > todayJdn) {
      el.birthdaySummary.textContent = "Birthday is in the future relative to today. Please choose an earlier date.";
      el.ageList.innerHTML = "";
      return;
    }

    const daysElapsed = todayJdn - birthJdn;
    const exact = computeExactGregorianAge(birth, TODAY, todayJdn);

    const lines = [];
    lines.push(`<li><strong>Gregorian (exact):</strong> ${exact.years} years and ${exact.daysSinceBirthday} days.</li>`);
    lines.push(`<li><strong>Total elapsed days:</strong> ${formatNumber(daysElapsed, 0)} days.</li>`);

    const visible = getVisibleCalendars();
    for (const cal of visible) {
      if (cal.id === "gregorian") continue;
      if (typeof cal.meanYear === "number") {
        const age = daysElapsed / cal.meanYear;
        lines.push(`<li><strong>${escapeHtml(cal.name)}:</strong> ~${formatNumber(age, 3)} calendar years old.</li>`);
      } else if (cal.id === "maya_long") {
        const parts = toMayaLongCount(daysElapsed);
        lines.push(`<li><strong>Maya Long Count elapsed:</strong> ${parts.b}.${parts.k}.${parts.t}.${parts.u}.${parts.kin} since your birth.</li>`);
      } else if (cal.id === "soviet") {
        const cycles = Math.floor(daysElapsed / 5);
        lines.push(`<li><strong>Soviet 5-day cycles:</strong> ~${formatNumber(cycles, 0)} cycles since your birth.</li>`);
      } else {
        const approxYears = daysElapsed / TROPICAL_YEAR;
        lines.push(`<li><strong>${escapeHtml(cal.name)}:</strong> ~${formatNumber(approxYears, 3)} years (tropical proxy).</li>`);
      }
    }

    el.birthdaySummary.textContent = `Birthday: ${formatLongDate(birth.year, birth.month, birth.day)}. Today: ${formatLongDate(TODAY.year, TODAY.month, TODAY.day)}.`;
    el.ageList.innerHTML = lines.join("");
  }

  function readBirthDate() {
    const yearValue = Math.max(1, Math.min(12000, Number(el.birthYear.value || 2000)));
    const era = el.birthEra.value === "BCE" ? "BCE" : "CE";
    const month = Math.max(1, Math.min(12, Number(el.birthMonth.value || 1)));
    const maxDays = daysInGregorianMonth(2024, month);
    const day = Math.max(1, Math.min(maxDays, Number(el.birthDay.value || 1)));
    const year = era === "BCE" ? (1 - yearValue) : yearValue;
    return { year, month, day };
  }

  function computeExactGregorianAge(birth, today, todayJdn) {
    let years = today.year - birth.year;
    if (today.month < birth.month || (today.month === birth.month && today.day < birth.day)) {
      years -= 1;
    }

    const lastBirthdayYear = birth.year + years;
    const lastBirthdayDay = Math.min(birth.day, daysInGregorianMonth(lastBirthdayYear, birth.month));
    const lastBirthdayJdn = gregorianToJdn(lastBirthdayYear, birth.month, lastBirthdayDay);
    const daysSinceBirthday = todayJdn - lastBirthdayJdn;
    return { years, daysSinceBirthday };
  }

  function readCustomEpoch() {
    const yearValue = Math.max(1, Math.min(12000, Number(el.customYear.value || 2026)));
    const era = el.customEra.value === "BCE" ? "BCE" : "CE";
    const month = Math.max(1, Math.min(12, Number(el.customMonth.value || 1)));
    const maxDays = daysInGregorianMonth(2024, month);
    const day = Math.max(1, Math.min(maxDays, Number(el.customDay.value || 1)));
    const astronomicalYear = era === "BCE" ? (1 - yearValue) : yearValue;

    return {
      id: "custom",
      label: `Custom ${yearValue} ${era}`,
      note: "Interactive row",
      year: astronomicalYear,
      month,
      day
    };
  }

  function getEpochRows() {
    const key = EPOCH_SETS[el.epochSet.value] ? el.epochSet.value : "christ";
    return [...EPOCH_SETS[key], readCustomEpoch()];
  }

  function getVisibleCalendars() {
    return CALENDARS.filter((calendar) => state.visibleCalendars.has(calendar.id));
  }

  function renderSyncTable() {
    const rows = getEpochRows();
    const columns = getVisibleCalendars();

    state.cellMap.clear();

    const head = `
      <thead>
        <tr>
          <th>Epoch Gate</th>
          ${columns.map((calendar) => `<th title="${calendar.type}">${calendar.name}</th>`).join("")}
        </tr>
      </thead>
    `;

    const bodyRows = rows.map((row) => {
      const jdn = gregorianToJdn(row.year, row.month, row.day);
      const greg = jdnToGregorian(jdn);
      const context = { jdn, greg, row };
      const rowCells = columns.map((calendar) => {
        const entry = calendar.compute(context);
        const key = `${row.id}::${calendar.id}`;
        state.cellMap.set(key, { row, calendar, entry, context });
        const activeClass = key === state.selectedCellKey ? "active" : "";

        return `
          <td>
            <button class="matrix-cell-btn ${activeClass}" data-cell-key="${key}">
              <div class="cell-main">${escapeHtml(entry.short)}</div>
              <div class="cell-sub">${escapeHtml(entry.sub || calendar.type)}</div>
            </button>
          </td>
        `;
      }).join("");

      return `
        <tr>
          <td class="epoch-cell">
            <strong>${escapeHtml(row.label)}</strong>
            <span>${escapeHtml(row.note)} - ${escapeHtml(formatLongDate(row.year, row.month, row.day))} - ${escapeHtml(formatYearsFromChrist(row.year))}</span>
          </td>
          ${rowCells}
        </tr>
      `;
    }).join("");

    el.syncTable.innerHTML = `${head}<tbody>${bodyRows}</tbody>`;

    if (!state.selectedCellKey || !state.cellMap.has(state.selectedCellKey)) {
      const firstKey = state.cellMap.keys().next().value || null;
      state.selectedCellKey = firstKey;
    }
    renderInspector();
  }

  function onTableClick(event) {
    const btn = event.target.closest("button[data-cell-key]");
    if (!btn) return;
    state.selectedCellKey = btn.dataset.cellKey;
    renderSyncTable();
  }

  function renderInspector() {
    if (!state.selectedCellKey || !state.cellMap.has(state.selectedCellKey)) {
      el.inspectorTitle.textContent = "Select a cell";
      el.inspectorSubtitle.textContent = "Details will appear here.";
      el.inspectorBody.innerHTML = "";
      el.inspectorFormula.textContent = "";
      return;
    }

    const payload = state.cellMap.get(state.selectedCellKey);
    const { row, calendar, entry } = payload;

    el.inspectorTitle.textContent = `${calendar.name} @ ${row.label}`;
    el.inspectorSubtitle.textContent = `${calendar.type} - ${formatLongDate(row.year, row.month, row.day)}`;
    el.inspectorBody.innerHTML = (entry.lines || []).map((line) => `<div class="inspector-item">${escapeHtml(line)}</div>`).join("");
    renderFormula(entry.formula || "", el.inspectorFormula);
  }

  function renderDriftPanel() {
    const target = { year: 10000, month: 1, day: 1 };
    const jdn = gregorianToJdn(target.year, target.month, target.day);
    const elapsedDays = jdn - JDN_ANCHOR;
    const solarYears = elapsedDays / TROPICAL_YEAR;

    const enochic = computeDriftStats(solarYears, ENOCHIC_YEAR);
    const egyptian = computeDriftStats(solarYears, EGYPTIAN_YEAR);
    const maxDrift = Math.max(enochic.driftDays, egyptian.driftDays);

    el.enochicBar.style.width = `${(enochic.driftDays / maxDrift) * 100}%`;
    el.egyptianBar.style.width = `${(egyptian.driftDays / maxDrift) * 100}%`;
    el.enochicValue.textContent = `${formatNumber(enochic.driftDays, 2)} drift-days (~${formatNumber(enochic.fakeYears, 2)} fake years)`;
    el.egyptianValue.textContent = `${formatNumber(egyptian.driftDays, 2)} drift-days (~${formatNumber(egyptian.fakeYears, 2)} fake years)`;

    const formula = String.raw`\Delta_d = N\cdot(\tau-L),\quad \Delta_y=\frac{\Delta_d}{L}
\\ N\approx ${formatNumber(solarYears, 2)},\ \tau=${TROPICAL_YEAR}
\\ \text{Enochic: }L=364\Rightarrow \Delta_d\approx ${formatNumber(enochic.driftDays, 2)},\ \Delta_y\approx ${formatNumber(enochic.fakeYears, 2)}
\\ \text{Egyptian: }L=365\Rightarrow \Delta_d\approx ${formatNumber(egyptian.driftDays, 2)},\ \Delta_y\approx ${formatNumber(egyptian.fakeYears, 2)}`;
    renderFormula(formula, el.driftFormula);
  }

  function renderSeasonalPanel() {
    const shiftPerYear = TROPICAL_YEAR - ISLAMIC_YEAR;
    const oneCycleYears = TROPICAL_YEAR / shiftPerYear;
    const twoCycleYears = (2 * TROPICAL_YEAR) / shiftPerYear;
    const firstDoubleCycle = 622 + twoCycleYears;
    const nextFromNow = 2026 + twoCycleYears;

    el.seasonalList.innerHTML = `
      <li>Mean Hijri year: ${ISLAMIC_YEAR.toFixed(3)} days.</li>
      <li>Seasonal shift per year: ${shiftPerYear.toFixed(3)} days earlier.</li>
      <li>One full season sweep: ~${oneCycleYears.toFixed(2)} years.</li>
      <li>Two full sweeps: ~${twoCycleYears.toFixed(2)} years.</li>
      <li>From Hijri epoch (622 CE): around ${formatNumber(firstDoubleCycle, 0)} CE.</li>
      <li>From 2026: around ${formatNumber(nextFromNow, 0)} CE.</li>
    `;

    const formula = String.raw`s=\tau-L_H,\quad Y_{1\text{ cycle}}=\frac{\tau}{s},\quad Y_{2\text{ cycles}}=\frac{2\tau}{s}
\\ \tau=${TROPICAL_YEAR},\ L_H=${ISLAMIC_YEAR},\ s\approx ${formatNumber(shiftPerYear, 4)}
\\ Y_{2\text{ cycles}}\approx ${formatNumber(twoCycleYears, 2)}\text{ years}`;
    renderFormula(formula, el.seasonalFormula);
  }

  function renderStabilityPanel() {
    const ranked = CALENDARS
      .filter((calendar) => typeof calendar.meanYear === "number")
      .map((calendar) => ({
        ...calendar,
        error: Math.abs((calendar.meanYear || TROPICAL_YEAR) - TROPICAL_YEAR)
      }))
      .sort((a, b) => a.error - b.error)
      .slice(0, 7);

    el.stabilityList.innerHTML = ranked.map((item) => `
      <li><strong>${escapeHtml(item.name)}</strong> - mean-year error ${item.error.toFixed(6)} days/year</li>
    `).join("");
  }

  function computeDriftStats(solarYears, calendarYearLength) {
    const driftDays = solarYears * (TROPICAL_YEAR - calendarYearLength);
    const fakeYears = driftDays / calendarYearLength;
    return { driftDays, fakeYears };
  }
  function computeGregorian(ctx) {
    const g = jdnToGregorian(ctx.jdn);
    const doy = gregorianDayOfYear(g.year, g.month, g.day);
    return entry(
      `${pad2(g.day)} ${MONTH_SHORT[g.month - 1]} ${formatYearShort(g.year)}`,
      `${doy}/${isGregorianLeap(g.year) ? 366 : 365}`,
      [
        `Proleptic Gregorian date: ${formatLongDate(g.year, g.month, g.day)}`,
        `Day of year: ${doy}`,
        "Anchor calendar for this matrix."
      ],
      String.raw`Y_G = \text{Gregorian date at JDN}`
    );
  }

  function computeJulian(ctx) {
    const j = jdnToJulian(ctx.jdn);
    const yearsFromAnchor = (ctx.jdn - JDN_ANCHOR) / TROPICAL_YEAR;
    const seasonalDrift = yearsFromAnchor * (JULIAN_YEAR - TROPICAL_YEAR);
    return entry(
      `${pad2(j.day)} ${MONTH_SHORT[j.month - 1]} ${formatYearShort(j.year)}`,
      `${formatNumber(seasonalDrift, 2)}d drift`,
      [
        `Julian date at same absolute day: ${formatLongDate(j.year, j.month, j.day)}`,
        `Seasonal drift vs tropical year: ~${formatNumber(seasonalDrift, 2)} days`,
        "Julian keeps leap day every 4 years with no century correction."
      ],
      String.raw`\Delta_{\text{Julian}}\approx N\cdot(365.25-365.2425)`
    );
  }

  function computeIslamic(ctx) {
    const delta = ctx.jdn - JDN_HIJRA;
    const year = Math.floor(delta / ISLAMIC_YEAR) + 1;
    const dayOfYear = Math.floor(posMod(delta, ISLAMIC_YEAR)) + 1;
    const month = Math.min(12, Math.floor((dayOfYear - 1) / 29.53059) + 1);
    const dayOfMonth = Math.floor(dayOfYear - (month - 1) * 29.53059) + 1;
    const shiftPerYear = TROPICAL_YEAR - ISLAMIC_YEAR;
    const approxSeasonShift = year * shiftPerYear;
    return entry(
      `AH ${year}`,
      `m${month} d${dayOfMonth}`,
      [
        `Approx Hijri year: ${year}`,
        `Approx month/day: ${month}/${dayOfMonth}`,
        `Cumulative seasonal shift proxy: ~${formatNumber(approxSeasonShift, 1)} days`,
        "Pure lunar model: no solar intercalation."
      ],
      String.raw`H\approx 1+\frac{JDN-JDN_{622}}{354.367}`
    );
  }

  function computeEnochic(ctx) {
    const delta = ctx.jdn - JDN_ANCHOR;
    const year = Math.floor(delta / ENOCHIC_YEAR) + 1;
    const day = Math.floor(posMod(delta, ENOCHIC_YEAR)) + 1;
    const week = Math.floor((day - 1) / 7) + 1;
    return entry(
      `Y${year} D${day}`,
      `W${week}/52`,
      [
        `Enochic year/day: ${year}/${day}`,
        `Week index: ${week} of 52`,
        "Fixed 364-day year with exact 52-week structure."
      ],
      String.raw`E\approx 1+\frac{JDN-JDN_{anchor}}{364}`
    );
  }

  function computeMayaLong(ctx) {
    const delta = ctx.jdn - JDN_MAYA_CREATION;
    if (delta < 0) {
      return entry(
        "Pre-0.0.0.0.0",
        `${Math.abs(delta)} days before`,
        [
          `This epoch is ${Math.abs(delta)} days before the Long Count creation anchor.`,
          "Long Count anchor is set at 11 Aug 3114 BCE in this model."
        ],
        String.raw`LC = JDN - 584283`
      );
    }
    const parts = toMayaLongCount(delta);
    return entry(
      `${parts.b}.${parts.k}.${parts.t}.${parts.u}.${parts.kin}`,
      `${formatNumber(delta, 0)} days`,
      [
        "Long Count decomposition from creation anchor:",
        `${parts.b} baktun, ${parts.k} katun, ${parts.t} tun, ${parts.u} uinal, ${parts.kin} kin`,
        `Total days since creation: ${formatNumber(delta, 0)}`
      ],
      String.raw`d=JDN-584283,\ d=144000b+7200k+360t+20u+\text{kin}`
    );
  }

  function computeMayaCycles(ctx) {
    const delta = ctx.jdn - JDN_MAYA_CREATION;
    const tzNumber = posMod(delta + 3, 13) + 1;
    const tzName = MAYA_TZOLKIN_NAMES[posMod(delta + 19, 20)];
    const haabCount = posMod(delta + 348, 365);
    let haabMonth;
    let haabDay;
    if (haabCount < 360) {
      haabMonth = MAYA_HAAB_MONTHS[Math.floor(haabCount / 20)];
      haabDay = haabCount % 20;
    } else {
      haabMonth = MAYA_HAAB_MONTHS[18];
      haabDay = haabCount - 360;
    }
    return entry(
      `${tzNumber} ${tzName}`,
      `${haabDay} ${haabMonth}`,
      [
        `Tzolkin: ${tzNumber} ${tzName}`,
        `Haab: ${haabDay} ${haabMonth}`,
        "Ritual 260-day and civil 365-day cycles run in parallel."
      ],
      String.raw`\text{Tzolkin}=((d+3)\bmod 13)+1,\ \text{Name}=(d+19)\bmod 20`
    );
  }

  function computeEgyptian(ctx) {
    const delta = ctx.jdn - JDN_ANCHOR;
    const year = Math.floor(delta / EGYPTIAN_YEAR) + 1;
    const day = Math.floor(posMod(delta, EGYPTIAN_YEAR)) + 1;
    const month = day <= 360 ? Math.floor((day - 1) / 30) + 1 : 13;
    const dayInMonth = day <= 360 ? ((day - 1) % 30) + 1 : day - 360;
    return entry(
      `Y${year}`,
      `M${month} D${dayInMonth}`,
      [
        `Egyptian civil year/day: ${year}/${day}`,
        `Month/day: ${month}/${dayInMonth}`,
        "No leap day: the year drifts through the seasons."
      ],
      String.raw`Eg\approx 1+\frac{JDN-JDN_{anchor}}{365}`
    );
  }

  function computeHebrew(ctx) {
    const delta = ctx.jdn - JDN_HEBREW_EPOCH;
    const year = Math.floor(delta / HEBREW_MEAN_YEAR) + 1;
    const metonic = posMod(year - 1, 19) + 1;
    return entry(
      `~AM ${year}`,
      `Metonic ${metonic}/19`,
      [
        `Approx Hebrew year: ${year} (Anno Mundi)`,
        `Metonic cycle position: year ${metonic} of 19`,
        "Approximation uses mean year length, not full molad postponements."
      ],
      String.raw`AM\approx 1+\frac{JDN-JDN_{Hebrew\ epoch}}{365.246822206}`
    );
  }

  function computeChinese(ctx) {
    const g = ctx.greg;
    const idx = posMod(g.year - 1984, 60);
    const stem = CHINESE_STEMS[idx % 10];
    const branch = CHINESE_BRANCHES[idx % 12];
    const cycle = Math.floor((g.year - 1984) / 60) + 1;
    return entry(
      `${stem}-${branch}`,
      `${idx + 1}/60`,
      [
        `Sexagenary designation: ${stem}-${branch}`,
        `Position in 60-year cycle: ${idx + 1}`,
        `Cycle count relative to 1984 Jia-Zi anchor: ${cycle}`
      ],
      String.raw`i=(Y-1984)\bmod 60,\ \text{stem}=i\bmod 10,\ \text{branch}=i\bmod 12`
    );
  }
  function computeKaliYuga(ctx) {
    const delta = ctx.jdn - JDN_KALI_START;
    const year = Math.floor(delta / TROPICAL_YEAR) + 1;
    return entry(
      `Kali ${year}`,
      `${formatNumber(delta, 0)} days`,
      [
        `Approx Kali Yuga year: ${year}`,
        `Epoch used: 18 Feb 3102 BCE (proleptic Gregorian)`,
        "Useful for comparing deep-time scale against modern calendars."
      ],
      String.raw`K\approx 1+\frac{JDN-JDN_{Kali\ start}}{365.2425}`
    );
  }

  function computeFrenchRepublican(ctx) {
    if (ctx.jdn < JDN_FRENCH_START) {
      return entry(
        "N/A",
        "Pre-1792",
        [
          "French Republican calendar begins in 1792 CE.",
          "This row predates the revolutionary epoch."
        ],
        String.raw`JDN<JDN_{1792-09-22}\Rightarrow \text{not in use}`
      );
    }
    const delta = ctx.jdn - JDN_FRENCH_START;
    const year = Math.floor(delta / TROPICAL_YEAR) + 1;
    const dayOfYear = Math.floor(posMod(delta, TROPICAL_YEAR)) + 1;
    const month = dayOfYear <= 360 ? Math.floor((dayOfYear - 1) / 30) + 1 : 13;
    const day = dayOfYear <= 360 ? ((dayOfYear - 1) % 30) + 1 : dayOfYear - 360;
    return entry(
      `An ${year}`,
      `${FRENCH_MONTHS[month - 1]} ${day}`,
      [
        `Approx republican year: An ${year}`,
        `Month/day: ${FRENCH_MONTHS[month - 1]} ${day}`,
        "Model uses tropical mean year for long-range extrapolation."
      ],
      String.raw`FR\approx 1+\frac{JDN-JDN_{1792-09-22}}{365.2425}`
    );
  }

  function computeDiscordian(ctx) {
    const g = ctx.greg;
    const yold = g.year + 1166;
    const leap = isGregorianLeap(g.year);
    const doy = gregorianDayOfYear(g.year, g.month, g.day);

    if (leap && doy === 60) {
      return entry(
        `YOLD ${yold}`,
        "St Tib's Day",
        [
          `Discordian year: ${yold} YOLD`,
          "Leap-day insert: St Tib's Day",
          "5 seasons of 73 days each otherwise."
        ],
        String.raw`\text{if leap and day}=60\Rightarrow \text{St Tib's Day}`
      );
    }

    const adjusted = leap && doy > 60 ? doy - 1 : doy;
    const season = Math.floor((adjusted - 1) / 73);
    const dayInSeason = ((adjusted - 1) % 73) + 1;
    return entry(
      `YOLD ${yold}`,
      `${DISCORDIAN_SEASONS[season]} ${dayInSeason}`,
      [
        `Discordian year: ${yold}`,
        `Season/day: ${DISCORDIAN_SEASONS[season]} ${dayInSeason}`,
        "Year length stays at 365 with special leap handling."
      ],
      String.raw`YOLD=Y_G+1166,\ \text{season}=\left\lfloor\frac{d-1}{73}\right\rfloor`
    );
  }

  function computeHolocene(ctx) {
    const g = ctx.greg;
    const he = g.year + 10000;
    return entry(
      `HE ${he}`,
      `${pad2(g.day)} ${MONTH_SHORT[g.month - 1]}`,
      [
        `Holocene (Human Era): ${he}`,
        "Definition: Gregorian year + 10,000",
        "Same day/month structure as Gregorian."
      ],
      String.raw`HE=Y_G+10000`
    );
  }

  function computeEthiopian(ctx) {
    const g = ctx.greg;
    const isAfterNewYear = (g.month > 9) || (g.month === 9 && g.day >= 11);
    const ethYear = isAfterNewYear ? (g.year - 7) : (g.year - 8);
    const newYearGregorian = isAfterNewYear ? g.year : (g.year - 1);
    const jdnNewYear = gregorianToJdn(newYearGregorian, 9, 11);
    const dayOfYear = ctx.jdn - jdnNewYear + 1;
    const month = dayOfYear <= 360 ? Math.floor((dayOfYear - 1) / 30) + 1 : 13;
    const day = dayOfYear <= 360 ? ((dayOfYear - 1) % 30) + 1 : dayOfYear - 360;
    return entry(
      `EC ${ethYear}`,
      `${ETHIOPIAN_MONTHS[month - 1]} ${day}`,
      [
        `Ethiopian year: ${ethYear}`,
        `Month/day: ${ETHIOPIAN_MONTHS[month - 1]} ${day}`,
        "Uses 13-month structure (12x30 + Pagume)."
      ],
      String.raw`Y_{EC}\approx Y_G-7\text{ or }Y_G-8\ (\text{New Year near Sep 11})`
    );
  }

  function computeSoviet(ctx) {
    if (ctx.jdn < JDN_SOVIET_START) {
      return entry(
        "N/A",
        "Pre-1929",
        [
          "Soviet 5-day week reform started in 1929.",
          "This row is before the reform epoch."
        ],
        String.raw`JDN<JDN_{1929-10-01}`
      );
    }
    const cycleDay = posMod(ctx.jdn - JDN_SOVIET_START, 5) + 1;
    const stateText = ctx.jdn <= JDN_SOVIET_END ? "In historical reform window" : "Theoretical continuation";
    return entry(
      `Day ${cycleDay}/5`,
      stateText,
      [
        `5-day cycle index: ${cycleDay}`,
        stateText,
        "Modeled as continuous day-cycles from 1 Oct 1929."
      ],
      String.raw`d_5=((JDN-JDN_{1929-10-01})\bmod 5)+1`
    );
  }

  function computeBahai(ctx) {
    if (ctx.jdn < JDN_BAHAI_START) {
      return entry(
        "N/A",
        "Pre-1844",
        [
          "Baha'i calendar epoch starts in 1844 CE.",
          "This row predates that epoch."
        ],
        String.raw`JDN<JDN_{1844-03-21}`
      );
    }
    const g = ctx.greg;
    let nawRuzYear = g.year;
    let nawRuzJdn = gregorianToJdn(g.year, 3, 20);
    if (ctx.jdn < nawRuzJdn) {
      nawRuzYear = g.year - 1;
      nawRuzJdn = gregorianToJdn(nawRuzYear, 3, 20);
    }
    const bahaiYear = nawRuzYear - 1843;
    const dayOfYear = ctx.jdn - nawRuzJdn + 1;
    const intercalary = isGregorianLeap(nawRuzYear + 1) ? 5 : 4;
    let monthLabel;
    let dayLabel;
    if (dayOfYear <= 342) {
      const month = Math.ceil(dayOfYear / 19);
      const day = ((dayOfYear - 1) % 19) + 1;
      monthLabel = `Month ${month}`;
      dayLabel = day;
    } else if (dayOfYear <= 342 + intercalary) {
      monthLabel = "Ayyam-i-Ha";
      dayLabel = dayOfYear - 342;
    } else {
      monthLabel = "Month 19";
      dayLabel = dayOfYear - 342 - intercalary;
    }
    return entry(
      `BE ${bahaiYear}`,
      `${monthLabel} / ${dayLabel}`,
      [
        `Baha'i year: ${bahaiYear}`,
        `Segment: ${monthLabel}, day ${dayLabel}`,
        "Naw-Ruz approximated near March 20 for this deep-time model."
      ],
      String.raw`BE\approx Y_{Naw-Ruz}-1843`
    );
  }

  function computeZoroastrian(ctx) {
    if (ctx.jdn < JDN_ZORO_START) {
      return entry(
        "N/A",
        "Pre-632",
        [
          "Yazdegerd era anchor used: 632 CE.",
          "This row predates that era anchor."
        ],
        String.raw`JDN<JDN_{632-06-16}`
      );
    }
    const delta = ctx.jdn - JDN_ZORO_START;
    const year = Math.floor(delta / 365) + 1;
    const dayOfYear = Math.floor(posMod(delta, 365)) + 1;
    const month = dayOfYear <= 360 ? Math.floor((dayOfYear - 1) / 30) + 1 : 13;
    const day = dayOfYear <= 360 ? ((dayOfYear - 1) % 30) + 1 : dayOfYear - 360;
    return entry(
      `YZ ${year}`,
      `${ZORO_MONTHS[month - 1]} ${day}`,
      [
        `Shahenshahi year (proxy): ${year}`,
        `Month/day: ${ZORO_MONTHS[month - 1]} ${day}`,
        "Modeled as strict 365-day flow with 5 end-days."
      ],
      String.raw`YZ\approx 1+\frac{JDN-JDN_{632-06-16}}{365}`
    );
  }
  function toMayaLongCount(days) {
    let rem = days;
    const baktun = Math.floor(rem / 144000); rem %= 144000;
    const katun = Math.floor(rem / 7200); rem %= 7200;
    const tun = Math.floor(rem / 360); rem %= 360;
    const uinal = Math.floor(rem / 20); rem %= 20;
    const kin = rem;
    return { b: baktun, k: katun, t: tun, u: uinal, kin };
  }

  function entry(short, sub, lines, formula) {
    return { short, sub, lines, formula };
  }

  function renderFormula(latex, target) {
    if (!target) return;
    if (!latex) {
      target.textContent = "";
      return;
    }
    if (window.katex) {
      try {
        window.katex.render(latex, target, { displayMode: true, throwOnError: false });
        return;
      } catch (_err) {
        target.textContent = latex;
        return;
      }
    }
    target.textContent = latex;
  }

  function gregorianToJdn(year, month, day) {
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    return day + Math.floor((153 * m + 2) / 5) + (365 * y) + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  }

  function jdnToGregorian(jdn) {
    const a = jdn + 32044;
    const b = Math.floor((4 * a + 3) / 146097);
    const c = a - Math.floor((146097 * b) / 4);
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor((1461 * d) / 4);
    const m = Math.floor((5 * e + 2) / 153);
    const day = e - Math.floor((153 * m + 2) / 5) + 1;
    const month = m + 3 - 12 * Math.floor(m / 10);
    const year = b * 100 + d - 4800 + Math.floor(m / 10);
    return { year, month, day };
  }

  function jdnToJulian(jdn) {
    const c = jdn + 32082;
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor((1461 * d) / 4);
    const m = Math.floor((5 * e + 2) / 153);
    const day = e - Math.floor((153 * m + 2) / 5) + 1;
    const month = m + 3 - 12 * Math.floor(m / 10);
    const year = d - 4800 + Math.floor(m / 10);
    return { year, month, day };
  }

  function gregorianDayOfYear(year, month, day) {
    const daysBefore = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let value = daysBefore[month - 1] + day;
    if (month > 2 && isGregorianLeap(year)) value += 1;
    return value;
  }

  function isGregorianLeap(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  function daysInGregorianMonth(year, month) {
    if (month === 2) return isGregorianLeap(year) ? 29 : 28;
    if ([4, 6, 9, 11].includes(month)) return 30;
    return 31;
  }

  function posMod(value, mod) {
    return ((value % mod) + mod) % mod;
  }

  function pad2(num) {
    return String(num).padStart(2, "0");
  }

  function formatYearShort(year) {
    if (year <= 0) return `${1 - year} BCE`;
    return `${year} CE`;
  }

  function formatLongDate(year, month, day) {
    const era = year <= 0 ? "BCE" : "CE";
    const eraYear = year <= 0 ? (1 - year) : year;
    return `${pad2(day)} ${MONTH_NAMES[month - 1]} ${eraYear} ${era}`;
  }

  function formatNumber(value, digits) {
    if (!Number.isFinite(value)) return String(value);
    return Number(value).toLocaleString(undefined, {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0
    });
  }

  function formatYearsFromChrist(year) {
    const offset = year - 1;
    if (offset === 0) return "0 years from 1 CE";
    if (offset > 0) return `+${formatNumber(offset, 0)} years from 1 CE`;
    return `-${formatNumber(Math.abs(offset), 0)} years from 1 CE`;
  }

  function getTodayGregorian() {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate()
    };
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
