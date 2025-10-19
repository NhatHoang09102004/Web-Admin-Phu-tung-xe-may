const API_BASE = "http://localhost:3000/api";
let currentPage = 1;
let totalPages = 1;
let typingTimer;

// ======= LOAD PRODUCTS (tìm kiếm, phân trang, lọc) =======
async function loadProducts() {
  try {
    const q = document.getElementById("searchInput").value.trim();
    const vehicle = document.getElementById("filterVehicle").value;
    const category = document.getElementById("filterCategory").value;
    const status = document.getElementById("filterStatus").value;

    const params = new URLSearchParams({
      page: currentPage,
      limit: 6,
      q,
      vehicle,
      category,
      status,
    });

    const res = await fetch(`${API_BASE}/products?${params}`);
    if (!res.ok) throw new Error("Không thể kết nối API");
    const result = await res.json();

    const products = result.data || [];
    totalPages = result.totalPages || 1;
    document.getElementById(
      "pageInfo"
    ).textContent = `Trang ${currentPage} / ${totalPages}`;

    const productList = document.getElementById("productList");
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
      if (p.quantity <= 5) progressColor = "bg-danger";
      else if (p.quantity <= 20) progressColor = "bg-warning";

      // Tính phần trăm hiển thị (giới hạn tối đa 100)
      const maxStock = 100;
      const percent = Math.min((p.quantity / maxStock) * 100, 100);

      item.innerHTML = `
    <div class="d-flex align-items-center w-75">
      <img src="${p.image || "https://via.placeholder.com/70"}"
           class="me-3 rounded" style="width: 70px; height: 70px; object-fit: cover;">
      <div>
        <div class="fw-semibold">${p.name}</div>
        <small class="text-muted d-block">${p.vehicle} • ${p.category}</small>
        <small class="text-muted d-block">
          📦 Tồn kho: 
          <span class="fw-semibold ${
            p.quantity <= 0 ? "text-danger" : "text-success"
          }">${p.quantity}</span> sản phẩm
        </small>
        <div class="progress mt-1" style="height: 6px; width: 160px;">
          <div class="progress-bar ${progressColor}" 
               role="progressbar" style="width: ${percent}%;"></div>
        </div>
        <span class="badge ${
          p.status === "Hết hàng" ? "bg-danger" : "bg-success"
        } mt-1">${p.status}</span>
      </div>
    </div>
    <div class="text-end">
      <div class="fw-bold text-primary">${Number(p.price).toLocaleString(
        "vi-VN"
      )} ₫</div>
      <button class="btn btn-sm btn-outline-primary mt-2" ${
        p.status === "Hết hàng" || p.quantity <= 0 ? "disabled" : ""
      }>
        <i class="bi bi-cart-plus"></i>
      </button>
    </div>
  `;

      item.querySelector("button").onclick = () => addToCart(p._id);
      productList.appendChild(item);
    });
  } catch (err) {
    console.error(err);
    showToast("❌ Không thể tải danh sách sản phẩm!", "warning");
  }
}

// ======= TÌM KIẾM REALTIME =======
document.getElementById("searchInput").addEventListener("input", () => {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    currentPage = 1;
    loadProducts();
  }, 500);
});

// ======= NÚT XOÁ TÌM KIẾM =======
document.getElementById("btnClearFilters").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  document.getElementById("filterVehicle").value = "";
  document.getElementById("filterCategory").value = "";
  document.getElementById("filterStatus").value = "";
  currentPage = 1;
  loadProducts();
});

// ======= PHÂN TRANG =======
document.getElementById("prevPage").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    loadProducts();
  }
});
document.getElementById("nextPage").addEventListener("click", () => {
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
    })
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
      renderCart(data.cart.items, data.cart.totalAmount);
    } else {
      showToast(data.error || "⚠️ Không thể thêm vào giỏ!", "warning");
    }
  } catch {
    showToast("❌ Lỗi khi thêm giỏ hàng!", "warning");
  }
}

async function loadCart() {
  try {
    const res = await fetch(`${API_BASE}/cart`);
    const cart = await res.json();
    renderCart(cart.items || [], cart.totalAmount || 0);
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
    if (res.ok) renderCart(data.cart.items, data.cart.totalAmount);
  } catch {
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
    if (res.ok) renderCart(data.cart.items, data.cart.totalAmount);
  } catch {
    showToast("❌ Lỗi khi xóa sản phẩm!", "warning");
  }
}

