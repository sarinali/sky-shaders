import { useRef, useEffect, useState, useCallback } from 'react';

const VERTEX_SHADER = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `
precision highp float;
varying vec2 v_uv;

uniform float u_time;
uniform float u_tod;
uniform float u_density;
uniform float u_turbulence;
uniform float u_wind;

#define PI 3.14159265

// ============================================================
// NOISE
// ============================================================
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1, 0)), f.x),
    mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x),
    f.y
  );
}

// Standard FBM with rotation to break grid alignment
float fbm(vec2 p, int oct) {
  float v = 0.0, a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    v += a * noise(p);
    p = rot * p * 2.02;
    a *= 0.5;
  }
  return v;
}

// FBM with custom amplitude decay
float fbmG(vec2 p, int oct, float gain) {
  float v = 0.0, a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    v += a * noise(p);
    p = rot * p * 2.02;
    a *= gain;
  }
  return v;
}

// ============================================================
// SKY COLORS
// ============================================================

vec3 skyZenith(float t) {
  vec3 night    = vec3(0.02, 0.03, 0.08);
  vec3 dawn     = vec3(0.12, 0.14, 0.28);
  vec3 sunrise  = vec3(0.30, 0.42, 0.62);
  vec3 morning  = vec3(0.28, 0.52, 0.78);
  vec3 noon     = vec3(0.22, 0.48, 0.82);
  vec3 afternoon = vec3(0.30, 0.50, 0.72);
  vec3 golden   = vec3(0.45, 0.42, 0.52);
  vec3 sunset   = vec3(0.28, 0.15, 0.30);
  vec3 dusk     = vec3(0.08, 0.06, 0.18);

  if (t < 0.20) return mix(night, dawn, smoothstep(0.15, 0.20, t));
  if (t < 0.26) return mix(dawn, sunrise, smoothstep(0.20, 0.26, t));
  if (t < 0.32) return mix(sunrise, morning, smoothstep(0.26, 0.32, t));
  if (t < 0.46) return mix(morning, noon, smoothstep(0.32, 0.46, t));
  if (t < 0.58) return noon;
  if (t < 0.66) return mix(noon, afternoon, smoothstep(0.58, 0.66, t));
  if (t < 0.74) return mix(afternoon, golden, smoothstep(0.66, 0.74, t));
  if (t < 0.80) return mix(golden, sunset, smoothstep(0.74, 0.80, t));
  if (t < 0.86) return mix(sunset, dusk, smoothstep(0.80, 0.86, t));
  return mix(dusk, night, smoothstep(0.86, 0.95, t));
}

vec3 skyHorizon(float t) {
  vec3 night    = vec3(0.04, 0.04, 0.10);
  vec3 dawn     = vec3(0.55, 0.35, 0.30);
  vec3 sunrise  = vec3(0.92, 0.58, 0.35);
  vec3 morning  = vec3(0.72, 0.78, 0.85);
  vec3 noon     = vec3(0.68, 0.80, 0.92);
  vec3 afternoon = vec3(0.75, 0.78, 0.82);
  vec3 golden   = vec3(0.92, 0.68, 0.38);
  vec3 sunset   = vec3(0.90, 0.38, 0.22);
  vec3 dusk     = vec3(0.35, 0.18, 0.25);

  if (t < 0.20) return mix(night, dawn, smoothstep(0.15, 0.20, t));
  if (t < 0.26) return mix(dawn, sunrise, smoothstep(0.20, 0.26, t));
  if (t < 0.32) return mix(sunrise, morning, smoothstep(0.26, 0.32, t));
  if (t < 0.46) return mix(morning, noon, smoothstep(0.32, 0.46, t));
  if (t < 0.58) return noon;
  if (t < 0.66) return mix(noon, afternoon, smoothstep(0.58, 0.66, t));
  if (t < 0.74) return mix(afternoon, golden, smoothstep(0.66, 0.74, t));
  if (t < 0.80) return mix(golden, sunset, smoothstep(0.74, 0.80, t));
  if (t < 0.86) return mix(sunset, dusk, smoothstep(0.80, 0.86, t));
  return mix(dusk, night, smoothstep(0.86, 0.95, t));
}

vec3 cloudLitColor(float t) {
  vec3 night   = vec3(0.06, 0.06, 0.12);
  vec3 dawn    = vec3(0.88, 0.58, 0.45);
  vec3 sunrise = vec3(0.98, 0.75, 0.52);
  vec3 day     = vec3(0.96, 0.96, 0.98);
  vec3 golden  = vec3(0.98, 0.80, 0.45);
  vec3 sunset  = vec3(0.95, 0.48, 0.32);
  vec3 dusk    = vec3(0.48, 0.30, 0.42);

  if (t < 0.20) return mix(night, dawn, smoothstep(0.15, 0.20, t));
  if (t < 0.28) return mix(dawn, sunrise, smoothstep(0.20, 0.28, t));
  if (t < 0.36) return mix(sunrise, day, smoothstep(0.28, 0.36, t));
  if (t < 0.62) return day;
  if (t < 0.72) return mix(day, golden, smoothstep(0.62, 0.72, t));
  if (t < 0.80) return mix(golden, sunset, smoothstep(0.72, 0.80, t));
  if (t < 0.88) return mix(sunset, dusk, smoothstep(0.80, 0.88, t));
  return mix(dusk, night, smoothstep(0.88, 0.95, t));
}

vec3 cloudShadowColor(float t) {
  vec3 night   = vec3(0.02, 0.02, 0.05);
  vec3 dawn    = vec3(0.30, 0.18, 0.22);
  vec3 day     = vec3(0.45, 0.48, 0.58);
  vec3 golden  = vec3(0.42, 0.28, 0.18);
  vec3 sunset  = vec3(0.35, 0.12, 0.15);
  vec3 dusk    = vec3(0.12, 0.08, 0.15);

  if (t < 0.20) return mix(night, dawn, smoothstep(0.15, 0.20, t));
  if (t < 0.34) return mix(dawn, day, smoothstep(0.20, 0.34, t));
  if (t < 0.62) return day;
  if (t < 0.72) return mix(day, golden, smoothstep(0.62, 0.72, t));
  if (t < 0.80) return mix(golden, sunset, smoothstep(0.72, 0.80, t));
  if (t < 0.88) return mix(sunset, dusk, smoothstep(0.80, 0.88, t));
  return mix(dusk, night, smoothstep(0.88, 0.95, t));
}

// ============================================================
// CELESTIAL
// ============================================================
float sunHeight(float t) { return sin((t - 0.25) * 2.0 * PI); }
float moonHeight(float t) { return sin((t + 0.25) * 2.0 * PI); }

float starPoint(vec2 uv, vec2 cellId, float threshold) {
  vec2 pos = vec2(hash(cellId), hash(cellId + vec2(73.1, 18.3)));
  float d = length(uv - pos);
  float sz = 0.015 + hash(cellId + vec2(31.7, 47.3)) * 0.035;
  return smoothstep(sz, sz * 0.1, d) * step(threshold, hash(cellId));
}

// ============================================================
// MAIN
// ============================================================
void main() {
  vec2 uv = v_uv;
  float t = u_time;
  float tod = u_tod;
  float alt = uv.y;

  vec3 zenith = skyZenith(tod);
  vec3 horizon = skyHorizon(tod);

  float spreadBias = 0.3 + 0.35 * (1.0 - abs(tod - 0.5) * 2.0);
  float skyBlend = pow(1.0 - alt, 1.5 / (0.3 + spreadBias));
  vec3 sky = mix(zenith, horizon, skyBlend);

  float hShift = fbm(vec2(uv.x * 2.0, tod * 5.0), 2) * 0.04;
  sky += (horizon - zenith) * hShift;

  float sunH = sunHeight(tod);
  float sunY = -0.05 + sunH * 0.75;
  vec2 sunPos = vec2(0.5, sunY);
  float sunIllum = smoothstep(-0.05, 0.3, sunH);
  vec3 sunTint = mix(vec3(1.0, 0.6, 0.3), vec3(1.0, 0.95, 0.92), smoothstep(0.0, 0.5, sunH));

  vec2 sunDir = normalize(sunPos - uv + vec2(0.0, 0.001));

  vec3 cLit = cloudLitColor(tod);
  vec3 cShd = cloudShadowColor(tod);

  // CLOUD LAYER 1: HIGH CIRRUS
  vec2 ciUV = uv * vec2(3.0, 12.0);
  ciUV.x += t * u_wind * 0.06;

  float ciWarp = fbm(ciUV * 0.3 + vec2(2.3, 11.4), 3);
  ciUV += vec2(ciWarp * 0.15, ciWarp * 0.04);

  float ciNoise = fbmG(ciUV, 3, 0.5);
  float ciThresh = 0.50 + (1.0 - u_density) * 0.25;
  float ciEdge = noise(ciUV * 8.0) * 0.08;
  float ciCloud = smoothstep(ciThresh + ciEdge, ciThresh + 0.20, ciNoise);
  ciCloud *= 0.20;

  vec3 ciBase = mix(cLit, vec3(dot(cLit, vec3(0.3, 0.59, 0.11))), 0.35);
  vec3 ciCol = mix(ciBase, sky, 0.35);
  ciCol += sunTint * sunIllum * 0.12;

  // CLOUD LAYER 2: MID-LEVEL CUMULUS
  vec2 cuUV = uv * vec2(2.5, 2.5);
  cuUV.x += t * u_wind * 0.03;

  vec2 q = vec2(
    fbm(cuUV + vec2(0.0, 0.0), 4),
    fbm(cuUV + vec2(5.2, 1.3), 4)
  );
  vec2 cuW = cuUV + q * (0.4 + u_turbulence * 0.7);
  vec2 r = vec2(
    fbm(cuW + vec2(1.7, 9.2) + t * u_wind * 0.018, 4),
    fbm(cuW + vec2(8.3, 2.8) + t * u_wind * 0.014, 4)
  );
  cuW += r * 0.25 * u_turbulence;

  float cuBase = fbmG(cuW, 6, 0.55);

  float cuThresh = 0.38 + (1.0 - u_density) * 0.35;
  float cuEdge = noise(cuW * 10.0) * 0.05;
  float cuCloud = smoothstep(cuThresh + cuEdge, cuThresh + 0.18, cuBase);

  float cuLightProbe = fbmG(cuW + sunDir * 0.10, 4, 0.55);
  float cuLightDensity = smoothstep(cuThresh, cuThresh + 0.20, cuLightProbe);

  float cuAbsorb = exp(-cuLightDensity * 3.0);

  float cuPowder = 1.0 - exp(-cuCloud * 5.0);

  float cuLighting = cuAbsorb * cuPowder * sunIllum + (1.0 - sunIllum) * 0.25;

  float vertBias = smoothstep(0.0, 0.15, cuBase - cuThresh);
  cuLighting = mix(cuLighting * 0.6, cuLighting, vertBias);

  vec3 cuCol = mix(cShd, cLit, clamp(cuLighting, 0.0, 1.0));

  float sunProx = length((uv - sunPos) * vec2(1.78, 1.0));
  cuCol += sunTint * exp(-sunProx * sunProx * 3.5) * sunIllum * 0.25 * cuCloud;

  float cuThinEdge = smoothstep(0.0, 0.25, cuCloud) * (1.0 - smoothstep(0.25, 0.6, cuCloud));
  cuCol += sunTint * cuThinEdge * sunIllum * 0.18;

  // CLOUD LAYER 3: LOW STRATUS
  vec2 stUV = uv * vec2(2.0, 8.0);
  stUV.x += t * u_wind * 0.01;

  float stWarp = fbm(stUV * 0.25 + vec2(5.4, 2.1), 3);
  stUV += vec2(stWarp * 0.12, stWarp * 0.03);

  float stNoise = fbmG(stUV, 5, 0.62);
  float stThresh = 0.52 + (1.0 - u_density) * 0.30;
  float stEdge = noise(stUV * 6.0) * 0.04;
  float stCloud = smoothstep(stThresh + stEdge, stThresh + 0.28, stNoise);
  stCloud *= 0.70;

  float stLightProbe = fbmG(stUV + sunDir * 0.06, 3, 0.62);
  float stLightDensity = smoothstep(stThresh, stThresh + 0.25, stLightProbe);
  float stAbsorb = exp(-stLightDensity * 4.0);
  float stLighting = stAbsorb * sunIllum * 0.5 + 0.12;

  vec3 stCol = mix(cShd * 0.55, cLit * 0.75, clamp(stLighting, 0.0, 1.0));
  stCol += sunTint * exp(-sunProx * sunProx * 5.0) * sunIllum * 0.10 * stCloud;

  // COMPOSITE
  float totalCloud = 1.0 - (1.0 - ciCloud) * (1.0 - cuCloud) * (1.0 - stCloud);

  float sunVis = smoothstep(-0.08, 0.05, sunY);
  if (sunVis > 0.0) {
    vec2 sd = (uv - sunPos) * vec2(1.78, 1.0);
    float horizProx = 1.0 - smoothstep(0.0, 0.25, sunY);
    sd.y *= 1.0 + horizProx * 1.2;
    float sunDist = length(sd);

    float disk = smoothstep(0.025, 0.006, sunDist) * sunVis;
    float horizClip = smoothstep(-0.01, 0.02, uv.y);
    disk *= horizClip;

    vec3 diskCol = mix(vec3(1.0, 0.55, 0.22), vec3(1.0, 0.97, 0.92), smoothstep(-0.02, 0.35, sunY));
    sky += diskCol * disk * 0.8;

    float glow = sunVis * 0.55 * exp(-sunDist * sunDist * 10.0) * horizClip;
    vec3 glowCol = mix(vec3(1.0, 0.5, 0.22), vec3(1.0, 0.92, 0.84), smoothstep(0.0, 0.4, sunY));
    sky += glowCol * glow;

    vec2 scDelta = (uv - vec2(sunPos.x, max(0.02, sunPos.y))) * vec2(1.78, 1.0);
    float scDist = length(scDelta);
    float scatter = sunVis * 0.22 * exp(-scDist * scDist * 2.0);
    sky += mix(vec3(1.0, 0.45, 0.22), vec3(0.78, 0.84, 0.92), smoothstep(0.0, 0.4, sunY)) * scatter;
  }

  vec3 col = sky;
  col = mix(col, ciCol, ciCloud);
  col = mix(col, cuCol, cuCloud);
  col = mix(col, stCol, stCloud);

  float haze = pow(1.0 - alt, 4.5) * 0.25;
  vec3 hazeCol = mix(horizon, vec3(0.72, 0.68, 0.62), 0.3);
  col = mix(col, hazeCol, haze);

  float moonH = moonHeight(tod);
  float moonY = -0.05 + moonH * 0.75;
  float moonVis = smoothstep(-0.06, 0.05, moonY);

  if (moonVis > 0.01) {
    vec2 moonPos = vec2(0.42, moonY);
    vec2 mUV = (uv - moonPos) * vec2(1.78, 1.0);
    float mDist = length(mUV);
    float mR = 0.008;

    float moonDisk = smoothstep(mR + 0.001, mR - 0.0005, mDist);

    vec2 carveC = mUV - vec2(0.006, 0.0008);
    float carveDist = length(carveC);
    float carve = smoothstep(mR * 0.92 + 0.001, mR * 0.92 - 0.0005, carveDist);
    float crescent = clamp(moonDisk - carve * 0.95, 0.0, 1.0);

    float moonBright = moonVis * smoothstep(0.2, -0.1, sunH);
    float moonHorizClip = smoothstep(-0.01, 0.03, uv.y);
    crescent *= moonHorizClip * (1.0 - totalCloud * 0.85);

    col += vec3(0.92, 0.93, 0.96) * crescent * moonBright * 1.5;

    float moonGlow = moonBright * 0.06 * exp(-mDist * mDist * 150.0);
    col += vec3(0.72, 0.74, 0.88) * moonGlow * (1.0 - totalCloud * 0.8);
  }

  float nightAmt = smoothstep(0.15, -0.1, sunH);
  if (nightAmt > 0.01) {
    float stars = 0.0;

    for (int layer = 0; layer < 3; layer++) {
      float sc = 18.0 + float(layer) * 14.0;
      float thresh = 0.92 - float(layer) * 0.04;

      vec2 gridUV = uv * vec2(sc, sc * 0.5625);
      vec2 cellId = floor(gridUV);
      vec2 cellUV = fract(gridUV);

      float s = starPoint(cellUV, cellId + float(layer) * 100.0, thresh);

      float twPhase = hash(cellId + float(layer) * 50.0) * 6.283;
      float twSpeed = 1.0 + hash(cellId + float(layer) * 80.0) * 2.0;
      s *= 0.55 + 0.45 * sin(t * twSpeed + twPhase);
      s *= 0.4 + float(layer) * 0.3;

      stars += s;
    }

    stars *= nightAmt;
    stars *= smoothstep(0.15, 0.6, alt);
    stars *= (1.0 - totalCloud);

    vec2 cSeed = floor(uv * 30.0);
    float starTemp = hash(cSeed + vec2(99.0, 77.0));
    vec3 starCol = mix(vec3(0.75, 0.8, 1.0), vec3(1.0, 0.92, 0.8), starTemp);
    col += starCol * stars;
  }

  float grain = (hash(uv * 1000.0 + fract(t * 0.1)) - 0.5) * 0.012;
  col += grain;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export interface SkyShaderProps {
  width?: number;
  height?: number;
  defaultTime?: number;
  defaultDensity?: number;
  defaultTurbulence?: number;
  defaultWind?: number;
  className?: string;
  /** Externally controlled values (if provided, overrides internal state) */
  time?: number;
  density?: number;
  turbulence?: number;
  wind?: number;
  onTimeChange?: (value: number) => void;
  onDensityChange?: (value: number) => void;
  onTurbulenceChange?: (value: number) => void;
  onWindChange?: (value: number) => void;
  /** Hide built-in controls */
  hideControls?: boolean;
}

function formatTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = Math.floor(mins % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getPhase(mins: number): string {
  if (mins < 300) return 'Night';
  if (mins < 390) return 'Dawn';
  if (mins < 480) return 'Sunrise';
  if (mins < 660) return 'Morning';
  if (mins < 780) return 'Noon';
  if (mins < 960) return 'Afternoon';
  if (mins < 1080) return 'Golden Hour';
  if (mins < 1170) return 'Sunset';
  if (mins < 1260) return 'Dusk';
  return 'Night';
}

function createShader(gl: WebGLRenderingContext, source: string, type: number): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function SkyShader({
  width = 1200,
  height = 675,
  defaultTime = 420,
  defaultDensity = 50,
  defaultTurbulence = 40,
  defaultWind = 30,
  className,
  time: externalTime,
  density: externalDensity,
  turbulence: externalTurbulence,
  wind: externalWind,
  onTimeChange,
  onDensityChange,
  onTurbulenceChange,
  onWindChange,
  hideControls = false,
}: SkyShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const uniformsRef = useRef<Record<string, WebGLUniformLocation | null>>({});
  const rafRef = useRef<number>(0);

  const [internalTime, setInternalTime] = useState(defaultTime);
  const [internalDensity, setInternalDensity] = useState(defaultDensity);
  const [internalTurbulence, setInternalTurbulence] = useState(defaultTurbulence);
  const [internalWind, setInternalWind] = useState(defaultWind);

  const timeVal = externalTime ?? internalTime;
  const densityVal = externalDensity ?? internalDensity;
  const turbulenceVal = externalTurbulence ?? internalTurbulence;
  const windVal = externalWind ?? internalWind;

  // Store current values in a ref so the animation loop always reads the latest
  const valuesRef = useRef({ time: timeVal, density: densityVal, turbulence: turbulenceVal, wind: windVal });
  valuesRef.current = { time: timeVal, density: densityVal, turbulence: turbulenceVal, wind: windVal };

  const handleTimeChange = useCallback((v: number) => {
    setInternalTime(v);
    onTimeChange?.(v);
  }, [onTimeChange]);

  const handleDensityChange = useCallback((v: number) => {
    setInternalDensity(v);
    onDensityChange?.(v);
  }, [onDensityChange]);

  const handleTurbulenceChange = useCallback((v: number) => {
    setInternalTurbulence(v);
    onTurbulenceChange?.(v);
  }, [onTurbulenceChange]);

  const handleWindChange = useCallback((v: number) => {
    setInternalWind(v);
    onWindChange?.(v);
  }, [onWindChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    glRef.current = gl;

    const vs = createShader(gl, VERTEX_SHADER, gl.VERTEX_SHADER);
    const fs = createShader(gl, FRAGMENT_SHADER, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);
    programRef.current = program;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    uniformsRef.current = {
      u_time: gl.getUniformLocation(program, 'u_time'),
      u_tod: gl.getUniformLocation(program, 'u_tod'),
      u_density: gl.getUniformLocation(program, 'u_density'),
      u_turbulence: gl.getUniformLocation(program, 'u_turbulence'),
      u_wind: gl.getUniformLocation(program, 'u_wind'),
    };

    function draw(t: number) {
      const time = t * 0.001;
      const vals = valuesRef.current;
      const tod = vals.time / 1440.0;

      gl!.uniform1f(uniformsRef.current.u_time, time);
      gl!.uniform1f(uniformsRef.current.u_tod, tod);
      gl!.uniform1f(uniformsRef.current.u_density, vals.density / 100);
      gl!.uniform1f(uniformsRef.current.u_turbulence, vals.turbulence / 100);
      gl!.uniform1f(uniformsRef.current.u_wind, vals.wind / 100);

      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, [width, height]);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: '100%', display: 'block', borderRadius: '4px' }}
      />
      {!hideControls && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'rgba(164,173,187,0.82)', width: 90, textAlign: 'right', flexShrink: 0 }}>Time</span>
            <input
              type="range"
              min={0}
              max={1440}
              step={1}
              value={timeVal}
              onChange={(e) => handleTimeChange(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 24, fontWeight: 400, width: 80, textAlign: 'center', fontVariantNumeric: 'tabular-nums', color: '#f6f8fb' }}>
              {formatTime(timeVal)}
            </span>
            <span style={{ fontSize: 13, color: 'rgba(164,173,187,0.82)', width: 100 }}>
              {getPhase(timeVal)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: 'rgba(164,173,187,0.82)', width: 90, textAlign: 'right', flexShrink: 0 }}>Cloud density</span>
            <input
              type="range"
              min={0}
              max={100}
              value={densityVal}
              onChange={(e) => handleDensityChange(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 11, color: 'rgba(164,173,187,0.6)', width: 36, textAlign: 'right' }}>{densityVal}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: 'rgba(164,173,187,0.82)', width: 90, textAlign: 'right', flexShrink: 0 }}>Turbulence</span>
            <input
              type="range"
              min={0}
              max={100}
              value={turbulenceVal}
              onChange={(e) => handleTurbulenceChange(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 11, color: 'rgba(164,173,187,0.6)', width: 36, textAlign: 'right' }}>{turbulenceVal}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: 'rgba(164,173,187,0.82)', width: 90, textAlign: 'right', flexShrink: 0 }}>Wind</span>
            <input
              type="range"
              min={0}
              max={100}
              value={windVal}
              onChange={(e) => handleWindChange(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 11, color: 'rgba(164,173,187,0.6)', width: 36, textAlign: 'right' }}>{windVal}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export { formatTime, getPhase };
