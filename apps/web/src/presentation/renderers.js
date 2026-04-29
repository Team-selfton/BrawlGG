import { toBattleViewModel } from "../domain/playerFormatting.js";

export function setStatus(elements, message, isError = false) {
  elements.statusText.textContent = message;
  elements.statusText.classList.toggle("error", isError);
}

export function setAuthStatus(elements, message, isError = false) {
  elements.authStatus.textContent = message;
  elements.authStatus.classList.toggle("error", isError);
}

export function applyInteractionLock(elements, locked) {
  elements.input.disabled = locked;
  elements.searchButton.disabled = locked;
  elements.rankingButton.disabled = locked;
  elements.countrySelect.disabled = locked;
}

export function applyAuthButtons(elements, { oauthEnabled, authenticated }) {
  elements.loginButton.disabled = !oauthEnabled || authenticated;
  elements.logoutButton.disabled = !authenticated;
}

export function renderPlayer(elements, player, battlelog) {
  const battleItems = (battlelog.items || [])
    .slice(0, 8)
    .map(toBattleViewModel)
    .map(
      (battle) => `
      <div class="battle-item">
        <strong>${battle.mode}</strong> • 결과: ${battle.result}
        <p>${battle.map}</p>
        <p>${battle.time}</p>
      </div>
    `
    )
    .join("");

  elements.playerPanel.innerHTML = `
    <article class="player-summary">
      <div class="summary-head">
        <h3>${player.name || "Unknown Player"}</h3>
        <span class="tag">${player.tag || "-"}</span>
      </div>
      <div class="stats-grid">
        ${renderStat("트로피", player.trophies)}
        ${renderStat("최고 트로피", player.highestTrophies)}
        ${renderStat("레벨", player.expLevel)}
        ${renderStat("승리(3v3)", player["3vs3Victories"])}
        ${renderStat("솔로 승리", player.soloVictories)}
        ${renderStat("듀오 승리", player.duoVictories)}
      </div>
      <div class="battle-list">
        ${battleItems || "<p>최근 전투기록이 없습니다.</p>"}
      </div>
    </article>
  `;
}

export function clearPlayerPanel(elements) {
  elements.playerPanel.innerHTML = "";
}

export function renderRankings(elements, items) {
  if (!items.length) {
    elements.rankingList.innerHTML = "<li>랭킹 데이터가 없습니다.</li>";
    return;
  }

  elements.rankingList.innerHTML = items
    .map(
      (item) =>
        `<li><span class="name">${item.name}</span> <span>${item.trophies} trophies</span></li>`
    )
    .join("");
}

export function renderRankingMessage(elements, message) {
  elements.rankingList.innerHTML = `<li>${message}</li>`;
}

function renderStat(label, value) {
  return `
    <div class="stat">
      <p>${label}</p>
      <p>${value ?? "-"}</p>
    </div>
  `;
}
