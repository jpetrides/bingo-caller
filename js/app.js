/* ============================================================
   Bingo Caller — Main Application
   ============================================================ */

window.BingoApp = (function () {
  'use strict';

  // ── Column definitions ─────────────────────────────────
  var COLUMNS = {
    B: { min: 1,  max: 15 },
    I: { min: 16, max: 30 },
    N: { min: 31, max: 45 },
    G: { min: 46, max: 60 },
    O: { min: 61, max: 75 }
  };

  var LETTERS = ['B', 'I', 'N', 'G', 'O'];

  // ── State ──────────────────────────────────────────────
  var state = {
    pool: [],
    called: [],
    currentNumber: null,
    gameOverTimeout: null
  };

  // ── DOM cache ──────────────────────────────────────────
  var dom = {};

  function cacheDom() {
    dom.callerDisplay = document.getElementById('callerDisplay');
    dom.callLetter    = document.getElementById('callLetter');
    dom.callNumber    = document.getElementById('callNumber');
    dom.calledCount   = document.getElementById('calledCount');
    dom.calledPercent = document.getElementById('calledPercent');
    dom.historyStrip  = document.getElementById('historyStrip');
    dom.boardGrid     = document.getElementById('boardGrid');
    dom.btnCall       = document.getElementById('btnCall');
    dom.btnReset      = document.getElementById('btnReset');
    dom.btnAudio      = document.getElementById('btnAudio');
    dom.audioIconPath = document.getElementById('audioIconPath');
  }

  // ── Helpers ────────────────────────────────────────────
  function getLetter(num) {
    if (num <= 15) return 'B';
    if (num <= 30) return 'I';
    if (num <= 45) return 'N';
    if (num <= 60) return 'G';
    return 'O';
  }

  function shuffle(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  function buildPool() {
    var pool = [];
    for (var i = 1; i <= 75; i++) {
      pool.push(i);
    }
    return shuffle(pool);
  }

  // SVG paths for audio icon states
  var ICON_MUTED = 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z';
  var ICON_ON = 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z';

  // ── Board ──────────────────────────────────────────────
  function buildBoard() {
    var grid = dom.boardGrid;
    grid.innerHTML = '';

    // Build each letter as a horizontal row: header + 15 numbers
    LETTERS.forEach(function (letter) {
      var header = document.createElement('div');
      header.className = 'board-col-header';
      header.textContent = letter;
      grid.appendChild(header);

      for (var i = COLUMNS[letter].min; i <= COLUMNS[letter].max; i++) {
        var cell = document.createElement('div');
        cell.className = 'board-cell';
        cell.dataset.number = i;
        cell.id = 'cell-' + i;
        cell.textContent = i;
        grid.appendChild(cell);
      }
    });
  }

  // ── History Helpers ────────────────────────────────────
  function insertHistoryChip(num, letter) {
    var chip = document.createElement('span');
    chip.className = 'history-chip col-' + letter;
    chip.innerHTML = '<span class="ball-letter">' + letter + '</span>' +
                     '<span class="ball-number">' + num + '</span>';
    dom.historyStrip.prepend(chip);
    dom.historyStrip.scrollLeft = 0;
  }

  function animateToHistory(num, letter) {
    // Skip animation for reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      insertHistoryChip(num, letter);
      return;
    }

    var callerRect = dom.callerDisplay.getBoundingClientRect();
    var historyRect = dom.historyStrip.getBoundingClientRect();

    // Compute chip target size (matches CSS clamp(48px, 5vw, 64px), 72px at 1400+)
    var chipSize = Math.min(Math.max(48, window.innerWidth * 0.05), 64);
    if (window.innerWidth >= 1400) chipSize = 72;

    var callerSize = dom.callerDisplay.offsetWidth;
    var startScale = callerSize / chipSize;

    // Start: centered over caller display
    var startX = callerRect.left + callerRect.width / 2 - chipSize / 2;
    var startY = callerRect.top + callerRect.height / 2 - chipSize / 2;

    // End: left edge of history strip content area
    var historyPadLeft = parseFloat(getComputedStyle(dom.historyStrip).paddingLeft);
    var endX = historyRect.left + historyPadLeft;
    var endY = historyRect.top + historyRect.height / 2 - chipSize / 2;

    // Create flying ball
    var flyer = document.createElement('span');
    flyer.className = 'history-chip flying-chip col-' + letter;
    flyer.innerHTML = '<span class="ball-letter">' + letter + '</span>' +
                      '<span class="ball-number">' + num + '</span>';

    flyer.style.cssText =
      'position:fixed;' +
      'left:' + startX + 'px;top:' + startY + 'px;' +
      'width:' + chipSize + 'px;height:' + chipSize + 'px;' +
      'z-index:1000;pointer-events:none;' +
      'transform:scale(' + startScale + ');';

    document.body.appendChild(flyer);
    void flyer.offsetWidth; // force reflow

    var dx = endX - startX;
    var dy = endY - startY;
    flyer.style.transition = 'transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    flyer.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1)';

    var done = false;
    function finish() {
      if (done) return;
      done = true;
      if (flyer.parentNode) flyer.remove();
      insertHistoryChip(num, letter);
    }

    flyer.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, 600); // fallback
  }

  // ── Call Logic ─────────────────────────────────────────
  function callNumber() {
    if (state.pool.length === 0) return;

    var num = state.pool.pop();
    var letter = getLetter(num);

    // Animate previous ball to history strip
    if (state.currentNumber !== null) {
      var prevNum = state.currentNumber;
      var prevLetter = getLetter(prevNum);

      var prevCell = document.getElementById('cell-' + prevNum);
      if (prevCell) {
        prevCell.classList.remove('current', 'pop');
      }

      animateToHistory(prevNum, prevLetter);
    }

    state.currentNumber = num;
    state.called.push(num);

    // Update caller display
    dom.callLetter.textContent = letter;
    dom.callNumber.textContent = num;
    dom.calledCount.textContent = state.called.length;
    dom.calledPercent.textContent = Math.round(state.called.length / 75 * 100);
    dom.callerDisplay.classList.remove('col-B', 'col-I', 'col-N', 'col-G', 'col-O', 'game-over');
    dom.callerDisplay.classList.add('has-call', 'col-' + letter);

    // Trigger bounce animation
    dom.callerDisplay.classList.remove('pop');
    void dom.callerDisplay.offsetWidth; // force reflow to restart animation
    dom.callerDisplay.classList.add('pop');

    // Mark board cell
    var cell = document.getElementById('cell-' + num);
    if (cell) {
      cell.classList.add('called', 'current');
      cell.classList.remove('pop');
      void cell.offsetWidth;
      cell.classList.add('pop');
    }

    // Audio (if enabled)
    if (window.BingoAudio) {
      BingoAudio.announce(letter, num);
    }

    // Check if all numbers called
    if (state.pool.length === 0) {
      dom.btnCall.disabled = true;
      // Brief delay so the last number is visible, then animate it to history
      state.gameOverTimeout = setTimeout(function () {
        animateToHistory(num, letter);
        state.currentNumber = null;
        dom.callerDisplay.classList.remove('has-call', 'col-B', 'col-I', 'col-N', 'col-G', 'col-O');
        dom.callerDisplay.classList.add('game-over');
        dom.callNumber.textContent = 'DONE!';
        dom.callLetter.textContent = '';
      }, 1500);
    }
  }

  // ── Reset ──────────────────────────────────────────────
  function resetGame() {
    if (state.called.length > 0) {
      if (!confirm('Start a new game? All called numbers will be cleared.')) {
        return;
      }
    }

    // Cancel pending game-over animation
    if (state.gameOverTimeout) {
      clearTimeout(state.gameOverTimeout);
      state.gameOverTimeout = null;
    }

    // Remove any in-flight flying chips
    var flyers = document.querySelectorAll('.flying-chip');
    for (var i = 0; i < flyers.length; i++) {
      flyers[i].remove();
    }

    state.pool = buildPool();
    state.called = [];
    state.currentNumber = null;

    dom.callLetter.textContent = '';
    dom.callNumber.textContent = '?';
    dom.calledCount.textContent = '0';
    dom.calledPercent.textContent = '0';
    dom.callerDisplay.classList.remove('has-call', 'pop', 'game-over', 'col-B', 'col-I', 'col-N', 'col-G', 'col-O');
    dom.historyStrip.innerHTML = '';
    dom.btnCall.disabled = false;

    // Clear board
    var cells = document.querySelectorAll('.board-cell');
    for (var i = 0; i < cells.length; i++) {
      cells[i].classList.remove('called', 'current', 'pop');
    }
  }

  // ── Audio Toggle ───────────────────────────────────────
  function toggleAudio() {
    if (!window.BingoAudio) return;

    var isOn = BingoAudio.toggle();
    dom.btnAudio.classList.toggle('active', isOn);
    dom.audioIconPath.setAttribute('d', isOn ? ICON_ON : ICON_MUTED);
    dom.btnAudio.title = isOn ? 'Audio on (click to mute)' : 'Audio off (click to unmute)';
  }

  // ── Init ───────────────────────────────────────────────
  function init() {
    cacheDom();
    buildBoard();
    state.pool = buildPool();

    dom.btnCall.addEventListener('click', callNumber);
    dom.btnReset.addEventListener('click', resetGame);
    dom.btnAudio.addEventListener('click', toggleAudio);

    if (window.BingoAudio) {
      BingoAudio.init();
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { callNumber: callNumber, resetGame: resetGame };
})();
