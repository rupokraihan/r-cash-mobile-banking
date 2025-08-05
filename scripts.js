// --- GLOBAL STATE & CONFIG ---
let currentUser = null;
let transactions = [];
let balance = 0;
let pendingTransactionDetails = {};
let selectedBank = null;
let selectedBiller = null;
let autoSlideInterval = null;

const CATEGORIES = {
  SEND: "send",
  REQUEST: "request",
  ADD: "add",
  BILL_PAY: "bill_pay",
  CASH_IN: "cash_in",
  CASH_OUT: "cash_out",
  TO_BANK: "to_bank",
  MOBILE_RECHARGE: "mobile_recharge",
  QR_PAY: "qr_pay",
};

// --- UPDATED: Configuration for pagination ---
const TRANSACTIONS_PER_PAGE = 10;
let currentPage = 1;

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  const savedUser = localStorage.getItem("rcash_user");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    loadData();
    showMainApp();
  } else {
    showLoginScreen();
  }
  setupEventListeners();
});

function setupEventListeners() {
  // Forms
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document
    .getElementById("pinConfirmForm")
    .addEventListener("submit", handlePinConfirmation);
  document
    .getElementById("changePinForm")
    .addEventListener("submit", processChangePin);

  // Transaction Modals
  document
    .getElementById("sendMoneyForm")
    .addEventListener("submit", (e) =>
      preProcessTransaction(e, CATEGORIES.SEND)
    );
  document
    .getElementById("requestMoneyForm")
    .addEventListener("submit", (e) =>
      preProcessTransaction(e, CATEGORIES.REQUEST)
    );
  document
    .getElementById("addMoneyForm")
    .addEventListener("submit", (e) =>
      preProcessTransaction(e, CATEGORIES.ADD)
    );
  document
    .getElementById("billPayForm")
    .addEventListener("submit", (e) =>
      preProcessTransaction(e, CATEGORIES.BILL_PAY)
    );
  document
    .getElementById("cashInForm")
    .addEventListener("submit", (e) =>
      preProcessTransaction(e, CATEGORIES.CASH_IN)
    );
  document
    .getElementById("cashOutForm")
    .addEventListener("submit", (e) =>
      preProcessTransaction(e, CATEGORIES.CASH_OUT)
    );
  document
    .getElementById("transferToBankForm")
    .addEventListener("submit", (e) =>
      preProcessTransaction(e, CATEGORIES.TO_BANK)
    );
  document
    .getElementById("mobileRechargeForm")
    .addEventListener("submit", (e) =>
      preProcessTransaction(e, CATEGORIES.MOBILE_RECHARGE)
    );
  document
    .getElementById("qrPaymentForm")
    .addEventListener("submit", (e) =>
      preProcessTransaction(e, CATEGORIES.QR_PAY)
    );

  // Other UI
  // MODIFIED: Reset to page 1 when filter changes
  document
    .getElementById("transactionFilter")
    .addEventListener("change", (e) => {
      currentPage = 1;
      loadTransactionHistory(e.target.value);
    });
  document.querySelectorAll(".modal").forEach((modal) =>
    modal.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) closeModal(modal.id);
    })
  );
  setInterval(updateClock, 1000);
}

// --- AUTH & NAVIGATION ---
function handleLogin(e) {
  e.preventDefault();
  const phone = document.getElementById("phoneNumber").value;
  const pin = document.getElementById("pin").value;
  document.getElementById("phoneError").textContent = "";
  document.getElementById("pinError").textContent = "";
  if (!/^[1-9]\d{9}$/.test(phone)) {
    document.getElementById("phoneError").textContent =
      "Phone must be 10 digits and cannot start with 0.";
    return;
  }
  if (pin !== "1234") {
    document.getElementById("pinError").textContent = "Incorrect PIN.";
    return;
  }
  currentUser = {
    name: "Rupok",
    phone,
    email: "rupok@example.com",
    pin: "1234",
  };
  localStorage.setItem("rcash_user", JSON.stringify(currentUser));
  initializeDefaultData();
  showMainApp();
  showNotification(
    "success",
    "Login Successful",
    `Welcome back, ${currentUser.name}!`
  );
}

function logout() {
  localStorage.clear();
  currentUser = null;
  transactions = [];
  balance = 0;
  showLoginScreen();
}

