// Muse 用量小组件 v5 — Scriptable
// v5 改动：深色模式改用 Color.dynamic（Device.isUsingDarkAppearance 在小组件里不支持，
// 所以 v4 一直是白底）；排版回到 v3 的均衡版，顶部留白 10，不用弹性空白撑底部。
// 左上角：蓝色波浪（透明底）+ Muse。
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
  const req = new Request(DATA_URL)
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
  // 顶部 10：v3 是 12 嫌低，v4 改 6 又太贴顶，取中间
  widget.setPadding(10, 14, 12, 14)
  widget.url = "https://github.com/Mahiru0311/muse-widget"
  const isMedium = config.widgetFamily === "medium"

  try {
    const data = await loadData()
    const usage = data.usage || {}
    const remaining = usage.weekly_percent_remaining ?? 0
    const used = usage.weekly_percent_used ?? 100

    // 顶部：波浪 + Muse，贴顶，不再留大空白
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
    header.addSpacer()
    const tag = header.addText("每周")
    tag.font = Font.systemFont(11)
    tag.textColor = GREY

    widget.addSpacer(6)

    // 大数字
    const bigRow = widget.addStack()
    bigRow.bottomAlignContent()
    bigRow.spacing = 4
    const big = bigRow.addText(remaining + "%")
    big.font = Font.boldSystemFont(32)
    big.textColor = TEXT
    const label = bigRow.addText("剩余")
    label.font = Font.systemFont(14)
    label.textColor = SUB

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

    widget.addSpacer(8)

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
