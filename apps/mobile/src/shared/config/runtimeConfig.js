import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const API_BASE_URL_KEY = "brawlgg_mobile_api_base_url";
const FALLBACK_API_BASE_URL = "http://127.0.0.1:3000";

let runtimeApiBaseUrl = normalizeApiBaseUrl(readDefaultApiBaseUrl());
let initialized = false;

function readDefaultApiBaseUrl() {
  const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envBaseUrl) return envBaseUrl;

  const extra = Constants.expoConfig?.extra || {};
  if (extra.apiBaseUrl) return extra.apiBaseUrl;

  const hostUri = readExpoHostUri();
  const inferredBaseUrl = inferApiBaseUrlFromHostUri(hostUri);
  if (inferredBaseUrl) return inferredBaseUrl;

  return FALLBACK_API_BASE_URL;
}

function normalizeApiBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return FALLBACK_API_BASE_URL;

  return raw.replace(/\/+$/, "");
}

function readExpoHostUri() {
  const hostCandidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.manifest2?.extra?.expoGo?.debuggerHost
  ];

  return hostCandidates.find((candidate) => typeof candidate === "string" && candidate.trim()) || "";
}

function inferApiBaseUrlFromHostUri(hostUri) {
  if (!hostUri) return "";

  const raw = String(hostUri).trim();
  let host = "";

  if (raw.includes("://")) {
    try {
      host = new URL(raw).hostname;
    } catch {
      host = "";
    }
  } else {
    host = raw.split(":")[0] || "";
  }

  host = host.trim();
  if (!host) return "";
  if (host === "127.0.0.1" || host === "localhost") return "";
  if (host.endsWith(".exp.direct")) return "";
  if (host.includes("ngrok") || host.includes("tunnel")) return "";

  return `http://${host}:3000`;
}

export async function hydrateRuntimeConfig() {
  if (initialized) {
    return runtimeApiBaseUrl;
  }

  try {
    const storedBaseUrl = await AsyncStorage.getItem(API_BASE_URL_KEY);
    if (storedBaseUrl) {
      runtimeApiBaseUrl = normalizeApiBaseUrl(storedBaseUrl);
    }
  } catch {
    runtimeApiBaseUrl = normalizeApiBaseUrl(readDefaultApiBaseUrl());
  }

  initialized = true;
  return runtimeApiBaseUrl;
}

export function getApiBaseUrl() {
  return runtimeApiBaseUrl;
}

export async function setApiBaseUrl(nextBaseUrl) {
  const normalized = normalizeApiBaseUrl(nextBaseUrl);
  runtimeApiBaseUrl = normalized;

  await AsyncStorage.setItem(API_BASE_URL_KEY, normalized);
  return normalized;
}

export function getDefaultApiBaseUrl() {
  return normalizeApiBaseUrl(readDefaultApiBaseUrl());
}
