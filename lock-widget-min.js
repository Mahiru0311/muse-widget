// Muse 锁屏小组件 v6 — Scriptable
// v6 改动：按用户反馈修两点。
// 1) 背景改透明：之前 widget.addAccessoryWidgetBackground = true，
//    iOS 会给它套一层磨砂底，看着像块模糊的板子。去掉之后背景全透，
//    字直接印在壁纸上，和参考图那种通透感一样。
//    代价：壁纸亮的地方白字会淡一点，这是通透版的取舍，
//    Scriptable 做不出参考图那种原生 App 的深色卡片底。
// 2) 好看一点：把圆环加回来（小圆环 + 大百分比），下面再加一条细进度条，
//    和参考图右边那块、还有左边电量条的感觉一样。
// 锁屏运行时依然不联网，只读本地缓存；缓存由桌面版小组件或在 App 里点 ▶ 来更新。

const CACHE_FILE = "muse-widget-cache.json"

function readCache() {
  try {
    const fm = FileManager.local()
    const path = fm.joinPath(fm.documentsDirectory(), CACHE_FILE)
    if (!fm.fileExists(path)) return null
    return JSON.parse(fm.readString(path))
  } catch (e) {
    return null
  }
}

function daysToReset(iso) {
  if (!iso) return "—"
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86400000))
}

function drawRing(remaining, size) {
  const ctx = new DrawContext()
  ctx.size = new Size(size, size)
  ctx.opaque = false
  ctx.respectScreenScale = true
  const center = new Point(size / 2, size / 2)
  const radius = size / 2 - 4
  ctx.setLineWidth(4)
  ctx.setStrokeColor(new Color("#FFFFFF", 0.35))
  const track = new Path()
  track.addEllipse(new Rect(4, 4, size - 8, size - 8))
  ctx.addPath(track)
  ctx.strokePath()
  if (remaining > 0) {
    // 注意：Path 没有 addArc！弧线用很多小线段拼出来（addLines 真实存在）。
    const start = -Math.PI / 2
    const end = start + (Math.max(0, Math.min(100, remaining)) / 100) * Math.PI * 2
    const steps = Math.max(2, Math.ceil(Math.abs(end - start) / (Math.PI / 60)))
    const pts = []
    for (let i = 0; i <= steps; i++) {
      const a = start + (end - start) * i / steps
      pts.push(new Point(center.x + radius * Math.cos(a), center.y + radius * Math.sin(a)))
    }
    ctx.setStrokeColor(new Color("#FFFFFF"))
    const arc = new Path()
    arc.addLines(pts)
    ctx.addPath(arc)
    ctx.strokePath()
  }
  return ctx.getImage()
}

function drawBar(remaining, width, height) {
  const ctx = new DrawContext()
  ctx.size = new Size(width, height)
  ctx.opaque = false
  ctx.respectScreenScale = true
  ctx.setFillColor(new Color("#FFFFFF", 0.35))
  const track = new Path()
  track.addRoundedRect(new Rect(0, 0, width, height), height / 2, height / 2)
  ctx.addPath(track)
  ctx.fillPath()
  if (remaining > 0) {
    ctx.setFillColor(new Color("#FFFFFF"))
    const fill = new Path()
    const w = Math.max(height, (width * Math.max(0, Math.min(100, remaining))) / 100)
    fill.addRoundedRect(new Rect(0, 0, w, height), height / 2, height / 2)
    ctx.addPath(fill)
    ctx.fillPath()
  }
  return ctx.getImage()
}

async function main() {
  let data = null
  if (config.runsInApp) {
    try {
      const req = new Request("https://raw.githubusercontent.com/Mahiru0311/muse-widget/main/muse-widget.json?t=" + Date.now())
      req.timeoutInterval = 10
      data = await req.loadJSON()
      const fm = FileManager.local()
      fm.writeString(fm.joinPath(fm.documentsDirectory(), CACHE_FILE), JSON.stringify(data))
    } catch (e) {
      data = readCache()
    }
  } else {
    data = readCache()
  }

  const usage = (data && data.usage) || {}
  const remaining = usage.weekly_percent_remaining ?? 0
  const days = daysToReset(usage.weekly_reset_at)
  const hasData = !!(data && data.usage)

  const widget = new ListWidget()
  widget.url = "hatch://"
  // 背景全透：不加系统磨砂底
  widget.backgroundColor = new Color("#000000", 0)
  const WHITE = new Color("#FFFFFF")
  const DIM = new Color("#FFFFFF", 0.75)
  const family = config.widgetFamily

  if (family === "accessoryCircular") {
    widget.setPadding(0, 0, 0, 0)
    const pct = widget.addText(hasData ? remaining + "%" : "—")
    pct.font = Font.boldSystemFont(20)
    pct.textColor = WHITE
    pct.centerAlignText()
    const label = widget.addText("Muse")
    label.font = Font.systemFont(10)
    label.textColor = DIM
    label.centerAlignText()
  } else if (family === "accessoryInline") {
    widget.setPadding(0, 0, 0, 0)
    const text = widget.addText(hasData ? "Muse 剩余 " + remaining + "% · " + days + "天后重置" : "Muse · 点 ▶ 更新")
    text.font = Font.systemFont(14)
    text.textColor = WHITE
  } else {
    // 长方形：上行小圆环 + 大百分比，中行细进度条，下行一行小字
    widget.setPadding(8, 12, 8, 12)
    const row = widget.addStack()
    row.centerAlignContent()
    row.spacing = 8
    const ringImg = drawRing(remaining, 34)
    const ring = row.addImage(ringImg)
    ring.imageSize = new Size(34, 34)
    const big = row.addText(hasData ? remaining + "% left" : "点 ▶ 更新")
    big.font = Font.boldSystemFont(20)
    big.textColor = WHITE
    widget.addSpacer(4)
    const barImg = drawBar(remaining, 140, 5)
    const bar = widget.addImage(barImg)
    bar.imageSize = new Size(140, 5)
    widget.addSpacer(4)
    const sub = widget.addText(hasData ? "Muse · Weekly · " + days + "天后重置" : "先在 App 里点 ▶")
    sub.font = Font.systemFont(10)
    sub.textColor = DIM
  }

  widget.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)
  if (config.runsInApp) {
    widget.presentAccessoryRectangular()
  }
  Script.setWidget(widget)
  Script.complete()
}
main()
