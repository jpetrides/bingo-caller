/* ============================================================
   Bingo Audio — Optional Web Speech API announcements
   OFF by default. Toggle via the speaker button.
   ============================================================ */

window.BingoAudio = (function () {
  'use strict';

  var synth = window.speechSynthesis || null;
  var voice = null;
  var enabled = false;
  var audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function quack() {
    var ctx = getAudioCtx();
    var now = ctx.currentTime;

    // Nasal oscillator — frequency sweep gives the "wah" of a quack
    var osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(850, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);

    // Bandpass filter to make it sound nasal/ducky
    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(3, now);

    // Gain envelope — quick attack, short sustain, fast decay
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.01);
    gain.gain.setValueAtTime(0.5, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

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

  return { init: init, announce: announce, toggle: toggle, isEnabled: isEnabled, quack: quack };
})();
