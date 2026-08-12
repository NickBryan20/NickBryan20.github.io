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

  document.querySelectorAll("[data-credential-carousel]").forEach((carousel) => {
    const track = carousel.querySelector("[data-carousel-track]");
    const previousButton = carousel.querySelector("[data-carousel-prev]");
    const nextButton = carousel.querySelector("[data-carousel-next]");
    const currentLabel = carousel.querySelector("[data-carousel-current]");
    const totalLabel = carousel.querySelector("[data-carousel-total]");
    const slides = [...carousel.querySelectorAll(".credential-slide")];

    if (!track || !slides.length) return;

    const formatNumber = (value) => String(value).padStart(2, "0");
    const updateCarousel = () => {
      const trackBounds = track.getBoundingClientRect();
      const visibleIndexes = slides
        .map((slide, index) => ({ index, bounds: slide.getBoundingClientRect() }))
        .filter(({ bounds }) => {
          const visibleWidth = Math.min(bounds.right, trackBounds.right) - Math.max(bounds.left, trackBounds.left);
          return visibleWidth >= Math.min(bounds.width * 0.5, 80);
        })
        .map(({ index }) => index);

      const first = (visibleIndexes[0] ?? 0) + 1;
      const last = (visibleIndexes.at(-1) ?? 0) + 1;

      if (currentLabel) {
        currentLabel.textContent = first === last ? formatNumber(first) : `${formatNumber(first)}–${formatNumber(last)}`;
      }
      if (totalLabel) totalLabel.textContent = formatNumber(slides.length);

      const maximumScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      if (previousButton) previousButton.disabled = track.scrollLeft <= 2;
      if (nextButton) nextButton.disabled = track.scrollLeft >= maximumScroll - 2;
    };

    const moveCarousel = (direction) => {
      const step = slides[1] ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth;
      track.scrollBy({ left: direction * step, behavior: reduceMotion ? "auto" : "smooth" });
    };

    previousButton?.addEventListener("click", () => moveCarousel(-1));
    nextButton?.addEventListener("click", () => moveCarousel(1));
    track.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      moveCarousel(event.key === "ArrowLeft" ? -1 : 1);
    });

    let updateFrame;
    track.addEventListener("scroll", () => {
      window.cancelAnimationFrame(updateFrame);
      updateFrame = window.requestAnimationFrame(updateCarousel);
    }, { passive: true });

    if ("ResizeObserver" in window) {
      new ResizeObserver(updateCarousel).observe(track);
    } else {
      window.addEventListener("resize", updateCarousel);
    }

    updateCarousel();
  });

  const projectForm = document.querySelector("[data-project-form]");

  if (projectForm) {
    const steps = [...projectForm.querySelectorAll("[data-form-step]")];
    const backButton = projectForm.querySelector("[data-form-back]");
    const nextButton = projectForm.querySelector("[data-form-next]");
    const submitButton = projectForm.querySelector("[data-form-submit]");
    const currentLabel = projectForm.querySelector("[data-form-current]");
    const totalLabel = projectForm.querySelector("[data-form-total]");
    const progress = projectForm.querySelector("[data-form-progress]");
    const error = projectForm.querySelector("[data-form-error]");
    const announcement = projectForm.querySelector("[data-form-announcement]");
    let currentStep = 0;

    const twoDigits = (value) => String(value).padStart(2, "0");

    const updateForm = (moveFocus = false) => {
      steps.forEach((step, index) => {
        const active = index === currentStep;
        step.classList.toggle("is-active", active);
        step.toggleAttribute("inert", !active);
        step.setAttribute("aria-hidden", String(!active));
      });

      if (currentLabel) currentLabel.textContent = twoDigits(currentStep + 1);
      if (totalLabel) totalLabel.textContent = twoDigits(steps.length);
      if (progress) progress.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
      if (backButton) backButton.disabled = currentStep === 0;
      if (nextButton) nextButton.hidden = currentStep === steps.length - 1;
      if (submitButton) submitButton.hidden = currentStep !== steps.length - 1;
      if (error) error.textContent = "";

      const legend = steps[currentStep]?.querySelector("legend")?.textContent?.trim() || "Pregunta";
      if (announcement) announcement.textContent = `Paso ${currentStep + 1} de ${steps.length}: ${legend}`;

      if (moveFocus) {
        const firstField = steps[currentStep]?.querySelector("input, textarea, select");
        firstField?.focus({ preventScroll: true });
      }
    };

    const validateCurrentStep = () => {
      const fields = [...steps[currentStep].querySelectorAll("input, textarea, select")];
      const invalidField = fields.find((field) => !field.checkValidity());

      if (!invalidField) return true;

      if (error) error.textContent = "Completa la información solicitada para continuar.";
      invalidField.reportValidity();
      invalidField.focus();
      return false;
    };

    nextButton?.addEventListener("click", () => {
      if (!validateCurrentStep()) return;
      currentStep = Math.min(currentStep + 1, steps.length - 1);
      updateForm(true);
    });

    backButton?.addEventListener("click", () => {
      currentStep = Math.max(currentStep - 1, 0);
      updateForm(true);
    });

    projectForm.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.target.matches("textarea, button")) return;
      if (currentStep >= steps.length - 1) return;
      event.preventDefault();
      nextButton?.click();
    });

    projectForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!validateCurrentStep()) return;

      const data = new FormData(projectForm);
      const value = (name, fallback = "No especificado") => String(data.get(name) || fallback).trim();
      const subject = `Consulta de proyecto — ${value("nombre")}`;
      const body = [
        "Hola Nick,",
        "",
        "Quisiera conversar sobre el siguiente proyecto:",
        "",
        `TIPO DE PROYECTO\n${value("tipo")}`,
        `PROBLEMA A RESOLVER\n${value("problema")}`,
        `RESULTADO ESPERADO\n${value("solucion")}`,
        `ESTADO ACTUAL\n${value("estado")}`,
        `RECURSOS DISPONIBLES\n${value("recursos")}`,
        `ALCANCE E INTEGRACIONES\n${value("alcance")}`,
        `PLAZO\n${value("plazo")}`,
        `FECHA O URGENCIA\n${value("fecha")}`,
        `PRESUPUESTO\n${value("presupuesto")}`,
        `MODALIDAD\n${value("modalidad")}`,
        "DATOS DE CONTACTO",
        `Nombre: ${value("nombre")}`,
        `Empresa: ${value("organizacion")}`,
        `Correo: ${value("email")}`,
        `Teléfono: ${value("telefono")}`,
        `Canal preferido: ${value("canal")}`
      ].join("\n\n");

      window.location.href = `mailto:nickbryan20@hotmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });

    updateForm();
  }

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
