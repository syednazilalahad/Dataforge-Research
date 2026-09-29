import { describe, it, expect } from 'vitest';
import { emptyProject, emptyPaper, projectSchema, graph, changeImpact, health, roadmap } from '../src/lib/domain';
describe('Research integrity', () => {
  it('ignores JSON object key order when computing change impact', () => {
    const p = emptyProject('Test', 'quantitative');
    const reordered = JSON.parse(JSON.stringify(p, Object.keys(p).concat(Object.keys(p.methodology)).reverse()));
    expect(changeImpact(p, reordered)).toEqual({
      changed: [],
      impacted: []
    });
  });
  it('rejects dangling references and globally duplicate IDs', () => {
    const p = emptyProject('Test', 'quantitative');
    p.objectives = [{
      id: 'a',
      text: 'Investigate',
      questionId: 'missing'
    }];
    expect(projectSchema.safeParse(p).success).toBe(false);
    p.questions = [{
      id: 'a',
      text: 'Why?'
    }];
    p.objectives[0].questionId = 'a';
    expect(projectSchema.safeParse(p).success).toBe(false);
  });
  it('traces downstream dependencies without looping', () => {
    const p = emptyProject('Test', 'quantitative');
    p.questions = [{
      id: 'q',
      text: 'Old question'
    }];
    p.objectives = [{
      id: 'o',
      text: 'Objective',
      questionId: 'q'
    }];
    const changed = structuredClone(p);
    changed.questions[0].text = 'New question';
    expect(changeImpact(p, changed)).toEqual({
      changed: ['q'],
      impacted: ['o', 'methodology']
    });
    expect(graph(changed).edges).toContainEqual({
      source: 'q',
      target: 'o',
      relation: 'answers'
    });
  });
  it('flags removed question dependencies', () => {
    const p = emptyProject('Test', 'quantitative');
    p.questions = [{
      id: 'q',
      text: 'Question'
    }];
    p.objectives = [{
      id: 'o',
      text: 'Objective',
      questionId: 'q'
    }];
    const after = structuredClone(p);
    after.questions = [];
    after.objectives[0].questionId = '';
    expect(changeImpact(p, after).impacted).toContain('methodology');
  });
  it('requires review criteria instead of participant sampling for reviews', () => {
    const p = emptyProject('Review', 'systematic_review');
    const ids = health(p).map(f => f.id);
    expect(ids).toContain('review-protocol');
    expect(ids).not.toContain('sampling');
    expect(roadmap(p)[3].label).toContain('review protocol');
  });
  it('uses ML validation and mixed-method integration rules', () => {
    expect(health(emptyProject('ML', 'machine_learning')).map(f => f.id)).toContain('ml-validation');
    expect(health(emptyProject('Mixed', 'mixed_methods')).map(f => f.id)).toContain('integration');
  });
  it('never marks manual DOI entry as verified', () => {
    const p = emptyProject('Test', 'quantitative');
    p.papers = [{
      ...emptyPaper('p'),
      doi: '10.1234/fake'
    }];
    expect(health(p).some(f => f.id === 'citations')).toBe(true);
    expect(projectSchema.safeParse({
      ...p,
      papers: [{
        ...p.papers[0],
        verification: 'verified'
      }]
    }).success).toBe(false);
  });
  it('treats unsupported ethics risk as critical', () => {
    const p = emptyProject('Test', 'qualitative');
    p.methodology.humanParticipants = true;
    expect(health(p).find(f => f.id === 'ethics-risk')?.severity).toBe('critical');
  });
  it('does not count empty questions as roadmap completion', () => {
    const p = emptyProject('Test', 'quantitative');
    p.questions = [{
      id: 'q',
      text: ''
    }];
    p.objectives = [{
      id: 'o',
      text: 'Objective',
      questionId: 'q'
    }];
    expect(roadmap(p)[1].done).toBe(false);
  });
});
