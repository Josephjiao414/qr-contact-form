const express = require('express');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PW || 'admin888';
const DATA_FILE = path.join(__dirname, 'data', 'submissions.json');
const DATABASE_URL = process.env.DATABASE_URL;
const TABLE_NAME = 'qr_form_submissions';
const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : null;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 确保数据目录和文件存在
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

function getSubmissions() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}

function normalizeSubmission(row) {
  return {
    id: row.id,
    name: row.name,
    region: row.region || '',
    email: row.email,
    phone: row.phone || '',
    message: row.message || '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : row.createdAt
  };
}

async function ensureDatabase() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      region TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function saveSubmission(data) {
  const list = getSubmissions();
  data.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  data.createdAt = new Date().toISOString();
  list.push(data);
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf8');
  return data;
}

async function saveSubmissionToDatabase(data) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const result = await pool.query(
    `INSERT INTO ${TABLE_NAME} (id, name, region, email, phone, message)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, region, email, phone, message, created_at`,
    [id, data.name, data.region, data.email, data.phone, data.message]
  );
  return normalizeSubmission(result.rows[0]);
}

async function listSubmissions() {
  if (!pool) return getSubmissions().reverse();

  const result = await pool.query(
    `SELECT id, name, region, email, phone, message, created_at
     FROM ${TABLE_NAME}
     ORDER BY created_at DESC`
  );
  return result.rows.map(normalizeSubmission);
}

