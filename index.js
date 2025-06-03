// index.js actualizado para ocultar y mostrar el navbar con scroll

const images = [
  "./imgs/1.png",
  "./imgs/2.png",
  "./imgs/3.png"
];

let current = 0;
let interval;
const imageEl = document.getElementById("carouselImage");
const progressEls = document.querySelectorAll(".progress");
const indicators = document.querySelectorAll(".indicator");
const contentEl = document.getElementById("carouselContent");

function showImage(index) {
  imageEl.classList.remove("fade-in");
  imageEl.classList.add("fade-out");

  setTimeout(() => {
    current = index;
    imageEl.src = images[current];
    imageEl.classList.remove("fade-out");
    void imageEl.offsetWidth;
    imageEl.classList.add("fade-in");

    progressEls.forEach((el, i) => {
      el.style.animation = "none";
      el.offsetHeight;
      el.style.animation = i === current ? "progress 4.5s linear forwards" : "none";
    });

    contentEl.classList.remove("text-enter");
    contentEl.classList.add("text-exit");
    setTimeout(() => {
      contentEl.classList.remove("text-exit");
      contentEl.classList.add("text-enter");
    }, 500);
  }, 500);
}

function startCarousel() {
  interval = setInterval(() => {
    const next = (current + 1) % images.length;
    showImage(next);
  }, 4500);
}

document.addEventListener("DOMContentLoaded", () => {
  progressEls[0].style.animation = "progress 4.5s linear forwards";
  contentEl.classList.add("text-enter");
  startCarousel();

  indicators.forEach((el, i) => {
    el.addEventListener("click", () => {
      clearInterval(interval);
      showImage(i);
      startCarousel();
    });
  });
});

function toggleMenu() {
  document.getElementById("sideMenu").classList.toggle("open");
}

function closeMenu() {
  document.getElementById("sideMenu").classList.remove("open");
}

// Toggle búsqueda superior
const searchToggle = document.getElementById("searchToggle");
if (searchToggle) {
  searchToggle.addEventListener("click", () => {
    const searchBar = document.getElementById("searchBar");
    if (searchBar) searchBar.classList.toggle("active");
  });
}

// Splash screen
window.addEventListener("DOMContentLoaded", () => {
  const splash = document.getElementById("splash");
  if (splash) {
    splash.addEventListener("animationend", () => splash.remove());
    setTimeout(() => splash.remove(), 1600);
  }
});

// Navbar desaparece al hacer scroll hacia abajo y reaparece al subir
let lastScrollY = window.scrollY;
window.addEventListener("scroll", () => {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  const currentScroll = window.scrollY;
  if (currentScroll > lastScrollY && currentScroll > 50) {
    navbar.classList.add("-translate-y-full");
  } else {
    navbar.classList.remove("-translate-y-full");
  }
  lastScrollY = currentScroll;
});
