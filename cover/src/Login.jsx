// Login.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { loginAccount, loginEmailCode, persistAuth, sendEmailCode } from './api/auth';

export default function Login() {
  const [loginType, setLoginType] = useState('account');
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [emailForCode, setEmailForCode] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [sendCooldown, setSendCooldown] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (sendCooldown <= 0) return undefined;
    const t = setInterval(() => setSendCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [sendCooldown]);

  async function handleSendLoginCode() {
    setError('');
    if (!emailForCode.trim()) {
      setError('请先填写邮箱');
      return;
    }
    try {
      await sendEmailCode(emailForCode.trim(), 'LOGIN');
      setSendCooldown(60);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || '发送失败';
      setError(msg);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    if (loginType === 'phone') {
      setError('手机号登录功能尚未开放，请使用账号登录');
      return;
    }
    setLoading(true);
    try {
      let res;
      if (loginType === 'emailcode') {
        res = await loginEmailCode(emailForCode.trim(), emailCode.trim());
      } else {
        res = await loginAccount(identifier, password);
      }
      if (res?.data) persistAuth(res.data);
      navigate('/editor/home');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || '登录失败';
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
          <p className="visual-desc">登录后，探索更多精彩内容</p>
          <p className="visual-footer">
            摄影是光与影的艺术<br />也是心灵与世界的对话
          </p>
        </div>
      </div>

      <div className="login-form-wrapper">
        <div className="login-form">
          <h2 className="form-title">欢迎回来</h2>
          <p className="form-subtitle">登录你的账号，继续你的摄影之旅</p>

          <div className="login-type-tabs">
            <button
              type="button"
              className={`tab-btn ${loginType === 'account' ? 'active' : ''}`}
              onClick={() => { setLoginType('account'); setError(''); }}
            >
              账号登录
            </button>
            <button
              type="button"
              className={`tab-btn ${loginType === 'emailcode' ? 'active' : ''}`}
              onClick={() => { setLoginType('emailcode'); setError(''); }}
            >
              邮箱验证码
            </button>
            <button
              type="button"
              className={`tab-btn ${loginType === 'phone' ? 'active' : ''}`}
              onClick={() => { setLoginType('phone'); setError(''); }}
            >
              手机号登录
            </button>
          </div>

          <form className="login-form-stack" onSubmit={handleLogin}>
            <div className="form-fields">
              {loginType === 'account' && (
                <>
                  <div className="input-group">
                    <label className="input-icon">👤</label>
                    <input
                      type="text"
                      placeholder="邮箱/用户名"
                      className="form-input"
                      value={identifier}
                      onChange={(ev) => setIdentifier(ev.target.value)}
                      autoComplete="username"
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-icon">🔒</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="密码"
                      className="form-input"
                      value={password}
                      onChange={(ev) => setPassword(ev.target.value)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </>
              )}

              {loginType === 'emailcode' && (
                <>
                  <div className="input-group">
                    <label className="input-icon">✉️</label>
                    <input
                      type="email"
                      placeholder="注册邮箱"
                      className="form-input"
                      value={emailForCode}
                      onChange={(ev) => setEmailForCode(ev.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  <div className="input-group verify-code">
                    <label className="input-icon">🔢</label>
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
                      onClick={handleSendLoginCode}
                    >
                      {sendCooldown > 0 ? `${sendCooldown}s` : '获取验证码'}
                    </button>
                  </div>
                </>
              )}

              {loginType === 'phone' && (
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
            </div>

            {error ? <p className="form-error-msg">{error}</p> : null}

            <div className="form-options">
              <label className="remember-checkbox">
                <input type="checkbox" />
                <span className="checkbox-label">记住我</span>
              </label>
              <a href="#" className="forgot-password" onClick={(e) => e.preventDefault()}>忘记密码？</a>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? '登录中…' : '登录'}
            </button>
          </form>

          <div className="other-login">
            <div className="divider">
              <span>其他登录方式</span>
            </div>
            <div className="social-login">
              <button type="button" className="social-btn google">🟢</button>
              <button type="button" className="social-btn apple">⚪</button>
              <button type="button" className="social-btn wechat">🟢</button>
              <button type="button" className="social-btn qq">🔵</button>
            </div>
          </div>

          <div className="register-guide">
            还没有账号？
            <a
              href="javascript:void(0)"
              className="register-link"
              onClick={() => navigate('/register')}
            >
              立即注册
            </a> →
          </div>
        </div>
      </div>
    </div>
  );
}
