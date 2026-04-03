const API_BASE = "https://motorparts-api.onrender.com/api";
let currentPage = 1;
let totalPages = 1;
let typingTimer;

// ======= HIỂN THỊ TOAST (duy nhất) =======
function showToast(msg, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return alert(msg);
  const el = document.createElement("div");
  el.className = `toast text-white ${
    type === "success"
      ? "bg-success"
      : type === "warning"
        ? "bg-warning text-dark"
        : type === "danger"
          ? "bg-danger"
          : "bg-primary"
  } animate__animated animate__fadeInDown`;
  el.innerHTML = `<div class="toast-body fw-semibold">${msg}</div>`;
  container.appendChild(el);
  const toast = new bootstrap.Toast(el, { delay: 3000 });
  toast.show();
  el.addEventListener("hidden.bs.toast", () => el.remove());
}

// ======= LOAD PRODUCTS (tìm kiếm, phân trang, lọc) =======
async function loadProducts() {
  try {
    const qEl = document.getElementById("searchInput");
    const vehicleEl = document.getElementById("filterVehicle");
    const categoryEl = document.getElementById("filterCategory");
    const statusEl = document.getElementById("filterStatus");

    const q = qEl ? qEl.value.trim() : "";
    const vehicle = vehicleEl ? vehicleEl.value : "";
    const category = categoryEl ? categoryEl.value : "";
    const status = statusEl ? statusEl.value : "";

    const params = new URLSearchParams();
    params.append("page", currentPage);
    params.append("limit", 6);
    if (q) params.append("q", q);
    if (vehicle) params.append("vehicle", vehicle);
    if (category) params.append("category", category);
    if (status) params.append("status", status);

    const res = await fetch(`${API_BASE}/products?${params.toString()}`);
    if (!res.ok) throw new Error("Không thể kết nối API");
    const result = await res.json();

    const products = result.data || [];
    totalPages = result.totalPages || 1;
    const pageInfoEl = document.getElementById("pageInfo");
    if (pageInfoEl)
      pageInfoEl.textContent = `Trang ${currentPage} / ${totalPages}`;

    const productList = document.getElementById("productList");
    if (!productList) return;
    productList.innerHTML = "";
    if (!products.length) {
      productList.innerHTML = `<div class="text-center text-muted py-3">Không có sản phẩm</div>`;
      return;
    }

    products.forEach((p) => {
      const item = document.createElement("div");
      item.className =
        "list-group-item d-flex justify-content-between align-items-center";

      // Xác định màu thanh tồn kho theo mức số lượng
      let progressColor = "bg-success";
      const qty = Number(p.quantity || 0);
      if (qty <= 0) progressColor = "bg-danger";
      else if (qty <= 5) progressColor = "bg-danger";
      else if (qty <= 20) progressColor = "bg-warning";
      else progressColor = "bg-success";

      // Tính phần trăm hiển thị (giới hạn tối đa 100)
      const maxStock = 100;
      const percent = Math.min((qty / maxStock) * 100, 100);

      item.innerHTML = `
    <div class="d-flex align-items-center w-75">
      <img src="${p.image || "https://via.placeholder.com/70"}"
           class="me-3 rounded" style="width: 70px; height: 70px; object-fit: cover;">
      <div>
        <div class="fw-semibold">${escapeHtml(p.name || "")}</div>
        <small class="text-muted d-block">${escapeHtml(
          p.vehicle || "",
        )} • ${escapeHtml(p.category || "")}</small>
        <small class="text-muted d-block">
          📦 Tồn kho: 
          <span class="fw-semibold ${
            qty <= 0 ? "text-danger" : "text-success"
          }">${qty}</span> sản phẩm
        </small>
        <div class="progress mt-1" style="height: 6px; width: 160px;">
          <div class="progress-bar ${progressColor}" role="progressbar" style="width: ${percent}%;"></div>
        </div>
        <span class="badge ${
          p.status === "Hết hàng" ? "bg-danger" : "bg-success"
        } mt-1">${escapeHtml(p.status || "")}</span>
      </div>
    </div>
    <div class="text-end">
      <div class="fw-bold text-primary">${Number(p.price || 0).toLocaleString(
        "vi-VN",
      )} ₫</div>
      <button class="btn btn-sm btn-outline-primary mt-2" ${
        p.status === "Hết hàng" || qty <= 0 ? "disabled" : ""
      }>
        <i class="bi bi-cart-plus"></i>
      </button>
    </div>
  `;

      const btn = item.querySelector("button");
      if (btn) btn.onclick = () => addToCart(p._id || p.id);
      productList.appendChild(item);
    });
  } catch (err) {
    console.error(err);
    showToast("❌ Không thể tải danh sách sản phẩm!", "warning");
  }
}

