# app-store · 网页版 GitHub 应用商店

把 [slatinwine](https://github.com/slatinwine) 的全部公开仓库做成应用商店：每个项目一张圆角矩形图标卡片，点击直达在线应用（GitHub Pages）或仓库主页。

**在线地址**：https://slatinwine.github.io/app-store/

## 工作原理

- `template.html` — 页面模板（清水混凝土风，含搜索 / 分类筛选）
- `catalog.json` — 人工校对数据：每个仓库的中文标题、描述、分类；未收录的仓库自动落入「新收录」分类
- `build.mjs` — 调 GitHub API 拉取全部公开仓库 + 各仓库 Pages 状态 + 主页域名，合并 catalog 数据，注入模板生成 `index.html`
- `.github/workflows/rebuild.yml` — 每天北京时间 03:17 自动重建：有变化则提交，并通过官方 Pages Actions 部署（也可手动触发）

## 新仓库怎么进商店？

什么都不用做 —— 新建仓库后，下一次定时构建（最迟次日凌晨）自动出现。想改中文标题/分类，往 `catalog.json` 加一条即可，也可以直接在 GitHub 网页上编辑该文件。

## 本地构建

```bash
GITHUB_TOKEN=ghp_xxx node build.mjs
```
