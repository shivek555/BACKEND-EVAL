const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const app = express();
const PORT = 2226;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
    session({
        secret: "smart_will_secret",
        resave: false,
        saveUninitialized: true,
    })
);

const USERS_FILE = path.join(__dirname, "users.json");
const WILLS_FILE = path.join(__dirname, "wills.json");

// Helper function to read JSON files
const readData = (file) => {
    try {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, JSON.stringify([]), "utf8"); // Create file if not exists
        }
        const data = fs.readFileSync(file, "utf8");
        return JSON.parse(data) || [];
    } catch (error) {
        console.error(`Error reading ${file}:`, error);
        return [];
    }
};

// Helper function to write JSON files
const writeData = (file, data) => {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
        console.log(`Data successfully saved to ${file}`);
    } catch (error) {
        console.error(`Error writing to ${file}:`, error);
    }
};

// Routes
app.get("/", (req, res) => {
    res.render("index");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const users = readData(USERS_FILE);
    const user = users.find((u) => u.email === email && u.password === password);
    if (user) {
        req.session.user = user;
        res.redirect("/dashboard");
    } else {
        res.send("Invalid credentials");
    }
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/api/register", (req, res) => {
    const { name, email, password } = req.body;
    let users = readData(USERS_FILE);
    if (users.find((u) => u.email === email)) {
        return res.send("User already exists");
    }
    users.push({ name, email, password });
    writeData(USERS_FILE, users);
    res.redirect("/login");
});

app.get("/dashboard", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    res.render("dashboard");
});

app.get("/create-will", (req, res) => {
    res.render("create-will");
});

app.post("/api/create-will", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    
    const wills = readData(WILLS_FILE);
    const newWill = {
        id: Date.now(),
        testatorName: req.body.testatorName,
        testatorAddress: req.body.testatorAddress,
        executorName: req.body.executorName,
        beneficiaries: req.body.beneficiaries || [],
        dateCreated: new Date().toISOString(),
        userEmail: req.session.user.email
    };
    
    wills.push(newWill);
    writeData(WILLS_FILE, wills);
    res.redirect("/dashboard");
});

app.get("/view-will", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    const wills = readData(WILLS_FILE).filter(will => will.userEmail === req.session.user.email);
    res.render("view-will", { wills });
});

app.get("/edit-will", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    const wills = readData(WILLS_FILE).filter(will => will.userEmail === req.session.user.email);
    res.render("edit-will", { wills });
});

app.get("/api/get-beneficiaries", (req, res) => {
    if (!req.session.user) return res.status(401).json({ message: "Unauthorized" });
    const wills = readData(WILLS_FILE);
    const userWill = wills.find(will => will.userEmail === req.session.user.email);
    res.json({ beneficiaries: userWill ? userWill.beneficiaries : [] });
});

app.post("/api/update-beneficiaries", (req, res) => {
    if (!req.session.user) return res.status(401).json({ message: "Unauthorized" });
    let wills = readData(WILLS_FILE);
    let willIndex = wills.findIndex(will => will.userEmail === req.session.user.email);
    if (willIndex === -1) return res.status(404).json({ message: "Will not found" });
    wills[willIndex].beneficiaries = req.body.beneficiaries;
    writeData(WILLS_FILE, wills);
    res.json({ message: "Beneficiaries updated successfully!" });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