// ======= TÌM KIẾM REALTIME =======
const searchInput = document.getElementById("searchInput");
if (searchInput) {
  searchInput.addEventListener("input", () => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      currentPage = 1;
      loadProducts();
    }, 500);
  });
}

// ======= NÚT XOÁ TÌM KIẾM =======
document.getElementById("btnClearFilters")?.addEventListener("click", () => {
  if (searchInput) searchInput.value = "";
  document.getElementById("filterVehicle") &&
    (document.getElementById("filterVehicle").value = "");
  document.getElementById("filterCategory") &&
    (document.getElementById("filterCategory").value = "");
  document.getElementById("filterStatus") &&
    (document.getElementById("filterStatus").value = "");
  currentPage = 1;
  loadProducts();
});

// ======= PHÂN TRANG =======
document.getElementById("prevPage")?.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    loadProducts();
  }
});
document.getElementById("nextPage")?.addEventListener("click", () => {
  if (currentPage < totalPages) {
    currentPage++;
    loadProducts();
  }
});

// ======= LỌC =======
document
  .querySelectorAll("#filterVehicle, #filterCategory, #filterStatus")
  .forEach((el) =>
    el.addEventListener("change", () => {
      currentPage = 1;
      loadProducts();
    }),
  );

// ======= GIỎ HÀNG =======
async function addToCart(productId) {
  try {
    const res = await fetch(`${API_BASE}/cart/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast("✅ Đã thêm vào giỏ hàng!", "success");
      // server có thể trả cart ở data.cart hoặc data, cố gắng lấy hợp lý
      const cart = data.cart || data;
      renderCart(cart.items || [], cart.totalAmount || cart.total || 0);
    } else {
      showToast(data.error || "⚠️ Không thể thêm vào giỏ!", "warning");
    }
  } catch (err) {
    console.error(err);
    showToast("❌ Lỗi khi thêm giỏ hàng!", "warning");
  }
}

async function loadCart() {
  try {
    const res = await fetch(`${API_BASE}/cart`);
    if (!res.ok) throw new Error("Cannot load cart");
    const cart = await res.json();
    // cart may be { items: [], totalAmount } or {cart: {...}}
    const c = cart.cart || cart;
    renderCart(c.items || [], c.totalAmount || c.total || 0);
  } catch (err) {
    console.error(err);
  }
}

async function updateQty(productId, newQty) {
  try {
    if (newQty <= 0) return removeFromCart(productId);
    const res = await fetch(`${API_BASE}/cart/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: newQty }),
    });
    const data = await res.json();
    if (res.ok) {
      const cart = data.cart || data;
      renderCart(cart.items || [], cart.totalAmount || cart.total || 0);
    }
  } catch (err) {
    console.error(err);
    showToast("❌ Lỗi khi cập nhật số lượng!", "warning");
  }
}

