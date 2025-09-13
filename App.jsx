import React, { useRef, useEffect } from "react";
import Lenis from "lenis";

export default function InfiniteCanvas() {
  const lenis = new Lenis();
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const imagesRef = useRef([]);

  const cam = useRef({ x: 0, y: 0 });
  const camTarget = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });

  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  const cols = 5;
  const rows = 2;
  const gap = 100;

  const urls = [
    "https://skiper-ui.com/images/lummi/img9.png",
    "https://skiper-ui.com/images/lummi/img7.png",
    "https://skiper-ui.com/images/lummi/img8.png",
    "https://skiper-ui.com/images/lummi/img10.png",
    "https://skiper-ui.com/images/lummi/img11.png",
    "https://skiper-ui.com/images/lummi/img12.png",
    "https://skiper-ui.com/images/lummi/img15.png",
    "https://skiper-ui.com/images/lummi/img14.png",
    "https://skiper-ui.com/images/lummi/img2.png",
  ];

  useEffect(() => {
    let mounted = true;
    Promise.all(
      urls.map(
        (u) =>
          new Promise((resolve) => {
            const img = new Image();
            img.src = u;
            img.onload = () => resolve(img);
            img.onerror = () => resolve(img);
          })
      )
    ).then((imgs) => {
      if (!mounted) return;
      imagesRef.current = imgs;
      resizeAndDraw();
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    window.addEventListener("resize", resizeAndDraw);
    return () => window.removeEventListener("resize", resizeAndDraw);
  }, []);

  function resizeAndDraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wrapper = wrapperRef.current;
    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    draw();
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas || imagesRef.current.length === 0) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;

    const tileW = (cw - gap * (cols - 1)) / cols;
    const tileH = (ch - gap * (rows - 1)) / rows;
    const tileSize = Math.floor(Math.min(tileW, tileH));
    const S = tileSize + gap;

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = "#070707";
    ctx.fillRect(0, 0, cw, ch);

    const { x: camX, y: camY } = cam.current;

    const halfExtra = 2;
    const iStart = Math.floor(-camX / S) - halfExtra;
    const iEnd = Math.floor((cw - camX) / S) + halfExtra;
    const jStart = Math.floor(-camY / S) - halfExtra;
    const jEnd = Math.floor((ch - camY) / S) + halfExtra;

    const imgs = imagesRef.current;
    const imgsLen = imgs.length;

    for (let j = jStart; j <= jEnd; j++) {
      for (let i = iStart; i <= iEnd; i++) {
        const screenX = camX + i * S;
        const screenY = camY + j * S;

        const idx = Math.abs((i + j * cols) % imgsLen);
        const img = imgs[idx];

        const drawX = Math.round(screenX + gap * 0.5);
        const drawY = Math.round(screenY + gap * 0.5);

        if (
          drawX + tileSize < 0 ||
          drawY + tileSize < 0 ||
          drawX > cw ||
          drawY > ch
        ) {
          continue;
        }

        const radius = 0;
        const imgWidth = tileSize * 0.8; // width
        const imgHeight = tileSize * 1; // custom height (change this as you like)

        ctx.save();
        roundRect(ctx, drawX, drawY, imgWidth, imgHeight, radius);
        ctx.clip();

        if (img && img.complete) {
          ctx.drawImage(img, drawX, drawY, imgWidth, imgHeight);
        } else {
          ctx.fillStyle = "#333";
          ctx.fillRect(drawX, drawY, imgWidth, imgHeight);
        }

        ctx.restore();
      }
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    function onPointerDown(e) {
      dragging.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      wrapper.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
      if (!dragging.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };

      camTarget.current.x += dx;
      camTarget.current.y += dy;

      velocity.current.x = dx;
      velocity.current.y = dy;
    }

    function onPointerUp(e) {
      dragging.current = false;
      wrapper.releasePointerCapture(e.pointerId);
    }

    wrapper.addEventListener("pointerdown", onPointerDown);
    wrapper.addEventListener("pointermove", onPointerMove);
    wrapper.addEventListener("pointerup", onPointerUp);
    wrapper.addEventListener("pointercancel", onPointerUp);

    return () => {
      wrapper.removeEventListener("pointerdown", onPointerDown);
      wrapper.removeEventListener("pointermove", onPointerMove);
      wrapper.removeEventListener("pointerup", onPointerUp);
      wrapper.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  useEffect(() => {
    function animate() {
      cam.current.x += (camTarget.current.x - cam.current.x) * 0.08;
      cam.current.y += (camTarget.current.y - cam.current.y) * 0.08;

      if (!dragging.current) {
        camTarget.current.x += velocity.current.x;
        camTarget.current.y += velocity.current.y;

        velocity.current.x *= 0.92;
        velocity.current.y *= 0.92;
      }

      draw();
      requestAnimationFrame(animate);
    }
    animate();
  }, []);

  useEffect(() => {
    resizeAndDraw();
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        touchAction: "none",
        background: "#070707",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      <div
        style={{
          position: "absolute",
          left: 12,
          bottom: 12,
          padding: "6px 8px",
          background: "rgba(0,0,0,0.4)",
          color: "#fff",
          borderRadius: 6,
          fontSize: 12,
        }}
      >
        Drag to pan
      </div>
    </div>
  );
}
