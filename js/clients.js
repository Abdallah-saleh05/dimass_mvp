/* Client ribbon: CSS performs the seamless loop; JS controls deliberate pausing. */
(() => {
  const ribbon = document.querySelector(".client-marquee");
  const toggle = document.querySelector(".client-motion-toggle");
  if (!ribbon || !toggle) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let paused = !!navigator.connection?.saveData;
  let inView = true;
  const pauseIcon =
    '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 5v14M16 5v14"/></svg>';
  const playIcon =
    '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="m8 5 11 7-11 7z"/></svg>';
  function update() {
    ribbon.toggleAttribute("data-paused", paused || reduced.matches || !inView || document.hidden);
    toggle.hidden = reduced.matches;
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute(
      "aria-label",
      paused ? "Play client logo animation" : "Pause client logo animation",
    );
    toggle.innerHTML =
      (paused ? playIcon : pauseIcon) +
      "<span>" +
      (paused ? "Play" : "Pause") +
      "</span>";
  }
  toggle.addEventListener("click", () => {
    paused = !paused;
    update();
  });
  reduced.addEventListener("change", () => {
    ribbon.scrollLeft = 0;
    update();
  });
  ribbon.addEventListener("focusout", (event) => {
    if (!ribbon.contains(event.relatedTarget)) ribbon.scrollLeft = 0;
  });
  ribbon.setAttribute("data-ready", "");
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      update();
    }).observe(ribbon);
  }
  document.addEventListener("visibilitychange", update);
  update();
})();
