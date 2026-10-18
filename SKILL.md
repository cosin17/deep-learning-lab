---
name: deep-learning-lab
description: Explain deep learning concepts through beginner-friendly interactive experiments with linked visuals, real numerical calculations, and small prediction exercises. Use for neural network space folding (剪窗花), gradients, convolution, or designing a visual explanation of another algorithm. Does not cover production training pipelines or model deployment.
license: MIT
---

# Deep Learning Lab

Help the learner answer a concrete question by changing something and observing the mathematical consequence. Use their language and assume beginner knowledge unless they specify otherwise.

## Choose the experiment

For a bundled topic, read only its relevant section in [lessons.md](references/lessons.md):

- Space folding, ReLU, expressivity, or “剪窗花”: topic `fold`.
- Learning rate, gradients, convergence, or oscillation: topic `gradient`.
- Convolution, kernels, padding, stride, or receptive fields: topic `convolution`.

Export a portable copy of the lab:

```text
python <skill-dir>/scripts/export_lab.py --output <new-absolute-directory> --topic fold --lang zh
```

Use the host's output-location instructions. The script creates a new directory and preserves existing work by refusing an occupied destination. Its output has no runtime package, network, GPU, server, or API-key dependencies. Open the exported `index.html` with the host's file/browser tool when possible, and link to that file.

For an algorithm without a bundled experiment, read [authoring.md](references/authoring.md). Create the requested experiment in the user's output or project directory; the installed skill is a reusable source, so edit it only when asked to update the skill itself. The bundled experiments are starting points, not an exhaustive algorithm catalog.

## Make the learning observable

- Pick one uncertainty to investigate. Reuse the user's question; ask only when the missing detail changes the experiment substantially.
- Give a small, useful initial state. Let the learner adjust a few meaningful variables and inspect intermediate values.
- Compute diagrams, displayed numbers, and worked formulas from the same mathematical state. Distinguish a metaphor, a constructed example, and a trained model.
- Include one prediction question with a revealable explanation. Connect the result to the actual formula and state the scope of the conclusion.
- Keep controls keyboard-accessible, name plots and axes, and show numeric or textual category labels alongside color. Preserve offline operation for local examples.
- Verify the math with an independent small calculation or an invariant. When browser tools are available, exercise the main interaction and inspect both desktop and narrow layouts; report any verification you could not perform.

Deliver the working experiment, a brief explanation of what to try, and any material mathematical limits. Do not claim that learning effectiveness, arbitrary algorithm coverage, training, publishing, or browser checks have been demonstrated unless they actually have.
