/* Progressive motion for the feature spread and the newspaper headline strip. */
(() => {
  "use strict";
  const hero = document.querySelector(".hero");
  const rail = document.querySelector(".edition-rail");
  const library = window.gsap;
  if (!hero || !rail || !library?.matchMedia) return;

  const media = library.matchMedia();
  media.add("(prefers-reduced-motion: no-preference)", () => {
    const title = hero.querySelector("h1");
    const primary = hero.querySelector(".hero-main-photo");
    const secondary = hero.querySelector(".hero-side-photo");
    const arrivalRule = hero.querySelector(".arrival-rule");

    // The photos settle into the spread. The tour actions stay immediately available.
    library.timeline({ defaults: { ease: "power3.out", clearProps: "opacity,transform" } })
      .fromTo(arrivalRule, { scaleX: 0, opacity: 1 }, { scaleX: 1, opacity: 0, duration: .75 }, 0)
      .from(title, { opacity: .55, y: 14, duration: .58 }, .08)
      .from(primary, { opacity: .62, y: 20, duration: .73 }, .16)
      .from(secondary, { opacity: .5, y: 16, x: -10, duration: .6 }, .32);

    if (typeof IntersectionObserver !== "function") return;
    const counters = [...document.querySelectorAll("[data-count]")].map(element => {
      const { count, prefix = "", suffix = "" } = element.dataset;
      const fractionDigits = count.split(".")[1]?.length ?? 0;
      const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: fractionDigits });
      return {
        element,
        original: element.textContent,
        value: Number(count),
        format: value => prefix + formatter.format(value) + suffix
      };
    });
    let counterFrame = 0;
    const drawCounters = () => {
      counterFrame = 0;
      const start = window.innerHeight * .92;
      const distance = window.innerHeight * .37;
      const values = counters.map(({ element, original, value, format }) => {
        const progress = Math.max(0, Math.min(1, (start - element.getBoundingClientRect().top) / distance));
        return progress === 1 ? original : format(progress * value);
      });
      for (const [index, { element }] of counters.entries()) {
        if (element.textContent !== values[index]) element.textContent = values[index];
      }
    };
    const scheduleCounters = () => {
      if (!counterFrame) counterFrame = requestAnimationFrame(drawCounters);
    };
    window.addEventListener("scroll", scheduleCounters, { passive: true });
    window.addEventListener("resize", scheduleCounters);
    drawCounters();

    const headings = document.querySelectorAll(".section-heading h2, .path-head h2");
    // Intersection callbacks run asynchronously, so keep their tweens in this context.
    const scrollMotion = library.context(context => {
      context.add("enter", element => {
        library.from(element, { opacity: .68, y: 10, duration: .42, ease: "power2.out", clearProps: "opacity,transform" });
      });
    });
    const entrances = new IntersectionObserver(entries => {
      for (const { isIntersecting, target } of entries) {
        if (!isIntersecting) continue;
        entrances.unobserve(target);
        scrollMotion.enter(target);
      }
    }, { threshold: .35 });
    for (const heading of headings) entrances.observe(heading);

    const viewport = rail.querySelector(".edition-window");
    const track = rail.querySelector(".edition-track");
    const stories = rail.querySelector(".edition-stories");
    const pause = rail.querySelector(".edition-pause");
    const copy = stories.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    track.append(copy);
    rail.classList.add("is-rolling");
    pause.hidden = false;
    viewport.tabIndex = -1;

    let pausedByUser = false;
    let visible = false;
    const rolling = library.to(track, {
      xPercent: -50,
      duration: 36,
      ease: "none",
      repeat: -1,
      paused: true
    });
    const update = () => rolling.paused(pausedByUser || !visible);
    const toggle = () => {
      pausedByUser = !pausedByUser;
      pause.setAttribute("aria-label", pausedByUser ? "Resume headline animation" : "Pause headline animation");
      pause.querySelector("use").setAttribute("href", pausedByUser ? "#ms-play_arrow" : "#ms-pause");
      update();
    };
    pause.addEventListener("click", toggle);

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(rail);

    return () => {
      observer.disconnect();
      entrances.disconnect();
      scrollMotion.revert();
      cancelAnimationFrame(counterFrame);
      window.removeEventListener("scroll", scheduleCounters);
      window.removeEventListener("resize", scheduleCounters);
      for (const { element, original } of counters) element.textContent = original;
      pause.removeEventListener("click", toggle);
      const hadFocus = document.activeElement === pause;
      pause.hidden = true;
      viewport.tabIndex = 0;
      if (hadFocus) hero.querySelector("#heroTour").focus({ preventScroll: true });
      pause.setAttribute("aria-label", "Pause headline animation");
      pause.querySelector("use").setAttribute("href", "#ms-pause");
      copy.remove();
      rail.classList.remove("is-rolling");
    };
  });

  window.addEventListener("pagehide", event => {
    if (!event.persisted) media.revert();
  });
})();
