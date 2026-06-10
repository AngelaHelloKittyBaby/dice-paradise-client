'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LockKeyhole, Phone, UserRound } from 'lucide-react';
import loginBackground from '@/assets/images/backgrounds/login/login-bg.png';
import diceIcon from '@/assets/images/ui/icons/骰子.png';
import { useAuth } from '@/hooks';
import styles from './login.module.scss';

type AuthTab = 'login' | 'register';

interface LoginPageProps {
  searchParams?: {
    mode?: string;
    reason?: string;
    redirect?: string;
  };
}

interface LoginFormState {
  nickname: string;
  password: string;
  rememberPassword: boolean;
}

interface RegisterFormState {
  nickname: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptedAgreement: boolean;
}

const initialLoginForm: LoginFormState = {
  nickname: '',
  password: '',
  rememberPassword: true,
};

const initialRegisterForm: RegisterFormState = {
  nickname: '',
  phone: '',
  password: '',
  confirmPassword: '',
  acceptedAgreement: false,
};

function isWeakPassword(password: string) {
  return /^(\d+|[a-zA-Z]+|.)\1*$/.test(password);
}

function getInitialAuthTab(mode?: string): AuthTab {
  return mode === 'login' ? 'login' : 'register';
}

function getInitialErrorMessage(reason?: string) {
  return reason === 'auth-required' ? '请先登录后再继续' : '';
}