async function clearCart() {
  try {
    const res = await fetch(`${API_BASE}/cart`);
    const cart = await res.json();
    if (!cart.items?.length) return;
    for (const item of cart.items) await removeFromCart(item.productId);
    showToast("🗑️ Đã xóa toàn bộ giỏ hàng", "warning");
  } catch (err) {
    console.error(err);
  }
}
document.getElementById("btnClearCart").onclick = clearCart;

// ======= HIỂN THỊ GIỎ HÀNG =======
function renderCart(items, total) {
  const list = document.getElementById("cartList");
  const totalEl = document.getElementById("totalAmount");
  const badge = document.getElementById("cartCountBadge");
  list.innerHTML = "";
  badge.textContent = items.length;

  if (!items.length) {
    list.innerHTML = `<li class="list-group-item text-center text-muted">Chưa có sản phẩm</li>`;
    totalEl.textContent = "0 ₫";
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
          <div class="fw-semibold">${item.name}</div>
          <small class="text-muted">${item.price.toLocaleString(
            "vi-VN"
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
  totalEl.textContent = Number(total).toLocaleString("vi-VN") + " ₫";
}

// ======= THANH TOÁN (TẠM THỜI - chỉ hiển thị hóa đơn, chưa trừ hàng) =======
document.getElementById("btnCheckout").addEventListener("click", async () => {
  try {
    const res = await fetch(`${API_BASE}/cart`);
    const cart = await res.json();
    if (!cart.items || !cart.items.length) {
      showToast("🛒 Giỏ hàng đang trống!", "warning");
      return;
    }

    // 🧾 Tạo hóa đơn tạm (chưa xác nhận thanh toán)
    const order = {
      id: "ORD-" + Date.now(),
      customerInfo: {
        name: "Khách lẻ",
        phone: "0385188318",
        address: "TDP 4D, Đạ Tẻh, Lâm Đồng",
      },
      items: cart.items,
      totalAmount: cart.totalAmount,
      createdAt: new Date(),
    };

    // Hiển thị modal hóa đơn (xem trước)
    renderInvoice(order);
  } catch (error) {
    console.error(error);
    showToast("❌ Lỗi khi tạo hóa đơn tạm!", "warning");
  }
});

// ======= HÓA ĐƠN POPUP =======
function renderInvoice(order) {
  const content = document.getElementById("invoiceContent");

  // ✅ Thông tin thanh toán VietinBank
  const bankCode = "ICB";
  const accountNumber = "0385188318";
  const accountName = "Nguyễn Đình Nhật Hoàng";
  const amount = order.totalAmount;
  const note = `Cảm ơn quý khách - Thanh toán đơn hàng ${order.id}`;

  // ✅ QR thanh toán VietQR thật
  const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    note
  )}&accountName=${encodeURIComponent(accountName)}`;

  const itemsHTML = order.items
    .map(
      (i, idx) => `
      <tr>
        <td class="text-center" style="padding:6px;">${idx + 1}</td>
        <td style="padding:6px;">${i.name}</td>
        <td class="text-center" style="padding:6px;">${i.quantity}</td>
        <td class="text-end" style="padding:6px;">${i.price.toLocaleString(
          "vi-VN"
        )} ₫</td>
        <td class="text-end" style="padding:6px;">${(
          i.quantity * i.price
        ).toLocaleString("vi-VN")} ₫</td>
      </tr>`
    )
    .join("");

  // ✅ Giao diện thuận mắt, cân đối, in đẹp
  content.innerHTML = `
    <div style="
      font-family: Arial, sans-serif;
      color: #000;
      line-height: 1.4;
      font-size: 13px;
    ">

      <!-- Header -->
      <div style="text-align:center; margin-bottom:12px;">
        <h3 style="margin:0; font-weight:700; text-transform:uppercase;">KHO PHỤ TÙNG ĐÌNH HÓA</h3>
        <div style="font-size:12px; margin-top:3px;">
          Địa chỉ: TDP 4D, Huyện Đạ Tẻh, Tỉnh Lâm Đồng
        </div>
        <hr style="border:none; border-top:2px solid #000; margin:10px 0;">
      </div>

      <!-- Thông tin hóa đơn -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
        <div>
          <p style="margin:2px 0;"><b>Mã hóa đơn:</b> ${order.id}</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:2px 0;"><b>Ngày lập:</b> ${new Date(
            order.createdAt
          ).toLocaleDateString("vi-VN")}</p>
          <p style="margin:2px 0;"><b>Giờ:</b> ${new Date(
            order.createdAt
          ).toLocaleTimeString("vi-VN")}</p>
        </div>
      </div>

      <!-- Bảng sản phẩm -->
      <table style="width:100%; border-collapse:collapse; margin-top:5px;">
        <thead>
          <tr style="background:#f3f3f3; text-align:center;">
            <th style="border:1px solid #000; padding:6px;">#</th>
            <th style="border:1px solid #000; padding:6px;">Tên sản phẩm</th>
            <th style="border:1px solid #000; padding:6px;">SL</th>
            <th style="border:1px solid #000; padding:6px;">Đơn giá</th>
            <th style="border:1px solid #000; padding:6px;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>${itemsHTML}</tbody>
      </table>

      <!-- Tổng cộng + QR -->
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        margin-top:25px;
      ">
        <!-- Thông tin ngân hàng -->
        <div style="flex:1;">
          <div style="font-size:13px; line-height:1.5;">
            <div><b>Ngân hàng:</b> VietinBank (ICB)</div>
            <div><b>Số tài khoản:</b> ${accountNumber}</div>
            <div><b>Chủ tài khoản:</b> ${accountName}</div>
            <div><b>Nội dung:</b> ${note}</div>
          </div>
        </div>

        <!-- QR + Tổng cộng -->
        <div style="text-align:right;">
          <div style="font-weight:700; font-size:14px; margin-bottom:6px;">
            Tổng cộng: ${order.totalAmount.toLocaleString("vi-VN")} ₫
          </div>
          <img
            src="${qrUrl}"
            alt="QR Thanh toán"
            style="
              width:200px;
              height:200px;
              object-fit:contain;
              border:1px solid #000;
              padding:4px;
              border-radius:6px;
            "
          >
        </div>
      </div>

      <hr style="border:none; border-top:1px solid #000; margin:20px 0 10px;">
      <p style="text-align:center; font-style:italic; font-size:13px; margin:5px 0;">
        Cảm ơn quý khách đã tin tưởng và mua hàng!
      </p>
    </div>
  `;

  new bootstrap.Modal(document.getElementById("invoiceModal")).show();
}

// ======= IN HÓA ĐƠN (xác nhận thanh toán chính thức) =======
document
  .getElementById("btnPrintInvoice")
  .addEventListener("click", async () => {
    try {
      // 🧾 Xác nhận thanh toán thật - trừ kho, xoá giỏ
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

      // 🖨️ Thực hiện in hóa đơn
      const invoiceHTML = document.getElementById("invoiceContent").innerHTML;
      const printWin = window.open("", "_blank", "width=900,height=700");
      printWin.document.write(`
      <html>
        <head>
          <title>In hóa đơn</title>
          <style>
            body { font-family: Arial, sans-serif; color: #000; padding: 30px; }
            .invoice-box {
              border: 1px solid #999;
              border-radius: 6px;
              padding: 18px 24px;
              box-shadow: 0 0 4px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">${invoiceHTML}</div>
          <script>
            window.onload = function() {
              setTimeout(() => { window.print(); window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
      printWin.document.close();

      // ✅ Sau khi in -> xoá giỏ hàng & báo thành công
      setTimeout(() => {
        showToast("✅ Thanh toán thành công!", "success");
        loadCart(); // cập nhật lại giao diện giỏ hàng
      }, 1000);
    } catch (error) {
      console.error(error);
      showToast("❌ Lỗi khi in hóa đơn!", "warning");
    }
  });

// ======= HÓA ĐƠN POPUP =======
function renderInvoice(order) {
  const content = document.getElementById("invoiceContent");

  // ✅ Cấu hình VietinBank
  const bankCode = "ICB";
  const accountNumber = "0385188318";
  const accountName = "Nguyễn Đình Nhật Hoàng";
  const amount = order.totalAmount;
  const note = `Cảm ơn quý khách - Thanh toán đơn hàng ${order.id}`;

  // ✅ Tạo mã QR VietQR thật (tự điền STK, số tiền, nội dung)
  const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    note
  )}&accountName=${encodeURIComponent(accountName)}`;

  const itemsHTML = order.items
    .map(
      (i, idx) => `
      <tr>
        <td class="text-center" style="padding:6px;">${idx + 1}</td>
        <td style="padding:6px;">${i.name}</td>
        <td class="text-center" style="padding:6px;">${i.quantity}</td>
        <td class="text-end" style="padding:6px;">${i.price.toLocaleString(
          "vi-VN"
        )} ₫</td>
        <td class="text-end" style="padding:6px;">${(
          i.quantity * i.price
        ).toLocaleString("vi-VN")} ₫</td>
      </tr>`
    )
    .join("");

  // ✅ Hóa đơn có khung viền nhẹ + QR lớn vừa phải
  content.innerHTML = `
    <div style="
      font-family: Arial, sans-serif;
      color: #000;
      line-height: 1.4;
      font-size: 13px;
      border: 1px solid #999;
      border-radius: 6px;
      padding: 18px 24px;
      box-shadow: 0 0 4px rgba(0,0,0,0.1);
    ">

      <!-- Header -->
      <div style="text-align:center; margin-bottom:12px;">
        <h3 style="margin:0; font-weight:700; text-transform:uppercase;">KHO PHỤ TÙNG ĐÌNH HÓA</h3>
        <div style="font-size:12px; margin-top:3px;">
          Địa chỉ: TDP 4D, Huyện Đạ Tẻh, Tỉnh Lâm Đồng
        </div>
        <hr style="border:none; border-top:2px solid #000; margin:10px 0;">
      </div>

      <!-- Thông tin hóa đơn -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
        <div>
          <p style="margin:2px 0;"><b>Mã hóa đơn:</b> ${order.id}</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:2px 0;"><b>Ngày lập:</b> ${new Date(
            order.createdAt
          ).toLocaleDateString("vi-VN")}</p>
          <p style="margin:2px 0;"><b>Giờ:</b> ${new Date(
            order.createdAt
          ).toLocaleTimeString("vi-VN")}</p>
        </div>
      </div>

      <!-- Bảng sản phẩm -->
      <table style="width:100%; border-collapse:collapse; margin-top:5px;">
        <thead>
          <tr style="background:#f3f3f3; text-align:center;">
            <th style="border:1px solid #000; padding:6px;">#</th>
            <th style="border:1px solid #000; padding:6px;">Tên sản phẩm</th>
            <th style="border:1px solid #000; padding:6px;">SL</th>
            <th style="border:1px solid #000; padding:6px;">Đơn giá</th>
            <th style="border:1px solid #000; padding:6px;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>${itemsHTML}</tbody>
      </table>

      <!-- Tổng cộng -->
      <div style="text-align:right; margin-top:20px;">
        <h5 style="margin:0; font-size:14px; font-weight:700;">
          Tổng cộng: ${order.totalAmount.toLocaleString("vi-VN")} ₫
        </h5>
      </div>

      <!-- QR ở giữa -->
      <div style="text-align:center; margin-top:20px;">
        <img
          src="${qrUrl}"
          alt="QR Thanh toán"
          style="
            width:140px;
            height:140px;
            object-fit:contain;
            border:1px solid #000;
            padding:5px;
            border-radius:6px;
          "
        >
      </div>

      <hr style="border:none; border-top:1px solid #000; margin:20px 0 10px;">
      <p style="text-align:center; font-style:italic; font-size:13px; margin:5px 0;">
        Cảm ơn quý khách đã tin tưởng và mua hàng!
      </p>
    </div>
  `;

  new bootstrap.Modal(document.getElementById("invoiceModal")).show();
}

// ======= TẢI PDF (CHẮC CHẮN HOẠT ĐỘNG) =======
document
  .getElementById("btnDownloadPDF")
  .addEventListener("click", async () => {
    // Chờ jsPDF và html2canvas đều tải xong
    await new Promise((resolve) => {
      if (window.jspdf && window.html2canvas) return resolve();
      let loaded = 0;
      const check = () => {
        if (++loaded === 2) resolve();
      };
      script.onload = check;
      html2canvasScript.onload = check;
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "pt", "a4");
    const invoice = document.getElementById("invoiceContent");

    // Tạo bản sao gọn nhẹ (đen trắng, không màu)
    const clone = invoice.cloneNode(true);
    clone.querySelectorAll("button").forEach((btn) => btn.remove());
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
      html2canvas: {
        scale: 0.9,
        useCORS: true, // cho phép tải ảnh logo cross-origin
      },
    });
  });

// ======= TOAST =======
function showToast(msg, type) {
  const container = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = `toast text-white ${
    type === "success"
      ? "bg-success"
      : type === "warning"
      ? "bg-warning text-dark"
      : "bg-primary"
  } animate__animated animate__fadeInDown`;
  el.innerHTML = `<div class="toast-body fw-semibold">${msg}</div>`;
  container.appendChild(el);
  const toast = new bootstrap.Toast(el, { delay: 3000 });
  toast.show();
  el.addEventListener("hidden.bs.toast", () => el.remove());
}

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
