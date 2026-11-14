/*
 * Tel Aviv in ink and fog: an animated ink-wash painting shown as a banner
 * across the top of every page except posts. Paints into <canvas id="ink-banner">
 * (see layout.ejs).
 *
 * The city is drawn once into a 2048 x 1024 mask (one ink per colour channel)
 * and a fragment shader wets, bleeds and fogs it every frame.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('ink-banner');
  if (!canvas) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    '',
    'uniform vec2  uRes;',
    'uniform float uPx;',
    'uniform float uTime;',
    'uniform float uForm;',
    'uniform vec3  uScene;',
    'uniform sampler2D uMask;',
    'uniform vec4  uBloom[8];',
    '',
    'const float HV = 0.625;',
    '',
    'float hash(vec2 p) {',
    '  vec3 p3 = fract(vec3(p.xyx) * 0.1031);',
    '  p3 += dot(p3, p3.yzx + 33.33);',
    '  return fract((p3.x + p3.y) * p3.z);',
    '}',
    'float vnoise(vec2 p) {',
    '  vec2 i = floor(p), f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),',
    '             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);',
    '}',
    'const mat2 ROT = mat2(1.616, 1.212, -1.212, 1.616);',
    'float fbm(vec2 p) {',
    '  float a = 0.5, s = 0.0;',
    '  for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = ROT * p + 19.1; a *= 0.5; }',
    '  return s / 0.96875;',
    '}',
    'float fbm3(vec2 p) {',
    '  float a = 0.5, s = 0.0;',
    '  for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = ROT * p + 7.7; a *= 0.5; }',
    '  return s / 0.875;',
    '}',
    '',
    'void main() {',
    '  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);',
    '  float SW = uScene.z;',
    '  vec2 q = vec2((px.x - 0.5 * uRes.x) / SW + uScene.x, (px.y - uScene.y * uRes.y) / SW);',
    '  float t = uTime;',
    '  vec2 cp = px / uPx;',
    '',
    '  float pA    = fbm(q * 3.2 + 4.0);',
    '  float grain = vnoise(cp * 0.9);',
    '  float fiber = vnoise(vec2(dot(cp, vec2(0.96, 0.28)) * 0.07, dot(cp, vec2(-0.28, 0.96)) * 0.6))',
    '              * vnoise(cp * 0.011 + 3.0);',
    '  vec3 paper = vec3(0.925, 0.908, 0.872);',
    '  paper *= 0.955 + 0.075 * pA;',
    '  paper -= 0.020 * grain + 0.022 * smoothstep(0.30, 0.62, fiber);',
    '  vec2 sc = px / uRes - 0.5;',
    '  paper *= 1.0 - 0.15 * pow(dot(sc, sc) * 2.0, 1.3);',
    '',
    '  vec2 w1 = vec2(fbm3(q * 4.5 + vec2(0.0, t * 0.030)),',
    '                 fbm3(q * 4.5 + vec2(37.2, -t * 0.024))) - 0.5;',
    '  float dzn   = fbm(q * vec2(2.1, 2.7) + vec2(t * 0.019, -t * 0.007) + 11.0);',
    '  float pulse = 0.5 + 0.5 * sin(t * 0.09 + q.x * 5.0);',
    '  float diss  = smoothstep(0.60, 0.75, dzn + 0.09 * pulse);',
    '  float nR    = fbm3(q * 3.5 + 23.0);',
    '  float rv    = clamp((uForm * 1.45 - nR) / 0.45, 0.0, 1.0);',
    '  rv = rv * rv * (3.0 - 2.0 * rv);',
    '  float dis   = max(diss, 1.0 - rv);',
    '',
    '  float wet    = fbm(q * 7.0 + vec2(3.1, t * 0.012));',
    '  float gran   = fbm(q * 42.0 + 8.0);',
    '  float streak = vnoise(vec2(q.x * 520.0, q.y * 26.0 + 2.0));',
    '  float nb     = fbm3(q * 13.0 + 31.0);',
    '',
    '  float sea  = smoothstep(0.0, 0.012, q.y);',
    '  float sy   = max(q.y, 0.0);',
    '  float rows = log(sy + 0.012);',
    '  float r1 = vnoise(vec2(q.x * 4.5 - t * 0.035, rows * 7.0 + t * 0.07));',
    '  float r2 = vnoise(vec2(q.x * 10.0 + t * 0.05, rows * 15.0 - t * 0.05) + 5.0);',
    '  float wob = (sin(rows * 15.0 + r1 * 7.0 - t * 0.9 + q.x * 9.0) * 0.0012 * (1.0 + sy * 22.0) + (r2 - 0.5) * 0.004) * sea;',
    '',
    '  vec2 uv = vec2(q.x + wob * 0.2, HV + q.y * 2.0);',
    '  vec2 wv = w1 * vec2(1.0, 2.0);',
    '  vec2 jit = (vec2(vnoise(q * 70.0), vnoise(q * 70.0 + 9.0)) - 0.5) * vec2(0.003, 0.006);',
    '  vec2 uvS = uv + wv * (0.006 + 0.07 * dis) + jit;',
    '  vec3 mS = texture2D(uMask, uvS, 0.3 + 4.5 * dis).rgb;',
    '  vec3 mE = texture2D(uMask, uvS, 2.6 + 3.0 * dis).rgb;',
    '  vec3 mB = texture2D(uMask, uv + wv * (0.03 + 0.10 * dis) - vec2(0.0, 0.010), 4.6 + 1.5 * dis).rgb;',
    '',
    '  vec3 edge = clamp(mS - mE, 0.0, 1.0);',
    '  float tone  = 0.45 + 1.1 * wet;',
    '  float tex   = (0.72 + 0.56 * gran) * (0.8 + 0.4 * smoothstep(0.25, 0.75, streak));',
    '  float sharp = 1.0 - 0.8 * dis;',
    '',
    '  float dFar  = mS.r * 0.15 * sharp * tone + mB.r * 0.07 * (1.0 + 1.5 * dis);',
    '  float dMid  = (mS.g * 0.52 * tone * tex + edge.g * 0.35) * sharp + mB.g * 0.17 * (1.0 + 1.8 * dis);',
    '  float dNear = (mS.b * 1.5 * (0.7 + 0.6 * wet) * tex + edge.b * 0.7) * sharp + mB.b * 0.32 * (1.0 + 1.6 * dis);',
    '',
    '  float fl   = fbm(q * 8.0 + w1 * 2.5 + vec2(t * 0.015, t * 0.02));',
    '  float tend = pow(1.0 - abs(2.0 * fl - 1.0), 7.0);',
    '  float pool = mB.r * 0.4 + mB.g + mB.b * 1.6;',
    '  float dAbs = dis * pool * (0.25 + 1.3 * tend) * 0.55;',
    '',
    '  float f1 = fbm(vec2(q.x * 2.3 - t * 0.022, q.y * 8.0 + t * 0.004) + 50.0);',
    '  float f2 = fbm3(vec2(q.x * 5.5 + t * 0.03, q.y * 15.0) + 70.0);',
    '  float band  = exp(-pow((q.y + 0.010) / 0.034, 2.0));',
    '  float bank  = smoothstep(0.50, 0.72, f1) * smoothstep(-0.30, -0.06, q.y) * (1.0 - smoothstep(0.0, 0.07, q.y));',
    '  float wisps = smoothstep(0.55, 0.8, f2) * exp(-pow((q.y + 0.08) / 0.09, 2.0));',
    '  float fog = clamp(band * (0.55 + 0.9 * f1) + 0.85 * bank + 0.5 * wisps, 0.0, 1.0);',
    '',
    '  float skyW = 0.055 * smoothstep(0.40, 0.75, fbm3(q * vec2(1.6, 3.2) + 90.0))',
    '             * smoothstep(-0.55, -0.10, q.y) * (1.0 - smoothstep(-0.02, 0.05, q.y));',
    '',
    '  float strokes = (smoothstep(0.74, 0.94, r1) * 0.065 + smoothstep(0.80, 0.96, r2) * 0.04)',
    '                * (0.5 + 0.9 * gran) * sea * smoothstep(0.0, 0.03, sy)',
    '                * (1.0 - 0.8 * smoothstep(0.07, 0.30, sy));',
    '  vec2 uvR = vec2(q.x + wob, HV - sy * 2.3 - 0.004);',
    '  vec3 mR = texture2D(uMask, uvR + wv * 0.01, 2.5 + sy * 40.0).rgb;',
    '  float refl = (mR.r * 0.08 + mR.g * 0.27 + mR.b * 0.75) * exp(-sy * 11.0)',
    '             * (0.35 + 0.65 * smoothstep(0.3, 0.7, r1 + (r2 - 0.5) * 0.6)) * sea * (0.25 + 0.75 * rv);',
    '',
    '  float dBloom = 0.0, lift = 0.0;',
    '  for (int i = 0; i < 8; i++) {',
    '    vec4 b = uBloom[i];',
    '    float a = (t - b.z) / 18.0;',
    '    if (a > 0.0 && a < 1.0) {',
    '      float R = b.w * (0.18 + 0.82 * pow(a, 0.45));',
    '      float d = length(q - b.xy) / R;',
    '      float n = nb * 0.65 + 0.35 * vnoise(q * 27.0 + b.xy * 113.0);',
    '      d *= 0.5 + 0.75 * n + 0.35 * vnoise(q * 9.0 + b.xy * 57.0);',
    '      float env  = smoothstep(0.0, 0.06, a) * (1.0 - smoothstep(0.35, 1.0, a));',
    '      float body = (1.0 - smoothstep(0.55, 1.0, d)) * (0.35 + 0.65 * d);',
    '      float rim  = exp(-pow((d - 0.92) / 0.14, 2.0)) * (0.4 + 0.9 * gran);',
    '      dBloom += env * (0.11 * body + 0.10 * rim);',
    '      lift   += env * (1.0 - smoothstep(0.5, 0.95, d));',
    '    }',
    '  }',
    '  lift = clamp(lift, 0.0, 1.0);',
    '',
    '  vec2 sp = (px - vec2(0.24, 0.23) * uRes) / min(uRes.x, uRes.y);',
    '  float sd = length(sp) / 0.05 * (0.9 + 0.2 * nb);',
    '  float sunD = (1.0 - smoothstep(0.80, 1.06, sd)) * (0.5 + 0.6 * wet) * 0.26',
    '             * (1.0 - 0.75 * smoothstep(0.42, 0.68, f1));',
    '',
    '  float clear = 1.0 - 0.93 * fog;',
    '  float form  = 0.18 + 0.82 * rv;',
    '  dFar  *= clear * form;',
    '  dMid  *= clear * form * (1.0 - 0.45 * lift);',
    '  dNear *= (1.0 - 0.75 * fog) * form * (1.0 - 0.25 * lift);',
    '  dAbs  *= 1.0 - 0.6 * fog;',
    '  float dWash = skyW * (1.0 - 0.9 * fog) + strokes + refl + dBloom * (1.0 - 0.5 * fog);',
    '',
    '  float tooth = 0.86 + 0.28 * grain;',
    '  vec3 aCool = vec3(1.0, 0.90, 0.76);',
    '  vec3 aMid  = vec3(1.0, 0.95, 0.86);',
    '  vec3 aNear = vec3(1.0, 0.985, 0.95);',
    '  vec3 T = exp(-2.3 * tooth * (aCool * (dFar + dWash) + aMid * (dMid + dAbs) + aNear * dNear));',
    '  vec3 col = paper * T;',
    '  col *= exp(-vec3(0.08, 0.62, 0.68) * sunD * tooth);',
    '',
    '  col += (hash(gl_FragCoord.xy) - 0.5) * 0.008;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  /* ------------------------------------------------------------------
     The brushwork: red = far towers, green = the city, blue = near ink.
     ------------------------------------------------------------------ */
  var MW = 2048, MH = 1024, HZ = 640;

  function mulberry(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function buildMask() {
    var R = mulberry(1909);
    var c = document.createElement('canvas');
    c.width = MW; c.height = MH;
    var g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, MW, MH);
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    g.lineJoin = 'round';

    var CH = ['255,0,0', '0,255,0', '0,0,255'];
    function ink(ch, a) { return 'rgba(' + CH[ch] + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')'; }

    function jag(x0, y0, x1, y1, amp) {
      var d = Math.hypot(x1 - x0, y1 - y0) || 1;
      var n = Math.max(1, Math.ceil(d / 14));
      var nx = -(y1 - y0) / d, ny = (x1 - x0) / d;
      for (var i = 1; i <= n; i++) {
        var k = i / n, j = i < n ? (R() - 0.5) * 2 * (amp || 1.2) : 0;
        g.lineTo(x0 + (x1 - x0) * k + nx * j, y0 + (y1 - y0) * k + ny * j);
      }
    }

    function bld(ch, x, w, h, o) {
      o = o || {};
      var baseY = o.baseY == null ? HZ : o.baseY;
      var top = baseY - h, base = baseY + (o.sink == null ? 5 : o.sink);
      var a = o.a == null ? 0.8 : o.a;
      var prof = (o.prof || [[0, 0], [1, 0]]).map(function (p) { return [x + p[0] * w, top + p[1] * h]; });
      for (var pass = 0; pass < 3; pass++) {
        var ox = (R() - 0.5) * 2.6, oy = (R() - 0.5) * 2.2;
        g.beginPath();
        g.moveTo(x + ox, base);
        var cx = x + ox, cy = base;
        for (var i = 0; i < prof.length; i++) {
          jag(cx, cy, prof[i][0] + ox, prof[i][1] + oy);
          cx = prof[i][0] + ox; cy = prof[i][1] + oy;
        }
        jag(cx, cy, x + w + ox, base);
        g.closePath();
        var gr = g.createLinearGradient(0, top, 0, base);
        gr.addColorStop(0, ink(ch, a * 0.42));
        gr.addColorStop(o.midAt == null ? 0.55 : o.midAt, ink(ch, a * 0.42 * (o.mid == null ? 0.62 : o.mid)));
        gr.addColorStop(1, ink(ch, a * 0.42 * (o.foot == null ? 0.06 : o.foot)));
        g.fillStyle = gr;
        g.fill();
      }
    }

    function line(ch, pts, width, a) {
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) jag(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 0.7);
      g.lineWidth = width;
      g.strokeStyle = ink(ch, a);
      g.stroke();
    }

    function curve(ch, x0, y0, cx, cy, x1, y1, width, a) {
      g.beginPath();
      g.moveTo(x0, y0);
      g.quadraticCurveTo(cx, cy, x1, y1);
      g.lineWidth = width;
      g.strokeStyle = ink(ch, a);
      g.stroke();
    }

    var i, x;

    /* ---------- far ink ---------- */
    bld(0, 118, 74, 26, { a: 0.6, foot: 0.3 });
    bld(0, 168, 7, 152, { a: 0.75, mid: 0.8, foot: 0.2 });
    bld(0, 414, 22, 118, { a: 0.6 });
    bld(0, 446, 24, 136, { a: 0.6 });
    bld(0, 760, 24, 150, { a: 0.6 });
    bld(0, 798, 32, 216, { a: 0.75, prof: [[0, 0.07], [0.12, 0.015], [0.34, 0], [0.6, 0.015], [0.62, 0.1], [1, 0.1]] });
    bld(0, 842, 26, 166, { a: 0.6 });
    bld(0, 876, 20, 122, { a: 0.5 });
    for (i = 0; i < 16; i++) {
      x = 540 + R() * 1060;
      bld(0, x, 16 + R() * 20, 46 + R() * 80, { a: 0.42 + R() * 0.2 });
    }

    /* ---------- the low white city along the shore ---------- */
    x = -10;
    while (x < MW + 10) {
      var w = 10 + R() * 26;
      var centre = Math.exp(-Math.pow((x - 1150) / 520, 2));
      var h = 6 + R() * 18 + R() * 20 * centre;
      bld(R() < 0.45 ? 0 : 1, x, w, h, { a: 0.3 + R() * 0.3, foot: 0.25, sink: 3 });
      x += w * (0.55 + R() * 0.7);
    }

    /* ---------- the city ---------- */
    bld(1, 276, 62, 60, { a: 0.5 });
    bld(1, 518, 46, 70, { a: 0.5 });
    bld(1, 606, 40, 88, { a: 0.55, prof: [[0, 0.16], [0.2, 0.16], [0.2, 0.07], [0.4, 0.07], [0.4, 0], [0.6, 0], [0.6, 0.07], [0.8, 0.07], [0.8, 0.16], [1, 0.16]] });
    bld(1, 688, 52, 56, { a: 0.45 });

    bld(1, 902, 15, 150, { a: 0.7 });
    bld(1, 895, 29, 30, { a: 0.6, baseY: HZ - 126, sink: 0, foot: 0.7, mid: 0.9 });
    line(1, [[909.5, HZ - 154], [910, HZ - 228]], 2.2, 0.85);
    line(1, [[904, HZ - 178], [916, HZ - 178]], 1.6, 0.7);
    line(1, [[905.5, HZ - 196], [914.5, HZ - 196]], 1.4, 0.6);

    bld(1, 950, 52, 236, { a: 0.92, prof: [[0, 0.014], [0.08, 0], [0.92, 0], [1, 0.014]] });
    for (i = 0; i < 12; i++) line(1, [[953, HZ - 226 + i * 15], [999, HZ - 226 + i * 15]], 1.3, 0.14 * (1 - i / 14));
    bld(1, 1011, 46, 214, { a: 0.88, prof: [[0, 0.05], [0.52, 0], [1, 0.05]] });
    line(1, [[1035, HZ - 212], [1035, HZ - 70]], 1.4, 0.2);
    bld(1, 1066, 44, 194, { a: 0.84 });
    for (i = 0; i < 4; i++) line(1, [[1075 + i * 9, HZ - 190], [1075 + i * 9, HZ - 80]], 1.1, 0.1);

    bld(1, 1134, 50, 300, { a: 0.95, prof: [[-0.07, 0.56], [0.1, 0.045], [0.84, 0], [1.09, 0.5]] });
    line(1, [[1131, HZ - 132], [1174, HZ - 298]], 1.3, 0.18);

    bld(1, 1214, 34, 204, { a: 0.8 });
    bld(1, 1254, 30, 180, { a: 0.72, prof: [[0, 0.06], [0.25, 0.01], [0.5, 0], [0.75, 0.01], [1, 0.06]] });

    bld(1, 1330, 21, 190, { a: 0.82 });
    bld(1, 1360, 30, 150, { a: 0.7 });
    bld(1, 1408, 66, 128, { a: 0.86 });
    for (i = 0; i < 7; i++) line(1, [[1416 + i * 8.4, HZ - 124], [1416 + i * 8.4, HZ - 50]], 1.1, 0.12);
    bld(1, 1490, 25, 160, { a: 0.78, prof: [[0, 0.05], [0.3, 0.05], [0.3, 0], [0.7, 0], [0.7, 0.05], [1, 0.05]] });
    bld(1, 1528, 34, 100, { a: 0.6 });
    bld(1, 1574, 30, 62, { a: 0.5 });

    /* ---------- near ink: Jaffa on its hill ---------- */
    function hillY(px) {
      var u = (px - 1616) / 400;
      if (u <= 0 || u >= 1) return HZ;
      return HZ - 62 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.82)), 1.25);
    }
    for (var pass = 0; pass < 3; pass++) {
      g.beginPath();
      g.moveTo(1612, HZ + 12);
      for (x = 1616; x <= 2016; x += 9) g.lineTo(x, hillY(x) + (R() - 0.5) * 3);
      g.lineTo(2020, HZ + 12);
      g.closePath();
      var hg = g.createLinearGradient(0, HZ - 62, 0, HZ + 12);
      hg.addColorStop(0, ink(2, 0.32));
      hg.addColorStop(0.75, ink(2, 0.2));
      hg.addColorStop(1, ink(2, 0.03));
      g.fillStyle = hg;
      g.fill();
    }
    for (i = 0; i < 30; i++) {
      x = 1640 + R() * 340;
      bld(2, x, 12 + R() * 22, 9 + R() * 19, { a: 0.6 + R() * 0.35, baseY: hillY(x + 8) + 7, sink: 2, foot: 0.45, mid: 0.85 });
    }
    bld(2, 1770, 54, 30, { a: 0.95, baseY: hillY(1796) + 8, sink: 2, foot: 0.5 });
    bld(2, 1803, 15, 76, { a: 1, baseY: hillY(1810) + 6, sink: 2, foot: 0.5, mid: 0.9, prof: [[0, 0.2], [0.5, 0], [1, 0.2]] });
    line(2, [[1810.5, hillY(1810) - 70], [1810.5, hillY(1810) - 80]], 1.5, 0.9);
    bld(2, 1699, 5.5, 52, { a: 1, baseY: hillY(1702) + 6, sink: 2, foot: 0.6, mid: 0.95, prof: [[0, 0.14], [0.5, 0], [1, 0.14]] });
    line(2, [[1695.5, hillY(1702) - 30], [1708, hillY(1702) - 30]], 2, 0.9);
    [1748, 1757, 1866, 1930].forEach(function (cxp) {
      bld(2, cxp, 8, 26 + R() * 10, { a: 0.95, baseY: hillY(cxp) + 5, sink: 2, foot: 0.7, mid: 0.95, prof: [[0.05, 0.62], [0.5, 0], [0.95, 0.62]] });
    });
    [[1652, 34], [1900, 30], [1962, 26]].forEach(function (p) {
      var bx = p[0], by = hillY(bx) + 6, th = p[1], lean = (R() - 0.5) * 10;
      curve(2, bx, by, bx + lean * 0.3, by - th * 0.6, bx + lean, by - th, 2.2, 0.9);
      for (var k = 0; k < 9; k++) {
        var ang = -Math.PI * (0.05 + 0.9 * k / 8), len = 11 + R() * 5;
        var ex = bx + lean + Math.cos(ang) * len, ey = by - th + Math.sin(ang) * len * 0.75 + 5;
        curve(2, bx + lean, by - th, bx + lean + Math.cos(ang) * len * 0.6, by - th + Math.sin(ang) * len - 3, ex, ey, 1.5, 0.8);
      }
    });
    line(2, [[1610, HZ + 4], [1760, HZ + 5], [1900, HZ + 4], [2018, HZ + 3]], 3.6, 0.7);

    [[300, 84], [520, 70], [748, 60]].forEach(function (b) {
      line(2, [[b[0], HZ + 15], [b[0] + b[1], HZ + 15 + (R() - 0.5) * 2]], 2.4, 0.3);
    });

    function boat(bx, by, s) {
      curve(2, bx - 17 * s, by - 1 * s, bx, by + 8 * s, bx + 19 * s, by - 2 * s, 3.4 * s, 0.95);
      line(2, [[bx + 1 * s, by + 1 * s], [bx + 2 * s, by - 35 * s]], 1.5 * s, 0.9);
      g.beginPath();
      g.moveTo(bx + 4 * s, by - 33 * s); g.lineTo(bx + 4 * s, by - 5 * s); g.lineTo(bx + 20 * s, by - 6 * s);
      g.closePath(); g.fillStyle = ink(2, 0.42); g.fill();
      g.beginPath();
      g.moveTo(bx, by - 28 * s); g.lineTo(bx, by - 6 * s); g.lineTo(bx - 11 * s, by - 6 * s);
      g.closePath(); g.fillStyle = ink(2, 0.26); g.fill();
      line(2, [[bx - 12 * s, by + 12 * s], [bx + 12 * s, by + 12 * s]], 1.6 * s, 0.32);
      line(2, [[bx - 7 * s, by + 18 * s], [bx + 9 * s, by + 18 * s]], 1.4 * s, 0.2);
      line(2, [[bx - 3 * s, by + 24 * s], [bx + 5 * s, by + 24 * s]], 1.2 * s, 0.12);
    }
    boat(604, HZ + 128, 1);
    boat(1296, HZ + 60, 0.5);

    [[1262, 286, 12], [1300, 262, 9], [1338, 300, 10], [1372, 250, 7], [1404, 282, 8]].forEach(function (b) {
      var bx = b[0], by = b[1], s = b[2], tilt = (R() - 0.5) * 3;
      curve(2, bx - s, by + tilt, bx - s * 0.45, by - s * 0.55, bx, by, 1.9, 0.85);
      curve(2, bx, by, bx + s * 0.5, by - s * 0.6, bx + s, by - tilt + 1, 1.7, 0.8);
    });

    return c;
  }

  /* ---------- a still version for browsers without WebGL ---------- */
  function fallback(mask) {
    var w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    var src = mask.getContext('2d').getImageData(0, 0, MW, MH);
    var d = src.data;
    for (var i = 0; i < d.length; i += 4) {
      var dens = d[i] / 255 * 0.3 + d[i + 1] / 255 * 0.9 + d[i + 2] / 255 * 2.2;
      d[i] = 236 * Math.exp(-dens * 1.4);
      d[i + 1] = 232 * Math.exp(-dens * 1.34);
      d[i + 2] = 222 * Math.exp(-dens * 1.24);
    }
    var tmp = document.createElement('canvas');
    tmp.width = MW; tmp.height = MH;
    tmp.getContext('2d').putImageData(src, 0, 0);
    canvas.width = w; canvas.height = h;
    var g = canvas.getContext('2d');
    if (!g) return;
    g.fillStyle = '#ece8de';
    g.fillRect(0, 0, w, h);
    g.filter = 'blur(1.2px)';
    var sw = Math.max(w, 0.7 * h * 0.9 / 0.146);
    g.drawImage(tmp, (w - sw) / 2, 0.7 * h - (HZ / MH) * sw / 2, sw, sw / 2);
  }

  var mask = buildMask();

  var gl = null;
  try {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  } catch (e) { gl = null; }
  if (!gl) { fallback(mask); return; }

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      if (window.console) console.warn(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  var vs = compile(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }');
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  var prog = gl.createProgram();
  if (vs && fs) {
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
  }
  if (!vs || !fs || !gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    // a fresh canvas is needed: this one is already bound to WebGL
    var fresh = canvas.cloneNode(false);
    canvas.parentNode.replaceChild(fresh, canvas);
    canvas = fresh;
    fallback(mask);
    return;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, mask);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  var U = {};
  ['uRes', 'uPx', 'uTime', 'uForm', 'uScene', 'uMask', 'uBloom'].forEach(function (n) {
    U[n] = gl.getUniformLocation(prog, n);
  });
  gl.uniform1i(U.uMask, 0);

  /* ---------- layout ---------- */
  var HORIZON = 0.7;   // a banner is mostly sky and city, with a strip of sea
  var TALLEST = 0.146; // height of the tallest tower above the horizon, in scene widths
  var quality = 1, cssW = 0, cssH = 0, sceneW = 1, sceneCx = 0.5;

  function layout() {
    cssW = canvas.clientWidth || window.innerWidth;
    cssH = canvas.clientHeight || window.innerHeight;
    var s = Math.min(window.devicePixelRatio || 1, 1.5) * quality;
    var maxPx = 1.2e6;
    if (cssW * cssH * s * s > maxPx) s = Math.sqrt(maxPx / (cssW * cssH));
    canvas.width = Math.max(2, Math.round(cssW * s));
    canvas.height = Math.max(2, Math.round(cssH * s));
    gl.viewport(0, 0, canvas.width, canvas.height);
    // scale the scene so the tallest tower just fits under the top edge; a narrow
    // screen then sees a crop of the coast, weighted toward its southern half
    sceneW = Math.max(cssW, HORIZON * cssH * 0.9 / TALLEST);
    var hidden = 1 - cssW / sceneW;
    var k = Math.min(1, hidden / 0.55);
    sceneCx = 0.5 + 0.185 * k * k * (3 - 2 * k);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uPx, s);
    gl.uniform3f(U.uScene, sceneCx, HORIZON, sceneW * s);
  }

  /* ---------- blooms ---------- */
  var N_BLOOM = 8;
  var blooms = new Float32Array(N_BLOOM * 4);
  for (var b = 0; b < N_BLOOM; b++) blooms[b * 4 + 2] = -1000;
  var slot = 0, nextBloom = 1.5;

  function dropInk(x, y, size, t) {
    var i = (slot++ % N_BLOOM) * 4;
    blooms[i] = x; blooms[i + 1] = y; blooms[i + 2] = t; blooms[i + 3] = size;
  }

  function driftingBloom(t) {
    var span = Math.min(1, cssW / sceneW) * 0.9;
    var x = sceneCx + (Math.random() - 0.5) * span;
    var r = Math.random(), y, size;
    if (r < 0.55) { y = -0.02 - Math.random() * 0.15; size = 0.03 + Math.random() * 0.045; }
    else if (r < 0.8) { y = 0.03 + Math.random() * 0.16; size = 0.035 + Math.random() * 0.05; }
    else { y = -0.2 - Math.random() * 0.14; size = 0.04 + Math.random() * 0.06; }
    dropInk(x, y, size, t);
  }

  /* ---------- time ---------- */
  var time = 0, last = 0, lastDraw = 0, frames = 0, slow = 0;
  var FRAME_MS = 1000 / 30; // the ink moves slowly; 30fps is plenty

  // the city forms over the first quarter minute, then every two minutes
  // it half lets go and gathers itself again
  function formAt(t) {
    var k = Math.min(1, t / 16);
    var f = 0.42 + 0.58 * (k * k * (3 - 2 * k));
    var c = t % 120;
    if (t > 60 && c > 92) {
      var u = (c - 92) / 28;
      f -= 0.5 * Math.pow(Math.sin(Math.PI * u), 2);
    }
    return f;
  }

  function draw() {
    gl.uniform1f(U.uTime, time);
    gl.uniform1f(U.uForm, formAt(time));
    gl.uniform4fv(U.uBloom, blooms);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  var visible = true, running = false;

  function frame(now) {
    if (!visible || document.hidden) { running = false; last = 0; lastDraw = 0; return; }
    requestAnimationFrame(frame);
    if (lastDraw && now - lastDraw < FRAME_MS - 2) return;
    var raw = lastDraw ? now - lastDraw : FRAME_MS;
    lastDraw = now;
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 30;
    last = now;
    time += dt;

    if (time > nextBloom) {
      driftingBloom(time);
      nextBloom = time + 3 + Math.random() * 3.5;
    }
    draw();

    // if the machine is struggling, paint on a coarser sheet
    frames++;
    if (raw > 50 && raw < 400) slow++;
    if (frames >= 60) {
      if (slow > 30 && quality > 0.45) { quality *= 0.8; layout(); }
      frames = 0; slow = 0;
    }
  }

  layout();
  draw(); // paint the paper at once so the opaque canvas never flashes black

  var resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { layout(); draw(); }, 120);
  }
  window.addEventListener('resize', onResize);

  if (reduceMotion) {
    // one finished painting, no motion
    time = 47;
    dropInk(sceneCx + 0.07, -0.09, 0.06, 41);
    dropInk(sceneCx - 0.12, 0.08, 0.05, 39);
    draw();
  } else {
    canvas.addEventListener('pointerdown', function (e) {
      var r = canvas.getBoundingClientRect();
      var x = (e.clientX - r.left - 0.5 * cssW) / sceneW + sceneCx;
      var y = (e.clientY - r.top - HORIZON * cssH) / sceneW;
      dropInk(x, y, 0.06 + Math.random() * 0.03, time);
    });

    var start = function () {
      if (running || !visible || document.hidden) return;
      running = true;
      requestAnimationFrame(frame);
    };
    // only paint while the banner is on screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        start();
      }).observe(canvas);
    }
    document.addEventListener('visibilitychange', start);
    start();
  }

  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); canvas.style.visibility = 'hidden'; });
})();
