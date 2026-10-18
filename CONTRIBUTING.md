# Contributing / 参与贡献

欢迎数学纠错、初学者体验反馈、翻译和新实验。先体验已有实验，再把你遇到的具体问题记录在 Issue 中：你的预测是什么，实际观察是什么，哪里让你困惑。请附语言、浏览器、屏幕宽度与复现步骤。

For learner feedback, describe what you expected, what happened, and which part was confusing. Include your language, browser, screen width, and steps to reproduce.

## Adding an experiment / 新增实验

Read [the authoring guidance](references/authoring.md). Start with one question a beginner can investigate. Describe the exact mathematical model and simplifying assumptions, link a primary reference, and make the diagram and inspector share one calculation.

Keep numerical code separate from the DOM. Add a hand-calculated case or a meaningful mathematical invariant to the tests. Check the primary interaction, keyboard access, both languages, and a phone-width layout. Preserve offline operation unless a requested feature clearly needs a network.

Follow the existing division of files rather than adding a framework by default. New built-in topics also need updates to export topic choices, browser checks, and public documentation. Never describe an unimplemented algorithm as bundled.

## Checking a change / 检查修改

- Run `npm test` for numerical behavior.
- Run `python -m unittest discover -s tests -p "test_*.py" -v` for portable exports.
- For interface changes, install the optional browser tools and run `npm run test:browser`; inspect the visual result as well.
- State any checks you could not run. A passing automated check does not prove learning effectiveness.

Keep changes focused. Explain the learner-facing problem, what changes, and the evidence that it works. Do not include credentials, private file paths, or screenshots containing personal information.

Contributions are accepted under the project's [MIT license](LICENSE). Attribute any third-party material and respect its own license.
