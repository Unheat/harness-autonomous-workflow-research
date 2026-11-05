import { describe, test, expect } from 'bun:test';
import MiniSearch from 'minisearch';

describe('MiniSearch 3-Tier Search Engine', () => {
  const tools = [
    {
      id: 'impeccable',
      name: 'impeccable',
      description: 'Design and visual craft QA steering for typography, layout, and hierarchy.'
    },
    {
      id: 'speckit-specify',
      name: 'speckit-specify',
      description: 'Create or update the feature specification from a natural language feature description.'
    },
    {
      id: 'speckit-plan',
      name: 'speckit-plan',
      description: 'Execute the implementation planning workflow using the plan template.'
    },
    {
      id: 'speckit-tasks',
      name: 'speckit-tasks',
      description: 'Generate an actionable dependency-ordered task list for feature implementation.'
    },
    {
      id: 'rea',
      name: 'rea',
      description: 'Reverse engineering & binary disassembly toolkit.'
    },
    {
      id: 'hound',
      name: 'hound',
      description: 'Fast regex and keyword code search engine.'
    }
  ];

  const searchIndex = new MiniSearch({
    fields: ['name', 'description'],
    storeFields: ['name'],
    searchOptions: {
      boost: { name: 10, description: 3 },
      prefix: true,
      fuzzy: 0.2
    }
  });
  searchIndex.addAll(tools);

  test('Tier 1: Prefix matching on tool name (Boost x10)', () => {
    const results = searchIndex.search('spec');
    expect(results.length).toBeGreaterThanOrEqual(3);
    const topResults = results.slice(0, 3).map(r => r.id);
    expect(topResults).toContain('speckit-specify');
    expect(topResults).toContain('speckit-plan');
    expect(topResults).toContain('speckit-tasks');
  });

  test('Tier 2: Capability keyword retrieval from description (Boost x3)', () => {
    // "design" is not in the slug "impeccable", but is in its description
    const results = searchIndex.search('design');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].id).toBe('impeccable');

    // "disassembly" or "reverse" matches "rea"
    const reaResults = searchIndex.search('disassembly');
    expect(reaResults.length).toBeGreaterThanOrEqual(1);
    expect(reaResults[0].id).toBe('rea');
  });

  test('Tier 3: Typo tolerance via Levenshtein fuzzy search', () => {
    // Typo: "spekit" instead of "speckit"
    const results = searchIndex.search('spekit');
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map(r => r.id);
    expect(ids.some(id => id.startsWith('speckit'))).toBe(true);
  });
});
