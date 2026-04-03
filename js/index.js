/* js/index.js
   Dashboard logic: KPI, chart, low-stock, export CSV, download chart
*/

(() => {
  // Config: lấy API base priority: window.__API_BASE__ -> localStorage.settings.apiUrl -> '/api'
  const cfg = JSON.parse(localStorage.getItem("settings") || "{}");
  const API = "https://motorparts-api.onrender.com/api";

  // DOM refs
  const lastUpdatedEl = document.getElementById("lastUpdated");
  const totalProductsEl = document.getElementById("totalProducts");
  const monthlyRevenueEl = document.getElementById("monthlyRevenue");
  const topBrandEl = document.getElementById("topBrand");
  const newCustomersEl = document.getElementById("newCustomers");
  const lowStockCountEl = document.getElementById("lowStockCount");
  const lowThresholdView = document.getElementById("lowThresholdView");
  const topLowStockBody = document.getElementById("topLowStockBody");

  const btnRefresh = document.getElementById("btnRefresh");
  const btnExportCSV = document.getElementById("btnExportCSV");
  const btnDownloadChart = document.getElementById("btnDownloadChart");
  const btnSetThreshold = document.getElementById("btnSetThreshold");

  const ctx = document.getElementById("overviewChart");
  let overviewChart = null;

  // Helpers
  function showToast(msg, type = "info") {
    const container = document.getElementById("toastContainer");
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
    const toast = new bootstrap.Toast(el, { delay: 2800 });
    toast.show();
    el.addEventListener("hidden.bs.toast", () => el.remove());
  }
  function formatMoney(v) {
    return Number(v || 0).toLocaleString("vi-VN") + " ₫";
  }

  // Theme sync
  (function applyTheme() {
    const logo = localStorage.getItem("sidebarLogo");
    const color = localStorage.getItem("themeColor") || "#1e88e5";
    const logoImg = document.getElementById("sidebarLogo");
    if (logo && logoImg) logoImg.src = logo;
    document.documentElement.style.setProperty("--primary", color);
  })();

  // Init chart
  function initChart() {
    overviewChart = new Chart(ctx, {
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
            data: Array(12).fill(0),
            borderColor:
              getComputedStyle(document.documentElement)
                .getPropertyValue("--primary")
                .trim() || "#1976D2",
            backgroundColor:
              (getComputedStyle(document.documentElement)
                .getPropertyValue("--primary")
                .trim() || "#1976D2") + "1A",
            tension: 0.35,
            fill: true,
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

  // Load overview stats
  async function loadDashboard() {
    try {
      const res = await fetch(`${API}/stats/revenue-monthly`);

      if (!res.ok) throw new Error("Không lấy được số liệu tổng quan");
      const data = await res.json();

      totalProductsEl.textContent = (data.totalProducts ?? 0).toLocaleString(
        "vi-VN",
      );
      monthlyRevenueEl.textContent = formatMoney(data.monthlyRevenue ?? 0);
      topBrandEl.textContent = data.popularBrand?.name || "—";

      // Lấy tháng hiện tại
      const currentMonth = new Date().getMonth() + 1;

      // Lấy doanh thu theo tháng từ API series
      let revenue = 6800000;
      if (Array.isArray(data.monthlyRevenueSeries)) {
        revenue = data.monthlyRevenueSeries[currentMonth - 1] || 0;
      }

      // Gán vào UI
      monthlyRevenueEl.textContent = formatMoney(revenue);

      lastUpdatedEl.textContent = data.updatedAt
        ? new Date(data.updatedAt).toLocaleString("vi-VN")
        : new Date().toLocaleString("vi-VN");

      if (Array.isArray(data.monthlyRevenueSeries) && overviewChart) {
        const arr = data.monthlyRevenueSeries.slice(0, 12);
        overviewChart.data.datasets[0].data = arr.concat(
          Array(Math.max(0, 12 - arr.length)).fill(0),
        );
        overviewChart.update();
      }
    } catch (err) {
      console.error(err);
      showToast("Không tải được số liệu tổng quan.", "danger");
      totalProductsEl.textContent = "—";
      monthlyRevenueEl.textContent = "—";
      topBrandEl.textContent = "—";
      newCustomersEl.textContent = "—";
    }
  }

  // Low stock & top low
  async function loadLowStock() {
    try {
      const threshold = Number(localStorage.getItem("lowStockThreshold") || 5);
      lowThresholdView.textContent = String(threshold);

      // Use products endpoint (ensure backend supports limit param)
      const res = await fetch(`${API}/products?limit=1000`);
      if (!res.ok) throw new Error("Không lấy được sản phẩm");
      const json = await res.json();
      const products = json.data || [];

      const low = products.filter((p) => (p.quantity ?? 0) < threshold);
      lowStockCountEl.textContent = String(low.length);

      const top5 = low
        .sort((a, b) => (a.quantity || 0) - (b.quantity || 0))
        .slice(0, 5);
      if (!top5.length) {
        topLowStockBody.innerHTML = `<tr><td colspan="7" class="text-success text-center py-3">🎉 Không có mặt hàng nào dưới ngưỡng!</td></tr>`;
        return;
      }
      topLowStockBody.innerHTML = top5
        .map(
          (p, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><img src="${
            p.image || ""
          }" width="56" height="44" class="rounded shadow-sm" style="object-fit:cover"/></td>
          <td class="fw-semibold">${p.name || ""}</td>
          <td>${p.vehicle || ""}</td>
          <td>${p.model || ""}</td>
          <td>${p.category || ""}</td>
          <td class="text-danger fw-bold">${p.quantity ?? 0}</td>
        </tr>`,
        )
        .join("");
    } catch (err) {
      console.error(err);
      topLowStockBody.innerHTML = `<tr><td colspan="7" class="text-danger text-center py-3">Không tải được dữ liệu</td></tr>`;
      lowStockCountEl.textContent = "—";
    }
  }

  // Export CSV
  async function exportProductsCsv() {
    try {
      const res = await fetch(`${API}/products?limit=10000`);
      if (!res.ok) throw new Error("Không lấy được sản phẩm để xuất");
      const { data: products = [] } = await res.json();
      const headers = [
        "_id",
        "name",
        "vehicle",
        "model",
        "category",
        "price",
        "quantity",
        "status",
        "createdAt",
      ];
      const rows = products.map((p) =>
        headers.map((h) => JSON.stringify(p[h] ?? "")).join(","),
      );
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products_inventory_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("✅ Đã tạo file CSV.", "success");
    } catch (err) {
      console.error(err);
      showToast("❌ Không thể xuất CSV.", "danger");
    }
  }

  // Download chart
  function downloadChartImage() {
    try {
      const link = document.createElement("a");
      link.href = overviewChart.toBase64Image();
      link.download = `revenue_chart_${new Date()
        .toISOString()
        .slice(0, 10)}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast("✅ Đã tải biểu đồ.", "success");
    } catch (err) {
      console.error(err);
      showToast("❌ Không thể tải biểu đồ.", "warning");
    }
  }

  // Set threshold
  function setThreshold() {
    const current = Number(localStorage.getItem("lowStockThreshold") || 5);
    const v = prompt(
      "Đặt ngưỡng tồn thấp (số nguyên, ví dụ 5):",
      String(current),
    );
    if (v === null) return;
    const n = parseInt(v, 10);
    if (Number.isNaN(n) || n < 0) {
      alert("Giá trị không hợp lệ");
      return;
    }
    localStorage.setItem("lowStockThreshold", String(n));
    lowThresholdView.textContent = String(n);
    showToast(`Đã đặt ngưỡng: ${n}`, "success");
    loadLowStock();
  }

  // Events
  btnRefresh.addEventListener("click", () => {
    loadAll();
    showToast("Đã làm mới", "info");
  });
  btnExportCSV.addEventListener("click", exportProductsCsv);
  btnDownloadChart.addEventListener("click", downloadChartImage);
  btnSetThreshold.addEventListener("click", setThreshold);

  async function loadAll() {
    await Promise.all([loadDashboard(), loadLowStock()]);
  }

  // Init
  function init() {
    initChart();
    loadAll();
    // accessibility: close sidebar on ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const sidebar = document.querySelector(".sidebar");
        if (sidebar && sidebar.classList.contains("open"))
          sidebar.classList.remove("open");
      }
    });
  }

  init();
})();
