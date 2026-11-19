import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  answer,
  createProgress,
  createProgressStore,
  markListened,
  markSpoken,
  readTranscript,
  storageKey,
} from '../src/lib/progress.ts';

test('wrong answers twice leave one review item', () => {
  let p = createProgress('lesson-1');
  p = answer(p, 'ex-1', false);
  p = answer(p, 'ex-1', false);
  assert.deepEqual(p.review, ['ex-1']);
});

test('correct answer removes the item from review and records it as done', () => {
  let p = answer(createProgress('lesson-1'), 'ex-1', false);
  p = answer(p, 'ex-1', true);
  assert.deepEqual(p.review, []);
  assert.deepEqual(p.done, ['ex-1']);
});

test('reading the transcript does not mark listening complete', () => {
  const p = createProgress('lesson-1');
  assert.equal(readTranscript(p).listened, false);
  assert.equal(markListened(p).listened, true);
});

test('spoke defaults to false and is independent of listened', () => {
  const p = createProgress('lesson-1');
  assert.equal(p.spoke, false);
  assert.deepEqual(markSpoken(p), { ...p, spoke: true });
  assert.equal(markSpoken(p).listened, false);
  assert.equal(markListened(p).spoke, false);
});

test('spoke persists; legacy data without spoke restores with spoke false', () => {
  const data = new Map<string, string>();
  const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
  const spoken = markSpoken(createProgress('lesson-1'));
  createProgressStore(() => storage).save(spoken);
  assert.deepEqual(createProgressStore(() => storage).load('lesson-1'), spoken);

  data.set(storageKey('lesson-1'), '{"lessonId":"lesson-1","listened":true,"review":["ex-1"],"done":["ex-2"]}');
  assert.deepEqual(createProgressStore(() => storage).load('lesson-1'), {
    lessonId: 'lesson-1', listened: true, spoke: false, review: ['ex-1'], done: ['ex-2'],
  });
});

test('storage keys are scoped per lesson', () => {
  assert.notEqual(storageKey('a'), storageKey('b'));
});

test('state round-trips through storage', () => {
  const data = new Map<string, string>();
  const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
  const p = answer(createProgress('lesson-1'), 'ex-1', false);
  createProgressStore(() => storage).save(p);
  assert.deepEqual(createProgressStore(() => storage).load('lesson-1'), p);
});

test('throwing getter, getItem and setItem keep the session state', () => {
  const p = answer(createProgress('lesson-1'), 'ex-1', false);
  const boom = () => { throw new Error('blocked'); };
  const getters = [
    boom,
    () => ({ getItem: boom, setItem: boom }),
  ];
  for (const getStorage of getters) {
    const store = createProgressStore(getStorage);
    store.save(p);
    assert.deepEqual(store.load('lesson-1'), p);
  }
});

test('session state wins over an older stored value when setItem throws', () => {
  const old = answer(createProgress('lesson-1'), 'ex-1', false);
  const newer = answer(old, 'ex-2', false);
  const storage = {
    getItem: () => JSON.stringify(old),
    setItem: () => { throw new Error('quota'); },
  };
  const store = createProgressStore(() => storage);
  assert.deepEqual(store.load('lesson-1'), old);
  store.save(newer);
  assert.deepEqual(store.load('lesson-1'), newer);
});

test('save returns whether the write was persisted', () => {
  const p = createProgress('lesson-1');
  const boom = () => { throw new Error('blocked'); };
  const ok = { getItem: () => null, setItem: () => {} };
  assert.equal(createProgressStore(() => ok).save(p), true);
  assert.equal(createProgressStore(() => undefined).save(p), false);
  assert.equal(createProgressStore(boom).save(p), false);
  assert.equal(createProgressStore(() => ({ getItem: () => null, setItem: boom })).save(p), false);
});

test('invalid saved data is ignored', () => {
  const bad = [
    'not json',
    '{"lessonId":"other"}',
    '{"lessonId":"lesson-1","review":"x"}',
    'null',
    '{"lessonId":"lesson-1","listened":false,"spoke":"yes","review":[],"done":[]}',
    '{"lessonId":"lesson-1","listened":true,"spoke":null,"review":[],"done":[]}',
  ];
  for (const raw of bad) {
    const store = createProgressStore(() => ({ getItem: () => raw, setItem: () => {} }));
    assert.deepEqual(store.load('lesson-1'), createProgress('lesson-1'));
  }
});
