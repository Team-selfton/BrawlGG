import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const API_BASE_URL_KEY = "brawlgg_mobile_api_base_url";
const FALLBACK_API_BASE_URL = "http://127.0.0.1:3000";

let runtimeApiBaseUrl = normalizeApiBaseUrl(readDefaultApiBaseUrl());
let initialized = false;

function readDefaultApiBaseUrl() {
  const extra = Constants.expoConfig?.extra || {};
  return extra.apiBaseUrl || FALLBACK_API_BASE_URL;
}

function normalizeApiBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return FALLBACK_API_BASE_URL;

  return raw.replace(/\/+$/, "");
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
