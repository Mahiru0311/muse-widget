// Muse 用量小组件 v3 — Scriptable
// 样式：左上角蓝色波浪（透明底）+ Muse，白底，下面是大用量数字 + 进度条。
// 用法：直接粘贴本文件，或用 loader 版自动拉取本文件（见 usage-widget-loader.js）。
// 数据：https://raw.githubusercontent.com/Mahiru0311/muse-widget/main/muse-widget.json
// 图标：https://raw.githubusercontent.com/Mahiru0311/muse-widget/main/muse-wave.png
// 只做 Muse，不含 Codex / Claude。

const DATA_URL = "https://raw.githubusercontent.com/Mahiru0311/muse-widget/main/muse-widget.json"
const ICON_URL = "https://raw.githubusercontent.com/Mahiru0311/muse-widget/main/muse-wave.png"
const BLUE = new Color("#0A84FF")
const BLACK = new Color("#000000")
const GREY = new Color("#8E8E93")
const DARK_GREY = new Color("#3A3A3C")
const TRACK = new Color("#E9E9EB")

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
  // 用 DrawContext 画一条真正的圆角进度条，不用 █ ░ 字符拼。
  const height = 14
  const ctx = new DrawContext()
  ctx.size = new Size(width, height)
  ctx.opaque = false
  ctx.respectScreenScale = true
  // 轨道
  ctx.setFillColor(TRACK)
  const trackPath = new Path()
  trackPath.addRoundedRect(new Rect(0, 0, width, height), height / 2, height / 2)
  ctx.addPath(trackPath)
  ctx.fillPath()
  // 已剩余的部分，蓝色
  const filled = Math.max(0, Math.min(100, percent)) / 100 * width
  if (filled > 0) {
    ctx.setFillColor(BLUE)
    const fillPath = new Path()
    // 剩余很少时也给一个最小圆角，避免一条细线
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
  widget.backgroundColor = new Color("#FFFFFF")
  widget.setPadding(12, 14, 12, 14)
  widget.url = "https://github.com/Mahiru0311/muse-widget"
  const isMedium = config.widgetFamily === "medium"

  try {
    const data = await loadData()
    const usage = data.usage || {}
    const remaining = usage.weekly_percent_remaining ?? 0
    const used = usage.weekly_percent_used ?? 100

    // 顶部：图标 + Muse
    const header = widget.addStack()
    header.centerAlignContent()
    header.spacing = 8
    const icon = await loadIcon()
    if (icon) {
      const img = header.addImage(icon)
      img.imageSize = new Size(36, 25)
      img.cornerRadius = 0
    }
    const title = header.addText("Muse")
    title.font = Font.boldSystemFont(16)
    title.textColor = BLACK
    header.addSpacer()
    const tag = header.addText("每周")
    tag.font = Font.systemFont(12)
    tag.textColor = GREY

    widget.addSpacer(8)

    // 大数字：剩余百分比
    const bigRow = widget.addStack()
    bigRow.bottomAlignContent()
    bigRow.spacing = 4
    const big = bigRow.addText(remaining + "%")
    big.font = Font.boldSystemFont(34)
    big.textColor = BLACK
    const label = bigRow.addText("剩余")
    label.font = Font.systemFont(14)
    label.textColor = DARK_GREY

    widget.addSpacer(6)

    // 进度条
    const barImg = drawBar(remaining, isMedium ? 640 : 260)
    const bar = widget.addImage(barImg)
    bar.imageSize = new Size(isMedium ? 320 : 130, 7)
    bar.cornerRadius = 3.5

    widget.addSpacer(8)

    // 下面两行用量，各占一行，不换行、不截断
    const usedText = widget.addText("已用 " + used + "%")
    usedText.font = Font.systemFont(12)
    usedText.textColor = DARK_GREY
    widget.addSpacer(2)
    const resetText = widget.addText("重置 " + fmtReset(usage.weekly_reset_at))
    resetText.font = Font.systemFont(12)
    resetText.textColor = DARK_GREY

    // 中尺寸才多显示一行，小时件不挤
    if (isMedium) {
      widget.addSpacer(4)
      const extra = widget.addText("额外 tokens 已用 " + (usage.additional_tokens_percent_used ?? "—") + "% · 剩 " + (usage.additional_tokens_left ?? "—"))
      extra.font = Font.systemFont(12)
      extra.textColor = GREY
      widget.addSpacer(4)
      const updated = widget.addText("更新于 " + (data.updated_at ? new Date(data.updated_at).toTimeString().slice(0, 5) : "—"))
      updated.font = Font.systemFont(11)
      updated.textColor = GREY
    }
  } catch (e) {
    const title = widget.addText("Muse")
    title.font = Font.boldSystemFont(16)
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
