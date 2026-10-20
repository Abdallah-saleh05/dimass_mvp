/* Fast count-up, once on first view. Final values remain present without JS. */
(() => {
  const row = document.getElementById("company-facts");
  if (!row) return;
  const numbers = [...row.querySelectorAll("[data-count-to]")];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const duration = 1200;
  let frame = 0;
  let started = false;
  let observer;

  function finish() {
    cancelAnimationFrame(frame);
    numbers.forEach((number) => {
      number.textContent = `${number.dataset.countTo}+`;
    });
    row.dataset.counterState = "complete";
    observer?.disconnect();
  }

  function start() {
    if (started) return;
    started = true;
    observer?.disconnect();
    if (reduced.matches) {
      finish();
      return;
    }
    const startTime = performance.now();
    row.dataset.counterState = "running";
    numbers.forEach((number) => {
      number.textContent = "0+";
    });
    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      numbers.forEach((number) => {
        const target = Number(number.dataset.countTo);
        number.textContent = `${Math.floor(target * eased)}+`;
      });
      if (progress < 1) frame = requestAnimationFrame(tick);
      else finish();
    }
    frame = requestAnimationFrame(tick);
  }

  reduced.addEventListener("change", () => {
    if (reduced.matches) {
      started = true;
      finish();
    }
  });
  if (reduced.matches) {
    started = true;
    finish();
  } else if ("IntersectionObserver" in window) {
    row.dataset.counterState = "waiting";
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) start();
      },
      { threshold: 0.4 },
    );
    observer.observe(row);
  } else start();
})();
