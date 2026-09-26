document.addEventListener("DOMContentLoaded", () => {
  const modal = document.querySelector("[data-lookbook-modal]");

  if (!modal) return;

  const closeButton = modal.querySelector("[data-lookbook-close]");
  const overlay = modal.querySelector(".lookbook-modal__overlay");

  const title = modal.querySelector("[data-product-title]");
  const price = modal.querySelector("[data-product-price]");
  const description = modal.querySelector("[data-product-description]");
  const image = modal.querySelector("[data-product-image]");
  const optionsContainer = modal.querySelector("[data-product-options]");
  const form = modal.querySelector("[data-lookbook-form]");
  const cartMessage = modal.querySelector("[data-cart-message]");

  let currentProduct = null;

  document.querySelectorAll("[data-lookbook-product]").forEach((button) => {
    button.addEventListener("click", () => {
      const jsonId = button.dataset.productJson;
      const jsonElement = document.getElementById(jsonId);

      if (!jsonElement) return;

      currentProduct = JSON.parse(jsonElement.textContent);

      renderProduct(currentProduct);

      modal.setAttribute("aria-hidden", "false");
      modal.classList.add("is-open");

      document.body.classList.add("lookbook-modal-open");
    });
  });

  function renderProduct(product) {
    title.textContent = product.title;

    price.textContent = formatMoney(product.price);

    description.innerHTML = product.description || "";

    if (product.featured_image) {
      image.src = product.featured_image;
      image.alt = product.title;
    }

    renderOptions(product);
  }

  function renderOptions(product) {
    optionsContainer.innerHTML = "";

    if (!product.options || product.options.length === 0) {
      return;
    }

    product.options.forEach((optionName, optionIndex) => {

      const wrapper = document.createElement("div");
      wrapper.className = "lookbook-option";

      const label = document.createElement("label");
      label.textContent = optionName;

      const select = document.createElement("select");

      select.dataset.optionIndex = optionIndex;

      const values = [
        ...new Set(
          product.variants
            .map((variant) => variant.options[optionIndex])
            .filter(Boolean)
        )
      ];

      values.forEach((value) => {
        const option = document.createElement("option");

        option.value = value;
        option.textContent = value;

        select.appendChild(option);
      });

      wrapper.appendChild(label);
      wrapper.appendChild(select);

      optionsContainer.appendChild(wrapper);
    });

    optionsContainer
      .querySelectorAll("select")
      .forEach((select) => {
        select.addEventListener("change", updateVariantState);
      });

    updateVariantState();
  }

  function getSelectedVariant() {
    const selects = [
      ...optionsContainer.querySelectorAll("select")
    ];

    const selectedOptions = selects.map(
      (select) => select.value
    );

    return currentProduct.variants.find((variant) => {

      return variant.options.every(
        (value, index) =>
          value === selectedOptions[index]
      );

    });
  }

  function updateVariantState() {

    const variant = getSelectedVariant();

    const addButton = form.querySelector(
      ".lookbook-add-button"
    );

    if (!variant) {
      addButton.disabled = true;
      addButton.textContent = "UNAVAILABLE";
      return;
    }

    if (!variant.available) {
      addButton.disabled = true;
      addButton.textContent = "SOLD OUT";
      return;
    }

    addButton.disabled = false;
    addButton.innerHTML = `
      ADD TO CART
      <span>→</span>
    `;
  }

  form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const variant = getSelectedVariant();

    if (!variant || !variant.available) {
      return;
    }

    const button = form.querySelector(
      ".lookbook-add-button"
    );

    button.disabled = true;
    button.textContent = "ADDING...";

    try {

      const response = await fetch(
        `${window.Shopify.routes.root}cart/add.js`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            items: [
              {
                id: variant.id,
                quantity: 1
              }
            ]
          })
        }
      );

      if (!response.ok) {
        throw new Error("Unable to add product");
      }

      await response.json();

      cartMessage.textContent = "Added to cart";

      button.innerHTML = `
        ADDED TO CART
        <span>✓</span>
      `;

      document.dispatchEvent(
        new CustomEvent("cart:updated")
      );

      setTimeout(() => {
        closeModal();
      }, 800);

    } catch (error) {

      console.error(error);

      cartMessage.textContent =
        "Unable to add product. Please try again.";

      button.disabled = false;

      button.innerHTML = `
        ADD TO CART
        <span>→</span>
      `;
    }
  });

  function closeModal() {
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("is-open");

    document.body.classList.remove(
      "lookbook-modal-open"
    );
  }

  closeButton.addEventListener("click", closeModal);
  overlay.addEventListener("click", closeModal);

  document.addEventListener("keydown", (event) => {

    if (
      event.key === "Escape" &&
      modal.classList.contains("is-open")
    ) {
      closeModal();
    }

  });

  function formatMoney(cents) {

    return new Intl.NumberFormat(
      document.documentElement.lang || "en",
      {
        style: "currency",
        currency: window.Shopify.currency.active
      }
    ).format(cents / 100);

  }
});