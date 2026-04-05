'use client';

import Link from 'next/link';
import { useEffect } from 'react';

const nodeStates = [
  'active','active','warn','active','active',
  'active','crit','active','active','warn',
  'active','active','active','warn','active',
  'active','active','active','active','active',
  'warn','active','active','crit','active'
];

const nodeLabels = [
  'DEL-N','DEL-S','HP-01','PB-01','PB-02',
  'HR-01','HR-02','UK-01','UK-02','RJ-01',
  'RJ-02','UP-N','UP-S','UP-E','UP-W',
  'BR-01','JK-01','HP-02','CG-01','MP-01',
  'MP-02','GJ-01','MH-01','RJ-03','PB-03'
];

export default function HomePage() {
  useEffect(() => {
    const gridNodeContainer = document.getElementById('grid-nodes');
    if (gridNodeContainer && !gridNodeContainer.children.length) {
      nodeStates.forEach((state, i) => {
        const node = document.createElement('div');
        node.className = `node ${state}`;
        node.textContent = nodeLabels[i];
        gridNodeContainer.appendChild(node);
      });
    }

    const toggleInterval = window.setInterval(() => {
      const nodes = gridNodeContainer?.querySelectorAll('.node');
      if (!nodes || nodes.length === 0) return;
      const idx = Math.floor(Math.random() * nodes.length);
      const states = ['active', 'active', 'active', 'warn', 'crit'];
      nodes[idx].className = `node ${states[Math.floor(Math.random() * states.length)]}`;
    }, 2200);

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.reveal').forEach((el, i) => {
      (el as HTMLElement).style.transitionDelay = `${i * 0.06}s`;
      revealObserver.observe(el);
    });

    return () => {
      window.clearInterval(toggleInterval);
      revealObserver.disconnect();
    };
  }, []);

  return (
    <>
      <nav>
        <div className="logo"><span className="logo-dot"></span> GridCast</div>
        <ul className="nav-links">
          <li><a href="#what-grid">Grid</a></li>
          <li><a href="#problem">Problem</a></li>
          <li><a href="#how">How It Works</a></li>
          <li><a href="#impact">Impact</a></li>
          <li><a href="#tech">Tech</a></li>
        </ul>
        <Link className="nav-cta" href="/login">Request Demo</Link>
      </nav>

      <section id="hero">
        <div className="hero-bg">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0 }}>
            <defs>
              <pattern id="grid-pat" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(15,158,144,0.04)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pat)" />
          </svg>
        </div>

        <div className="hero-content">
          <div className="hero-eyebrow"><span className="eyebrow-dot"></span> SMART GRID FORECASTING</div>
          <h1>Predict the Grid.<br /><span className="accent">Before It Breaks.</span></h1>
          <p className="hero-sub">GridCast delivers 24-hour electricity load forecasts at 15-minute granularity, giving grid operators the intelligence to dispatch smarter, cut costs, and keep the lights on.</p>
          <div className="hero-actions">
            <Link href="/dashboard" className="btn-primary">See Live Demo</Link>
            <a href="#how" className="btn-ghost">How it works</a>
          </div>
          <div className="hero-stats">
            <div><div className="stat-val">96</div><div className="stat-label">Forecast Steps / 24h</div></div>
            <div><div className="stat-val">15min</div><div className="stat-label">Granularity</div></div>
            <div><div className="stat-val">&lt;3%</div><div className="stat-label">Target MAPE</div></div>
          </div>
        </div>
      </section>

      <section id="what-grid">
        <div className="grid-layout">
          <div className="reveal">
            <p className="section-label">The Grid</p>
            <h2 className="section-title">What Is a Smart Grid?</h2>
            <p className="section-body">The electrical grid is the nervous system of modern civilization, a vast interconnected network that generates, transmits, and delivers electricity across thousands of kilometres.</p>
          </div>
          <div className="reveal">
            <div className="grid-infographic">
              <div className="grid-nodes" id="grid-nodes"></div>
            </div>
          </div>
        </div>
      </section>

      <section id="problem">
        <div className="problem-inner">
          <div className="problem-header reveal">
            <p className="section-label">The Challenge</p>
            <h2 className="section-title" style={{ textAlign: 'center' }}>A World-Scale Problem<br />Hiding in Plain Sight</h2>
          </div>
          <div className="problems-grid">
            <div className="problem-card reveal"><div className="problem-num">01</div><div className="problem-title">Demand Volatility</div><div className="problem-desc">Consumption patterns shift violently intraday, creating difficult dispatch conditions.</div></div>
            <div className="problem-card reveal"><div className="problem-num">02</div><div className="problem-title">Renewable Intermittency</div><div className="problem-desc">Solar and wind output vary rapidly and create balancing pressure.</div></div>
            <div className="problem-card reveal"><div className="problem-num">03</div><div className="problem-title">Dispatch Inefficiency</div><div className="problem-desc">Uncertain demand leads to excess reserve commitment and cost.</div></div>
          </div>
        </div>
      </section>

      <section id="how">
        <div className="how-inner">
          <div className="reveal" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <p className="section-label" style={{ textAlign: 'center' }}>The System</p>
            <h2 className="section-title">Six Stages. Zero Gaps.</h2>
          </div>
          <div className="pipeline-steps">
            <div className="step reveal"><div className="step-icon">SC</div><div className="step-name">Scrape</div></div>
            <div className="step reveal"><div className="step-icon">EX</div><div className="step-name">Extract</div></div>
            <div className="step reveal"><div className="step-icon">CL</div><div className="step-name">Clean</div></div>
            <div className="step reveal"><div className="step-icon">ML</div><div className="step-name">Train</div></div>
            <div className="step reveal"><div className="step-icon">API</div><div className="step-name">Serve</div></div>
            <div className="step reveal"><div className="step-icon">UI</div><div className="step-name">Visualize</div></div>
          </div>
        </div>
      </section>

      <section id="impact">
        <div className="impact-inner">
          <div className="reveal" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <p className="section-label" style={{ textAlign: 'center' }}>Impact</p>
            <h2 className="section-title">What Accurate Forecasting Unlocks</h2>
          </div>
          <div className="impact-grid">
            <div className="impact-card reveal"><div className="impact-val">-30%</div><div className="impact-label">Reserve over-provisioning</div></div>
            <div className="impact-card reveal"><div className="impact-val">&lt;3%</div><div className="impact-label">Target MAPE</div></div>
            <div className="impact-card reveal"><div className="impact-val">96x</div><div className="impact-label">Daily decision points</div></div>
            <div className="impact-card reveal"><div className="impact-val">ms</div><div className="impact-label">API inference latency</div></div>
          </div>
        </div>
      </section>

      <section id="tech">
        <div className="tech-inner">
          <div className="reveal"><p className="section-label">Technology</p><h2 className="section-title">Built on Production-Grade Stack</h2></div>
          <div className="tech-grid">
            <div className="tech-card reveal"><div className="tech-name">XGBoost + scikit-learn</div></div>
            <div className="tech-card reveal"><div className="tech-name">Pandas + Parquet Pipeline</div></div>
            <div className="tech-card reveal"><div className="tech-name">Flask REST API</div></div>
          </div>
        </div>
      </section>

      <section id="cta">
        <div className="reveal">
          <p className="section-label" style={{ textAlign: 'center' }}>GET STARTED</p>
          <h2 className="section-title">Ready to Predict<br /><span style={{ color: 'var(--cyan)' }}>Your Grid&apos;s Future?</span></h2>
          <div className="cta-buttons">
            <Link href="/login" className="btn-primary" style={{ fontSize: '1rem', padding: '1rem 2.5rem' }}>Request a Demo</Link>
            <a href="https://github.com/Team-NAVGATI/GridCast" className="btn-ghost" target="_blank" rel="noopener noreferrer">View on GitHub</a>
          </div>
        </div>
      </section>

      <footer>
        <div>© 2026 GridCast - Team NavGati. All rights reserved.</div>
        <div>v1.0.0 | XGBoost | Flask | Python</div>
      </footer>

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
        html { scroll-behavior: smooth; }
        body {
          background: radial-gradient(900px 500px at 10% -10%, rgba(0,61,153,0.09), transparent 62%), radial-gradient(760px 420px at 92% 8%, rgba(15,158,144,0.10), transparent 60%), linear-gradient(180deg, #ffffff 0%, #f7fbff 55%, #f4f9ff 100%);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          overflow-x: hidden;
          box-shadow: inset 0 0 200px rgba(0,102,204,0.08);
        }
        nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 1.2rem 3rem; background: rgba(255,255,255,.9); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); }
        .logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.4rem; letter-spacing: -0.02em; color: var(--cyan); display: flex; align-items: center; gap: .5rem; }
        .logo-dot { width: 8px; height: 8px; background: var(--amber); border-radius: 50%; animation: pulse 2s ease-in-out infinite; }
        .nav-links { display: flex; gap: 2.5rem; list-style: none; }
        .nav-links a { color: var(--text); text-decoration: none; font-size: .9rem; letter-spacing: .05em; text-transform: uppercase; }
        .nav-cta { background: transparent; border: 2px solid var(--cyan); color: var(--cyan); padding: .55rem 1.4rem; font-family: 'DM Sans', sans-serif; font-size: .9rem; cursor: pointer; text-decoration: none; }
        .nav-cta:hover { background: var(--cyan); color: var(--bg); }
        #hero { position: relative; min-height: 110vh; display: flex; align-items: center; padding: 0 3rem; overflow: hidden; padding-top: 8rem; }
        .hero-content { position: relative; z-index: 2; max-width: 700px; }
        .hero-eyebrow { display: inline-flex; align-items: center; gap: .6rem; font-family: 'DM Mono', monospace; font-size: .75rem; color: var(--cyan); letter-spacing: .15em; text-transform: uppercase; border: 1px solid var(--border); padding: .4rem 1rem; margin-bottom: 2rem; }
        .eyebrow-dot { width: 6px; height: 6px; background: var(--green); border-radius: 50%; animation: pulse 1.5s ease-in-out infinite; }
        h1 { font-family: 'Red Hat Display', sans-serif; font-size: clamp(2.3rem,6vw,4.8rem); font-weight: 900; line-height: .96; letter-spacing: -0.03em; margin-bottom: 1.5rem; }
        h1 .accent { color: var(--cyan); }
        .hero-sub { font-size: .95rem; color: #555; line-height: 1.7; max-width: 520px; margin-bottom: 2.5rem; }
        .hero-actions { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
        .btn-primary { background: var(--cyan); color: var(--bg); padding: .85rem 2rem; font-family: 'Red Hat Display', sans-serif; font-weight: 900; font-size: .95rem; border: 2px solid var(--cyan); text-decoration: none; }
        .btn-primary:hover { background: var(--cyan2); }
        .btn-ghost { color: var(--text); text-decoration: none; font-size: .9rem; display: flex; align-items: center; gap: .5rem; border-bottom: 2px solid var(--cyan); padding-bottom: 2px; }
        .hero-stats { display: flex; gap: 3rem; margin-top: 4rem; padding-top: 2rem; border-top: 1px solid var(--border); }
        .stat-val { font-family: 'DM Mono', monospace; font-size: 2rem; font-weight: 700; color: var(--cyan); }
        .stat-label { font-size: .8rem; color: #666; margin-top: .2rem; letter-spacing: .05em; }
        section { position: relative; z-index: 1; }
        .section-label { font-family: 'DM Mono', monospace; font-size: .7rem; color: var(--cyan); letter-spacing: .2em; text-transform: uppercase; margin-bottom: 1rem; }
        .section-title { font-family: 'Red Hat Display', sans-serif; font-size: clamp(2rem,4vw,3.2rem); font-weight: 900; line-height: 1.1; letter-spacing: -.02em; margin-bottom: 1.5rem; }
        .section-body { font-size: 1.05rem; color: #555; line-height: 1.8; max-width: 560px; }
        #what-grid, #problem, #how, #impact, #tech, #cta { padding: 7rem 3rem; }
        #what-grid, #tech { background: var(--bg2); }
        #problem { background: var(--bg2); }
        #how, #cta { background: var(--bg); }
        .grid-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: center; max-width: 1200px; margin: 0 auto; }
        .grid-infographic { background: var(--card); border: 1px solid var(--border); padding: 2rem; }
        .grid-nodes { display: grid; grid-template-columns: repeat(5,1fr); gap: .8rem; }
        .node { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: .55rem; font-family: 'DM Mono', monospace; border: 1px solid rgba(0,102,204,0.2); color: #666; }
        .node.active { border-color: var(--cyan); color: var(--cyan); border-width: 2px; box-shadow: 0 0 8px rgba(15,158,144,.3); }
        .node.warn { border-color: var(--amber); color: var(--amber); }
        .node.crit { border-color: var(--red); color: var(--red); }
        .problem-inner, .how-inner, .impact-inner, .tech-inner { max-width: 1200px; margin: 0 auto; }
        .problem-header { text-align: center; margin-bottom: 4rem; }
        .problems-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 1.5rem; }
        .problem-card { background: var(--card); border: 1px solid var(--border); padding: 2rem; position: relative; }
        .problem-num { font-family: 'DM Mono', monospace; font-size: 3rem; font-weight: 700; color: rgba(255,171,0,.1); position: absolute; top: 1rem; right: 1rem; }
        .problem-title { font-family: 'Red Hat Display', sans-serif; font-weight: 900; font-size: 1.1rem; margin-bottom: .6rem; }
        .problem-desc { font-size: .9rem; color: #555; line-height: 1.6; }
        .pipeline-steps { display: grid; grid-template-columns: repeat(6,1fr); margin-top: 4rem; }
        .step { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 0 .5rem; }
        .step-icon { width: 56px; height: 56px; border: 2px solid var(--cyan); display: flex; align-items: center; justify-content: center; background: #f8faff; margin-bottom: 1rem; color: var(--cyan); font-family: 'DM Mono', monospace; font-weight: 700; }
        .step-name { font-family: 'Red Hat Display', sans-serif; font-size: .8rem; font-weight: 900; }
        .impact-grid, .tech-grid { display: grid; gap: 1.5rem; margin-top: 3rem; }
        .impact-grid { grid-template-columns: repeat(4,1fr); }
        .impact-card { padding: 2.5rem 1.5rem; border: 1px solid var(--border); text-align: center; background: rgba(15,158,144,.02); }
        .impact-val { font-family: 'Syne', sans-serif; font-size: 3rem; font-weight: 800; color: var(--cyan); line-height: 1; margin-bottom: .5rem; }
        .impact-label { font-size: .85rem; color: #555; }
        .tech-grid { grid-template-columns: repeat(3,1fr); }
        .tech-card { background: var(--card); border: 1px solid var(--border); padding: 1.8rem; }
        .tech-name { font-family: 'Red Hat Display', sans-serif; font-weight: 900; }
        #cta { text-align: center; }
        .cta-buttons { display: flex; gap: 1.5rem; justify-content: center; flex-wrap: wrap; }
        footer { padding: 3rem; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; font-size: .8rem; color: #666; font-family: 'DM Mono', monospace; background: rgba(240,244,255,.5); }
        .reveal { opacity: 0; transform: translateY(24px); transition: opacity .7s ease, transform .7s ease; }
        .reveal.visible { opacity: 1; transform: none; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
        @media (max-width: 900px) {
          .grid-layout, .problems-grid, .impact-grid, .tech-grid { grid-template-columns: 1fr; }
          .pipeline-steps { grid-template-columns: repeat(3,1fr); gap: 2rem; }
          nav { padding: 1rem 1.5rem; }
          #hero, #what-grid, #problem, #how, #impact, #tech, #cta { padding-left: 1.5rem; padding-right: 1.5rem; }
          .hero-stats { flex-wrap: wrap; gap: 1.5rem; }
          .nav-links { display: none; }
        }
      `}</style>
    </>
  );
}
