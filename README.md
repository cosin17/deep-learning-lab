# Deep Learning Lab · 看见算法

**通过可以动手操作的小实验，理解深度学习。**

[English](README.en.md) · [打开实验](assets/lab/index.html) · [Skill 指令](SKILL.md) · [贡献指南](CONTRIBUTING.md)

调整一个参数，看图形与数值一起变化，再用公式解释原因。面向初学者，也适合教师课堂演示。

![深蓝界面：渐变标题、实验入口与空间折叠学习区](docs/images/space-folding.png)

## 直接体验

下载或克隆本项目，解压后双击根目录的 **`index.html`**。界面采用深蓝背景、蓝橙光晕与半透明卡片，支持中文和英文、桌面和手机布局；点击导航栏的主题按钮可切换深浅色。

实验本身无需安装 Python、Node.js 或深度学习框架，也不需要服务器、GPU、账号或 API Key。所有计算在浏览器本地完成，无统计追踪，不加载远程字体或脚本。参考资料链接仅在点击后联网。

GitHub 文件预览不能执行交互页面。在线体验需要先启用 GitHub Pages；离线体验直接打开下载的文件即可。

| 实验 | 你能做什么 | 想回答的问题 |
| --- | --- | --- |
| 空间折叠 / 剪窗花 | 改变折叠次数、旋转角和剪切偏置，逐步追踪点，关闭 ReLU 比较 | 为什么非线性变换能产生复杂边界？ |
| 梯度下降 | 单步更新或播放，比较学习率与参数轨迹 | 为什么会收敛、震荡或发散？ |
| 卷积探针 | 编辑输入图案，改变卷积核、步幅和补零，检查九次乘加 | 一个特征值来自哪片输入？ |
| CNN 卷积网络 | 逐层播放卷积、激活、池化与输出，查看特征图和形状 | 特征如何逐层提取并变成分类分数？ |
| ResNet 残差网络 | 追踪主支路和旁路，切换跳跃连接与零残差 | 输入为什么可以直接加入输出？ |
| Transformer | 逐步查看注意力与残差模块，选择查询 token、切换因果遮罩 | 一个 token 怎样聚合其他位置的信息？ |

建议先试：把折叠模块增加到 4，再关闭 ReLU；先预测图案，再查看结果。每个实验都包含一道预测题和可展开的解释。

三个网络动画支持播放、暂停、单步、重置和阶段跳转。它们展示固定手工权重下的小规模前向计算，矩阵与当前阶段对应；不是预训练模型，也不展示虚构的识别准确率。卷积参数使用选择卡片和分段按钮，可直接点击或用键盘操作。

## 用 Python 复现算法

界面下方的 Python 学习区会随当前实验展示对应的核心算法代码，供阅读和理解；代码不在网页中执行。

仓库另附可独立运行的 Python 示例，供本地学习与开发使用。安装 Python 3.10+ 后，在项目根目录运行：

```sh
python python/deep_learning_lab.py --topic fold
python python/deep_learning_lab.py --topic gradient --learning-rate 1.8
python python/deep_learning_lab.py --topic convolution --kernel blur
```

源码位于 [python/deep_learning_lab.py](python/deep_learning_lab.py)，仅使用标准库，覆盖前三个基础算法。可逐步查看折叠坐标、梯度更新和卷积乘加；追加 `--json` 可输出结构化计算结果，`--help` 列出更多参数。网络动画旁的 Python 代码用于展示核心结构，不是完整网络的可运行脚本。

Python 负责可阅读、可复现的算法示例；浏览器用 JavaScript 计算即时交互，从而保留离线打开和静态托管能力。两种实现通过实际数值对照测试保持一致，当前检查包含 330 个案例及其中间字段。网页本身不启动 Python，也没有需要部署的 Python 后端。

