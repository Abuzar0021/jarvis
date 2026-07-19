"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type StardustHandle = {
  setProgress: (p: number) => void;
};

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// uProgress 0->1 grows a noise-selected "revealed" zone (grain < threshold)
// out from black into the full painting, with a bright fringe at the growth
// boundary and ambient twinkling stardust scattered over the not-yet-revealed
// area. uNoise is a small procedural random texture (no external asset).
const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform sampler2D uNoise;
  uniform float uProgress;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uImageSize;
  varying vec2 vUv;

  vec2 coverUv(vec2 uv, vec2 res, vec2 imgSize) {
    float resAspect = res.x / max(res.y, 1.0);
    float imgAspect = imgSize.x / max(imgSize.y, 1.0);
    vec2 scale = resAspect > imgAspect
      ? vec2(imgAspect / resAspect, 1.0)
      : vec2(1.0, resAspect / imgAspect);
    return (uv - 0.5) * scale + 0.5;
  }

  void main() {
    vec2 coveredUv = coverUv(vUv, uResolution, uImageSize);
    vec3 color = texture2D(uTexture, clamp(coveredUv, 0.0, 1.0)).rgb;

    float grain = texture2D(uNoise, vUv * 2.15 + 0.5).r;
    float sparse = texture2D(uNoise, vUv * 9.0).r;

    float threshold = pow(clamp(uProgress, 0.0, 1.0), 1.35) * 1.12;
    float revealed = 1.0 - smoothstep(threshold - 0.05, threshold + 0.02, grain);
    float edge = 1.0 - smoothstep(0.0, 0.09, abs(grain - threshold));

    float twinkle = 0.55 + 0.45 * sin(uTime * (1.6 + sparse * 5.0) + sparse * 60.0);
    float star = step(0.94, sparse) * twinkle * (1.0 - revealed);

    vec3 base = mix(vec3(0.0), color, revealed);
    vec3 glow = vec3(1.0) * (edge * 1.6 + star * 1.4);

    gl_FragColor = vec4(base + glow, 1.0);
  }
`;

function makeNoiseTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = Math.floor(Math.random() * 255);
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export const StardustPlane = forwardRef<StardustHandle, { src: string }>(
  function StardustPlane({ src }, ref) {
    const { size } = useThree();
    const progressRef = useRef(0);

    const texture = useMemo(() => {
      const t = new THREE.TextureLoader().load(src);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }, [src]);

    const noise = useMemo(() => makeNoiseTexture(256), []);

    const material = useMemo(
      () =>
        new THREE.ShaderMaterial({
          uniforms: {
            uTexture: { value: texture },
            uNoise: { value: noise },
            uProgress: { value: 0 },
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(size.width, size.height) },
            uImageSize: { value: new THREE.Vector2(1, 1) },
          },
          vertexShader,
          fragmentShader,
          depthWrite: false,
          depthTest: false,
        }),
      [texture, noise, size.width, size.height],
    );

    useEffect(() => {
      material.uniforms.uResolution.value.set(size.width, size.height);
    }, [material, size.width, size.height]);

    useEffect(() => {
      const img = texture.image as HTMLImageElement | undefined;
      if (img && img.width) {
        material.uniforms.uImageSize.value.set(img.width, img.height);
      } else {
        texture.onUpdate = () => {
          const loaded = texture.image as HTMLImageElement;
          material.uniforms.uImageSize.value.set(loaded.width, loaded.height);
        };
      }
    }, [material, texture]);

    useImperativeHandle(
      ref,
      () => ({
        setProgress: (p: number) => {
          progressRef.current = p;
        },
      }),
      [],
    );

    useFrame((state) => {
      material.uniforms.uProgress.value = progressRef.current;
      material.uniforms.uTime.value = state.clock.elapsedTime;
    });

    useEffect(
      () => () => {
        material.dispose();
        texture.dispose();
        noise.dispose();
      },
      [material, texture, noise],
    );

    return (
      <mesh material={material} scale={[size.width, size.height, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    );
  },
);
