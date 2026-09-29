import { it, expect } from 'vitest';
import { OfflineProvider, suggestionSchema, aiContext, contextHash } from '../src/lib/ai';
import { emptyProject } from '../src/lib/domain';
import { LocalObjectStorage } from '../src/lib/storage';
it('offline guidance is explicit and validates against the same output contract', async () => {
  const p = emptyProject('Title', 'qualitative');
  p.topic = 'Teaching';
  const c = aiContext(p);
  const result = await new OfflineProvider().generate(c);
  expect(suggestionSchema.safeParse(result).success).toBe(true);
  expect(result.summary).toContain('Offline');
  expect(result.suggestions[0].text).toContain('Teaching');
  expect(contextHash(c)).toHaveLength(64);
  expect(contextHash({
    ...c,
    topic: 'Other'
  })).not.toBe(contextHash(c));
});
it('rejects arbitrary model output', () => {
  expect(suggestionSchema.safeParse({
    summary: 'Claim',
    suggestions: [{
      kind: 'verified-citation',
      text: 'Fabricated'
    }]
  }).success).toBe(false);
});
it('blocks object traversal', async () => {
  const storage = new LocalObjectStorage();
  await expect(storage.get('../secrets')).rejects.toThrow('Invalid object');
  await expect(storage.get('project/../../secret')).rejects.toThrow('Invalid object');
});
