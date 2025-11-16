<script setup lang="ts">
import { reactive, ref, onMounted } from "vue";

const API_BASE = "http://localhost:4000";

/* ---------- Types ---------- */

interface QuoteForm {
  cost: number | null;
  profit: number | null;
  sellingPrice: number | null;
  term: number | null;        // in months
  rate: number | null;        // APR %
  outOfPocket: number | null; // down payment
  taxRate: number | null;     // %
  quoteName: string;
}

interface QuoteResult {
  taxes: number;
  baseLoanAmount: number;
  interest: number;
  totalLoanAmount: number;
  payment: number;
}

interface SavedQuote extends QuoteForm, QuoteResult {
  id: string;
  createdAt?: string; // backend adds this
}

/* ---------- State ---------- */

// initial form values
const form = reactive<QuoteForm>({
  cost: 26906,
  profit: 1500,
  sellingPrice: 28406,
  term: 36,
  rate: 5.7,
  outOfPocket: 2000,
  taxRate: 7.5,
  quoteName: "2025 Ford Escape",
});

// initial result values (will be recalculated on Apply)
const result = reactive<QuoteResult>({
  taxes: 2130.45,
  baseLoanAmount: 30536.45,
  interest: 1740.58,
  totalLoanAmount: 30277.03,
  payment: 841.03,
});

// saved quotes loaded from backend
const savedQuotes = ref<SavedQuote[]>([]);

/* ---------- Helpers ---------- */

