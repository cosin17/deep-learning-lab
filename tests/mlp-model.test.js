const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../assets/lab/mlp-model');
const N = require('../assets/lab/network-model');
const near = (a,b,eps=1e-7) => assert.ok(Math.abs(a-b)<eps, a+' ≉ '+b);
const clone = x => JSON.parse(JSON.stringify(x));

test('all 17 MLP analytic gradients match central finite differences', () => {
  const p=M.create(), samples=M.dataset(), g=M.gradients(p,samples).gradient;
  const paths=[...p.w1.flatMap((row,i)=>row.map((_,j)=>['w1',i,j])), ...p.b1.map((_,j)=>['b1',j]), ...p.w2.map((_,j)=>['w2',j]), ['b2']];
  for(const keys of paths){
    const plus=clone(p),minus=clone(p),parent=x=>keys.slice(0,-1).reduce((v,k)=>v[k],x),last=keys.at(-1),epsilon=1e-5;
    parent(plus)[last]+=epsilon;parent(minus)[last]-=epsilon;
    near((M.gradients(plus,samples).loss-M.gradients(minus,samples).loss)/(2*epsilon),keys.reduce((v,k)=>v[k],g));
  }
});
test('one SGD step changes every parameter using the same old gradients without mutating input',()=>{
  const p=M.create(),before=clone(p),samples=M.dataset(),g=M.gradients(p,samples).gradient,next=M.step(p,samples,.3);
  assert.deepEqual(p,before);near(next.parameters.w1[0][2],p.w1[0][2]-.3*g.w1[0][2]);near(next.parameters.b1[3],p.b1[3]-.3*g.b1[3]);near(next.parameters.w2[0],p.w2[0]-.3*g.w2[0]);near(next.parameters.b2,p.b2-.3*g.b2);assert.ok(next.loss<next.beforeLoss);
});
test('seeded MLP learns both 16-point training sets with decreasing final BCE',()=>{
  assert.deepEqual(M.create(42),M.create(42));assert.notDeepEqual(M.create(1),M.create(42));
  for(const name of ['xor','linear']) {let p=M.create(),samples=M.dataset(name),initial=M.gradients(p,samples).loss;for(let i=0;i<600;i++)p=M.step(p,samples,.3).parameters;assert.ok(M.gradients(p,samples).loss<initial*.1);assert.ok(samples.every(s=>Number(M.forward(p,s.x).probability>.5)===s.y));}
});
test('BCE remains finite for extremely confident incorrect logits',()=>{
  const p=M.create();p.b2=1000;near(M.gradients(p,[{x:[0,0],y:0}]).loss,M.forward(p,[0,0]).logit);p.b2=-1000;near(M.gradients(p,[{x:[0,0],y:1}]).loss,-M.forward(p,[0,0]).logit);
  assert.throws(()=>M.step(p,M.dataset(),NaN),RangeError);assert.throws(()=>M.step(p,M.dataset(),0),RangeError);assert.throws(()=>M.gradients(p,[]),RangeError);assert.throws(()=>M.dataset('unknown'),RangeError);
});
test('edited CNN pixels produce the expected signed change and do not mutate the caller',()=>{
  const original=N.cnnForward(),input=clone(original.input);input[0][0]=1;const edited=N.cnnForward({input});near(edited.data.convolution[0][0],original.data.convolution[0][0]-1);assert.equal(input[0][0],1);edited.input[0][0]=0;assert.equal(input[0][0],1);assert.throws(()=>N.cnnForward({input:[[1]]}),RangeError);
});
test('residual scaling and alternative hand-set token vectors change actual forward values',()=>{
  const base=N.resnetForward(),zero=N.resnetForward({strength:0}),scaled=N.resnetForward({strength:1.5});assert.deepEqual(zero.output,base.input);scaled.output.forEach((v,i)=>near(v,base.input[i]+1.5*base.residual[i]));assert.throws(()=>N.resnetForward({strength:-1}),RangeError);
  const normal=N.transformerForward(),contrast=N.transformerForward({scenario:'contrast'});assert.notDeepEqual(normal.data.attention,contrast.data.attention);contrast.data.attention.forEach(row=>near(row.reduce((a,b)=>a+b),1));assert.throws(()=>N.transformerForward({scenario:'unknown'}),RangeError);
});
