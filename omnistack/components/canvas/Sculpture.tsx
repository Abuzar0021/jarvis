"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { audioEngine } from "@/lib/audio";
import { showToast } from "@/components/motion/Toast";
import { useSafeReducedMotion } from "@/components/motion/useSafeReducedMotion";

const ACCENT = "#c6a15b";
const BRIGHT = "#e9c879";

/**
 * The design's fixed background sculpture: a flat-shaded icosahedron shell
 * wrapped in a gold wireframe lattice, a lit core, and six octahedra orbiting
 * it. Its position and scale are keyframed against whole-page scroll progress,
 * with cursor parallax on top and a "burst" impulse when you click it.
 *
 * Ported from the design's initStage/tick. Raw three rather than react-three-
 * fiber: the source is imperative and frame-driven, so a direct port is both
 * smaller and easier to keep faithful.
 *
 * Skipped entirely under prefers-reduced-motion, and skipped if WebGL is
 * unavailable. Phones do get it, at 0.62 scale as the design specifies, with a
 * lower pixel-ratio cap so a 3x screen is not drawing nine times the pixels.
 */
export function Sculpture() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useSafeReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
    } catch {
      return; // no WebGL: the page still reads fine without it
    }

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.5 : 2),
    );
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      46,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    camera.position.z = 6.4;

    const group = new THREE.Group();
    const accent = new THREE.Color(ACCENT);
    const bright = new THREE.Color(BRIGHT);

    const geo = new THREE.IcosahedronGeometry(1.75, 1);
    const shellMat = new THREE.MeshStandardMaterial({
      color: accent,
      metalness: 1,
      roughness: 0.34,
      flatShading: true,
      transparent: true,
      opacity: 0.16,
    });
    const shell = new THREE.Mesh(geo, shellMat);
    group.add(shell);

    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.95,
    });
    group.add(new THREE.LineSegments(edges, lineMat));

    const coreGeo = new THREE.IcosahedronGeometry(0.52, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: bright,
      metalness: 1,
      roughness: 0.18,
      emissive: accent,
      emissiveIntensity: 0.5,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    const satGeos: THREE.BufferGeometry[] = [];
    const satMats: THREE.Material[] = [];
    const sats = Array.from({ length: 6 }, (_, i) => {
      const g = new THREE.OctahedronGeometry(0.13 + (i % 3) * 0.05, 0);
      const m = new THREE.MeshStandardMaterial({
        color: i % 2 ? bright : accent,
        metalness: 1,
        roughness: 0.25,
      });
      satGeos.push(g);
      satMats.push(m);
      const mesh = new THREE.Mesh(g, m);
      group.add(mesh);
      return {
        mesh,
        r: 2.5 + (i % 3) * 0.5,
        a: (i / 6) * Math.PI * 2,
        sp: 0.22 + i * 0.05,
        yo: (i % 2 ? 1 : -1) * (0.4 + i * 0.16),
      };
    });

    const ambient = new THREE.AmbientLight(0x2a2118, 1.1);
    const l1 = new THREE.PointLight(0xe9c879, 2.4, 40);
    l1.position.set(3.4, 3.6, 5);
    const l2 = new THREE.PointLight(0xc6a15b, 1.2, 40);
    l2.position.set(-4.6, -2.4, 2.6);
    const l3 = new THREE.DirectionalLight(0xede7da, 0.5);
    l3.position.set(-1, 4, -3);
    scene.add(ambient, l1, l2, l3, group);

    // Scroll keyframes: the sculpture crosses the page as you read down it.
    const keys = [
      { p: 0.0, x: 2.45, y: 0.05, s: 0.86 },
      { p: 0.17, x: -2.3, y: 0.35, s: 0.66 },
      { p: 0.38, x: 2.2, y: -0.25, s: 0.74 },
      { p: 0.58, x: 0.0, y: 1.85, s: 0.46 },
      { p: 0.79, x: -2.4, y: 0.1, s: 0.62 },
      { p: 1.0, x: 0.0, y: 0.0, s: 1.62 },
    ];

    const lerpKeys = (p: number) => {
      for (let i = 0; i < keys.length - 1; i++) {
        if (p <= keys[i + 1].p || i === keys.length - 2) {
          const a = keys[i];
          const b = keys[i + 1];
          let t = (p - a.p) / (b.p - a.p);
          t = Math.max(0, Math.min(1, t));
          t = t * t * (3 - 2 * t); // smoothstep
          return {
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            s: a.s + (b.s - a.s) * t,
          };
        }
      }
      return keys[0];
    };

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let tx = 0;
    let ty = 0;
    let smooth = window.scrollY;
    let burst = 0;
    let hits = 0;
    const t0 = performance.now();
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };

    // Cached viewport and document metrics. scrollHeight in particular forces a
    // synchronous layout, so reading it every frame would stall the whole loop.
    let vw = window.innerWidth;
    let vh = window.innerHeight;
    let scrollMax = Math.max(1, document.documentElement.scrollHeight - vh);

    const measure = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      scrollMax = Math.max(1, document.documentElement.scrollHeight - vh);
    };

    // The page grows as images and fonts settle, so remeasure when it does
    // rather than assuming the first reading holds.
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);

    const onResize = () => {
      measure();
      renderer.setSize(vw, vh, false);
      camera.aspect = vw / vh;
      camera.updateProjectionMatrix();
    };

    // Clicking the sculpture kicks it. Hit-test by projecting its centre.
    const onClick = (e: MouseEvent) => {
      const v = group.position.clone().project(camera);
      const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
      if (Math.hypot(e.clientX - sx, e.clientY - sy) < 150 * (group.scale.x || 1)) {
        burst = 1;
        hits += 1;
        audioEngine.blast();
        showToast(
          hits > 2 ? "It does this all day, you know" : "Careful, it is load-bearing",
        );
      }
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);

      const raw = window.scrollY;
      smooth += (raw - smooth) * 0.085;
      if (Math.abs(raw - smooth) < 0.08) smooth = raw;
      const p = Math.max(0, Math.min(1, smooth / scrollMax));

      const time = (performance.now() - t0) / 1000;
      const k = lerpKeys(p);
      const narrow = vw < 760;
      const scale = narrow ? 0.62 : 1;

      burst *= 0.94;
      if (burst < 0.001) burst = 0;

      tx += (mx / vw - 0.5 - tx) * 0.06;
      ty += (my / vh - 0.5 - ty) * 0.06;

      group.position.x = k.x * scale * (narrow ? 0.4 : 1) + tx * 0.5;
      group.position.y = k.y - ty * 0.4 + Math.sin(time * 0.6) * 0.08;
      group.scale.setScalar(k.s * scale * (1 + burst * 0.22));
      group.rotation.y = p * Math.PI * 3.4 + time * 0.16 + burst * 1.4 + tx * 0.5;
      group.rotation.x = Math.sin(p * Math.PI * 2) * 0.42 - ty * 0.45;
      group.rotation.z = p * 0.7;

      core.scale.setScalar(1 + burst * 1.5 + Math.sin(time * 2.2) * 0.05);
      lineMat.opacity = 0.72 + 0.28 * Math.abs(Math.sin(p * Math.PI)) + burst * 0.3;
      shellMat.opacity = 0.1 + p * 0.14;
      // Footer easter egg. copy() rather than set() so this stays a few float
      // assignments per frame instead of a hex parse.
      lineMat.color.copy(document.documentElement.dataset.gilded ? bright : accent);

      const spread = 1 + p * 0.55 + burst * 1.6;
      for (const o of sats) {
        const a = o.a + time * o.sp + p * 2.4;
        o.mesh.position.set(
          Math.cos(a) * o.r * spread,
          o.yo * spread * 0.7 + Math.sin(a * 1.4) * 0.3,
          Math.sin(a) * o.r * spread * 0.6,
        );
        o.mesh.rotation.set(a * 1.3, a, 0);
        o.mesh.scale.setScalar(1 + burst * 0.8);
      }

      renderer.render(scene, camera);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("click", onClick);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("click", onClick);
      geo.dispose();
      edges.dispose();
      coreGeo.dispose();
      shellMat.dispose();
      lineMat.dispose();
      coreMat.dispose();
      satGeos.forEach((g) => g.dispose());
      satMats.forEach((m) => m.dispose());
      renderer.dispose();
    };
  }, [reduce]);

  if (reduce) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] h-full w-full"
    />
  );
}
