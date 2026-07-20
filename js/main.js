// MathMaker — boot and player profiles.
var MM = globalThis.MM = globalThis.MM || {};
(function () {
  'use strict';

  function showProfileScreen() {
    const screen = document.getElementById('profileScreen');
    const list = document.getElementById('profileList');
    const profiles = MM.engine.profiles();
    // version stamp (2026-07-13): "am I updated?" answered at a glance
    if (!document.getElementById('versionStamp')) {
      const v = document.createElement('div');
      v.id = 'versionStamp';
      v.className = 'dim';
      v.style.cssText = 'position:absolute;right:12px;bottom:8px;font-size:11px';
      v.textContent = MM.VERSION;
      screen.querySelector('.profile-card').style.position = 'relative';
      screen.querySelector('.profile-card').appendChild(v);
    }
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

    // Wave 18: choose your hero at the start, too (name + form together, light).
    // A DRAFT model — there's no save yet — mutated by the shared picker, read
    // when Start is pressed. Default 'knight' keeps hitting Start unblocked and
    // preserves the classic look for anyone who ignores the picker.
    const head = document.getElementById('avatarChooseHead');
    if (head) head.textContent = MM.data.AVATAR.pickerHeading;
    const draft = { avatar: 'knight', avatarPalette: null, heroHat: null };
    MM.ui.renderAvatarPicker(document.getElementById('avatarPickProfile'), {
      get: () => ({ avatar: draft.avatar, palette: draft.avatarPalette, heroHat: draft.heroHat }),
      apply: (avatar, palette) => { draft.avatar = avatar; draft.avatarPalette = palette; },
      showHats: false, ownedHats: [],
    });

    const input = document.getElementById('newName');
    const create = () => {
      const name = input.value.trim().slice(0, 20);
      if (!name) { input.focus(); return; }
      MM.engine.newGame(name, draft.avatar, draft.avatarPalette);
      start();
    };
    document.getElementById('btnNew').onclick = create;
    input.onkeydown = ev => { if (ev.key === 'Enter') create(); };
    screen.classList.remove('hidden');
  }

  function start() {
    document.getElementById('profileScreen').classList.add('hidden');
    document.body.classList.toggle('big-text', !!MM.engine.state.bigText);
    MM.ui.refresh();
    MM.ui.log('Use the arrow keys (or WASD) to move.');
    if (MM.engine.state.taskIndex === 0) {
      MM.ui.log('Find the castle 🏰 and meet the MathMaker!');
    }
    // (Resume narration lives in E.load — loading always pulls to the
    // overworld, and the "made camp outside" line explains it there.)
  }

  window.addEventListener('DOMContentLoaded', () => {
    MM.ui.init();
    showProfileScreen();
  });
})();
