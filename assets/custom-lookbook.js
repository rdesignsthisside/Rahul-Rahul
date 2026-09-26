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
  const addButton = modal.querySelector(".lookbook-add-button");

  let currentProduct = null;
  let isLoading = false;


  /*
   * ==========================================
   * OPEN LOOKBOOK PRODUCT
   * ==========================================
   */

  document.querySelectorAll("[data-lookbook-product]").forEach((button) => {

    button.addEventListener("click", async () => {

      const productHandle = button.dataset.productHandle;

      if (!productHandle) {
        console.error("No product handle found on lookbook hotspot.");
        return;
      }

      if (isLoading) return;

      isLoading = true;

      openModal();

      showLoading();

      try {

        /*
         * Shopify Ajax Product API
         *
         * Example:
         * /products/tisso-vision.js
         */

        const response = await fetch(
          `${window.Shopify.routes.root}products/${productHandle}.js`
        );

        if (!response.ok) {
          throw new Error(
            `Product request failed: ${response.status}`
          );
        }

        const product = await response.json();

        console.log("LOOKBOOK PRODUCT:", product);

        currentProduct = product;

        renderProduct(product);

      } catch (error) {

        console.error(
          "Unable to load lookbook product:",
          error
        );

        showError();

      } finally {

        isLoading = false;

      }

    });

  });


  /*
   * ==========================================
   * OPEN MODAL
   * ==========================================
   */

  function openModal() {

    modal.setAttribute("aria-hidden", "false");

    modal.classList.add("is-open");

    document.body.classList.add(
      "lookbook-modal-open"
    );

  }


  /*
   * ==========================================
   * LOADING STATE
   * ==========================================
   */

  function showLoading() {

    title.textContent = "Loading...";

    price.textContent = "";

    description.textContent = "";

    image.removeAttribute("src");

    image.alt = "";

    optionsContainer.innerHTML = "";

    cartMessage.textContent = "";

    addButton.disabled = true;

    addButton.textContent = "LOADING...";

  }


  /*
   * ==========================================
   * ERROR STATE
   * ==========================================
   */

  function showError() {

    title.textContent = "Product unavailable";

    price.textContent = "";

    description.textContent =
      "Unable to load this product. Please try again.";

    image.removeAttribute("src");

    optionsContainer.innerHTML = "";

    addButton.disabled = true;

    addButton.textContent = "UNAVAILABLE";

  }


  /*
   * ==========================================
   * RENDER PRODUCT
   * ==========================================
   */

  function renderProduct(product) {

    /*
     * TITLE
     */

    title.textContent =
      product.title || "";


    /*
     * PRICE
     *
     * Shopify returns price in cents.
     */

    if (product.price !== undefined) {

      price.textContent =
        formatMoney(product.price);

    } else {

      price.textContent = "";

    }


    /*
     * DESCRIPTION
     */

    description.innerHTML =
      product.description || "";


    /*
     * IMAGE
     */

    if (product.featured_image) {

      image.src =
        product.featured_image;

      image.alt =
        product.title || "";

      image.style.display =
        "block";

    } else {

      image.removeAttribute("src");

      image.style.display =
        "none";

    }


    /*
     * VARIANTS
     */

    renderOptions(product);

  }


  /*
   * ==========================================
   * VARIANT OPTIONS
   * ==========================================
   */

  function renderOptions(product) {

    optionsContainer.innerHTML = "";

    if (
      !product.variants ||
      !product.variants.length
    ) {

      updateVariantState();

      return;

    }


    /*
     * If product only has one default variant,
     * there is no need to show selectors.
     */

    const hasRealOptions =
      product.options &&
      product.options.length &&
      !(
        product.options.length === 1 &&
        product.options[0].name === "Title" &&
        product.options[0].values?.length === 1 &&
        product.options[0].values[0] === "Default Title"
      );


    if (!hasRealOptions) {

      updateVariantState();

      return;

    }


    /*
     * Shopify product.options looks like:
     *
     * [
     *   {
     *     name: "Size",
     *     position: 1,
     *     values: ["S", "M", "L"]
     *   },
     *   {
     *     name: "Color",
     *     position: 2,
     *     values: ["Black", "White"]
     *   }
     * ]
     */

    product.options.forEach((optionData, optionIndex) => {

      const wrapper =
        document.createElement("div");

      wrapper.className =
        "lookbook-option";


      const label =
        document.createElement("label");

      label.textContent =
        optionData.name;


      const select =
        document.createElement("select");

      select.dataset.optionIndex =
        optionIndex;


      /*
       * Use Shopify's option values.
       */

      const values =
        optionData.values || [];


      values.forEach((value) => {

        const option =
          document.createElement("option");

        option.value =
          value;

        option.textContent =
          value;

        select.appendChild(option);

      });


      wrapper.appendChild(label);

      wrapper.appendChild(select);

      optionsContainer.appendChild(wrapper);

    });


    /*
     * Listen for changes
     */

    optionsContainer
      .querySelectorAll("select")
      .forEach((select) => {

        select.addEventListener(
          "change",
          updateVariantState
        );

      });


    updateVariantState();

  }


  /*
   * ==========================================
   * GET SELECTED VARIANT
   * ==========================================
   */

  function getSelectedVariant() {

    if (
      !currentProduct ||
      !currentProduct.variants ||
      !currentProduct.variants.length
    ) {

      return null;

    }


    const selects =
      Array.from(
        optionsContainer.querySelectorAll("select")
      );


    /*
     * Product has no selectable options.
     */

    if (!selects.length) {

      /*
       * Prefer first available variant.
       */

      return (
        currentProduct.variants.find(
          (variant) => variant.available
        ) ||
        currentProduct.variants[0]
      );

    }


    const selectedOptions =
      selects.map(
        (select) => select.value
      );


    return currentProduct.variants.find(
      (variant) => {

        return variant.options.every(
          (value, index) => {

            return (
              value ===
              selectedOptions[index]
            );

          }
        );

      }
    );

  }


  /*
   * ==========================================
   * UPDATE ADD TO CART
   * ==========================================
   */

  function updateVariantState() {

    const variant =
      getSelectedVariant();


    if (!variant) {

      addButton.disabled =
        true;

      addButton.textContent =
        "UNAVAILABLE";

      return;

    }


    if (!variant.available) {

      addButton.disabled =
        true;

      addButton.textContent =
        "SOLD OUT";

      return;

    }


    addButton.disabled =
      false;

    addButton.innerHTML = `
      ADD TO CART
      <span>→</span>
    `;

  }


  /*
   * ==========================================
   * ADD TO CART
   * ==========================================
   */

  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const variant =
        getSelectedVariant();


      if (
        !variant ||
        !variant.available
      ) {

        return;

      }


      addButton.disabled =
        true;

      addButton.textContent =
        "ADDING...";

      cartMessage.textContent =
        "";


      try {

        const response =
          await fetch(
            `${window.Shopify.routes.root}cart/add.js`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                "Accept":
                  "application/json"
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


        const data =
          await response.json();


        if (!response.ok) {

          console.error(
            "Shopify cart error:",
            data
          );

          throw new Error(
            "Unable to add product"
          );

        }


        console.log(
          "Added to cart:",
          data
        );


        cartMessage.textContent =
          "Added to cart";


        addButton.innerHTML = `
          ADDED TO CART
          <span>✓</span>
        `;


        /*
         * Notify Dawn / other cart components.
         */

        document.dispatchEvent(
          new CustomEvent("cart:updated")
        );


        setTimeout(() => {

          closeModal();

        }, 800);

      } catch (error) {

        console.error(
          "Add to cart error:",
          error
        );


        cartMessage.textContent =
          "Unable to add product. Please try again.";


        addButton.disabled =
          false;


        addButton.innerHTML = `
          ADD TO CART
          <span>→</span>
        `;

      }

    }
  );


  /*
   * ==========================================
   * CLOSE MODAL
   * ==========================================
   */

  function closeModal() {

    modal.setAttribute(
      "aria-hidden",
      "true"
    );

    modal.classList.remove(
      "is-open"
    );

    document.body.classList.remove(
      "lookbook-modal-open"
    );

    currentProduct = null;

  }


  /*
   * CLOSE BUTTON
   */

  closeButton.addEventListener(
    "click",
    closeModal
  );


  /*
   * CLOSE OVERLAY
   */

  overlay.addEventListener(
    "click",
    closeModal
  );

  const btn = document.querySelectorAll('.lookbook-modal__close');
  const lookbookModel = document.querySelector('.lookbook-modal.is-open');

  btn.addEventListener("click", function() {
    lookbookModel.classList.remove("is-open");
    });

  /*
   * CLOSE ESCAPE
   */

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Escape" &&
        modal.classList.contains("is-open")
      ) {

        closeModal();

      }

    }
  );


  /*
   * ==========================================
   * MONEY FORMAT
   * ==========================================
   */

  function formatMoney(cents) {

    const amount =
      Number(cents);


    if (
      !Number.isFinite(amount)
    ) {

      return "";

    }


    const currency =
      window.Shopify?.currency?.active ||
      "USD";


    return new Intl.NumberFormat(
      document.documentElement.lang ||
        "en",
      {
        style: "currency",
        currency: currency
      }
    ).format(
      amount / 100
    );

  }

});