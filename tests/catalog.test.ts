import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadCatalog } from '../src/lib/catalog.ts';

const config = {
  url: 'https://example.supabase.co',
  publishableKey: 'sb_publishable_test-key',
};

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test('reads only published lesson metadata with the ordered public contract', async () => {
  let requestedUrl = '';
  let requestedOptions: RequestInit | undefined;
  const lessons = [{ slug: 'greeting', title: 'Greetings', summary: 'Everyday words', region: 'Bình Liêu' }];
  const result = await loadCatalog(config, async (input, init) => {
    requestedUrl = String(input);
    requestedOptions = init;
    return response(lessons);
  });

  assert.deepEqual(result, { state: 'ready', lessons });
  assert.equal(requestedUrl, 'https://example.supabase.co/rest/v1/published_lessons?select=slug%2Ctitle%2Csummary%2Cregion&order=position.asc%2Cslug.asc');
  assert.deepEqual(requestedOptions?.headers, { apikey: config.publishableKey });
  assert.equal(requestedOptions?.cache, 'no-store');
  assert.ok(requestedOptions?.signal);
});

test('distinguishes an empty catalog from malformed data and request failures', async () => {
  assert.deepEqual(await loadCatalog(config, async () => response([])), { state: 'empty', lessons: [] });
  assert.deepEqual(await loadCatalog(config, async () => response([{ slug: 'x' }])), { state: 'unavailable' });
  assert.deepEqual(await loadCatalog(config, async () => response({}, 503)), { state: 'unavailable' });
  assert.deepEqual(await loadCatalog(config, async () => { throw new Error('offline'); }), { state: 'unavailable' });
});

test('refuses missing configuration and non-publishable key types without requesting', async () => {
  let called = false;
  const request = async () => { called = true; return response([]); };
  assert.deepEqual(await loadCatalog({ url: '', publishableKey: config.publishableKey }, request), { state: 'unavailable' });
  assert.deepEqual(await loadCatalog({ url: config.url, publishableKey: 'eyJhbGciOiJIUzI1NiJ9.legacy-anon' }, request), { state: 'unavailable' });
  assert.deepEqual(await loadCatalog({ url: config.url, publishableKey: 'service_role_secret' }, request), { state: 'unavailable' });
  assert.equal(called, false);
});
