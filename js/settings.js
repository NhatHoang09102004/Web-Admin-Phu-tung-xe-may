// ===== Áp dụng giao diện theo cài đặt hiện tại =====
(function applyDashboardTheme() {
  const logo = localStorage.getItem("sidebarLogo");
  const color = localStorage.getItem("themeColor") || "#1e88e5";
  const logoImg = document.getElementById("sidebarLogo");
  if (logo && logoImg) logoImg.src = logo;
  document.documentElement.style.setProperty("--primary", color);
})();

// ===== Nạp cài đặt =====
const settings = JSON.parse(localStorage.getItem("settings") || "{}");
if (settings.storeName)
  document.getElementById("storeName").value = settings.storeName;
if (settings.currency)
  document.getElementById("currency").value = settings.currency;
if (settings.apiUrl) document.getElementById("apiUrl").value = settings.apiUrl;

// ===== Lưu cài đặt =====
document.getElementById("btnSaveSettings").addEventListener("click", () => {
  const data = {
    storeName: document.getElementById("storeName").value.trim(),
    currency: document.getElementById("currency").value,
    apiUrl: document.getElementById("apiUrl").value.trim(),
  };
  localStorage.setItem("settings", JSON.stringify(data));
  showToast("💾 Đã lưu cấu hình thành công!", "success");
});

// ===== Kiểm tra kết nối API =====
document.getElementById("btnTestAPI").addEventListener("click", async () => {
  const apiUrl = document.getElementById("apiUrl").value.trim();
  if (!apiUrl) return showToast("⚠️ Vui lòng nhập địa chỉ API!", "warning");

  try {
    const res = await fetch(`${apiUrl}/ping`);
    if (res.ok) showToast("✅ Kết nối API thành công!", "success");
    else showToast("⚠️ API phản hồi không hợp lệ!", "warning");
  } catch {
    showToast("❌ Không thể kết nối tới API!", "danger");
  }
});

// ===== Thay đổi màu giao diện =====
document.getElementById("themeColor").addEventListener("input", (e) => {
  const color = e.target.value;
  localStorage.setItem("themeColor", color);
  document.documentElement.style.setProperty("--primary", color);
  showToast("🎨 Đã cập nhật màu giao diện!", "success");
});

// ===== Upload logo sidebar =====
document.getElementById("logoUpload").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (event) {
    const base64 = event.target.result;
    localStorage.setItem("sidebarLogo", base64);
    document.getElementById("sidebarLogo").src = base64;
    showToast("🖼️ Đã thay đổi logo sidebar!", "success");
  };
  reader.readAsDataURL(file);
});

// ===== Khôi phục mặc định =====
document.getElementById("btnResetSettings").addEventListener("click", () => {
  if (!confirm("Bạn có chắc muốn khôi phục mặc định?")) return;
  localStorage.removeItem("settings");
  localStorage.removeItem("themeColor");
  localStorage.removeItem("sidebarLogo");
  showToast("🔄 Đã khôi phục mặc định!", "warning");
  setTimeout(() => location.reload(), 1000);
});

// ===== Toast =====
function showToast(msg, type = "info") {
  const container = document.getElementById("toastContainer");
  const el = document.createElement("div");
  const color =
    type === "success"
      ? "bg-success"
      : type === "warning"
      ? "bg-warning text-dark"
      : type === "danger"
      ? "bg-danger"
      : "bg-primary";

  el.className = `toast text-white ${color} animate__animated animate__fadeInDown`;
  el.innerHTML = `<div class="toast-body fw-semibold">${msg}</div>`;
  container.appendChild(el);
  const toast = new bootstrap.Toast(el, { delay: 3000 });
  toast.show();
  el.addEventListener("hidden.bs.toast", () => el.remove());
}

/* ------------------------------------------------------------------ */
/*            HÀNG TỒN THẤP: Ảnh + Phân trang + Hiệu ứng đếm          */
/* ------------------------------------------------------------------ */
let lowStockList = [];
let lowCurrentPage = 1;
const lowLimit = 5;

// Nhấn "Hiển thị hàng tồn thấp"
document
  .getElementById("btnShowLowStock")
  .addEventListener("click", async () => {
    showToast("🔄 Đang tải dữ liệu hàng tồn kho...", "info");

    // Fade-out nhẹ để mượt mắt
    document.body.classList.add("animate__animated", "animate__fadeOut");

    setTimeout(async () => {
      const api =
        JSON.parse(localStorage.getItem("settings") || "{}").apiUrl ||
        "http://localhost:3000/api";
      const tbody = document.getElementById("lowStockBody");
      tbody.innerHTML = `<tr><td colspan="9" class="text-muted py-3"><i class="bi bi-hourglass-split me-1"></i> Đang tải dữ liệu...</td></tr>`;

      try {
        const res = await fetch(`${api}/products`);
        const data = await res.json();
        if (!res.ok || !Array.isArray(data.data)) throw new Error();

        const threshold =
          Number(document.getElementById("lowStockThreshold").value) || 5;
        lowStockList = data.data.filter((p) => p.quantity < threshold);
        lowCurrentPage = 1;

        renderLowStockPage();

        const totalLow = lowStockList.length;
        document.getElementById("btnExportLowStock").disabled = totalLow === 0;
        animateCounter("lowStockCounter", totalLow, 600);

        if (totalLow > 0)
          showToast(
            `📦 Có ${totalLow} sản phẩm tồn thấp (dưới ${threshold})`,
            "warning"
          );
        else showToast("🎉 Tất cả sản phẩm đều đủ hàng!", "success");

        // Fade-in lại sau khi tải xong
        document.body.classList.remove("animate__fadeOut");
        document.body.classList.add("animate__fadeIn");
      } catch {
        tbody.innerHTML = `<tr><td colspan="9" class="text-danger py-3">❌ Không thể tải dữ liệu.</td></tr>`;
        showToast("Lỗi khi tải danh sách sản phẩm.", "danger");
        document.body.classList.remove("animate__fadeOut");
      }
    }, 500);
  });

