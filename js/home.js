// frontend script (updated to use your API)
const API_BASE = "https://motorparts-api.onrender.com/api";
const PRODUCTS_API = `${API_BASE}/products`;
let currentPage = 1;
const limit = 10;

// ====== Dòng xe theo hãng ======
const modelOptions = {
  Honda: [
    "Dream",
    "Wave Alpha",
    "Wave RSX",
    "Blade",
    "Future",
    "Vision",
    "Air Blade",
    "Lead",
    "SH",
  ],
  Yamaha: [
    "Sirius",
    "Sirius Fi",
    "Jupiter",
    "Taurus",
    "Exciter",
    "Grande",
    "Janus",
  ],
  SYM: ["Galaxy 50", "Angela 50 ", "Elegant 50", "Angel 110"],
  TQ: ["Wave TQ", "Sirus TQ", "Dream TQ"],
};

// ====== Hiển thị Toast ======
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return alert(message);

  const colors = {
    success: "bg-success text-white",
    danger: "bg-danger text-white",
    warning: "bg-warning text-dark",
    info: "bg-primary text-white",
  };

  const icon =
    type === "success"
      ? "bi bi-check-circle-fill"
      : type === "danger"
      ? "bi bi-x-circle-fill"
      : type === "warning"
      ? "bi bi-exclamation-triangle-fill"
      : "bi bi-info-circle-fill";

  const toastEl = document.createElement("div");
  toastEl.className = `toast align-items-center ${colors[type]} border-0 animate__animated animate__fadeInDown`;
  toastEl.role = "alert";
  toastEl.innerHTML = `
    <div class="d-flex justify-content-between align-items-center">
      <div class="toast-body d-flex align-items-center gap-2 justify-content-center">
        <i class="${icon}"></i>
        <span>${message}</span>
      </div>
      <button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="toast"></button>
    </div>
  `;

  container.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
  toast.show();
  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

// ====== Lọc dữ liệu ======
const filters = {
  q: document.getElementById("q"),
  vehicle: document.getElementById("vehicle"),
  model: document.getElementById("model"),
  category: document.getElementById("category"),
  status: document.getElementById("status"),
};

const vehicleSelect = filters.vehicle;
const modelSelect = filters.model;
vehicleSelect.addEventListener("change", () => {
  const brand = vehicleSelect.value;
  modelSelect.innerHTML = `<option value="">Tất cả</option>`;
  if (brand && modelOptions[brand]) {
    modelOptions[brand].forEach((m) => {
      modelSelect.innerHTML += `<option value="${m}">${m}</option>`;
    });
  }
  fetchProducts(1);
});

// ====== Lấy danh sách sản phẩm ======
async function fetchProducts(page = 1) {
  const params = new URLSearchParams({ page, limit });
  Object.entries(filters).forEach(([key, el]) => {
    if (el.value && el.value.toString().trim())
      params.append(key, el.value.toString().trim());
  });

  try {
    const res = await fetch(`${PRODUCTS_API}?${params.toString()}`);
    if (!res.ok) throw new Error("Fetch failed");
    const result = await res.json();
    renderTable(result.data || []);
    updatePagination(
      result.page || page,
      result.totalPages || 1,
      result.totalItems || 0
    );
  } catch (err) {
    console.error(err);
    showToast("❌ Lỗi tải danh sách sản phẩm.", "danger");
  }
}

// ====== Render bảng ======
function renderTable(products) {
  const tableBody = document.getElementById("tableBody");
  if (!products || products.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="12" class="text-center text-muted">Không có sản phẩm</td></tr>`;
    return;
  }

  tableBody.innerHTML = products
    .map(
      (p, i) => `
      <tr data-id="${p._id}">
        <td><input type="checkbox" class="select-item" /></td>
        <td>${(currentPage - 1) * limit + (i + 1)}</td>
        <td><img src="${
          p.image || "https://via.placeholder.com/70x55"
        }" class="rounded" width="70" height="55" alt=""></td>
        <td><strong>${escapeHtml(
          p.name
        )}</strong><br><small class="text-muted">${escapeHtml(
        p.description || ""
      )}</small></td>
        <td>${escapeHtml(p.vehicle || "")}</td>
        <td>${escapeHtml(p.model || "")}</td>
        <td>${escapeHtml(p.category || "")}</td>
        <td>${
          typeof p.price === "number"
            ? p.price.toLocaleString("vi-VN") + " ₫"
            : ""
        }</td>
        <td>${p.quantity ?? ""}</td>
        <td>${
          p.createdAt ? new Date(p.createdAt).toLocaleDateString("vi-VN") : ""
        }</td>
        <td><span class="badge ${
          p.status === "Còn hàng" ? "bg-success" : "bg-secondary"
        }">${escapeHtml(p.status || "")}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-info me-1 edit-btn" title="Chỉnh sửa"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger delete-btn" title="Xóa"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`
    )
    .join("");
}

