/* Dimass — plain JavaScript. No frameworks, packages, build step or remote requests. */
(() => {
  "use strict";
  const data = window.DIMASS;
  if (!data) return;
  const $ = (s, parent = document) => parent.querySelector(s);
  const $$ = (s, parent = document) => [...parent.querySelectorAll(s)];
  const base = new URL(document.body.dataset.root, window.location.href);
  const url = (file) => new URL(file.replace(/^\//, ""), base).href;
  const pageUrl = (route) => url(route.replace(/^\//, "") + "/index.html");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const behavior = () => (reduce.matches ? "instant" : "smooth");
  const loading = window.DimassLoading;
  function photoSource(id) {
    const a = data.assets[id];
    return {
      src: url(a.src), width: a.width, height: a.height,
      srcset: [
        `${url(a.small)} ${a.smallWidth}w`,
        ...(a.medium ? [`${url(a.medium)} ${a.mediumWidth}w`] : []),
        `${url(a.src)} ${a.width}w`,
      ].join(", "),
    };
  }
  function setPhoto(img, id, alt) {
    const a = data.assets[id];
    if (!a || !img) return;
    img.classList.toggle("image-portrait", a.height > a.width);
    img.alt = alt;
    loading.setSources(img, photoSource(id), !!img.closest(".home-hero"));
  }
  function pressed(buttons, current) {
    buttons.forEach((b) => {
      b.classList.toggle("active", b === current);
      b.setAttribute("aria-pressed", String(b === current));
    });
  }
  function goToArchive() {
    $("#archive")?.scrollIntoView({ behavior: behavior() });
  }

  // Native dialogs provide keyboard focus containment and Escape support.
  function openDialog(dialog) {
    if (!dialog || dialog.open) return;
    dialog.showModal();
    document.body.style.overflow = "hidden";
  }
  function closeDialog(dialog) {
    dialog?.close();
  }
  $$("dialog").forEach((dialog) => {
    dialog.addEventListener("close", () => {
      if (!$("dialog[open]")) document.body.style.overflow = "";
    });
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) closeDialog(dialog);
    });
  });
  const menu = $(".mobile-menu");
  $('[aria-label="Open navigation menu"]')?.addEventListener("click", () =>
    openDialog(menu),
  );
  $('[aria-label="Close navigation menu"]')?.addEventListener("click", () =>
    closeDialog(menu),
  );
  $$("a", menu || document.createElement("div")).forEach((a) =>
    a.addEventListener("click", () => closeDialog(menu)),
  );
  const search = $(".search-dialog");
  $('[aria-label="Search the website"]')?.addEventListener("click", () =>
    openDialog(search),
  );
  $('[aria-label="Close search"]')?.addEventListener("click", () =>
    closeDialog(search),
  );
  const searchInput = $(".search-input input", search);
  searchInput?.addEventListener("input", () => {
    const q = searchInput.value.trim().toLocaleLowerCase();
    const results = $(".search-results", search);
    results.replaceChildren();
    const records = [
      ...data.projects.map((p) => ({
        title: p.name,
        route: "projects/" + p.slug,
        type: "Project",
      })),
      ...data.services.map((s) => ({
        title: s.title,
        route: "services/" + s.slug,
        type: "Service",
      })),
    ];
    const matches = q
      ? records.filter((r) => r.title.toLocaleLowerCase().includes(q))
      : [];
    if (!matches.length) {
      const p = document.createElement("p");
      p.textContent = q
        ? "No results. Try “Mobil”, “steel” or “PepsiCo”."
        : "Discover our projects, services and areas of expertise.";
      results.append(p);
    }
    for (const record of matches) {
      const a = document.createElement("a");
      a.href = pageUrl(record.route);
      const span = document.createElement("span");
      const small = document.createElement("small");
      small.textContent = record.type;
      span.append(small, document.createTextNode(record.title));
      const arrow = document.createElement("span");
      arrow.textContent = "↗";
      a.append(span, arrow);
      results.append(a);
    }
  });
  $$(".dropdown-toggle").forEach((b, i) => {
    const item = b.closest(".nav-item");
    const sub = $(".nav-dropdown", item);
    sub.id = "submenu-" + i;
    b.setAttribute("aria-controls", sub.id);
    b.setAttribute("aria-expanded", "false");
    b.addEventListener("click", () => {
      const expanded = item.classList.toggle("dropdown-open");
      b.setAttribute("aria-expanded", String(expanded));
    });
    item.addEventListener("focusout", (e) => {
      if (!item.contains(e.relatedTarget)) {
        item.classList.remove("dropdown-open");
        b.setAttribute("aria-expanded", "false");
      }
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape")
      $$(".dropdown-open").forEach((item) => {
        item.classList.remove("dropdown-open");
        $(".dropdown-toggle", item).setAttribute("aria-expanded", "false");
      });
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-item"))
      $$(".dropdown-open").forEach((item) => {
        item.classList.remove("dropdown-open");
        $(".dropdown-toggle", item).setAttribute("aria-expanded", "false");
      });
  });
  const header = $(".site-header");
  const back = $(".back-to-top");
  const scrollState = () => {
    header?.classList.toggle(
      "over-hero",
      document.body.dataset.page === "/" && window.scrollY < 30,
    );
    if (back) back.hidden = window.scrollY < 600;
  };
  window.addEventListener("scroll", scrollState, { passive: true });
  scrollState();
  back?.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: behavior() }),
  );

  // Hero carousel: arrows, dots, pause/play, swipe and reduced-motion support.
  const hero = $(".home-hero");
  if (hero) {
    let index = 0,
      paused = reduce.matches || navigator.connection?.saveData,
      inView = true,
      timer;
    const heroPhoto = $(".hero-image img", hero);
    function warmNext() {
      if (!paused && inView && !document.hidden && heroPhoto.complete)
        loading.preload(heroPhoto, photoSource(data.slides[(index + 1) % data.slides.length].image));
    }
    heroPhoto.addEventListener("load", warmNext);
    const dots = $$(".hero-pagination > button:not(.hero-pause)", hero);
    const play = $(".hero-pause", hero);
    function updatePause() {
      play.setAttribute(
        "aria-label",
        paused ? "Play slideshow" : "Pause slideshow",
      );
      play.innerHTML = paused
        ? '<span aria-hidden="true">▶</span>'
        : '<span aria-hidden="true">Ⅱ</span>';
      $(".hero-copy", hero).setAttribute(
        "aria-live",
        paused ? "polite" : "off",
      );
    }
    function schedule() {
      clearInterval(timer);
      if (!paused && inView && !document.hidden)
        timer = setInterval(() => show(index + 1), 7000);
      updatePause();
      warmNext();
    }
    function show(next, user = false) {
      if (user) paused = true;
      index = (next + data.slides.length) % data.slides.length;
      const slide = data.slides[index];
      setPhoto($(".hero-image img", hero), slide.image, slide.label);
      if (!reduce.matches) {
        $(".hero-image", hero).animate(
          [
            { opacity: 0.35, transform: "scale(1.035)" },
            { opacity: 1, transform: "scale(1)" },
          ],
          { duration: 650, easing: "ease-out" },
        );
        $(".hero-copy", hero).animate(
          [
            { opacity: 0, transform: "translateY(12px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 450, easing: "ease-out" },
        );
      }
      $("h1", hero).innerHTML = slide.title;
      $(".hero-copy > p", hero).textContent = slide.subtitle;
      dots.forEach((b, i) => {
        b.classList.toggle("active", i === index);
        i === index
          ? b.setAttribute("aria-current", "true")
          : b.removeAttribute("aria-current");
      });
      $(".hero-number", hero).innerHTML = `0${index + 1}<span> / 03</span>`;
      if (user) {
        paused = true;
        schedule();
      }
    }
    dots.forEach((b, i) => b.addEventListener("click", () => show(i, true)));
    $(".hero-arrow.prev", hero).addEventListener("click", () =>
      show(index - 1, true),
    );
    $(".hero-arrow.next", hero).addEventListener("click", () =>
      show(index + 1, true),
    );
    play.addEventListener("click", () => {
      paused = !paused;
      schedule();
    });
    hero.addEventListener("mouseenter", () => {
      paused = true;
      schedule();
    });
    hero.addEventListener("focusin", () => {
      paused = true;
      schedule();
    });
    let startX = 0;
    hero.addEventListener(
      "touchstart",
      (e) => {
        startX = e.changedTouches[0].clientX;
      },
      { passive: true },
    );
    hero.addEventListener(
      "touchend",
      (e) => {
        const d = e.changedTouches[0].clientX - startX;
        if (Math.abs(d) > 65) show(index + (d < 0 ? 1 : -1), true);
      },
      { passive: true },
    );
    document.addEventListener("visibilitychange", schedule);
    reduce.addEventListener("change", () => {
      if (reduce.matches) {
        paused = true;
        schedule();
      }
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(entries => {
        inView = entries[0].isIntersecting;
        schedule();
      }).observe(hero);
    }
    schedule();
  }
  function wireRail(rail, prev, next) {
    if (!rail) return;
    prev?.addEventListener("click", () =>
      rail.scrollBy({ left: -rail.clientWidth, behavior: behavior() }),
    );
    next?.addEventListener("click", () =>
      rail.scrollBy({ left: rail.clientWidth, behavior: behavior() }),
    );
  }
  wireRail(
    $(".service-rail"),
    $('[aria-label="Previous services"]'),
    $('[aria-label="Next services"]'),
  );
  wireRail(
    $(".featured-project-rail"),
    $('[aria-label="Previous projects"]'),
    $('[aria-label="Next projects"]'),
  );
  const projectTabs = $$(".highlighted-projects .tabs button");
  projectTabs.forEach((b, i) =>
    b.addEventListener("click", () => {
      pressed(projectTabs, b);
      const rail = $(".featured-project-rail");
      rail.replaceChildren(
        $("#project-" + (i ? "industrial" : "fuel")).content.cloneNode(true),
      );
      rail.scrollLeft = 0;
    }),
  );

  // Homepage media feature and thumbnails use prerendered local HTML templates.
  const media = $(".media-section");
  if (media) {
    let kind = "awards",
      selected = 0;
    const tabs = $$(".tabs button", media);
    function renderMedia() {
      const items = data[kind === "awards" ? "awards" : "notes"];
      const entry = items[selected];
      const content = $("#media-" + kind).content;
      const feature = $$("a.media-feature", content)[selected].cloneNode(true);
      $(".media-feature", media).replaceWith(feature);
      const thumbs = $(".media-thumbnails", media);
      thumbs.classList.toggle("certificate-thumbnails", kind === "awards");
      thumbs.replaceChildren();
      items.forEach((item, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-pressed", String(i === selected));
        b.classList.toggle("active", i === selected);
        const img = document.createElement("img");
        img.loading = "lazy";
        setPhoto(img, item.image, "");
        const span = document.createElement("span");
        span.textContent = item.title;
        b.append(img, span);
        b.addEventListener("click", () => {
          selected = i;
          renderMedia();
        });
        thumbs.append(b);
      });
      const action = $(".section-end .action", media);
      action.href = pageUrl(kind === "awards" ? "awards" : "blogs");
      $("span", action).textContent =
        "View all " + (kind === "awards" ? "recognition" : "field notes");
      feature.setAttribute("aria-label", entry.title);
    }
    tabs.forEach((b, i) =>
      b.addEventListener("click", () => {
        kind = i ? "field" : "awards";
        selected = 0;
        pressed(tabs, b);
        renderMedia();
      }),
    );
    renderMedia();
  }

  // Project portfolio retains real links and can be filtered without a server.
  const grid = $(".projects-grid");
  if (grid) {
    const cards = $$(".project-card", grid);
    const pills = $$(".filter-pills button");
    const sectors = $$(".sector-diamond");
    const input = $("#project-query");
    const select = $("#project-sector");
    const photo = $(".photo-filter input");
    const results = $(".results-count");
    const load = $$("#archive button").find((b) =>
      b.textContent.includes("Load more projects"),
    );
    const empty = document.createElement("div");
    empty.className = "notice";
    empty.textContent =
      "No projects match these filters. Choose another sector or clear the search.";
    grid.after(empty);
    let category = "All Projects",
      query = "",
      limit = 9;
    function fromURL() {
      const p = new URLSearchParams(location.search);
      category = p.get("sector") || "All Projects";
      query = p.get("q") || "";
      limit = 9;
      input.value = query;
      select.value = category;
      render();
    }
    function render() {
      let count = 0;
      cards.forEach((card, i) => {
        const p = data.projects[i];
        const match =
          (category === "All Projects" || p.category === category) &&
          (!photo.checked || p.images.length > 0) &&
          `${p.name} ${p.description}`
            .toLocaleLowerCase()
            .includes(query.toLocaleLowerCase());
        card.hidden = !match || count >= limit;
        if (match) count++;
      });
      for (const b of [...pills, ...sectors]) {
        const active = b.textContent.trim() === category;
        b.classList.toggle("active", active);
        b.setAttribute("aria-pressed", String(active));
      }
      results.textContent =
        `${count} ${count === 1 ? "project" : "projects"}` +
        (query ? ` matching “${query}” ` : "");
      if (query) {
        const clear = document.createElement("button");
        clear.textContent = "Clear search";
        clear.type = "button";
        clear.addEventListener("click", () => {
          query = "";
          input.value = "";
          limit = 9;
          syncURL();
          render();
        });
        results.append(clear);
      }
      if (load) load.closest(".center-action").hidden = count <= limit;
      empty.hidden = count > 0;
      grid.hidden = count === 0;
    }
    function syncURL() {
      const u = new URL(location.href);
      u.search = "";
      if (category !== "All Projects") u.searchParams.set("sector", category);
      if (query) u.searchParams.set("q", query);
      try {
        history.replaceState(null, "", u);
      } catch {
        /* file:// browsers can disallow history edits */
      }
    }
    for (const b of [...pills, ...sectors])
      b.addEventListener("click", () => {
        category = b.textContent.trim();
        select.value = category;
        limit = 9;
        syncURL();
        render();
        if (b.classList.contains("sector-diamond")) goToArchive();
      });
    photo.addEventListener("change", () => {
      limit = 9;
      render();
    });
    $(".project-hero-search").addEventListener("submit", (e) => {
      e.preventDefault();
      category = select.value;
      query = input.value.trim();
      limit = 9;
      syncURL();
      render();
      goToArchive();
    });
    load?.addEventListener("click", () => {
      limit += 9;
      render();
    });
    window.addEventListener("popstate", fromURL);
    fromURL();
  }
  const galleryFilters = $$(".gallery-filters button");
  galleryFilters.forEach((b) =>
    b.addEventListener("click", () => {
      pressed(galleryFilters, b);
      const category = b.textContent.trim();
      let count = 0;
      $$(".image-gallery .gallery-tile").forEach((tile, i) => {
        tile.hidden =
          category !== "All Photographs" &&
          data.gallery[i].category !== category;
        if (!tile.hidden) count++;
      });
      $(".results-count").textContent = `${count} photographs`;
    }),
  );

  // Image lightboxes preserve focus, captions and keyboard navigation.
  $$(".image-gallery").forEach((gallery) => {
    let dialog = gallery.nextElementSibling;
    if (!dialog?.classList.contains("lightbox")) return;
    let tiles = [],
      index = 0;
    const photo = $(".lightbox-image img", dialog),
      caption = $(".lightbox-bottom p", dialog);
    photo.addEventListener("load", () => {
      if (!dialog.open || tiles.length < 2) return;
      const next = $("img", tiles[(index + 1) % tiles.length]);
      loading.preload(photo, {
        src: next.dataset.src || next.src,
        srcset: next.dataset.srcset || next.srcset,
        width: Number(next.getAttribute("width")),
        height: Number(next.getAttribute("height")),
      });
    });
    const move = (delta) => {
      index = (index + delta + tiles.length) % tiles.length;
      show();
    };
    function show() {
      const tile = tiles[index],
        img = $("img", tile);
      photo.alt = img.alt;
      loading.setSources(photo, {
        src: img.dataset.src || img.src,
        srcset: img.dataset.srcset || img.srcset,
        width: Number(img.getAttribute("width")),
        height: Number(img.getAttribute("height")),
      }, true);
      caption.replaceChildren(document.createTextNode(img.alt));
      const span = document.createElement("span");
      span.textContent = `${index + 1} / ${tiles.length}`;
      caption.append(span);
    }
    $$(".gallery-tile", gallery).forEach((tile) =>
      tile.addEventListener("click", () => {
        tiles = $$(".gallery-tile", gallery).filter((t) => !t.hidden);
        index = tiles.indexOf(tile);
        openDialog(dialog);
        show();
      }),
    );
    $(".lightbox-close", dialog).addEventListener("click", () =>
      closeDialog(dialog),
    );
    $('[aria-label="Previous image"]', dialog).addEventListener("click", () =>
      move(-1),
    );
    $('[aria-label="Next image"]', dialog).addEventListener("click", () =>
      move(1),
    );
    dialog.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        move(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        move(-1);
      }
    });
  });

  // Enquiries are local drafts; no recipient, uploads, persistence or submissions.
  $$(".inquiry").forEach((inquiry) => {
    const form = $("form", inquiry);
    let draft = "";
    function download() {
      const blob = new Blob([draft], { type: "text/plain;charset=utf-8" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = "dimass-enquiry.txt";
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    }
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const message = $('[name="message"]', form),
        name = $('[name="name"]', form);
      message.setCustomValidity(
        message.value.trim().length < 10
          ? "Please enter at least 10 non-blank characters."
          : "",
      );
      name.setCustomValidity(
        name.value.trim() ? "" : "Please enter your name.",
      );
      if (!form.reportValidity()) return;
      const f = new FormData(form);
      draft = `${inquiry.dataset.enquiryType}\n\nName: ${String(f.get("name")).trim()}\nEmail: ${f.get("email")}\nTelephone: ${f.get("telephone") || "Not provided"}\nCompany: ${f.get("company") || "Not provided"}\n\n${String(f.get("message")).trim()}`;
      $(".draft-review", inquiry)?.remove();
      const review = document.createElement("section");
      review.className = "draft-review";
      review.setAttribute("aria-live", "polite");
      review.innerHTML =
        '<h3>Your enquiry is ready to review</h3><p>No message has been sent. Copy or download your draft for your own use.</p><pre tabindex="0"></pre><div class="draft-actions"><button class="secondary-button" type="button" data-download>Download draft</button><button class="secondary-button" type="button" data-copy>Copy draft</button></div><p class="copy-status" role="status"></p>';
      $("pre", review).textContent = draft;
      $("[data-download]", review).addEventListener("click", download);
      $("[data-copy]", review).addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(draft);
          $(".copy-status", review).textContent = "Copied to clipboard.";
        } catch {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents($("pre", review));
          selection.removeAllRanges();
          selection.addRange(range);
          $(".copy-status", review).textContent =
            "Draft selected. Use your device’s Copy command or download the draft.";
        }
      });
      inquiry.append(review);
      review.scrollIntoView({ behavior: behavior(), block: "nearest" });
    });
    $$("input,textarea", form).forEach((input) =>
      input.addEventListener("input", () => input.setCustomValidity("")),
    );
  });
  // Progressive reveal is visual only; content remains readable without JavaScript.
  if (!reduce.matches && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.06 },
    );
    $$(".section > .container").forEach((el) => {
      el.classList.add("reveal");
      observer.observe(el);
    });
  }
})();
