const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

// just a comment
const app = express();
const PORT = 6969;
const DATA_FILE = path.join(__dirname, "data.json");

app.use(cors());
app.use(express.json());

const readDB = () => {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = { members: [], expenses: [], debts: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  const data = fs.readFileSync(DATA_FILE, "utf8");
  return JSON.parse(data);
};

const writeDB = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// --- ROUTES ---

// 1. Add Member
app.post("/members", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  const db = readDB();

  // Check for duplicates as per requirements
  const exists = db.members.some((m) => m.toLowerCase() === name.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "Member already exists" });
  }

  db.members.push(name);
  writeDB(db);
  res.status(201).json({ message: "Member added", members: db.members });
});

// 2. Get Members 
app.get("/members", (req, res) => {
  const db = readDB();
  res.json(db.members);
});

// 3. Add Expense & Calculate Debts
app.post("/expenses", (req, res) => {
  const { paidBy, amount, description } = req.body;
  const db = readDB();

  if (db.members.length < 2) {
    return res
      .status(400)
      .json({ error: "Need at least 2 members to share expenses." });
  }

  // 1. Record the Transaction [cite: 13]
  const newExpense = {
    id: Date.now(),
    paidBy,
    amount: parseFloat(amount),
    description,
    date: new Date().toISOString(),
  };
  db.expenses.push(newExpense);

  // 2. Calculate the Split
  const splitAmount = newExpense.amount / db.members.length;

  // 3. Update Pair-wise Debts
  db.members.forEach((member) => {
    if (member !== paidBy) {
      // Find existing debt relation or create new one
      // We store debts as: { ower: "A", receiver: "B", amount: 10 }
      let debtRecord = db.debts.find(
        (d) => d.ower === member && d.receiver === paidBy,
      );

      if (debtRecord) {
        debtRecord.amount += splitAmount;
      } else {
        db.debts.push({ ower: member, receiver: paidBy, amount: splitAmount });
      }
    }
  });

  // 4. Internal Cancellation (The "Netting" Logic) [cite: 11, 15]
  // If A owes B $10 and B owes A $5, result should be A owes B $5.
  db.debts.forEach((d1, index) => {
    const d2 = db.debts.find(
      (d) => d.ower === d1.receiver && d.receiver === d1.ower,
    );
    if (d2) {
      if (d1.amount > d2.amount) {
        d1.amount -= d2.amount;
        d2.amount = 0;
      } else {
        d2.amount -= d1.amount;
        d1.amount = 0;
      }
    }
  });

  // Clean up zero-debts to keep the JSON tidy
  db.debts = db.debts.filter((d) => d.amount > 0);

  writeDB(db);
  res
    .status(201)
    .json({ message: "Expense added and debts updated", expense: newExpense });
});
// 5. Get All Expenses (Transaction History)
app.get("/expenses", (req, res) => {
  const db = readDB();
  res.json(db.expenses); // Requirement: Transaction history [cite: 18]
});

// 6. Get All Debts (Dashboard View)
app.get("/debts", (req, res) => {
  const db = readDB();
  res.json(db.debts); // Requirement: Pair-wise debts [cite: 16]
});

// 7. Get Debts for a Specific Member (Filter View)
app.get("/debts/:memberName", (req, res) => {
  const { memberName } = req.params;
  const db = readDB();

  // Requirement: Member filter view [cite: 17]
  const individualDebts = db.debts.filter(
    (d) => d.ower === memberName || d.receiver === memberName,
  );

  res.json(individualDebts);
});

// Default Route
app.get("/", (req, res) => {
  res.send("SplitSense API is running.");
});

app.listen(PORT, () => {
  console.log(`SplitSense Server running on http://localhost:${PORT}`);
});
