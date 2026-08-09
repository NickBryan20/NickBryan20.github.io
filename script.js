(() => {
  "use strict";

  document.documentElement.classList.replace("no-js", "js");

  const header = document.querySelector("[data-header]");
  const nav = document.querySelector("#primary-nav");
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = [...document.querySelectorAll('.primary-nav a[href^="#"]')];
  const sections = [...document.querySelectorAll("main section[id]")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setHeaderState = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 16);
  };

  const closeMenu = (restoreFocus = false) => {
    if (!nav || !navToggle) return;

    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Abrir menú de navegación");
    document.body.classList.remove("nav-open");

    if (restoreFocus) navToggle.focus();
  };

  navToggle?.addEventListener("click", () => {
    const willOpen = navToggle.getAttribute("aria-expanded") !== "true";

    nav?.classList.toggle("is-open", willOpen);
    navToggle.setAttribute("aria-expanded", String(willOpen));
    navToggle.setAttribute("aria-label", willOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación");
    document.body.classList.toggle("nav-open", willOpen);

    if (willOpen) nav?.querySelector("a")?.focus();
  });

  navLinks.forEach((link) => link.addEventListener("click", () => closeMenu()));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav?.classList.contains("is-open")) {
      closeMenu(true);
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 800) closeMenu();
  });

  window.addEventListener("scroll", setHeaderState, { passive: true });
  setHeaderState();

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px" }
    );

    document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visibleSection = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visibleSection) return;

        navLinks.forEach((link) => {
          const isCurrent = link.getAttribute("href") === `#${visibleSection.target.id}`;
          link.classList.toggle("is-active", isCurrent);

          if (isCurrent) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      },
      { threshold: [0.2, 0.5], rootMargin: "-20% 0px -55%" }
    );

    sections.forEach((section) => sectionObserver.observe(section));
  } else {
    document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
  }

  if (reduceMotion) {
    document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
  }

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
