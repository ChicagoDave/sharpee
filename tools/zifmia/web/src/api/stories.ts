/**
 * @module zifmia/web/api/stories
 * @purpose Typed wrapper around `GET /stories` — public list of
 *   active stories used to populate the lobby's room-creation
 *   dropdown.
 * @owner Zifmia web client.
 */

import { requestJson, type HttpClientOptions } from './http';
import type { ApiResult, StoriesResponse } from './types';

/** `GET /stories` — public; returns active stories at their most
 * recent installed version (one row per storyId). */
export function listStories(
  options: HttpClientOptions = {}
): Promise<ApiResult<StoriesResponse>> {
  return requestJson<StoriesResponse>('/stories', { method: 'GET' }, options);
}
