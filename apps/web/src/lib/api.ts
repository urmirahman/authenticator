import { createApiClient } from '@repo/api-client';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

// TODO: keep the access token in memory and the refresh token in an httpOnly cookie.
export const api = createApiClient({ baseUrl: API_URL });