async function removeFromCart(productId) {
  try {
    const res = await fetch(`${API_BASE}/cart/remove`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const data = await res.json();
    if (res.ok) {
      const cart = data.cart || data;
      renderCart(cart.items || [], cart.totalAmount || cart.total || 0);
    }
  } catch (err) {
    console.error(err);
    showToast("❌ Lỗi khi xóa sản phẩm!", "warning");
  }
}

async function clearCart() {
  try {
    const res = await fetch(`${API_BASE}/cart`);
    if (!res.ok) throw new Error("Cannot fetch cart");
    const cart = await res.json();
    const c = cart.cart || cart;
    if (!c.items?.length) return;
    for (const item of c.items) await removeFromCart(item.productId);
    showToast("🗑️ Đã xóa toàn bộ giỏ hàng", "warning");
  } catch (err) {
    console.error(err);
  }
}
document.getElementById("btnClearCart") &&
  (document.getElementById("btnClearCart").onclick = clearCart);

// ======= HIỂN THỊ GIỎ HÀNG =======
function renderCart(items, total) {
  const list = document.getElementById("cartList");
  const totalEl = document.getElementById("totalAmount");
  const badge = document.getElementById("cartCountBadge");
  const laborInput = document.getElementById("laborCost");

  if (!list) return;
  list.innerHTML = "";
  badge && (badge.textContent = items.length || 0);

  if (!items.length) {
    list.innerHTML = `<li class="list-group-item text-center text-muted">Chưa có sản phẩm</li>`;
    if (totalEl) totalEl.textContent = "0 ₫";
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className =
      "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `
      <div class="d-flex align-items-center">
        <img src="${item.image || "https://via.placeholder.com/60"}"
             class="me-3 rounded" style="width: 60px; height: 60px; object-fit: cover;">
        <div>
          <div class="fw-semibold">${escapeHtml(item.name || "")}</div>
          <small class="text-muted">${Number(item.price || 0).toLocaleString(
            "vi-VN",
          )} ₫</small>
        </div>
      </div>
      <div class="text-end">
        <div class="btn-group btn-group-sm mb-1">
          <button class="btn btn-outline-secondary" onclick="updateQty('${
            item.productId
          }', ${item.quantity - 1})">-</button>
          <button class="btn btn-light disabled">${item.quantity}</button>
          <button class="btn btn-outline-secondary" onclick="updateQty('${
            item.productId
          }', ${item.quantity + 1})">+</button>
        </div>
        <div class="fw-bold text-success">${(
          item.price * item.quantity
        ).toLocaleString("vi-VN")} ₫</div>
      </div>`;
    list.appendChild(li);
  });

  // ===== LẤY TIỀN CÔNG =====
  let laborCost = 0;
  if (laborInput) {
    laborCost = parseInt(laborInput.value.replace(/\./g, "")) || 0;
  }

  // ===== CỘNG TIỀN CÔNG VÀO TỔNG =====
  const finalTotal = Number(total || 0) + laborCost;

  if (totalEl) totalEl.textContent = finalTotal.toLocaleString("vi-VN") + " ₫";
}

// ======= THANH TOÁN (TẠM THỜI - chỉ hiển thị hóa đơn, chưa trừ hàng) =======
document.getElementById("btnCheckout")?.addEventListener("click", async () => {
  try {
    const res = await fetch(`${API_BASE}/cart`);
    if (!res.ok) throw new Error("Cannot load cart");
    const cart = await res.json();
    const c = cart.cart || cart;

    if (!c.items || !c.items.length) {
      showToast("🛒 Giỏ hàng đang trống!", "warning");
      return;
    }

    // ===== LẤY TIỀN CÔNG =====
    const laborInput = document.getElementById("laborCost");
    let laborCost = 0;

    if (laborInput) {
      laborCost = parseInt(laborInput.value.replace(/\./g, "")) || 0;
    }

    // ===== CỘNG VÀO TỔNG TIỀN =====
    const total = c.totalAmount || c.total || 0;
    const finalTotal = total + laborCost;

    const order = {
      id: "ORD-" + Date.now(),
      customerInfo: {
        name: "Khách hàng",
        phone: "0385188318",
        address: "TDP 4D, Đạ Tẻh, Lâm Đồng",
      },
      items: c.items,
      totalAmount: finalTotal, // <===== ĐÃ CỘNG TIỀN CÔNG
      laborCost: laborCost, // <===== NẾU MUỐN HIỂN THỊ TRONG HÓA ĐƠN
      createdAt: new Date(),
    };

    renderInvoice(order);
  } catch (error) {
    console.error(error);
    showToast("❌ Lỗi khi tạo hóa đơn tạm!", "warning");
  }
});

// ======= HÓA ĐƠN POPUP (RENDER) =======
function renderInvoice(order) {
  const content = document.getElementById("invoiceContent");
  if (!content) return;

  const bankCode = "ICB";
  const accountNumber = "0385188318";
  const accountName = "Nguyễn Đình Nhật Hoàng";
  const amount = order.totalAmount || 0;
  const note = `Cảm ơn quý khách - Thanh toán đơn hàng ${order.id}`;

  // QR Thanh toán
  const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    note,
  )}&accountName=${encodeURIComponent(accountName)}`;

  // Render danh sách sản phẩm
  const itemsHTML = order.items
    .map(
      (i, idx) => `
      <tr>
        <td class="col-index bordered">${idx + 1}</td>
<td class="col-name td-left bordered">${escapeHtml(i.name)}</td>
        <td class="col-qty bordered">${i.quantity}</td>
        <td class="col-price bordered">${Number(i.price).toLocaleString(
          "vi-VN",
        )}</td>
        <td class="col-total bordered">${(i.quantity * i.price).toLocaleString(
          "vi-VN",
        )}</td>
      </tr>`,
    )
    .join("");

  // Tổng tiền hàng
  const productTotal = order.items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0,
  );

  // Tiền công
  const laborCost = order.laborCost || 0;

  // Tổng cộng cuối cùng
  const finalTotal = amount;

  content.innerHTML = `
    <div style="font-family: Arial, sans-serif; color: #000; line-height:1.4; font-size:13px;">
      <div style="text-align:center; margin-bottom:12px;">
        <h3 style="margin:0; font-weight:700; text-transform:uppercase;">KHO PHỤ TÙNG ĐÌNH HÓA</h3>
        <div style="font-size:12px; margin-top:3px;">Địa chỉ: TDP 4D, Huyện Đạ Tẻh, Tỉnh Lâm Đồng</div>
        <hr style="border:none; border-top:2px solid #000; margin:10px 0;">
      </div>

  <div class="info-wrap">
  <div class="left-info">
    <p><b>Mã HĐ:</b> ${order.id}</p>
  </div>

  <div class="right-info">
    <p><b>Thời gian: ${new Date(order.createdAt).toLocaleDateString("vi-VN")} - 
      ${new Date(order.createdAt).toLocaleTimeString("vi-VN")}</b></p>
  </div>
</div>
      </div>

  <table class="invoice-table">
  <thead>
    <tr>
      <th class="col-index bordered">#</th>
<th class="col-name th-center bordered">Tên SP</th>
      <th class="col-qty bordered">SL</th>
      <th class="col-price bordered">Đơn giá</th>
      <th class="col-total bordered">Thành tiền</th>
    </tr>
  </thead>

  <tbody>
    ${itemsHTML}
  </tbody>
</table>

      <div style="margin-top:15px; font-size:13px;">
        <div style="display:flex; justify-content:space-between;">
          <span><b>Tổng tiền hàng:</b></span>
          <span>${productTotal.toLocaleString("vi-VN")} ₫</span>
        </div>

        <div style="display:flex; justify-content:space-between; margin-top:5px;">
          <span><b>Tiền công sửa chữa:</b></span>
          <span>${laborCost.toLocaleString("vi-VN")} ₫</span>
        </div>

        <hr style="margin:10px 0;">

        <div style="display:flex; justify-content:space-between; font-size:15px; font-weight:700;">
          <span>TỔNG CỘNG:</span>
          <span>${finalTotal.toLocaleString("vi-VN")} ₫</span>
        </div>
      </div>

      <div style="text-align:center; margin-top:20px;">
        <img src="${qrUrl}" alt="QR Thanh toán" 
             style="width:200px; height:200px; object-fit:contain; border:1px solid #000; padding:5px; border-radius:6px;">
      </div>

      <hr style="border:none; border-top:1px solid #000; margin:20px 0 10px;">
    </div>
  `;

  new bootstrap.Modal(document.getElementById("invoiceModal")).show();
}