// Render 1 trang của danh sách tồn thấp (có ảnh)
function renderLowStockPage() {
  const tbody = document.getElementById("lowStockBody");
  if (!lowStockList.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-success py-3">🎉 Tất cả sản phẩm đều đủ hàng!</td></tr>`;
    document.getElementById("lowStockInfo").textContent = "";
    document.getElementById("lowPageInfo").textContent = "Trang 0/0";
    document.getElementById("lowPrev").disabled = true;
    document.getElementById("lowNext").disabled = true;
    return;
  }

  const start = (lowCurrentPage - 1) * lowLimit;
  const end = start + lowLimit;
  const pageData = lowStockList.slice(start, end);

  tbody.innerHTML = pageData
    .map(
      (p, i) => `
    <tr class="animate__animated animate__fadeIn">
      <td>${start + i + 1}</td>
      <td><img src="${
        p.image
      }" class="rounded shadow-sm" width="70" height="55" alt="${p.name}"/></td>
      <td class="text-start fw-semibold">${p.name}</td>
      <td>${p.vehicle}</td>
      <td>${p.model}</td>
      <td>${p.category}</td>
      <td>${p.price?.toLocaleString("vi-VN")} ₫</td>
      <td class="text-danger fw-bold">${p.quantity}</td>
      <td>${new Date(p.createdAt).toLocaleDateString("vi-VN")}</td>
    </tr>
  `
    )
    .join("");

  const totalPages = Math.ceil(lowStockList.length / lowLimit);
  document.getElementById(
    "lowPageInfo"
  ).textContent = `Trang ${lowCurrentPage}/${totalPages}`;
  document.getElementById("lowPrev").disabled = lowCurrentPage <= 1;
  document.getElementById("lowNext").disabled = lowCurrentPage >= totalPages;
  document.getElementById(
    "lowStockInfo"
  ).innerHTML = `${lowStockList.length} sản phẩm tồn thấp`;

  // Cảnh báo khung khi có sản phẩm <=2
  const box = tbody.closest("div.table-responsive");
  if (lowStockList.some((p) => p.quantity <= 2)) {
    box.style.borderColor = "#dc3545";
    box.style.boxShadow = "0 0 0.6rem rgba(220,53,69,0.4)";
  } else {
    box.style.borderColor = "#ddd";
    box.style.boxShadow = "none";
  }
}

// Phân trang
document.getElementById("lowPrev").addEventListener("click", () => {
  if (lowCurrentPage > 1) {
    lowCurrentPage--;
    renderLowStockPage();
  }
});
document.getElementById("lowNext").addEventListener("click", () => {
  const totalPages = Math.ceil(lowStockList.length / lowLimit);
  if (lowCurrentPage < totalPages) {
    lowCurrentPage++;
    renderLowStockPage();
  }
});

// Xuất Excel danh sách tồn thấp (toàn bộ danh sách lọc)
document.getElementById("btnExportLowStock").addEventListener("click", () => {
  if (!lowStockList.length)
    return showToast("Không có dữ liệu để xuất!", "warning");

  const data = lowStockList.map((p, i) => ({
    STT: i + 1,
    TenSanPham: p.name,
    HangXe: p.vehicle,
    DongXe: p.model,
    Loai: p.category,
    Gia: p.price?.toLocaleString("vi-VN"),
    TonKho: p.quantity,
    NgayNhap: new Date(p.createdAt).toLocaleDateString("vi-VN"),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "HangTonThap");
  XLSX.writeFile(wb, "hang_ton_kho_thap.xlsx");
  showToast("📄 Đã xuất danh sách hàng tồn thấp!", "success");
});

// Hiệu ứng đếm số sản phẩm tồn thấp
function animateCounter(elementId, target, duration) {
  let counter = document.getElementById(elementId);
  if (!counter) {
    counter = document.createElement("div");
    counter.id = elementId;
    counter.className =
      "fw-bold fs-4 text-primary text-center my-2 animate__animated animate__fadeIn";
    document
      .getElementById("lowStockInfo")
      .insertAdjacentElement("beforebegin", counter);
  }

  const start = 0;
  const stepTime = Math.abs(Math.floor(duration / (target || 1))) || 50;
  let current = start;
  counter.textContent = `🔢 0/${target} sản phẩm tồn thấp`;

  const timer = setInterval(() => {
    current += 1;
    counter.textContent = `🔢 ${Math.min(
      current,
      target
    )}/${target} sản phẩm tồn thấp`;
    if (current >= target) {
      clearInterval(timer);
      counter.textContent = `📦 Tổng cộng ${target} sản phẩm tồn thấp`;
    }
  }, stepTime);
}
(function mobileSidebarToggle(){
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const btn = document.getElementById('btnToggleSidebar');
  if (!sidebar || !btn || !overlay) return;

  const open = () => {
    sidebar.classList.add('open');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden'; // khóa scroll nền
  };
  const close = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  };

  btn.addEventListener('click', () => {
    sidebar.classList.contains('open') ? close() : open();
  });
  overlay.addEventListener('click', close);

  // Đóng khi click 1 mục menu
  sidebar.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth < 992) close();
    });
  });

  // Đóng bằng phím ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) close();
  });
})();
