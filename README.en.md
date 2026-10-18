# Deep Learning Lab

**Learn deep learning by changing things.**

[中文](README.md) · [Open the lab](assets/lab/index.html?lang=en) · [Agent Skill](SKILL.md) · [Contribute](CONTRIBUTING.md)

A small, offline collection of bilingual experiments for beginners. Change a parameter, inspect the picture and numbers, and connect what happened to the equation.

![The folding experiment links input regions, transformed space, and a tracked point](docs/images/space-folding.png)

## Try it

Download or clone the repository, extract it, and open **`index.html`** in a modern browser. Choose English in the header. No installation, server, GPU, account, API key, or deep learning framework is required. There are no remote scripts, fonts, or analytics. Reference links use the network only when followed.

GitHub's file preview does not execute the lab. Use a downloaded copy, or enable GitHub Pages for online access.

| Experiment | Explore | Understand |
| --- | --- | --- |
| Space folding | Add folding blocks, rotate the input, move the cut, trace a point, disable ReLU | How nonlinearity can create a complex boundary |
| Gradient descent | Step or play; compare four learning rates | Convergence, oscillation, and divergence |
| Convolution | Edit pixels; change the kernel, stride, and padding; inspect nine products | How a feature value and its receptive field are connected |

Start by setting four folding blocks, predicting the effect of disabling ReLU, then trying it. Every experiment includes a prediction exercise and a revealable explanation. The interface supports Chinese / English, narrow screens, keyboard controls, and the system's light / dark theme.

## Use the Agent Skill

The repository root is a complete skill folder. Following the [official Codex instructions](https://learn.chatgpt.com/docs/build-skills), put it at `~/.agents/skills/deep-learning-lab/` or your project's `.agents/skills/deep-learning-lab/`. A client with another configured skill directory should use that directory. Avoid installing the same named skill twice.

```text
$deep-learning-lab Explain ReLU with an interactive paper-folding experiment.
$deep-learning-lab Help me see why a large learning rate can diverge.
$deep-learning-lab Build a minimal visual explanation of attention weights.
```

Three experiments are bundled. Other algorithms, including attention, use the authoring guidance and need a newly implemented and verified experiment. Running the AI skill needs a compatible agent; browsing the experiments does not.

Export a portable copy with Python 3.10+:

```sh
python scripts/export_lab.py --output ./my-experiment --topic gradient --lang en
```

The destination must not exist. The exported copy includes all three experiments, with the selected topic and language as its starting state.

## Share through GitHub Pages

Commit this folder to your public repository, including `.github/`. In **Settings → Pages → Source**, choose **GitHub Actions**. Manually run **Actions → Publish learning lab → Run workflow**. Share the URL returned by the deployment.

The workflow checks the numerical model and deploys `assets/lab/`. It runs only when manually triggered; check GitHub Actions for the actual deployment result. See [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Develop and check

Only maintainers need these tools. The application itself has no runtime dependencies.

```sh
# Node.js 20+ (a supported LTS is recommended)
npm test

# Python 3.10+, standard library only
python -m unittest discover -s tests -p "test_*.py" -v

# Optional browser verification
npm ci
npx playwright install chromium
npm run test:browser
```

Set `DLLAB_BROWSER_CHANNEL=msedge` to use an installed Edge browser. Optionally set `DLLAB_SCREENSHOT_DIR` for screenshots. Browser checks cover interactions, independent numerical expectations, language switching, dark mode, external resource requests, and 320–1440px layouts. Chromium-family browsers are checked; Firefox and Safari have not been verified.

The pure model is in `assets/lab/core.js`, the interface in `assets/lab/app.js`, topic definitions in `references/lessons.md`, and extension guidance in `references/authoring.md`.

## Scope and license

Folding uses specially constructed residual ReLU blocks; it does not train a network. Gradient descent uses one quadratic objective, so its learning-rate thresholds are specific to that objective. Convolution uses single-channel cross-correlation without bias or activation.

All displays share the numerical model. Mechanical checks do not establish educational effectiveness; feedback from beginners is welcome.

Original code, interface, and documentation are [MIT licensed](LICENSE). Linked research and textbooks retain their own rights; their illustrations are not copied here. Contributions and corrections are welcome: [CONTRIBUTING.md](CONTRIBUTING.md).