function getSafeRedirectPath(value?: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  if (value === '/login' || value.startsWith('/login?') || value.startsWith('/login/')) return '/';

  return value;
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const router = useRouter();
  const { login, register } = useAuth();
  const initialAuthTab = getInitialAuthTab(searchParams?.mode);
  const initialErrorMessage = getInitialErrorMessage(searchParams?.reason);
  const redirectPath = getSafeRedirectPath(searchParams?.redirect);
  const [activeTab, setActiveTab] = useState<AuthTab>(initialAuthTab);
  const [loginForm, setLoginForm] = useState<LoginFormState>(initialLoginForm);
  const [registerForm, setRegisterForm] = useState<RegisterFormState>(initialRegisterForm);
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setActiveTab(initialAuthTab);
  }, [initialAuthTab]);

  useEffect(() => {
    setErrorMessage(initialErrorMessage);
  }, [initialErrorMessage]);

  const switchTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const updateLoginForm = <Key extends keyof LoginFormState>(
    key: Key,
    value: LoginFormState[Key]
  ) => {
    setLoginForm(current => ({
      ...current,
      [key]: value,
    }));
  };

  const updateRegisterForm = <Key extends keyof RegisterFormState>(
    key: Key,
    value: RegisterFormState[Key]
  ) => {
    setRegisterForm(current => ({
      ...current,
      [key]: value,
    }));
  };

  const validateLogin = () => {
    if (!loginForm.nickname.trim()) return '请输入用户昵称';
    if (!loginForm.password.trim()) return '请输入密码';
    return '';
  };

  const validateRegister = () => {
    if (!registerForm.nickname.trim()) return '请输入用户昵称';
    if (!registerForm.phone.trim()) return '请输入手机号';
    if (!/^1\d{10}$/.test(registerForm.phone.trim())) return '请输入正确的 11 位手机号';
    if (!registerForm.password.trim()) return '请输入密码';
    if (registerForm.password.length < 8 || registerForm.password.length > 20) return '密码长度需为 8-20 位字符';
    if (isWeakPassword(registerForm.password)) return '密码过于简单，请使用更复杂的密码';
    if (!registerForm.confirmPassword.trim()) return '请再次输入密码';
    if (registerForm.password !== registerForm.confirmPassword) return '两次输入的密码不一致';
    if (!registerForm.acceptedAgreement) return '请先阅读并同意用户协议';
    return '';
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const validationMessage = validateLogin();
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setIsSubmitting(true);

    try {
      await login(loginForm.nickname.trim(), loginForm.password);
      setSuccessMessage('登录成功');
      router.push(redirectPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '登录失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const validationMessage = validateRegister();
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setIsSubmitting(true);

    try {
      await register(registerForm.nickname.trim(), registerForm.phone.trim(), registerForm.password);
      setSuccessMessage('注册成功');
      setRegisterForm(initialRegisterForm);
      router.push(redirectPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '注册失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.pageShell}>
      <section
        className={styles.stage}
        aria-label="投骰乐园登录注册页"
        style={{ backgroundImage: `url(${loginBackground.src})` }}
      >
        <div className={styles.brandMark} aria-label="投骰乐园">
          <span className={styles.logoDice}>
            <Image src={diceIcon} alt="" width={50} height={50} priority />
          </span>
          <span>
            投骰乐园
            <small>DICE PARADISE</small>
          </span>
        </div>

        <aside className={styles.welcomePanel} aria-label="欢迎文案">
          <h1>
            <span>欢迎来到</span>
            投骰乐园！
          </h1>
          <p>创建账号，开启你的投掷冒险之旅！</p>
          <div className={styles.dialogBubble}>
            嗨！我是白小骰，
            <br />
            很高兴认识你！
          </div>
        </aside>

        <section
          className={`${styles.authCard} ${
            activeTab === 'login' ? styles.authCardLogin : styles.authCardRegister
          }`}
          aria-label="登录注册表单"
        >
          <div className={styles.tabs} role="tablist" aria-label="账号操作">
            <span
              className={`${styles.tabIndicator} ${
                activeTab === 'login' ? styles.tabIndicatorLogin : styles.tabIndicatorRegister
              }`}
            />
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'login'}
              className={`${styles.tabButton} ${activeTab === 'login' ? styles.tabActive : ''}`}
              onClick={() => switchTab('login')}
            >
              登录
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'register'}
              className={`${styles.tabButton} ${activeTab === 'register' ? styles.tabActive : ''}`}
              onClick={() => switchTab('register')}
            >
              注册
            </button>
          </div>

          <div className={styles.formPanel}>
            {activeTab === 'register' ? (
              <form key="register" className={styles.authForm} onSubmit={handleRegisterSubmit}>
                <label className={styles.fieldRow}>
                  <span>
                    <UserRound size={24} />
                    用户昵称
                  </span>
                  <input
                    type="text"
                    value={registerForm.nickname}
                    onChange={event => updateRegisterForm('nickname', event.target.value)}
                    placeholder="请输入用户昵称"
                    autoComplete="username"
                  />
                  <small>昵称唯一，后续将用于登录</small>
                </label>

                <label className={styles.fieldRow}>
                  <span>
                    <Phone size={24} />
                    手机号
                  </span>
                  <input
                    type="tel"
                    value={registerForm.phone}
                    onChange={event => updateRegisterForm('phone', event.target.value)}
                    placeholder="请输入手机号"
                    autoComplete="tel"
                  />
                  <small>用于账号验证，也可作为登录账号</small>
                </label>

                <label className={styles.fieldRow}>
                  <span>
                    <LockKeyhole size={24} />
                    密码
                  </span>
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={event => updateRegisterForm('password', event.target.value)}
                    placeholder="请输入密码"
                    autoComplete="new-password"
                  />
                  <small>8-20位字符，请避免过于简单的密码</small>
                </label>

                <label className={styles.fieldRow}>
                  <span>
                    <LockKeyhole size={24} />
                    确认密码
                  </span>
                  <input
                    type="password"
                    value={registerForm.confirmPassword}
                    onChange={event => updateRegisterForm('confirmPassword', event.target.value)}
                    placeholder="请再次输入密码"
                    autoComplete="new-password"
                  />
                </label>

                <label className={styles.agreementRow}>
                  <input
                    type="checkbox"
                    checked={registerForm.acceptedAgreement}
                    onChange={event => updateRegisterForm('acceptedAgreement', event.target.checked)}
                  />
                  <span>
                    我已阅读并同意 <a href="/terms">《用户协议》</a> 和{' '}
                    <a href="/privacy">《隐私政策》</a>
                  </span>
                </label>

                {(errorMessage || successMessage) && (
                  <p className={errorMessage ? styles.errorMessage : styles.successMessage}>
                    {errorMessage || successMessage}
                  </p>
                )}

                <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
                  <Image className={styles.primaryDiceIcon} src={diceIcon} alt="" width={36} height={36} />
                  {isSubmitting ? '注册中...' : '立即注册'}
                  <Image className={styles.primaryDiceIcon} src={diceIcon} alt="" width={36} height={36} />
                </button>

                <p className={styles.switchHint}>
                  已有账号？
                  <button type="button" onClick={() => switchTab('login')}>
                    立即登录
                  </button>
                </p>
              </form>
            ) : (
              <form key="login" className={styles.authForm} onSubmit={handleLoginSubmit}>
                <label className={styles.fieldRow}>
                  <span>
                    <UserRound size={24} />
                    用户昵称
                  </span>
                  <input
                    type="text"
                    value={loginForm.nickname}
                    onChange={event => updateLoginForm('nickname', event.target.value)}
                    placeholder="请输入用户昵称"
                    autoComplete="username"
                  />
                </label>

                <label className={styles.fieldRow}>
                  <span>
                    <LockKeyhole size={24} />
                    密码
                  </span>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={event => updateLoginForm('password', event.target.value)}
                    placeholder="请输入密码"
                    autoComplete="current-password"
                  />
                </label>

                <div className={styles.loginOptions}>
                  <label>
                    <input
                      type="checkbox"
                      checked={loginForm.rememberPassword}
                      onChange={event => updateLoginForm('rememberPassword', event.target.checked)}
                    />
                    记住密码
                  </label>
                  <button type="button">忘记密码</button>
                </div>

                {(errorMessage || successMessage) && (
                  <p className={errorMessage ? styles.errorMessage : styles.successMessage}>
                    {errorMessage || successMessage}
                  </p>
                )}

                <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
                  <Image className={styles.primaryDiceIcon} src={diceIcon} alt="" width={36} height={36} />
                  {isSubmitting ? '登录中...' : '立即登录'}
                  <Image className={styles.primaryDiceIcon} src={diceIcon} alt="" width={36} height={36} />
                </button>

                <p className={styles.switchHint}>
                  没有账号？
                  <button type="button" onClick={() => switchTab('register')}>
                    立即注册
                  </button>
                </p>
              </form>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