// ====== Phân trang ======
function updatePagination(page, totalPages, totalItems) {
  document.getElementById(
    "pageInfo"
  ).textContent = `Trang ${page}/${totalPages}`;
  document.getElementById("totalItems").textContent = totalItems;
  document.getElementById("prev").disabled = page <= 1;
  document.getElementById("next").disabled = page >= totalPages;
  currentPage = page;
}

// escape HTML simple helper
function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ====== Bộ lọc tự động ======

// Tìm kiếm theo tên (q)
filters.q.addEventListener("input", () => {
  clearTimeout(filters.q.timer);

  filters.q.timer = setTimeout(() => {
    filters.q.value = filters.q.value.trim().toLowerCase(); // chuẩn hóa input
    fetchProducts(1);
  }, 400);
});

// Các filter: vehicle, model, category, status
["vehicle", "model", "category", "status"].forEach((id) => {
  document.getElementById(id).addEventListener("change", () => {
    fetchProducts(1);
  });
});

// Nút Reset
document.getElementById("btnReset").addEventListener("click", () => {
  Object.values(filters).forEach((el) => {
    el.value = "";
  });

  modelSelect.innerHTML = `<option value="">Tất cả</option>`;

  fetchProducts(1);
});

// ====== Modal CRUD ======
const modal = new bootstrap.Modal(document.getElementById("productModal"));
const modalTitle = document.getElementById("modalTitle");
const form = document.getElementById("productForm");
const idField = document.getElementById("productId");
const modalError = document.getElementById("modalError");

const fields = {
  name: document.getElementById("name"),
  vehicle: document.getElementById("vehicleField"),
  model: document.getElementById("modelField"),
  category: document.getElementById("categoryField"),
  price: document.getElementById("priceField"),
  quantity: document.getElementById("quantityField"),
  description: document.getElementById("descriptionField"),
  image: document.getElementById("imageField"),
};

// === Thêm mới ===
document.getElementById("btnAdd").addEventListener("click", () => {
  form.reset();
  idField.value = "";
  modalTitle.textContent = "Thêm sản phẩm mới";
  fields.price.value = 100000;
  fields.quantity.value = 10;
  fields.description.value = "Sản phẩm chất lượng, chính hãng.";
  fields.image.value = "https://picsum.photos/seed/new/400/300";
  modalError.style.display = "none";
  modal.show();
});

// === Lưu (Thêm hoặc Sửa) ===
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  modalError.style.display = "none";

  const data = Object.fromEntries(
    Object.entries(fields).map(([k, v]) => [k, v.value.trim()])
  );
  data.price = Number(data.price);
  data.quantity = Number(data.quantity);

  if (!data.name || !data.vehicle || !data.category || !data.price) {
    modalError.textContent = "⚠️ Vui lòng nhập đầy đủ thông tin bắt buộc.";
    modalError.style.display = "block";
    return;
  }

  const method = idField.value ? "PUT" : "POST";
  const url = idField.value ? `${PRODUCTS_API}/${idField.value}` : PRODUCTS_API;

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();

    if (res.ok) {
      modal.hide();
      showToast(result.message || "Lưu thành công", "success");
      fetchProducts(currentPage);
    } else {
      modalError.textContent = result.error || "Không thể lưu sản phẩm.";
      modalError.style.display = "block";
    }
  } catch {
    modalError.textContent = "❌ Lỗi máy chủ hoặc kết nối.";
    modalError.style.display = "block";
  }
});

