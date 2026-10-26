const skipLink = document.querySelector('.about-skip[href="#main"]');
const main = document.getElementById("main");

if (skipLink && main) {
  skipLink.addEventListener("click", () => {
    requestAnimationFrame(() => main.focus({ preventScroll: true }));
  });
}
