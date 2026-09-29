// Dependency-free smoke checks for the pure engine section. This does not replace
// the schema, database, browser, or full TypeScript tests after installation.
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import assert from 'node:assert/strict';
const source=await readFile(new URL('../src/lib/domain.ts',import.meta.url),'utf8');
const pure=source.slice(source.indexOf('export function emptyProject'));
const compiled=stripTypeScriptTypes(pure,{mode:'strip'});
const domain=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const {emptyProject,emptyPaper,graph,changeImpact,health,roadmap,stableStringify}=domain;
let checks=0;
function check(name,fn){fn();checks++;console.log(`PASS ${name}`);}
check('empty planning state raises actionable critical findings',()=>{const findings=health(emptyProject('Study','quantitative'));assert(findings.some(f=>f.id==='questions'&&f.severity==='critical'));assert(findings.some(f=>f.id==='design'&&f.severity==='critical'));});
check('question change reaches objective and methodology',()=>{const p=emptyProject('Study','quantitative');p.questions=[{id:'q',text:'Before'}];p.objectives=[{id:'o',text:'Objective',questionId:'q'}];const after=structuredClone(p);after.questions[0].text='After';assert.deepEqual(changeImpact(p,after),{changed:['q'],impacted:['o','methodology']});});
check('object key order is not a research change',()=>{const p=emptyProject('Study','quantitative');const sorted=JSON.parse(stableStringify(p));assert.deepEqual(changeImpact(p,sorted),{changed:[],impacted:[]});});
check('removed question leaves methodology review impact',()=>{const p=emptyProject('Study','qualitative');p.questions=[{id:'q',text:'Before'}];p.objectives=[{id:'o',text:'Objective',questionId:'q'}];const after=structuredClone(p);after.questions=[];after.objectives[0].questionId='';assert(changeImpact(p,after).impacted.includes('methodology'));});
check('systematic review adapts requirements',()=>{const p=emptyProject('Review','systematic_review');assert(health(p).some(f=>f.id==='review-protocol'));assert(!health(p).some(f=>f.id==='sampling'));assert(roadmap(p)[3].label.includes('review'));});
check('ML requires evaluation design',()=>{assert(health(emptyProject('ML','machine_learning')).some(f=>f.id==='ml-validation'));});
check('mixed methods requires integration',()=>{assert(health(emptyProject('Mixed','mixed_methods')).some(f=>f.id==='integration'));});
check('manual DOI stays unverified',()=>{const p=emptyProject('Study','quantitative');p.papers=[{...emptyPaper('paper'),doi:'10.1234/example'}];assert.equal(p.papers[0].verification,'unverified');assert(health(p).some(f=>f.id==='citations'));});
check('human participant risk requires safeguards',()=>{const p=emptyProject('Study','qualitative');p.methodology.humanParticipants=true;assert(health(p).some(f=>f.id==='ethics-risk'&&f.severity==='critical'));});
check('blank question does not complete roadmap',()=>{const p=emptyProject('Study','qualitative');p.questions=[{id:'q',text:''}];p.objectives=[{id:'o',text:'An objective',questionId:'q'}];assert.equal(roadmap(p)[1].done,false);});
check('gap evidence changes propagate',()=>{const p=emptyProject('Study','quantitative');p.papers=[emptyPaper('paper')];p.questions=[{id:'q',text:'Question'}];const after=structuredClone(p);after.gapPaperIds=['paper'];assert(changeImpact(p,after).changed.includes('gap'));assert(changeImpact(p,after).impacted.includes('q'));assert(graph(after).edges.some(e=>e.source==='paper'&&e.target==='gap'));});
check('descriptive-only predictive design raises alignment concern',()=>{const p=emptyProject('Study','quantitative');p.questions=[{id:'q',text:'Does trust predict adoption?'}];p.methodology.analysis='Descriptive statistics only';assert(health(p).some(f=>f.id==='inferential'));});
console.log(`${checks} pure-engine smoke checks passed. Full integration verification remains separate.`);
