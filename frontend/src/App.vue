<script setup lang="ts">
import { reactive, ref, onMounted, computed } from "vue";

const API = "http://localhost:4000";

const form = reactive({
  cost: 26906,
  profit: 1500,
  sellingPrice: 28406,
  term: 36,
  rate: 5.7,
  outOfPocket: 2000,
  taxRate: 7.5,
  quoteName: "2025 Ford Escape",
});

const result = reactive({
  taxes: 0,
  baseLoanAmount: 0,
  interest: 0,
  totalLoanAmount: 0,
  payment: 0,
});

const savedQuotes = ref([]);

// Utility functions
const num = (v) => (typeof v === "number" ? v : 0);
const round = (v) => Math.round(v * 100) / 100;
const currency = (v) => (num(v) || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

// Calculate results
const applyQuote = () => {
  const selling = num(form.sellingPrice);
  const taxRate = num(form.taxRate) / 100;
  const yearlyRate = num(form.rate) / 100;
  const term = num(form.term);
  const down = num(form.outOfPocket);

  result.taxes = round(selling * taxRate);
  result.baseLoanAmount = round(selling + result.taxes - down);

  const monthlyRate = yearlyRate / 12;
  if (term <= 0 || result.baseLoanAmount <= 0) {
    result.payment = 0;
  } else if (monthlyRate === 0) {
    result.payment = round(result.baseLoanAmount / term);
  } else {
    const factor = Math.pow(1 + monthlyRate, -term);
    result.payment = round((result.baseLoanAmount * monthlyRate) / (1 - factor));
  }

  result.totalLoanAmount = round(result.payment * term);
  result.interest = round(result.totalLoanAmount - result.baseLoanAmount);
};

// Update selling price when cost/profit changes
const updateSelling = () => {
  form.sellingPrice = round(num(form.cost) + num(form.profit));
};

const updateProfit = () => {
  form.profit = round(num(form.sellingPrice) - num(form.cost));
};

// API calls
const fetchQuotes = async () => {
  try {
    const res = await fetch(`${API}/quotes`);
    savedQuotes.value = res.ok ? await res.json() : [];
  } catch (e) {
    console.error("Load failed", e);
  }
};

const saveQuote = async () => {
  try {
    const res = await fetch(`${API}/quotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ...result }),
    });
    if (res.ok) {
      const saved = await res.json();
      savedQuotes.value.unshift(saved);
    }
  } catch (e) {
    console.error("Save failed", e);
  }
};

const deleteQuote = async (id) => {
  try {
    await fetch(`${API}/quotes/${id}`, { method: "DELETE" });
    savedQuotes.value = savedQuotes.value.filter((q) => q.id !== id);
  } catch (e) {
    console.error("Delete failed", e);
  }
};

const viewQuote = (quote) => {
  Object.assign(form, quote);
  Object.assign(result, quote);
};

onMounted(fetchQuotes);
</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="logo">xDeskPro</div>
    </header>

    <main class="app-main">
      <div class="card-grid">
        <!-- Finance Quote Form -->
        <section class="card">
          <h2>Finance Quote</h2>
          
          <div class="form-row">
            <label>Cost:</label>
            <div class="input-wrapper">
              <span class="prefix">$</span>
              <input type="number" v-model.number="form.cost" step="0.01" @input="updateSelling" />
            </div>
          </div>

          <div class="form-row">
            <label>Profit:</label>
            <div class="input-wrapper">
              <span class="prefix">$</span>
              <input type="number" v-model.number="form.profit" step="0.01" @input="updateSelling" />
            </div>
          </div>

          <div class="form-row">
            <label>Selling Price:</label>
            <div class="input-wrapper">
              <span class="prefix">$</span>
              <input type="number" v-model.number="form.sellingPrice" step="0.01" @input="updateProfit" />
            </div>
          </div>

          <div class="form-row">
            <label>Term:</label>
            <div class="input-wrapper">
              <input type="number" v-model.number="form.term" />
              <span class="suffix">Months</span>
            </div>
          </div>

          <div class="form-row">
            <label>Rate:</label>
            <div class="input-wrapper">
              <input type="number" v-model.number="form.rate" step="0.01" />
              <span class="suffix">%</span>
            </div>
          </div>

          <div class="form-row">
            <label>Out Of Pocket:</label>
            <div class="input-wrapper">
              <span class="prefix">$</span>
              <input type="number" v-model.number="form.outOfPocket" step="0.01" />
            </div>
          </div>

          <div class="form-row">
            <label>Tax Rate:</label>
            <div class="input-wrapper">
              <input type="number" v-model.number="form.taxRate" step="0.01" />
              <span class="suffix">%</span>
            </div>
          </div>

          <div class="actions">
            <button class="primary" @click="applyQuote">Apply</button>
          </div>
        </section>

        <!-- Result -->
        <section class="card">
          <h2>Result</h2>
          
          <div class="result-row">
            <span>Taxes:</span>
            <span>{{ currency(result.taxes) }}</span>
          </div>
          <div class="result-row">
            <span>Base Loan:</span>
            <span>{{ currency(result.baseLoanAmount) }}</span>
          </div>
          <div class="result-row">
            <span>Interest:</span>
            <span>{{ currency(result.interest) }}</span>
          </div>
          <div class="result-row">
            <span>Total Loan:</span>
            <span>{{ currency(result.totalLoanAmount) }}</span>
          </div>
          <div class="result-row highlight">
            <span>Payment:</span>
            <span>{{ currency(result.payment) }}</span>
          </div>
          <div class="result-row">
            <span>Down Payment:</span>
            <span>{{ currency(form.outOfPocket) }}</span>
          </div>

          <div class="form-row">
            <label>Quote Name:</label>
            <input type="text" v-model="form.quoteName" />
          </div>

          <div class="actions">
            <button class="primary" @click="saveQuote">Save</button>
          </div>
        </section>
      </div>

      <!-- Saved Quotes -->
      <section class="card saved">
        <h2>Saved Quotes</h2>
        
        <div v-for="quote in savedQuotes" :key="quote.id" class="saved-quote">
          <div class="saved-main">
            <div class="saved-title">{{ quote.quoteName }}</div>
            <div class="saved-details">
              <span>Payment: {{ currency(quote.payment) }}</span>
              <span>Down: {{ currency(quote.outOfPocket) }}</span>
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
