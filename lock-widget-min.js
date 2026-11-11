// Muse 锁屏小组件 v4-min — Scriptable（极简版，排查用）
// 把所有可能卡住的东西都去掉了：没有圆环、没有画图、没有联网。
// 锁屏运行时只读本地缓存；缓存由桌面版小组件或在 App 里点 ▶ 来更新。
// 如果这个版本在锁屏上能显示，就说明之前是画圆环那段卡住了；
// 如果这个也超时，就说明 iOS 根本还没跑新版脚本，需要删了重加。
// 用法：把 muse-lock 里的内容换成这个文件，点一次 ▶，再删了锁屏小组件重加。

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

async function main() {
  let data = null
  if (config.runsInApp) {
    // 在 App 里点 ▶：联网拉新数据并存缓存
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
  if (config.runsInAccessoryWidget) {
    widget.addAccessoryWidgetBackground = true
  }
  const WHITE = new Color("#FFFFFF")
  const DIM = new Color("#FFFFFF", 0.7)
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
    // 长方形：竖着排三行。锁屏上这个格子只有半屏宽（约 170pt），
    // 左右并排根本放不下，之前就是这么被截成「8...」「Muse · W...」的。
    // 竖排每行都够宽，不会再被截。
    widget.setPadding(8, 12, 8, 12)
    const col = widget.addStack()
    col.layoutVertically()
    col.spacing = 1
    const title = col.addText("Muse · Weekly")
    title.font = Font.systemFont(11)
    title.textColor = DIM
    const big = col.addText(hasData ? remaining + "% left" : "点 ▶ 更新")
    big.font = Font.boldSystemFont(22)
    big.textColor = WHITE
    const reset = col.addText(hasData ? "Resets in " + days + "天" : "先在 App 里点 ▶")
    reset.font = Font.systemFont(10)
    reset.textColor = DIM
  }

  widget.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)
  if (config.runsInApp) {
    widget.presentAccessoryRectangular()
  }
  Script.setWidget(widget)
  Script.complete()
}
main()
