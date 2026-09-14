// ===== 表单提交 =====
const form = document.getElementById('contactForm');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();

  if (!name) { markError('name', '请填写您的姓名'); return; }
  clearError('name');

  if (!phone && !email) {
    markError('phone', '请至少留下电话、微信号或邮箱中的一种联系方式'); return;
  }
  clearError('phone');

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    markError('email', '请输入有效的邮箱地址'); return;
  }
  clearError('email');

  const formData = {
    name,
    region: document.getElementById('region').value.trim(),
    email,
    phone,
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
      showSubmissionResult(true, data.message || '提交成功！');
    } else {
      showSubmissionResult(
        false,
        (data.message || '提交失败，请稍后重试') + '。您填写的信息尚未保存，请稍后重试，或添加联络同工微信。'
      );
    }
  } catch (err) {
    showSubmissionResult(
      false,
      '网络连接异常，您填写的信息尚未保存。请检查网络后重试，或添加联络同工微信。'
    );
  } finally {
    setLoading(false);
  }
});

// ===== 校验帮助 =====
function markError(id, msg) {
  const el = document.getElementById(id);
  el.classList.add('input-error');
  el.setAttribute('aria-invalid', 'true');
  const errEl = el.nextElementSibling;
  if (errEl && errEl.classList.contains('error-text')) {
    errEl.textContent = msg;
  }
  el.focus();
}

function clearError(id) {
  const el = document.getElementById(id);
  el.classList.remove('input-error');
  el.setAttribute('aria-invalid', 'false');
  const errEl = el.nextElementSibling;
  if (errEl && errEl.classList.contains('error-text')) {
    errEl.textContent = '';
  }
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

// ===== 提交结果弹窗 =====
function showSubmissionResult(success, msg) {
  const modal = document.getElementById('successModal');
  const icon = document.getElementById('submissionStatusIcon');

  modal.classList.toggle('is-error', !success);
  icon.textContent = success ? '✓' : '!';
  document.getElementById('successTitle').textContent = success ? '提交成功' : '提交未完成';
  document.getElementById('successMsg').textContent = msg;
  document.getElementById('submissionModalButton').textContent = success ? '暂时关闭' : '返回继续提交';
  document.getElementById('successOverlay').classList.remove('hidden');
  modal.classList.remove('hidden');
  modal.focus();
}

function closeSubmissionModal() {
  document.getElementById('successOverlay').classList.add('hidden');
  document.getElementById('successModal').classList.add('hidden');
}

document.getElementById('successOverlay').addEventListener('click', closeSubmissionModal);
