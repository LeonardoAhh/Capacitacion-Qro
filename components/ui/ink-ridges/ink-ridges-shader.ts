/* ----------------------------- shader ----------------------------------- */

export const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

// Authored here. Each ridge line is fbm plus a ridged term for sharper peaks;
// below it, ink thins toward the foot and is broken by brush texture, with more
// pressure along the crest; drifting low-frequency fbm lifts mist out of each
// foot; a ragged left-to-right sweep lays each ridge down. The sun is a disc with
// a noise-wobbled edge, pigment pooled at the rim and granulation inside, crossed
// by a wisp of mist; the far ridge paints over it. Grain on top.
export const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uSeed;
uniform float uMist;
uniform float uDrift;
uniform float uGrain;
uniform int uLayers;
uniform vec4 uLayer[5];
uniform float uPaint[5];
uniform float uPaintAll;
uniform vec2 uShift;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec3 uSunColor;
uniform vec4 uSun;
uniform float uInkScale;
uniform float uClouds;
uniform float uGlow;
uniform float uHorizonY;
uniform int uBirdCount;
uniform vec4 uBird[8];
uniform float uBirdAlpha;
uniform float uBirdDir;
uniform int uBirdLayer;
uniform float uMoon;
uniform float uSunGrow;
uniform float uDrop;

uint hashU(uvec2 p) {
  uint n = p.x * 1664525u ^ (p.y * 22695477u + 12345u);
  n ^= n >> 15u; n *= 2246822519u;
  n ^= n >> 13u; n *= 3266489917u;
  n ^= n >> 16u;
  return n;
}
float hash2(vec2 p) {
  ivec2 ip = ivec2(floor(p)) + 32768;
  return float(hashU(uvec2(ip))) / 4294967295.0;
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = m * p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v;
}
// three octaves, rescaled to the same range: enough for mist, brush texture and the brush edge
float fbm3(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 3; i++) {
    v += a * vnoise(p);
    p = m * p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v / 0.875 * 0.96875;
}

