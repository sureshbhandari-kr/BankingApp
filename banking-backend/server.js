// File: server.js

const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const PORT = 3001;

// --- Database file paths ---
const DB_DIR = path.join(__dirname, "db");
const USERS_DB_PATH = path.join(DB_DIR, "users.json");
const ACCOUNTS_DB_PATH = path.join(DB_DIR, "accounts.json");
const TRANSACTIONS_DB_PATH = path.join(DB_DIR, "transactions.json");
const EXTERNAL_ACCOUNTS_DB_PATH = path.join(DB_DIR, "external-accounts.json");
const CHECKING_APPS_DB_PATH = path.join(DB_DIR, "checking-applications.json");
const CREDIT_APPS_DB_PATH = path.join(DB_DIR, "credit-applications.json");
const CHECKING_PRODUCTS_PATH = path.join(DB_DIR, "checking-products.json");
const SAVINGS_PRODUCTS_PATH = path.join(DB_DIR, "savings-products.json");
const CREDIT_CARD_PRODUCTS_PATH = path.join(
  DB_DIR,
  "credit-card-products.json"
);

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Helper Functions ---
const readDatabase = async (filePath) => {
  try {
    await fs.access(filePath);
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

const writeDatabase = async (filePath, data) => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
};

const initializeDatabase = async () => {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    const filesToCreate = [
      { path: USERS_DB_PATH, data: [] },
      { path: ACCOUNTS_DB_PATH, data: [] },
      { path: TRANSACTIONS_DB_PATH, data: [] },
      { path: EXTERNAL_ACCOUNTS_DB_PATH, data: [] },
      { path: CHECKING_APPS_DB_PATH, data: [] },
      { path: CREDIT_APPS_DB_PATH, data: [] },
      { path: CHECKING_PRODUCTS_PATH, data: [] },
      { path: SAVINGS_PRODUCTS_PATH, data: [] },
      { path: CREDIT_CARD_PRODUCTS_PATH, data: [] },
    ];
    for (const file of filesToCreate) {
      try {
        await fs.access(file.path);
      } catch {
        await writeDatabase(file.path, file.data);
      }
    }
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
};

// --- API Endpoints ---

// [GET] Product Information Endpoints
app.get("/api/products/checking", async (req, res) => {
  const products = await readDatabase(CHECKING_PRODUCTS_PATH);
  res.status(200).json(products);
});

app.get("/api/products/savings", async (req, res) => {
  const products = await readDatabase(SAVINGS_PRODUCTS_PATH);
  res.status(200).json(products);
});

app.get("/api/products/creditcards", async (req, res) => {
  const products = await readDatabase(CREDIT_CARD_PRODUCTS_PATH);
  res.status(200).json(products);
});

// [POST] /api/register
app.post("/api/register", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName || !email || !password)
    return res.status(400).json({ message: "All fields are required." });
  const users = await readDatabase(USERS_DB_PATH);
  if (users.some((user) => user.email === email))
    return res
      .status(409)
      .json({ message: "User with this email already exists." });
  const newUser = {
    id: `user_${Date.now()}`,
    firstName,
    lastName,
    email,
    password,
  };
  users.push(newUser);
  await writeDatabase(USERS_DB_PATH, users);
  res
    .status(201)
    .json({
      message: "User registered successfully!",
      user: { id: newUser.id, email: newUser.email },
    });
});

// [POST] /api/login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  const users = await readDatabase(USERS_DB_PATH);
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ message: "Invalid credentials." });
  res
    .status(200)
    .json({
      message: "Login successful!",
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
});

// [GET] /api/accounts/:userId
app.get("/api/accounts/:userId", async (req, res) => {
  const { userId } = req.params;
  const accounts = await readDatabase(ACCOUNTS_DB_PATH);
  res.status(200).json(accounts.filter((acc) => acc.userId === userId));
});

// [POST] /api/applications/checking (Handles Checking and Savings)
app.post("/api/applications/checking", async (req, res) => {
  const appData = req.body;
  if (!appData.firstName || !appData.ssn)
    return res.status(400).json({ message: "Missing required fields." });

  const applications = await readDatabase(CHECKING_APPS_DB_PATH);
  const newApplication = {
    id: `app_check_${Date.now()}`,
    ...appData,
    status: "Submitted",
    submittedDate: new Date().toISOString(),
  };
  applications.push(newApplication);
  await writeDatabase(CHECKING_APPS_DB_PATH, applications);

  const accounts = await readDatabase(ACCOUNTS_DB_PATH);
  const newAccount = {
    id: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
    userId: appData.userId,
    accountType: appData.accountType,
    balance: 0.0,
    createdDate: new Date().toISOString(),
  };
  accounts.push(newAccount);
  await writeDatabase(ACCOUNTS_DB_PATH, accounts);

  res
    .status(201)
    .json({ message: "Account created successfully!", account: newAccount });
});

