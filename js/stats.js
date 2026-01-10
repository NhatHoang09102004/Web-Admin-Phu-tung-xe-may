// ===== Biểu đồ cột: Tồn kho theo hãng =====
const ctxStock = document.getElementById("stockChart");
new Chart(ctxStock, {
  type: "bar",
  data: {
    labels: ["Honda", "Yamaha", "SYM"],
    datasets: [
      {
        label: "Số lượng tồn kho",
        data: [120, 80, 45],
        backgroundColor: ["#007bff", "#28a745", "#ffc107"],
      },
    ],
  },
  options: { scales: { y: { beginAtZero: true } } },
});

// ===== Biểu đồ tròn: Tỷ lệ loại phụ tùng =====
const ctxCategory = document.getElementById("categoryChart");
new Chart(ctxCategory, {
  type: "doughnut",
  data: {
    labels: ["Đèn", "Phanh", "Phuộc", "Nhông sên dĩa", "Lọc gió"],
    datasets: [
      {
        data: [25, 15, 20, 30, 10],
        backgroundColor: [
          "#0d6efd",
          "#dc3545",
          "#ffc107",
          "#20c997",
          "#6f42c1",
        ],
      },
    ],
  },
});

// ===== Biểu đồ đường: Doanh thu theo tháng =====
const ctxRevenue = document.getElementById("revenueChart");
new Chart(ctxRevenue, {
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
        data: [40, 55, 60, 72, 85, 90, 95, 110, 125, 130, 145, 160],
        borderColor: "#198754",
        backgroundColor: "rgba(25,135,84,0.2)",
        fill: true,
        tension: 0.3,
      },
    ],
  },
  options: { scales: { y: { beginAtZero: true } } },
});
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
async function loadRevenueChart() {
  try {
    const res = await fetch(
      "https://motorparts-api.onrender.com/api/stats/revenue-monthly"
    );
    const data = await res.json();

    const ctxRevenue = document.getElementById("revenueChart");

    new Chart(ctxRevenue, {
      type: "line",
      data: {
        labels: data.months, // Ví dụ: ["Th1","Th2","Th3",...]
        datasets: [
          {
            label: "Doanh thu (₫)",
            data: data.revenue, // Mảng doanh thu từng tháng
            borderColor: "#1E88E5",
            backgroundColor: "rgba(25,118,210,0.15)",
            fill: true,
            tension: 0.35,
            borderWidth: 3,
            pointRadius: 5,
            pointBackgroundColor: "#1565C0",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return value.toLocaleString("vi-VN") + " ₫";
              },
            },
          },
        },
      },
    });
  } catch (err) {
    console.error("Lỗi tải doanh thu:", err);
  }
}

async function loadOrders() {
  try {
    const res = await fetch("https://motorparts-api.onrender.com/api/orders");
    const data = await res.json();

    renderOrders(data);
  } catch (error) {
    console.error("Lỗi tải đơn hàng:", error);
  }
}

function renderOrders(data) {
  const tbody = document.getElementById("orderTableBody");
  tbody.innerHTML = "";

  data.forEach((order) => {
    const row = `
      <tr>
        <td>${order.invoiceCode || ""}</td>
        <td>${order.customerName || "N/A"}</td>
        <td>${order.phone || "N/A"}</td>
        <td class="text-money">${(order.totalAmount || 0).toLocaleString(
          "vi-VN"
        )} ₫</td>
        <td class="text-date">${new Date(order.createdAt).toLocaleString(
          "vi-VN"
        )}</td>

        <td class="text-center">
          <button 
            class="btn btn-primary btn-sm btn-detail"
            onclick="viewOrderDetail('${order._id}')"
          >
            <i class="bi bi-eye-fill me-1"></i> Xem
          </button>
        </td>
      </tr>
    `;

    tbody.innerHTML += row;
  });
}

function viewOrderDetail(id) {
  alert("Xem chi tiết hóa đơn: " + id);
}

// Load khi mở trang
loadOrders();
