# Add an algorithm without making the skill heavy

Use this reference when a learner requests a concept outside the three bundled experiments, or when a maintainer explicitly asks to extend the skill.

## Define what a learner can test

Turn the question into an observable contrast. For attention, a learner might change a query and watch softmax weights and the weighted value sum. For backpropagation, they might change a scalar input and inspect local derivatives and the chain rule on a three-node graph. Pick a small mathematical case that preserves the mechanism the user is asking about.

Verify unfamiliar equations and claims against the original paper, an official implementation, or an authoritative textbook. Cite the precise source used. If only a simplified demonstration is implemented, describe that specific case rather than claiming full algorithm coverage.

## Keep a portable artifact

Prefer a small self-contained HTML/CSS/JavaScript artifact, or reuse an exported copy of the bundled lab. Native SVG works well for sparse graphs and labels; canvas works well for dense fields. Use system fonts and local files to preserve offline operation. Avoid a framework or training dependency unless the requested concept actually needs it.

Use one pure numerical function or small module as the source of truth for the picture, inspector, formula substitutions, and returned results. Separate this math from DOM code so it can be checked directly. Write the new artifact in the user's chosen destination. Update installed files only when the task is explicitly to maintain this skill.

Useful teaching content:

- The question and starting example.
- Inputs and two or three controls with interpretable effects.
- An intermediate view and numeric inspection.
- One prediction exercise with a hidden explanation.
- The exact model, assumptions, and primary references.

These are content needs, not a compulsory page layout. Preserve the user's requested design and language.

## Checks that reveal mistakes

Use independent calculations or mathematical properties, rather than checking only that text appears. Examples:

- Softmax weights are nonnegative, sum to one, and are unchanged by adding the same constant to every logit.
- A scalar backpropagation derivative agrees with a finite difference away from nondifferentiable points.
- A linear model without a nonlinear activation remains affine after composing layers.
- A kernel on a small asymmetric matrix matches a hand-calculated correlation; this detects accidental flipping.

Exercise the primary interaction in a real browser when available. Check that a changed control changes the visual and every associated number consistently. Inspect a wide layout and a phone-width layout, keyboard controls, labels, and text independent of color. Keep network access blocked during an offline check.

For a new maintained bundled lesson, add the model under `assets/lab/core.js`, UI under `assets/lab/app.js`, a focused explanation in `references/lessons.md`, and a mathematical test under `tests/`. Update topic choices in `scripts/export_lab.py`, URLs, translations, browser checks, and public documentation only as the new capability requires.

## Learning effectiveness

A functioning animation establishes mechanical behavior, not learning effectiveness. Ask a beginner to predict a change, explain the result in their own words, and solve a small transfer question. Use observed confusion to refine the experiment. Do not invent user-study results or learning scores.
