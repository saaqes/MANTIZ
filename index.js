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

    // Indicador
    progressEls.forEach((el, i) => {
      el.style.animation = "none";
      el.offsetHeight; // reflow
      el.style.animation = i === current ? "progress 4.5s linear forwards" : "none";
    });

    // Texto
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

   // Muestra / oculta la barra de búsqueda al hacer clic en la lupa
    document.getElementById("searchToggle").addEventListener("click", () => {
      document.getElementById("searchBar").classList.toggle("active");
    });

    
window.addEventListener("DOMContentLoaded", () => {
  // Splash screen
  const splash = document.getElementById("splash");
  if (splash) {
    splash.addEventListener("animationend", () => splash.remove());
    setTimeout(() => splash.remove(), 1600); // respaldo
  }

  // Carousel
  progressEls[0].style.animation = "progress 4.5s linear forwards";
  startCarousel();

  indicators.forEach((el) => {
    el.addEventListener("click", () => {
      const index = parseInt(el.getAttribute("data-index"));
      updateImage(index);
      resetCarouselTimer();
    });
  });

  contentEl.classList.add("text-enter");

  // Barra de búsqueda
  const searchToggle = document.getElementById("searchToggle");
  const searchBar = document.getElementById("searchBar");
  if (searchToggle && searchBar) {
    searchToggle.addEventListener("click", () => {
      searchBar.classList.toggle("active");
    });
  }
});

