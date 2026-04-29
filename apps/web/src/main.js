import {
  applyAuthButtons,
  applyInteractionLock,
  clearPlayerPanel,
  renderPlayer,
  renderRankingMessage,
  renderRankings,
  setAuthStatus,
  setStatus
} from "./presentation/renderers.js";
import { getElements } from "./presentation/elements.js";
import {
  loadAuthState,
  loadHealthState,
  logout,
  startOAuthLogin
} from "./application/authApplication.js";
import { loadPlayerOverview, loadRankings } from "./application/gameApplication.js";

const elements = getElements();

const state = {
  requireLoginForApi: false,
  oauthEnabled: false,
  authenticated: false,
  user: null
};

function syncAuthButtons() {
  applyAuthButtons(elements, {
    oauthEnabled: state.oauthEnabled,
    authenticated: state.authenticated
  });
}

function syncInteractionLock() {
  const locked = state.requireLoginForApi && !state.authenticated;
  applyInteractionLock(elements, locked);

  if (locked) {
    setStatus(elements, "로그인 후 전적/랭킹 조회가 가능합니다.");
  }
}

async function refreshHealthAndAuth() {
  const healthState = await loadHealthState();
  state.requireLoginForApi = healthState.requireLoginForApi;
  state.oauthEnabled = healthState.oauthEnabled;

  try {
    const authState = await loadAuthState();
    state.authenticated = authState.authenticated;
    state.user = authState.user;

    if (state.authenticated && state.user) {
      setAuthStatus(elements, `로그인됨: ${state.user.name || state.user.sub}`);
    } else if (!state.oauthEnabled) {
      setAuthStatus(elements, "OAuth 설정이 아직 서버에 적용되지 않았습니다.", true);
    } else {
      setAuthStatus(elements, "로그인되지 않음");
    }
  } catch {
    state.authenticated = false;
    state.user = null;
    setAuthStatus(elements, "인증 상태 확인 실패", true);
  }

  syncAuthButtons();
  syncInteractionLock();
}

async function onSubmitPlayerSearch(event) {
  event.preventDefault();

  if (state.requireLoginForApi && !state.authenticated) {
    setStatus(elements, "로그인 후 조회할 수 있습니다.", true);
    return;
  }

  setStatus(elements, "플레이어 데이터 로딩 중...");
  clearPlayerPanel(elements);

  try {
    const { player, battlelog } = await loadPlayerOverview(elements.input.value);
    renderPlayer(elements, player, battlelog);
    setStatus(elements, "조회 완료");
  } catch (error) {
    setStatus(elements, error.message || "플레이어 조회 실패", true);
  }
}

async function onLoadRankings() {
  if (state.requireLoginForApi && !state.authenticated) {
    renderRankingMessage(elements, "로그인 후 랭킹 조회가 가능합니다.");
    return;
  }

  elements.rankingButton.disabled = true;
  elements.rankingButton.textContent = "불러오는 중...";
  elements.rankingList.innerHTML = "";

  try {
    const response = await loadRankings(elements.countrySelect.value);
    renderRankings(elements, response.items || []);
  } catch (error) {
    renderRankingMessage(elements, error.message || "랭킹 조회 실패");
  } finally {
    elements.rankingButton.disabled = state.requireLoginForApi && !state.authenticated;
    elements.rankingButton.textContent = "랭킹 불러오기";
  }
}

async function onLogout() {
  try {
    await logout();
    state.authenticated = false;
    state.user = null;
    clearPlayerPanel(elements);
    elements.rankingList.innerHTML = "";
    setStatus(elements, "로그아웃되었습니다.");
  } catch {
    setStatus(elements, "로그아웃 실패", true);
  }

  await refreshHealthAndAuth();
  await onLoadRankings();
}

function bindEvents() {
  elements.form.addEventListener("submit", onSubmitPlayerSearch);
  elements.rankingButton.addEventListener("click", onLoadRankings);
  elements.loginButton.addEventListener("click", startOAuthLogin);
  elements.logoutButton.addEventListener("click", onLogout);
}

async function bootstrap() {
  bindEvents();
  await refreshHealthAndAuth();

  if (!state.requireLoginForApi || state.authenticated) {
    await onLoadRankings();
  }
}

bootstrap();
