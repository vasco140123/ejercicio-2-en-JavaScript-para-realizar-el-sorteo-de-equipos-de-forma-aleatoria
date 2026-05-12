(function () {
  "use strict";

  var STORAGE_KEY = "sorteo_equipos_participantes_v1";
  var STORAGE_CONFIG = "sorteo_equipos_config_v1";
  var MAX_PARTICIPANTS = 100;
  var MAX_LINE_LENGTH = 50;

  var participantsEl = document.getElementById("participants");
  var participantCountEl = document.getElementById("participant-count");
  var modeEl = document.getElementById("mode");
  var modeValueEl = document.getElementById("mode-value");
  var modeValueLabelEl = document.getElementById("mode-value-label");
  var teamTitleEl = document.getElementById("team-title");
  var leaderStarOptionEl = document.getElementById("leader-star-option");
  var btnClearParticipants = document.getElementById("btn-clear-participants");
  var btnGenerate = document.getElementById("btn-generate");
  var setupErrorEl = document.getElementById("setup-error");
  var screenSetup = document.getElementById("screen-setup");
  var screenResults = document.getElementById("screen-results");
  var teamsContainer = document.getElementById("teams-container");
  var resultsThemeTitleEl = document.getElementById("results-theme-title");
  var btnBack = document.getElementById("btn-back");
  var btnJpg = document.getElementById("btn-jpg");
  var btnCopy = document.getElementById("btn-copy");
  var btnCopyColumns = document.getElementById("btn-copy-columns");
  var copyFeedbackEl = document.getElementById("copy-feedback");

  var currentTeams = [];
  var revealTimer = null;

  function loadParticipantsFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) participantsEl.value = raw;
    } catch (e) {
      /* ignore */
    }
  }

  function saveParticipantsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, participantsEl.value);
    } catch (e) {
      /* ignore */
    }
  }

  function loadConfigFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_CONFIG);
      if (!raw) return;
      var cfg = JSON.parse(raw);
      if (cfg.mode === "teams" || cfg.mode === "perTeam") modeEl.value = cfg.mode;
      if (typeof cfg.modeValue === "number" && cfg.modeValue >= 1) modeValueEl.value = String(cfg.modeValue);
      if (typeof cfg.teamTitle === "string") teamTitleEl.value = cfg.teamTitle;
      if (typeof cfg.leaderStarOption === "boolean") leaderStarOptionEl.checked = cfg.leaderStarOption;
    } catch (e) {
      /* ignore */
    }
  }

  function saveConfigToStorage() {
    try {
      var cfg = {
        mode: modeEl.value,
        modeValue: parseInt(modeValueEl.value, 10) || 1,
        teamTitle: teamTitleEl.value,
        leaderStarOption: leaderStarOptionEl.checked,
      };
      localStorage.setItem(STORAGE_CONFIG, JSON.stringify(cfg));
    } catch (e) {
      /* ignore */
    }
  }

  function parseParticipants() {
    var lines = participantsEl.value.split(/\r?\n/);
    var list = [];
    var useStar = leaderStarOptionEl.checked;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      var isLeader = false;
      if (useStar && line.charAt(0) === "*") {
        isLeader = true;
        line = line.slice(1).trim();
        if (!line) continue;
      }
      if (line.length > MAX_LINE_LENGTH) line = line.slice(0, MAX_LINE_LENGTH);
      list.push({ name: line, isLeader: isLeader });
      if (list.length >= MAX_PARTICIPANTS) break;
    }
    return list;
  }

  function updateParticipantCount() {
    var n = parseParticipants().length;
    participantCountEl.textContent = n + " / " + MAX_PARTICIPANTS + " participantes";
  }

  function updateModeLabel() {
    if (modeEl.value === "teams") {
      modeValueLabelEl.textContent = "Número de equipos";
      modeValueEl.max = "100";
    } else {
      modeValueLabelEl.textContent = "Participantes por equipo";
      modeValueEl.max = String(MAX_PARTICIPANTS);
    }
  }

  function shuffle(array) {
    var a = array.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function computeTeamSizes(n, mode, value) {
    var numTeams;
    var sizes = [];

    if (mode === "teams") {
      numTeams = Math.min(Math.max(1, value), n);
      var base = Math.floor(n / numTeams);
      var rem = n % numTeams;
      for (var t = 0; t < numTeams; t++) {
        sizes.push(base + (t < rem ? 1 : 0));
      }
    } else {
      var per = Math.min(Math.max(1, value), n);
      numTeams = Math.ceil(n / per);
      for (var k = 0; k < numTeams; k++) {
        sizes.push(Math.min(per, n - k * per));
      }
    }

    return { numTeams: numTeams, sizes: sizes };
  }

  function buildTeamsShuffleOnly(people, mode, value) {
    var n = people.length;
    if (n === 0) return [];
    var inf = computeTeamSizes(n, mode, value);
    var numTeams = inf.numTeams;
    var sizes = inf.sizes;
    var shuffled = shuffle(people);
    var teams = [];
    for (var i = 0; i < numTeams; i++) {
      teams.push([]);
    }
    var idx = 0;
    for (var teamIdx = 0; teamIdx < numTeams; teamIdx++) {
      for (var s = 0; s < sizes[teamIdx]; s++) {
        teams[teamIdx].push(shuffled[idx++]);
      }
    }
    return teams;
  }

  function buildTeamsWithLeaders(people, mode, value) {
    var n = people.length;
    if (n === 0) return [];
    var inf = computeTeamSizes(n, mode, value);
    var numTeams = inf.numTeams;
    var sizes = inf.sizes;

    var leaders = [];
    var members = [];
    for (var p = 0; p < people.length; p++) {
      if (people[p].isLeader) leaders.push(people[p]);
      else members.push(people[p]);
    }
    leaders = shuffle(leaders);
    members = shuffle(members);

    var teams = [];
    for (var i = 0; i < numTeams; i++) {
      teams.push([]);
    }

    for (var t = 0; t < numTeams; t++) {
      if (leaders.length > 0) {
        teams[t].push(leaders.shift());
      }
      while (teams[t].length < sizes[t]) {
        if (members.length > 0) teams[t].push(members.shift());
        else if (leaders.length > 0) teams[t].push(leaders.shift());
        else break;
      }
    }

    return teams;
  }

  function personToCopyString(person) {
    return person.isLeader ? person.name + " (Líder)" : person.name;
  }

  function showSetupError(msg) {
    setupErrorEl.textContent = msg;
    setupErrorEl.hidden = !msg;
  }

  function setScreen(showResults) {
    if (showResults) {
      screenSetup.classList.remove("screen--active");
      screenSetup.hidden = true;
      screenResults.hidden = false;
      screenResults.classList.add("screen--active");
    } else {
      screenResults.classList.remove("screen--active");
      screenResults.hidden = true;
      screenSetup.hidden = false;
      screenSetup.classList.add("screen--active");
    }
  }

  function clearRevealTimer() {
    if (revealTimer) {
      clearInterval(revealTimer);
      revealTimer = null;
    }
  }

  function renderTeamPlaceholders(teams) {
    teamsContainer.innerHTML = "";
    for (var i = 0; i < teams.length; i++) {
      var box = document.createElement("div");
      box.className = "team-box";
      box.dataset.teamIndex = String(i);

      var sub = document.createElement("h3");
      sub.className = "team-box__subtitle";
      sub.textContent = "Equipo " + (i + 1);

      var ul = document.createElement("ul");
      ul.className = "team-box__list";
      var li = document.createElement("li");
      li.className = "team-box__item team-box__item--placeholder";
      li.textContent = "…";
      ul.appendChild(li);

      box.appendChild(sub);
      box.appendChild(ul);
      teamsContainer.appendChild(box);
    }
  }

  function animateReveal(teams) {
    clearRevealTimer();
    var teamIdx = 0;
    var memberIdx = 0;

    function step() {
      if (teamIdx >= teams.length) {
        clearRevealTimer();
        return;
      }

      var box = teamsContainer.children[teamIdx];
      if (!box) {
        clearRevealTimer();
        return;
      }
      var ul = box.querySelector(".team-box__list");
      if (!ul) {
        clearRevealTimer();
        return;
      }

      if (memberIdx === 0) {
        var ph = ul.querySelector(".team-box__item--placeholder");
        if (ph) ph.remove();
      }

      if (memberIdx < teams[teamIdx].length) {
        var person = teams[teamIdx][memberIdx];
        var item = document.createElement("li");
        item.className = "team-box__item" + (person.isLeader ? " team-box__item--leader" : "");
        if (person.isLeader) {
          var badge = document.createElement("span");
          badge.className = "team-box__badge";
          badge.textContent = "Líder";
          item.appendChild(badge);
        }
        var nameSpan = document.createElement("span");
        nameSpan.className = "team-box__name";
        nameSpan.textContent = person.name;
        item.appendChild(nameSpan);
        ul.appendChild(item);
        memberIdx++;
      } else {
        teamIdx++;
        memberIdx = 0;
      }
    }

    revealTimer = setInterval(step, 320);
  }

  function getResultsPlainText() {
    var theme = teamTitleEl.value.trim();
    var lines = [];
    if (theme) {
      lines.push(theme);
      lines.push("");
    }
    for (var i = 0; i < currentTeams.length; i++) {
      lines.push("Equipo " + (i + 1));
      for (var j = 0; j < currentTeams[i].length; j++) {
        lines.push("  - " + personToCopyString(currentTeams[i][j]));
      }
      lines.push("");
    }
    return lines.join("\n").trim();
  }

  function getResultsTabColumns() {
    var maxLen = 0;
    for (var i = 0; i < currentTeams.length; i++) {
      if (currentTeams[i].length > maxLen) maxLen = currentTeams[i].length;
    }
    var rows = [];
    for (var r = 0; r < maxLen; r++) {
      var cells = [];
      for (var c = 0; c < currentTeams.length; c++) {
        cells.push(currentTeams[c][r] != null ? personToCopyString(currentTeams[c][r]) : "");
      }
      rows.push(cells.join("\t"));
    }
    var header = [];
    for (var h = 0; h < currentTeams.length; h++) {
      header.push("Equipo " + (h + 1));
    }
    return header.join("\t") + "\n" + rows.join("\n");
  }

  function getThemeBottomY(theme, w, padding) {
    if (!theme) return padding + 44;
    var c = document.createElement("canvas");
    c.width = Math.max(200, w);
    var ctx = c.getContext("2d");
    if (!ctx) return padding + 80;
    ctx.font = "bold 22px Segoe UI, sans-serif";
    var maxWidth = w - padding * 2;
    var words = theme.split(/\s+/);
    var line = "";
    var y = padding + 24;
    var lh = 26;
    for (var i = 0; i < words.length; i++) {
      var test = line + words[i] + " ";
      if (ctx.measureText(test).width > maxWidth && line) {
        line = words[i] + " ";
        y += lh;
      } else {
        line = test;
      }
    }
    return y + lh * 0.85;
  }

  function drawWrappedThemeTitle(ctx, theme, w, padding, startY, maxWidth, lineHeight) {
    if (!theme) return startY;
    ctx.fillStyle = "#e8eef5";
    ctx.textAlign = "center";
    ctx.font = "bold 22px Segoe UI, sans-serif";
    var words = theme.split(/\s+/);
    var line = "";
    var y = startY;
    for (var i = 0; i < words.length; i++) {
      var test = line + words[i] + " ";
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line.trim(), w / 2, y);
        line = words[i] + " ";
        y += lineHeight;
      } else {
        line = test;
      }
    }
    if (line.trim()) ctx.fillText(line.trim(), w / 2, y);
    ctx.textAlign = "left";
    return y + lineHeight * 0.85;
  }

  function drawResultsToCanvas() {
    var theme = teamTitleEl.value.trim();
    var padding = 24;
    var lineHeight = 20;
    var cols = currentTeams.length;
    if (cols === 0) return null;

    var maxCanvasW = 2800;
    var gap = 10;
    var colWidth = Math.max(100, Math.floor((maxCanvasW - padding * 2 - gap * (cols - 1)) / cols));

    var maxRows = 0;
    for (var i = 0; i < cols; i++) {
      if (currentTeams[i].length > maxRows) maxRows = currentTeams[i].length;
    }

    var w = padding * 2 + cols * colWidth + gap * (cols - 1);
    var themeBottom = theme ? getThemeBottomY(theme, w, padding) : padding + 44;
    var yTop = themeBottom + 12;
    var h = yTop + maxRows * lineHeight + padding + 16;

    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#1a2332";
    ctx.fillRect(0, 0, w, h);

    if (theme) {
      drawWrappedThemeTitle(ctx, theme, w, padding, padding + 24, w - padding * 2, 26);
    } else {
      ctx.fillStyle = "#e8eef5";
      ctx.font = "bold 18px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Equipos formados", w / 2, padding + 26);
      ctx.textAlign = "left";
    }

    var maxChars = Math.max(8, Math.floor(colWidth / 7));
    for (var c = 0; c < cols; c++) {
      var x = padding + c * (colWidth + gap);
      ctx.strokeStyle = "#3d9cf0";
      ctx.strokeRect(x, yTop, colWidth, h - yTop - padding);
      ctx.fillStyle = "#3d9cf0";
      ctx.font = "bold 12px Segoe UI, sans-serif";
      var head = "Equipo " + (c + 1);
      if (head.length > maxChars) head = head.slice(0, maxChars - 1) + "…";
      ctx.fillText(head, x + 6, yTop - 8);
      ctx.fillStyle = "#e8eef5";
      ctx.font = "11px Segoe UI, sans-serif";
      for (var r = 0; r < currentTeams[c].length; r++) {
        var text = personToCopyString(currentTeams[c][r]);
        if (text.length > maxChars) text = text.slice(0, maxChars - 1) + "…";
        ctx.fillText(text, x + 8, yTop + 16 + r * lineHeight);
      }
    }

    return canvas;
  }

  function downloadJpg() {
    copyFeedbackEl.textContent = "";
    var canvas = drawResultsToCanvas();
    if (!canvas) {
      copyFeedbackEl.textContent = "No se pudo generar la imagen.";
      copyFeedbackEl.style.color = "var(--error, #f87171)";
      return;
    }
    var link = document.createElement("a");
    link.download = "equipos-sorteo.jpg";
    link.href = canvas.toDataURL("image/jpeg", 0.92);
    link.click();
    copyFeedbackEl.style.color = "";
    copyFeedbackEl.textContent = "Imagen JPG descargada.";
  }

  function copyText(text, okMsg) {
    copyFeedbackEl.textContent = "";
    function ok() {
      copyFeedbackEl.style.color = "";
      copyFeedbackEl.textContent = okMsg;
    }
    function fail() {
      copyFeedbackEl.style.color = "var(--error, #f87171)";
      copyFeedbackEl.textContent = "No se pudo copiar. Intente de nuevo o use HTTPS.";
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(fail);
    } else {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        ok();
      } catch (e) {
        fail();
      }
    }
  }

  function onGenerate() {
    showSetupError("");
    var list = parseParticipants();
    if (list.length < 2) {
      showSetupError("Ingrese al menos 2 participantes (uno por línea).");
      return;
    }

    var mode = modeEl.value;
    var val = parseInt(modeValueEl.value, 10);
    if (!val || val < 1) {
      showSetupError("Indique un número válido según el criterio seleccionado.");
      return;
    }

    if (mode === "teams" && val > list.length) {
      showSetupError("El número de equipos no puede ser mayor que la cantidad de participantes.");
      return;
    }

    if (mode === "perTeam" && val > list.length) {
      showSetupError("Los participantes por equipo no pueden superar el total de participantes.");
      return;
    }

    var useLeaders = leaderStarOptionEl.checked;
    currentTeams = useLeaders ? buildTeamsWithLeaders(list, mode, val) : buildTeamsShuffleOnly(list, mode, val);
    var theme = teamTitleEl.value.trim();

    resultsThemeTitleEl.textContent = theme || "Equipos formados";

    setScreen(true);
    renderTeamPlaceholders(currentTeams);
    animateReveal(currentTeams);
  }

  function onBack() {
    clearRevealTimer();
    setScreen(false);
    copyFeedbackEl.textContent = "";
  }

  function onClearParticipants() {
    participantsEl.value = "";
    saveParticipantsToStorage();
    updateParticipantCount();
    showSetupError("");
  }

  participantsEl.addEventListener("input", function () {
    saveParticipantsToStorage();
    updateParticipantCount();
  });

  modeEl.addEventListener("change", function () {
    updateModeLabel();
    saveConfigToStorage();
  });

  modeValueEl.addEventListener("change", saveConfigToStorage);
  teamTitleEl.addEventListener("input", saveConfigToStorage);
  leaderStarOptionEl.addEventListener("change", saveConfigToStorage);

  btnClearParticipants.addEventListener("click", onClearParticipants);
  btnGenerate.addEventListener("click", onGenerate);
  btnBack.addEventListener("click", onBack);
  btnJpg.addEventListener("click", downloadJpg);
  btnCopy.addEventListener("click", function () {
    copyText(getResultsPlainText(), "Texto copiado al portapapeles.");
  });
  btnCopyColumns.addEventListener("click", function () {
    copyText(getResultsTabColumns(), "Tabla por columnas copiada (pegar en Excel).");
  });

  loadParticipantsFromStorage();
  loadConfigFromStorage();
  updateModeLabel();
  updateParticipantCount();
})();
