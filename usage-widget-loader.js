// Muse 用量小组件 — 自动更新版 loader
// 只粘贴一次，以后改样式不用再从 Muse 这里下载、粘贴。
// 原理：每次小组件刷新时，先从 GitHub 仓库拉最新版 usage-widget.js 再执行。
// 数据本身也是自动的：Muse 每 15 分钟更新 muse-widget.json。
// 用法：Scriptable 里新建一个脚本（建议也叫 usage-widget），
// 把本文件全部内容粘贴进去，保存。主屏幕小组件选这个脚本。
// 注意：如果手机没网，loader 拉不到最新代码，会显示一行提示，
// 等有网了 iOS 下次刷新就恢复。旧版 usage-widget.js 可以留着当备份。

const SCRIPT_URL = "https://raw.githubusercontent.com/Mahiru0311/muse-widget/main/usage-widget.js"

async function main() {
  try {
    const req = new Request(SCRIPT_URL + "?t=" + Date.now())
    req.headers = { "Cache-Control": "no-cache" }
    const code = await req.loadString()
    await eval(code)
  } catch (e) {
    const widget = new ListWidget()
    widget.backgroundColor = new Color("#FFFFFF")
    widget.setPadding(12, 14, 12, 14)
    const title = widget.addText("Muse")
    title.font = Font.boldSystemFont(16)
    widget.addSpacer(6)
    const err = widget.addText("暂时拉不到最新脚本，等有网了再刷新。")
    err.font = Font.systemFont(12)
    err.textColor = new Color("#8E8E93")
    Script.setWidget(widget)
    Script.complete()
  }
}
main()
