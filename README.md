# Deep Learning Lab · 看见算法

**通过可以动手操作的小实验，理解深度学习。**

[English](README.en.md) · [打开实验](assets/lab/index.html) · [Skill 指令](SKILL.md) · [贡献指南](CONTRIBUTING.md)

调整一个参数，看图形与数值一起变化，再用公式解释原因。面向初学者，也适合教师课堂演示。

![空间折叠实验：原始分类图案、折叠空间与同一追踪点联动](docs/images/space-folding.png)

## 直接体验

下载或克隆本项目，解压后双击根目录的 **`index.html`**。界面支持中文和英文、桌面和手机布局，并跟随系统切换深浅色。

实验本身无需安装 Python、Node.js 或深度学习框架，也不需要服务器、GPU、账号或 API Key。所有计算在浏览器本地完成，无统计追踪，不加载远程字体或脚本。参考资料链接仅在点击后联网。

GitHub 文件预览不能执行交互页面。在线体验需要先启用 GitHub Pages；离线体验直接打开下载的文件即可。

| 实验 | 你能做什么 | 想回答的问题 |
| --- | --- | --- |
| 空间折叠 / 剪窗花 | 改变折叠次数、旋转角和剪切偏置，逐步追踪点，关闭 ReLU 比较 | 为什么非线性变换能产生复杂边界？ |
| 梯度下降 | 单步更新或播放，比较学习率与参数轨迹 | 为什么会收敛、震荡或发散？ |
| 卷积探针 | 编辑输入图案，改变卷积核、步幅和补零，检查九次乘加 | 一个特征值来自哪片输入？ |

建议先试：把折叠模块增加到 4，再关闭 ReLU；先预测图案，再查看结果。每个实验都包含一道预测题和可展开的解释。

## 在 Codex 中使用 skill

本仓库根目录就是一个完整的 Agent Skill，含 `SKILL.md`、`agents/`、`references/`、`scripts/` 和 `assets/`。

按照 [Codex 官方技能文档](https://learn.chatgpt.com/docs/build-skills)，将整个项目文件夹放到用户的 `~/.agents/skills/deep-learning-lab/`，或当前项目的 `.agents/skills/deep-learning-lab/`。也可让 `$skill-installer` 从你发布后的仓库地址安装。若客户端已经使用其他技能目录，按该客户端的配置安装，避免同名重复。

调用示例：

```text
$deep-learning-lab 用剪窗花解释神经网络的非线性，给我一个能操作的实验。
$deep-learning-lab 我不理解为什么学习率太大会发散，让我试一试。
$deep-learning-lab 用一个最小例子帮我理解注意力权重。
```

前三类主题已有经过检查的交互实验；注意力等新主题由 AI 依据扩展指南设计和验证，尚未预置。使用 AI skill 需要兼容的代理环境，直接浏览实验不需要。

需要单独导出实验时，使用 Python 3.10+：

```sh
python scripts/export_lab.py --output ./my-experiment --topic fold --lang zh
```

目标目录必须尚不存在。导出的文件可直接离线打开，包含三个实验；`--topic` 只决定初始打开哪一个。语言可选 `zh` / `en`。

## 发布到你的 GitHub

1. 建立公开仓库，把本目录的全部文件提交进去，包括 `.github/`。本项目不包含任何预设的远程仓库地址。
2. 在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。
3. 在 **Actions → Publish learning lab → Run workflow** 手动运行。成功后使用部署结果中的网址分享。

发布工作流会先运行数值测试，再部署 `assets/lab/`。没有自动发布触发器，实际发布结果以 GitHub Actions 的运行状态为准。流程依据 [GitHub Pages 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 开发与验证

浏览实验不需要以下工具；仅修改与维护时使用。

```sh
# Node.js 20+；推荐使用仍受维护的 LTS 版本
npm test

# Python 3.10+，只有标准库
python -m unittest discover -s tests -p "test_*.py" -v

# 可选：安装浏览器测试依赖
npm ci
npx playwright install chromium
npm run test:browser
```

如果使用已安装的 Edge，可设置 `DLLAB_BROWSER_CHANNEL=msedge` 后运行浏览器测试。脚本可用 `DLLAB_SCREENSHOT_DIR` 指定截图目录。浏览器检查覆盖真实交互、手算结果、语言切换、主题、离线资源请求和 320–1440px 的布局；默认使用 Chromium 系列，尚未验证 Firefox / Safari。

项目结构：

```text
SKILL.md                  skill 入口与教学规则
references/               三个实验的数学边界与扩展指南
assets/lab/               可离线运行的界面和纯数值模型
scripts/export_lab.py     零第三方依赖的导出工具
tests/                    数值、导出和可选浏览器检查
.github/workflows/        CI 与手动 Pages 发布
```

## 数学范围

空间折叠使用带线性旁路的特定 ReLU 模块，由用户设定参数，不执行训练。梯度下降使用单参数二次函数，其学习率阈值不能直接套用到所有网络。卷积使用单通道互相关，不翻转卷积核，不加偏置与激活。

图形、公式代入和数值读数共享实际计算模型。完整定义与资料见 [实验说明](references/lessons.md)。软件验证尚不能证明教学效果；欢迎用“预测—操作—解释”的过程反馈哪里仍然难懂。

## 许可与贡献

代码、原创界面和项目说明采用 [MIT License](LICENSE)。外部论文和教材链接保留各自版权；本仓库没有复制其插图。欢迎贡献新实验、翻译、数学纠错与初学者反馈，详见 [CONTRIBUTING.md](CONTRIBUTING.md)。
