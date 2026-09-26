"use client";

import { useEffect } from "react";

export function LandingMotion() {
  useEffect(() => {
    const landing = document.querySelector<HTMLElement>(".landing-page");
    if (!landing) return;

    const header = landing.querySelector(".landing-header");
    const navLinks =
      landing.querySelectorAll<HTMLAnchorElement>('nav a[href^="#"]');
    let frame = 0;

    function updateScroll() {
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      landing?.style.setProperty(
        "--scroll-progress",
        String(Math.min(1, window.scrollY / maxScroll)),
      );
      landing?.style.setProperty(
        "--hero-shift",
        `${Math.min(window.scrollY * 0.12, 65)}px`,
      );
      header?.classList.toggle("is-scrolled", window.scrollY > 24);

      let active = "";
      navLinks.forEach((link) => {
        const section = document.querySelector(link.getAttribute("href")!);
        if (
          section &&
          section.getBoundingClientRect().top < window.innerHeight * 0.42
        )
          active = link.getAttribute("href")!;
      });
      navLinks.forEach((link) => {
        const isActive = link.getAttribute("href") === active;
        link.classList.toggle("is-active", isActive);
        if (isActive) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
      frame = 0;
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(updateScroll);
    }

    updateScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        cancelAnimationFrame(frame);
      };
    }

    const sections = landing.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" },
    );

    sections.forEach((section) => observer.observe(section));
    landing.classList.add("motion-ready");

    return () => {
      observer.disconnect();
      landing.classList.remove("motion-ready");
      landing.style.removeProperty("--scroll-progress");
      landing.style.removeProperty("--hero-shift");
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
