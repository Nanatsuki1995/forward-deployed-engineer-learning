# AI 协作开发规范

## 核心任务
- 开发一个支持高并发的 Markdown 解析服务。

## 运行 Loop 机制 (Agent Loop Protocol)
1. **Plan：** 修改任何代码前，必须先在终端运行现有的测试集 `npm test`。
2. **Execute：** 编写或修改代码。
3. **Observe：** 运行测试，如果报错，必须读取具体的 Error Log，禁止直接向用户提问。
4. **Iterate：** 根据错误日志自动修正代码，直到测试完全通过（Pass）再进入下一个功能点。
5. **Human-in-the-Loop：** 只有连续遭遇 3 次相同的编译错误，或者需要修改 `package.json` 的核心依赖时，才允许暂停 Loop 并向人类求助。