// A small brush-stroke bird: two wings rising from a dot, tips lifted or dropped by the flap.
float birdInk(vec2 uv, float aspect) {
  float ink = 0.0;
  for (int b = 0; b < 8; b++) {
    if (b >= uBirdCount) break;
    vec4 B = uBird[b];
    vec2 q = (uv - B.xy) * vec2(aspect, 1.0) / B.z;
    if (abs(q.x) > 1.25 || abs(q.y) > 1.25) continue;
    q.x *= uBirdDir;
    float ax = abs(q.x);
    float wingY = B.w * ax - 0.28 * ax * ax + 0.06;
    float thick = 0.11 * (1.0 - ax) + 0.03;
    float wing = (1.0 - smoothstep(thick, thick + 0.05, abs(q.y - wingY))) * (1.0 - smoothstep(0.95, 1.05, ax));
    float body = 1.0 - smoothstep(0.08, 0.13, length(vec2(q.x * 0.8 - 0.05, q.y * 1.4)));
    ink = max(ink, max(wing, body));
  }
  return ink * uBirdAlpha;
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec3 col = uPaper;

  // sky: a faint wash deepening toward the top
  col = mix(col, uInk, 0.05 * smoothstep(0.45, 1.0, uv.y) * uInkScale);
  // the sun sits farther away than any ridge: it barely parallaxes, and sinks fastest on scroll
  vec2 sc = uSun.xy + uShift * 0.1 - vec2(0.0, uDrop * 2.2);
  float bloom = smoothstep(0.0, 0.2, uSunGrow);
  // warmth around the sun and a haze along the horizon
  if (uSun.w > 0.5 && uGlow > 0.0) {
    float ds = length((uv - sc) * vec2(aspect, 1.0));
    float halo = exp(-pow(ds / (uSun.z * 3.2), 2.0));
    float haze = exp(-pow((uv.y + uDrop - uHorizonY) / 0.12, 2.0));
    col = mix(col, uSunColor, uGlow * (mix(0.22, 0.12, uMoon) * halo + mix(0.06, 0.02, uMoon) * haze) * bloom);
  }
  // the sun, painted: a loaded brush leaves a wobbling edge, pigment pooled at the rim and
  // granulated inside; the moon is paler and mottled. A wisp of mist crosses its lower half.
  vec3 skyBack = col; // the sky without the sun: the far ridge paints over the sun, never through it
  if (uSun.w > 0.5) {
    vec2 dv = (uv - sc) * vec2(aspect, 1.0);
    float d = length(dv);
    float R = uSun.z * mix(0.15, 1.0, uSunGrow);
    if (d < R * 1.2) {
      vec2 dir = dv / max(d, 1e-5);
      float wob = (fbm3(dir * 1.6 + uSeed * 0.37) - 0.5) * mix(0.07, 0.025, uMoon) + (vnoise(dir * 11.0 + uSeed) - 0.5) * mix(0.03, 0.01, uMoon);
      float r = R * (1.0 + wob);
      float disc = 1.0 - smoothstep(r - R * 0.03, r + R * 0.02, d);
      vec2 lq = dv / R;
      float gran = fbm3(lq * 7.0 + uSeed * 1.3) - 0.5;
      float pool = smoothstep(0.6, 1.0, d / r);
      float wash = clamp(dot(lq, vec2(-0.6, 0.8)) * 0.5 + 0.5, 0.0, 1.0);
      float dens = 0.78 + 0.16 * pool - 0.12 * wash + 0.16 * gran;
      vec3 pig = uSunColor * (1.0 - 0.14 * pool * pool);
      if (uMoon > 0.5) {
        dens = 0.86 - 0.16 * smoothstep(0.45, 0.72, fbm3(lq * 1.9 + 3.0 + uSeed * 0.2)) + 0.06 * gran;
        pig = uSunColor;
      }
      col = mix(col, pig, clamp(disc * dens, 0.0, 1.0) * bloom);
    }
    if (uClouds > 0.0 && d < uSun.z * 3.2) {
      vec2 mq = dv / uSun.z;
      float streak = fbm3(vec2(mq.x * 0.55 + uTime * uDrift * 0.6 + uSeed * 0.7, mq.y * 2.6 + uSeed));
      float strip = exp(-pow((mq.y + 0.42) / 0.32, 2.0));
      float wisp = smoothstep(0.42, 0.72, streak) * strip * smoothstep(3.2, 1.4, length(mq)) * smoothstep(0.0, 0.5, uClouds);
      col = mix(col, uPaper, wisp * 0.8 * bloom);
    }
  }
  // a few long brush-streak clouds, drifting with the mist
  if (uClouds > 0.0) {
    vec2 cq = vec2(uv.x * aspect * 0.8 + uTime * uDrift * 0.15 + uSeed * 0.53, (uv.y + uDrop) * 11.0);
    float streak = smoothstep(0.5, 0.8, fbm3(cq));
    float inSky = smoothstep(uHorizonY - 0.02, uHorizonY + 0.2, uv.y + uDrop) * (1.0 - smoothstep(0.92, 1.0, uv.y));
    col = mix(col, uInk, uClouds * 0.26 * streak * inSky * uInkScale * smoothstep(0.0, 0.4, uPaintAll));
  }

  for (int i = 0; i < 5; i++) {
    if (i >= uLayers) break;
    vec4 L = uLayer[i];
    float fi = float(i);
    float depth = uLayers > 1 ? fi / float(uLayers - 1) : 1.0;
    vec2 p = uv + uShift * (0.25 + depth) + vec2(0.0, uDrop * (1.0 - depth));
    float x = p.x * aspect;
    float n = fbm(vec2(x * L.z + uSeed * 1.37 + fi * 7.31, fi * 3.7 + uSeed * 0.71));
    float ridged = 1.0 - abs(2.0 * vnoise(vec2(x * L.z * 2.3 + fi * 5.1 + uSeed, fi + uSeed * 0.3)) - 1.0);
    float h = L.x + L.y * ((n - 0.5) * 2.0 + (ridged - 0.5) * 0.35);

    float bleed = 0.0025 + 0.004 * vnoise(vec2(x * 40.0, fi * 9.0));
    float below = smoothstep(h + bleed, h - bleed, p.y);
    if (below > 0.0) { // above this ridge line: no ink from it, skip the expensive part
    if (i == 0) col = mix(col, skyBack, below);
    float fall = clamp((h - p.y) / (0.12 + 0.08 * depth), 0.0, 1.0);
    float tex = fbm3(vec2(x * 18.0, p.y * 22.0) + fi * 4.0 + uSeed);
    float dens = L.w * uInkScale * (1.0 - uMist * 0.95 * fall) * (0.82 + 0.36 * tex);
    float fog = smoothstep(0.42, 0.78, fbm3(vec2(x * 1.6 + uTime * uDrift * (0.4 + depth), p.y * 5.0 + fi * 2.0)));
    dens *= 1.0 - uMist * fog * fall * 0.9;

    // the crest: the brush presses hardest along the ridge line and skips where it runs dry
    float under = h - p.y;
    if (under < 0.03) {
      float crest = 1.0 - smoothstep(0.0, 0.004 + 0.01 * depth, under);
      float press = smoothstep(0.25, 0.7, vnoise(vec2(x * 9.0 + fi * 13.0, fi * 2.0 + uSeed)));
      dens += crest * crest * press * 0.45 * L.w * uInkScale;
    }

    float edge = mix(-0.2, 1.2, uPaint[i]) + (fbm3(vec2(p.y * 14.0, fi * 3.0 + uSeed)) - 0.5) * 0.18;
    float painted = 1.0 - smoothstep(edge - 0.035, edge + 0.035, uv.x);
    col = mix(col, uInk, clamp(below * dens * painted, 0.0, 1.0));
    }
    // the flock flies in front of the ridge it follows and behind the nearer ones
    if (i == uBirdLayer && uBirdCount > 0) col = mix(col, uInk, birdInk(uv, aspect) * 0.8 * uInkScale);
  }

  col += (hash2(uv * uResolution * 0.5) - 0.5) * uGrain * 0.1;
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

