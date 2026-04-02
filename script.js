// ================================
// DOM Elements
// ================================
const roleSelect = document.getElementById("roleSelect");
const addBtn = document.getElementById("addBtn");
const modal = document.getElementById("modal");

const cat = document.getElementById("cat");
const amt = document.getElementById("amt");
const type = document.getElementById("type");

const transactionTable = document.getElementById("transactionTable");
const emptyState = document.getElementById("emptyState");

const balanceCard = document.getElementById("balanceCard");
const incomeCard = document.getElementById("incomeCard");
const expenseCard = document.getElementById("expenseCard");

const search = document.getElementById("search");
const filterType = document.getElementById("filterType");

const lineChartCanvas = document.getElementById("lineChart");
const pieChartCanvas = document.getElementById("pieChart");

const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const badgesPreview = document.getElementById("badgesPreview");
const modalTitle = document.getElementById("modalTitle");

const exportBtn = document.getElementById("exportBtn");

let role = "viewer";
let editIndex = null;

// Load transactions from localStorage
let transactions = JSON.parse(localStorage.getItem("tx")) || [];

// ================================
// Role Switch
// ================================
roleSelect.onchange = (e) => {
  role = e.target.value;
  updateUI();
};

// ================================
// Modal Handlers
// ================================
addBtn.onclick = () => {
  if (role !== "admin") { alert("Admin only"); return; }
  openModalForAdd();
};

cancelBtn.onclick = () => closeModal();

saveBtn.onclick = () => saveTransaction();

function openModalForAdd() {
  modal.classList.remove("hidden");
  modalTitle.textContent = "Add Transaction";
  clearForm();
  updateBadges();
  cat.focus();
  editIndex = null;
}

function openModalForEdit(index) {
  modal.classList.remove("hidden");
  modalTitle.textContent = "Edit Transaction";
  const t = transactions[index];
  cat.value = t.category;
  amt.value = t.amount;
  type.value = t.type;
  updateBadges();
  editIndex = index;
  cat.focus();
}

function closeModal() {
  modal.classList.add("hidden");
  clearForm();
  editIndex = null;
}

function clearForm() {
  cat.value = "";
  amt.value = "";
  type.value = "income";
  badgesPreview.style.display = "none";
}

// ================================
// Badges Preview
// ================================
type.onchange = updateBadges;

function updateBadges() {
  if (type.value === "income") badgesPreview.innerHTML = `<span class="badge income-badge">Income</span>`;
  else if (type.value === "expense") badgesPreview.innerHTML = `<span class="badge expense-badge">Expense</span>`;
  else badgesPreview.innerHTML = "";
  badgesPreview.style.display = badgesPreview.innerHTML ? "flex" : "none";
}

// ================================
// Add/Edit Transaction
// ================================
function saveTransaction() {
  const category = cat.value.trim();
  const amount = parseFloat(amt.value);
  const tType = type.value;

  if (!category || isNaN(amount) || amount <= 0) {
    alert("Please enter valid category and amount.");
    return;
  }

  const transactionData = {
    id: editIndex !== null ? transactions[editIndex].id : Date.now(),
    date: new Date().toISOString().split("T")[0],
    category,
    amount,
    type: tType,
  };

  if (editIndex !== null) transactions[editIndex] = transactionData;
  else transactions.push(transactionData);

  saveToStorage();
  render();
  closeModal();
}

// ================================
// Edit/Delete Transaction
// ================================
function editTransaction(id) {
  if (role !== "admin") return alert("Admin only");
  const index = transactions.findIndex(t => t.id === id);
  if (index !== -1) openModalForEdit(index);
}

function deleteTransaction(id) {
  if (role !== "admin") return alert("Admin only");
  const index = transactions.findIndex(t => t.id === id);
  if (index === -1) return;
  if (confirm("Delete this transaction?")) {
    transactions.splice(index, 1);
    saveToStorage();
    render();
  }
}

// ================================
// Save to localStorage
// ================================
function saveToStorage() {
  localStorage.setItem("tx", JSON.stringify(transactions));
}

