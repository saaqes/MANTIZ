// ---------------------------
//  Estado y utilidades
// ---------------------------
let searchOpen = false;

function updateVisibility() {
  const logo  = document.getElementById("logoMain");
  const login = document.getElementById("loginButton");
  const w     = window.innerWidth;

  // Logo: oculto solo si (barra abierta && w < 900)
  if (logo) {
    if (searchOpen && w < 900) {
      logo.classList.add("hidden");   // hidden = opacity 0 + visibility hidden (definido en CSS)
    } else {
      logo.classList.remove("hidden");
    }
  }

  // Login:
  //   - si barra abierta => oculto
  //   - si barra cerrada:
  //        * w < 680  => oculto
  //        * w >= 680 => visible
  if (login) {
    if (searchOpen || w < 680) {
      login.style.display = "none";
    } else {
      login.style.display = "inline-block";
    }
  }
}

// ---------------------------
//  Toggle barra de búsqueda
// ---------------------------
function toggleSearchBarInline() {
  const searchInput = document.getElementById("inlineSearchContainer");
  const searchIcon  = document.getElementById("searchToggleIcon");

  if (!searchInput || !searchIcon) return;

  if (!searchOpen) {
    // -------- Abrir barra --------
    searchInput.style.display = "inline-block";
    requestAnimationFrame(() => {
      searchInput.style.opacity = "1";
      searchInput.style.transform = "scaleX(1)";
    });
    searchIcon.classList.replace("fa-magnifying-glass", "fa-xmark");
  } else {
    // -------- Cerrar barra --------
    searchInput.style.opacity = "0";
    searchInput.style.transform = "scaleX(0.95)";
    setTimeout(() => {
      searchInput.style.display = "none";
    }, 250);
    searchIcon.classList.replace("fa-xmark", "fa-magnifying-glass");
  }

  searchOpen = !searchOpen;
  updateVisibility();
}

// ---------------------------
//  Listeners globales
// ---------------------------
window.addEventListener("resize", updateVisibility);
document.addEventListener("DOMContentLoaded", updateVisibility);

if (overlay) {
    if (searchOpen) {
      overlay.classList.add("visible");
      document.body.style.overflow = "hidden"; // bloquea scroll
    } else {
      overlay.classList.remove("visible");
      setTimeout(() => overlay.style.display = "none", 300);
      document.body.style.overflow = ""; // restaura scroll
    }
  }
