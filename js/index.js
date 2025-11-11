/* ../js/index.js
   Dashboard logic: fetch stats, render chart, top-low-stock, export CSV, download chart, toast, threshold setting
*/

const API_BASE = "https://motorparts-api.onrender.com/api"; // <-- đổi nếu cần

// Utility
const fmtVND = (n) => {
  if (n == null) return "—";
  return Number(n).toLocaleString("vi-VN") + " ₫";
};
const fmtNumber = (n) => (n == null ? "—" : Number(n).toLocaleString("vi-VN"));

// Simple toast using Bootstrap Toast
function showToast(msg, type = "info", delay = 3000) {
  const container = document.getElementById("toastContainer");
  const el = document.createElement("div");
  const color =
    type === "success"
      ? "bg-success text-white"
      : type === "warning"
      ? "bg-warning text-dark"
      : type === "danger"
      ? "bg-danger text-white"
      : "bg-primary text-white";
  el.className = `toast ${color} animate__animated animate__fadeInDown`;
  el.role = "alert";
  el.style.minWidth = "220px";
  el.innerHTML = `<div class="toast-body">${msg}</div>`;
  container.appendChild(el);
  const bs = new bootstrap.Toast(el, { delay });
  bs.show();
  el.addEventListener("hidden.bs.toast", () => el.remove());
}

// Chart instance (global)
let overviewChart = null;

// Loading placeholders: initially KPI fields contain placeholders in HTML
function setLastUpdated() {
  document.getElementById("lastUpdated").textContent =
    new Date().toLocaleString("vi-VN");
}

// Load stats (tries /stats/overview then fallback)
async function loadOverview() {
  try {
    // show loading placeholders (optional)
    setLastUpdated();
    const res = await fetch(`${API_BASE}/stats/overview`);
    if (res.ok) {
      const body = await res.json();
      applyOverview(body);
      return;
    }
    // fallback if /stats/overview not present
    await fallbackComputeOverview();
  } catch (err) {
    console.warn("overview fetch failed:", err);
    await fallbackComputeOverview();
  }
}

// Apply overview JSON (expected shape explained in suggestions earlier)
function applyOverview(data) {
  // KPIs
  document.getElementById("totalProducts").textContent = fmtNumber(
    data.totalProducts
  );
  // monthlyRevenue may be raw VND or already in millions - try detect
  const monthlyRevenue =
    (data.monthlyRevenue || data.monthlyRevenueSeries) ?? 0;
  // if monthlyRevenue is number assume total for current month; else if array use sum of last entry
  if (Array.isArray(monthlyRevenue)) {
    // display last month value (assume in millions if flagged)
    const last = monthlyRevenue[monthlyRevenue.length - 1] ?? 0;
    // detect if numbers look like millions (<=2000) or VND large (>=1e6)
    const display =
      last > 1000000
        ? last.toLocaleString("vi-VN") + " ₫"
        : Math.round(last * 100) / 100 + " M";
    document.getElementById("monthlyRevenue").textContent = display;
  } else {
    document.getElementById("monthlyRevenue").textContent =
      fmtVND(monthlyRevenue);
  }

  document.getElementById("topBrand").textContent = data.topBrand || "—";
  document.getElementById("newCustomers").textContent = fmtNumber(
    data.newCustomers || 0
  );

  // Chart: monthlyRevenueSeries expected in either VND or million
  const series = Array.isArray(data.monthlyRevenueSeries)
    ? data.monthlyRevenueSeries
    : data.monthlyRevenue || [];
  updateOverviewChart(series);
}

// Fallback computing overview from products/orders endpoints
async function fallbackComputeOverview() {
  try {
    // fetch products
    const pRes = await fetch(`${API_BASE}/products?limit=1000`);
    const pJson = pRes.ok ? await pRes.json() : null;
    const products = pJson ? pJson.data || pJson : [];

    // total products and top brand
    document.getElementById("totalProducts").textContent = fmtNumber(
      products.length
    );
    // compute total stock by brand
    const brandMap = {};
    products.forEach((p) => {
      const b = p.vehicle || "Khác";
      brandMap[b] = (brandMap[b] || 0) + (Number(p.quantity) || 0);
    });
    const topBrand = Object.entries(brandMap).sort((a, b) => b[1] - a[1])[0];
    document.getElementById("topBrand").textContent = topBrand
      ? topBrand[0]
      : "—";

    // monthly revenue try orders endpoint
    let revenueSeries = Array(12).fill(0);
    try {
      const oRes = await fetch(`${API_BASE}/orders?limit=1000`);
      if (oRes.ok) {
        const oJson = await oRes.json();
        const orders = oJson.data || oJson;
        orders.forEach((o) => {
          const d = new Date(o.createdAt || o.created_at || Date.now());
          const idx = d.getMonth();
          revenueSeries[idx] =
            (revenueSeries[idx] || 0) +
            Number(o.totalAmount || o.total || 0) / 1000000; // million
        });
      }
    } catch (e) {
      /* ignore */
    }

    // set monthlyRevenue to last month value
    const lastVal =
      Math.round((revenueSeries[revenueSeries.length - 1] || 0) * 100) / 100;
    document.getElementById("monthlyRevenue").textContent = lastVal
      ? lastVal + " M"
      : "—";

    updateOverviewChart(revenueSeries);
  } catch (err) {
    console.error("fallback fail", err);
    showToast("Không thể tải dữ liệu tổng quan.", "danger");
  }
}

