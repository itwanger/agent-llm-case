import * as THREE from 'three';

/**
 * 墨迹特效：命中溅墨、飞溅颗粒、弹道线、墙面墨点、死亡墨团。
 * 全部用对象池，游戏过程中不新建几何体。
 */

const MAX_PARTICLES = 420;
const MAX_DECALS = 110;
const MAX_TRACERS = 24;

export class Effects {
  constructor(scene, textures) {
    this.scene = scene;
    this.tex = textures;

    // ---------------- 颗粒（Points） ----------------
    const pg = new THREE.BufferGeometry();
    const pos = new Float32Array(MAX_PARTICLES * 3);
    const col = new Float32Array(MAX_PARTICLES * 3);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      pos[i * 3 + 1] = -9999;
    }
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const pm = new THREE.PointsMaterial({
      size: 0.11,
      map: textures.dot,
      vertexColors: true,
      transparent: true,
      alphaTest: 0.02,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(pg, pm);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    scene.add(this.points);
    this.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({ i, life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0, size: 0 });
    }
    this.pCursor = 0;

    // ---------------- 墨点贴花（Decals） ----------------
    this.decals = [];
    this.decalCursor = 0;
    const decalTextures = [textures.splatInk, textures.splatRed, textures.splatInk2];
    const dg = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < MAX_DECALS; i++) {
      // 每张贴花一份独立材质，才能各自淡出
      const mat = new THREE.MeshBasicMaterial({
        map: decalTextures[0],
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      });
      const m = new THREE.Mesh(dg, mat);
      m.visible = false;
      m.renderOrder = 2;
      scene.add(m);
      this.decals.push({ mesh: m, life: 0, maxLife: 1 });
    }
    this.decalTextures = decalTextures;

    // ---------------- 弹道线 ----------------
    this.tracers = [];
    for (let i = 0; i < MAX_TRACERS; i++) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0x2f4f9e, transparent: true, opacity: 0, depthWrite: false,
      });
      const line = new THREE.Line(g, mat);
      line.frustumCulled = false;
      line.visible = false;
      scene.add(line);
      this.tracers.push({ line, life: 0, maxLife: 0.07 });
    }
    this.tracerCursor = 0;
  }

  // ------------------------------------------------------- 颗粒

  burst(x, y, z, nx, ny, nz, count, color, speed = 3.4, spread = 0.85, size = 0.13, life = 0.5) {
    const c = new THREE.Color(color);
    const posAttr = this.points.geometry.attributes.position;
    const colAttr = this.points.geometry.attributes.color;
    const arr = posAttr.array;
    const carr = colAttr.array;

    for (let n = 0; n < count; n++) {
      const p = this.particles[this.pCursor];
      this.pCursor = (this.pCursor + 1) % MAX_PARTICLES;
      const i = p.i;
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;

      // 沿法线 + 随机锥形散开
      const vx = nx + (Math.random() - 0.5) * spread * 2;
      const vy = ny + (Math.random() - 0.5) * spread * 2 + 0.5;
      const vz = nz + (Math.random() - 0.5) * spread * 2;
      const l = Math.hypot(vx, vy, vz) || 1;
      const sp = speed * (0.4 + Math.random() * 0.9);
      p.vx = (vx / l) * sp;
      p.vy = (vy / l) * sp;
      p.vz = (vz / l) * sp;
      p.life = life * (0.6 + Math.random() * 0.8);
      p.maxLife = p.life;
      p.size = size * (0.6 + Math.random() * 0.8);

      const j = 0.85 + Math.random() * 0.3;
      carr[i * 3] = c.r * j;
      carr[i * 3 + 1] = c.g * j;
      carr[i * 3 + 2] = c.b * j;
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  updateParticles(dt) {
    const posAttr = this.points.geometry.attributes.position;
    const arr = posAttr.array;
    let dirty = false;
    for (let n = 0; n < MAX_PARTICLES; n++) {
      const p = this.particles[n];
      if (p.life <= 0) continue;
      p.life -= dt;
      const i = p.i;
      if (p.life <= 0) {
        arr[i * 3 + 1] = -9999;
        dirty = true;
        continue;
      }
      p.vy -= 14 * dt;
      arr[i * 3] += p.vx * dt;
      arr[i * 3 + 1] += p.vy * dt;
      arr[i * 3 + 2] += p.vz * dt;
      if (arr[i * 3 + 1] < 0.02) {
        arr[i * 3 + 1] = 0.02;
        p.vy = Math.abs(p.vy) * 0.22;
        p.vx *= 0.6;
        p.vz *= 0.6;
      }
      dirty = true;
    }
    if (dirty) posAttr.needsUpdate = true;
  }

  // ------------------------------------------------------- 贴花

  /** kind: 0 蓝墨 1 红墨 2 深蓝 */
  splat(x, y, z, nx, ny, nz, size = 0.5, kind = 0, life = 16, rotate = true) {
    const d = this.decals[this.decalCursor];
    this.decalCursor = (this.decalCursor + 1) % MAX_DECALS;
    const m = d.mesh;
    m.material.map = this.decalTextures[kind] || this.decalTextures[0];
    m.material.opacity = 1;
    m.visible = true;
    m.scale.set(size * (0.8 + Math.random() * 0.5), size * (0.8 + Math.random() * 0.5), 1);
    m.position.set(x + nx * 0.012, y + ny * 0.012, z + nz * 0.012);
    const look = new THREE.Vector3(x + nx, y + ny, z + nz);
    m.lookAt(look);
    if (rotate) m.rotateZ(Math.random() * Math.PI * 2);
    m.material.opacity = 1;
    d.life = life;
    d.maxLife = life;
    d.fadeFrom = 1;
  }

  updateDecals(dt) {
    for (let i = 0; i < this.decals.length; i++) {
      const d = this.decals[i];
      if (d.life <= 0) continue;
      d.life -= dt;
      if (d.life <= 0) {
        d.mesh.visible = false;
        continue;
      }
      if (d.life < 2.5) d.mesh.material.opacity = Math.max(0, d.life / 2.5);
    }
  }

  // ------------------------------------------------------- 弹道

  tracer(ax, ay, az, bx, by, bz, color = 0x2f4f9e) {
    const t = this.tracers[this.tracerCursor];
    this.tracerCursor = (this.tracerCursor + 1) % MAX_TRACERS;
    const a = t.line.geometry.attributes.position.array;
    a[0] = ax; a[1] = ay; a[2] = az;
    a[3] = bx; a[4] = by; a[5] = bz;
    t.line.geometry.attributes.position.needsUpdate = true;
    t.line.geometry.computeBoundingSphere();
    t.line.material.color.setHex(color);
    t.line.material.opacity = 0.85;
    t.line.visible = true;
    t.life = t.maxLife;
  }

  updateTracers(dt) {
    for (let i = 0; i < this.tracers.length; i++) {
      const t = this.tracers[i];
      if (t.life <= 0) continue;
      t.life -= dt;
      if (t.life <= 0) {
        t.line.visible = false;
        continue;
      }
      t.line.material.opacity = (t.life / t.maxLife) * 0.85;
    }
  }

  update(dt) {
    this.updateParticles(dt);
    this.updateDecals(dt);
    this.updateTracers(dt);
  }

  reset() {
    for (const p of this.particles) {
      p.life = 0;
      this.points.geometry.attributes.position.array[p.i * 3 + 1] = -9999;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    for (const d of this.decals) {
      d.life = 0;
      d.mesh.visible = false;
    }
    for (const t of this.tracers) {
      t.life = 0;
      t.line.visible = false;
    }
  }
}
