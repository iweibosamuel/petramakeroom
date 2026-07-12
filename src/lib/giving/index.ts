import { isSupabaseConfigured } from "../supabaseClient";
import type { DataStore } from "./dataStore";
import { LocalDataStore } from "./localDataStore";
import { SupabaseDataStore } from "./supabaseDataStore";

export const DEFAULT_CAMPAIGN_ID = "make-room-2026";

export const dataStore: DataStore = isSupabaseConfigured
  ? new SupabaseDataStore()
  : new LocalDataStore();

export * from "./types";
export * from "./dataStore";
export { getLocalOutbox } from "./email";
