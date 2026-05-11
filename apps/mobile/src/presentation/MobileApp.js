import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import * as ExpoLinking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import {
  applyTokensFromDeepLink,
  loadAuthStatus,
  logout,
  startOAuthLogin
} from "../application/authApplication";
import {
  loadClub,
  loadClubMembers,
  loadEventRotation,
  loadHealth,
  loadPlayerOverview,
  loadRankings
} from "../application/gameApplication";
import { toCompactPlayerStats } from "../domain/playerFormatting";
import {
  getApiBaseUrl,
  getDefaultApiBaseUrl,
  hydrateRuntimeConfig,
  setApiBaseUrl
} from "../shared/config/runtimeConfig";
import { getAuthTokens } from "../shared/storage/tokenStore";
import { theme } from "./theme";

export default function MobileApp() {
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);

  const [apiBaseUrlInput, setApiBaseUrlInput] = useState("");
  const [health, setHealth] = useState({
    brawlApiTokenConfigured: false,
    oauthEnabled: false,
    requireLoginForApi: false
  });
  const [auth, setAuth] = useState({
    authenticated: false,
    user: null
  });
  const [hasStoredTokens, setHasStoredTokens] = useState(false);
  const [notice, setNotice] = useState("초기화 중...");

  const [playerTagInput, setPlayerTagInput] = useState("");
  const [playerOverview, setPlayerOverview] = useState(null);
  const [playerStatus, setPlayerStatus] = useState("플레이어 태그를 입력하세요.");

  const [rankingType, setRankingType] = useState("players");
  const [countryCode, setCountryCode] = useState("global");
  const [brawlerId, setBrawlerId] = useState("16000000");
  const [rankingItems, setRankingItems] = useState([]);
  const [rankingStatus, setRankingStatus] = useState("랭킹을 조회하세요.");

  const [clubTagInput, setClubTagInput] = useState("");
  const [clubResult, setClubResult] = useState(null);
  const [clubStatus, setClubStatus] = useState("클럽 태그를 입력하세요.");

  const [events, setEvents] = useState({ active: [], upcoming: [] });
  const [eventsStatus, setEventsStatus] = useState("이벤트 데이터를 불러오세요.");

  const lockedReason = useMemo(() => {
    if (!health.brawlApiTokenConfigured) {
      return "서버에 BRAWL_API_TOKEN이 설정되지 않았습니다.";
    }
    if (health.requireLoginForApi && !auth.authenticated) {
      return "로그인이 필요한 API 설정입니다.";
    }
    return "";
  }, [health.brawlApiTokenConfigured, health.requireLoginForApi, auth.authenticated]);

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    const subscription = ExpoLinking.addEventListener("url", (event) => {
      handleIncomingDeepLink(event.url);
    });

    ExpoLinking.getInitialURL().then((url) => {
      if (url) {
        handleIncomingDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  async function bootstrap() {
    await hydrateRuntimeConfig();
    setApiBaseUrlInput(getApiBaseUrl());
    await refreshSystemStatus();
    setBooting(false);
  }

  async function refreshSystemStatus() {
    try {
      const [healthResponse, authResponse, storedTokens] = await Promise.all([
        loadHealth(),
        loadAuthStatus().catch(() => ({ authenticated: false, user: null, oauthEnabled: false })),
        getAuthTokens()
      ]);

      setHealth({
        brawlApiTokenConfigured: Boolean(healthResponse?.brawlApiTokenConfigured),
        oauthEnabled: Boolean(healthResponse?.oauthEnabled),
        requireLoginForApi: Boolean(healthResponse?.requireLoginForApi)
      });

      setAuth({
        authenticated: Boolean(authResponse?.authenticated),
        user: authResponse?.user || null
      });

      setHasStoredTokens(Boolean(storedTokens?.accessToken));
      setNotice("서버 연결 상태를 갱신했습니다.");
    } catch {
      setNotice("서버 연결 실패. API 주소를 확인하세요.");
      setAuth({ authenticated: false, user: null });
      setHealth({
        brawlApiTokenConfigured: false,
        oauthEnabled: false,
        requireLoginForApi: false
      });
      setHasStoredTokens(false);
    }
  }

  async function handleIncomingDeepLink(url) {
    const applied = await applyTokensFromDeepLink(url);
    if (!applied) return;

    setNotice("모바일 OAuth 토큰 저장 완료");
    await refreshSystemStatus();
  }

  async function onSaveApiBaseUrl() {
    setBusy(true);
    try {
      const updated = await setApiBaseUrl(apiBaseUrlInput);
      setApiBaseUrlInput(updated);
      await refreshSystemStatus();
    } finally {
      setBusy(false);
    }
  }

  async function onResetApiBaseUrl() {
    setBusy(true);
    try {
      const updated = await setApiBaseUrl(getDefaultApiBaseUrl());
      setApiBaseUrlInput(updated);
      await refreshSystemStatus();
    } finally {
      setBusy(false);
    }
  }

  async function onLogin() {
    if (!health.oauthEnabled) {
      setNotice("서버 OAuth 설정이 아직 비활성화 상태입니다.");
      return;
    }

    try {
      await startOAuthLogin();
      setNotice("브라우저에서 로그인 진행 후 앱으로 돌아오세요.");
    } catch {
      setNotice("OAuth 로그인 시작에 실패했습니다.");
    }
  }

  async function onLogout() {
    setBusy(true);
    try {
      await logout();
      await refreshSystemStatus();
      setNotice("로그아웃되었습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function onLoadPlayer() {
    if (lockedReason) {
      setPlayerStatus(lockedReason);
      return;
    }

    if (!playerTagInput.trim()) {
      setPlayerStatus("플레이어 태그를 입력하세요.");
      return;
    }

    setPlayerStatus("플레이어 조회 중...");

    try {
      const response = await loadPlayerOverview(playerTagInput);
      setPlayerOverview(response);
      setPlayerStatus("플레이어 조회 완료");
    } catch (error) {
      setPlayerOverview(null);
      setPlayerStatus(error.message || "플레이어 조회 실패");
    }
  }

  async function onLoadRankings() {
    if (lockedReason) {
      setRankingStatus(lockedReason);
      return;
    }

    setRankingStatus("랭킹 조회 중...");

    try {
      const response = await loadRankings({
        type: rankingType,
        country: countryCode.trim() || "global",
        brawlerId: brawlerId.trim(),
        limit: 20
      });
      setRankingItems(Array.isArray(response?.items) ? response.items : []);
      setRankingStatus("랭킹 조회 완료");
    } catch (error) {
      setRankingItems([]);
      setRankingStatus(error.message || "랭킹 조회 실패");
    }
  }

  async function onLoadClub() {
    if (lockedReason) {
      setClubStatus(lockedReason);
      return;
    }

    if (!clubTagInput.trim()) {
      setClubStatus("클럽 태그를 입력하세요.");
      return;
    }

    setClubStatus("클럽 조회 중...");

    try {
      const [club, members] = await Promise.all([loadClub(clubTagInput), loadClubMembers(clubTagInput)]);

      setClubResult({ club, members: Array.isArray(members?.items) ? members.items : [] });
      setClubStatus("클럽 조회 완료");
    } catch (error) {
      setClubResult(null);
      setClubStatus(error.message || "클럽 조회 실패");
    }
  }

  async function onLoadEvents() {
    if (lockedReason) {
      setEventsStatus(lockedReason);
      return;
    }

    setEventsStatus("이벤트 조회 중...");

    try {
      const rotation = await loadEventRotation();
      setEvents({
        active: Array.isArray(rotation?.active) ? rotation.active : [],
        upcoming: Array.isArray(rotation?.upcoming) ? rotation.upcoming : []
      });
      setEventsStatus("이벤트 조회 완료");
    } catch (error) {
      setEvents({ active: [], upcoming: [] });
      setEventsStatus(error.message || "이벤트 조회 실패");
    }
  }

  if (booting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loaderText}>BrawlGG Mobile 준비 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const compact = playerOverview ? toCompactPlayerStats(playerOverview) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.badge}>BRAWL STARS MOBILE</Text>
          <Text style={styles.title}>BrawlGG App</Text>
          <Text style={styles.subtitle}>실제 출시용 모바일 앱 베이스 (Expo + RN)</Text>
        </View>

        <Card title="연결/인증 상태">
          <Text style={styles.statusText}>{notice}</Text>
          <StatRow label="API Base URL" value={getApiBaseUrl()} />
          <StatRow
            label="서버 API 토큰"
            value={health.brawlApiTokenConfigured ? "설정됨" : "미설정"}
          />
          <StatRow label="OAuth" value={health.oauthEnabled ? "활성" : "비활성"} />
          <StatRow
            label="인증"
            value={auth.authenticated ? `로그인됨 (${auth.user?.name || auth.user?.sub || "user"})` : "로그인 안됨"}
          />
          <StatRow label="로컬 토큰" value={hasStoredTokens ? "저장됨" : "없음"} />

          <TextInput
            style={styles.input}
            value={apiBaseUrlInput}
            onChangeText={setApiBaseUrlInput}
            autoCapitalize="none"
            placeholder="http://127.0.0.1:3000"
            placeholderTextColor={theme.colors.textMuted}
          />
          <View style={styles.rowButtons}>
            <ActionButton label="API 주소 저장" onPress={onSaveApiBaseUrl} disabled={busy} />
            <ActionButton label="기본값 복원" onPress={onResetApiBaseUrl} ghost disabled={busy} />
          </View>
          <View style={styles.rowButtons}>
            <ActionButton label="OAuth 로그인" onPress={onLogin} disabled={busy || !health.oauthEnabled} />
            <ActionButton label="로그아웃" onPress={onLogout} ghost disabled={busy} />
          </View>
        </Card>

        <Card title="플레이어 검색">
          <TextInput
            style={styles.input}
            value={playerTagInput}
            onChangeText={setPlayerTagInput}
            autoCapitalize="characters"
            placeholder="#2PP"
            placeholderTextColor={theme.colors.textMuted}
          />
          <ActionButton label="플레이어 조회" onPress={onLoadPlayer} />
          <Text style={styles.statusText}>{playerStatus}</Text>

          {compact ? (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>{compact.player?.name || "Unknown"}</Text>
              <Text style={styles.resultTag}>{compact.player?.tag || "-"}</Text>
              <StatRow label="트로피" value={compact.player?.trophies ?? "-"} />
              <StatRow label="최고 트로피" value={compact.player?.highestTrophies ?? "-"} />
              <StatRow label="최근 승률" value={`${compact.insights?.winRate ?? 0}%`} />
              <StatRow
                label="최근 전적"
                value={`${compact.insights?.wins ?? 0}승 ${compact.insights?.losses ?? 0}패`}
              />
              <Text style={styles.groupTitle}>최근 배틀로그</Text>
              {(compact.battlelogItems || []).map((battle, index) => (
                <Text key={`${battle.time}-${index}`} style={styles.listItemText}>
                  {battle.mode} | {battle.result} | {battle.map}
                </Text>
              ))}
            </View>
          ) : null}
        </Card>

        <Card title="랭킹 조회">
          <View style={styles.segmentedRow}>
            <SegmentButton label="Players" active={rankingType === "players"} onPress={() => setRankingType("players")} />
            <SegmentButton label="Clubs" active={rankingType === "clubs"} onPress={() => setRankingType("clubs")} />
            <SegmentButton label="Brawlers" active={rankingType === "brawlers"} onPress={() => setRankingType("brawlers")} />
          </View>

          <TextInput
            style={styles.input}
            value={countryCode}
            onChangeText={setCountryCode}
            autoCapitalize="none"
            placeholder="global / kr / us"
            placeholderTextColor={theme.colors.textMuted}
          />

          {rankingType === "brawlers" ? (
            <TextInput
              style={styles.input}
              value={brawlerId}
              onChangeText={setBrawlerId}
              keyboardType="numeric"
              placeholder="brawlerId (예: 16000000)"
              placeholderTextColor={theme.colors.textMuted}
            />
          ) : null}

          <ActionButton label="랭킹 불러오기" onPress={onLoadRankings} />
          <Text style={styles.statusText}>{rankingStatus}</Text>

          <View style={styles.resultCard}>
            {rankingItems.slice(0, 20).map((item, index) => (
              <Text key={`${item.tag || item.name || index}-${index}`} style={styles.listItemText}>
                {index + 1}. {item.name || "-"} | {item.trophies ?? "-"} trophies
              </Text>
            ))}
          </View>
        </Card>

        <Card title="클럽 조회">
          <TextInput
            style={styles.input}
            value={clubTagInput}
            onChangeText={setClubTagInput}
            autoCapitalize="characters"
            placeholder="#YQ0L8C"
            placeholderTextColor={theme.colors.textMuted}
          />
          <ActionButton label="클럽 불러오기" onPress={onLoadClub} />
          <Text style={styles.statusText}>{clubStatus}</Text>

          {clubResult ? (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>{clubResult.club?.name || "Unknown Club"}</Text>
              <Text style={styles.resultTag}>{clubResult.club?.tag || "-"}</Text>
              <StatRow label="클럽 점수" value={clubResult.club?.trophies ?? "-"} />
              <StatRow label="멤버 수" value={clubResult.members.length} />
              <Text style={styles.groupTitle}>멤버 미리보기</Text>
              {clubResult.members.slice(0, 10).map((member, index) => (
                <Text key={`${member.tag || member.name || index}-${index}`} style={styles.listItemText}>
                  {member.name || "-"} | {member.trophies ?? "-"} trophies
                </Text>
              ))}
            </View>
          ) : null}
        </Card>

        <Card title="이벤트 로테이션">
          <ActionButton label="이벤트 불러오기" onPress={onLoadEvents} />
          <Text style={styles.statusText}>{eventsStatus}</Text>
          <View style={styles.resultCard}>
            <Text style={styles.groupTitle}>LIVE</Text>
            {events.active.slice(0, 8).map((item, index) => {
              const event = item.event || item;
              return (
                <Text key={`active-${event.id || index}-${index}`} style={styles.listItemText}>
                  {event.mode || "unknown"} | {event.map || "Unknown Map"}
                </Text>
              );
            })}

            <Text style={styles.groupTitle}>UPCOMING</Text>
            {events.upcoming.slice(0, 8).map((item, index) => {
              const event = item.event || item;
              return (
                <Text key={`upcoming-${event.id || index}-${index}`} style={styles.listItemText}>
                  {event.mode || "unknown"} | {event.map || "Unknown Map"}
                </Text>
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatRow({ label, value }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{String(value ?? "-")}</Text>
    </View>
  );
}

function ActionButton({ label, onPress, disabled = false, ghost = false }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        ghost ? styles.buttonGhost : null,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, ghost ? styles.buttonGhostText : null]}>{label}</Text>
    </Pressable>
  );
}

function SegmentButton({ label, active, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.segment,
        active ? styles.segmentActive : null,
        pressed ? styles.segmentPressed : null
      ]}
      onPress={onPress}
    >
      <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  container: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: 40
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm
  },
  loaderText: {
    color: theme.colors.textMuted,
    fontSize: 15
  },
  header: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs
  },
  badge: {
    color: theme.colors.textMuted,
    letterSpacing: 1,
    fontSize: 12,
    fontWeight: "600"
  },
  title: {
    marginTop: 6,
    color: theme.colors.textMain,
    fontWeight: "700",
    fontSize: 32
  },
  subtitle: {
    marginTop: 4,
    color: theme.colors.textMuted,
    fontSize: 14
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: theme.spacing.md,
    gap: theme.spacing.sm
  },
  cardTitle: {
    color: theme.colors.textMain,
    fontSize: 18,
    fontWeight: "700"
  },
  statusText: {
    color: theme.colors.textMuted,
    fontSize: 13
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 13
  },
  statValue: {
    color: theme.colors.textMain,
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right"
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.cardSoft,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: theme.colors.textMain,
    fontSize: 14
  },
  rowButtons: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    flexWrap: "wrap"
  },
  button: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 11
  },
  buttonGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  buttonDisabled: {
    opacity: 0.45
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }]
  },
  buttonText: {
    color: "#142746",
    fontWeight: "700",
    fontSize: 13
  },
  buttonGhostText: {
    color: theme.colors.textMain
  },
  segmentedRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  segment: {
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "transparent"
  },
  segmentActive: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accentSoft
  },
  segmentPressed: {
    opacity: 0.8
  },
  segmentText: {
    color: theme.colors.textMain,
    fontSize: 12,
    fontWeight: "700"
  },
  segmentTextActive: {
    color: "#0b1f39"
  },
  resultCard: {
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSoft,
    padding: theme.spacing.sm,
    gap: 6
  },
  resultTitle: {
    color: theme.colors.textMain,
    fontSize: 16,
    fontWeight: "700"
  },
  resultTag: {
    color: theme.colors.accentSoft,
    fontSize: 13,
    fontWeight: "600"
  },
  groupTitle: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4
  },
  listItemText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18
  }
});
