const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");


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
  console.log("Database updated:", data);
};

app.post("/members", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  const db = readDB();
  const exists = db.members.some((m) => m.toLowerCase() === name.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "Member already exists" });
  }

  db.members.push(name);
  writeDB(db);
  res.status(201).json({ message: "Member added", members: db.members });
});

app.get("/members", (req, res) => {
  const db = readDB();
  res.json(db.members);
});

app.post("/expenses", (req, res) => {
  const { paidBy, amount, description } = req.body;
  const db = readDB();

  if (db.members.length < 2) {
    return res
      .status(400)
      .json({ error: "Need at least 2 members to share expenses." });
  }
  const newExpense = {
    id: Date.now(),
    paidBy,
    amount: parseFloat(amount),
    description,
    date: new Date().toISOString(),
  };
  db.expenses.push(newExpense);

  const splitAmount = newExpense.amount / db.members.length;
  db.members.forEach((member) => {
    if (member !== paidBy) {
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

  db.debts = db.debts.filter((d) => d.amount > 0);

  writeDB(db);
  res
    .status(201)
    .json({ message: "Expense added and debts updated", expense: newExpense });
});

app.get("/expenses", (req, res) => {
  const db = readDB();
  res.json(db.expenses);
});

app.get("/debts", (req, res) => {
  const db = readDB();
  res.json(db.debts);
});

app.get("/debts/:memberName", (req, res) => {
  const { memberName } = req.params;
  const db = readDB();

  const individualDebts = db.debts.filter(
    (d) => d.ower === memberName || d.receiver === memberName,
  );

  res.json(individualDebts);
});

app.get("/", (req, res) => {
  res.send("SplitSense API is running.");
});

app.listen(PORT, () => {
  console.log(`SplitSense Server running on http://localhost:${PORT}`);
});
