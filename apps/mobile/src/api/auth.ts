import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL_KEY = "api_base_url";
const AUTH_TOKEN_KEY = "auth_token";

const DEFAULT_BASE_URL = "http://10.0.2.2:3001"; // Android emulator -> host

let cachedBaseUrl: string | null = null;
let cachedToken: string | null = null;

export async function getBaseUrl(): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl;
  const stored = await AsyncStorage.getItem(BASE_URL_KEY);
  cachedBaseUrl = stored || DEFAULT_BASE_URL;
  return cachedBaseUrl;
}

export async function setBaseUrl(url: string): Promise<void> {
  cachedBaseUrl = url;
  await AsyncStorage.setItem(BASE_URL_KEY, url);
}

export async function getAuthToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  const stored = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  cachedToken = stored || "";
  return cachedToken;
}

export async function setAuthToken(token: string): Promise<void> {
  cachedToken = token;
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return token.length > 0;
}
