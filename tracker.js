// Bộ bám hình dự phòng: so khớp mẫu (NCC) trên ảnh xám độ phân giải thấp.
// Dùng khi MindAR mất dấu vì hình vẽ ở xa / bị nhòe. Ảnh nhỏ + NCC chịu nhòe rất tốt.
(function (root) {
  function sample(g, W, H, x, y) {
    if (x < 0 || y < 0 || x > W - 1.001 || y > H - 1.001) return NaN;
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * W + x0;
    return (g[i] * (1 - fx) + g[i + 1] * fx) * (1 - fy) + (g[i + W] * (1 - fx) + g[i + W + 1] * fx) * fy;
  }

  // Lấy mẫu một vùng (tâm cx,cy, nửa rộng hw, nửa cao hh) thành lưới tối đa maxN x maxN điểm
  function createTemplate(g, W, H, cx, cy, hw, hh, maxN) {
    maxN = maxN || 36;
    const nx = Math.max(10, Math.min(maxN, Math.round(2 * hw)));
    const ny = Math.max(10, Math.min(maxN, Math.round(2 * hh)));
    const n = nx * ny;
    const dx = new Float32Array(n), dy = new Float32Array(n), v = new Float32Array(n);
    let k = 0, sum = 0;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const ox = -hw + ((i + 0.5) * 2 * hw) / nx, oy = -hh + ((j + 0.5) * 2 * hh) / ny;
        const p = sample(g, W, H, cx + ox, cy + oy);
        if (Number.isNaN(p)) return null; // vùng mẫu phải nằm trọn trong khung
        dx[k] = ox; dy[k] = oy; v[k] = p; sum += p; k++;
      }
    }
    const mean = sum / n;
    let ss = 0;
    for (let i = 0; i < n; i++) { v[i] -= mean; ss += v[i] * v[i]; }
    if (Math.sqrt(ss / n) < 4) return null; // vùng trơn, không đủ nét để bám
    const norm = Math.sqrt(ss);
    for (let i = 0; i < n; i++) v[i] /= norm;
    return { dx, dy, v, n, hw, hh };
  }

  function ncc(g, W, H, t, x, y, s) {
    let sf = 0, sff = 0, sft = 0, miss = 0;
    const n = t.n;
    for (let k = 0; k < n; k++) {
      const p = sample(g, W, H, x + s * t.dx[k], y + s * t.dy[k]);
      if (p !== p) { miss++; continue; }
      sf += p; sff += p * p; sft += p * t.v[k];
    }
    const m = n - miss;
    if (m < n * 0.7) return -1;
    const varf = sff - (sf * sf) / m;
    if (varf < 1e-6) return -1;
    return sft / Math.sqrt(varf);
  }

  // Tìm quanh (px,py) với tỉ lệ s0 trong bán kính R (px ảnh làm việc)
  function match(g, W, H, t, px, py, s0, R) {
    R = R || 16;
    let best = { x: px, y: py, s: s0, conf: -1 };
    for (const s of [s0 * 0.88, s0, s0 * 1.12]) {
      for (let oy = -R; oy <= R; oy += 2) {
        for (let ox = -R; ox <= R; ox += 2) {
          const c = ncc(g, W, H, t, px + ox, py + oy, s);
          if (c > best.conf) best = { x: px + ox, y: py + oy, s, conf: c };
        }
      }
    }
    const b0 = best;
    for (const s of [b0.s * 0.96, b0.s, b0.s * 1.04]) {
      for (let oy = -2; oy <= 2; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
          const c = ncc(g, W, H, t, b0.x + ox, b0.y + oy, s);
          if (c > best.conf) best = { x: b0.x + ox, y: b0.y + oy, s, conf: c };
        }
      }
    }
    return best;
  }

  const api = { sample, createTemplate, ncc, match };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LiteTracker = api;
})(typeof window !== 'undefined' ? window : globalThis);
