// Muse 锁屏小组件 v3 — Scriptable
// v3 改动：锁屏上还是超时，说明问题不在超时设多长，
// 而是锁屏给脚本的时间实在太短，任何网络请求都可能超。
// 改法：锁屏运行时完全不联网，只读本地缓存，秒出结果。
// 缓存由两种方式更新：
//   1) 桌面版小组件（usage-widget.js v12）每次刷新都会存一份；
//   2) 在 Scriptable 里点这个脚本的 ▶（在 App 里跑，时间宽裕），会联网拉新数据并存缓存。
// 所以装好后先在 App 里点一次 ▶，再把锁屏小组件删了重加一次，
// 让 iOS 跑新版脚本。之后桌面版每 15 分钟刷新一次，缓存就一直是新的。

const DATA_URL = "https://raw.githubusercontent.com/Mahiru0311/muse-widget/main/muse-widget.json"
const CACHE_FILE = "muse-widget-cache.json"

function cachePath() {
  const fm = FileManager.local()
  return fm.joinPath(fm.documentsDirectory(), CACHE_FILE)
}

function readCache() {
  try {
    const fm = FileManager.local()
    const path = cachePath()
    if (!fm.fileExists(path)) return null
    return JSON.parse(fm.readString(path))
  } catch (e) {
    return null
  }
}

function saveCache(data) {
  try {
    FileManager.local().writeString(cachePath(), JSON.stringify(data))
  } catch (e) {}
}

async function fetchAndSave() {
  const req = new Request(DATA_URL + "?t=" + Date.now())
  req.headers = { "Cache-Control": "no-cache" }
  req.timeoutInterval = 10
  const data = await req.loadJSON()
  saveCache(data)
  return data
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
  ctx.setStrokeColor(new Color("#FFFFFF", 0.3))
  const track = new Path()
  track.addEllipse(new Rect(4, 4, size - 8, size - 8))
  ctx.addPath(track)
  ctx.strokePath()
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

function buildWidget(data) {
  const widget = new ListWidget()
  widget.url = "hatch://"
  const family = config.widgetFamily
  if (config.runsInAccessoryWidget) {
    widget.addAccessoryWidgetBackground = true
  }

  const usage = (data && data.usage) || {}
  const remaining = usage.weekly_percent_remaining ?? 0
  const days = daysToReset(usage.weekly_reset_at)
  const hasData = !!(data && data.usage)

  const WHITE = new Color("#FFFFFF")
  const DIM = new Color("#FFFFFF", 0.7)

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
    // 长方形：上行是小圆环 + 大百分比，下行是一行小字。
    // 锁屏上这个格子只有半屏宽（约 170pt），之前左右并排三行字
    // 会被截成「8...」「Muse · W...」，所以圆环改小、字改小、改两行。
    widget.setPadding(8, 12, 8, 12)
    const row = widget.addStack()
    row.centerAlignContent()
    row.spacing = 8
    const ringImg = drawRing(remaining, 36)
    const ring = row.addImage(ringImg)
    ring.imageSize = new Size(36, 36)
    const big = row.addText(hasData ? remaining + "% left" : "点 ▶ 更新")
    big.font = Font.boldSystemFont(20)
    big.textColor = WHITE
    const sub = widget.addText(hasData ? "Muse · Weekly · " + days + "天后重置" : "先在 App 里点 ▶")
    sub.font = Font.systemFont(10)
    sub.textColor = DIM
  }

  widget.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)
  return widget
}

async function main() {
  let data = null
  if (config.runsInApp) {
    // 在 App 里点 ▶：时间宽裕，联网拉新数据并存缓存，再看预览
    try {
      data = await fetchAndSave()
    } catch (e) {
      data = readCache()
    }
  } else {
    // 在锁屏/桌面小组件里：不联网，只读缓存，秒出
    data = readCache()
  }
  const widget = buildWidget(data)
  if (config.runsInApp) {
    widget.presentAccessoryRectangular()
  }
  Script.setWidget(widget)
  Script.complete()
}
main()