function showLoginScreen() {
  document.body.className = "bg-gray-100 text-gray-800 antialiased";
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("mainApp").classList.add("hidden");
  document.getElementById("tabContainer").classList.add("hidden");
  document.querySelector("nav").classList.add("hidden");
  stopCarousel();
}

function showMainApp() {
  document.body.className = "bg-gray-100 text-gray-800 antialiased has-nav";
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("mainApp").classList.remove("hidden");
  document.querySelector("nav").classList.remove("hidden");
  updateUI();
  startCarousel();
}

function showTab(tabName) {
  stopCarousel();
  document.body.className = "bg-gray-100 text-gray-800 antialiased has-nav";

  if (tabName === "home") {
    closeTab();
    return;
  }

  document.getElementById("mainApp").classList.add("hidden");
  document.getElementById("tabContainer").classList.remove("hidden");
  document
    .querySelectorAll(".tab-content")
    .forEach((tab) => tab.classList.remove("active"));
  document.getElementById(`${tabName}Tab`)?.classList.add("active");

  if (tabName === "transactions") {
    currentPage = 1; // MODIFIED: Reset to page 1 when tab is opened
    document.getElementById("transactionFilter").value = "all";
    loadTransactionHistory();
  }
  if (tabName === "offers") {
    switchOfferTab("current");
  }

  updateUI();

  document.querySelectorAll(".bottom-nav-item").forEach((item) => {
    item.classList.toggle(
      "active",
      item.getAttribute("onclick") === `showTab('${tabName}')`
    );
  });
}

function closeTab() {
  document.getElementById("tabContainer").classList.add("hidden");
  document.getElementById("mainApp").classList.remove("hidden");
  startCarousel();
  document.querySelectorAll(".bottom-nav-item").forEach((item) => {
    item.classList.toggle(
      "active",
      item.getAttribute("onclick") === "showTab('home')"
    );
  });
}

