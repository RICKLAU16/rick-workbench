# Rick工作台

个人工作台静态网页应用。电脑端与手机端同一入口，自动适配。

- 数据保存在本机浏览器 localStorage，无后端、无账号
- 可选 AI：内置规则引擎（免费）+ DeepSeek/Kimi BYOK
- 部署：GitHub Pages

## 本地运行

```bash
python -m http.server 8899
# 打开 http://localhost:8899
```

## 测试

```bash
node smoke-test.cjs        # 三尺寸适配 + 全路由渲染
node interaction-test.cjs  # 核心交互链路
```
