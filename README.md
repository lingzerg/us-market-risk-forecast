# 美国市场风险场景仪表盘

> 在线访问（推荐优先）：[https://lingzerg.github.io/us-market-risk-forecast/](https://lingzerg.github.io/us-market-risk-forecast/)
>
> 建议优先通过该链接查看最新同步数据；本地运行更适合调试、改参数或做离线查看。

这是一个本地 HTML + JavaScript 页面，用公开市场数据近似判断当前美股市场更接近哪一种风险场景。页面会自动请求多个公开数据源，展示当前指标、请求状态、缺省数据、场景匹配度，并允许用户调整每条规则的权重。

> 说明：这是一个风险观察和决策辅助工具，不是投资建议。页面输出的是“最接近场景”和置信度，不等于确定性交易信号。

## 提供的功能

1. 自动抓取公开数据
   - VIX：Cboe VIX 历史数据，FRED VIX 备用。
   - 指数：S&P 500、SPY。
   - 信用市场：HY OAS、IG OAS、HYG、JNK、LQD。
   - 通胀数据：CPI、Core CPI、PCE、Core PCE（FRED）。
   - 就业数据：非农就业（PAYEMS）、失业率（UNRATE）（FRED）。
   - 美元与金融压力：广义美元指数、NFCI、STLFSI4。
   - 情绪与宽度代理：CNN Fear & Greed、AAII、Cboe Put/Call、RSP/SPY。
   - 银行压力代理：XLF、KRE。
   - 异常期权活动代理：Cboe Daily Put/Call 聚合指标（Total / Equity / Index）。

2. 自动判断当前场景
   - 场景一：正常回调，可以正常定投。
   - 场景二：恐慌回调，可以分批加仓。
   - 场景三：极端恐慌，强烈关注抄底机会。
   - 场景四：系统性风险信号，先防守。
   - 场景五：过度贪婪，考虑减仓。

3. 展示当前指标
   - 页面会展示 VIX、S&P 500 回撤、Fear & Greed、信用利差、通胀（CPI/PCE）、就业（非农/失业率）、美元、金融压力、HYG/JNK、银行 ETF、宽度代理、Put/Call、AAII、异常期权活动等数据。

4. 期权交易注意信息（未来两周事件）
   - 在主栏位下方新增 `期权交易注意信息`。
   - 基于 FRED 发布日历给出 CPI、核心 CPI、PCE、核心 PCE、非农、失业率的下一次发布日期。
   - 自动判断是否在未来 14 天内，提示“可能引发股价/隐含波动突然变化”的窗口。

5. 展示请求进度和错误状态
   - 每条请求都有 `loading`、`success`、`failed` 三种状态。
   - 成功时显示 HTTP 状态码，例如 `code: 200`。
   - 失败时显示 HTTP 状态码，例如 `400`、`404`、`500`、`502`。
   - 如果浏览器直连被安全策略拦截，会显示 `NETWORK/CORS`。
   - 会显示核心源/可选源健康度；实时抓取核心健康度过低时会自动用内置快照补齐核心缺项。

6. 折叠说明区
   - `当前数据的分析`：说明当前结论怎么得出、关键证据是什么、每个数据的含义。
   - `当前数据的分析` 中新增“常用宏观数据（当前值与来源）”，直接给出通胀和就业指标的当前读数、指标代码与来源链接。
   - `五个场景说明`：解释每个场景的含义和操作倾向。
   - `数据来源`：列出每个场景依赖的数据来源。
   - `参数调整`：说明算法，并开放每条规则的权重。

7. GitHub Pages 效果预览
   - GitHub Pages 不能运行 `server.js`，浏览器直连公开源又容易被 CORS 拦截。
   - 项目提供 GitHub Actions 工作流，把公开数据抓取成 `data/market-snapshot.json`。
   - GitHub Pages 页面优先读取这个同源 JSON，因此线上页面不需要后端也能展示数据。
   - GitHub Pages 主要用于预览效果；推荐下载项目后本地使用。

## 运行方式

推荐方案一：下载项目后本地使用，直接双击静态页面，侵入最低。

```text
index.html
```

这种方式不会启动本地服务，也不会在本机开端口。页面会按下面顺序自动取数：

1. 先检查本地代理 `http://localhost:8010/health`。
2. 先优先加载仓库快照（snapshot-first），保证页面先稳定显示。
3. 如果代理可用，再走本地代理做实时刷新增量更新。
4. CPI/非农等低频宏观数据在快照 24 小时内会优先复用快照，降低重复抓取失败率。
5. 如果你手动加 `?direct=1`，才会强制浏览器直连公开数据源（可能出现 `NETWORK/CORS`）。

补充：在本地代理模式下，页面会自动限制并发请求（避免 `localhost` 同域连接队列造成大量 `TIMEOUT`），并使用更长的代理超时窗口以提升稳定性。

如果你希望拿到实时数据（而不是快照），再使用方案二。

方案二：双击启动本地代理。

```text
start-dashboard.cmd
```

它会启动本地只读代理，并打开：

```text
http://localhost:8010
```

也可以手动在终端运行：

```powershell
node server.js
```

然后手动打开：

```text
http://localhost:8010
```

## 为什么需要 `server.js`

`server.js` 不是首选必需项。它只是在静态页面直连数据源不完整时使用。

很多公开金融数据站点不允许浏览器直接跨域请求。`server.js` 是一个本地只读代理：

- 提供静态页面服务。
- 提供 `/health` 健康检查。
- 提供 `/proxy?url=...` 数据转发。
- 不保存数据。
- 不需要第三方依赖。

直接双击 `index.html` 时，页面会先检查：

```text
http://localhost:8010/health
```

如果本地代理已启动，页面会自动通过代理请求实时数据。  
如果本地代理没有启动，页面会优先使用 `data/market-snapshot.inline.js` 内置快照；只有你手动加 `?direct=1` 才会强制浏览器直连公开数据源。若出现 `NETWORK/CORS`，直接双击 `start-dashboard.cmd` 即可。

## GitHub Pages 部署说明

GitHub Pages 主要用于预览页面效果，不是推荐的完整使用方式。推荐用户点击页面上的 `GitHub 仓库` 按钮下载项目，然后按上面的本地方式运行。

GitHub Pages 是纯静态托管，不能运行 `server.js`。为了让线上页面尽量能展示数据，本项目使用静态快照方案：

```text
GitHub Actions 抓数据 -> 写入 data/market-snapshot.json + data/market-snapshot.inline.js -> GitHub Pages 读取同源 JSON
```

需要做两件事：

1. 在仓库 `Settings` -> `Pages` 中启用 GitHub Pages：
   - `Source` 选择 `Deploy from a branch`
   - `Branch` 选择 `main`
   - folder 选择 `/ (root)`

2. 在仓库 `Actions` 中运行：

```text
Update market snapshot
```

这个工作流也会在工作日定时运行。它会更新：

```text
data/market-snapshot.json
data/market-snapshot.inline.js
```

工作流抓取阶段带有超时与重试；如果单个数据源瞬时失败，会优先回退到上一次快照中的同指标，尽量避免出现“快照大面积缺项”。

建议在仓库 `Settings` -> `Secrets and variables` -> `Actions` 中新增：

```text
FRED_API_KEY
```

工作流会优先使用 FRED 官方 API（`api.stlouisfed.org`）；如果未配置或 API 临时失败，会自动回退到 FRED CSV 抓取。

本地开发可在仓库根目录创建（或维护）：

```text
.env.local
```

内容示例：

```text
FRED_API_KEY=your_key_here
```

`scripts/fetch-market-snapshot.mjs` 会自动读取该文件（且 `.gitignore` 已忽略它，不会提交到仓库）。

如果 GitHub Pages 页面显示数据为空或都是 `NETWORK/CORS`，通常说明快照还没有生成或 Pages 还没部署到最新提交。进入 `Actions` 手动运行一次 `Update market snapshot`，等工作流完成后刷新 GitHub Pages 页面。

## 计算方式

页面使用“规则打分”的方式判断场景。

每个场景由多条规则组成。每条规则有：

- 数据依赖：例如 `VIX`、`S&P 500 回撤`、`HY OAS`。
- 判断条件：例如 `VIX >= 35`。
- 权重：例如 `3.0`。

单个场景的匹配度计算：

```text
场景匹配度 = 已满足规则权重之和 / 可计算规则权重之和
```

如果某条规则缺少数据：

- 该规则不进入分母。
- 页面会把它列入缺省项。
- 最终置信度会被降低。

补充：情绪相关抓取项（如 `CNN Fear & Greed`、`AAII`、`Cboe Put/Call`）默认按“可选项”处理，失败会展示但不会像核心宏观/信用指标那样显著拉低置信度。

最终置信度计算：

```text
最终置信度 = 最接近场景匹配度 × 数据覆盖修正
```

页面会选择匹配度最高的场景作为“当前最接近场景”。如果置信度较低，标题会显示“未完整触发”。

## 默认规则与权重

### 场景一：正常回调，可以正常定投

| 规则 | 默认权重 | 条件 |
|---|---:|---|
| VIX 18-25 | 1.4 | `18 <= VIX <= 25` |
| 回撤 3%-5% | 1.4 | S&P 500 从近一年高点回撤约 `3%-6%` |
| 情绪 25-45 | 1.2 | Fear & Greed 或代理分数在 `25-45` |
| 信用稳定 | 0.6 | HY OAS 低于阈值且 20 日未明显走阔 |
| 压力正常 | 0.6 | NFCI 与 STLFSI4 未显示金融压力 |

### 场景二：恐慌回调，可以分批加仓

| 规则 | 默认权重 | 条件 |
|---|---:|---|
| VIX 25-35 | 2.0 | `25 <= VIX < 35` |
| 回撤 7%-10% | 1.8 | S&P 500 从近一年高点回撤约 `7%-12%` |
| 情绪低于 25 | 1.5 | Fear & Greed 或代理分数 `< 25` |
| 信用未崩 | 0.6 | HY OAS 未显著恶化 |
| 美元未失控 | 0.4 | 广义美元 20 日涨幅未过快 |

### 场景三：极端恐慌，强烈关注抄底机会

| 规则 | 默认权重 | 条件 |
|---|---:|---|
| VIX 超过 35 | 3.0 | `VIX >= 35` |
| 极端恐惧 | 2.2 | Fear & Greed 或代理分数 `<= 15` |
| AAII 悲观高 | 1.2 | AAII bearish 高，或 bearish 明显高于 bullish |
| 信用未冻结 | 0.5 | HY OAS 未进入严重冻结状态 |
| 银行未崩 | 0.5 | KRE/XLF 20 日跌幅未达到系统性压力阈值 |
| 压力未系统化 | 0.5 | NFCI/STLFSI4 未进入明显压力区 |

### 场景四：系统性风险信号，先防守

| 规则 | 默认权重 | 条件 |
|---|---:|---|
| VIX 高位 | 0.8 | `VIX >= 28` |
| 信用快速走阔 | 1.4 | HY/IG 信用利差快速扩大 |
| HYG/JNK 大跌 | 1.1 | 高收益债 ETF 20 日明显下跌 |
| 美元急升 | 1.0 | 广义美元 20 日快速上涨 |
| 银行大跌 | 1.1 | KRE/XLF 20 日明显下跌 |
| 金融压力转紧 | 1.2 | NFCI 或 STLFSI4 转入压力区 |

### 场景五：过度贪婪，考虑减仓

| 规则 | 默认权重 | 条件 |
|---|---:|---|
| VIX 低于 15 | 1.5 | `VIX < 15` |
| 情绪超过 75 | 1.4 | Fear & Greed 或代理分数 `>= 75` |
| 指数接近新高 | 1.0 | S&P 500 接近近一年高点 |
| 宽度恶化 | 1.0 | RSP 20 日表现弱于 SPY |
| Put/Call 偏投机 | 0.7 | 总 Put/Call 偏低 |

## Fear & Greed 代理分数

如果 CNN Fear & Greed 原始值抓取失败，页面会使用自建代理分数。代理分数由以下指标等权合成：

- VIX 近一年分位。
- S&P 500 动量。
- S&P 500 回撤。
- HY OAS 信用利差分位。
- 美元 20 日变化。
- RSP/SPY 宽度代理。
- Cboe Put/Call。

代理分数只用于补位，不等同于 CNN 官方指数。

## 怎么调整参数

页面底部打开：

```text
参数调整
```

可以看到每个场景下的规则权重输入框。

调整原则：

- 权重越高，该规则对场景判断影响越大。
- 权重设为 `0`，等于关闭该规则对评分的影响。
- 修改权重后，页面会立即用当前数据重算场景。
- 修改权重不会重新请求数据。
- 权重会保存到浏览器本地 `localStorage`。
- 点击 `恢复默认权重` 可以恢复内置默认值。

建议：

- 如果更看重波动和回撤，把 VIX、指数回撤相关权重调高。
- 如果更担心系统性风险，把信用利差、银行 ETF、金融压力相关权重调高。
- 如果更关心情绪反转，把 Fear & Greed、AAII、Put/Call 相关权重调高。

## 数据失败时怎么看

日志中的常见状态：

| 状态 | 含义 |
|---|---|
| `loading` | 正在请求 |
| `success` | 请求成功并返回数据 |
| `failed` | 请求失败 |
| `code: 200` | HTTP 请求成功 |
| `code: 400/404/500` | 上游或本地代理返回错误 |
| `code: 502` | 本地代理请求上游失败 |
| `code: LOCAL` | 来自仓库内置快照（`data/market-snapshot.inline.js`） |
| `code: FALLBACK` | 实时抓取失败后由内置快照补齐 |
| `NETWORK/CORS` | 浏览器直连被网络或 CORS 安全策略拦截 |

如果所有数据都显示 `NETWORK/CORS` 或 `Failed to fetch`，通常说明浏览器直连被拦截。此时再使用第二方案，双击：

```text
start-dashboard.cmd
```

或者运行：

```powershell
node server.js
```

再打开：

```text
http://localhost:8010
```
