# QR Form — 活动联系人收集表单

活动结束后，大家扫码即可提交联系信息。你可以在后台查看所有收集到的数据。

## 使用方式

### 本地运行

```bash
pnpm install
pnpm start
```

然后打开：
- **表单页面**：http://localhost:3000
- **后台管理**：http://localhost:3000/admin （默认密码：`admin888`）
- **二维码**：http://localhost:3000/qrcode

### 部署到 Render.com（免费）

1. 把项目推送到 GitHub 仓库
2. 打开 [render.com](https://render.com) → 注册/登录
3. 点击 **New +** → **Web Service**
4. 连接你的 GitHub 仓库
5. 设置：
   - **Name**: `qr-form`（或你喜欢的名字）
   - **Environment**: `Node`
   - **Build Command**: `pnpm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
6. 在 **Environment Variables** 中设置：
   - `ADMIN_PW`：你的后台密码（不要用默认的 `admin888`）
7. 点击 **Create Web Service**
8. 等几分钟部署完成，会得到一个 `https://qr-form.onrender.com` 样的网址

部署后：
- `https://你的服务名.onrender.com` — 表单页面
- `https://你的服务名.onrender.com/admin` — 后台管理
- `https://你的服务名.onrender.com/qrcode` — 二维码

## 后台密码

- 本地运行默认密码：`admin888`
- 部署到服务器时，通过环境变量 `ADMIN_PW` 设置自定义密码
- 后台入口：`/admin`

## 项目结构

```
qr-form/
├── server.js          # 后端服务
├── package.json       # 项目配置
├── public/
│   ├── index.html     # 表单页面
│   ├── styles.css     # 样式
│   └── scripts.js     # 前端交互
├── data/
│   └── submissions.json  # 提交数据（自动生成）
└── README.md
```
