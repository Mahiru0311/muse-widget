// Muse 用量小组件 v4 — Scriptable
// v4 改动：支持深色模式；顶部收紧，左上角贴顶；底部信息锚定到底部，中间用弹性空白撑开。
// 左上角：蓝色波浪（透明底，已裁掉透明边）+ Muse，白底 / 深色底都适用。
// 数据：https://raw.githubusercontent.com/Mahiru0311/muse-widget/main/muse-widget.json
// 图标：https://raw.githubusercontent.com/Mahiru0311/muse-widget/main/muse-wave.png
// 只做 Muse，不含 Codex / Claude。用 loader 的话，推到仓库后自动生效，不用重贴。

const DATA_URL = "https://raw.githubusercontent.com/Mahiru0311/muse-widget/main/muse-widget.json"
const ICON_URL = "https://raw.githubusercontent.com/Mahiru0311/muse-widget/main/muse-wave.png"

// 深色模式：跟随系统，浅色白底黑字，深色深灰底白字
const IS_DARK = typeof Device !== "undefined" && Device.isUsingDarkAppearance ? Device.isUsingDarkAppearance() : false
const BG = new Color(IS_DARK ? "#1C1C1E" : "#FFFFFF")
const TEXT = new Color(IS_DARK ? "#FFFFFF" : "#000000")
const SUB = new Color(IS_DARK ? "#E5E5EA" : "#3A3A3C")
const GREY = new Color(IS_DARK ? "#98989D" : "#8E8E93")
const TRACK = new Color(IS_DARK ? "#38383A" : "#E9E9EB")
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
  // 顶部只留 6，左上角贴顶；左右 14，底部 10
  widget.setPadding(6, 14, 10, 14)
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

    widget.addSpacer(4)

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

    widget.addSpacer(4)

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

    // 弹性空白：把下面两行推到底部，顶部就不会显得空、底部也不会飘
    widget.addSpacer()

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
