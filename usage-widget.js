// Muse 用量小组件 v15 — Scriptable
// v15 改动：横屏版改回原来的样子。v13/v14 的圆环 + 三格小数据版位置没把控好
// （每周额度飘到最右边、底部三格间距不匀），用户说别乱改了，按原来的来。
// 所以横屏版恢复 v12 的竖排：波浪 + Muse、每周额度、大字剩余%、进度条、
// 额外 tokens 一行、已用、重置，只是横屏的进度条更宽。全部左对齐，
// 不用 spacer 推右边，不分三格，位置稳。小尺寸和原来一模一样。
// v14 的修补都保留：联网失败读本地缓存、报错用一张干净的新卡片。
// v14 教训：Scriptable 的 Path 没有 addArc，圆环不能用 addArc 画，
// 以后画图只用官方类型定义里有的方法。
// v12 改动：每次拉到新数据都存一份到手机本地（muse-widget-cache.json），
// 给锁屏小组件用。桌面版显示本身不变。
// v11 改动：图标换回蓝色波浪 + Muse，保留 v10 布局：下面一行小字「每周额度」，
// 再下面大字「剩余 XX%」（XX 是真实剩余百分比）。下面不动：进度条、已用、重置。
// v9 改动：防缓存，每次拉数据都带 ?t=时间戳，强制走新数据。
// v8 改动：点按走 hatch://（Muse App 直连）。When Interacting 保持 Open App 就行。
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

function readCache() {
  try {
    const fm = FileManager.local()
    const path = fm.joinPath(fm.documentsDirectory(), "muse-widget-cache.json")
    if (!fm.fileExists(path)) return null
    return JSON.parse(fm.readString(path))
  } catch (e) {
    return null
  }
}

async function loadData() {
  try {
    const req = new Request(DATA_URL + "?t=" + Date.now())
    req.headers = { "Cache-Control": "no-cache" }
    req.timeoutInterval = 10
    const data = await req.loadJSON()
    try {
      const fm = FileManager.local()
      fm.writeString(fm.joinPath(fm.documentsDirectory(), "muse-widget-cache.json"), JSON.stringify(data))
    } catch (e) {}
    return data
  } catch (e) {
    // 联网失败就用本地缓存，别直接报错
    return readCache()
  }
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

// 原来的竖排样子（v12）：波浪 + Muse、每周额度、大字剩余%、进度条、
// 额外 tokens 一行、已用、重置。横屏和小的一样，只是进度条更宽。
// 全部左对齐，间距固定，不用 spacer，不分格。
function buildLayout(widget, usage, icon, barWidth, barDisplayWidth, showExtra) {
  const remaining = usage.weekly_percent_remaining ?? 0
  const used = usage.weekly_percent_used ?? 100
  widget.setPadding(10, 14, 8, 14)

  const header = widget.addStack()
  header.topAlignContent()
  header.spacing = 6
  if (icon) {
    const img = header.addImage(icon)
    img.imageSize = new Size(34, 23)
    img.cornerRadius = 0
  }
  const title = header.addText("Muse")
  title.font = Font.boldSystemFont(15)
  title.textColor = TEXT

  widget.addSpacer(4)

  const quotaLabel = widget.addText("每周额度")
  quotaLabel.font = Font.systemFont(13)
  quotaLabel.textColor = SUB

  widget.addSpacer(2)

  const big = widget.addText("剩余 " + remaining + "%")
  big.font = Font.boldSystemFont(28)
  big.textColor = TEXT

  widget.addSpacer(6)

  const barImg = drawBar(remaining, barWidth)
  const bar = widget.addImage(barImg)
  bar.imageSize = new Size(barDisplayWidth, 7)
  bar.cornerRadius = 3.5

  if (showExtra) {
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
}

function errorWidget() {
  // 报错时用一张全新的卡片，别往画了一半的卡片上接着贴字
  // （v13 的截图里「Muse」出现两次、下面空一大块，就是这么来的）
  const widget = new ListWidget()
  widget.backgroundColor = BG
  widget.url = "hatch://"
  widget.setPadding(10, 14, 8, 14)
  const title = widget.addText("Muse")
  title.font = Font.boldSystemFont(15)
  title.textColor = TEXT
  widget.addSpacer(6)
  const err = widget.addText("暂时拉不到用量数据，等下次刷新再看。")
  err.font = Font.systemFont(12)
  err.textColor = GREY
  return widget
}

async function createWidget() {
  const isMedium = config.widgetFamily === "medium"

  try {
    const data = await loadData()
    if (!data || !data.usage) throw new Error("no data")
    const usage = data.usage || {}
    const icon = await loadIcon()
    const widget = new ListWidget()
    widget.backgroundColor = BG
    widget.url = "hatch://"
    if (isMedium) {
      buildLayout(widget, usage, icon, 640, 320, true)
    } else {
      buildLayout(widget, usage, icon, 260, 130, false)
    }
    return widget
  } catch (e) {
    return errorWidget()
  }
}

async function main() {
  const widget = await createWidget()
  Script.setWidget(widget)
  Script.complete()
}
main()
