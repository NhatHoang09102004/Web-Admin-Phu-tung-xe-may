/* ================== Áp dụng Theme từ localStorage ================== */
(function applyDashboardTheme() {
  const logo = localStorage.getItem("sidebarLogo");
  const color = localStorage.getItem("themeColor") || "#1e88e5";
  const logoImg = document.getElementById("sidebarLogo");
  if (logo && logoImg) logoImg.src = logo;
  document.documentElement.style.setProperty("--primary", color);
})();

/* ================== Helpers ================== */
const cfg = JSON.parse(localStorage.getItem("settings") || "{}");
const API = cfg.apiUrl || "http://localhost:3000/api";

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

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
  const toast = new bootstrap.Toast(el, { delay: 2800 });
  toast.show();
  el.addEventListener("hidden.bs.toast", () => el.remove());
}

/* ================== Biểu đồ doanh thu (khớp màu theme) ================== */
const colorPrimary =
  getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    ?.trim() || "#1976D2";

const ctx = document.getElementById("overviewChart");
const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [
      "Th1",
      "Th2",
      "Th3",
      "Th4",
      "Th5",
      "Th6",
      "Th7",
      "Th8",
      "Th9",
      "Th10",
      "Th11",
      "Th12",
    ],
    datasets: [
      {
        label: "Doanh thu (₫)",
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // sẽ cập nhật sau khi gọi API
        borderColor: colorPrimary,
        backgroundColor: `${colorPrimary}1A`, // 10% alpha
        borderWidth: 3,
        tension: 0.35,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: colorPrimary,
      },
    ],
  },
  options: {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  },
});

/* ================== Nạp Dashboard từ API ================== */
async function loadDashboard() {
  try {
    // /stats/overview -> { totalProducts, monthlyRevenue, topBrand, newCustomers, monthlyRevenueSeries }
    const res = await fetch(`${API}/stats/overview`);
    const data = await res.json();
    if (!res.ok) throw new Error();

    setText("totalProducts", (data.totalProducts || 0).toLocaleString("vi-VN"));
    setText(
      "monthlyRevenue",
      (data.monthlyRevenue || 0).toLocaleString("vi-VN") + " ₫"
    );
    setText("topBrand", data.topBrand || "-");
    setText("newCustomers", data.newCustomers || "0");

    if (Array.isArray(data.monthlyRevenueSeries)) {
      chart.data.datasets[0].data = data.monthlyRevenueSeries;
      chart.update();
    }
  } catch (e) {
    setText("totalProducts", "—");
    setText("monthlyRevenue", "—");
    setText("topBrand", "—");
    setText("newCustomers", "—");
    showToast("Không tải được số liệu tổng quan.", "danger");
  }
}

/* ================== Cảnh báo tồn thấp & Top 5 ================== */
async function loadLowStockBadge() {
  try {
    const threshold = Number(localStorage.getItem("lowStockThreshold") || 5);
    setText("lowThresholdView", String(threshold));
    const res = await fetch(`${API}/products`);
    const { data } = await res.json();
    const low = (data || []).filter(
      (p) => (p.quantity || 0) < threshold
    ).length;
    setText("lowStockCount", String(low));
  } catch {
    setText("lowStockCount", "—");
  }
}

async function loadTopLowStock() {
  try {
    const threshold = Number(localStorage.getItem("lowStockThreshold") || 5);
    const res = await fetch(`${API}/products`);
    const { data } = await res.json();
    const low = (data || [])
      .filter((p) => (p.quantity || 0) < threshold)
      .sort((a, b) => (a.quantity || 0) - (b.quantity || 0))
      .slice(0, 5);

    const tbody = document.getElementById("topLowStockBody");
    if (!low.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-success text-center py-3">🎉 Không có mặt hàng nào dưới ngưỡng!</td></tr>`;
      return;
    }

    tbody.innerHTML = low
      .map(
        (p, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><img src="${
            p.image || ""
          }" width="56" height="44" class="rounded shadow-sm" /></td>
          <td class="fw-semibold">${p.name || ""}</td>
          <td>${p.vehicle || ""}</td>
          <td>${p.model || ""}</td>
          <td>${p.category || ""}</td>
          <td class="text-danger fw-bold">${p.quantity || 0}</td>
        </tr>`
      )
      .join("");
  } catch {
    document.getElementById(
      "topLowStockBody"
    ).innerHTML = `<tr><td colspan="7" class="text-danger text-center py-3">Không tải được dữ liệu</td></tr>`;
  }
}

/* ================== Quick actions ================== */
document.getElementById("btnRefresh").addEventListener("click", () => {
  document.body.classList.add("animate__animated", "animate__fadeOut");
  setTimeout(() => location.reload(), 500);
});

/* ================== Init ================== */
(async function init() {
  await Promise.all([loadDashboard(), loadLowStockBadge(), loadTopLowStock()]);
})();