// [POST] /api/applications/credit
app.post("/api/applications/credit", async (req, res) => {
  const appData = req.body;
  if (!appData.cardType || !appData.ssn || !appData.totalAnnualIncome) {
    return res
      .status(400)
      .json({ message: "Missing required credit application fields." });
  }

  const applications = await readDatabase(CREDIT_APPS_DB_PATH);
  const newApplication = {
    id: `app_credit_${Date.now()}`,
    ...appData,
    status: "Submitted",
    submittedDate: new Date().toISOString(),
  };
  applications.push(newApplication);
  await writeDatabase(CREDIT_APPS_DB_PATH, applications);

  const accounts = await readDatabase(ACCOUNTS_DB_PATH);
  const creditLimit = (Math.floor(Math.random() * (150 - 10 + 1)) + 10) * 100;
  const newAccount = {
    id: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
    userId: appData.userId,
    accountType: "Credit Card",
    cardType: appData.cardType,
    balance: 0.0,
    creditLimit: creditLimit,
    cardNumber: Math.floor(
      1000000000000000 + Math.random() * 9000000000000000
    ).toString(),
    expiryDate: `${Math.floor(Math.random() * 12) + 1}/${
      new Date().getFullYear() + 4
    }`,
    cvv: Math.floor(100 + Math.random() * 900).toString(),
    createdDate: new Date().toISOString(),
  };
  accounts.push(newAccount);
  await writeDatabase(ACCOUNTS_DB_PATH, accounts);

  res
    .status(201)
    .json({
      message: "Credit card account created successfully!",
      account: newAccount,
    });
});

// [POST] /api/accounts/external
app.post("/api/accounts/external", async (req, res) => {
  const { userId, bankName, accountNumber } = req.body;
  if (!userId || !bankName || !accountNumber)
    return res.status(400).json({ message: "All fields are required." });
  const externalAccounts = await readDatabase(EXTERNAL_ACCOUNTS_DB_PATH);
  const newExternalAccount = {
    id: `ext_${Date.now()}`,
    userId,
    bankName,
    accountNumber,
  };
  externalAccounts.push(newExternalAccount);
  await writeDatabase(EXTERNAL_ACCOUNTS_DB_PATH, externalAccounts);
  res
    .status(201)
    .json({
      message: "External account added successfully!",
      account: newExternalAccount,
    });
});

// [GET] /api/accounts/external/:userId
app.get("/api/accounts/external/:userId", async (req, res) => {
  const { userId } = req.params;
  const externalAccounts = await readDatabase(EXTERNAL_ACCOUNTS_DB_PATH);
  res.status(200).json(externalAccounts.filter((acc) => acc.userId === userId));
});

// [POST] /api/transfer/internal
app.post("/api/transfer/internal", async (req, res) => {
  const { fromAccountId, toAccountId, amount } = req.body;
  const transferAmount = parseFloat(amount);
  if (!fromAccountId || !toAccountId || !transferAmount || transferAmount <= 0)
    return res.status(400).json({ message: "Invalid transfer details." });

  const accounts = await readDatabase(ACCOUNTS_DB_PATH);
  const fromAccount = accounts.find((acc) => acc.id === fromAccountId);
  const toAccount = accounts.find((acc) => acc.id === toAccountId);

  if (!fromAccount || !toAccount)
    return res.status(404).json({ message: "One or both accounts not found." });
  if (fromAccount.balance < transferAmount)
    return res.status(400).json({ message: "Insufficient funds." });

  fromAccount.balance -= transferAmount;
  toAccount.balance += transferAmount;

  const transactions = await readDatabase(TRANSACTIONS_DB_PATH);
  const date = new Date().toISOString();
  transactions.push({
    id: `txn_${Date.now()}_d`,
    accountId: fromAccountId,
    type: "Debit",
    amount: -transferAmount,
    description: `Transfer to ${toAccount.accountType}`,
    date,
  });
  transactions.push({
    id: `txn_${Date.now()}_c`,
    accountId: toAccountId,
    type: "Credit",
    amount: transferAmount,
    description: `Transfer from ${fromAccount.accountType}`,
    date,
  });

  await writeDatabase(ACCOUNTS_DB_PATH, accounts);
  await writeDatabase(TRANSACTIONS_DB_PATH, transactions);

  res.status(200).json({ message: "Transfer successful!" });
});

