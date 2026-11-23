// Mô hình 3D chú thỏ đội nón — dựng từ hình vẽ tay trong thư mục 2d/
// Dùng chung cho trình xem (index.html) và script xuất GLB (export-glb.mjs).
(function (root) {
  function buildBunny(THREE, opts) {
    opts = opts || {};
    const forExport = !!opts.forExport;

    const C = {
      fur: 0xfffaf2,
      pink: 0xffc6d0,
      blush: 0xffb1c0,
      blushLine: 0xee8098,
      hat: 0xe9c58c,
      hatDash: 0x7a4e2d,
      ink: 0x2b2326,
      white: 0xffffff,
      bow: 0xe8455a,
      bowDark: 0xb8283f,
      shoe: 0x8f5f3c,
      shoeLight: 0xbc8b5f,
      shoeDark: 0x5a3a24,
      cream: 0xf6efe3,
      accent: 0xf0702a,
    };

    // ---------- materials ----------
    let gradient = null;
    if (!forExport) {
      const d = new Uint8Array([110, 190, 255]);
      gradient = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
      gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
      gradient.needsUpdate = true;
    }
    const mats = {};
    function mat(color, name) {
      if (mats[name]) return mats[name];
      const m = forExport
        ? new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0 })
        : new THREE.MeshToonMaterial({ color, gradientMap: gradient });
      m.name = name;
      return (mats[name] = m);
    }

    // Viền mực kiểu nét vẽ tay (inverted hull)
    let outlineMat = null;
    if (!forExport) {
      outlineMat = new THREE.MeshBasicMaterial({ color: C.ink, side: THREE.BackSide });
      outlineMat.onBeforeCompile = (s) => {
        s.vertexShader = s.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\ntransformed += normalize(normal) * 0.016;'
        );
      };
    }

    function part(geo, color, name, outline) {
      const m = new THREE.Mesh(geo, mat(color, name.split('_')[0]));
      m.name = name;
      m.castShadow = true;
      m.receiveShadow = true;
      if (outline !== false && outlineMat) {
        const o = new THREE.Mesh(geo, outlineMat);
        o.userData.isOutline = true;
        m.add(o);
      }
      return m;
    }
    function ellip(rx, ry, rz, seg) {
      seg = seg || 40;
      const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
      g.scale(rx, ry, rz);
      return g;
    }

    const bunny = new THREE.Group();
    bunny.name = 'HatBunny';
    // phần thân trên (mọi thứ trừ giày), nâng lên để lộ đôi giày
    const up = new THREE.Group();
    up.name = 'Upper';
    up.position.y = 0.2;
    bunny.add(up);

    // ---------- body ----------
    const bodyPts = [
      [0, 0.16], [0.26, 0.17], [0.37, 0.22], [0.41, 0.32], [0.41, 0.5],
      [0.37, 0.78], [0.3, 1.0], [0.18, 1.12], [0, 1.15],
    ].map((p) => new THREE.Vector2(p[0], p[1]));
    const bodyGeo = new THREE.LatheGeometry(bodyPts, 48);
    bodyGeo.scale(1, 1, 0.9);
    const body = part(bodyGeo, C.fur, 'Fur_Body');
    up.add(body);

    // giày boot đồ chơi nâu quá khổ: mũi tròn to, cổ giày ôm chân, đế nâu đậm, vạch màu bên hông
    for (const s of [-1, 1]) {
      const shoe = new THREE.Group();
      shoe.name = "Shoe" + (s < 0 ? "L" : "R");
      shoe.position.set(0.25 * s, 0, 0.1);
      shoe.rotation.y = 0.15 * s;

      const sole = part(ellip(0.265, 0.06, 0.41, 48), C.shoeDark, "ShoeDark_Sole");
      sole.position.set(0, 0.06, 0.1);
      const toe = part(ellip(0.245, 0.165, 0.385, 48), C.shoe, "Shoe_Body");
      toe.position.set(0, 0.17, 0.1);
      const ankle = part(ellip(0.165, 0.18, 0.165, 40), C.shoe, "Shoe_Ankle");
      ankle.position.set(0, 0.27, -0.07);
      const cuffGeo = new THREE.TorusGeometry(0.135, 0.03, 10, 32);
      cuffGeo.rotateX(-Math.PI / 2);
      const cuff = part(cuffGeo, C.shoeDark, "ShoeDark_Cuff");
      cuff.position.set(0, 0.42, -0.07);
      shoe.add(sole, toe, ankle, cuff);

      // vạch màu hình viên thuốc bên hông (ngoài)
      const pillGeo = new THREE.CapsuleGeometry(0.034, 0.14, 6, 12);
      pillGeo.rotateX(Math.PI / 2);
      pillGeo.scale(0.6, 1, 1);
      const pill = part(pillGeo, C.accent, "Accent_Pill", false);
      pill.position.set(0.24 * s, 0.19, 0.1);
      shoe.add(pill);

      bunny.add(shoe);
    }

    // arms
    const arms = [];
    for (const s of [-1, 1]) {
      const arm = part(ellip(0.1, 0.21, 0.1), C.fur, 'Fur_Arm' + (s < 0 ? 'L' : 'R'));
      arm.position.set(0.39 * s, 0.7, 0.03);
      arm.rotation.z = 0.35 * s;
      up.add(arm);
      arms.push(arm);
    }

    // collar flaps
    for (const s of [-1, 1]) {
      const flap = part(ellip(0.13, 0.055, 0.025, 24), C.fur, 'Fur_Collar' + (s < 0 ? 'L' : 'R'));
      flap.position.set(0.17 * s, 1.03, 0.24);
      flap.rotation.set(-0.35, 0.55 * s, -0.45 * s);
      up.add(flap);
    }

    // bow tie
    const bow = new THREE.Group();
    bow.name = 'BowTie';
    bow.position.set(0, 1.01, 0.3);
    bow.rotation.x = -0.3;
    bow.scale.setScalar(1.25);
    // nơ ruy băng: 2 cánh phồng + nút thắt + 2 đuôi
    for (const s of [-1, 1]) {
      const loop = part(ellip(0.105, 0.07, 0.045, 32), C.bow, 'Bow_Loop');
      loop.position.set(0.09 * s, 0.01, 0);
      loop.rotation.z = 0.2 * s;
      // nếp gấp bên trong cánh nơ
      const fold = part(ellip(0.045, 0.028, 0.02, 16), C.bowDark, 'BowDark_Fold', false);
      fold.position.set(0.03 * s, 0, 0.032);
      loop.add(fold);
      bow.add(loop);

      const tailR = part(ellip(0.036, 0.08, 0.02, 20), C.bow, 'Bow_Tail');
      tailR.position.set(0.045 * s, -0.08, -0.005);
      tailR.rotation.z = 0.35 * s;
      bow.add(tailR);
    }
    const knot = part(ellip(0.04, 0.045, 0.04, 20), C.bowDark, 'BowDark_Knot');
    knot.position.z = 0.01;
    bow.add(knot);
    up.add(bow);

    // tail
    const tail = part(ellip(0.12, 0.12, 0.11, 24), C.fur, 'Fur_Tail');
    tail.position.set(0.2, 0.42, -0.36);
    up.add(tail);

    // ---------- head ----------
    const headPivot = new THREE.Group();
    headPivot.name = 'HeadPivot';
    headPivot.position.set(0, 1.12, 0);
    up.add(headPivot);

    const HA = 0.62, HB = 0.57, HC = 0.58;
    const head = part(ellip(HA, HB, HC, 56), C.fur, 'Fur_Head');
    head.position.set(0, 0.5, 0);
    headPivot.add(head);

    // place a holder on the head surface, facing outward
    const Z = new THREE.Vector3(0, 0, 1);
    function onHead(x, y, lift) {
      const z = HC * Math.sqrt(Math.max(0, 1 - (x / HA) ** 2 - (y / HB) ** 2));
      const n = new THREE.Vector3(x / (HA * HA), y / (HB * HB), z / (HC * HC)).normalize();
      const h = new THREE.Group();
      h.position.set(x, y, z).addScaledVector(n, lift || 0);
      h.quaternion.setFromUnitVectors(Z, n);
      head.add(h);
      return h;
    }

    // eyes (to, long lanh)
    for (const s of [-1, 1]) {
      const h = onHead(0.22 * s, -0.03, -0.012);
      h.name = 'Eye' + (s < 0 ? 'L' : 'R');
      h.add(part(ellip(0.105, 0.095, 0.04, 28), C.ink, 'Ink_Eye', false));
      const hi1 = part(ellip(0.042, 0.036, 0.015, 16), C.white, 'White_Shine', false);
      hi1.position.set(-0.035, 0.03, 0.032);
      const hi2 = part(ellip(0.018, 0.018, 0.01, 12), C.white, 'White_Shine2', false);
      hi2.position.set(0.042, -0.038, 0.034);
      h.add(hi1, hi2);

      // eyebrow (nhíu nhẹ)
      const bh = onHead(0.21 * s, 0.15, 0.0);
      const brow = part(new THREE.CapsuleGeometry(0.011, 0.07, 4, 8), C.ink, 'Ink_Brow', false);
      brow.rotation.z = s > 0 ? Math.PI / 2 - 0.3 : -(Math.PI / 2 - 0.3);
      bh.add(brow);

      // blush + 2 vạch má
      const ch = onHead(0.37 * s, -0.15, -0.004);
      ch.add(part(ellip(0.1, 0.055, 0.02, 24), C.blush, 'Blush_Cheek', false));
      for (const k of [-1, 1]) {
        const line = part(new THREE.CapsuleGeometry(0.008, 0.06, 4, 6), C.blushLine, 'BlushLine', false);
        line.rotation.z = Math.PI / 2 + 0.25 * s;
        line.position.set(0.005 * k, 0.022 * k, 0.018);
        ch.add(line);
      }
    }

    // mouth ω
    const mh = onHead(0, -0.15, 0.0);
    mh.name = 'Mouth';
    for (const s of [-1, 1]) {
      const arc = part(new THREE.TorusGeometry(0.042, 0.011, 8, 24, Math.PI), C.ink, 'Ink_Mouth', false);
      arc.rotation.z = Math.PI;
      arc.position.x = 0.042 * s;
      mh.add(arc);
    }

    // floppy ears
    const ears = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.name = 'Ear' + (s < 0 ? 'L' : 'R');
      pivot.position.set(0.36 * s, 0.36, -0.04);
      pivot.rotation.z = 0.85 * s;
      pivot.rotation.x = 0.12;
      const eg = ellip(0.19, 0.4, 0.1, 36);
      eg.translate(0, -0.34, 0);
      const ear = part(eg, C.fur, 'Fur_Ear');
      const ig = ellip(0.115, 0.28, 0.03, 28);
      ig.translate(0, -0.38, 0.075);
      ear.add(part(ig, C.pink, 'Pink_InnerEar', false));
      pivot.add(ear);
      head.add(pivot);
      ears.push(pivot);
    }

    // ---------- hat ----------
    const hat = new THREE.Group();
    hat.name = 'Hat';
    hat.position.set(0.02, 0.4, -0.02);
    hat.rotation.set(-0.1, 0, -0.09);
    head.add(hat);

    const brimPts = [
      [0.4, 0.02], [0.55, 0.0], [0.68, 0.02], [0.77, 0.08], [0.8, 0.13],
      [0.77, 0.145], [0.7, 0.095], [0.56, 0.065], [0.4, 0.075], [0.4, 0.02],
    ].map((p) => new THREE.Vector2(p[0], p[1]));
    hat.add(part(new THREE.LatheGeometry(brimPts, 64), C.hat, 'Hat_Brim'));

    const crownGeo = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    crownGeo.scale(0.45, 0.44, 0.45);
    const crown = part(crownGeo, C.hat, 'Hat_Crown');
    crown.position.y = 0.05;
    hat.add(crown);

    // đường chỉ nét đứt quanh nón
    const N = 14;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = 0.425;
      const dash = part(new THREE.BoxGeometry(0.1, 0.026, 0.05), C.hatDash, 'Stitch_HatDash', false);
      dash.position.set(Math.sin(a) * r, 0.2, Math.cos(a) * r);
      dash.rotation.order = 'YXZ';
      dash.rotation.set(-0.35, a, 0);
      hat.add(dash);
    }

    return { root: bunny, head, headPivot, ears, arms, hat, body };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { buildBunny };
  root.buildBunny = buildBunny;
})(typeof window !== 'undefined' ? window : globalThis);