// ================================
// Render Table
// ================================
function renderTable(data) {
  transactionTable.innerHTML = "";
  if (data.length === 0) {
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  data.forEach(t => {
    transactionTable.innerHTML += `
      <tr>
        <td>${t.date}</td>
        <td>${t.category}</td>
        <td>₹${t.amount.toFixed(2)}</td>
        <td>${t.type}</td>
        <td>
          <button onclick="editTransaction(${t.id})" ${role !== "admin" ? "disabled" : ""}>✏️</button>
          <button onclick="deleteTransaction(${t.id})" ${role !== "admin" ? "disabled" : ""}>🗑</button>
        </td>
      </tr>
    `;
  });
}

// ================================
// Summary Cards
// ================================
function updateSummary() {
  let income = 0, expense = 0;
  transactions.forEach(t => t.type === "income" ? income += t.amount : expense += t.amount);
  balanceCard.innerText = `Balance: ₹${(income - expense).toFixed(2)}`;
  incomeCard.innerText = `Income: ₹${income.toFixed(2)}`;
  expenseCard.innerText = `Expenses: ₹${expense.toFixed(2)}`;
}

// ================================
// Insights
// ================================
function updateInsights() {
  const insights = document.getElementById("insights");
  if (transactions.length === 0) { insights.innerHTML = "No insights available"; return; }

  const expensesByCategory = {};
  transactions.forEach(t => { if(t.type==='expense') expensesByCategory[t.category]=(expensesByCategory[t.category]||0)+t.amount; });
  const topSpending = Object.entries(expensesByCategory).sort((a,b)=>b[1]-a[1])[0];

  const total = transactions.reduce((sum,t)=>sum+t.amount,0);
  const avg = (total/transactions.length).toFixed(2);

  insights.innerHTML = `
    <p>🔥 Top Spending: ${topSpending ? topSpending[0] : "N/A"}</p>
    <p>📊 Total Transactions: ${transactions.length}</p>
    <p>💰 Avg Transaction: ₹${avg}</p>
  `;
}

// ================================
// Filter / Search
// ================================
search.oninput = filterData;
filterType.onchange = filterData;

function filterData() {
  const s = search.value.toLowerCase();
  const f = filterType.value;
  let filtered = transactions.filter(t => t.category.toLowerCase().includes(s));
  if (f !== "all") filtered = filtered.filter(t => t.type===f);
  renderTable(filtered);
  updateSummary();
  updateInsights();
  renderCharts(filtered);
}

// ================================
// Charts
// ================================
let lineChart, pieChart;

function renderCharts(data=transactions) {
  if(lineChart) lineChart.destroy();
  if(pieChart) pieChart.destroy();

  // Line Chart
  lineChart = new Chart(lineChartCanvas,{
    type:'line',
    data:{
      labels:data.map(t=>t.date),
      datasets:[{
        label:'Transaction Amount (₹)',
        data:data.map(t=>t.amount),
        borderColor:'#6366f1',
        backgroundColor:'rgba(99,102,241,0.2)',
        fill:true,
        tension:0.4,
        pointBackgroundColor:'#4f46e5',
        pointRadius:6,
        pointHoverRadius:8
      }]
    },
    options:{
      responsive:true,
      plugins:{
        legend:{ display:true, position:'top'},
        tooltip:{ callbacks:{ label: ctx=>`₹${ctx.raw}` } }
      },
      scales:{
        x:{ title:{ display:true, text:'Date', font:{ size:14, weight:'bold' } } },
        y:{ title:{ display:true, text:'Amount (₹)', font:{ size:14, weight:'bold' } }, beginAtZero:true }
      }
    }
  });

  // Pie Chart
  const categoryTotals = {};
  data.forEach(t => categoryTotals[t.category]=(categoryTotals[t.category]||0)+t.amount);

  pieChart = new Chart(pieChartCanvas,{
    type:'pie',
    data:{
      labels:Object.keys(categoryTotals),
      datasets:[{
        data:Object.values(categoryTotals),
        backgroundColor:Object.keys(categoryTotals).map(()=>`hsl(${Math.random()*360},70%,60%)`)
      }]
    },
    options:{
      responsive:true,
      plugins:{
        legend:{ position:'right', labels:{ font:{ size:14 } } },
        tooltip:{
          callbacks:{
            label: ctx=>{
              const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
              const val = ctx.raw;
              const percent = ((val/total)*100).toFixed(1);
              return `${ctx.label}: ₹${val} (${percent}%)`;
            }
          }
        }
      }
    }
  });
}

// ================================
// Update UI / Role
// ================================
function updateUI() {
  addBtn.disabled = role!=='admin';
  render();
}

// ================================
// Dark Mode
// ================================
const toggle = document.getElementById("themeToggle");
if(localStorage.getItem("theme")==='dark'){ document.body.classList.add("dark"); toggle.innerText="☀️"; }

toggle.onclick = ()=>{
  document.body.classList.toggle("dark");
  if(document.body.classList.contains("dark")){
    localStorage.setItem("theme","dark"); toggle.innerText="☀️";
  }else{
    localStorage.setItem("theme","light"); toggle.innerText="🌙";
  }
};

// ================================
// Export CSV
// ================================
exportBtn.onclick = ()=>{
  if(transactions.length===0){ alert("No transactions to export!"); return; }

  const headers = ["ID","Date","Category","Amount","Type"];
  const rows = transactions.map(t=>[t.id,t.date,t.category,t.amount,t.type]);
  let csvContent = headers.join(",") + "\n";
  rows.forEach(r=>{ csvContent+=r.join(",")+"\n"; });

  const blob = new Blob([csvContent], { type:"text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href=url;
  link.setAttribute("download", `transactions_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ================================
// Initial Render
// ================================
render();

function render(){ filterData(); }