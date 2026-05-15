const BASE = "https://api.idle-mmo.com/v1";

// --- Types ---

export interface AuthCheck {
  authenticated: boolean;
  user: { id: number };
  character: { id: number; hashed_id: string; name: string };
  api_key: { name: string; rate_limit: number; expires_at: string | null; scopes: string[] | null };
}

export interface CharacterInfo {
  id: number;
  hashed_id: string;
  name: string;
  class: string;
  image_url: string | null;
  background_url: string | null;
  gold: number;
  tokens: number;
  shards: number;
  total_level: number;
  current_status: "ONLINE" | "IDLING" | "OFFLINE";
  location: { id: number; name: string };
  equipped_pet: { id: number; name: string; image_url: string | null; level: number } | null;
  guild: { id: number; tag: string; experience: number; level: number; position: string } | null;
  skills: Record<string, { experience: number; level: number }>;
  stats: Record<string, { experience: number; level: number }>;
  created_at: string;
}

export interface CharacterAction {
  type: string | null;
  image_url: string | null;
  title: string | null;
  expires_at: string | null;
  started_at: string | null;
}

export interface AltCharacter {
  id: number;
  hashed_id: string;
  name: string;
  class: string;
  image_url: string | null;
  total_level: number;
  created_at: string;
}

export interface CharacterEffect {
  character_id: number;
  source: string;
  target: string;
  attribute: string;
  value: number;
  value_type: string;
  location_id: number | null;
  expire_at: string | null;
}

export interface WorldBoss {
  id: number;
  name: string;
  image_url: string;
  level: number;
  location: { id: number; name: string };
  loot: Array<{ hashed_item_id: string; name: string; quality: string; quantity: number; chance: number }>;
  status: "IN_PROGRESS" | "READY_FOR_LOBBY" | "RESPAWNING";
  battle_starts_at: string | null;
  battle_ends_at: string | null;
}

export interface ShrineProgress {
  id: number;
  tier: { key: string; name: string };
  effects: Array<{ target: string; attribute: string; value: number; value_type: string }>;
  current_value: number;
  target_value: number;
  target_remaining: number;
  percentage: number;
  goal_reached_at: string | null;
  is_active: boolean;
  in_progress: boolean;
  can_activate: boolean;
}

export interface ItemDetail {
  hashed_id: string;
  name: string;
  description: string | null;
  image_url: string;
  type: string;
  quality: string;
  vendor_price: number | null;
  is_tradeable: boolean;
  max_tier: number;
  requirements: Record<string, number> | null;
  stats: Record<string, number> | null;
  effects: unknown | null;
  upgrade_requirements: unknown | null;
}

export interface MarketHistoryEntry {
  date: string;
  average_price: number;
  total_sold: number;
}

// --- Rate limiter ---

class RateLimiter {
  private timestamps: number[] = [];
  private readonly limit = 18; // stay under 20/min
  private readonly windowMs = 60_000;

  async throttle(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
    if (this.timestamps.length >= this.limit) {
      const oldest = this.timestamps[0];
      const waitMs = this.windowMs - (now - oldest) + 100;
      await new Promise((r) => setTimeout(r, waitMs));
      return this.throttle();
    }
    this.timestamps.push(Date.now());
  }
}

const limiter = new RateLimiter();

// --- Fetch wrapper ---

async function apiFetch<T>(path: string, deadlineMs = 8000): Promise<T> {
  // Race: either complete within deadlineMs or throw (catches rate-limiter hangs too)
  return Promise.race([
    apiFetchInner<T>(path),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`API timeout: ${path}`)), deadlineMs)
    ),
  ])
}

async function apiFetchInner<T>(path: string): Promise<T> {
  await limiter.throttle();

  const apiKey = process.env.IDLEMMO_API_KEY;
  if (!apiKey) throw new Error("IDLEMMO_API_KEY not set");

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "Valaron/0.1 (Contact: michalfoksa@gmail.com)",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 5000));
    return apiFetchInner<T>(path);
  }

  if (!res.ok) {
    throw new Error(`IdleMMO API ${res.status} on ${path}`);
  }

  return res.json() as Promise<T>;
}

// --- Endpoint functions ---

export async function getAuthCheck(): Promise<AuthCheck> {
  return apiFetch<AuthCheck>("/auth/check");
}

export async function getCharacterInfo(hashedId: string): Promise<CharacterInfo> {
  const data = await apiFetch<{ character: CharacterInfo }>(`/character/${hashedId}/information`);
  return data.character;
}

export async function getCharacterAction(hashedId: string): Promise<CharacterAction> {
  return apiFetch<CharacterAction>(`/character/${hashedId}/current-action`);
}

export async function getCharacterAlts(hashedId: string): Promise<AltCharacter[]> {
  const data = await apiFetch<{ characters: AltCharacter[] }>(`/character/${hashedId}/characters`);
  return data.characters;
}

export async function getCharacterEffects(hashedId: string): Promise<CharacterEffect[]> {
  const data = await apiFetch<{ effects: CharacterEffect[] }>(`/character/${hashedId}/effects`);
  return data.effects;
}

export async function getWorldBosses(): Promise<WorldBoss[]> {
  const data = await apiFetch<{ world_bosses: WorldBoss[] }>("/combat/world_bosses/list");
  return data.world_bosses;
}

export interface LocationWeather {
  name: string;
  buffs: string[];
}

export interface LocationForecast {
  starts_at: string;
  ends_at: string;
  weathers: LocationWeather[];
}

export interface WorldLocation {
  id: number;
  name: string;
  forecast?: LocationForecast[];
}

export async function getWorldLocations(): Promise<WorldLocation[]> {
  const data = await apiFetch<{ locations: WorldLocation[] }>("/world/locations/list");
  return data.locations;
}

export async function getShrineProgress(): Promise<ShrineProgress[]> {
  const data = await apiFetch<{ progress: ShrineProgress[] }>("/shrine/progress");
  return data.progress;
}

export async function searchItems(params: { query?: string; type?: string; page?: number }): Promise<{
  items: Array<{
    hashed_id: string;
    name: string;
    description: string | null;
    image_url: string;
    type: string;
    quality: string;
    vendor_price: number | null;
  }>;
  pagination: { current_page: number; last_page: number; per_page: number; total: number };
}> {
  const qs = new URLSearchParams();
  if (params.query) qs.set("query", params.query);
  if (params.type) qs.set("type", params.type);
  if (params.page) qs.set("page", String(params.page));
  return apiFetch(`/item/search?${qs}`);
}

export async function inspectItem(hashedId: string): Promise<ItemDetail> {
  const data = await apiFetch<{ item: ItemDetail }>(`/item/${hashedId}/inspect`);
  return data.item;
}

export async function getItemMarketHistory(
  hashedId: string,
  tier = 1,
  type: "listings" | "orders" = "listings"
): Promise<{ history_data: MarketHistoryEntry[]; latest_sold: unknown[] }> {
  return apiFetch(`/item/${hashedId}/market-history?tier=${tier}&type=${type}`);
}
