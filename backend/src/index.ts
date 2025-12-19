import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";

const app = express();
const PORT = 4000;
const DATA_FILE = path.join(__dirname, "../data/quotes.json");

app.use(cors());
app.use(express.json());

// Helper functions
const readQuotes = async () => {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const writeQuotes = async (quotes) => {
  await fs.writeFile(DATA_FILE, JSON.stringify(quotes, null, 2));
};

// Routes
app.get("/", (req, res) => res.send("Backend running!"));

app.get("/quotes", async (req, res) => {
  const quotes = await readQuotes();
  res.json(quotes);
});

app.post("/quotes", async (req, res) => {
  const newQuote = {
    ...req.body,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };

  const quotes = await readQuotes();
  quotes.unshift(newQuote);
  await writeQuotes(quotes);

  res.status(201).json(newQuote);
});

app.delete("/quotes/:id", async (req, res) => {
  const quotes = await readQuotes();
  const filtered = quotes.filter((q) => q.id !== req.params.id);

  if (filtered.length === quotes.length) {
    return res.status(404).json({ error: "Not found" });
  }

  await writeQuotes(filtered);
  res.status(204).send();
});

app.listen(PORT, () => console.log(`Server at http://localhost:${PORT}`));
