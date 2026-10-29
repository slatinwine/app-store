// 重建应用商店：拉取 slatinwine 全部公开仓库 + Pages 状态，合并 catalog.json 人工数据，生成 index.html
import { readFileSync, writeFileSync } from "node:fs";

const OWNER = "slatinwine";
const TOKEN = process.env.GITHUB_TOKEN;
const CAT_ORDER = ["游戏", "工具", "AI 与实验", "内容与地图", "语料与 Fork", "新收录"];

if (!TOKEN) {
  console.error("GITHUB_TOKEN is required");
  process.exit(1);
}

const H = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "app-store-builder",
};

async function api(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers: H });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

// 1. 分页拉取全部公开仓库（按更新时间倒序）
const repos = [];
for (let page = 1; ; page++) {
  const batch = await api(`/users/${OWNER}/repos?per_page=100&page=${page}&sort=updated`);
  repos.push(...batch);
  if (batch.length < 100) break;
}
console.log(`fetched ${repos.length} public repos`);

// 2. 并发检查每个仓库的 Pages 状态（池大小 10）
async function pagesUrl(name) {
  try {
    const j = await api(`/repos/${OWNER}/${name}/pages`);
    return j.html_url || null;
  } catch {
    return null;
  }
}
const pagesMap = {};
const queue = repos.map((r) => r.name);
const workers = Array.from({ length: 10 }, async () => {
  while (queue.length) {
    const name = queue.shift();
    pagesMap[name] = await pagesUrl(name);
  }
});
await Promise.all(workers);
const pagesCount = Object.values(pagesMap).filter(Boolean).length;
console.log(`${pagesCount} repos have GitHub Pages`);

// 3. 合并人工校对数据（标题 / 描述 / 分类）
const catalog = JSON.parse(readFileSync("catalog.json", "utf8"));
const catRank = (c) => {
  const i = CAT_ORDER.indexOf(c);
  return i === -1 ? CAT_ORDER.length : i;
};

const apps = repos.map((r) => {
  const o = catalog[r.name] || {};
  const home = (r.homepage || o.home || "").trim();
  return {
    n: r.name,
    t: o.t || r.name,
    d: o.d || r.description || "",
    cat: o.cat || "新收录",
    lang: r.language || null,
    stars: r.stargazers_count || 0,
    fork: !!r.fork,
    pages: pagesMap[r.name] ? 1 : 0,
    home: home ? (home.startsWith("http") ? home : `https://${home}`) : null,
  };
});
apps.sort((a, b) => catRank(a.cat) - catRank(b.cat));
const newCount = apps.filter((a) => a.cat === "新收录").length;
console.log(`${newCount} apps in category 新收录 (add overrides to catalog.json to polish them)`);

// 4. 注入模板，生成 index.html
const template = readFileSync("template.html", "utf8");
const html = template.replace("__APPS_JSON__", JSON.stringify(apps, null, 1));
if (!html.includes("const APPS =")) throw new Error("template injection failed");
writeFileSync("index.html", html);
console.log(`index.html rebuilt with ${apps.length} apps`);