// --- UI & DATA RENDERING ---
function updateUI() {
  const formattedBalance = `$${balance.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  document.getElementById("totalBalance").textContent = formattedBalance;
  if (currentUser) {
    document.getElementById("userName").textContent = currentUser.name;
    document.getElementById("profileTabName").textContent = currentUser.name;
    document.getElementById(
      "profileTabPhone"
    ).textContent = `+880 ${currentUser.phone}`;
    document.getElementById("profileTabEmail").textContent = currentUser.email;
    document.getElementById("profileTabAccountNumber").textContent =
      currentUser.phone;
    document.getElementById("walletAccountNumber").textContent =
      currentUser.phone;
    document.getElementById("walletCurrentBalance").textContent =
      formattedBalance;
  }
}

// --- MODIFIED: loadTransactionHistory now uses pagination logic ---
function loadTransactionHistory(filter = "all") {
  const listEl = document.getElementById("transactionList");
  listEl.innerHTML = ""; // Clear previous list

  const filteredTxns = (
    filter === "all"
      ? transactions
      : transactions.filter((t) => t.category === filter)
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Pagination calculations
  const totalPages = Math.ceil(filteredTxns.length / TRANSACTIONS_PER_PAGE);
  const startIndex = (currentPage - 1) * TRANSACTIONS_PER_PAGE;
  const endIndex = startIndex + TRANSACTIONS_PER_PAGE;
  const transactionsToShow = filteredTxns.slice(startIndex, endIndex);

  if (transactionsToShow.length === 0) {
    listEl.innerHTML =
      '<div class="text-center p-8 bg-white rounded-lg"><i class="fas fa-search text-4xl text-gray-400 mb-4"></i><h4 class="font-bold">No Transactions Found</h4><p class="text-gray-500 text-sm">There are no transactions for this filter.</p></div>';
  } else {
    const groupedByDate = groupTransactionsByDate(transactionsToShow);
    let html = "";
    for (const dateGroup in groupedByDate) {
      html += `<h3 class="date-header">${dateGroup}</h3>`;
      html += groupedByDate[dateGroup]
        .map((t) => {
          const isIncome = t.type === "income";
          return `
                <div class="info-card !p-3">
                    <div class="service-icon !w-12 !h-12 !mr-3 bg-${
                      t.color
                    }-100">
                        <i class="${t.icon} text-lg text-${t.color}-500"></i>
                    </div>
                    <div class="flex-1">
                        <p class="font-semibold">${t.title}</p>
                        <p class="text-xs text-gray-500 font-medium">${t.party}</p>
                        <p class="text-xs text-gray-500">TrxID : ${t.txnId}</p>

                    </div>
                    <div class="text-right">
                        <p class="font-bold ${
                          isIncome ? "text-green-600" : "text-red-500"
                        }">
                            ${isIncome ? "+" : "-"}$${t.amount.toFixed(2)}
                        </p>
                        <p class="flex gap-3">
                        <span class="text-xs text-gray-400">${formatTime(t.date)}</span>
                        <span class="text-xs text-gray-400">${new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </p>

                    </div>
                </div>`;
        })
        .join("");
    }
    listEl.innerHTML = html;

    if (totalPages > 1) {
      listEl.appendChild(renderPaginationControls(totalPages, filter));
    }
  }
  updateSummary();
}

// --- NEW: Function to change the current page ---
function changePage(pageNumber, filter) {
  if (pageNumber < 1) pageNumber = 1;
  const totalPages = Math.ceil(
    transactions.filter((t) => filter === "all" || t.category === filter)
      .length / TRANSACTIONS_PER_PAGE
  );
  if (pageNumber > totalPages) pageNumber = totalPages;

  currentPage = pageNumber;
  loadTransactionHistory(filter);
}

// --- NEW: Function to build and render the pagination UI ---
function renderPaginationControls(totalPages, filter) {
  const container = document.createElement("div");
  container.className = "pagination-container";

  // Previous Button
  const prevBtn = document.createElement("button");
  prevBtn.className = "pagination-btn";
  prevBtn.innerHTML = `<i class="fas fa-chevron-left"></i>`;
  prevBtn.onclick = () => changePage(currentPage - 1, filter);
  if (currentPage === 1) prevBtn.disabled = true;
  container.appendChild(prevBtn);

  // Page Number Buttons
  const pageNumbers = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
  } else {
    pageNumbers.push(1);
    if (currentPage > 3) pageNumbers.push("...");
    if (currentPage === totalPages) pageNumbers.push(currentPage - 2);
    if (currentPage > 2) pageNumbers.push(currentPage - 1);
    if (currentPage !== 1 && currentPage !== totalPages)
      pageNumbers.push(currentPage);
    if (currentPage < totalPages - 1) pageNumbers.push(currentPage + 1);
    if (currentPage === 1) pageNumbers.push(currentPage + 2);
    if (currentPage < totalPages - 2) pageNumbers.push("...");
    pageNumbers.push(totalPages);
  }

  // Create unique list of page numbers
  [...new Set(pageNumbers)].forEach((num) => {
    if (num === "...") {
      const ellipsis = document.createElement("span");
      ellipsis.className = "pagination-ellipsis";
      ellipsis.textContent = "...";
      container.appendChild(ellipsis);
    } else {
      const pageBtn = document.createElement("button");
      pageBtn.className = "pagination-btn";
      pageBtn.textContent = num;
      if (num === currentPage) pageBtn.classList.add("active");
      pageBtn.onclick = () => changePage(num, filter);
      container.appendChild(pageBtn);
    }
  });

  // Next Button
  const nextBtn = document.createElement("button");
  nextBtn.className = "pagination-btn";
  nextBtn.innerHTML = `<i class="fas fa-chevron-right"></i>`;
  nextBtn.onclick = () => changePage(currentPage + 1, filter);
  if (currentPage === totalPages) nextBtn.disabled = true;
  container.appendChild(nextBtn);

  return container;
}

function updateSummary() {
  // This function remains unchanged
  const now = new Date();
  const summary = transactions.reduce(
    (acc, t) => {
      const date = new Date(t.date);
      const amount = t.amount;
      if (t.type === "income") {
        acc.allIn += amount;
        if (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        )
          acc.monthIn += amount;
      } else {
        acc.allOut += amount;
        if (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        )
          acc.monthOut += amount;
      }
      return acc;
    },
    { monthIn: 0, monthOut: 0, allIn: 0, allOut: 0 }
  );

  document.getElementById(
    "thisMonthIncome"
  ).textContent = `$${summary.monthIn.toFixed(2)}`;
  document.getElementById(
    "thisMonthExpense"
  ).textContent = `$${summary.monthOut.toFixed(2)}`;
  document.getElementById(
    "allTimeIncome"
  ).textContent = `$${summary.allIn.toFixed(2)}`;
  document.getElementById(
    "allTimeExpense"
  ).textContent = `$${summary.allOut.toFixed(2)}`;
}

// --- TRANSACTION LOGIC (Unchanged) ---
function preProcessTransaction(e, category) {
  e.preventDefault();
  const form = e.target;
  let details = {
    amount: 0,
    party: "",
    title: "",
    icon: "",
    color: "",
    isValid: true,
  };
  const getVal = (id) => form.querySelector(`#${id}`).value;
  const getNum = (id) => parseFloat(getVal(id));
  const setErr = (id, msg) => {
    form.querySelector(`#${id}`).textContent = msg;
    details.isValid = false;
  };
  form
    .querySelectorAll(".error-message")
    .forEach((el) => (el.textContent = ""));

  switch (category) {
    case CATEGORIES.SEND:
      const phone = getVal("sendRecipient");
      if (!/^[1-9]\d{9}$/.test(phone)) {
        setErr("sendRecipientError", "Invalid phone number.");
        break;
      }
      details = {
        ...details,
        party: `+880 ${phone}`,
        title: "Send Money",
        amount: getNum("sendAmount"),
        icon: "fas fa-paper-plane",
        color: "purple",
      };
      break;
    case CATEGORIES.REQUEST:
      details = {
        ...details,
        party: `+880 ${getVal("requestFrom")}`,
        title: "Request Money",
        amount: getNum("requestAmount"),
        icon: "fas fa-hand-holding-usd",
        color: "orange",
      };
      break;
    case CATEGORIES.ADD:
      details = {
        ...details,
        title: "Add Money",
        amount: getNum("addAmount"),
        party: "From Linked Bank",
        icon: "fas fa-plus-circle",
        color: "green",
      };
      break;
    case CATEGORIES.BILL_PAY:
      if (!selectedBiller) {
        showNotification(
          "error",
          "Selection Required",
          "Please select a biller."
        );
        details.isValid = false;
        break;
      }
      details = {
        ...details,
        title: `${selectedBiller} Bill`,
        amount: getNum("billAmount"),
        party: selectedBiller,
        icon: "fas fa-file-invoice-dollar",
        color: "gold",
      };
      break;
    case CATEGORIES.CASH_IN:
      details = {
        ...details,
        party: `Agent: +880 ${getVal("cashInAgentNumber")}`,
        title: "Cash In",
        amount: getNum("cashInAmount"),
        icon: "fas fa-arrow-down",
        color: "green",
      };
      break;
    case CATEGORIES.CASH_OUT:
      details = {
        ...details,
        party: `Agent: +880 ${getVal("cashOutAgentNumber")}`,
        title: "Cash Out",
        amount: getNum("cashOutAmount"),
        icon: "fas fa-arrow-up",
        color: "pink",
      };
      break;
    case CATEGORIES.TO_BANK:
      if (!selectedBank) {
        showNotification(
          "error",
          "Selection Required",
          "Please select a bank."
        );
        details.isValid = false;
        break;
      }
      details = {
        ...details,
        title: "Transfer to Bank",
        amount: getNum("transferToBankAmount"),
        party: selectedBank,
        icon: "fas fa-university",
        color: "blue",
      };
      break;
    case CATEGORIES.MOBILE_RECHARGE:
      details = {
        ...details,
        party: `+880 ${getVal("mobileNumber")}`,
        title: "Mobile Recharge",
        amount: getNum("rechargeAmount"),
        icon: "fas fa-mobile-alt",
        color: "pink",
      };
      break;
    case CATEGORIES.QR_PAY:
      details = {
        ...details,
        title: "QR Payment",
        amount: getNum("qrAmount"),
        party: "Merchant Payment",
        icon: "fas fa-qrcode",
        color: "purple",
      };
      break;
  }

  if (!details.isValid) return;
  if (isNaN(details.amount) || details.amount <= 0) {
    showNotification("error", "Invalid Amount", "Please enter a valid amount.");
    return;
  }

  const isExpense = [
    CATEGORIES.SEND,
    CATEGORIES.BILL_PAY,
    CATEGORIES.CASH_OUT,
    CATEGORIES.TO_BANK,
    CATEGORIES.MOBILE_RECHARGE,
    CATEGORIES.QR_PAY,
  ].includes(category);
  if (isExpense && details.amount > balance) {
    showNotification(
      "error",
      "Insufficient Balance",
      "You do not have enough funds."
    );
    return;
  }

  pendingTransactionDetails = {
    type: isExpense ? "expense" : "income",
    category,
    ...details,
  };
  document.getElementById("confirmDetailType").textContent = details.title;
  document.getElementById("confirmDetailParty").textContent = details.party;
  document.getElementById(
    "confirmDetailAmount"
  ).textContent = `$${details.amount.toFixed(2)}`;

  closeModal(form.closest(".modal").id);
  showModal("pinConfirmModal");
}

