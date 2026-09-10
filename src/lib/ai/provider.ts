import "server-only";

import { AnthropicAiProvider } from "./anthropic-provider";
import { NoopAiProvider } from "./noop-provider";
import type { AiProvider } from "./types";

let cached: AiProvider | null = null;

/**
 * The single entry point the rest of the app should import. Swaps
 * transparently between a real Claude-backed provider and a no-op based on
 * whether ANTHROPIC_API_KEY is set — every caller already handles the
 * `{available: false}` shape, so no caller needs to know which one is active.
 */
export function getAiProvider(): AiProvider {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  cached = apiKey ? new AnthropicAiProvider(apiKey) : new NoopAiProvider();
  return cached;
}
