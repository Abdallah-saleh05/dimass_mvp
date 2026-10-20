/* Request pictures only when their frame approaches the viewport. */
(() => {
  "use strict";
  const tracked = new WeakSet();
  const warmed = new Map();
  const connection = navigator.connection;
  const canWarm = () => !document.hidden && !connection?.saveData && !/^(slow-)?2g$/.test(connection?.effectiveType || "");

  function syncSize(img) {
    if (!img.dataset.srcset && !img.srcset) return;
    const { width, height } = img.getBoundingClientRect();
    const ratio = Number(img.getAttribute("width")) / Number(img.getAttribute("height"));
    if (!width || !height || !Number.isFinite(ratio) || ratio <= 0) return;
    const needed = getComputedStyle(img).objectFit === "cover"
      ? Math.max(width, height * ratio) : width;
    const sizes = `${Math.ceil(needed)}px`;
    if (img.sizes !== sizes) img.sizes = sizes;
  }
  function load(img) {
    if (!img.dataset.src) return;
    // Resolve cover sizing before exposing any URL to the browser.
    syncSize(img);
    img.loading = "eager";
    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
    img.src = img.dataset.src;
    delete img.dataset.src;
    delete img.dataset.srcset;
    observer?.unobserve(img);
  }
  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting && !entry.target.closest("[hidden], dialog:not([open])")) load(entry.target);
        }
      }, { rootMargin: "300px 200px" }) : null;
  const sizes = "ResizeObserver" in window
    ? new ResizeObserver(entries => {
        for (const { target } of entries) syncSize(target);
      }) : null;
  function observe(root = document) {
    const images = root.matches?.("img") ? [root] : root.querySelectorAll("img");
    for (const img of images) {
      if (!tracked.has(img)) {
        tracked.add(img);
        sizes?.observe(img);
      }
      if (!img.dataset.src) continue;
      if (observer) observer.observe(img);
      else load(img);
    }
  }
  function setSources(img, source, immediate = false) {
    // Stop the previous responsive source from being reevaluated during a swap.
    img.removeAttribute("srcset");
    img.width = source.width;
    img.height = source.height;
    img.style.aspectRatio = `${source.width} / ${source.height}`;
    img.dataset.src = source.src;
    if (source.srcset) img.dataset.srcset = source.srcset;
    else delete img.dataset.srcset;
    if (immediate) load(img);
    observe(img);
  }
  function preload(reference, source) {
    if (!canWarm() || !source.src) return;
    const frame = (reference.closest(".lightbox-image") || reference).getBoundingClientRect();
    const ratio = source.width / source.height;
    const width = getComputedStyle(reference).objectFit === "cover"
      ? Math.max(frame.width, frame.height * ratio)
      : Math.min(frame.width, frame.height * ratio);
    const size = `${Math.ceil(width)}px`;
    if (!width || warmed.has(source.src + size)) return;
    const image = new Image();
    image.decoding = "async";
    image.fetchPriority = "low";
    image.sizes = size;
    if (source.srcset) image.srcset = source.srcset;
    image.src = source.src;
    warmed.set(source.src + size, image);
    if (warmed.size > 2) warmed.delete(warmed.keys().next().value);
  }
  window.DimassLoading = { observe, load, syncSize, setSources, preload, canWarm };
  observe();
  new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) if (node.nodeType === 1) observe(node);
    }
  }).observe(document.body, { childList: true, subtree: true });

  // Small animation modules are only needed when their section is close.
  for (const stub of document.querySelectorAll("script[data-section-src]")) {
    const section = document.querySelector(stub.dataset.section);
    if (!section) continue;
    const start = () => {
      const script = document.createElement("script");
      script.src = stub.dataset.sectionSrc;
      script.defer = true;
      stub.replaceWith(script);
    };
    if (observer) {
      const sectionObserver = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          sectionObserver.disconnect();
          start();
        }
      }, { rootMargin: "300px" });
      sectionObserver.observe(section);
    } else start();
  }
})();
