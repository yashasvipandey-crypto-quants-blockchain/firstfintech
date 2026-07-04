(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const navbar = qs("#navbar");
  const progress = qs("#scroll-progress");

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function updateScrollState() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const pct = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;

    if (progress) progress.style.width = `${pct}%`;
    if (navbar) navbar.classList.toggle("scrolled", scrollTop > 24);
  }

  window.addEventListener("scroll", updateScrollState, { passive: true });
  updateScrollState();

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
  );

  qsa(".reveal").forEach((el) => revealObserver.observe(el));

  const metricObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        qsa(".metric-row", entry.target).forEach((row) => {
          const valueEl = qs(".metric-val", row);
          const fillEl = qs(".metric-fill", row);
          const target = Number(valueEl?.dataset.target || 0);
          const width = Number(fillEl?.dataset.width || target);

          if (fillEl) fillEl.style.width = `${width}%`;
          if (!valueEl || prefersReducedMotion) {
            if (valueEl) valueEl.textContent = String(target);
            return;
          }

          animateNumber(valueEl, target, 1000);
        });

        metricObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.35 }
  );

  const metricsPanel = qs(".metrics-right");
  if (metricsPanel) metricObserver.observe(metricsPanel);

  function animateNumber(el, target, duration) {
    const start = performance.now();

    function frame(now) {
      const progressValue = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progressValue, 3);
      el.textContent = String(Math.round(target * eased));

      if (progressValue < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  qsa(".trust-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const rx = (0.5 - y) * 10;
      const ry = (x - 0.5) * 12;

      card.style.setProperty("--rx", `${rx}deg`);
      card.style.setProperty("--ry", `${ry}deg`);
      card.style.setProperty("--tz", "18px");
      card.style.setProperty("--mx", `${x * 100}%`);
      card.style.setProperty("--my", `${y * 100}%`);
    });

    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
      card.style.setProperty("--tz", "0px");
      card.style.setProperty("--mx", "50%");
      card.style.setProperty("--my", "50%");
    });
  });

  const cursorDot = qs("#cursor-dot");
  const cursorRing = qs("#cursor-ring");

  if (cursorDot && cursorRing && !window.matchMedia("(pointer: coarse)").matches) {
    let ringX = window.innerWidth / 2;
    let ringY = window.innerHeight / 2;
    let dotX = ringX;
    let dotY = ringY;

    document.body.classList.add("cursor-ready");

    window.addEventListener("pointermove", (event) => {
      dotX = event.clientX;
      dotY = event.clientY;
      cursorDot.style.transform = `translate(${dotX}px, ${dotY}px) translate(-50%, -50%)`;
    }, { passive: true });

    qsa("a, button, .trust-card, .viz-canvas-wrap").forEach((el) => {
      el.addEventListener("pointerenter", () => document.body.classList.add("cursor-active"));
      el.addEventListener("pointerleave", () => document.body.classList.remove("cursor-active"));
    });

    function animateCursor() {
      ringX += (dotX - ringX) * 0.18;
      ringY += (dotY - ringY) * 0.18;
      cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(animateCursor);
    }

    animateCursor();
  }

  const marketLayer = qs("#market-float-layer");
  const symbols = [
    { text: "RELIANCE.NS", type: "info" },
    { text: "HDFCBANK.NS", type: "info" },
    { text: "YFINANCE", type: "info" },
    { text: "FINBERT", type: "info" },
    { text: "RSI", type: "info" },
    { text: "MACD", type: "info" },
    { text: "ADX", type: "info" },
    { text: "ATR", type: "info" },
    { text: "VOLUME RATIO", type: "info" },
    { text: "TRUST", type: "info" },
    { text: "0-100", type: "info" },
    { text: "MODEL", type: "bull" },
    { text: "NEWS", type: "info" },
    { text: "RISK", type: "bear" }
  ];

  let lastWordTime = 0;
  let lastScrollY = window.scrollY;

  function spawnMarketSymbol(x, y) {
    if (!marketLayer || prefersReducedMotion) return;

    const item = symbols[Math.floor(Math.random() * symbols.length)];
    const el = document.createElement("span");
    el.className = `float-symbol ${item.type}`;
    el.textContent = item.text;
    el.style.left = `${x ?? 8 + Math.random() * 84}%`;
    el.style.top = `${y ?? 24 + Math.random() * 58}%`;
    el.style.animationDuration = `${2.1 + Math.random() * 1.1}s`;

    marketLayer.appendChild(el);
    window.setTimeout(() => el.remove(), 3600);
  }

  if (marketLayer && !prefersReducedMotion) {
    for (let i = 0; i < 5; i += 1) {
      window.setTimeout(() => spawnMarketSymbol(48 + Math.random() * 42, 30 + Math.random() * 48), i * 260);
    }

    window.addEventListener("scroll", () => {
      const now = performance.now();
      const scrollDelta = Math.abs(window.scrollY - lastScrollY);
      lastScrollY = window.scrollY;

      if (scrollDelta < 8 || now - lastWordTime < 130) return;
      lastWordTime = now;
      spawnMarketSymbol(12 + Math.random() * 76, 18 + Math.random() * 62);
    }, { passive: true });
  }

  function goTo(url) {
    window.location.href = url;
  }

  qs("#btn-analyze")?.addEventListener("click", () => goTo("/dashboard"));
  qs("#btn-dashboard")?.addEventListener("click", () => goTo("/dashboard"));
  qs("#btn-login")?.addEventListener("click", () => goTo("/dashboard"));
  qs("#btn-register")?.addEventListener("click", () => goTo("/dashboard"));
  qs("#btn-methodology")?.addEventListener("click", () => {
    qs("#how-it-works")?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
  });

  qsa('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href");
      const target = id ? qs(id) : null;
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  });

  const video = qs("#hero-video");
  if (video) {
    const playPromise = video.play();
    if (playPromise?.catch) playPromise.catch(() => {});
  }

  function resizeRenderer(renderer, camera, canvas) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function initHeroScene() {
    const canvas = qs("#threejs-canvas");
    if (!canvas || !window.THREE) return drawHeroFallback(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.outputEncoding = THREE.sRGBEncoding;

    const group = new THREE.Group();
    scene.add(group);

    const wireMaterials = [
      new THREE.MeshBasicMaterial({ color: 0xd8f6ff, wireframe: true, transparent: true, opacity: 0.12 }),
      new THREE.MeshBasicMaterial({ color: 0x9eefff, wireframe: true, transparent: true, opacity: 0.1 }),
      new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.08 })
    ];

    const solidMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe9f8ff,
      roughness: 0.35,
      metalness: 0.08,
      transmission: 0.55,
      transparent: true,
      opacity: 0.12,
      clearcoat: 0.8
    });

    const shapes = [
      { geo: new THREE.OctahedronGeometry(0.28, 0), pos: [0.88, 2.34, -0.5], rot: [0.2, 0.5, 0.1], scale: 1.1 },
      { geo: new THREE.IcosahedronGeometry(0.32, 1), pos: [2.1, 1.17, -0.2], rot: [0.3, 0.1, 0.7], scale: 1 },
      { geo: new THREE.OctahedronGeometry(0.24, 0), pos: [3.18, -0.03, 0.1], rot: [0.2, 0.8, 0.1], scale: 1.15 },
      { geo: new THREE.IcosahedronGeometry(0.32, 1), pos: [4.18, -2.12, 0.2], rot: [0.6, 0.1, 0.8], scale: 1.15 },
      { geo: new THREE.OctahedronGeometry(0.36, 0), pos: [3.62, -2.55, -0.1], rot: [0.1, 0.4, 0.5], scale: 1.25 },
      { geo: new THREE.IcosahedronGeometry(0.28, 1), pos: [0.55, -0.42, 0.2], rot: [0.7, 0.3, 0.1], scale: 0.95 },
      { geo: new THREE.OctahedronGeometry(0.22, 0), pos: [-0.9, -1.18, 0.2], rot: [0.4, 0.9, 0.1], scale: 0.9 }
    ];

    const floatingMeshes = shapes.map((shape, index) => {
      const mesh = new THREE.Mesh(shape.geo, index % 3 === 0 ? solidMaterial.clone() : wireMaterials[index % wireMaterials.length].clone());
      mesh.position.set(...shape.pos);
      mesh.rotation.set(...shape.rot);
      mesh.scale.setScalar(shape.scale);
      mesh.userData.speed = 0.002 + index * 0.00035;
      mesh.userData.float = 0.06 + index * 0.014;
      mesh.userData.baseY = shape.pos[1];
      group.add(mesh);
      return mesh;
    });

    const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xcfefff, transparent: true, opacity: 0.1 });
    for (let i = 0; i < 3; i += 1) {
      const curve = new THREE.EllipseCurve(0, 0, 1.2 + i * 0.42, 0.42 + i * 0.18, 0, Math.PI * 2);
      const points = curve.getPoints(96).map((point) => new THREE.Vector3(point.x, point.y, 0));
      const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), orbitMaterial.clone());
      orbit.position.set(0.48, -0.28, -0.35);
      orbit.rotation.set(0.68 + i * 0.18, 0.2, -0.22);
      group.add(orbit);
      floatingMeshes.push(orbit);
    }

    const candleGroup = new THREE.Group();
    candleGroup.position.set(0.42, -1.32, 0.05);
    group.add(candleGroup);

    const candleColors = [0x65ff99, 0xff8e8e, 0xffffff, 0x9eefff, 0x65ff99, 0xff8e8e];
    for (let i = 0; i < 6; i += 1) {
      const height = 0.38 + (i % 3) * 0.24;
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, height, 0.025),
        new THREE.MeshBasicMaterial({ color: candleColors[i], transparent: true, opacity: 0.16 })
      );
      body.position.set((i - 2.5) * 0.16, height / 2, 0);
      const wick = new THREE.Mesh(
        new THREE.BoxGeometry(0.012, height + 0.26, 0.012),
        new THREE.MeshBasicMaterial({ color: candleColors[i], transparent: true, opacity: 0.12 })
      );
      wick.position.set(body.position.x, height / 2, 0);
      candleGroup.add(wick, body);
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));

    const lightA = new THREE.PointLight(0x9eefff, 1.2, 16);
    lightA.position.set(1.2, 2.2, 4.6);
    scene.add(lightA);

    let mouseX = 0;
    let mouseY = 0;

    window.addEventListener("pointermove", (event) => {
      mouseX = (event.clientX / window.innerWidth - 0.5) * 0.45;
      mouseY = (event.clientY / window.innerHeight - 0.5) * 0.35;
    }, { passive: true });

    function animate() {
      resizeRenderer(renderer, camera, canvas);
      const now = performance.now() * 0.001;
      group.rotation.x += ((mouseY * -0.45) - group.rotation.x) * 0.03;
      group.rotation.y += (mouseX * 0.35 - group.rotation.y) * 0.03;
      floatingMeshes.forEach((mesh, index) => {
        mesh.rotation.x += prefersReducedMotion ? 0 : mesh.userData.speed || 0.0015;
        mesh.rotation.y += prefersReducedMotion ? 0 : (mesh.userData.speed || 0.0015) * 1.4;
        if (mesh.userData.baseY !== undefined) {
          mesh.position.y = mesh.userData.baseY + Math.sin(now + index) * mesh.userData.float;
        }
      });
      candleGroup.position.y = -1.32 + Math.sin(now * 1.3) * 0.025;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    animate();
  }

  function initTrustSphere() {
    const canvas = qs("#trust-sphere-canvas");
    if (!canvas || !window.THREE) return drawSphereFallback(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.outputEncoding = THREE.sRGBEncoding;

    const group = new THREE.Group();
    scene.add(group);

    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(1.42, 48, 48),
      new THREE.MeshPhysicalMaterial({
        color: 0x0f2730,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.26,
        wireframe: true
      })
    );
    group.add(shell);

    const nodeGeometry = new THREE.SphereGeometry(0.075, 16, 16);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x7ce7ff, transparent: true, opacity: 0.28 });
    const points = [];

    for (let i = 0; i < 26; i += 1) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / 26);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const point = new THREE.Vector3(
        Math.cos(theta) * Math.sin(phi) * 1.72,
        Math.sin(theta) * Math.sin(phi) * 1.72,
        Math.cos(phi) * 1.72
      );

      points.push(point);

      const nodeMaterial = new THREE.MeshStandardMaterial({
        color: i % 4 === 0 ? 0xff9c9c : i % 3 === 0 ? 0xffd27a : i % 2 === 0 ? 0x9fffb9 : 0x7ce7ff,
        roughness: 0.25,
        metalness: 0.25,
        emissive: i % 4 === 0 ? 0x290606 : 0x071a1f,
        emissiveIntensity: 0.35
      });

      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      node.position.copy(point);
      group.add(node);
    }

    for (let i = 0; i < points.length; i += 1) {
      const next = (i * 7 + 5) % points.length;
      const geometry = new THREE.BufferGeometry().setFromPoints([points[i], points[next]]);
      group.add(new THREE.Line(geometry, lineMaterial));
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.72));
    const light = new THREE.PointLight(0x7ce7ff, 2, 12);
    light.position.set(2.8, 3.4, 4);
    scene.add(light);

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let targetRotX = -0.18;
    let targetRotY = 0.28;

    canvas.addEventListener("pointerdown", (event) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      targetRotY += dx * 0.008;
      targetRotX += dy * 0.008;
      lastX = event.clientX;
      lastY = event.clientY;
    });

    canvas.addEventListener("pointerup", () => {
      dragging = false;
    });

    canvas.addEventListener("pointercancel", () => {
      dragging = false;
    });

    function animate() {
      resizeRenderer(renderer, camera, canvas);
      if (!dragging && !prefersReducedMotion) targetRotY += 0.0035;
      group.rotation.x += (targetRotX - group.rotation.x) * 0.08;
      group.rotation.y += (targetRotY - group.rotation.y) * 0.08;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    animate();
  }

  function drawHeroFallback(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function draw() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.translate(rect.width * 0.72, rect.height * 0.48);
      ctx.strokeStyle = "rgba(124, 231, 255, 0.45)";
      ctx.lineWidth = 1;

      for (let i = 0; i < 4; i += 1) {
        ctx.rotate(0.7);
        ctx.strokeRect(-120 + i * 14, -120 + i * 14, 240 - i * 28, 240 - i * 28);
      }
    }

    draw();
    window.addEventListener("resize", draw, { passive: true });
  }

  function drawSphereFallback(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function draw() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const radius = Math.min(rect.width, rect.height) * 0.32;

      ctx.strokeStyle = "rgba(124, 231, 255, 0.36)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 7; i += 1) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, radius, radius * (0.22 + i * 0.1), i * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (let i = 0; i < 18; i += 1) {
        const a = i * 1.9;
        const x = cx + Math.cos(a) * radius * (0.35 + (i % 5) * 0.13);
        const y = cy + Math.sin(a * 0.8) * radius * (0.35 + (i % 4) * 0.13);
        ctx.fillStyle = i % 3 === 0 ? "#9fffb9" : "#7ce7ff";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    draw();
    window.addEventListener("resize", draw, { passive: true });
  }

  window.addEventListener("load", () => {
    initHeroScene();
    initTrustSphere();
  });
})();
