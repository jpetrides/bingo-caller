/* ============================================================
   Bingo Audio — Optional Web Speech API announcements
   OFF by default. Toggle via the speaker button.
   ============================================================ */

window.BingoAudio = (function () {
  'use strict';

  var synth = window.speechSynthesis || null;
  var voice = null;
  var enabled = false;

  function init() {
    if (!synth) return;

    function pickVoice() {
      var voices = synth.getVoices();
      voice = voices.find(function (v) { return v.lang.startsWith('en') && v.name.indexOf('Google') !== -1; })
           || voices.find(function (v) { return v.lang.startsWith('en-US'); })
           || voices.find(function (v) { return v.lang.startsWith('en'); })
           || voices[0]
           || null;
    }

    pickVoice();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = pickVoice;
    }
  }

  function announce(letter, number) {
    if (!enabled || !synth) return;

    synth.cancel();

    var text = letter + ' ... ' + number;
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    synth.speak(utterance);
  }

  function toggle() {
    enabled = !enabled;
    return enabled;
  }

  function isEnabled() {
    return enabled;
  }

  return { init: init, announce: announce, toggle: toggle, isEnabled: isEnabled };
})();
