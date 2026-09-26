document.addEventListener("DOMContentLoaded", function () {
  const modal = document.querySelector("[data-lookbook-modal]");

  if (!modal) {
    console.error("Lookbook modal not found.");
    return;
  }

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
  ==================================================
  OPEN PRODUCT
  ==================================================
  */

  const productButtons =
    document.querySelectorAll("[data-lookbook-product]");

  productButtons.forEach(function (button) {

    button.addEventListener("click", function () {

      const productHandle =
        button.getAttribute("data-product-handle");

      console.log(
        "Clicked product:",
        productHandle
      );

      if (!productHandle) {
        console.error(
          "No data-product-handle found on hotspot."
        );
        return;
      }

      if (isLoading) {
        return;
      }

      openModal();

      loadProduct(productHandle);

    });

  });


  /*
  ==================================================
  OPEN MODAL
  ==================================================
  */

  function openModal() {

    modal.setAttribute(
      "aria-hidden",
      "false"
    );

    modal.classList.add("is-open");

    document.body.classList.add(
      "lookbook-modal-open"
    );

  }


  /*
  ==================================================
  LOAD PRODUCT FROM SHOPIFY
  ==================================================
  */

  async function loadProduct(productHandle) {

    isLoading = true;

    showLoading();

    try {

      const url =
        `${window.Shopify.routes.root}products/${encodeURIComponent(productHandle)}.js`;

      console.log(
        "Fetching product:",
        url
      );

      const response =
        await fetch(url, {
          method: "GET",
          headers: {
            "Accept": "application/json"
          }
        });


      if (!response.ok) {

        throw new Error(
          `Product request failed: ${response.status}`
        );

      }


      const product =
        await response.json();


      console.log(
        "Shopify product:",
        product
      );


      currentProduct =
        product;


      renderProduct(product);


    } catch (error) {

      console.error(
        "Lookbook product error:",
        error
      );

      showError();

    } finally {

      isLoading = false;

    }

  }


  /*
  ==================================================
  LOADING
  ==================================================
  */

  function showLoading() {

    title.textContent =
      "Loading...";

    price.textContent =
      "";

    description.innerHTML =
      "";

    image.removeAttribute("src");

    image.alt =
      "";

    optionsContainer.innerHTML =
      "";

    cartMessage.textContent =
      "";

    addButton.disabled =
      true;

    addButton.innerHTML =
      "LOADING...";

  }


  /*
  ==================================================
  ERROR
  ==================================================
  */

  function showError() {

    title.textContent =
      "Product unavailable";

    price.textContent =
      "";

    description.textContent =
      "Unable to load this product.";

    image.removeAttribute("src");

    optionsContainer.innerHTML =
      "";

    addButton.disabled =
      true;

    addButton.textContent =
      "UNAVAILABLE";

  }


  /*
  ==================================================
  RENDER PRODUCT
  ==================================================
  */

  function renderProduct(product) {

        /*
        TITLE
        */

        title.textContent =
        product.title || "";


        /*
        PRICE
        */

        if (product.price !== undefined) {

        price.textContent =
            formatMoney(product.price);

        } else {

        price.textContent =
            "";

        }


        /*
        DESCRIPTION
        */

        description.innerHTML =
        product.description || "";


        /*
        IMAGE
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
        VARIANTS
        */

        renderOptions(product);

    }


    /*
    ==================================================
    RENDER OPTIONS
    ==================================================

    Shopify Ajax product JSON:

    product.options = [
        "Color",
        "Size"
    ]

    product.variants = [
        {
        options: [
            "Black",
            "S"
        ]
        }
    ]

    */

    function renderOptions(product) {

    optionsContainer.innerHTML = "";

    if (
        !product.variants ||
        !product.variants.length ||
        !product.options ||
        !product.options.length
    ) {
        updateVariantState();
        return;
    }


    /*
    * Shopify can return product.options like:
    *
    * [
    *   {
    *     name: "Size",
    *     position: 1
    *   },
    *   {
    *     name: "Color",
    *     position: 2
    *   }
    * ]
    *
    * We therefore use optionData.name.
    */


    product.options.forEach(function (optionData, optionIndex) {

        /*
        * Get actual option name.
        */

        const optionName =
        typeof optionData === "string"
            ? optionData
            : optionData.name;


        if (!optionName) {
        return;
        }


        /*
        * Create wrapper.
        */

        const wrapper =
        document.createElement("div");

        wrapper.className =
        "lookbook-option";


        /*
        * Create label.
        */

        const label =
        document.createElement("div");

        label.className =
        "lookbook-option__label";

        label.textContent =
        optionName;

        wrapper.appendChild(label);


        /*
        * Determine whether this is Color.
        */

        const normalizedName =
        optionName
            .toString()
            .trim()
            .toLowerCase();


        const isColor =
        normalizedName === "color" ||
        normalizedName === "colour";


        /*
        * Get all values for this option
        * from the product variants.
        */

        const values = [];

        product.variants.forEach(function (variant) {

        if (
            !variant.options ||
            variant.options[optionIndex] === undefined
        ) {
            return;
        }


        const value =
            variant.options[optionIndex];


        if (
            value &&
            !values.includes(value)
        ) {
            values.push(value);
        }

        });


        /*
        * ========================================
        * COLOR
        * ========================================
        *
        * Color is rendered as radio buttons.
        */

        if (isColor) {

        const colorContainer =
            document.createElement("div");

        colorContainer.className =
            "lookbook-color-options";


        values.forEach(function (value, valueIndex) {

            const radioId =
            `lookbook-color-${product.id}-${optionIndex}-${valueIndex}`;


            /*
            * Label
            */

            const colorLabel =
            document.createElement("label");

            colorLabel.className =
            "lookbook-color-option";

            colorLabel.setAttribute(
            "for",
            radioId
            );


            /*
            * Radio input
            */

            const radio =
            document.createElement("input");

            radio.type =
            "radio";

            radio.id =
            radioId;

            radio.name =
            `lookbook-color-${product.id}-${optionIndex}`;

            radio.value =
            value;

            radio.dataset.optionIndex =
            optionIndex;


            /*
            * Select first color by default.
            */

            if (valueIndex === 0) {
            radio.checked = true;
            }


            /*
            * Visible button text
            */

            const colorValue =
            document.createElement("span");

            colorValue.className =
            "lookbook-color-option__value";

            colorValue.textContent =
            value;


            /*
            * Build radio button.
            */

            colorLabel.appendChild(radio);

            colorLabel.appendChild(colorValue);

            colorContainer.appendChild(colorLabel);


            /*
            * Variant update.
            */

            radio.addEventListener(
            "change",
            updateVariantState
            );

        });


        wrapper.appendChild(
            colorContainer
        );

        }


        /*
        * ========================================
        * ALL OTHER OPTIONS
        * ========================================
        *
        * Size stays as dropdown.
        */

        else {

        const select =
            document.createElement("select");

        select.className =
            "lookbook-option__select";

        select.dataset.optionIndex =
            optionIndex;


        values.forEach(function (value) {

            const option =
            document.createElement("option");

            option.value =
            value;

            option.textContent =
            value;

            select.appendChild(option);

        });


        select.addEventListener(
            "change",
            updateVariantState
        );


        wrapper.appendChild(
            select
        );

        }


        optionsContainer.appendChild(
        wrapper
        );

    });


    /*
    * Set initial variant state.
    */

    updateVariantState();

    }


  /*
  ==================================================
  GET SELECTED VARIANT
  ==================================================
  */

    function getSelectedVariant() {

        if (
            !currentProduct ||
            !currentProduct.variants ||
            !currentProduct.variants.length
        ) {
            return null;
        }


        /*
        * Store selected values according
        * to Shopify option position.
        */

        const selectedOptions = [];


        /*
        * ========================================
        * GET DROPDOWN VALUES
        * ========================================
        */

        const selects =
            optionsContainer.querySelectorAll(
            "select[data-option-index]"
            );


        selects.forEach(function (select) {

            const index =
            Number(
                select.dataset.optionIndex
            );

            selectedOptions[index] =
            select.value;

        });


        /*
        * ========================================
        * GET RADIO VALUES
        * ========================================
        */

        const radios =
            optionsContainer.querySelectorAll(
            'input[type="radio"][data-option-index]:checked'
            );


        radios.forEach(function (radio) {

            const index =
            Number(
                radio.dataset.optionIndex
            );

            selectedOptions[index] =
            radio.value;

        });


        /*
        * ========================================
        * NO OPTIONS
        * ========================================
        */

        if (selectedOptions.length === 0) {

            return (
            currentProduct.variants.find(
                function (variant) {
                return variant.available;
                }
            ) ||
            currentProduct.variants[0]
            );

        }


        /*
        * ========================================
        * FIND MATCHING VARIANT
        * ========================================
        */

        return currentProduct.variants.find(
            function (variant) {

            if (
                !variant.options ||
                variant.options.length !== selectedOptions.length
            ) {
                return false;
            }


            return variant.options.every(
                function (value, index) {

                return (
                    value ===
                    selectedOptions[index]
                );

                }
            );

            }
        ) || null;

    }


  /*
  ==================================================
  UPDATE BUTTON
  ==================================================
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
  ==================================================
  ADD TO CART
  ==================================================
  */

  form.addEventListener(
    "submit",
    async function (event) {

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


        document.dispatchEvent(
          new CustomEvent("cart:updated")
        );


        setTimeout(
          function () {
            closeModal();
          },
          800
        );

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
  ==================================================
  CLOSE MODAL
  ==================================================
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

    currentProduct =
      null;

  }




  /*
  CLOSE BUTTON
  */

  if (closeButton) {

    closeButton.addEventListener(
      "click",
      closeModal
    );

  }


  /*
  CLOSE OVERLAY
  */

  if (overlay) {

    overlay.addEventListener(
      "click",
      closeModal
    );

  }


  /*
  ESCAPE KEY
  */

  document.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key === "Escape" &&
        modal.classList.contains("is-open")
      ) {

        closeModal();

      }

    }
  );


  
  const lookbookModelClose = document.querySelector('.lookbook-modal__close');
  const lookbookModel = document.querySelector('.lookbook-modal.is-open');

  lookbookModelClose.addEventListener("click", function(){
    lookbookModel.classList.remove('is-open');
  });

  /*
  ==================================================
  MONEY FORMAT
  ==================================================
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
      window.Shopify &&
      window.Shopify.currency &&
      window.Shopify.currency.active
        ? window.Shopify.currency.active
        : "USD";


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