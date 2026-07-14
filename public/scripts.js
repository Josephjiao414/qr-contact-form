// ===== 表单提交 =====
const form = document.getElementById('contactForm');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();

  if (!name) { markError('name', '请填写您的姓名'); return; }
  clearError('name');

  if (!email) { markError('email', '请填写您的邮箱'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    markError('email', '请输入有效的邮箱地址'); return;
  }
  clearError('email');

  const formData = {
    name,
    region: document.getElementById('region').value.trim(),
    email,
    phone: document.getElementById('phone').value.trim(),
    message: document.getElementById('message').value.trim()
  };

  setLoading(true);

  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (data.success) {
      form.reset();
      showSuccess(data.message || '提交成功！');
    } else {
      alert(data.message || '提交失败，请稍后重试');
    }
  } catch (err) {
    alert('网络错误，请检查连接后重试');
  } finally {
    setLoading(false);
  }
});

// ===== 校验帮助 =====
function markError(id, msg) {
  const el = document.getElementById(id);
  el.classList.add('input-error');
  const errEl = el.nextElementSibling;
  if (errEl && errEl.classList.contains('error-text')) {
    errEl.textContent = msg;
  }
  el.focus();
}

function clearError(id) {
  document.getElementById(id).classList.remove('input-error');
}

document.querySelectorAll('input, textarea').forEach(el => {
  el.addEventListener('input', () => el.classList.remove('input-error'));
});

// ===== Loading =====
function setLoading(v) {
  submitBtn.disabled = v;
  btnText.classList.toggle('hidden', v);
  btnSpinner.classList.toggle('hidden', !v);
}

// ===== 成功弹窗 =====
function showSuccess(msg) {
  document.getElementById('successMsg').textContent = msg;
  document.getElementById('successOverlay').classList.remove('hidden');
  document.getElementById('successModal').classList.remove('hidden');
}

function closeSuccess() {
  document.getElementById('successOverlay').classList.add('hidden');
  document.getElementById('successModal').classList.add('hidden');
}

document.getElementById('successOverlay').addEventListener('click', closeSuccess);