// === Chỉnh sửa / Xóa ===
document.getElementById("tableBody").addEventListener("click", async (e) => {
  const btnEdit = e.target.closest(".edit-btn");
  const btnDelete = e.target.closest(".delete-btn");
  const row = e.target.closest("tr");
  if (!row) return;
  const id = row.dataset.id;

  if (btnEdit) {
    try {
      const res = await fetch(`${PRODUCTS_API}/${id}`);
      const p = await res.json();

      if (!res.ok || !p._id)
        return showToast("❌ Không tìm thấy sản phẩm.", "danger");

      idField.value = p._id;

      // Điền tất cả field (trừ category)
      for (let k in fields) {
        if (k !== "category") fields[k].value = p[k] || "";
      }

      // --- HIỂN THỊ CATEGORY ---
      const cateSelect = document.getElementById("categoryField");
      for (let opt of cateSelect.options) {
        if (opt.textContent.trim() === p.category.trim()) {
          cateSelect.value = opt.textContent;
          break;
        }
      }

      modalTitle.textContent = "Chỉnh sửa sản phẩm";
      modalError.style.display = "none";
      modal.show();
    } catch {
      showToast("❌ Lỗi khi tải sản phẩm.", "danger");
    }
  }

  // --- XÓA 1 ---
  if (btnDelete) {
    const productName =
      row.querySelector("strong")?.innerText || "sản phẩm này";
    Swal.fire({
      title: "Bạn có chắc muốn xóa?",
      html: `<b>${escapeHtml(productName)}</b> sẽ bị xóa khỏi hệ thống.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "🗑️ Xóa",
      cancelButtonText: "Hủy",
      showClass: { popup: "animate__animated animate__fadeInDown" },
      hideClass: { popup: "animate__animated animate__fadeOutUp" },
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`${PRODUCTS_API}/${id}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (res.ok) {
            showToast(`🗑️ ${data.message || "Đã xóa sản phẩm."}`, "warning");
            fetchProducts(currentPage);
          } else {
            showToast(
              `❌ ${data.error || "Không thể xóa sản phẩm."}`,
              "danger"
            );
          }
        } catch {
          showToast("❌ Lỗi kết nối máy chủ.", "danger");
        }
      }
    });
  }
});

// === XOÁ NHIỀU ===
document
  .getElementById("btnDeleteSelected")
  .addEventListener("click", async () => {
    const ids = [...document.querySelectorAll(".select-item:checked")].map(
      (cb) => cb.closest("tr").dataset.id
    );

    if (ids.length === 0) {
      Swal.fire({
        icon: "info",
        title: "⚠️ Chưa chọn sản phẩm nào",
        text: "Hãy chọn ít nhất một sản phẩm để xóa.",
      });
      return;
    }

    Swal.fire({
      title: `Xóa ${ids.length} sản phẩm?`,
      text: "Hành động này không thể hoàn tác!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "🗑️ Xóa tất cả",
      cancelButtonText: "Hủy",
      showClass: { popup: "animate__animated animate__fadeInDown" },
      hideClass: { popup: "animate__animated animate__fadeOutUp" },
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`${PRODUCTS_API}/delete-multiple`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
          });
          const data = await res.json();
          if (res.ok) {
            showToast(`🗑️ ${data.message || "Đã xóa sản phẩm."}`, "warning");
            fetchProducts(currentPage);
          } else {
            showToast(
              `❌ ${data.error || "Không thể xóa sản phẩm."}`,
              "danger"
            );
          }
        } catch {
          showToast("❌ Lỗi khi xóa nhiều sản phẩm.", "danger");
        }
      }
    });
  });

// === CHỌN TẤT CẢ ===
document.getElementById("selectAll").addEventListener("change", (e) => {
  document
    .querySelectorAll(".select-item")
    .forEach((cb) => (cb.checked = e.target.checked));
});

// === PHÂN TRANG ===
document.getElementById("prev").addEventListener("click", () => {
  if (currentPage > 1) fetchProducts(currentPage - 1);
});
document
  .getElementById("next")
  .addEventListener("click", () => fetchProducts(currentPage + 1));

// === KHỞI ĐỘNG ===
fetchProducts(1);

(function mobileSidebarToggle() {
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const btn = document.getElementById("btnToggleSidebar");
  if (!sidebar || !btn || !overlay) return;

  const open = () => {
    sidebar.classList.add("open");
    overlay.classList.add("show");
    document.body.style.overflow = "hidden"; // khóa scroll nền
  };
  const close = () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
    document.body.style.overflow = "";
  };

  btn.addEventListener("click", () => {
    sidebar.classList.contains("open") ? close() : open();
  });
  overlay.addEventListener("click", close);

  // Đóng khi click 1 mục menu
  sidebar.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      if (window.innerWidth < 992) close();
    });
  });

  // Đóng bằng phím ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sidebar.classList.contains("open")) close();
  });
})();