function safeNum(value: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return value;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatCurrency(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "$0.00";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/* ---------- Sync cost / profit / sellingPrice ---------- */

function updateSellingFromCostAndProfit() {
  const cost = safeNum(form.cost);
  const profit = safeNum(form.profit);
  form.sellingPrice = round2(cost + profit);
}

function updateProfitFromCostAndSelling() {
  const cost = safeNum(form.cost);
  const selling = safeNum(form.sellingPrice);
  form.profit = round2(selling - cost);
}

function onCostChange() {
  updateSellingFromCostAndProfit();
}

function onProfitChange() {
  updateSellingFromCostAndProfit();
}

function onSellingPriceChange() {
  updateProfitFromCostAndSelling();
}

/* ---------- Finance calculation (Apply) ---------- */

function applyQuote() {
  const selling = safeNum(form.sellingPrice);
  const taxRate = safeNum(form.taxRate) / 100; // percent to decimal
  const yearlyRate = safeNum(form.rate) / 100;
  const termMonths = safeNum(form.term);
  const outOfPocket = safeNum(form.outOfPocket);

  // 1) taxes on the selling price
  const taxes = round2(selling * taxRate);

  // 2) base loan amount (what you're actually financing)
  const baseLoanAmount = round2(selling + taxes - outOfPocket);

  // 3) monthly interest rate
  const monthlyRate = yearlyRate / 12;

  // 4) monthly payment
  let payment = 0;
  if (termMonths <= 0 || baseLoanAmount <= 0) {
    payment = 0;
  } else if (monthlyRate === 0) {
    // no interest case
    payment = round2(baseLoanAmount / termMonths);
  } else {
    const factor = Math.pow(1 + monthlyRate, -termMonths);
    payment = round2((baseLoanAmount * monthlyRate) / (1 - factor));
  }

  // 5) total loan and interest
  const totalLoanAmount = round2(payment * termMonths);
  const interest = round2(totalLoanAmount - baseLoanAmount);

  // 6) write results into the reactive object
  result.taxes = taxes;
  result.baseLoanAmount = baseLoanAmount;
  result.payment = payment;
  result.totalLoanAmount = totalLoanAmount;
  result.interest = interest;
}

/* ---------- Backend API calls ---------- */

async function fetchQuotes() {
  try {
    const res = await fetch(`${API_BASE}/quotes`);
    if (!res.ok) {
      console.error("Failed to load quotes");
      return;
    }
    const data = (await res.json()) as SavedQuote[];
    savedQuotes.value = data;
  } catch (err) {
    console.error("Error loading quotes", err);
  }
}

async function saveQuote() {
  try {
    const payload = {
      ...form,
      ...result,
    };

    const res = await fetch(`${API_BASE}/quotes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error("Failed to save quote");
      return;
    }

    const saved = (await res.json()) as SavedQuote;
    // add new quote to the top of the list
    savedQuotes.value.unshift(saved);
  } catch (err) {
    console.error("Error saving quote", err);
  }
}

async function deleteQuote(id: string) {
  try {
    const res = await fetch(`${API_BASE}/quotes/${id}`, {
      method: "DELETE",
    });

    if (!res.ok && res.status !== 204) {
      console.error("Failed to delete quote");
      return;
    }

    savedQuotes.value = savedQuotes.value.filter((q) => q.id !== id);
  } catch (err) {
    console.error("Error deleting quote", err);
  }
}

function viewQuote(quote: SavedQuote) {
  // load the selected quote into the form and result panels
  form.cost = quote.cost;
  form.profit = quote.profit;
  form.sellingPrice = quote.sellingPrice;
  form.term = quote.term;
  form.rate = quote.rate;
  form.outOfPocket = quote.outOfPocket;
  form.taxRate = quote.taxRate;
  form.quoteName = quote.quoteName;

  result.taxes = quote.taxes;
  result.baseLoanAmount = quote.baseLoanAmount;
  result.interest = quote.interest;
  result.totalLoanAmount = quote.totalLoanAmount;
  result.payment = quote.payment;
}

/* ---------- Load quotes on mount ---------- */

onMounted(() => {
  fetchQuotes();
});
</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="logo">xDeskPro</div>
    </header>

    <main class="app-main">
      <div class="card-grid">
        <!-- Left: Finance Quote form -->
        <section class="card">
          <h2>Finance Quote</h2>

          <div class="form-row">
            <label>Cost:</label>
            <div class="input-wrapper">
              <span class="prefix">$</span>
              <input
                type="number"
                v-model.number="form.cost"
                step="0.01"
                @input="onCostChange"
              />
            </div>
          </div>

          <div class="form-row">
            <label>Profit:</label>
            <div class="input-wrapper">
              <span class="prefix">$</span>
              <input
                type="number"
                v-model.number="form.profit"
                step="0.01"
                @input="onProfitChange"
              />
            </div>
          </div>

          <div class="form-row">
            <label>Selling Price:</label>
            <div class="input-wrapper">
              <span class="prefix">$</span>
              <input
                type="number"
                v-model.number="form.sellingPrice"
                step="0.01"
                @input="onSellingPriceChange"
              />
            </div>
          </div>

          <div class="form-row">
            <label>Term:</label>
            <div class="input-wrapper">
              <input
                type="number"
                v-model.number="form.term"
              />
              <span class="suffix">Months</span>
            </div>
          </div>

          <div class="form-row">
            <label>Rate:</label>
            <div class="input-wrapper">
              <input
                type="number"
                v-model.number="form.rate"
                step="0.01"
              />
              <span class="suffix">%</span>
            </div>
          </div>

          <div class="form-row">
            <label>Out Of Pocket:</label>
            <div class="input-wrapper">
              <span class="prefix">$</span>
              <input
                type="number"
                v-model.number="form.outOfPocket"
                step="0.01"
              />
            </div>
          </div>

          <div class="form-row">
            <label>Tax Rate:</label>
            <div class="input-wrapper">
              <input
                type="number"
                v-model.number="form.taxRate"
                step="0.01"
              />
              <span class="suffix">%</span>
            </div>
          </div>

          <div class="actions">
            <button class="primary" @click="applyQuote">Apply</button>
          </div>
        </section>

        <!-- Right: Result panel -->
        <section class="card">
          <h2>Result</h2>

          <div class="result-row">
            <span>Taxes:</span>
            <span>{{ formatCurrency(result.taxes) }}</span>
          </div>
          <div class="result-row">
            <span>Base Loan Amount:</span>
            <span>{{ formatCurrency(result.baseLoanAmount) }}</span>
          </div>
          <div class="result-row">
            <span>Interest:</span>
            <span>{{ formatCurrency(result.interest) }}</span>
          </div>
          <div class="result-row">
            <span>Total Loan Amount:</span>
            <span>{{ formatCurrency(result.totalLoanAmount) }}</span>
          </div>
          <div class="result-row highlight">
            <span>Payment:</span>
            <span>{{ formatCurrency(result.payment) }}</span>
          </div>
          <div class="result-row">
            <span>Out Of Pocket:</span>
            <span>{{ formatCurrency(form.outOfPocket) }}</span>
          </div>

          <div class="form-row">
            <label>Quote Name:</label>
            <input
              type="text"
              v-model="form.quoteName"
            />
          </div>

          <div class="actions">
            <button class="primary" @click="saveQuote">Save</button>
          </div>
        </section>
      </div>

      <!-- Saved Quotes -->
      <section class="card saved">
        <h2>Saved Quotes</h2>

        <div
          v-for="quote in savedQuotes"
          :key="quote.id"
          class="saved-quote"
        >
          <div class="saved-main">
            <div class="saved-title">{{ quote.quoteName }}</div>
            <div class="saved-details">
              <span>Payment: {{ formatCurrency(quote.payment) }}</span>
              <span>
                Out of Pocket:
                <strong>{{ formatCurrency(quote.outOfPocket) }}</strong>
              </span>
            </div>
          </div>
          <div class="saved-actions">
            <button @click="viewQuote(quote)">View</button>
            <button class="danger" @click="deleteQuote(quote.id)">Delete</button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: #f3f4f6;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

.app-header {
  background: #111827;
  color: white;
  padding: 12px 24px;
  display: flex;
  align-items: center;
}

.logo {
  font-weight: 600;
  font-size: 18px;
}

.app-main {
  padding: 24px;
  max-width: 1120px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 16px 20px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  border: 1px solid #e5e7eb;
}

.card h2 {
  font-size: 18px;
  margin-bottom: 12px;
}

.form-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 8px;
}

.form-row label {
  width: 130px;
  font-size: 14px;
}

.input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #f9fafb;
  padding: 0 8px;
}

.input-wrapper input {
  border: none;
  background: transparent;
  padding: 6px 4px;
  flex: 1;
  font-size: 14px;
  outline: none;
}

.prefix,
.suffix {
  font-size: 13px;
  color: #6b7280;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

button {
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 14px;
  cursor: pointer;
}

button.primary {
  background: #111827;
  color: white;
}

button.danger {
  background: #ef4444;
  color: white;
}

.result-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 14px;
}

.result-row.highlight span:last-child {
  font-weight: 600;
}

.saved {
  margin-top: 8px;
}

.saved-quote {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid #e5e7eb;
}

.saved-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.saved-title {
  font-weight: 600;
}

.saved-details {
  font-size: 14px;
  display: flex;
  gap: 16px;
}

.saved-actions {
  display: flex;
  gap: 8px;
}
</style>
