import { useState, useCallback } from 'react';
import SkyShader from './components/SkyShader';
import './App.css';

interface Preset {
  label: string;
  time: number;
  density: number;
  turbulence: number;
  wind: number;
}

const PRESETS: Preset[] = [
  { label: 'Dawn', time: 350, density: 35, turbulence: 30, wind: 20 },
  { label: 'Morning', time: 540, density: 45, turbulence: 40, wind: 25 },
  { label: 'Noon', time: 720, density: 50, turbulence: 40, wind: 30 },
  { label: 'Golden Hour', time: 1050, density: 55, turbulence: 45, wind: 20 },
  { label: 'Sunset', time: 1140, density: 60, turbulence: 50, wind: 15 },
  { label: 'Night', time: 60, density: 30, turbulence: 20, wind: 10 },
];

function App() {
  const [time, setTime] = useState(420);
  const [density, setDensity] = useState(50);
  const [turbulence, setTurbulence] = useState(40);
  const [wind, setWind] = useState(30);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const applyPreset = useCallback((preset: Preset) => {
    setTime(preset.time);
    setDensity(preset.density);
    setTurbulence(preset.turbulence);
    setWind(preset.wind);
    setActivePreset(preset.label);
  }, []);

  const handleTimeChange = useCallback((v: number) => {
    setTime(v);
    setActivePreset(null);
  }, []);
  const handleDensityChange = useCallback((v: number) => {
    setDensity(v);
    setActivePreset(null);
  }, []);
  const handleTurbulenceChange = useCallback((v: number) => {
    setTurbulence(v);
    setActivePreset(null);
  }, []);
  const handleWindChange = useCallback((v: number) => {
    setWind(v);
    setActivePreset(null);
  }, []);

  return (
    <div className="app">
      {/* Hero section - shader fills the viewport */}
      <section className="hero-section">
        <div className="hero-shader">
          <SkyShader
            width={1920}
            height={1080}
            time={420}
            density={35}
            turbulence={30}
            wind={20}
            hideControls
          />
        </div>
        <div className="hero-overlay">
          <div className="hero-content">
            <h1 className="hero-title">Sky Shaders</h1>
            <p className="hero-subtitle">
              Procedural sky rendering with real-time clouds, celestial bodies, and atmospheric scattering
            </p>
            <div className="hero-badge">WebGL &middot; GLSL &middot; Procedural</div>
          </div>
          <div className="scroll-hint">
            <span>Scroll to explore</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </section>

      {/* Interactive demo section */}
      <section className="demo-section">
        <div className="demo-container">
          <div className="section-header">
            <h2>Interactive Demo</h2>
            <p>Explore the full range of atmospheric conditions. Adjust the sliders or pick a preset.</p>
          </div>

          <div className="demo-layout">
            <div className="demo-canvas-wrapper">
              <SkyShader
                width={1200}
                height={675}
                time={time}
                density={density}
                turbulence={turbulence}
                wind={wind}
                onTimeChange={handleTimeChange}
                onDensityChange={handleDensityChange}
                onTurbulenceChange={handleTurbulenceChange}
                onWindChange={handleWindChange}
                hideControls
              />
            </div>

            <div className="demo-controls">
              {/* Presets */}
              <div className="presets">
                <span className="control-label">Presets</span>
                <div className="preset-buttons">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      className={`preset-btn ${activePreset === preset.label ? 'active' : ''}`}
                      onClick={() => applyPreset(preset)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <div className="slider-group">
                <div className="slider-row">
                  <span className="control-label">Time of Day</span>
                  <input
                    type="range"
                    min={0}
                    max={1440}
                    step={1}
                    value={time}
                    onChange={(e) => handleTimeChange(Number(e.target.value))}
                  />
                  <span className="slider-value time-value">
                    {`${String(Math.floor(time / 60) % 24).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`}
                  </span>
                </div>
                <div className="slider-row">
                  <span className="control-label">Cloud Density</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={density}
                    onChange={(e) => handleDensityChange(Number(e.target.value))}
                  />
                  <span className="slider-value">{density}</span>
                </div>
                <div className="slider-row">
                  <span className="control-label">Turbulence</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={turbulence}
                    onChange={(e) => handleTurbulenceChange(Number(e.target.value))}
                  />
                  <span className="slider-value">{turbulence}</span>
                </div>
                <div className="slider-row">
                  <span className="control-label">Wind Speed</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={wind}
                    onChange={(e) => handleWindChange(Number(e.target.value))}
                  />
                  <span className="slider-value">{wind}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="features-section">
        <div className="features-container">
          <div className="section-header">
            <h2>How It Works</h2>
            <p>A single fragment shader generates everything you see in real time.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Time-of-Day Lighting</h3>
              <p>Piecewise color interpolation drives the sky gradient, cloud tinting, and celestial visibility across a full 24-hour cycle.</p>
            </div>
            <div className="feature-card">
              <h3>Three Cloud Layers</h3>
              <p>High cirrus wisps, mid-level cumulus masses with domain warping, and low stratus sheets composite back-to-front.</p>
            </div>
            <div className="feature-card">
              <h3>Physical Lighting</h3>
              <p>Beer-Lambert absorption, powder effect, and subsurface scattering approximations give clouds realistic depth and glow.</p>
            </div>
            <div className="feature-card">
              <h3>Stars and Moon</h3>
              <p>Twinkling stars with color temperature variation and a crescent moon that fades correctly behind cloud cover at night.</p>
            </div>
            <div className="feature-card">
              <h3>FBM Noise</h3>
              <p>Fractal Brownian Motion with rotation matrices breaks grid alignment. Configurable octaves and gain shape each cloud layer.</p>
            </div>
            <div className="feature-card">
              <h3>Real-Time GPU</h3>
              <p>Everything runs in a single fragment shader pass on the GPU. No textures, no geometry -- pure procedural math at 60fps.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <p>Sky Shaders -- procedural atmospheric rendering in WebGL</p>
      </footer>
    </div>
  );
}

export default App;