// Create or update overview chart
function updateOverviewChart(series = Array(12).fill(0)) {
  const ctx = document.getElementById("overviewChart").getContext("2d");
  const labels = [
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
  ];
  if (overviewChart) {
    overviewChart.data.datasets[0].data = series.map(
      (v) => Math.round((Number(v) || 0) * 100) / 100
    );
    overviewChart.update();
    return;
  }
  overviewChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Doanh thu (triệu ₫)",
          data: series.map((v) => Math.round((Number(v) || 0) * 100) / 100),
          borderColor:
            getComputedStyle(document.documentElement)
              .getPropertyValue("--primary")
              ?.trim() || "#1E88E5",
          backgroundColor: "rgba(30,136,229,0.08)",
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

// Top low stock
async function loadTopLowStock() {
  try {
    const threshold = Number(localStorage.getItem("lowStockThreshold") || 5);
    document.getElementById("lowThresholdView").textContent = threshold;

    const res = await fetch(`${API_BASE}/products?limit=1000`);
    const json = res.ok ? await res.json() : null;
    const products = json ? json.data || json : [];

    const low = products
      .filter((p) => (Number(p.quantity) || 0) < threshold)
      .sort((a, b) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0))
      .slice(0, 5);

    const tbody = document.getElementById("topLowStockBody");
    if (!low.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-success text-center py-3">🎉 Không có mặt hàng dưới ngưỡng!</td></tr>`;
      document.getElementById("lowStockCount").textContent = 0;
      return;
    }

    tbody.innerHTML = low
      .map(
        (p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><img src="${
          p.image || "https://via.placeholder.com/56"
        }" width="56" height="44" class="rounded shadow-sm" /></td>
        <td class="fw-semibold">${p.name || ""}</td>
        <td>${p.vehicle || ""}</td>
        <td>${p.model || ""}</td>
        <td>${p.category || ""}</td>
        <td class="text-danger fw-bold">${p.quantity || 0}</td>
      </tr>
    `
      )
      .join("");
    document.getElementById("lowStockCount").textContent = low.length;
  } catch (err) {
    console.error(err);
    document.getElementById(
      "topLowStockBody"
    ).innerHTML = `<tr><td colspan="7" class="text-danger text-center py-3">Không tải được dữ liệu</td></tr>`;
  }
}

// Export CSV (overview + low stock)
async function exportCSV() {
  try {
    // get chart data
    const labels = overviewChart?.data?.labels || [];
    const series = overviewChart?.data?.datasets?.[0]?.data || [];

    // low stock rows (re-fetch to get full)
    const res = await fetch(`${API_BASE}/products?limit=1000`);
    const json = res.ok ? await res.json() : null;
    const products = json ? json.data || json : [];
    const threshold = Number(localStorage.getItem("lowStockThreshold") || 5);
    const low = products
      .filter((p) => (Number(p.quantity) || 0) < threshold)
      .slice(0, 50);

    const rows = [];
    rows.push(["KPI Overview"]);
    rows.push([
      "TotalProducts",
      document.getElementById("totalProducts").textContent,
    ]);
    rows.push([
      "MonthlyRevenue",
      document.getElementById("monthlyRevenue").textContent,
    ]);
    rows.push(["TopBrand", document.getElementById("topBrand").textContent]);
    rows.push([]);
    rows.push(["Monthly Revenue"]);
    rows.push(["Month", "Value (M)"]);
    labels.forEach((lab, idx) => rows.push([lab, series[idx] || 0]));
    rows.push([]);
    rows.push([`Top low stock (threshold ${threshold})`]);
    rows.push(["#", "name", "vehicle", "model", "category", "quantity"]);
    low.forEach((p, i) =>
      rows.push([
        i + 1,
        p.name || "",
        p.vehicle || "",
        p.model || "",
        p.category || "",
        p.quantity || 0,
      ])
    );

    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard_export_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Đã xuất CSV thành công", "success");
  } catch (err) {
    console.error(err);
    showToast("Không xuất được CSV", "danger");
  }
}

// Download chart image
function downloadOverviewChart() {
  if (!overviewChart) {
    showToast("Biểu đồ chưa sẵn sàng", "warning");
    return;
  }
  const url = overviewChart.toBase64Image();
  const a = document.createElement("a");
  a.href = url;
  a.download = `overview_chart_${new Date().toISOString().slice(0, 10)}.png`;
  a.click();
  showToast("Đã lưu ảnh biểu đồ", "success");
}

// Change threshold prompt
function setThresholdPrompt() {
  const cur = Number(localStorage.getItem("lowStockThreshold") || 5);
  const ans = prompt("Nhập ngưỡng tồn thấp (số nguyên dương):", String(cur));
  if (ans === null) return;
  const v = parseInt(ans, 10);
  if (isNaN(v) || v < 0) {
    showToast("Ngưỡng không hợp lệ", "danger");
    return;
  }
  localStorage.setItem("lowStockThreshold", String(v));
  document.getElementById("lowThresholdView").textContent = v;
  loadTopLowStock();
  showToast(`Đã cập nhật ngưỡng: ${v}`, "success");
}

// Wire buttons
document.getElementById("btnRefresh").addEventListener("click", () => {
  loadOverview();
  loadTopLowStock();
  showToast("Đang cập nhật...", "info", 800);
});
document.getElementById("btnExportCSV").addEventListener("click", exportCSV);
document
  .getElementById("btnDownloadChart")
  .addEventListener("click", downloadOverviewChart);
document
  .getElementById("btnSetThreshold")
  .addEventListener("click", setThresholdPrompt);

// Init
(function initDashboard() {
  // set defaults if not present
  if (!localStorage.getItem("lowStockThreshold"))
    localStorage.setItem("lowStockThreshold", "5");

  loadOverview();
  loadTopLowStock();
  setLastUpdated();
})();
