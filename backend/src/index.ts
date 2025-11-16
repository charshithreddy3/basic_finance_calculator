import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// ---- Types ----
interface Quote {
  id: string;
  cost: number;
  profit: number;
  sellingPrice: number;
  term: number;
  rate: number;
  outOfPocket: number;
  taxRate: number;
  quoteName: string;

  taxes: number;
  baseLoanAmount: number;
  interest: number;
  totalLoanAmount: number;
  payment: number;

  createdAt: string;
}

// ---- Simple file storage ----
const DATA_FILE = path.join(__dirname, "../data/quotes.json");

async function readQuotes(): Promise<Quote[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as Quote[];
  } catch (err: any) {
    // if file missing or invalid, just start with empty list
    console.error("readQuotes error:", err.message);
    return [];
  }
}

async function writeQuotes(quotes: Quote[]): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(quotes, null, 2), "utf-8");
}

// ---- Routes ----

// health check
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// GET /quotes - list all saved quotes
app.get("/quotes", async (req, res) => {
  const quotes = await readQuotes();
  res.json(quotes);
});

// POST /quotes - save a new quote
app.post("/quotes", async (req, res) => {
  const body = req.body as Omit<Quote, "id" | "createdAt">;

  const newQuote: Quote = {
    ...body,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };

  const quotes = await readQuotes();
  quotes.unshift(newQuote);
  await writeQuotes(quotes);

  res.status(201).json(newQuote);
});

// DELETE /quotes/:id - delete a quote
app.delete("/quotes/:id", async (req, res) => {
  const id = req.params.id;
  const quotes = await readQuotes();
  const filtered = quotes.filter((q) => q.id !== id);

  if (filtered.length === quotes.length) {
    return res.status(404).json({ message: "Quote not found" });
  }

  await writeQuotes(filtered);
  res.status(204).send();
});

// ---- Start server ----
app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