async function getStats() {
  if (!pool) {
    const list = getSubmissions();
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = list.filter(s => s.createdAt && s.createdAt.slice(0, 10) === today).length;
    return { total: list.length, today: todayCount };
  }

  const result = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int AS today
    FROM ${TABLE_NAME}
  `);
  return result.rows[0];
}

async function clearSubmissions() {
  if (!pool) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
    return;
  }

  await pool.query(`DELETE FROM ${TABLE_NAME}`);
}

// 密码校验中间件
function requireAdmin(req, res, next) {
  const pw = req.query.pw || req.headers['x-admin-pw'];
  if (pw === ADMIN_PASSWORD) return next();
  return res.status(401).json({ error: '密码错误' });
}

// ===== 公开 API =====

app.post('/api/submit', async (req, res) => {
  const { name, region, email, phone, message } = req.body;
  if (!name || !name.trim()) return res.json({ success: false, message: '请填写姓名' });
  if (!email || !email.trim()) return res.json({ success: false, message: '请填写邮箱' });

  try {
    const data = {
      name: name.trim(), region: (region || '').trim(),
      email: email.trim(), phone: (phone || '').trim(),
      message: (message || '').trim()
    };
    const submission = pool
      ? await saveSubmissionToDatabase(data)
      : saveSubmission(data);

    res.json({ success: true, message: '提交成功！感谢您的参与', id: submission.id });
  } catch (err) {
    console.error('保存提交失败:', err);
    res.status(500).json({ success: false, message: '提交失败，请稍后重试' });
  }
});

// ===== 后台 API（需密码） =====

app.get('/api/admin/submissions', requireAdmin, async (req, res) => {
  try {
    res.json(await listSubmissions());
  } catch (err) {
    console.error('读取提交失败:', err);
    res.status(500).json({ error: '读取提交失败' });
  }
});

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    res.json(await getStats());
  } catch (err) {
    console.error('读取统计失败:', err);
    res.status(500).json({ error: '读取统计失败' });
  }
});

app.get('/api/admin/export', requireAdmin, async (req, res) => {
  const list = await listSubmissions();
  const header = '姓名,地区,邮箱,电话,问题与诉求,提交时间';
  const rows = list.map(s =>
    '"' + [s.name, s.region||'', s.email, s.phone||'', (s.message||'').replace(/"/g,'""'), s.createdAt||'']
      .map(v => v.replace(/"/g, '""')).join('","') + '"'
  );
  const csv = '\uFEFF' + header + '\n' + rows.join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=submissions_' + new Date().toISOString().slice(0,10) + '.csv');
  res.send(csv);
});

app.post('/api/admin/verify', (req, res) => {
  res.json({ success: req.body.password === ADMIN_PASSWORD });
});

app.delete('/api/admin/clear', requireAdmin, async (req, res) => {
  try {
    await clearSubmissions();
    res.json({ success: true });
  } catch (err) {
    console.error('清除提交失败:', err);
    res.status(500).json({ success: false });
  }
});

// ===== 后台页面（受密码保护） =====

app.get('/admin', (req, res) => {
  // 如果 URL 带 ?pw=xxx 并且密码正确，直接进入面板
  const preAuth = (req.query.pw === ADMIN_PASSWORD) ? ADMIN_PASSWORD : '';
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ===== 二维码页面 =====

app.get('/qrcode', async (req, res) => {
  try {
    const QRCode = require('qrcode');
    const url = req.protocol + '://' + req.get('host');
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 400, margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' }
    });

    res.send('<!DOCTYPE html>' +
'<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">' +
'<title>扫码访问</title>' +
'<style>' +
'*{margin:0;padding:0;box-sizing:border-box}' +
'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;background:#f0f2f5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}' +
'.card{background:#fff;border-radius:12px;box-shadow:0 10px 25px -5px rgba(0,0,0,.1);padding:40px 32px;text-align:center;max-width:400px;width:100%}' +
'h1{font-size:1.25rem;margin-bottom:4px;color:#1a1a2e}' +
'p{color:#6b7280;font-size:.875rem;margin-bottom:24px}' +
'.qr-wrap{background:#fff;border-radius:12px;padding:16px;display:inline-block;box-shadow:0 1px 3px rgba(0,0,0,.08)}' +
'.qr-wrap img{display:block;width:240px;height:240px;margin:0 auto}' +
'.url-text{margin-top:20px;font-size:.8125rem;color:#9ca3af;word-break:break-all}' +
'.url-text a{color:#1a1a2e;text-decoration:none}' +
'.url-text a:hover{text-decoration:underline}' +
'.btn{display:inline-block;margin-top:24px;padding:10px 24px;background:#1a1a2e;color:#fff;border:none;border-radius:8px;font-size:.9375rem;font-weight:600;text-decoration:none;cursor:pointer}' +
'.btn:hover{background:#16213e}' +
'.admin-link{display:block;margin-top:16px;font-size:.75rem;color:#9ca3af}' +
'.admin-link a{color:#9ca3af;text-decoration:none}' +
'.admin-link a:hover{color:#1a1a2e}' +
'</style></head><body>' +
'<div class="card">' +
  '<h1>扫描二维码打开表单</h1>' +
  '<p>用手机相机或扫码工具扫描</p>' +
  '<div class="qr-wrap"><img src="' + qrDataUrl + '" alt="QR Code"></div>' +
  '<div class="url-text">或访问 <a href="' + url + '" target="_blank">' + url + '</a></div>' +
  '<a href="/" class="btn">打开表单</a>' +
  '<div class="admin-link">管理员：<a href="/admin" target="_blank">后台入口</a></div>' +
'</div></body></html>');
  } catch (err) {
    res.status(500).send('二维码生成失败');
  }
});

// ===== 启动 =====
ensureDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  -> QR Form 服务已启动');
  console.log('  -> 数据存储: ' + (pool ? 'Supabase/Postgres 数据库' : '本地 JSON 文件'));
  console.log('  -> 表单: http://localhost:' + PORT);
  console.log('  -> 后台: http://localhost:' + PORT + '/admin');
  console.log('  -> 密码: ' + ADMIN_PASSWORD);
  console.log('  -> 二维码: http://localhost:' + PORT + '/qrcode');
  console.log('');

  const os = require('os');
  const ifs = os.networkInterfaces();
  for (const name of Object.keys(ifs)) {
    for (const iface of ifs[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log('  局域网: http://' + iface.address + ':' + PORT);
      }
    }
  }
  console.log('');
  });
}).catch((err) => {
  console.error('数据库初始化失败:', err);
  process.exit(1);
});
