/*
 * Matches the login page to the theme the user picked in the app.
 *
 * Keycloak is served under /auth on the same scheme, host and port as the app,
 * so the two share an origin and therefore share localStorage — this reads the
 * exact key the Angular shell writes ('akira-theme': system | light | dark).
 * If that ever stops being true (Keycloak moved to its own subdomain), this
 * quietly falls back to the OS preference rather than breaking.
 *
 * Loaded from <head> via theme.properties `scripts=`, so the class is on <html>
 * before first paint and there is no flash of the wrong theme.
 */
(function () {
  var STORAGE_KEY = 'akira-theme';

  function preferred() {
    var choice = null;
    try {
      choice = window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      // Private mode, blocked storage, or a cross-origin deployment.
      choice = null;
    }
    if (choice === 'dark' || choice === 'light') {
      return choice;
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function apply() {
    document.documentElement.classList.toggle('dark', preferred() === 'dark');
  }

  apply();

  // Only meaningful while the choice is "system"; harmless otherwise.
  if (window.matchMedia) {
    var query = window.matchMedia('(prefers-color-scheme: dark)');
    var listen = query.addEventListener
      ? query.addEventListener.bind(query, 'change')
      : query.addListener && query.addListener.bind(query);
    if (listen) {
      listen(apply);
    }
  }
})();
