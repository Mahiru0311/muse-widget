// Muse 用量小组件 v11 — Scriptable
// v11 改动：只把图标换回来。用户说 Muse 波浪不用换：顶部恢复蓝色波浪 + Muse，
// 保留 v10 的布局：下面一行小字「每周额度」，再下面大字「剩余 XX%」
// （XX 是真实剩余百分比，现在是 99%）。下面不动：进度条、已用、重置都保持原样。
// v9 改动：防缓存，每次拉数据都带 ?t=时间戳，强制走新数据。
// v8 改动：只改点按行为。v7 的 https://muse.ai 实测只打开了 Safari 网页版，
// 没走到 App。所以改成 Muse 的 App 直连 scheme hatch://（Muse 文档里用的
// 就是 hatch://search 这类深链，App 应已注册 hatch://）。其他排版、深色都不动。
// 注意：Scriptable 文档说 widget.url 会覆盖小组件配置里的点按行为，
// 所以 When Interacting 保持 Open App 就行，不用改。
// 左上角：蓝色波浪（透明底）+ Muse（v11 换回来了，v10 的紫色星星只用了一版）。
// 数据：https://raw.githubusercontent.com/Mahiru0311/muse-widget/main/muse-widget.json
// 图标：https://raw.githubusercontent.com/Mahiru0311/muse-widget/main/muse-wave.png
// 只做 Muse，不含 Codex / Claude。用 loader 的话，推到仓库后自动生效，不用重贴。

const DATA_URL = "https://raw.githubusercontent.com/Mahiru0311/muse-widget/main/muse-widget.json"
const ICON_URL = "https://raw.githubusercontent.com/Mahiru0311/muse-widget/main/muse-wave.png"

// 深色模式：必须用 Color.dynamic，浅色在前、深色在后，iOS 在渲染小组件时才决定用哪个。
// Device.isUsingDarkAppearance() 在小组件里不支持，查了 Scriptable 文档确认的。
const BG = Color.dynamic(new Color("#FFFFFF"), new Color("#1C1C1E"))
const TEXT = Color.dynamic(new Color("#000000"), new Color("#FFFFFF"))
const SUB = Color.dynamic(new Color("#3A3A3C"), new Color("#E5E5EA"))
const GREY = Color.dynamic(new Color("#8E8E93"), new Color("#98989D"))
// 注意：DrawContext 不支持动态颜色，所以进度条轨道用一个深浅都看得见的中灰。
const TRACK = new Color("#C7C7CC")
const BLUE = new Color("#0A84FF")

async function loadData() {
  const req = new Request(DATA_URL + "?t=" + Date.now())
  req.headers = { "Cache-Control": "no-cache" }
  return await req.loadJSON()
}

async function loadIcon() {
  try {
    const req = new Request(ICON_URL)
    return await req.loadImage()
  } catch (e) {
    return null
  }
}

function drawBar(percent, width) {
  const height = 14
  const ctx = new DrawContext()
  ctx.size = new Size(width, height)
  ctx.opaque = false
  ctx.respectScreenScale = true
  ctx.setFillColor(TRACK)
  const trackPath = new Path()
  trackPath.addRoundedRect(new Rect(0, 0, width, height), height / 2, height / 2)
  ctx.addPath(trackPath)
  ctx.fillPath()
  const filled = Math.max(0, Math.min(100, percent)) / 100 * width
  if (filled > 0) {
    ctx.setFillColor(BLUE)
    const fillPath = new Path()
    const w = Math.max(filled, height)
    fillPath.addRoundedRect(new Rect(0, 0, w, height), height / 2, height / 2)
    ctx.addPath(fillPath)
    ctx.fillPath()
  }
  return ctx.getImage()
}

function fmtReset(iso) {
  if (!iso) return "—"
  const d = new Date(iso)
  return (d.getMonth() + 1) + "/" + d.getDate() + " " +
    String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0")
}

async function createWidget() {
  const widget = new ListWidget()
  widget.backgroundColor = BG
  // 顶部 10，底部 8：底部两行往下移 4pt
  widget.setPadding(10, 14, 8, 14)
  widget.url = "hatch://"
  const isMedium = config.widgetFamily === "medium"

  try {
    const data = await loadData()
    const usage = data.usage || {}
    const remaining = usage.weekly_percent_remaining ?? 0
    const used = usage.weekly_percent_used ?? 100

    // 顶部：蓝色波浪 + Muse（v11 换回来了）
    const header = widget.addStack()
    header.topAlignContent()
    header.spacing = 6
    const icon = await loadIcon()
    if (icon) {
      const img = header.addImage(icon)
      img.imageSize = new Size(34, 23)
      img.cornerRadius = 0
    }
    const title = header.addText("Muse")
    title.font = Font.boldSystemFont(15)
    title.textColor = TEXT

    widget.addSpacer(4)

    // 小字：每周额度
    const quotaLabel = widget.addText("每周额度")
    quotaLabel.font = Font.systemFont(13)
    quotaLabel.textColor = SUB

    widget.addSpacer(2)

    // 大数字：剩余 XX%（XX 是真实剩余百分比）
    const big = widget.addText("剩余 " + remaining + "%")
    big.font = Font.boldSystemFont(28)
    big.textColor = TEXT

    widget.addSpacer(6)

    // 进度条
    const barImg = drawBar(remaining, isMedium ? 640 : 260)
    const bar = widget.addImage(barImg)
    bar.imageSize = new Size(isMedium ? 320 : 130, 7)
    bar.cornerRadius = 3.5

    // 中尺寸多显示一行
    if (isMedium) {
      widget.addSpacer(6)
      const extra = widget.addText("额外 tokens 已用 " + (usage.additional_tokens_percent_used ?? "—") + "% · 剩 " + (usage.additional_tokens_left ?? "—"))
      extra.font = Font.systemFont(12)
      extra.textColor = GREY
    }

    widget.addSpacer(12)

    const usedText = widget.addText("已用 " + used + "%")
    usedText.font = Font.systemFont(12)
    usedText.textColor = SUB
    widget.addSpacer(2)
    const resetText = widget.addText("重置 " + fmtReset(usage.weekly_reset_at))
    resetText.font = Font.systemFont(12)
    resetText.textColor = SUB
  } catch (e) {
    const title = widget.addText("Muse")
    title.font = Font.boldSystemFont(15)
    title.textColor = TEXT
    widget.addSpacer(6)
    const err = widget.addText("暂时拉不到用量数据，等下次刷新再看。")
    err.font = Font.systemFont(12)
    err.textColor = GREY
  }

  return widget
}

async function main() {
  const widget = await createWidget()
  Script.setWidget(widget)
  Script.complete()
}
main()