function handlePinConfirmation(e) {
  e.preventDefault();
  const pinInput = document.getElementById("pinConfirmationInput");
  if (pinInput.value !== currentUser.pin) {
    document.getElementById("pinConfirmationError").textContent =
      "Incorrect PIN.";
    return;
  }
  pinInput.value = "";
  document.getElementById("pinConfirmationError").textContent = "";
  closeModal("pinConfirmModal");

  const newTxn = {
    ...pendingTransactionDetails,
    date: new Date(),
    txnId: generateTransactionId(),
  };
  transactions.unshift(newTxn);
  if (newTxn.type === "income") balance += newTxn.amount;
  else balance -= newTxn.amount;

  saveData();
  updateUI();
  showTransactionConfirmation(newTxn);
}

function processChangePin(e) {
  e.preventDefault();
  showNotification(
    "success",
    "PIN Changed",
    "Your PIN has been updated successfully."
  );
  closeModal("changePinModal");
}

// --- MODALS & NOTIFICATIONS (Unchanged) ---
function showModal(modalId) {
  document.getElementById(modalId)?.classList.add("active");
}
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("active");
  modal.querySelector("form")?.reset();
  modal
    .querySelectorAll(".selection-item.active")
    .forEach((el) => el.classList.remove("active"));
  selectedBiller = null;
  selectedBank = null;
}
function showNotification(type, title, message) {
  const notification = document.getElementById("notification");
  const iconMap = {
    success: "fa-check-circle text-green-500",
    error: "fa-exclamation-circle text-red-500",
    info: "fa-info-circle text-velvet-purple",
  };
  document.getElementById("notificationIcon").innerHTML = `<i class="fas ${
    iconMap[type] || iconMap.info
  } text-2xl"></i>`;
  document.getElementById("notificationTitle").textContent = title;
  document.getElementById("notificationMessage").textContent = message;
  notification.classList.add("show");
  notification.classList.remove("hide");
  setTimeout(() => {
    notification.classList.remove("show");
    notification.classList.add("hide");
  }, 3000);
}
function showTransactionConfirmation(txn) {
  document.getElementById("invoiceTxnId").textContent = txn.txnId;
  document.getElementById("invoiceType").textContent = txn.title;
  document.getElementById("invoiceAmount").textContent = `${
    txn.type === "income" ? "+" : "-"
  }$${txn.amount.toFixed(2)}`;
  document.getElementById("invoiceBalance").textContent = `$${balance.toFixed(
    2
  )}`;
  showModal("transactionConfirmModal");
}
function showAdClickModal(title, msg) {
  document.getElementById("adModalTitle").textContent = title;
  document.getElementById("adModalMessage").textContent = msg;
  showModal("adClickModal");
}
function showSignup() {
  underMaintenance("Sign Up");
}
function underMaintenance(feature) {
  showNotification(
    "info",
    "Coming Soon",
    `${feature} feature is under development.`
  );
}
function showNotifications() {
  underMaintenance("Notifications");
}