后续学习真实模型训练时，可以继续使用 [PyTorch 官方基础教程](https://docs.pytorch.org/tutorials/beginner/basics/intro.html)。当前最小示例不要求安装 PyTorch。

## 在 Codex 中使用 skill

本仓库根目录就是一个完整的 Agent Skill，含 `SKILL.md`、`agents/`、`references/`、`scripts/` 和 `assets/`。

按照 [Codex 官方技能文档](https://learn.chatgpt.com/docs/build-skills)，将整个项目文件夹放到用户的 `~/.agents/skills/deep-learning-lab/`，或当前项目的 `.agents/skills/deep-learning-lab/`。也可让 `$skill-installer` 从你发布后的仓库地址安装。若客户端已经使用其他技能目录，按该客户端的配置安装，避免同名重复。

调用示例：

```text
$deep-learning-lab 用剪窗花解释神经网络的非线性，给我一个能操作的实验。
$deep-learning-lab 我不理解为什么学习率太大会发散，让我试一试。
$deep-learning-lab 用一个最小例子帮我理解注意力权重。
```

六类主题已有交互实验或网络动画；其他主题由 AI 依据扩展指南设计和验证。Transformer 已包含小规模注意力演示，完整的大模型训练不在预置范围。使用 AI skill 需要兼容的代理环境，直接浏览实验不需要。

需要单独导出实验时，使用 Python 3.10+：

```sh
python scripts/export_lab.py --output ./my-experiment --topic fold --lang zh
```

目标目录必须尚不存在。导出的文件可直接离线打开，包含六个主题及基础算法的 Python 源码；`--topic` 只决定初始打开哪一个，可选 `fold`、`gradient`、`convolution`、`cnn`、`resnet`、`transformer`。语言可选 `zh` / `en`。

## 发布到你的 GitHub

1. 建立公开仓库，把本目录的全部文件提交进去，包括 `.github/`；如复制为自己的项目，可按需更新导航栏的 GitHub 链接。
2. 在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。
3. 在 **Actions → Publish learning lab → Run workflow** 手动运行。成功后使用部署结果中的网址分享。

发布工作流会先运行数值与 Python 测试，再把网页和 Python 源码导出到 `_site/` 并部署。没有自动发布触发器，实际发布结果以 GitHub Actions 的运行状态为准。流程依据 [GitHub Pages 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

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
references/               六个主题的数学边界与扩展指南
assets/lab/               可离线运行的界面、网络动画和浏览器数值模型
python/                   可独立运行的 Python 算法示例
scripts/export_lab.py     零第三方依赖的导出工具
tests/                    数值、Python/JavaScript 对照、导出和浏览器检查
.github/workflows/        CI 与手动 Pages 发布
```

## 数学范围

空间折叠使用带线性旁路的特定 ReLU 模块，由用户设定参数，不执行训练。梯度下降使用单参数二次函数，其学习率阈值不能直接套用到所有网络。卷积使用单通道互相关，不翻转卷积核，不加偏置与激活。

CNN 是单通道简化网络；ResNet 展示残差加和，省略归一化和加和后的激活；Transformer 是三 token、单头注意力的微型模块，因果遮罩用于对比信息可见范围。它们保留对应机制，未完整复现某个预训练网络。参考 [ResNet 原论文](https://arxiv.org/abs/1512.03385)、[Transformer 原论文](https://arxiv.org/abs/1706.03762) 与 [PyTorch CNN 教程](https://docs.pytorch.org/tutorials/beginner/blitz/neural_networks_tutorial.html)。

图形、公式代入和数值读数共享实际计算模型。完整定义与资料见 [实验说明](references/lessons.md)。软件验证尚不能证明教学效果；欢迎用“预测—操作—解释”的过程反馈哪里仍然难懂。

## 许可与贡献

代码、原创界面和项目说明采用 [MIT License](LICENSE)。外部论文和教材链接保留各自版权；本仓库没有复制其插图。欢迎贡献新实验、翻译、数学纠错与初学者反馈，详见 [CONTRIBUTING.md](CONTRIBUTING.md)。
