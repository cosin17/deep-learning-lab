(function() {
  'use strict';
  const M = window.DLMLP;
  let saved;
  const number = x => Number(x.toFixed(5)).toString();
  function render(topic, lang) {
    const t = (zh,en) => lang === 'en' ? en : zh;
    return '<section class="hero"><div><p class="eyebrow">07 / MLP · LEARNING IN MOTION</p><h2 class="lesson-heading">' + t('让一个小网络，<em>真的学起来。</em>', 'Watch a small network <em>actually learn.</em>') + '</h2><p class="intro">' + t('2 → 4 → 1 的小型网络，通过真实反向传播与梯度下降，学习 16 个二维点。颜色是模型的输出概率，圆点旁的 0/1 是训练标签。', 'A 2 → 4 → 1 network learns 16 two-dimensional points using real backpropagation and gradient descent. Colors show predicted probabilities; 0/1 labels show training targets.') + '</p></div></section><div id="mlp-lab">' +
      '<section class="panel mlp-controls"><div class="net-playback"><button class="button primary" id="mlp-step">' + t('训练一步', 'Train one step') + '</button><button class="button" id="mlp-hundred">' + t('训练 100 步', 'Train 100 steps') + '</button><button class="button" id="mlp-play" aria-pressed="false">▶ ' + t('连续训练', 'Keep training') + '</button><button class="button" id="mlp-reset">↺ ' + t('重置', 'Reset') + '</button></div><div class="net-options"><span>' + t('训练集', 'Dataset') + '</span><button class="button" data-mlp-dataset="xor">XOR</button><button class="button" data-mlp-dataset="linear">' + t('线性可分', 'Linearly separable') + '</button><label for="mlp-rate">' + t('学习率', 'Learning rate') + ' <output id="mlp-rate-value">0.3</output></label><input id="mlp-rate" type="range" min="0.05" max="1" step="0.05" value="0.3"></div><div class="mlp-metrics" aria-live="polite"><span>' + t('训练步数', 'Steps') + ' <strong id="mlp-count">0</strong></span><span>' + t('训练集损失', 'Training loss') + ' <strong id="mlp-loss-value"></strong></span></div></section>' +
      '<div class="mlp-panels"><section class="panel mlp-plot"><h3>' + t('训练前 · 固定初始权重', 'Before training · fixed initialization') + '</h3><div class="mlp-square"><canvas id="mlp-before" role="img" aria-label="' + t('训练前的预测概率和带标签的样本', 'Initial probabilities and labeled samples') + '"></canvas></div></section><section class="panel mlp-plot"><h3>' + t('现在 · 权重正在更新', 'Now · parameters change') + '</h3><div class="mlp-square"><canvas id="mlp-current" role="img" aria-label="' + t('当前预测概率和带标签的训练点，可点击选择观察点', 'Current predictions and training labels. Click to inspect a point.') + '"></canvas></div></section></div><p class="mlp-legend">' + t('橙色：类别 1 概率接近 0；蓝色：接近 1。白色边界表示概率约为 0.5。两幅图使用同一色标。', 'Orange: class-1 probability near 0. Blue: near 1. White boundary: about 0.5. Both maps share the same scale.') + '</p>' +
      '<section class="panel mlp-plot"><h3>' + t('每一步的训练集损失', 'Training loss at each step') + '</h3><div class="mlp-loss-wrap"><canvas id="mlp-loss" role="img" aria-label="' + t('训练集二元交叉熵随更新次数的变化', 'Training binary cross-entropy versus update count') + '"></canvas></div></section>' +
      '<section class="panel mlp-inspector"><h3>' + t('追踪一个点：输入 → 隐层 → 输出', 'Trace a point: input → hidden layer → output') + '</h3><div class="mlp-probe"><label for="mlp-x">x₁ <output id="mlp-x-value"></output></label><input id="mlp-x" type="range" min="-1" max="1" step="0.05" value="-0.75"><label for="mlp-y">x₂ <output id="mlp-y-value"></output></label><input id="mlp-y" type="range" min="-1" max="1" step="0.05" value="0.75"></div><p id="mlp-activations"></p><div class="mlp-neurons" aria-label="' + t('选择一条输出权重', 'Select an output weight') + '">' + [0,1,2,3].map(j => '<button class="button" data-mlp-neuron="'+j+'">h'+(j+1)+' → 输出</button>').join('') + '</div><p id="mlp-probability"></p><details id="mlp-update"><summary>' + t('看看反向传播怎样更新一条权重', 'Inspect one weight’s backpropagation update') + '</summary><p id="mlp-update-label"></p><div class="net-formula" id="mlp-update-formula"></div><p class="hint">' + t('输出层梯度按 16 个样本取平均：Σ[(p − y)h] / 16。隐层还乘以 tanh 的导数 1 − h²。所有层的梯度用同一次更新前的权重计算。', 'Output gradient averages over 16 samples: Σ[(p − y)h] / 16. Hidden gradients also use the tanh derivative 1 − h². All gradients use parameters from before the same update.') + '</p></details></section>' +
      '<div class="learning-row"><section class="learning-card"><h3>' + t('先猜一猜，再试一试', 'Predict, then experiment') + '</h3><p>' + t('同一套初始权重，学习 XOR 和线性可分的数据，损失曲线会一样吗？切换训练集会重新开始。', 'Will the same initialization learn XOR and a linearly separable dataset along the same loss curve? Switching datasets starts over.') + '</p><details><summary>' + t('查看解释', 'Reveal explanation') + '</summary><p>' + t('通常不会。标签改变了误差信号和梯度；隐藏层的非线性使网络有机会表达 XOR 的弯曲边界。一次运行不能保证其他任务的收敛。', 'Usually not. Labels change errors and gradients. Nonlinear hidden units let the network represent a curved XOR boundary. One run does not guarantee convergence on other tasks.') + '</p></details></section><section class="learning-card"><h3>' + t('这是一个小型训练实验', 'A tiny training experiment') + '</h3><p>' + t('固定种子 42，tanh 隐层，sigmoid 输出，稳定的二元交叉熵，全批量梯度下降。最多 3000 步。损失只来自训练集，不表示泛化能力。', 'Seed 42, tanh hidden layer, sigmoid output, stable binary cross-entropy and full-batch SGD. Limited to 3000 steps. Training loss does not measure generalization.') + '</p><a href="https://docs.pytorch.org/tutorials/beginner/blitz/neural_networks_tutorial.html" target="_blank" rel="noopener noreferrer">PyTorch · Neural Networks ↗</a></section></div></div>';
  }
  function mount(container, topic, lang) {
    const t = (zh,en) => lang === 'en' ? en : zh;
    const $ = id => container.querySelector('#'+id);
    const s = saved || { parameters:M.create(), initial:M.create(), dataset:'xor', rate:0.3, count:0, history:[], probe:[-0.75,0.75], neuron:0, last:null };
    saved = s; let timer = null, destroyed = false;
    const samples = () => M.dataset(s.dataset);
    if(!s.history.length) s.history.push(M.gradients(s.parameters,samples()).loss);
    function pause() { if(timer !== null) clearInterval(timer); timer=null; if(!destroyed){$('mlp-play').textContent='▶ '+t('连续训练','Keep training');$('mlp-play').setAttribute('aria-pressed','false');} }
    function canvas(id) {
      const c=$(id), rect=c.getBoundingClientRect(), ratio=Math.min(devicePixelRatio || 1,2);
      c.width=Math.round(rect.width*ratio); c.height=Math.round(rect.height*ratio);
      const ctx=c.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,rect.width,rect.height);
      return {ctx,w:rect.width,h:rect.height};
    }
    function boundary(id,parameters) {
      const {ctx,w,h}=canvas(id);if(!w||!h)return;
      const pad=28, size=Math.min(w,h)-2*pad, n=60, probabilities=[];
      for(let r=0;r<n;r++) { probabilities[r]=[];for(let c=0;c<n;c++) {
        const p=M.forward(parameters,[-1+(c+.5)*2/n,1-(r+.5)*2/n]).probability; probabilities[r][c]=p;
        const start=[79,49,42],end=[38,78,142];ctx.fillStyle='rgb('+start.map((v,i)=>Math.round(v+(end[i]-v)*p)).join(',')+')';ctx.fillRect(pad+c*size/n,pad+r*size/n,size/n+1,size/n+1);
      }}
      // Interpolate the p=0.5 contour on triangles; avoid a staircase grid outline.
      ctx.strokeStyle='#ffffffaa';ctx.lineWidth=1.2;ctx.beginPath();
      for(let r=0;r<n-1;r++)for(let c=0;c<n-1;c++){
        const vertex=(row,col)=>[pad+(col+.5)*size/n,pad+(row+.5)*size/n,probabilities[row][col]];
        const vertices=[vertex(r,c),vertex(r,c+1),vertex(r+1,c+1),vertex(r+1,c)];
        for(const indices of [[0,1,2],[0,2,3]]){
          const hits=[];
          for(let i=0;i<3;i++){const a=vertices[indices[i]],b=vertices[indices[(i+1)%3]];if((a[2]>.5)!==(b[2]>.5)){const f=(.5-a[2])/(b[2]-a[2]);hits.push([a[0]+f*(b[0]-a[0]),a[1]+f*(b[1]-a[1])]);}}
          if(hits.length===2){ctx.moveTo(...hits[0]);ctx.lineTo(...hits[1]);}
        }
      }ctx.stroke();
      const xy=point=>[pad+(point[0]+1)*size/2,pad+(1-point[1])*size/2];
      ctx.font='11px Segoe UI,sans-serif';ctx.textAlign='center';
      samples().forEach(sample=>{const [x,y]=xy(sample.x);ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fillStyle=sample.y?'#8db5ff':'#ffbd89';ctx.fill();ctx.strokeStyle='#091222';ctx.stroke();ctx.fillStyle='#f6f8ff';ctx.fillText(String(sample.y),x,y-10);});
      const [px,py]=xy(s.probe);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(px-6,py-6,12,12);
      ctx.fillStyle=getComputedStyle(container).getPropertyValue('--muted');ctx.fillText('−1',pad,h-7);ctx.fillText('1',pad+size,h-7);ctx.fillText('x₁',w/2,h-7);ctx.fillText('x₂',13,17);
      ctx.fillText('1',12,pad+5);ctx.fillText('−1',12,pad+size);
    }
    function redraw() {
      if(destroyed)return;
      boundary('mlp-before',s.initial);boundary('mlp-current',s.parameters);
      const {ctx,w,h}=canvas('mlp-loss'), pad=35, max=Math.max(...s.history,0.01)*1.05;
      ctx.strokeStyle=getComputedStyle(container).getPropertyValue('--line');ctx.strokeRect(pad,12,w-pad-12,h-42);
      ctx.strokeStyle=getComputedStyle(container).getPropertyValue('--accent');ctx.lineWidth=2;ctx.beginPath();s.history.forEach((loss,i)=>{const x=pad+i/Math.max(s.count,1)*(w-pad-12),y=12+(1-loss/max)*(h-42);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.stroke();
      ctx.fillStyle=getComputedStyle(container).getPropertyValue('--muted');ctx.font='11px Segoe UI,sans-serif';ctx.fillText(max.toFixed(2),2,19);ctx.fillText('0',15,h-27);ctx.fillText('0',pad,h-10);ctx.fillText(String(s.count),w-36,h-10);
    }
    function update() {
      const loss=s.history.at(-1), f=M.forward(s.parameters,s.probe), preview=s.last || { before:s.parameters.w2.slice(), ...M.step(s.parameters,samples(),s.rate), rate:s.rate };
      $('mlp-count').textContent=s.count;$('mlp-loss-value').textContent=number(loss);$('mlp-rate').value=s.rate;$('mlp-rate-value').textContent=s.rate;
      $('mlp-x').value=s.probe[0];$('mlp-y').value=s.probe[1];$('mlp-x-value').textContent=s.probe[0];$('mlp-y-value').textContent=s.probe[1];
      $('mlp-activations').textContent='h = tanh(xW + b) = ['+f.hidden.map(number).join(', ')+']';
      $('mlp-probability').textContent=t('当前点的类别 1 概率：','Current point’s class-1 probability: ')+number(f.probability);
      $('mlp-update-label').textContent=s.last?t('最近一步更新（使用更新前的梯度）','Most recent update (gradient evaluated before updating)'):t('下一步更新预览（尚未训练）','Next-update preview (no training yet)');
      const j=s.neuron; $('mlp-update-formula').textContent='w₂['+(j+1)+'] = '+number(preview.before[j])+'\n∂L/∂w₂['+(j+1)+'] = '+number(preview.gradient.w2[j])+'\nw_new = '+number(preview.before[j])+' − '+preview.rate+' × ('+number(preview.gradient.w2[j])+') = '+number(preview.parameters.w2[j]);
      container.querySelectorAll('[data-mlp-dataset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mlpDataset===s.dataset)));
      container.querySelectorAll('[data-mlp-neuron]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.mlpNeuron)===s.neuron)));
      ['mlp-step','mlp-hundred','mlp-play'].forEach(id=>{$(id).disabled=s.count>=3000;});
      redraw();
    }
    function train(count) {
      for(let i=0;i<count&&s.count<3000;i++){const before=s.parameters.w2.slice(), next=M.step(s.parameters,samples(),s.rate);s.parameters=next.parameters;s.last={...next,before,rate:s.rate};s.count++;s.history.push(next.loss);}
      update();if(s.count>=3000)pause();
    }
    function reset(){pause();s.parameters=M.create();s.initial=M.create();s.count=0;s.last=null;s.history=[M.gradients(s.parameters,samples()).loss];update();}
    function click(event){const b=event.target.closest('button');if(!b)return;
      if(b.id==='mlp-step'){pause();train(1);}if(b.id==='mlp-hundred'){pause();train(100);}if(b.id==='mlp-reset')reset();
      if(b.id==='mlp-play'){if(timer!==null){pause();return;}b.setAttribute('aria-pressed','true');b.textContent='Ⅱ '+t('暂停','Pause');timer=setInterval(()=>train(5),160);}
      if(b.dataset.mlpDataset){s.dataset=b.dataset.mlpDataset;reset();}if(b.dataset.mlpNeuron!==undefined){s.neuron=Number(b.dataset.mlpNeuron);update();}
    }
    function input(event){if(event.target.id==='mlp-rate'){pause();s.rate=Number(event.target.value);}if(event.target.id==='mlp-x')s.probe[0]=Number(event.target.value);if(event.target.id==='mlp-y')s.probe[1]=Number(event.target.value);update();}
    function selectPoint(event){const r=$('mlp-current').getBoundingClientRect(),size=Math.min(r.width,r.height)-56; s.probe=[Math.max(-1,Math.min(1,(event.clientX-r.left-28)/size*2-1)),Math.max(-1,Math.min(1,1-(event.clientY-r.top-28)/size*2))].map(v=>Math.round(v*20)/20);update();}
    container.addEventListener('click',click);container.addEventListener('input',input);$('mlp-current').addEventListener('click',selectPoint);update();
    return {pause,redraw,destroy(){pause();destroyed=true;container.removeEventListener('click',click);container.removeEventListener('input',input);$('mlp-current').removeEventListener('click',selectPoint);}};
  }
  window.DLMLPUI={render,mount,getCaption:(topic,lang)=>lang==='en'?'One full-batch update; forward, loss and backward are illustrative helpers.':'一次全批量更新；forward、loss、backward 为示意辅助函数。',getPython:()=> 'def train_step(parameters, samples, rate):\n    predictions = forward(parameters, samples)\n    objective = binary_cross_entropy(predictions)\n    gradients = backward(objective, parameters)\n    return parameters - rate * gradients'};
})();