// --- HELPERS & UTILITIES (Unchanged) ---
function selectBank(event, bank) {
  selectedBank = bank;
  highlightSelection(event);
}
function selectBiller(event, biller) {
  selectedBiller = biller;
  highlightSelection(event);
}
function highlightSelection(event) {
  event.currentTarget.parentElement
    .querySelectorAll(".selection-item.active")
    .forEach((el) => el.classList.remove("active"));
  event.currentTarget.classList.add("active");
}
function switchOfferTab(tabName) {
  document
    .querySelectorAll(".offer-tab-btn, .offer-tab-content")
    .forEach((el) => el.classList.remove("active"));
  document.getElementById(`${tabName}OffersBtn`)?.classList.add("active");
  document.getElementById(`${tabName}OffersContent`)?.classList.add("active");
}
function updateClock() {
  const now = new Date();
  const hour = now.getHours();
  let greeting = "Good Morning";
  if (hour >= 12 && hour < 17) {
    greeting = "Good Afternoon";
  } else if (hour >= 17 || hour < 4) {
    greeting = "Good Evening";
  } // Evening until 4 AM
  document.querySelector("#mainApp p.text-sm.opacity-80").textContent =
    greeting;
  document.getElementById("realTimeClock").textContent = now.toLocaleTimeString(
    "en-US",
    { hour: "2-digit", minute: "2-digit" }
  );
}
function formatTime(date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function groupTransactionsByDate(transactions) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  return transactions.reduce((acc, txn) => {
    const txnDate = new Date(txn.date);
    let key;
    if (isSameDay(txnDate, today)) key = "Today";
    else if (isSameDay(txnDate, yesterday)) key = "Yesterday";
    else
      key = txnDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    if (!acc[key]) acc[key] = [];
    acc[key].push(txn);
    return acc;
  }, {});
}
function generateTransactionId() {
  return (
    "RC" + Date.now().toString().slice(-8) + Math.floor(Math.random() * 10)
  );
}

