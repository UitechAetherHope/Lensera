// Register.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { persistAuth, registerAccount, sendEmailCode } from './api/auth';

export default function Register() {
  const [registerType, setRegisterType] = useState('account');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [sendCooldown, setSendCooldown] = useState(0);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (sendCooldown <= 0) return undefined;
    const t = setInterval(() => setSendCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [sendCooldown]);

  async function handleSendRegisterCode() {
    setError('');
    if (!email.trim()) {
      setError('请先填写邮箱');
      return;
    }
    try {
      await sendEmailCode(email.trim(), 'REGISTER');
      setSendCooldown(60);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || '发送失败';
      setError(msg);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    if (registerType === 'phone') {
      setError('手机号注册功能尚未开放，请使用账号注册');
      return;
    }
    if (!agree) {
      setError('请先阅读并同意用户协议与隐私政策');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    try {
      const res = await registerAccount(userName, email, password, confirmPassword, emailCode.trim());
      if (res?.data) persistAuth(res.data);
      navigate('/editor/home');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || '注册失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-visual">
        <div className="visual-content">
          <h1 className="visual-title">
            用镜头记录世界<br />用影像讲述故事
          </h1>
          <p className="visual-desc">注册账号，开启你的摄影之旅</p>
          <p className="visual-footer">
            摄影是光与影的艺术<br />也是心灵与世界的对话
          </p>
        </div>
      </div>

      <div className="login-form-wrapper">
        <div className="login-form">
          <h2 className="form-title">创建账号</h2>
          <p className="form-subtitle">注册后可发布作品、分享摄影心得</p>

          <div className="login-type-tabs">
            <button
              type="button"
              className={`tab-btn ${registerType === 'account' ? 'active' : ''}`}
              onClick={() => { setRegisterType('account'); setError(''); }}
            >
              账号注册
            </button>
            <button
              type="button"
              className={`tab-btn ${registerType === 'phone' ? 'active' : ''}`}
              onClick={() => { setRegisterType('phone'); setError(''); }}
            >
              手机号注册
            </button>
          </div>

          <form className="login-form-stack" onSubmit={handleRegister}>
            <div className="form-fields">
              {registerType === 'account' && (
                <>
                  <div className="input-group">
                    <label className="input-icon">👤</label>
                    <input
                      type="text"
                      placeholder="用户名"
                      className="form-input"
                      value={userName}
                      onChange={(ev) => setUserName(ev.target.value)}
                      autoComplete="username"
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-icon">✉️</label>
                    <input
                      type="email"
                      placeholder="邮箱"
                      className="form-input"
                      value={email}
                      onChange={(ev) => setEmail(ev.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  <div className="input-group verify-code">
                    <label className="input-icon">✉️</label>
                    <input
                      type="text"
                      placeholder="邮箱验证码"
                      className="form-input"
                      value={emailCode}
                      onChange={(ev) => setEmailCode(ev.target.value)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                    />
                    <button
                      type="button"
                      className="get-code-btn"
                      disabled={sendCooldown > 0}
                      onClick={handleSendRegisterCode}
                    >
                      {sendCooldown > 0 ? `${sendCooldown}s` : '获取验证码'}
                    </button>
                  </div>
                </>
              )}

              {registerType === 'phone' && (
                <>
                  <div className="input-group">
                    <label className="input-icon">📱</label>
                    <input type="tel" placeholder="手机号" className="form-input" disabled />
                  </div>
                  <div className="input-group verify-code">
                    <label className="input-icon">✉️</label>
                    <input type="text" placeholder="验证码" className="form-input" disabled />
                    <button type="button" className="get-code-btn" disabled>获取验证码</button>
                  </div>
                </>
              )}

              <div className="input-group">
                <label className="input-icon">🔒</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="设置密码"
                  className="form-input"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <div className="input-group">
                <label className="input-icon">🔒</label>
                <input
                  type={showConfirmPwd ? 'text' : 'password'}
                  placeholder="确认密码"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(ev) => setConfirmPassword(ev.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                >
                  {showConfirmPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error ? <p className="form-error-msg">{error}</p> : null}

            <div className="form-options">
              <label className="remember-checkbox">
                <input type="checkbox" checked={agree} onChange={(ev) => setAgree(ev.target.checked)} />
                <span className="checkbox-label">同意《用户协议》和《隐私政策》</span>
              </label>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? '提交中…' : '注册'}
            </button>
          </form>

          <div className="register-guide">
            已有账号？
            <a href="javascript:void(0)" className="register-link" onClick={() => navigate('/login')}>
              立即登录
            </a> →
          </div>
        </div>
      </div>
    </div>
  );
}
