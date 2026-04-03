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

// phân trang
let currentPage = 1;
const ITEMS_PER_PAGE = 10;

let allOrders = []; // dữ liệu gốc
let filteredOrders = []; // dữ liệu sau khi lọc

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
      "https://motorparts-api.onrender.com/api/stats/revenue-monthly",
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
    allOrders = await res.json(); // ✔ GÁN DỮ LIỆU VÀO allOrders
    filteredOrders = allOrders; // ✔ Mặc định hiển thị tất cả

    renderTable();
    renderPagination();
  } catch (err) {
    console.error("Lỗi load:", err);
  }
}

function renderFilteredTable() {
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;

  const pageItems = filteredOrders.slice(start, end);

  if (pageItems.length === 0) {
    document.getElementById("orderTableBody").innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-danger fw-bold py-3">
          Không có dữ liệu ngày này 🥺
        </td>
      </tr>`;
    return;
  }

  const html = pageItems
    .map(
      (order) => `
      <tr>
        <td>${order.invoiceCode}</td>
        <td>${order.customerName}</td>
        <td>${order.phone}</td>
        <td>${order.totalAmount.toLocaleString("vi-VN")} ₫</td>
        <td>${new Date(order.createdAt).toLocaleString("vi-VN")}</td>
        <td>
          <button class="btn btn-primary btn-sm"
            onclick="viewOrderDetail('${order._id}')">
            Xem
          </button>
        </td>
      </tr>`,
    )
    .join("");

  document.getElementById("orderTableBody").innerHTML = html;
}

function renderPagination(totalPages) {
  let html = "";

  html += `
    <button class="btn btn-sm btn-outline-primary me-1"
            onclick="changePage(${currentPage - 1})"
            ${currentPage === 1 ? "disabled" : ""}>
      ‹ Trước
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button class="btn btn-sm ${i === currentPage ? "btn-primary" : "btn-outline-primary"} me-1"
              onclick="changePage(${i})">
        ${i}
      </button>`;
  }

  html += `
    <button class="btn btn-sm btn-outline-primary ms-1"
            onclick="changePage(${currentPage + 1})"
            ${currentPage === totalPages ? "disabled" : ""}>
      Sau ›
    </button>
  `;

  document.getElementById("pagination").innerHTML = html;
}

function changePage(p) {
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  renderTable();
}

function changePage(page) {
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  if (page < 1 || page > totalPages) return;

  currentPage = page;
  renderFilteredTable();
  renderPagination();
}
// tháng
function filterByMonth() {
  const monthValue = document.getElementById("filterMonth").value;

  // Nếu chưa chọn tháng → hiển thị toàn bộ
  if (!monthValue) {
    filteredOrders = allOrders;
    currentPage = 1;
    renderTable();
    document.getElementById("totalByMonth").innerHTML = "";
    return;
  }

  // Tách năm – tháng
  const [year, month] = monthValue.split("-").map(Number);

  filteredOrders = allOrders.filter((order) => {
    const d = new Date(order.createdAt);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  // Tính tổng tháng
  const total = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  // Hiện tổng tiền
  document.getElementById("totalByMonth").innerHTML =
    `Tổng doanh thu tháng ${month}/${year}: <span class="text-primary">${total.toLocaleString("vi-VN")} ₫</span>`;

  currentPage = 1;
  renderTable();
}
function resetFilterMonth() {
  document.getElementById("filterMonth").value = "";
  filteredOrders = allOrders;
  currentPage = 1;
  renderTable();
  document.getElementById("totalByMonth").innerHTML = "";
}
//ngày
function filterBySingleDate() {
  const date = document.getElementById("filterDate").value;

  // ⛔ Nếu chưa chọn → hiện toàn bộ
  if (!date) {
    filteredOrders = allOrders;
    currentPage = 1;
    return renderTable();
  }

  const selected = new Date(date);
  selected.setHours(0, 0, 0, 0);

  filteredOrders = allOrders.filter((o) => {
    const d = new Date(o.createdAt);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === selected.getTime();
  });

  currentPage = 1;
  renderTable();
}

function renderOrders(data) {
  const tbody = document.getElementById("orderTableBody");
  tbody.innerHTML = "";

  data.forEach((order) => {
    const row = `
      <tr>
        <td>${order.invoiceCode || "Không có mã"}</td>
        <td>${order.customerName || "N/A"}</td>
        <td>${order.phone || "N/A"}</td>
        <td>${(order.totalAmount || 0).toLocaleString("vi-VN")} ₫</td>
        <td>${new Date(order.createdAt).toLocaleString("vi-VN")}</td>

        <td class="text-center">
          <button 
            class="btn btn-primary btn-sm"
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

function resetFilter() {
  document.getElementById("filterDate").value = "";
  filteredOrders = allOrders;
  currentPage = 1;
  renderTable();
}

async function viewOrderDetail(id) {
  try {
    const res = await fetch(
      `https://motorparts-api.onrender.com/api/orders/${id}`,
    );
    const order = await res.json();

    // ===== FORMAT DANH SÁCH SẢN PHẨM =====
    const itemsHTML = order.items
      .map(
        (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.name}</td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-end">${item.price.toLocaleString("vi-VN")} ₫</td>
        <td class="text-end">
          ${(item.price * item.quantity).toLocaleString("vi-VN")} ₫
        </td>
      </tr>
    `,
      )
      .join("");

    // ===== NỘI DUNG HÓA ĐƠN =====
    const html = `
      <h5 class="fw-bold mb-3">HÓA ĐƠN THANH TOÁN</h5>

      <p><strong>Mã hóa đơn:</strong> ${order.invoiceCode}</p>
      <p><strong>Khách hàng:</strong> ${order.customerName}</p>
      <p><strong>Số điện thoại:</strong> ${order.phone}</p>
      <p><strong>Ngày tạo:</strong> ${new Date(order.createdAt).toLocaleString(
        "vi-VN",
      )}</p>

      <hr>

      <table class="table table-bordered">
        <thead>
          <tr>
            <th>#</th>
            <th>Sản phẩm</th>
            <th class="text-center">SL</th>
            <th class="text-end">Giá</th>
            <th class="text-end">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <h5 class="text-end text-danger fw-bold">
        Tổng cộng: ${order.totalAmount.toLocaleString("vi-VN")} ₫
      </h5>
    `;

    document.getElementById("orderDetailContent").innerHTML = html;

    // ===== MỞ MODAL =====
    new bootstrap.Modal(document.getElementById("orderDetailModal")).show();
  } catch (err) {
    console.error("Lỗi xem chi tiết:", err);
  }
}

loadOrders();

function renderTable() {
  const tbody = document.getElementById("orderTableBody");

  if (filteredOrders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-danger fw-bold py-3">
          Không có dữ liệu ngày này 🥺
        </td>
      </tr>`;
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredOrders.slice(start, start + ITEMS_PER_PAGE);

  tbody.innerHTML = pageItems
    .map(
      (order) => `
      <tr>
        <td>${order.invoiceCode}</td>
        <td>${order.customerName}</td>
        <td>${order.phone}</td>
        <td>${order.totalAmount.toLocaleString("vi-VN")} ₫</td>
        <td>${new Date(order.createdAt).toLocaleString("vi-VN")}</td>
        <td>
          <button class="btn btn-primary btn-sm"
            onclick="viewOrderDetail('${order._id}')">
            Xem
          </button>
        </td>
      </tr>
    `,
    )
    .join("");

  renderPagination(totalPages);
}
