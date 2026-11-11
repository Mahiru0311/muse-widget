// Muse 锁屏小组件 v1 — Scriptable
// 锁屏版，和桌面版分开的脚本：桌面版是 usage-widget.js（小/中尺寸），
// 这个只做锁屏，尺寸完全不同，锁屏只有三种：圆形、长方形、一行。
// 样式按用户给的图片（右边那块）：圆环 + Muse · Weekly + XX% left + Resets in X天。
// 数据和桌面版同一份：https://raw.githubusercontent.com/Mahiru0311/muse-widget/main/muse-widget.json
// 每次拉数据都带 ?t=时间戳，防缓存。
// 锁屏小组件颜色是系统染色的，所以这里只用白色，iOS 会按壁纸给你染成合适的颜色。
// 用法：Scriptable 里新建一个脚本（建议叫 muse-lock），把本文件全部内容粘贴进去，
// 点 ▶ 看预览；然后长按锁屏 → 自定 → 添加小组件 → 选 Scriptable → 选长方形/圆形/一行，
// Script 选 muse-lock 即可。桌面版不用动。

const DATA_URL = "https://raw.githubusercontent.com/Mahiru0311/muse-widget/main/muse-widget.json"

async function loadData() {
  const req = new Request(DATA_URL + "?t=" + Date.now())
  req.headers = { "Cache-Control": "no-cache" }
  return await req.loadJSON()
}

function daysToReset(iso) {
  if (!iso) return "—"
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86400000))
}

// 圆环：remaining% 是白色实线弧，剩下的是半透明底圈
function drawRing(remaining, size) {
  const ctx = new DrawContext()
  ctx.size = new Size(size, size)
  ctx.opaque = false
  ctx.respectScreenScale = true
  const center = new Point(size / 2, size / 2)
  const radius = size / 2 - 4
  ctx.setLineWidth(5)
  // 底圈
  ctx.setStrokeColor(new Color("#FFFFFF", 0.3))
  const track = new Path()
  track.addEllipse(new Rect(4, 4, size - 8, size - 8))
  ctx.addPath(track)
  ctx.strokePath()
  // 进度弧：从顶部开始，顺时针
  if (remaining > 0) {
    ctx.setStrokeColor(new Color("#FFFFFF"))
    const arc = new Path()
    const start = -Math.PI / 2
    const end = start + (Math.max(0, Math.min(100, remaining)) / 100) * Math.PI * 2
    arc.addArc(center, radius, start, end, false)
    ctx.addPath(arc)
    ctx.strokePath()
  }
  return ctx.getImage()
}

async function createWidget() {
  const widget = new ListWidget()
  widget.url = "hatch://"
  const family = config.widgetFamily
  const isAccessory = config.runsInAccessoryWidget
  if (isAccessory) {
    widget.addAccessoryWidgetBackground = true
  }

  let remaining = 0
  let days = "—"
  try {
    const data = await loadData()
    const usage = data.usage || {}
    remaining = usage.weekly_percent_remaining ?? 0
    days = daysToReset(usage.weekly_reset_at)
  } catch (e) {
    remaining = 0
    days = "—"
  }

  const WHITE = new Color("#FFFFFF")
  const DIM = new Color("#FFFFFF", 0.7)

  if (family === "accessoryCircular") {
    // 圆形：只放一个大百分比（圆环叠字在 Scriptable 里排不准，圆形就用最简单的）
    widget.setPadding(0, 0, 0, 0)
    const pct = widget.addText(remaining + "%")
    pct.font = Font.boldSystemFont(20)
    pct.textColor = WHITE
    pct.centerAlignText()
    const label = widget.addText("Muse")
    label.font = Font.systemFont(10)
    label.textColor = DIM
    label.centerAlignText()
  } else if (family === "accessoryInline") {
    // 一行：Muse 剩余 86% · 6天后重置
    widget.setPadding(0, 0, 0, 0)
    const text = widget.addText("Muse 剩余 " + remaining + "% · " + days + "天后重置")
    text.font = Font.systemFont(14)
    text.textColor = WHITE
  } else {
    // 长方形（默认，也是图片里那个样式）：左圆环，右三行字
    widget.setPadding(8, 12, 8, 12)
    const row = widget.addStack()
    row.centerAlignContent()
    row.spacing = 12
    const ringImg = drawRing(remaining, 56)
    const ring = row.addImage(ringImg)
    ring.imageSize = new Size(56, 56)
    const col = row.addStack()
    col.layoutVertically()
    col.spacing = 1
    const title = col.addText("Muse · Weekly")
    title.font = Font.systemFont(12)
    title.textColor = DIM
    const big = col.addText(remaining + "% left")
    big.font = Font.boldSystemFont(24)
    big.textColor = WHITE
    const reset = col.addText("Resets in " + days + "天")
    reset.font = Font.systemFont(11)
    reset.textColor = DIM
  }

  return widget
}

async function main() {
  const widget = await createWidget()
  if (config.runsInApp) {
    // 在 Scriptable 里点 ▶ 时看长方形预览
    widget.presentAccessoryRectangular()
  }
  Script.setWidget(widget)
  Script.complete()
}
main()
