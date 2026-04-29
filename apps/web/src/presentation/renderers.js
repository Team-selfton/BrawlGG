import { toBattleViewModel } from "../domain/playerFormatting.js";

export function setStatus(elements, message, isError = false) {
  elements.statusText.textContent = message;
  elements.statusText.classList.toggle("error", isError);
}

export function setAuthStatus(elements, message, isError = false) {
  elements.authStatus.textContent = message;
  elements.authStatus.classList.toggle("error", isError);
}

export function setMultiStatus(elements, message, isError = false) {
  elements.multiStatus.textContent = message;
  elements.multiStatus.classList.toggle("error", isError);
}

export function applyInteractionLock(elements, locked) {
  const controls = [
    elements.input,
    elements.searchButton,
    elements.rankingButton,
    elements.countrySelect,
    elements.rankingTypeSelect,
    elements.brawlerSelect,
    elements.multiInput,
    elements.multiButton
  ];

  for (const control of controls) {
    if (!control) continue;
    control.disabled = locked;
  }
}

export function applyAuthButtons(elements, { oauthEnabled, authenticated }) {
  elements.loginButton.disabled = !oauthEnabled || authenticated;
  elements.logoutButton.disabled = !authenticated;
}

export function setBrawlerFilterVisibility(elements, visible) {
  if (!elements.brawlerSelect) return;
  elements.brawlerSelect.classList.toggle("hidden", !visible);
}

export function renderPlayer(elements, overview) {
  const player = overview.player || {};
  const battlelog = overview.battlelog || { items: [] };
  const insights = overview.insights || {};
  const topBrawlers = overview.topBrawlers || [];

  const battleItems = (battlelog.items || [])
    .slice(0, 8)
    .map(toBattleViewModel)
    .map(
      (battle) => `
      <div class="battle-item">
        <strong>${safeText(battle.mode)}</strong> • 결과: ${safeText(battle.result)}
        <p>${safeText(battle.map)}</p>
        <p>${safeText(battle.time)}</p>
      </div>
    `
    )
    .join("");

  const brawlerItems = topBrawlers
    .slice(0, 8)
    .map(
      (brawler) => `
      <li>
        <span class="name">${safeText(brawler.name || "-")}</span>
        <span>${safeText(String(brawler.trophies ?? "-"))} trophies / P${safeText(
          String(brawler.power ?? "-")
        )}</span>
      </li>
    `
    )
    .join("");

  elements.playerPanel.innerHTML = `
    <article class="player-summary">
      <div class="summary-head">
        <h3>${safeText(player.name || "Unknown Player")}</h3>
        <span class="tag">${safeText(player.tag || "-")}</span>
      </div>
      <div class="stats-grid">
        ${renderStat("트로피", player.trophies)}
        ${renderStat("최고 트로피", player.highestTrophies)}
        ${renderStat("레벨", player.expLevel)}
        ${renderStat("승리(3v3)", player["3vs3Victories"])}
        ${renderStat("솔로 승리", player.soloVictories)}
        ${renderStat("듀오 승리", player.duoVictories)}
      </div>
      <div class="insight-grid">
        ${renderStat("최근 승률", `${insights.winRate ?? 0}%`)}
        ${renderStat("최근 전적", `${insights.wins ?? 0}승 ${insights.losses ?? 0}패`)}
        ${renderStat("트로피 변화", insights.trophyDelta ?? 0)}
        ${renderStat("자주 한 모드", insights.mostPlayedMode || "-")}
      </div>
      <div class="sub-panel">
        <h4>주력 브롤러 (Top 8)</h4>
        <ul class="compact-list">
          ${brawlerItems || "<li>브롤러 정보가 없습니다.</li>"}
        </ul>
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

export function renderRankings(elements, items, rankingType) {
  if (!items.length) {
    elements.rankingList.innerHTML = "<li>랭킹 데이터가 없습니다.</li>";
    return;
  }

  if (rankingType === "clubs") {
    elements.rankingList.innerHTML = items
      .map(
        (item) => `
          <li>
            <span class="name">${safeText(item.name || "-")}</span>
            <span>${safeText(String(item.trophies ?? "-"))} trophies • 멤버 ${safeText(
              String(item.memberCount ?? "-")
            )}</span>
          </li>
        `
      )
      .join("");
    return;
  }

  if (rankingType === "brawlers") {
    elements.rankingList.innerHTML = items
      .map(
        (item) => `
          <li>
            <span class="name">${safeText(item.name || "-")}</span>
            <span>${safeText(String(item.trophies ?? "-"))} trophies • ${safeText(item.tag || "-")}</span>
          </li>
        `
      )
      .join("");
    return;
  }

  elements.rankingList.innerHTML = items
    .map(
      (item) => `
        <li>
          <span class="name">${safeText(item.name || "-")}</span>
          <span>${safeText(String(item.trophies ?? "-"))} trophies</span>
        </li>
      `
    )
    .join("");
}

export function renderRankingMessage(elements, message) {
  elements.rankingList.innerHTML = `<li>${safeText(message)}</li>`;
}

export function renderBrawlerOptions(elements, brawlers, selectedId = "") {
  const safeList = Array.isArray(brawlers) ? brawlers : [];
  const selected = String(selectedId || safeList[0]?.id || "");

  elements.brawlerSelect.innerHTML = safeList
    .map((brawler) => {
      const id = String(brawler.id || "");
      const name = safeText(brawler.name || `Brawler ${id}`);
      const isSelected = id === selected ? " selected" : "";

      return `<option value="${id}"${isSelected}>${name}</option>`;
    })
    .join("");
}

export function renderMultiResults(elements, payload) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) {
    elements.multiList.innerHTML = "<li>결과가 없습니다.</li>";
    return;
  }

  elements.multiList.innerHTML = items
    .map((item) => {
      if (!item.ok) {
        return `
          <li class="multi-item error-item">
            <div>
              <strong>${safeText(item.tag || "-")}</strong>
              <p>${safeText(item.error?.message || "조회 실패")}</p>
            </div>
          </li>
        `;
      }

      return `
        <li class="multi-item">
          <div class="multi-head">
            <strong>${safeText(item.player?.name || "-")}</strong>
            <span class="tag">${safeText(item.player?.tag || item.tag || "-")}</span>
          </div>
          <p>트로피 ${safeText(String(item.player?.trophies ?? "-"))} / 최고 ${safeText(
            String(item.player?.highestTrophies ?? "-")
          )}</p>
          <p>최근 승률 ${safeText(String(item.insights?.winRate ?? 0))}% (${safeText(
            String(item.insights?.wins ?? 0)
          )}승 ${safeText(String(item.insights?.losses ?? 0))}패)</p>
        </li>
      `;
    })
    .join("");
}

function renderStat(label, value) {
  return `
    <div class="stat">
      <p>${safeText(label)}</p>
      <p>${safeText(String(value ?? "-"))}</p>
    </div>
  `;
}

function safeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
