// Mô hình 3D con nai sao — dựng từ hình vẽ tay 2d/nai-sao.webp
// Cùng phong cách nhung mềm và cùng giao diện (update / greet / lookAt / idle) với chú thỏ (model.js).
(function (root) {
  function buildDeer(THREE, opts) {
    opts = opts || {};
    const forExport = !!opts.forExport;

    const C = {
      fur: 0xd99a62,      // lông nâu caramel
      cream: 0xfcefdc,    // đốm, yếm, mõm, đuôi
      antler: 0xf0d9ae,   // gạc
      hoof: 0x6e4a33,     // chân
      nose: 0x5a3526,
      pink: 0xffc2cc,
      blush: 0xffa9b8,
      blushLine: 0xe9839a,
      ink: 0x2b2326,
      white: 0xffffff,
      mouth: 0x7a2434,
      sole: 0xa9dcf2,     // dép xanh nhạt
      strap: 0x4d9fd8,
    };

    // ---------- chất liệu nhung mềm (giống chú thỏ) ----------
    let grain = null;
    if (!forExport) {
      const N = 128, d = new Uint8Array(N * N * 4);
      for (let i = 0; i < N * N; i++) {
        const v = 110 + Math.random() * 145;
        d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
      }
      grain = new THREE.DataTexture(d, N, N, THREE.RGBAFormat);
      grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
      grain.repeat.set(10, 10);
      grain.magFilter = THREE.LinearFilter;
      grain.minFilter = THREE.LinearMipmapLinearFilter;
      grain.generateMipmaps = true;
      grain.needsUpdate = true;
    }
    const GLOSSY = { Ink: 0.3, White: 0.25, Mouth: 0.45, Pink: 0.6, Nose: 0.35 };
    const mats = {};
    function mat(color, name) {
      if (mats[name]) return mats[name];
      let m;
      const painted = name === "Paint"; // hoa văn vẽ thẳng lên da (màu theo đỉnh)
      if (painted) color = 0xffffff;
      if (forExport) {
        m = new THREE.MeshStandardMaterial({ color, roughness: GLOSSY[name] ?? 0.85, metalness: 0, vertexColors: painted });
      } else if (GLOSSY[name] !== undefined) {
        m = new THREE.MeshPhysicalMaterial({ color, roughness: GLOSSY[name], clearcoat: name === 'Ink' || name === 'Nose' ? 0.6 : 0 });
      } else {
        const sheenColor = painted ? new THREE.Color(0xf3d9bf) : new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.55);
        m = new THREE.MeshPhysicalMaterial({
          color, roughness: 0.92, metalness: 0, vertexColors: painted,
          sheen: 1, sheenRoughness: 0.55, sheenColor,
          bumpMap: grain, bumpScale: 0.35,
        });
      }
      m.name = name;
      return (mats[name] = m);
    }
    function part(geo, color, name) {
      const m = new THREE.Mesh(geo, mat(color, name.split('_')[0]));
      m.name = name;
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    }
    function ellip(rx, ry, rz, seg) {
      seg = Math.max(seg || 48, 48);
      const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
      g.scale(rx, ry, rz);
      return g;
    }
    const Z = new THREE.Vector3(0, 0, 1);
    const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    // tô màu từng đỉnh: fn(x,y,z) trả về mức pha 0..1 giữa màu nền và màu hoa văn
    function paint(geo, base, accent, fn) {
      const p = geo.attributes.position, n = p.count, col = new Float32Array(n * 3);
      const cb = new THREE.Color(base), ca = new THREE.Color(accent), c = new THREE.Color();
      for (let i = 0; i < n; i++) {
        c.copy(cb).lerp(ca, fn(p.getX(i), p.getY(i), p.getZ(i)));
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      return geo;
    }
    // một đốm hình elip mềm mép: d<1 bên trong
    const blob = (d) => 1 - smoothstep(0.82, 1.0, d);
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

    const deer = new THREE.Group();
    deer.name = 'SikaDeer';
    const up = new THREE.Group(); // mọi thứ trừ bàn chân, nâng lên một chút
    up.name = 'Upper';
    up.position.y = 0.12;
    deer.add(up);

    // ---------- thân (ngắn, tròn) ----------
    const bodyPts = [
      [0, 0.16], [0.3, 0.17], [0.44, 0.24], [0.48, 0.37], [0.46, 0.55],
      [0.39, 0.76], [0.26, 0.92], [0, 0.98],
    ].map((p) => new THREE.Vector2(p[0], p[1]));
    const bodyGeo = new THREE.LatheGeometry(new THREE.SplineCurve(bodyPts).getPoints(110), 180);
    bodyGeo.scale(1, 1, 0.9);
    // hoa văn: yếm kem hình chữ U trước ngực + đốm sao trên lưng/hông — vẽ thẳng lên da, không nổi lên
    const SPOTS = [[100, 0.52, 0.065], [125, 0.74, 0.055], [140, 0.4, 0.06], [165, 0.62, 0.065], [195, 0.46, 0.06],
      [215, 0.72, 0.055], [235, 0.36, 0.06], [258, 0.58, 0.055], [180, 0.84, 0.045], [112, 0.3, 0.05], [248, 0.28, 0.05]];
    paint(bodyGeo, C.fur, C.cream, (x, y, z) => {
      const a = Math.atan2(x, z / 0.9), r = Math.hypot(x, z / 0.9);
      // yếm: elip mềm phía trước, đáy tròn như chữ U
      let k = blob(Math.hypot((a * r) / 0.23, (y - 0.6) / 0.27));
      for (const [deg, y0, rad] of SPOTS) {
        let da = a - (deg * Math.PI) / 180;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        k = Math.max(k, blob(Math.hypot((da * r) / rad, (y - y0) / (rad * 0.8))));
      }
      return k;
    });
    const body = part(bodyGeo, 0xffffff, "Paint_Body");
    up.add(body);

    // đuôi xoăn như đám mây
    const tail = new THREE.Group();
    tail.name = 'Tail';
    tail.position.set(0.1, 0.4, -0.42);
    for (const [x, y, z, r] of [[0, 0, 0, 0.09], [0.07, 0.07, -0.02, 0.07], [0.09, -0.04, -0.03, 0.065]]) {
      const puff = part(ellip(r, r, r * 0.9, 24), C.cream, 'Cream_Tail');
      puff.position.set(x, y, z);
      tail.add(puff);
    }
    up.add(tail);

    // tay (xoay quanh vai để vẫy được)
    const ARM_REST = 0.3;
    const arms = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.name = 'Arm' + (s < 0 ? 'L' : 'R');
      pivot.position.set(0.37 * s, 0.74, 0.03);
      pivot.rotation.z = ARM_REST * s;
      const ag = new THREE.CapsuleGeometry(0.095, 0.2, 12, 32);
      ag.translate(0, -0.17, 0);
      paint(ag, C.fur, C.hoof, (x, y) => smoothstep(-0.27, -0.33, y) * 0.85);
      const arm = part(ag, 0xffffff, "Paint_Arm");
      pivot.add(arm);
      up.add(pivot);
      arms.push(pivot);
    }

    // chân + đôi dép quá cỡ (đế dày, quai ngang, quả bông) giống chú thỏ
    for (const s of [-1, 1]) {
      const foot = part(ellip(0.21, 0.13, 0.29), C.hoof, "Hoof_Foot" + (s < 0 ? "L" : "R"));
      foot.position.set(0.23 * s, 0.13, 0.12);
      foot.rotation.y = 0.2 * s;
      deer.add(foot);
      const leg = part(ellip(0.14, 0.12, 0.14), C.fur, "Fur_Leg");
      leg.position.set(0.23 * s, 0.28, 0.02);
      deer.add(leg);

      const slipper = new THREE.Group();
      slipper.name = "Slipper" + (s < 0 ? "L" : "R");
      slipper.position.set(0.24 * s, 0, 0.12);
      slipper.rotation.y = 0.2 * s;
      const sole = part(ellip(0.25, 0.055, 0.47, 48), C.sole, "Sole_Slipper");
      sole.position.set(0, 0.05, 0.1);
      const strapGeo = new THREE.TorusGeometry(0.21, 0.048, 12, 32, Math.PI);
      strapGeo.scale(1, 0.95, 1.3);
      const strap = part(strapGeo, C.strap, "Strap_Slipper");
      strap.position.set(0, 0.08, 0.2);
      strap.rotation.x = -0.25;
      const pom = part(ellip(0.08, 0.075, 0.075, 24), C.cream, "Cream_Pom");
      pom.position.set(0, 0.3, 0.27);
      slipper.add(sole, strap, pom);
      deer.add(slipper);
    }

    // ---------- đầu ----------
    const headPivot = new THREE.Group();
    headPivot.name = 'HeadPivot';
    const HEAD_Y = 0.95;
    headPivot.position.set(0, HEAD_Y, 0);
    headPivot.rotation.order = 'YXZ';
    up.add(headPivot);

    const HA = 0.6, HB = 0.54, HC = 0.56;
    const headGeo = ellip(HA, HB, HC, 128);
    // đốm trên trán: 3 hạt bầu dục + 2 vạch nhỏ hai bên, vẽ phẳng trên da
    const FORE = [[-0.1, 0.33, 0.032, 0.05, -0.25], [0, 0.36, 0.032, 0.05, 0], [0.1, 0.33, 0.032, 0.05, 0.25],
      [-0.21, 0.27, 0.017, 0.045, 0.5], [0.21, 0.27, 0.017, 0.045, -0.5]];
    paint(headGeo, C.fur, C.cream, (x, y, z) => {
      if (z <= 0) return 0;
      let k = 0;
      for (const [cx, cy, rx, ry, rot] of FORE) {
        const dx = x - cx, dy = y - cy, c = Math.cos(rot), sn = Math.sin(rot);
        const u = dx * c + dy * sn, v = -dx * sn + dy * c;
        k = Math.max(k, blob(Math.hypot(u / rx, v / ry)));
      }
      return k;
    });
    const head = part(headGeo, 0xffffff, "Paint_Head");
    head.position.set(0, 0.48, 0);
    headPivot.add(head);

    function onHead(x, y, lift) {
      const z = HC * Math.sqrt(Math.max(0, 1 - (x / HA) ** 2 - (y / HB) ** 2));
      const n = new THREE.Vector3(x / (HA * HA), y / (HB * HB), z / (HC * HC)).normalize();
      const h = new THREE.Group();
      h.position.set(x, y, z).addScaledVector(n, lift || 0);
      h.quaternion.setFromUnitVectors(Z, n);
      head.add(h);
      return h;
    }

    // mắt to long lanh + mắt cười ^ ^
    const openEyes = [], happyEyes = [];
    for (const s of [-1, 1]) {
      const h = onHead(0.215 * s, 0.03, -0.012);
      const open = new THREE.Group();
      open.add(part(ellip(0.11, 0.105, 0.04, 28), C.ink, 'Ink_Eye'));
      const hi1 = part(ellip(0.045, 0.04, 0.015, 16), C.white, 'White_Shine');
      hi1.position.set(-0.03, 0.035, 0.032);
      const hi2 = part(ellip(0.02, 0.02, 0.01, 12), C.white, 'White_Shine2');
      hi2.position.set(0.045, -0.035, 0.034);
      const hi3 = part(ellip(0.012, 0.012, 0.008, 10), C.white, 'White_Shine3');
      hi3.position.set(0.02, 0.05, 0.034);
      open.add(hi1, hi2, hi3);
      h.add(open);
      openEyes.push(open);

      const happyGeo = new THREE.TorusGeometry(0.075, 0.017, 8, 28, Math.PI);
      happyGeo.scale(1, 0.85, 0.6);
      const happy = part(happyGeo, C.ink, 'Ink_HappyEye');
      happy.position.set(0, -0.03, 0.02);
      happy.visible = false;
      h.add(happy);
      happyEyes.push(happy);

      // má hồng + 2 vạch má
      const ch = onHead(0.37 * s, -0.12, -0.004);
      ch.add(part(ellip(0.09, 0.05, 0.02, 24), C.blush, 'Blush_Cheek'));
      for (const k of [-1, 1]) {
        const line = part(new THREE.CapsuleGeometry(0.008, 0.05, 4, 6), C.blushLine, 'BlushLine');
        line.rotation.z = Math.PI / 2 + 0.5 * s;
        line.position.set(0.02 * k, 0.0, 0.018);
        ch.add(line);
      }
    }

    // mõm kem + mũi + miệng ω
    const mz = onHead(0, -0.2, -0.05);
    mz.name = 'Muzzle';
    mz.add(part(ellip(0.25, 0.15, 0.13, 40), C.cream, 'Cream_Muzzle'));
    const nose = part(ellip(0.055, 0.04, 0.035, 24), C.nose, 'Nose_Tip');
    nose.position.set(0, 0.06, 0.115);
    mz.add(nose);
    const mouthH = new THREE.Group();
    mouthH.position.set(0, -0.025, 0.125);
    mz.add(mouthH);
    const omega = new THREE.Group();
    for (const s of [-1, 1]) {
      const arc = part(new THREE.TorusGeometry(0.035, 0.009, 8, 24, Math.PI), C.ink, 'Ink_Mouth');
      arc.rotation.z = Math.PI;
      arc.position.x = 0.035 * s;
      omega.add(arc);
    }
    const philtrum = part(new THREE.CapsuleGeometry(0.008, 0.03, 4, 6), C.ink, 'Ink_Philtrum');
    philtrum.position.set(0, 0.03, 0);
    omega.add(philtrum);
    mouthH.add(omega);
    const smile = new THREE.Group();
    const smileGeo = new THREE.CircleGeometry(0.065, 32, Math.PI, Math.PI);
    smileGeo.scale(1, 0.85, 1);
    smile.add(part(smileGeo, C.mouth, 'Mouth_Open'));
    const tongue = part(ellip(0.035, 0.02, 0.01, 16), C.pink, 'Pink_Tongue');
    tongue.position.set(0, -0.037, 0.004);
    smile.add(tongue);
    smile.position.z = 0.004;
    smile.visible = false;
    mouthH.add(smile);

    // tai nhỏ ở gốc gạc
    const ears = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.name = 'Ear' + (s < 0 ? 'L' : 'R');
      pivot.position.set(0.4 * s, 0.3, -0.04);
      pivot.rotation.z = -0.35 * s;
      const eg = ellip(0.15, 0.085, 0.06, 32);
      eg.translate(0.11 * s, 0, 0);
      const ear = part(eg, C.fur, 'Fur_Ear');
      const ig = ellip(0.09, 0.05, 0.02, 24);
      ig.translate(0.12 * s, 0, 0.045);
      ear.add(part(ig, C.pink, 'Pink_InnerEar'));
      pivot.add(ear);
      pivot.userData.rest = -0.35 * s;
      head.add(pivot);
      ears.push(pivot);
    }

    // gạc: ống cong (TubeGeometry) bo tròn hai đầu
    function branch(points, r, parent) {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2] || 0)));
      const g = new THREE.TubeGeometry(curve, 48, r, 14, false);
      parent.add(part(g, C.antler, 'Antler_Branch'));
      for (const p of [points[0], points[points.length - 1]]) {
        const cap = part(ellip(r, r, r, 16), C.antler, 'Antler_Cap');
        cap.position.set(p[0], p[1], p[2] || 0);
        parent.add(cap);
      }
    }
    const antlers = [];
    for (const s of [-1, 1]) {
      const a = new THREE.Group();
      a.name = 'Antler' + (s < 0 ? 'L' : 'R');
      a.position.set(0.22 * s, 0.44, -0.04);
      a.rotation.z = -0.12 * s;
      a.scale.setScalar(1.35);
      // thân gạc chính
      branch([[0, -0.05], [0.03 * s, 0.12], [0.02 * s, 0.28], [0.07 * s, 0.42]], 0.038, a);
      if (s > 0) {
        // bên phải: chẻ nhánh hình chữ Y
        branch([[0.02 * s, 0.2], [0.12 * s, 0.28], [0.2 * s, 0.3]], 0.032, a);
      } else {
        // bên trái: nhánh xoăn như đám mây
        const pts = [];
        const cx = 0.13 * s, cy = 0.22;
        for (let i = 0; i <= 24; i++) {
          const th = Math.PI + (i / 24) * Math.PI * 1.6;
          const rr = 0.09 - (i / 24) * 0.05;
          pts.push([cx + Math.cos(th) * rr * -s, cy + Math.sin(th) * rr]);
        }
        pts.unshift([0.02 * s, 0.18]);
        branch(pts, 0.03, a);
      }
      head.add(a);
      antlers.push(a);
    }

    // ---------- hoạt ảnh ----------
    const GREET_EVERY = 7, GREET_DUR = 2.8;
    let greetStart = -99, nextGreet = 1.2;
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    function greet(t) { greetStart = t; nextGreet = t + GREET_EVERY; }

    function update(t) {
      // đuôi ngoe nguẩy
      tail.rotation.y = Math.sin(t * 7) * 0.35 * (0.5 + 0.5 * Math.sin(t * 0.9));
      // tai thỉnh thoảng giật nhẹ
      const flick = Math.max(0, Math.sin(t * 1.7) - 0.9) * 6;
      ears[0].rotation.z = ears[0].userData.rest + flick * 0.25;
      ears[1].rotation.z = ears[1].userData.rest - flick * 0.2;

      if (t >= nextGreet) greet(t);
      const p = (t - greetStart) / GREET_DUR;
      const k = p >= 0 && p <= 1 ? smooth(0, 0.12, p) * (1 - smooth(0.85, 1, p)) : 0;

      const blink = k < 0.05 && (t % 3.3) < 0.13 ? 0.1 : 1;
      for (const e of openEyes) { e.scale.y = Math.max(0.05, (1 - k) * blink); e.visible = k < 0.7; }
      for (const e of happyEyes) { e.visible = k > 0.3; e.scale.setScalar(0.6 + 0.4 * k); }
      omega.visible = k < 0.4;
      smile.visible = k >= 0.4;
      smile.scale.setScalar(0.5 + 0.5 * k);

      const R = arms[1];
      R.rotation.z = ARM_REST + k * 2.15 + k * Math.sin(t * 11) * 0.35;
      R.rotation.x = -k * 0.25;

      updateLook();
      return k;
    }

    // thở nhẹ + nghiêng đầu (dùng ở trang xem 3D)
    function idle(t) {
      body.scale.set(1 + Math.sin(t * 2) * 0.012, 1 - Math.sin(t * 2) * 0.012, 1);
      headPivot.rotation.z = Math.sin(t * 1.2) * 0.05;
      headPivot.position.y = HEAD_Y + Math.sin(t * 2) * 0.01;
    }

    // đầu + mắt nhìn theo camera
    const lookTarget = new THREE.Vector3(), lv = new THREE.Vector3();
    const headCenter = new THREE.Vector3(0, 0.48, 0);
    let hasLook = false, curYaw = 0, curPitch = 0, eyeX = 0, eyeY = 0;
    function lookAt(worldPos) { lookTarget.copy(worldPos); hasLook = true; }
    function updateLook() {
      if (!hasLook) return;
      const parent = headPivot.parent;
      parent.updateWorldMatrix(true, false);
      lv.copy(lookTarget);
      parent.worldToLocal(lv);
      lv.sub(headCenter).sub(headPivot.position);
      const yaw = Math.atan2(lv.x, lv.z);
      const pitch = Math.atan2(lv.y, Math.hypot(lv.x, lv.z));
      const hy = clamp(yaw, -0.87, 0.87), hp = clamp(pitch, -0.45, 0.52);
      curYaw += (hy - curYaw) * 0.08;
      curPitch += (hp - curPitch) * 0.08;
      headPivot.rotation.y = curYaw;
      headPivot.rotation.x = -curPitch;
      eyeX += (clamp((yaw - curYaw) * 0.06, -0.03, 0.03) - eyeX) * 0.15;
      eyeY += (clamp((pitch - curPitch) * 0.06, -0.025, 0.025) - eyeY) * 0.15;
      for (const e of openEyes) e.position.set(eyeX, eyeY, 0);
    }

    return { root: deer, head, headPivot, ears, arms, body, tail, antlers, update, greet, lookAt, idle };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { buildDeer };
  root.buildDeer = buildDeer;
})(typeof window !== 'undefined' ? window : globalThis);
