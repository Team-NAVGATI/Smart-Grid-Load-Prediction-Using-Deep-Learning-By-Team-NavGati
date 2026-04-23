"use client";
import { useEffect, useRef, useState } from "react";



type UseThreeHeroFn = (
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  active: boolean
) => void;

export const useThreeHero: UseThreeHeroFn = (canvasRef, active) => {
  useEffect(() => {
    if (!active || !canvasRef.current || !window.THREE) return;
    const THREE = window.THREE;
    const canvas = canvasRef.current;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 12, 28);
    camera.lookAt(0, 0, 0);

    // Grid plane
    const gridHelper = new THREE.GridHelper(60, 30, 0x06b6d4, 0x0e7490);
    gridHelper.position.y = -2;
    (scene as unknown as { add: (o: object) => void }).add(gridHelper);

    // Energy nodes
    const nodeGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const nodes: ReturnType<typeof THREE.Mesh>[] = [];
    const nodePositions: { x: number; z: number; phase: number }[] = [];

    for (let i = 0; i < 25; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      const x = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 40;
      mesh.position.set(x, -1.8, z);
      nodePositions.push({ x, z, phase: Math.random() * Math.PI * 2 });
      nodes.push(mesh);
      (scene as unknown as { add: (o: object) => void }).add(mesh);
    }

    // Connection lines
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x0891b2,
      transparent: true,
      opacity: 0.4,
    });
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodePositions[i].x - nodePositions[j].x;
        const dz = nodePositions[i].z - nodePositions[j].z;
        if (Math.sqrt(dx * dx + dz * dz) < 12) {
          const pts = [nodes[i].position, nodes[j].position];
          const geo = new THREE.BufferGeometry();
          (geo as unknown as { setFromPoints: (p: object[]) => void }).setFromPoints(pts as object[]);
          (scene as unknown as { add: (o: object) => void }).add(new THREE.Line(geo, lineMat));
        }
      }
    }

    // Pulse rings
    const rings: ReturnType<typeof THREE.Mesh>[] = [];
    const ringGeo = new THREE.RingGeometry(0.3, 0.5, 16);
    for (let i = 0; i < 6; i++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(
        (Math.random() - 0.5) * 30,
        -1.75,
        (Math.random() - 0.5) * 30
      );
      ring.userData = { phase: Math.random() * Math.PI * 2, speed: 0.8 + Math.random() };
      rings.push(ring);
      (scene as unknown as { add: (o: object) => void }).add(ring);
    }

    // Particles
    const particleCount = 120;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x67e8f9,
      size: 0.15,
      transparent: true,
      opacity: 0.6,
    });
    const particles = new THREE.Points(pGeo, pMat);
    (scene as unknown as { add: (o: object) => void }).add(particles);

    let frame: number;
    let t = 0;

    const sceneObj = scene as unknown as { add: (o: object) => void };
    void sceneObj;

    const animate = () => {
      frame = requestAnimationFrame(animate);
      t += 0.01;

      nodes.forEach((n, i) => {
        const scale = 1 + 0.3 * Math.sin(t + nodePositions[i].phase);
        n.scale.setScalar(scale);
        const intensity = 0.5 + 0.5 * Math.sin(t + nodePositions[i].phase);
        n.material.color.setHSL(0.53, 1, 0.3 + 0.3 * intensity);
      });

      rings.forEach((r) => {
        const s = 1 + 1.5 * ((Math.sin(t * r.userData.speed + r.userData.phase) + 1) / 2);
        r.scale.setScalar(s);
        r.material.opacity = 0.8 * (1 - (s - 1) / 1.5);
      });

      const pos = pGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3 + 1] += 0.03;
        if (pos[i * 3 + 1] > 10) pos[i * 3 + 1] = -2;
      }
      pGeo.attributes.position.needsUpdate = true;

      camera.position.x = 28 * Math.sin(t * 0.05);
      camera.position.z = 28 * Math.cos(t * 0.05);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!canvas.clientWidth) return;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, [canvasRef, active]);
};

// ─── HERO CANVAS COMPONENT ────────────────────────────────────────────────────
export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.THREE) {
      setReady(true);
      return;
    }
    const check = setInterval(() => {
      if (window.THREE) {
        setReady(true);
        clearInterval(check);
      }
    }, 100);
    return () => clearInterval(check);
  }, []);

  useThreeHero(canvasRef, ready);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      aria-hidden="true"
    />
  );
}
