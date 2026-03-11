(function() {
  'use strict';

  var STORAGE_KEY = 'cactus-theme';
  var THEMES = [
    { id: 'classic', name: 'Classic' },
    { id: 'dark', name: 'Dark' },
    { id: 'darkOrange', name: 'Dark Orange' },
    { id: 'deep_ocean', name: 'Deep Ocean' },
    { id: 'fog', name: 'Fog' },
    { id: 'greeny_light', name: 'Greeny Light' },
    { id: 'light', name: 'Light' },
    { id: 'moss', name: 'Moss' },
    { id: 'sunset', name: 'Sunset' },
    { id: 'white', name: 'White' },
  ];

  function setTheme(themeId) {
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem(STORAGE_KEY, themeId);
    updateActiveState();
  }

  function updateActiveState() {
    var current = localStorage.getItem(STORAGE_KEY) || '';
    var options = document.querySelectorAll('.theme-switcher__option');
    for (var i = 0; i < options.length; i++) {
      if (options[i].dataset.theme === current) {
        options[i].classList.add('active');
      } else {
        options[i].classList.remove('active');
      }
    }
  }

  function init() {
    var container = document.getElementById('theme-switcher');
    if (!container) return;

    var btn = container.querySelector('.theme-switcher__btn');
    var panel = container.querySelector('.theme-switcher__panel');
    if (!btn || !panel) return;

    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      panel.classList.toggle('is-open');
    });

    THEMES.forEach(function(theme) {
      var option = document.createElement('button');
      option.className = 'theme-switcher__option';
      option.dataset.theme = theme.id;
      option.type = 'button';
      option.setAttribute('aria-label', 'Switch to ' + theme.name + ' theme');
      option.innerHTML =
        '<span class="theme-switcher__swatch" data-theme="' + theme.id + '"></span>' +
        '<span class="theme-switcher__name">' + theme.name + '</span>';
      option.addEventListener('click', function() {
        setTheme(theme.id);
        panel.classList.remove('is-open');
      });
      panel.appendChild(option);
    });

    document.addEventListener('click', function(e) {
      if (!container.contains(e.target)) {
        panel.classList.remove('is-open');
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        panel.classList.remove('is-open');
      }
    });

    updateActiveState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
