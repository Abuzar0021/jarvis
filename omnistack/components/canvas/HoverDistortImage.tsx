"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import * as THREE from "three";
import { useSafeReducedMotion } from "@/components/motion/useSafeReducedMotion";

/**
 * A cover image that gains a cursor-following RGB split and a soft lens pull
 * once WebGL is up.
 *
 * The plain next/image is always the real content: it is in the server HTML,
 * it is what crawlers and no-JS visitors see, and it is what stays on screen
 * under reduced motion or when WebGL is missing. The canvas is an opaque layer
 * placed over it, faded in only after a context exists and the same already
 * decoded <img> has been handed to the GPU as a texture. No second download.
 *
 * Raw three rather than react-three-fiber, matching Sculpture.tsx: this is one
 * quad and one shader, so the reconciler would be pure overhead.
 */

const VERTEX = `
varying vec2 vUv;
void main() {
  // y is flipped so uv space runs top-down like the DOM and like the unflipped
  // ImageBitmap, which keeps the pointer maths free of a second inversion.
  vUv = vec2(uv.x, 1.0 - uv.y);
  // The plane is already in clip space (2x2 centred), so no matrices needed.
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAGMENT = `
precision mediump float;
uniform sampler2D uTex;
uniform vec2 uScale;
uniform vec2 uMouse;
uniform float uAmt;
varying vec2 vUv;

void main() {
  // object-cover: sample a centred sub-rect of the texture.
  vec2 uv = (vUv - 0.5) * uScale + 0.5;
  vec2 mouse = (uMouse - 0.5) * uScale + 0.5;

  vec2 d = uv - mouse;
  float fall = exp(-dot(d, d) * 8.0);
  vec2 dir = d / max(length(d), 1e-4);

  vec2 pull = d * fall * 0.14 * uAmt;
  vec2 split = dir * fall * 0.010 * uAmt;

  float r = texture2D(uTex, uv + pull + split).r;
  float g = texture2D(uTex, uv + pull).g;
  float b = texture2D(uTex, uv + pull - split).b;
  gl_FragColor = vec4(r, g, b, 1.0);
}
`;

export function HoverDistortImage({
  src,
  alt,
  className = "",
  imageClassName = "",
  sizes,
}: {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useSafeReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const img = host.querySelector("img");
    if (!img) return;

    let stop: (() => void) | null = null;
    let dropped = false;

    const start = (bitmap: ImageBitmap) => {
      if (dropped || !bitmap.width || !bitmap.height) {
        bitmap.close();
        return;
      }

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
      } catch {
        bitmap.close();
        return; // no WebGL: the plain image underneath is already correct
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      // A bitmap rather than the <img> itself: three sizes its GPU allocation
      // from image.width, which on an in-document <img> is the CSS box, not the
      // pixels. Uploading natural-size data into a CSS-size allocation is what
      // throws GL_INVALID_VALUE.
      const texture = new THREE.Texture(bitmap);
      texture.flipY = false;
      texture.minFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;

      const uniforms = {
        uTex: { value: texture },
        uScale: { value: new THREE.Vector2(1, 1) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uAmt: { value: 0 },
      };

      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
      });
      const scene = new THREE.Scene();
      scene.add(new THREE.Mesh(geometry, material));
      const camera = new THREE.Camera();

      const target = new THREE.Vector2(0.5, 0.5);
      let rect = host.getBoundingClientRect();
      let hovered = false;
      let amt = 0;
      let raf = 0;

      const draw = () => renderer.render(scene, camera);

      const resize = () => {
        rect = host.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        renderer.setSize(rect.width, rect.height, false);
        const box = rect.width / rect.height;
        const nat = bitmap.width / bitmap.height;
        uniforms.uScale.value.set(
          box > nat ? 1 : box / nat,
          box > nat ? nat / box : 1,
        );
        draw();
        canvas.style.opacity = "1";
      };

      const frame = () => {
        amt += ((hovered ? 1 : 0) - amt) * 0.09;
        uniforms.uMouse.value.lerp(target, 0.12);
        uniforms.uAmt.value = amt;
        // Rest reached: draw one clean frame and let the loop die rather than
        // burning a rAF per card for the whole session.
        if (!hovered && amt < 0.002) {
          uniforms.uAmt.value = 0;
          amt = 0;
          raf = 0;
          draw();
          return;
        }
        draw();
        raf = requestAnimationFrame(frame);
      };

      const wake = () => {
        if (!raf) raf = requestAnimationFrame(frame);
      };

      const onMove = (e: PointerEvent) => {
        target.set(
          (e.clientX - rect.left) / rect.width,
          (e.clientY - rect.top) / rect.height,
        );
      };
      const onEnter = (e: PointerEvent) => {
        rect = host.getBoundingClientRect();
        hovered = true;
        onMove(e);
        // Jump the smoothing to the entry point so the split does not sweep in
        // from wherever the cursor left last time.
        uniforms.uMouse.value.copy(target);
        wake();
      };
      const onLeave = () => {
        hovered = false;
        wake();
      };

      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);
      host.addEventListener("pointerenter", onEnter);
      host.addEventListener("pointermove", onMove, { passive: true });
      host.addEventListener("pointerleave", onLeave);

      stop = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        host.removeEventListener("pointerenter", onEnter);
        host.removeEventListener("pointermove", onMove);
        host.removeEventListener("pointerleave", onLeave);
        geometry.dispose();
        material.dispose();
        texture.dispose();
        bitmap.close();
        renderer.dispose();
      };
    };

    // decode() resolves whether the image was already cached or still in
    // flight, and both it and createImageBitmap reuse the bytes next/image
    // already fetched rather than loading the source a second time for the GPU.
    img
      .decode()
      .then(() => createImageBitmap(img))
      .then(start, () => {});

    return () => {
      dropped = true;
      stop?.();
      canvas.style.opacity = "0";
    };
  }, [reduce, src]);

  return (
    <div ref={hostRef} className={`overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={`object-cover ${imageClassName}`}
      />
      {reduce ? null : (
        <canvas
          ref={canvasRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-300 ease-snap"
        />
      )}
    </div>
  );
}