// [POST] /api/purchase
app.post("/api/purchase", async (req, res) => {
  const { accountId, amount, description } = req.body;
  const purchaseAmount = parseFloat(amount);
  if (!accountId || !purchaseAmount || purchaseAmount <= 0)
    return res.status(400).json({ message: "Invalid purchase details." });

  const accounts = await readDatabase(ACCOUNTS_DB_PATH);
  const account = accounts.find((acc) => acc.id === accountId);

  if (!account) return res.status(404).json({ message: "Account not found." });
  if (account.balance + purchaseAmount > account.creditLimit)
    return res.status(400).json({ message: "Purchase exceeds credit limit." });

  account.balance += purchaseAmount;

  const transactions = await readDatabase(TRANSACTIONS_DB_PATH);
  transactions.push({
    id: `txn_${Date.now()}`,
    accountId,
    type: "Purchase",
    amount: purchaseAmount,
    description: description || "Online Purchase",
    date: new Date().toISOString(),
  });

  await writeDatabase(ACCOUNTS_DB_PATH, accounts);
  await writeDatabase(TRANSACTIONS_DB_PATH, transactions);

  res.status(200).json({ message: "Purchase successful!" });
});

// [POST] /api/payment/creditcard
app.post("/api/payment/creditcard", async (req, res) => {
  const { fromAccountId, toAccountId, amount } = req.body;
  const paymentAmount = parseFloat(amount);
  if (!fromAccountId || !toAccountId || !paymentAmount || paymentAmount <= 0)
    return res.status(400).json({ message: "Invalid payment details." });

  const accounts = await readDatabase(ACCOUNTS_DB_PATH);
  const fromAccount = accounts.find((acc) => acc.id === fromAccountId);
  const toAccount = accounts.find((acc) => acc.id === toAccountId);

  if (!fromAccount || !toAccount)
    return res.status(404).json({ message: "One or both accounts not found." });
  if (fromAccount.balance < paymentAmount)
    return res
      .status(400)
      .json({ message: "Insufficient funds in the from account." });

  fromAccount.balance -= paymentAmount;
  toAccount.balance -= paymentAmount;

  const transactions = await readDatabase(TRANSACTIONS_DB_PATH);
  const date = new Date().toISOString();
  transactions.push({
    id: `txn_${Date.now()}_d`,
    accountId: fromAccountId,
    type: "Debit",
    amount: -paymentAmount,
    description: `Payment to ${toAccount.cardType}`,
    date,
  });
  transactions.push({
    id: `txn_${Date.now()}_c`,
    accountId: toAccountId,
    type: "Payment",
    amount: -paymentAmount,
    description: `Payment from ${fromAccount.accountType}`,
    date,
  });

  await writeDatabase(ACCOUNTS_DB_PATH, accounts);
  await writeDatabase(TRANSACTIONS_DB_PATH, transactions);

  res.status(200).json({ message: "Payment successful!" });
});

// [GET] /api/transactions/:accountId
app.get("/api/transactions/:accountId", async (req, res) => {
  const { accountId } = req.params;
  const transactions = await readDatabase(TRANSACTIONS_DB_PATH);
  res
    .status(200)
    .json(
      transactions
        .filter((t) => t.accountId === accountId)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    );
});

// [POST] /api/add-funds
app.post("/api/add-funds", async (req, res) => {
  const { accountId, amount, source } = req.body;
  const depositAmount = parseFloat(amount);
  if (!accountId || !depositAmount || depositAmount <= 0)
    return res.status(400).json({ message: "Invalid deposit details." });

  const accounts = await readDatabase(ACCOUNTS_DB_PATH);
  const account = accounts.find((acc) => acc.id === accountId);
  if (!account) return res.status(404).json({ message: "Account not found." });

  account.balance += depositAmount;

  const transactions = await readDatabase(TRANSACTIONS_DB_PATH);
  const date = new Date().toISOString();
  let description = "Deposit";
  if (source === "check-deposit") description = "Check Deposit";
  if (source === "direct-deposit") description = "Payroll Direct Deposit";
  if (source === "external-transfer")
    description = "Transfer from External Account";

  transactions.push({
    id: `txn_${Date.now()}`,
    accountId,
    type: "Credit",
    amount: depositAmount,
    description,
    date,
  });

  await writeDatabase(ACCOUNTS_DB_PATH, accounts);
  await writeDatabase(TRANSACTIONS_DB_PATH, transactions);

  res.status(200).json({ message: "Funds added successfully!" });
});

// --- Start Server ---
app.listen(PORT, async () => {
  await initializeDatabase();
  console.log("Database initialized.");
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
