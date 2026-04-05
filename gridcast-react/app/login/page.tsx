'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password.trim()) {
      setError('Invalid email or password. Please try again.');
      return;
    }

    setLoading(true);
    setSuccess('Sign in successful! Redirecting...');

    window.setTimeout(() => {
      document.cookie = 'gridcast-session=demo; path=/; max-age=2592000; samesite=lax';
      router.push('/dashboard');
      router.refresh();
    }, 900);
  };

  return (
    <>
      <div className="bg-scene" aria-hidden="true">
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="sceneGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(15,158,144,.15)" />
              <stop offset="100%" stopColor="rgba(15,158,144,0)" />
            </linearGradient>
            <radialGradient id="skyA" cx="25%" cy="20%" r="45%">
              <stop offset="0%" stopColor="rgba(15,158,144,.1)" />
              <stop offset="100%" stopColor="rgba(15,158,144,0)" />
            </radialGradient>
            <radialGradient id="skyB" cx="80%" cy="25%" r="38%">
              <stop offset="0%" stopColor="rgba(255,171,0,.1)" />
              <stop offset="100%" stopColor="rgba(255,171,0,0)" />
            </radialGradient>
            <linearGradient id="groundGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(15,158,144,0)" />
              <stop offset="100%" stopColor="rgba(15,158,144,.08)" />
            </linearGradient>
          </defs>
          <rect width="1440" height="900" fill="none" />
          <rect className="sky-haze" x="0" y="0" width="1440" height="900" fill="url(#skyA)" />
          <rect className="sky-haze" x="0" y="0" width="1440" height="900" fill="url(#skyB)" />
          <rect x="0" y="560" width="1440" height="340" fill="url(#groundGlow)" />

          <g className="grid-drift" stroke="rgba(15,158,144,.08)" strokeWidth="1">
            <path d="M0 760 H1440" />
            <path d="M0 720 H1440" />
            <path d="M0 680 H1440" />
            <path d="M120 900 L340 570" />
            <path d="M300 900 L520 570" />
            <path d="M1120 900 L900 570" />
            <path d="M1300 900 L1080 570" />
          </g>

          <path d="M180 760 L250 460 L320 760" stroke="rgba(15,158,144,.12)" strokeWidth="2" fill="none" />
          <path d="M1120 760 L1190 430 L1260 760" stroke="rgba(15,158,144,.12)" strokeWidth="2" fill="none" />
          <path d="M250 460 L1190 430" stroke="rgba(15,158,144,.07)" strokeWidth="1" strokeDasharray="6,6" />

          <circle className="tower-glow" cx="250" cy="460" r="5" fill="url(#sceneGlow)" />
          <circle className="tower-glow" cx="1190" cy="430" r="5" fill="url(#sceneGlow)" />

          <circle className="beacon-core" cx="250" cy="460" r="3" fill="rgba(15,158,144,.95)" />
          <circle className="beacon-ring" cx="250" cy="460" r="5" fill="none" stroke="rgba(15,158,144,.65)" strokeWidth="1.2" />
          <circle className="beacon-core" cx="1190" cy="430" r="3" fill="rgba(15,158,144,.95)" style={{ animationDelay: '.8s' }} />
          <circle className="beacon-ring" cx="1190" cy="430" r="5" fill="none" stroke="rgba(15,158,144,.65)" strokeWidth="1.2" style={{ animationDelay: '.8s' }} />

          <path className="lightning-a" d="M780 95 L735 180 L770 180 L730 270" stroke="rgba(255,171,0,.65)" strokeWidth="2" fill="none" />
          <path className="lightning-b" d="M980 120 L945 195 L980 195 L940 265" stroke="rgba(255,171,0,.6)" strokeWidth="2" fill="none" />

          <circle className="spark" cx="650" cy="140" r="1.5" fill="rgba(232,237,245,.7)" />
          <circle className="spark" cx="910" cy="180" r="1.3" fill="rgba(232,237,245,.65)" style={{ animationDelay: '1.4s' }} />
          <circle className="spark" cx="540" cy="220" r="1.1" fill="rgba(232,237,245,.55)" style={{ animationDelay: '2.2s' }} />
          <circle className="spark" cx="1060" cy="145" r="1.2" fill="rgba(232,237,245,.55)" style={{ animationDelay: '.9s' }} />
        </svg>
      </div>

      <div className="login-wrapper">
        <div className="login-container">
          <div className="login-header">
            <Link href="/" className="login-logo">
              <span className="logo-dot"></span>
              GridCast
            </Link>
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">Enter your credentials to access the forecasting dashboard</p>
          </div>

          {error && <div className="alert error">{error}</div>}
          {success && <div className="alert success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="operator@grid.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="checkbox-group">
              <input type="checkbox" id="rememberMe" className="checkbox-input" />
              <label htmlFor="rememberMe" className="checkbox-label">Remember me</label>
              <a href="#" className="forgot-password">Forgot password?</a>
            </div>

            <button type="submit" className="form-submit" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="divider">Or continue with</div>

          <div className="sso-buttons">
            <button type="button" className="sso-button" aria-label="Continue with Google" title="Google">
              Google
            </button>
            <button type="button" className="sso-button" aria-label="Continue with GitHub" title="GitHub">
              GitHub
            </button>
          </div>

          <div className="signup-link">
            New to GridCast? <Link href="/">Request access</Link>
          </div>
        </div>
      </div>

      <style jsx global>{`
        :root {
          --bg: #ffffff;
          --bg2: #f8faff;
          --bg3: #f0f4ff;
          --cyan: #0F9E90;
          --cyan2: #0C7F74;
          --amber: #ffab00;
          --green: #00e676;
          --red: #ff1744;
          --text: #003d99;
          --muted: #4a5a7a;
          --border: rgba(0,102,204,0.15);
          --card: rgba(240,244,255,0.6);
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          overflow-x: hidden;
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 0 200px rgba(0,102,204,0.08);
        }

        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
          opacity: .3;
        }

        .login-wrapper { position: relative; z-index: 1; width: 100%; max-width: 390px; padding: 1rem; }
        .login-container { background: var(--card); border: 1px solid var(--border); padding: 1.75rem; backdrop-filter: blur(20px); }
        .login-header { margin-bottom: 1.4rem; text-align: center; }
        .login-logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.1rem; letter-spacing: -0.02em; color: var(--cyan); display: inline-flex; align-items: center; gap: .5rem; justify-content: center; margin-bottom: .9rem; text-decoration: none; }
        .logo-dot { width: 6px; height: 6px; background: var(--amber); border-radius: 50%; animation: pulse 2s ease-in-out infinite; }
        .login-title { font-family: 'Red Hat Display', sans-serif; font-size: 1.5rem; font-weight: 900; letter-spacing: -0.02em; margin-bottom: .5rem; }
        .login-subtitle { font-size: .88rem; color: #555; line-height: 1.45; }
        .form-group { margin-bottom: .95rem; }
        .form-label { display: block; font-family: 'DM Mono', monospace; font-size: .7rem; letter-spacing: .15em; text-transform: uppercase; color: var(--cyan); margin-bottom: .5rem; font-weight: 500; }
        .form-input { width: 100%; height: 38px; padding: 0 .9rem; border: 1px solid var(--border); background: rgba(15,158,144,.03); color: var(--text); font-family: 'DM Sans', sans-serif; font-size: .86rem; transition: all .2s; }
        .form-input:focus { outline: none; border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(15,158,144,.12); background: rgba(15,158,144,.08); }
        .form-input::placeholder { color: #999; }
        .checkbox-group { display: flex; align-items: center; gap: 1rem; margin: 1rem 0; }
        .checkbox-input { width: 16px; height: 16px; cursor: pointer; accent-color: var(--cyan); }
        .checkbox-label { font-size: .8rem; color: #666; cursor: pointer; }
        .forgot-password { margin-left: auto; font-size: .8rem; color: var(--cyan); text-decoration: none; transition: color .2s; }
        .forgot-password:hover { color: var(--cyan2); }
        .form-submit { width: 100%; height: 40px; margin-top: .85rem; background: var(--cyan); color: var(--bg); border: 2px solid var(--cyan); font-family: 'Red Hat Display', sans-serif; font-weight: 900; font-size: .9rem; cursor: pointer; transition: all .2s; letter-spacing: .03em; box-shadow: 0 4px 12px rgba(15,158,144,.25); }
        .form-submit:hover { background: var(--cyan2); border-color: var(--cyan2); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(15,158,144,.3); }
        .form-submit:disabled { opacity: .7; cursor: not-allowed; transform: none; }
        .alert { padding: .8rem; font-size: .8rem; margin-bottom: 1rem; border-left: 3px solid; }
        .alert.error { background: rgba(255,23,68,.08); color: var(--red); border-left-color: var(--red); }
        .alert.success { background: rgba(0,230,118,.08); color: var(--green); border-left-color: var(--green); }
        .divider { display: flex; align-items: center; gap: 1rem; margin: 1.1rem 0; color: #999; font-size: .72rem; font-family: 'DM Mono', monospace; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
        .sso-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
        .sso-button { height: 38px; border: 1px solid var(--border); background: #f8faff; color: var(--text); font-family: 'DM Sans', sans-serif; font-size: .85rem; font-weight: 500; cursor: pointer; transition: all .2s; display: flex; align-items: center; justify-content: center; }
        .sso-button:hover { border-color: var(--cyan); background: rgba(15,158,144,.1); color: var(--cyan); }
        .signup-link { text-align: center; font-size: .8rem; color: #666; }
        .signup-link a { color: var(--cyan); text-decoration: none; font-weight: 600; transition: color .2s; }
        .signup-link a:hover { color: var(--cyan2); }

        .bg-scene { position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: .72; overflow: hidden; }
        .bg-scene svg { width: 108%; height: 108%; display: block; transform: translate(-4%,-4%); }
        .sky-haze { animation: hazeShift 18s ease-in-out infinite alternate; }
        .grid-drift { animation: gridDrift 22s linear infinite; }
        .spark { animation: twinkle 5s ease-in-out infinite; }
        .lightning-a { animation: flashA 7s ease-in-out infinite; }
        .lightning-b { animation: flashB 9s ease-in-out infinite; }
        .tower-glow { animation: towerPulse 3s ease-in-out infinite; }
        .beacon-core { animation: beaconBlink 4.8s ease-in-out infinite; }
        .beacon-ring { animation: beaconRing 4.8s ease-out infinite; transform-origin: center; }

        @media (max-width: 480px) {
          .login-wrapper { padding: .75rem; }
          .login-container { padding: 1.2rem; }
          .login-title { font-size: 1.25rem; }
        }

        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
        @keyframes flashA { 0%,86%,100% { opacity: 0; } 87%,89% { opacity: .7; } 88% { opacity: .2; } }
        @keyframes flashB { 0%,72%,100% { opacity: 0; } 73%,75% { opacity: .65; } 74% { opacity: .1; } }
        @keyframes towerPulse { 0%,100% { opacity: .4; } 50% { opacity: 1; } }
        @keyframes hazeShift { 0% { opacity: .45; transform: translateX(-18px); } 100% { opacity: .8; transform: translateX(18px); } }
        @keyframes gridDrift { 0% { transform: translateX(0); } 100% { transform: translateX(36px); } }
        @keyframes twinkle { 0%,100% { opacity: .2; } 50% { opacity: .8; } }
        @keyframes beaconBlink { 0%,100% { opacity: .3; filter: drop-shadow(0 0 0 rgba(15,158,144,0)); } 40%,60% { opacity: 1; filter: drop-shadow(0 0 10px rgba(15,158,144,.4)); } }
        @keyframes beaconRing { 0% { opacity: .7; transform: scale(1); } 100% { opacity: 0; transform: scale(2.7); } }
      `}</style>
    </>
  );
}
