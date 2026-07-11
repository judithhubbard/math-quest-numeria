// MathMaker — boot and player profiles.
var MM = globalThis.MM = globalThis.MM || {};
(function () {
  'use strict';

  function showProfileScreen() {
    const screen = document.getElementById('profileScreen');
    const list = document.getElementById('profileList');
    const profiles = MM.engine.profiles();
    list.innerHTML = profiles.length
      ? profiles.map(n => `
          <div class="profile-row">
            <button class="profile-load" data-name="${n}">▶️ ${n}</button>
            <button class="profile-del" data-name="${n}" title="Delete this adventurer">🗑</button>
          </div>`).join('')
      : '<div class="profile-empty">No adventurers yet — create one below!</div>';

    list.querySelectorAll('.profile-load').forEach(b => {
      b.onclick = () => {
        if (MM.engine.load(b.dataset.name)) start();
      };
    });
    list.querySelectorAll('.profile-del').forEach(b => {
      b.onclick = () => {
        if (confirm(`Delete ${b.dataset.name}'s adventure? This cannot be undone.`)) {
          MM.engine.deleteProfile(b.dataset.name);
          showProfileScreen();
        }
      };
    });

    const input = document.getElementById('newName');
    const create = () => {
      const name = input.value.trim().slice(0, 20);
      if (!name) { input.focus(); return; }
      MM.engine.newGame(name);
      start();
    };
    document.getElementById('btnNew').onclick = create;
    input.onkeydown = ev => { if (ev.key === 'Enter') create(); };
    screen.classList.remove('hidden');
  }

  function start() {
    document.getElementById('profileScreen').classList.add('hidden');
    MM.ui.refresh();
    MM.ui.log('Use the arrow keys (or WASD) to move.');
    if (MM.engine.state.taskIndex === 0) {
      MM.ui.log('Find the castle 🏰 and meet the MathMaker!');
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    MM.ui.init();
    showProfileScreen();
  });
})();
