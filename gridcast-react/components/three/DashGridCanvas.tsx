"use client";
import { useEffect, useRef, useState } from "react";
import { REGIONS } from "@/lib/constants";

export default function DashGridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.THREE) { setReady(true); return; }
    const check = setInterval(() => {
      if (window.THREE) { setReady(true); clearInterval(check); }
    }, 100);
    return () => clearInterval(check);
  }, []);

  useEffect(() => {
    if (!ready || !canvasRef.current || !window.THREE) return;
    const THREE = window.THREE;
    const canvas = canvasRef.current;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      500
    );
    camera.position.set(0, 20, 35);
    camera.lookAt(0, 0, 0);

    const regionColors = [0x06b6d4, 0xf59e0b, 0x10b981, 0xa78bfa];
    const allNodes: ReturnType<(typeof THREE)["Mesh"]>[] = [];
    const addToScene = (o: object) =>
      (scene as unknown as { add: (o: object) => void }).add(o);

    REGIONS.forEach((reg, ri) => {
      const cx = (ri % 2) * 20 - 10;
      const cz = Math.floor(ri / 2) * 20 - 10;
      const color = regionColors[ri];

      reg.nodes.forEach((_, ni) => {
        const angle = (ni / reg.nodes.length) * Math.PI * 2;
        const r = 6;
        const geo = new THREE.SphereGeometry(0.4, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cx + r * Math.cos(angle), 0, cz + r * Math.sin(angle));
        mesh.userData = { phase: Math.random() * Math.PI * 2 };
        addToScene(mesh);
        allNodes.push(mesh);
      });

      const hubGeo = new THREE.SphereGeometry(0.7, 12, 12);
      const hubMat = new THREE.MeshBasicMaterial({ color });
      const hub = new THREE.Mesh(hubGeo, hubMat);
      hub.position.set(cx, 0, cz);
      hub.userData = { isHub: true, phase: Math.random() * Math.PI * 2 };
      addToScene(hub);
      allNodes.push(hub);
    });

    // Inter-region connections
    const lMat = new THREE.LineBasicMaterial({
      color: 0x164e63,
      transparent: true,
      opacity: 0.5,
    });
    const hubPositions = [
      [-10, -10], [10, -10], [-10, 10], [10, 10],
    ] as [number, number][];
    hubPositions.forEach(([ax, az], i) => {
      hubPositions.forEach(([bx, bz], j) => {
        if (j <= i) return;
        const geo = new THREE.BufferGeometry();
        const v3 = THREE.Vector3;
        (geo as unknown as { setFromPoints: (p: object[]) => void }).setFromPoints([
          new v3(ax, 0, az),
          new v3(bx, 0, bz),
        ]);
        addToScene(new THREE.Line(geo, lMat));
      });
    });

    // Sparks
    const sparkCount = 80;
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkData: { cx: number; cz: number; t: number }[] = [];
    for (let i = 0; i < sparkCount; i++) {
      const ri = Math.floor(Math.random() * 4);
      const cx = (ri % 2) * 20 - 10;
      const cz = Math.floor(ri / 2) * 20 - 10;
      const t = Math.random();
      sparkData.push({ cx, cz, t });
      const angle = t * Math.PI * 2;
      sparkPos[i * 3] = cx + 6 * Math.cos(angle);
      sparkPos[i * 3 + 1] = 0;
      sparkPos[i * 3 + 2] = cz + 6 * Math.sin(angle);
    }
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    const sMat = new THREE.PointsMaterial({
      color: 0xfbbf24,
      size: 0.3,
      transparent: true,
      opacity: 0.9,
    });
    addToScene(new THREE.Points(sGeo, sMat));

    // Grid floor
    const grid = new THREE.GridHelper(80, 40, 0x164e63, 0x0c4a6e);
    (grid as unknown as { position: { y: number } }).position.y = -0.5;
    addToScene(grid);

    let frame: number;
    let t = 0;

    const animate = () => {
      frame = requestAnimationFrame(animate);
      t += 0.008;

      allNodes.forEach((n) => {
        const s = 1 + 0.25 * Math.sin(t + (n.userData.phase as number));
        n.scale.setScalar(s);
      });

      const sp = sGeo.attributes.position.array;
      sparkData.forEach((s, i) => {
        s.t = (s.t + 0.01) % 1;
        const angle = s.t * Math.PI * 2;
        sp[i * 3] = s.cx + 6 * Math.cos(angle);
        sp[i * 3 + 1] = 0.2 * Math.sin(s.t * Math.PI * 4);
        sp[i * 3 + 2] = s.cz + 6 * Math.sin(angle);
      });
      sGeo.attributes.position.needsUpdate = true;

      camera.position.x = 35 * Math.sin(t * 0.03);
      camera.position.z = 35 * Math.cos(t * 0.03);
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
  }, [ready]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0, left: 220, right: 0,
        width: "calc(100vw - 220px)",
        height: "100vh",
        zIndex: 0,
        opacity: 0.22,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    />
  );
}
