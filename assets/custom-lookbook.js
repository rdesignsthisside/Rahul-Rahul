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
  const addButton = form.querySelector(".lookbook-add-button");

  let currentProduct = null;

  /*
   * OPEN PRODUCT POPUP
   */
  document.querySelectorAll("[data-lookbook-product]").forEach((button) => {
    button.addEventListener("click", () => {
      const jsonId = button.dataset.productJson;
      const jsonElement = document.getElementById(jsonId);

      if (!jsonElement) {
        console.error("Lookbook product JSON not found:", jsonId);
        return;
      }

      try {
        currentProduct = JSON.parse(jsonElement.textContent);

        console.log("Lookbook product:", currentProduct);

        renderProduct(currentProduct);

        modal.setAttribute("aria-hidden", "false");
        modal.classList.add("is-open");

        document.body.classList.add("lookbook-modal-open");

      } catch (error) {
        console.error("Unable to parse lookbook product:", error);
      }
    });
  });


  /*
   * RENDER PRODUCT
   */
  function renderProduct(product) {

    // Reset cart message
    cartMessage.textContent = "";

    // Product title
    title.textContent = product.title || "";

    // Product price
    const productPrice =
      product.price ??
      product.variants?.[0]?.price ??
      0;

    price.textContent = formatMoney(productPrice);

    // Description
    description.textContent = product.description || "";

    // Product image
    if (product.featured_image) {
      image.src = product.featured_image;
      image.alt = product.title || "";
      image.style.display = "block";
    } else {
      image.removeAttribute("src");
      image.style.display = "none";
    }

    // Variants
    renderOptions(product);
  }


  /*
   * RENDER VARIANT SELECTORS
   */
  function renderOptions(product) {

    optionsContainer.innerHTML = "";

    if (
      !product.options ||
      !product.options.length ||
      !product.variants ||
      product.variants.length <= 1
    ) {
      updateVariantState();
      return;
    }

    product.options.forEach((optionName, optionIndex) => {

      const wrapper = document.createElement("div");
      wrapper.className = "lookbook-option";

      const label = document.createElement("label");
      label.textContent = optionName;

      const select = document.createElement("select");

      select.dataset.optionIndex = optionIndex;

      /*
       * Get unique values for this option
       */
      const values = [
        ...new Set(
          product.variants
            .map((variant) => variant.options?.[optionIndex])
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


    /*
     * Listen for variant changes
     */
    optionsContainer
      .querySelectorAll("select")
      .forEach((select) => {
        select.addEventListener("change", updateVariantState);
      });


    updateVariantState();
  }


  /*
   * FIND CURRENT VARIANT
   */
  function getSelectedVariant() {

    if (!currentProduct || !currentProduct.variants?.length) {
      return null;
    }

    const selects = [
      ...optionsContainer.querySelectorAll("select")
    ];

    /*
     * If there are no selectors,
     * use the first variant.
     */
    if (!selects.length) {
      return currentProduct.variants[0];
    }

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


  /*
   * UPDATE ADD TO CART BUTTON
   */
  function updateVariantState() {

    const variant = getSelectedVariant();

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


  /*
   * ADD TO CART
   */
  form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const variant = getSelectedVariant();

    if (!variant || !variant.available) {
      return;
    }

    addButton.disabled = true;
    addButton.textContent = "ADDING...";

    cartMessage.textContent = "";

    try {

      const response = await fetch(
        `${window.Shopify.routes.root}cart/add.js`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
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

        const errorData = await response.json().catch(() => null);

        console.error("Cart error:", errorData);

        throw new Error("Unable to add product");
      }


      await response.json();

      cartMessage.textContent = "Added to cart";

      addButton.innerHTML = `
        ADDED TO CART
        <span>✓</span>
      `;


      /*
       * Notify Shopify/theme cart components
       */
      document.dispatchEvent(
        new CustomEvent("cart:updated")
      );


      /*
       * Also notify common Shopify cart listeners
       */
      document.dispatchEvent(
        new CustomEvent("cart:refresh")
      );


      setTimeout(() => {
        closeModal();
      }, 800);


    } catch (error) {

      console.error(error);

      cartMessage.textContent =
        "Unable to add product. Please try again.";

      addButton.disabled = false;

      addButton.innerHTML = `
        ADD TO CART
        <span>→</span>
      `;
    }
  });


  /*
   * CLOSE POPUP
   */
  function closeModal() {

    modal.setAttribute("aria-hidden", "true");

    modal.classList.remove("is-open");

    document.body.classList.remove(
      "lookbook-modal-open"
    );
  }


  /*
   * CLOSE BUTTON
   */
  closeButton.addEventListener(
    "click",
    closeModal
  );


  /*
   * CLOSE BY CLICKING OVERLAY
   */
  overlay.addEventListener(
    "click",
    closeModal
  );


  /*
   * CLOSE WITH ESCAPE
   */
  document.addEventListener("keydown", (event) => {

    if (
      event.key === "Escape" &&
      modal.classList.contains("is-open")
    ) {
      closeModal();
    }

  });


  /*
   * FORMAT SHOPIFY PRICE
   */
  function formatMoney(cents) {

    const numericCents = Number(cents);

    if (!Number.isFinite(numericCents)) {
      return "";
    }

    const currency =
      window.Shopify?.currency?.active || "USD";

    return new Intl.NumberFormat(
      document.documentElement.lang || "en",
      {
        style: "currency",
        currency: currency
      }
    ).format(numericCents / 100);
  }

});