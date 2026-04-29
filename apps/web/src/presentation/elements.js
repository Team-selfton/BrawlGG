export function getElements() {
  return {
    form: document.getElementById("player-form"),
    input: document.getElementById("tag-input"),
    searchButton: document.getElementById("search-button"),
    statusText: document.getElementById("status"),
    playerPanel: document.getElementById("player-panel"),
    countrySelect: document.getElementById("country-select"),
    rankingTypeSelect: document.getElementById("ranking-type"),
    brawlerSelect: document.getElementById("brawler-select"),
    rankingButton: document.getElementById("load-ranking"),
    rankingList: document.getElementById("ranking-list"),
    multiForm: document.getElementById("multi-form"),
    multiInput: document.getElementById("multi-input"),
    multiButton: document.getElementById("multi-button"),
    multiStatus: document.getElementById("multi-status"),
    multiList: document.getElementById("multi-list"),
    authStatus: document.getElementById("auth-status"),
    loginButton: document.getElementById("login-button"),
    logoutButton: document.getElementById("logout-button")
  };
}
