/* ========================================================================
   TISSO — QUICK-VIEW POP-UP (compact version)
   ======================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  /* -------- helpers --------------------------------------------------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* -------- one-time overlay ------------------------------------------ */
  const popup = document.body.appendChild(
    Object.assign(document.createElement("div"), {
      className: "product-popup hidden",
      innerHTML: '<div class="popup-content"></div>',
    })
  );

  /* -------- open / build ---------------------------------------------- */
  $$(".open-popup").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const product = await fetch(`/products/${btn.dataset.handle}.js`).then(
        (r) => r.json()
      );

      $(".popup-content", popup).innerHTML = render(product);
      popup.classList.remove("hidden");

      bindPills();
      bindAddToCart(product);
    })
  );

  /* -------- close (overlay click or “×”) ------------------------------ */
  document.body.addEventListener("click", (e) => {
    if (e.target === popup || e.target.closest(".popup-close")) {
      popup.classList.add("hidden");
      $(".popup-content", popup).innerHTML = "";
    }
  });

  /* ====================================================================
     MARK-UP
     ==================================================================== */
  function render(p) {
    /* thumbnail, price, description ----------------------------------- */
    const thumb = `<img src="${p.images[0]}" alt="${p.title}" class="popup-thumb">`;
    const price = (p.price / 100).toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR",
    });
    const desc = p.description.replace(/<[^>]+>/g, "").slice(0, 180) + "…";

    /* colour + size ---------------------------------------------------- */
    let colourHTML = "",
      sizeHTML = "";

    p.options.forEach((opt, idx) => {
      const name = opt.name.toLowerCase();

      if (name === "color" || name === "colour") {
        const pills = opt.values
          .map(
            (v, i) => `
          <button
            class="color-pill ${i ? "" : "active"}"
            data-opt-index="${idx}"
            data-value="${v}"
            style="--stripe-col:${v.toLowerCase()}">
            ${v}
          </button>`
          )
          .join("");
        colourHTML = `
          <div class="popup-block">
            <label>Color</label>
            <div class="color-pills">${pills}</div>
          </div>`;
      }

      if (name === "size") {
        const opts = opt.values
          .map((v) => `<option value="${v}">${v}</option>`)
          .join("");
        sizeHTML = `
          <div class="popup-block">
            <label>Size</label>
            <div class="custom-select-wrap">
              <select data-opt-index="${idx}">
                <option disabled selected>Choose your size</option>${opts}
              </select>
              <span class="chevron"></span>
            </div>
          </div>`;
      }
    });

    /* full template ---------------------------------------------------- */
    return `
      <button class="popup-close" aria-label="Close">×</button>

      <div class="popup-grid">
        ${thumb}
        <div class="popup-info">
          <h3>${p.title}</h3>
          <p class="popup-price">${price}</p>
          <p class="popup-desc">${desc}</p>
        </div>
      </div>

      ${colourHTML}${sizeHTML}

      <button class="add-to-cart">ADD TO CART</button>`;
  }

  /* ====================================================================
     BEHAVIOUR
     ==================================================================== */
  function bindPills() {
    $(".color-pills")?.addEventListener("click", (e) => {
      const pill = e.target.closest(".color-pill");
      if (!pill) return;
      pill.parentElement
        .querySelectorAll(".color-pill")
        .forEach((p) => p.classList.toggle("active", p === pill));
    });
  }

  function bindAddToCart(product) {
    $(".add-to-cart").addEventListener("click", async () => {
      /* collect chosen options ---------------------------------------- */
      const chosen = [];

      product.options.forEach((_, idx) => {
        const pill = $(`.color-pill[data-opt-index="${idx}"].active`);
        const select = $(`select[data-opt-index="${idx}"]`);

        if (pill) chosen.push(pill.dataset.value);
        else if (select) {
          if (select.selectedIndex === 0) {
            alert("Please choose your size");
            return;
          }
          chosen.push(select.value);
        }
      });

      const variant = product.variants.find(
        (v) => JSON.stringify(v.options) === JSON.stringify(chosen)
      );
      if (!variant) {
        alert("Variant not found");
        return;
      }

      /* add main product --------------------------------------------- */
      await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: variant.id, quantity: 1 }),
      });

      /* special rule: Medium + Black ⇒ add Soft Winter Jacket --------- */
      if (chosen.includes("Black") && chosen.includes("Medium")) {
        const jacket = await fetch("/products/soft-winter-jacket.js").then(
          (r) => r.json()
        );
        await fetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: jacket.variants[0].id, quantity: 1 }),
        });
      }

      window.location.href = "/cart";
    });
  }

  /* ====================================================================
     CSS
     ==================================================================== */
  const css = `
/* === overlay/container ================================================= */
.product-popup{position:fixed;inset:0;display:flex;justify-content:center;align-items:center;background:rgba(0,0,0,.55);z-index:10000}
.product-popup.hidden{display:none}
.popup-content{background:#fff;border-radius:4px;padding:1.6rem 1.4rem 2.4rem;width:90%;max-width:420px;position:relative;overflow-y:auto;max-height:92vh}

/* === close button ====================================================== */
.popup-close{position:absolute;top:10px;right:12px;border:none;background:transparent;font-size:1.4rem;line-height:1;cursor:pointer}

/* === grid (thumb + info) ============================================== */
.popup-grid{display:grid;grid-template-columns:90px 1fr;column-gap:1rem;margin-bottom:1rem}
.popup-thumb{width:90px;height:90px;object-fit:cover;border-radius:2px}
.popup-info h3{margin:0 0 .25rem;font-size:1.1rem;font-weight:500}
.popup-price{margin:.1rem 0 .45rem;font-size:1.05rem;font-weight:600}
.popup-desc{margin:0;font-size:.8rem;line-height:1.4}

/* === option blocks ===================================================== */
.popup-block{margin-top:.9rem}
.popup-block label{display:block;font-size:.82rem;font-weight:500;margin-bottom:.25rem;color:#000}

/* --- colour pills ------------------------------------------------------ */
.color-pills{display:flex;border:1px solid #000;background:#fff}
.color-pill{flex:1 1 50%;padding:.65rem .9rem;font-size:1rem;line-height:1.2;background:#fff;color:#000;border:none;position:relative;cursor:pointer;--stripe-col:#0060c9}
.color-pill + .color-pill{border-left:1px solid #000}
.color-pill::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--stripe-col)}
.color-pill.active{background:#000;color:#fff}
.color-pill:not(.active):hover{background:#f6f6f6}

/* --- size select ------------------------------------------------------- */
.custom-select-wrap{position:relative;border:1px solid #000;background:#fff}
.custom-select-wrap select{border:none;outline:none;appearance:none;background:transparent;padding:1rem 4.5rem 1rem 1.4rem;width:100%;font-size:1rem;line-height:1.25;cursor:pointer}
.custom-select-wrap::before{content:'';position:absolute;top:0;bottom:0;right:56px;width:1px;background:#000}
.custom-select-wrap .chevron{position:absolute;top:50%;right:24px;transform:translateY(-50%) rotate(45deg);width:12px;height:12px;border-right:2px solid #000;border-bottom:2px solid #000;pointer-events:none}

/* === add to cart ======================================================= */
.add-to-cart{margin-top:1.4rem;width:100%;border:none;background:#000;color:#fff;padding:.9rem;font-size:.95rem;font-weight:500;letter-spacing:.02em;cursor:pointer;position:relative}
.add-to-cart::after{content:'→';position:absolute;right:1rem;top:50%;transform:translateY(-50%)}
.add-to-cart:hover{background:#222}

/* === font override ===================================================== */
.popup-content,
.popup-content h3,
.popup-content p,
.popup-content label,
.popup-content select,
.popup-content button{font-family:"Helvetica Neue","Helvetica","Arial",sans-serif !important}

/* === mobile tweak ====================================================== */
@media(max-width:400px){
  .popup-grid{grid-template-columns:70px 1fr;column-gap:.8rem}
  .popup-thumb{width:70px;height:70px}
}`;
  document.head.appendChild(
    Object.assign(document.createElement("style"), { textContent: css })
  );
});
