# QR Contact Form — 活动联系人收集表单

活动结束后，大家扫码即可提交联系信息。管理员在后台查看所有数据。

**在线地址：** https://qr-contact-form.onrender.com（部署后生效）

---

## 功能

| 页面 | 说明 |
|------|------|
| `/` | 表单页面 — 填写姓名、地区、邮箱、电话、诉求 |
| `/admin` | 后台管理 — 查看所有提交，导出 CSV |
| `/qrcode` | 二维码页面 — 打印贴活动现场 |

后台密码：启动时通过环境变量 `ADMIN_PW` 设置（本地默认 `admin888`）

数据存储：

- 配置 `DATABASE_URL` 时，提交内容会保存到 Supabase/Postgres 数据库，并自动创建 `qr_form_submissions` 表。
- 未配置 `DATABASE_URL` 时，会临时保存到本地 `data/submissions.json`。Render 免费服务重启或重新部署后，本地文件可能丢失，因此生产环境建议配置数据库。

---

## 部署到 Render.com（免费）

Render 是全自助的，你只需要做这 3 步：

**1. 打开 Render**
进入 [render.com](https://render.com) → 点右上角 **Sign In** → 用 GitHub 账号登录（授权一下即可）

**2. 创建 Web Service**
- 点 **New +** → **Web Service**
- 连接 GitHub → 选仓库 **qr-contact-form**
- 页面会自动加载 `render.yaml` 里的配置，检查一下是不是对的

**3. 改密码并部署**
- 在 **Environment Variables** 里，把 `ADMIN_PW` 的值从 `admin888` 改成你自己的密码
- 如果要长期保存提交内容，在 **Environment Variables** 里新增 `DATABASE_URL`，填入 Supabase 的 Postgres 连接字符串
- 点 **Create Web Service**
- 等 2-3 分钟，部署完成后会显示 `https://qr-contact-form.onrender.com`

然后打开 `/admin`，用你设置的密码登录后台。

---

## 本地运行

```bash
cd qr-form
pnpm install
pnpm start
```

- 表单：http://localhost:3000
- 后台：http://localhost:3000/admin  
- 二维码：http://localhost:3000/qrcode

---

## 项目结构

```
qr-form/
├── server.js            # 后端服务（Express）
├── render.yaml          # Render 部署配置
├── package.json
├── public/
│   ├── index.html       # 表单页面
│   ├── admin.html       # 后台管理页面
│   ├── scripts.js       # 表单交互
│   └── styles.css
├── data/
│   └── submissions.json # 提交数据（自动生成）
└── README.md
```

## Supabase 数据库连接

在 Supabase 项目里复制 Postgres connection string，放到 Render 的环境变量：

```text
DATABASE_URL=postgresql://...
```

部署后，服务会自动创建表：

```text
qr_form_submissions
```

后台列表、统计、CSV 导出都会从数据库读取。
