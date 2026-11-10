const searchForm = document.querySelector(".search");
const headerMenus = [
  ...document.querySelectorAll(".category-menu, .account-menu"),
].map((element) => ({
  element,
  toggle: element.querySelector("button[aria-controls]"),
  dropdown: element.querySelector(".category-dropdown, .account-dropdown"),
}));

function closeHeaderMenus(except = null) {
  headerMenus.forEach((menu) => {
    if (menu === except) return;
    menu.dropdown.hidden = true;
    menu.toggle.setAttribute("aria-expanded", "false");
  });
}

headerMenus.forEach((menu) => {
  menu.toggle.addEventListener("click", () => {
    const open = menu.dropdown.hidden;
    closeHeaderMenus();
    menu.dropdown.hidden = !open;
    menu.toggle.setAttribute("aria-expanded", String(open));
  });
  menu.element.addEventListener("focusout", (event) => {
    if (!menu.element.contains(event.relatedTarget)) {
      menu.dropdown.hidden = true;
      menu.toggle.setAttribute("aria-expanded", "false");
    }
  });
  menu.dropdown.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeHeaderMenus();
  });
});
document.addEventListener("pointerdown", (event) => {
  closeHeaderMenus(
    headerMenus.find((menu) => menu.element.contains(event.target)),
  );
});
document.addEventListener("keydown", (event) => {
  const open = headerMenus.find((menu) => !menu.dropdown.hidden);
  if (event.key === "Escape" && open) {
    closeHeaderMenus();
    open.toggle.focus();
  }
});

if (searchForm) {
  const input = searchForm.querySelector('input[name="q"]');
  const dropdown = searchForm.querySelector(".search-dropdown");
  const feedback = searchForm.querySelector(".search-feedback");
  const list = searchForm.querySelector('[role="listbox"]');
  const showAll = searchForm.querySelector(".search-all");
  const money = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  });
  let timer;
  let controller;
  let active = -1;

  function closeSuggestions() {
    clearTimeout(timer);
    controller?.abort();
    dropdown.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  }

  function selectSuggestion(index) {
    const options = [...list.querySelectorAll('[role="option"]')];
    active = index;
    options.forEach((option, number) =>
      option.setAttribute("aria-selected", String(number === index)),
    );
    if (options[index])
      input.setAttribute("aria-activedescendant", options[index].id);
    else input.removeAttribute("aria-activedescendant");
  }

  function renderProducts(products) {
    list.replaceChildren();
    products.forEach((product, index) => {
      const item = document.createElement("li");
      item.setAttribute("role", "presentation");
      const link = document.createElement("a");
      link.href = "/books/" + encodeURIComponent(product.id);
      link.className = "search-option";
      link.id = "search-product-" + index;
      link.setAttribute("role", "option");
      link.setAttribute("aria-selected", "false");
      if (product.image.startsWith("/images/")) {
        const image = document.createElement("img");
        image.src = product.image;
        image.alt = "";
        image.width = 44;
        image.height = 56;
        link.append(image);
      }
      const info = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = product.title;
      const category = document.createElement("small");
      category.textContent = product.category;
      const price = document.createElement("b");
      price.textContent = money.format(product.price);
      info.append(name, category, price);
      link.append(info);
      item.append(link);
      list.append(item);
    });
  }

  function requestSuggestions() {
    closeSuggestions();
    list.replaceChildren();
    const term = input.value.trim();
    if (!term) return;
    dropdown.hidden = false;
    input.setAttribute("aria-expanded", "true");
    list.setAttribute("aria-busy", "true");
    feedback.textContent = "Đang tìm sản phẩm…";
    showAll.href = "/search?" + new URLSearchParams({ q: term });
    controller = new AbortController();
    const request = controller;
    timer = setTimeout(async () => {
      try {
        const response = await fetch(
          "/search/suggestions?" + new URLSearchParams({ q: term }),
          { signal: request.signal },
        );
        if (!response.ok) throw new Error("Search unavailable");
        const result = await response.json();
        if (request.signal.aborted || term !== input.value.trim()) return;
        renderProducts(result.products);
        feedback.textContent = result.products.length
          ? "Sản phẩm liên quan — chọn để xem chi tiết"
          : "Chưa tìm thấy sản phẩm. Thử từ khóa khác.";
      } catch (error) {
        if (!request.signal.aborted)
          feedback.textContent =
            "Chưa tải được gợi ý. Nhấn Enter để tìm kiếm hoặc thử gõ lại.";
      } finally {
        if (!request.signal.aborted) list.setAttribute("aria-busy", "false");
      }
    }, 220);
  }

  input.addEventListener("input", requestSuggestions);
  input.addEventListener("focus", requestSuggestions);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSuggestions();
    } else if (
      (event.key === "ArrowDown" || event.key === "ArrowUp") &&
      !dropdown.hidden
    ) {
      event.preventDefault();
      const count = list.querySelectorAll('[role="option"]').length;
      if (count)
        selectSuggestion(
          event.key === "ArrowDown"
            ? (active + 1) % count
            : (active <= 0 ? count : active) - 1,
        );
    }
  });
  searchForm.addEventListener("submit", (event) => {
    const option = list.querySelectorAll('[role="option"]')[active];
    if (!dropdown.hidden && option) {
      event.preventDefault();
      window.location.assign(option.href);
    }
  });
  searchForm.addEventListener("focusout", (event) => {
    if (!searchForm.contains(event.relatedTarget)) closeSuggestions();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!searchForm.contains(event.target)) closeSuggestions();
  });
}
