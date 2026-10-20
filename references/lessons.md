# Bundled experiments: exact models and teaching boundaries

Read the section for the selected topic. Foundational models live in `assets/lab/core.js`, and network forward passes in `assets/lab/network-model.js`. Views inspect actual model outputs rather than maintaining separate display math.

## Space folding (`fold`)

Question: how can a straight boundary in transformed space produce several boundary segments in input space?

Rotate the input by the selected angle. Each folding block uses a unit normal n:

```text
z = n · p
p_next = p + 2 ReLU(-z) n
output_score = h_1 - 0.5 h_2 - threshold
keep if output_score >= 0; cut otherwise
```

Negative-side points reflect across the line n · p = 0. Positive-side points stay in place. Normals, in order, are (0,1), (1,0), (1/√2,-1/√2), and (sin(π/8),-cos(π/8)). Four blocks place the input in a 22.5-degree wedge. Each reflection preserves the distance to the origin.

This is a deliberately constructed residual ReLU module with a linear skip path. “One fold” is not a claim that every ordinary dense layer performs this operation. There is no training in this example, and adding arbitrary layers does not guarantee a more useful classifier.

Disabling ReLU replaces ReLU(-z) with -z. Every block then reflects the entire plane linearly. The composition, including the output readout and bias, still has a straight classification boundary.

The tracked point shows the selected stage; classification colors always use the final output. The dashed output line appears only at the final stage. The input rotation also applies at stage zero.

Exercise: keep four blocks but disable ReLU; predict the new boundary. Then change the cut threshold and watch the bias change the pattern.

