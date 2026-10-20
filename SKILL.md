---
name: deep-learning-lab
description: Explain deep learning through beginner-friendly interactive experiments, inspectable network calculations, tiny MLP training, and prediction exercises. Use for space folding (剪窗花), gradients, convolution, CNN, ResNet, Transformer attention, backpropagation, or designing another algorithm visualization. Does not cover production training pipelines or model deployment.
license: MIT
---

# Deep Learning Lab

Help the learner answer a concrete question by changing something and observing the mathematical consequence. Use their language and assume beginner knowledge unless they specify otherwise.

## Choose the experiment

For a bundled topic, read only its relevant section in [lessons.md](references/lessons.md):

- Space folding, ReLU, expressivity, or “剪窗花”: topic `fold`.
- Learning rate, gradients, convergence, or oscillation: topic `gradient`.
- Convolution, kernels, padding, stride, or receptive fields: topic `convolution`.
- Layer-by-layer convolutional feature extraction: topic `cnn`.
- Residual branches, skip connections, or identity mappings: topic `resnet`.
- Self-attention, token mixing, or causal visibility: topic `transformer`.
- Backpropagation, weight updates, or a learned decision boundary: topic `mlp`.

Export a portable copy of the lab:

```text
python <skill-dir>/scripts/export_lab.py --output <new-absolute-directory> --topic fold --lang zh
```

Use the host's output-location instructions. The script creates a new directory and preserves existing work by refusing an occupied destination. Its output has no runtime package, network, GPU, server, or API-key dependencies. Open the exported `index.html` with the host's file/browser tool when possible, and link to that file.

CNN/ResNet/Transformer animations use small fixed-weight forward passes. Let the learner inspect one output's actual inputs, and reveal attention results only when its stage is reached. The MLP topic actually trains a 2 → 4 → 1 network on 16 synthetic points; its training loss does not establish generalization. Explain each lesson's stated simplifications. Start paused; preserve reduced-motion behavior and stop playback or training when leaving the lesson.

For learners who want code, use `python/deep_learning_lab.py`, a standard-library implementation of the three foundational models. Run `python <skill-dir>/python/deep_learning_lab.py --topic gradient`; `--help` lists controls and `--json` returns intermediate results. Exported copies include this source. The browser still computes in JavaScript. On-page Python snippets are read-only illustrations; the separate foundational examples are independently runnable and checked against browser results.

For an algorithm without a bundled experiment, read [authoring.md](references/authoring.md). Create the requested experiment in the user's output or project directory; the installed skill is a reusable source, so edit it only when asked to update the skill itself. The bundled experiments are starting points, not an exhaustive algorithm catalog.

## Make the learning observable

- Pick one uncertainty to investigate. Reuse the user's question; ask only when the missing detail changes the experiment substantially.
- Give a small, useful initial state. Let the learner adjust a few meaningful variables and inspect intermediate values.
- Compute diagrams, displayed numbers, and worked formulas from the same mathematical state. Distinguish a metaphor, a constructed example, and a trained model.
- Include one prediction question with a revealable explanation. Connect the result to the actual formula and state the scope of the conclusion.
- Keep controls keyboard-accessible, name plots and axes, and show numeric or textual category labels alongside color. Preserve offline operation for local examples.
- Verify the math with an independent small calculation or an invariant. When browser tools are available, exercise the main interaction and inspect both desktop and narrow layouts; report any verification you could not perform.

Deliver the working experiment, a brief explanation of what to try, and any material mathematical limits. Do not claim that learning effectiveness, arbitrary algorithm coverage, training, publishing, or browser checks have been demonstrated unless they actually have.