// ======= IN HÓA ĐƠN (XÁC NHẬN THANH TOÁN) =======
document
  .getElementById("btnPrintInvoice")
  ?.addEventListener("click", async () => {
    try {
      const res = await fetch(`${API_BASE}/cart/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerInfo: {
            name: "Khách lẻ",
            phone: "0385188318",
            address: "TDP 4D, Đạ Tẻh, Lâm Đồng",
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "⚠️ Không thể thanh toán!", "warning");
        return;
      }

      const invoiceHTML =
        document.getElementById("invoiceContent")?.innerHTML || "";
      const printWin = window.open("", "_blank", "width=900,height=700");

      printWin.document.write(`
  <html>
    <head>
      <title>In hóa đơn</title>

<style>
  @page {
    size: 80mm auto;
    margin: 0;
  }

  body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
    width: 268px;
    max-width: 268px;
    overflow: hidden;
  }

  .invoice-box {
    padding: 8px 6px;
    width: 100%;
  }

  .header {
    text-align: center;
    margin-bottom: 10px;
  }

  .shop-name {
    font-size: 17px;
    font-weight: bold;
    text-transform: uppercase;
  }

  .sub-info {
    font-size: 11px;
    margin-top: 3px;
  }

  .info-line,
  .dual-line {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    margin-top: 6px;
  }

  .line {
    border-top: 1px dashed #000;
    margin: 8px 0;
  }

  /* =============================
      BẢNG SẢN PHẨM RÕ NÉT
  ============================== */
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 12px;
    border: 1px solid #000; /* khung ngoài nét liền */
  }

  thead th {
      text-align: center;       /* Canh giữa */
    padding: 3px 0;
    text-align: left;
    border: 1px solid #000;      /* tất cả ô đều nét liền */
  }

  tbody td {
        text-align: center;       /* Canh giữa */

    padding: 3px 2px;
    vertical-align: top;
    border: 1px solid #000;      /* tất cả ô đều nét liền */
    word-wrap: break-word;
  }

  thead th:last-child,
  tbody td:last-child {
    border-right: none;
  }

  /* TỶ LỆ CỘT */
  .col-index { width: 20px; text-align: center; }
  .col-name { width: 100px; text-align: left !important; }
  .col-qty { width: 20px; text-align: center; }
  .col-price { width: 60px; text-align: center; }
  .col-total { width: 60px; text-align: center; }

  /* =============================
        TỔNG TIỀN
  ============================== */
  .sum-box {
    margin-top: 10px;
    font-size: 13px;
  }

  .sum-line {
    display: flex;
    justify-content: space-between;
    margin-top: 5px;
    font-weight: bold;
  }

  /* QR */
  .qr-wrap {
    text-align: center;
    margin-top: 10px;
  }

  .qr-wrap img {
    width: 150px;
  }

  .thank {
    text-align: center;
    margin-top: 12px;
    font-size: 11px;
    font-style: italic;
  }
    // odor
.info-wrap {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  font-size: 12px;
}

.left-info {
  width: 45%;
  text-align: left;
  white-space: nowrap;
}

.right-info {
  width: 55%;
  text-align: right;
  white-space: nowrap;  /* Không cho xuống dòng */
}

.info-wrap p {
  margin: 2px 0;
}
</style>

    </head>
    <body>

      ${invoiceHTML}

      <div class="thank">Cảm ơn quý khách và hẹn gặp lại! ❤️</div>

      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
            window.close();
          }, 400);
        };
      </script>

    </body>
  </html>
