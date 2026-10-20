(() => {
  const PAYMENT_LINKS = {
    phone: "",
    text: "",
    remote: "",
    onsite: ""
  };

  const status = document.getElementById("payment-status");
  document.querySelectorAll("[data-service]").forEach((button) => {
    const service = button.dataset.service;
    const url = PAYMENT_LINKS[service];
    if (url) {
      button.href = url;
      button.target = "_blank";
      button.rel = "noopener";
      return;
    }
    button.setAttribute("aria-disabled", "true");
    button.addEventListener("click", (event) => {
      event.preventDefault();
      status.classList.add("attention");
      status.innerHTML = 'Secure checkout activation is pending. Call or text <a href="tel:+16592234118">(659) 223-4118</a> for assistance.';
      status.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
})();