// --- DATA PERSISTENCE (Unchanged) ---
function saveData() {
  localStorage.setItem("rcash_data", JSON.stringify({ balance, transactions }));
}
function loadData() {
  const data = JSON.parse(localStorage.getItem("rcash_data"));
  if (data && data.transactions && data.transactions.length > 10) {
    balance = data.balance;
    transactions = data.transactions.map((t) => ({
      ...t,
      date: new Date(t.date),
    }));
  } else {
    initializeDefaultData();
  }
}

// --- MODIFIED: Dummy data generation is still here ---
function initializeDefaultData() {
  balance = 25458.75;
  const dummyTxnTemplates = [
    {
      type: "expense",
      category: CATEGORIES.BILL_PAY,
      title: "Internet Bill",
      party: "Link3",
      amount: 1250.0,
      icon: "fas fa-wifi",
      color: "blue",
    },
    {
      type: "income",
      category: CATEGORIES.SEND,
      title: "Salary Deposit",
      party: "From ACME Corp",
      amount: 45000.0,
      icon: "fas fa-arrow-down",
      color: "green",
    },
    {
      type: "expense",
      category: CATEGORIES.SEND,
      title: "Sent Money",
      party: "To Father",
      amount: 5000.0,
      icon: "fas fa-paper-plane",
      color: "purple",
    },
    {
      type: "income",
      category: CATEGORIES.CASH_IN,
      title: "Cash In",
      party: "Agent Point",
      amount: 10000.0,
      icon: "fas fa-arrow-down",
      color: "green",
    },
    {
      type: "expense",
      category: CATEGORIES.MOBILE_RECHARGE,
      title: "Mobile Recharge",
      party: "+8801711223344",
      amount: 100.0,
      icon: "fas fa-mobile-alt",
      color: "pink",
    },
    {
      type: "expense",
      category: CATEGORIES.QR_PAY,
      title: "Groceries",
      party: "Agora Super Shop",
      amount: 2570.5,
      icon: "fas fa-shopping-cart",
      color: "orange",
    },
    {
      type: "expense",
      category: CATEGORIES.CASH_OUT,
      title: "Cash Out",
      party: "Agent Point",
      amount: 2000.0,
      icon: "fas fa-arrow-up",
      color: "redish",
    },
  ];

  let generatedTransactions = [];
  for (let i = 0; i < 50; i++) {
    const template = dummyTxnTemplates[i % dummyTxnTemplates.length];
    const newTxn = { ...template };
    newTxn.amount = parseFloat(
      (template.amount * (0.8 + Math.random() * 0.4)).toFixed(2)
    );
    newTxn.date = new Date(
      Date.now() - (i * 86400000) / 2 - Math.random() * 43200000
    ); // spread over last ~25 days
    newTxn.txnId = generateTransactionId();
    generatedTransactions.push(newTxn);
  }

  transactions = generatedTransactions;
  saveData();
}

// --- CAROUSEL (Unchanged) ---
function startCarousel() {
  stopCarousel();
  const carouselEl = document.getElementById("adCarousel");
  if (!carouselEl) return;
  const slides = carouselEl.children;
  if (slides.length <= 1) return;
  let currentSlide = 0;
  const showSlide = (index) => {
    carouselEl.style.transform = `translateX(-${index * 100}%)`;
    document
      .querySelectorAll(".carousel-dot")
      .forEach((dot, i) => dot.classList.toggle("active", i === index));
  };
  const nextSlide = () => {
    currentSlide = (currentSlide + 1) % slides.length;
    showSlide(currentSlide);
  };
  autoSlideInterval = setInterval(nextSlide, 5000);
  showSlide(0);
}
function stopCarousel() {
  clearInterval(autoSlideInterval);
}