Primary research: [Montúfar et al., On the Number of Linear Regions of Deep Neural Networks (2014)](https://arxiv.org/abs/1402.1869). The demo is an original construction inspired by the spatial-folding explanation; it is not a reproduction of all results in that paper.

## Gradient descent (`gradient`)

Question: why can a step in the negative-gradient direction still increase loss?

```text
L(w) = (w - 1)^2 / 2
gradient = w - 1
w_next = w - eta (w - 1)
error_next = (1 - eta) error
```

For this particular quadratic: 0 < eta < 1 approaches from one side; eta = 1 reaches the minimum in one update; 1 < eta < 2 oscillates with shrinking error; eta = 2 preserves nonzero error magnitude; eta > 2 enlarges nonzero error. A start exactly at w = 1 stays there at every supported rate.

These numerical thresholds depend on curvature and are not universal neural-network learning-rate rules. The model uses full, exact gradients, not stochastic minibatches, momentum, or Adam. Plot axes rescale as the trajectory grows. Changing the learning rate or starting value resets the history, avoiding a mixed-rate path.

Exercise: compare eta = 0.2, 1.6, 2, and 2.2. Compute the first update independently, then compare the readout. Playback is bounded at 40 updates.

Source: [Dive into Deep Learning, Gradient Descent](https://d2l.ai/chapter_optimization/gd.html).

## Convolution (`convolution`)

Question: which inputs and weights contribute to one output value?

The demo uses a 5 × 5 editable binary input, a 3 × 3 kernel, stride 1 or 2, and zero-padding 0 or 1. There is one input/output channel and no bias, dilation, training, or activation.

```text
Y[r,c] = sum_i sum_j X[r*stride+i-padding, c*stride+j-padding] K[i,j]
outside-input X values are zero
output_size = floor((input_size + 2*padding - kernel_size) / stride) + 1
```

This is cross-correlation, the convention commonly called convolution in CNN implementations: the kernel is not reversed. The dimension formula assumes unit dilation. Coordinates in the inspector are zero-based; accessible cell labels use one-based row/column descriptions.

Kernel options are a vertical edge detector, a 1/9 mean kernel, and a sharpening kernel. Output values can be negative and are intentionally not clamped. Inspecting a padded boundary demonstrates why mean filtering there may reduce intensity.

Exercise: predict the output shape for stride 2 and padding 1, then inspect the bottom-right output and the nine displayed products.

Sources: [Convolutions for Images](https://d2l.ai/chapter_convolutional-neural-networks/conv-layer.html), [Padding and Stride](https://d2l.ai/chapter_convolutional-neural-networks/padding-and-strides.html), Dive into Deep Learning.

## Network animations (`cnn`, `resnet`, `transformer`)

All three use deterministic, small, hand-written weights and perform no training. Stage shapes, feature maps, and values come from the actual forward pass. Playback follows those stages, stops at the end, and pauses when the lesson is left. Python panels are for reading only.

### CNN

An 8 × 8 single-channel image passes through a 3 × 3 valid correlation, ReLU, 2 × 2 pooling, aggregation, and a small output readout. Inspect how negative activations are suppressed and spatial resolution changes. Output scores illustrate a readout, not learned recognition accuracy. This is a small construction, not a complete LeNet reproduction.

The input pixels are editable; default/horizontal/empty presets recompute the entire forward pass. Selecting a convolution output shows its nine actual products and highlights its input patch. ReLU selects one source cell; pooling highlights its 2 × 2 window and all tied maxima. The current inputs and output share one color scale; calculations use full precision while display rounds to three decimals.

Reference: [PyTorch's CNN tutorial](https://docs.pytorch.org/tutorials/beginner/blitz/neural_networks_tutorial.html).

### ResNet

Trace a small vector through a residual branch F(x) and inspect the sum x + F(x). Turning off the skip shows F(x) alone; setting F(x) to zero while retaining the skip demonstrates identity. The illustration omits normalization and a post-add activation so the addition can be inspected directly.

The strength slider extends this to y = x + αF(x), α in [0,2]. The comparison card uses the same residual for both shortcut settings. At α = 0, a retained shortcut is exactly identity; without it, the output is zero. This illustrates forward addition, not a measurement of gradient flow or training ease.

Exercise: predict the output with a zero residual, then toggle the skip connection. Do not imply that the full architecture is simply identity or that arbitrary extra layers always improve accuracy.

Reference: [He et al., Deep Residual Learning for Image Recognition](https://arxiv.org/abs/1512.03385).

### Transformer

Three tokens with four-dimensional representations pass through positional encoding, Q/K/V projections, scaled dot-product attention, value mixing, projection, residual/normalization, and a feed-forward block. Inspect one query row of the attention matrix. With a causal mask, weights to later positions become zero while the allowed row remains normalized.

This is a single-head teaching block with fixed weights, not a complete language model. A mask toggle illustrates visibility; it does not turn the example into a full decoder. Layer normalization uses a small epsilon for stability. Values need not represent meaningful linguistic relationships.

Exercise: select the first query, enable masking, and explain why only its own position remains visible.

Results are revealed by stage: no attention inspector before score calculation; the score stage shows only dot products and masking; the attention stage adds normalized weights; value mixing adds one query/feature's weighted sum. Hand-set vector presets change actual projections and weights, not learned sentence meaning. Q, K and V branch from the same input. The network overview is collapsible so the current inspector is near the controls.

Reference: [Vaswani et al., Attention Is All You Need](https://arxiv.org/abs/1706.03762).

## Tiny MLP training (`mlp`)

A 2 → 4 → 1 network uses tanh hidden units and a sigmoid output. Sixteen deterministic points form either XOR or a linearly separable training set. Seed 42 initializes the parameters. Stable binary cross-entropy is computed from the logit as max(z,0) − yz + log1p(exp(−abs(z))). The full-batch gradient uses dL/dz = (sigmoid(z) − y)/16 and backpropagates through tanh with derivative 1 − h². All parameter gradients use the same pre-update parameters. SGD applies θ_new = θ − η∇L, with a maximum of 3000 updates.

The initial and current maps share fixed coordinate bounds and a probability color scale. Labeled dots are training samples; the square probe can be moved with the coordinate sliders or by clicking the current map. The loss curve records each update, including intermediate updates in the 100-step button. The weight inspector shows the last update, or a non-mutating next-step preview before training. Switching datasets restarts with the same seed; language and theme changes retain training state. Playback stops on route changes or hidden tabs.

Exercise: predict whether the same initialization follows the same loss curve on XOR and linearly separable labels, then compare. This is genuine local training on a toy dataset, not a benchmark, trained language model, or demonstration of generalization. The browser math is in `mlp-model.js`, UI in `mlp-ui.js`; the Python panel is a read-only structural illustration.

Reference: [PyTorch training tutorial](https://docs.pytorch.org/tutorials/beginner/blitz/neural_networks_tutorial.html).
