"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { audioEngine } from "@/lib/audio";

type Panel = {
  mesh: THREE.Mesh;
  base: THREE.Vector3;
  dir: THREE.Vector3; // explode direction
  spin: THREE.Vector3; // explode spin axis
  phase: number; // idle-drift phase offset
  flash: number; // hover charge, decays each frame
};

/**
 * The OmniStack mark - three stacked rounded bars - rendered in 3D gold.
 * Idle rotation with per-bar drift, magnetic cursor follow, raycast hover
 * highlight, hold-to-blast explode, and a scroll-linked separation. Every
 * interaction feeds one `explodeAmt` (via Math.max) so states blend smoothly.
 * Not rendered at all under reduced motion - the parent shows a static hero.
 */
export function HeroSymbol({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 8);

    // Environment for gold reflections.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;

    // Lights add warmth and rim definition on top of the env reflections.
    const key = new THREE.DirectionalLight(0xfff0d0, 2.2);
    key.position.set(3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xd4af37, 1.4);
    rim.position.set(-4, -1, -3);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0x404040, 0.6));

    const group = new THREE.Group();
    scene.add(group);

    // Three stacked bars, matching the logo mark (top brightest -> bottom).
    const BAR_W = 3.0;
    const BAR_H = 0.92;
    const BAR_D = 0.62;
    const GAP = 1.18;
    const yPos = [GAP, 0, -GAP];
    const roughs = [0.22, 0.3, 0.4];
    const panels: Panel[] = [];

    yPos.forEach((y, i) => {
      const geo = new RoundedBoxGeometry(BAR_W, BAR_H, BAR_D, 6, 0.34);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        metalness: 1.0,
        roughness: roughs[i],
        envMapIntensity: 1.25,
        emissive: 0x1a1204,
        emissiveIntensity: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, y, 0);
      group.add(mesh);
      panels.push({
        mesh,
        base: new THREE.Vector3(0, y, 0),
        dir: new THREE.Vector3((i - 1) * 0.5, y * 1.7, (i - 1) * 0.7).normalize(),
        spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
        phase: (i * Math.PI * 2) / 3,
        flash: 0,
      });
    });

    // ---- interaction state ----
    const st = {
      rotY: -0.5,
      mouseX: 0,
      mouseY: 0,
      screenX: -9999,
      screenY: -9999,
      holding: false,
      holdTime: 0,
      blasted: false,
      clickBurst: 0,
      scrollProg: 0,
      introAmt: 1, // starts assembled-from-explosion
      hovered: null as THREE.Mesh | null,
    };

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    function resize() {
      const w = renderer.domElement.clientWidth || 1;
      const h = renderer.domElement.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      st.screenX = e.clientX;
      st.screenY = e.clientY;
      st.mouseX = ((e.clientX - r.left) / r.width) * 2 - 1;
      st.mouseY = -(((e.clientY - r.top) / r.height) * 2 - 1);
      ndc.set(st.mouseX, st.mouseY);
    };
    const onDown = () => {
      // Only start the blast if the press actually lands on the symbol, so
      // clicking a button or empty space doesn't trigger it.
      if (st.screenX === -9999) return;
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(
        panels.map((p) => p.mesh),
        false,
      );
      if (!hit.length) return;
      st.holding = true;
      st.holdTime = 0;
    };
    const onUp = () => {
      st.holding = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    const onScroll = () => {
      st.scrollProg = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.9)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Pause the loop when the hero is off-screen or the tab is hidden.
    let visible = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    let raf = 0;
    const clock = new THREE.Clock();
    let lastT = 0;

    function frame() {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;

      // Derive dt from elapsed time - do NOT also call clock.getDelta(), since
      // getElapsedTime() already advances the clock and would zero it out.
      const t = clock.getElapsedTime();
      const dt = Math.min(t - lastT, 0.05);
      lastT = t;

      // Intro assembles the symbol over the first ~1.2s.
      if (st.introAmt > 0) st.introAmt = Math.max(0, st.introAmt - dt / 1.2);

      // Hold-to-blast: 0.5s charge, then ramp clickBurst 0 -> 1.
      if (st.holding) {
        st.holdTime += dt;
        if (st.holdTime >= 0.5) {
          if (!st.blasted) {
            audioEngine.blast();
            st.blasted = true;
          }
          st.clickBurst = Math.min(1, st.clickBurst + dt * 2.2);
        }
      } else {
        st.clickBurst = Math.max(0, st.clickBurst - dt * 1.6);
        st.blasted = false;
      }

      const explodeAmt = Math.max(st.scrollProg, st.clickBurst, st.introAmt);

      // Auto-rotate, eased toward the cursor for a magnetic feel.
      st.rotY += 0.0035;
      group.rotation.y += (st.rotY + st.mouseX * 0.35 - group.rotation.y) * 0.05;
      group.rotation.x += (st.mouseY * 0.22 - group.rotation.x) * 0.05;

      // Hover highlight via raycast (only when assembled).
      let nowHit: THREE.Mesh | null = null;
      if (st.screenX !== -9999 && explodeAmt < 0.15) {
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(
          panels.map((p) => p.mesh),
          false,
        );
        if (hits.length) nowHit = hits[0].object as THREE.Mesh;
      }
      if (nowHit && nowHit !== st.hovered) audioEngine.hover();
      st.hovered = nowHit;

      panels.forEach((p) => {
        // Flash charge: rise on hover, exponential decay otherwise.
        p.flash = p.mesh === st.hovered ? Math.min(1, p.flash + dt * 6) : p.flash * 0.92;
        const mat = p.mesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 1 + p.flash * 6;
        mat.envMapIntensity = 1.25 + p.flash * 1.5;

        const drift = 1 - explodeAmt;
        const dx = Math.sin(t * 0.5 + p.phase) * 0.05 * drift;
        const dy = Math.cos(t * 0.42 + p.phase) * 0.045 * drift;

        p.mesh.position.set(
          p.base.x + p.dir.x * explodeAmt * 4.5 + dx,
          p.base.y + p.dir.y * explodeAmt * 4.5 + dy,
          p.base.z + p.dir.z * explodeAmt * 4.5,
        );
        p.mesh.rotation.x = p.spin.x * explodeAmt * Math.PI * 1.1;
        p.mesh.rotation.z = p.spin.z * explodeAmt * Math.PI * 1.1;
      });

      // Fade the whole symbol out as it explodes on scroll.
      group.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m) {
          m.transparent = true;
          m.opacity = 1 - Math.min(1, st.scrollProg * 1.3);
        }
      });

      renderer.render(scene, camera);
    }
    frame();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("scroll", onScroll);
      panels.forEach((p) => {
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
      });
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