`);

      printWin.document.close();

      setTimeout(() => {
        showToast("✅ Thanh toán thành công!", "success");
        loadCart();
        loadProducts();
      }, 800);
    } catch (err) {
      console.error(err);
      showToast("❌ Lỗi khi in hóa đơn!", "warning");
    }
  });

// ======= TẢI PDF (JSREPORT) =======
document
  .getElementById("btnDownloadPDF")
  ?.addEventListener("click", async () => {
    // chờ thư viện jsPDF/html2canvas load (polling)
    const waitForLibs = () =>
      new Promise((resolve, reject) => {
        const start = Date.now();
        (function poll() {
          if (window.jspdf && window.html2canvas) return resolve();
          if (Date.now() - start > 8000)
            return reject(new Error("Timeout loading libs"));
          setTimeout(poll, 200);
        })();
      });

    try {
      await waitForLibs();
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF("p", "pt", "a4");
      const invoice = document.getElementById("invoiceContent");
      if (!invoice)
        return showToast("Không tìm thấy nội dung hóa đơn", "warning");

      // clone để in (bỏ nút, force black text)
      const clone = invoice.cloneNode(true);
      clone.querySelectorAll("button").forEach((b) => b.remove());
      clone.querySelectorAll("*").forEach((el) => {
        el.style.color = "#000";
        el.style.background = "none";
        el.style.fontFamily = "Arial, sans-serif";
      });

      await doc.html(clone, {
        callback: (pdf) =>
          pdf.save(`HoaDon_${new Date().toISOString().slice(0, 10)}.pdf`),
        x: 20,
        y: 20,
        html2canvas: { scale: 0.9, useCORS: true },
      });
    } catch (err) {
      console.error(err);
      showToast("❌ Không thể tạo PDF (libs chưa tải).", "warning");
    }
  });

// ======= THƯ VIỆN PDF =======
const script = document.createElement("script");
script.src =
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
document.head.appendChild(script);

// ======= THƯ VIỆN HTML2CANVAS =======
const html2canvasScript = document.createElement("script");
html2canvasScript.src =
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
document.head.appendChild(html2canvasScript);

// ======= KHỞI CHẠY =======
loadProducts();
loadCart();

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

// ======= HỖ TRỢ: escapeHtml =======
function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ====== FORMAT SỐ TIỀN ======
function formatMoney(num) {
  return Number(num).toLocaleString("vi-VN");
}

// Khi nhập vào input → tự format theo tiền Việt Nam
document.getElementById("laborCost").addEventListener("input", function () {
  let value = this.value.replace(/\D/g, ""); // chỉ giữ số
  if (value === "") value = "0";
  this.value = formatMoney(value);
});

// ====== NÚT +10 (tăng 10.000đ mỗi lần) ======
document.getElementById("btnIncrease").addEventListener("click", function () {
  const input = document.getElementById("laborCost");

  // Lấy giá trị hiện tại và bỏ dấu chấm
  let current = input.value.replace(/\D/g, "");

  // Cộng 10.000
  current = Number(current) + 10000;

  // Gán lại với format đẹp
  input.value = formatMoney(current);
});
