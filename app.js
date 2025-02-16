const express = require("express");
const mongoose = require('mongoose');
const ejsMate = require("ejs-mate");
const path = require("path");
const methodOverride = require("method-override");
const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session');
const flash = require('connect-flash');

const User = require('./models/user');
const Todo = require("./models/todo");
const isLoggedIn = require('./middleware');

const app = express();
const port = 3000;

// Database Connection
async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/todo');
    console.log("Connected to MongoDB");
}

main().catch(err => console.log(err));

// Middleware
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

const sessionConfig = {
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7, 
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
};

app.use(session(sessionConfig));
app.use(flash());


app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});


app.get('/signup', (req, res) => {
    res.render('users/signup');
});

app.post('/signup', async (req, res, next) => {
    try {
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const registeredUser = await User.register(user, password);
        
        req.login(registeredUser, err => {
            if (err) return next(err);
            req.flash("success", "Welcome to Todo App!");
            res.redirect('/');
        });
    } catch (e) {
        req.flash("error", e.message);
        res.redirect('/signup');
    }
});

app.get('/login', (req, res) => {
    res.render('users/login');
});

app.post('/login', passport.authenticate('local', { 
    failureRedirect: '/login',
    failureFlash: true
}), (req, res) => {
    req.flash("success", "Welcome back!");
    res.redirect('/');
});

app.get('/logout', (req, res, next) => {
    req.logout(err => {
        if (err) return next(err);
        req.flash("success", "You have logged out successfully.");
        res.redirect('/login');
    });
});

// Todo Routes
app.get("/", isLoggedIn, async (req, res) => {
    try {
        const todos = await Todo.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.render("todos/index", { todos });
    } catch (err) {
        console.log(err);
        res.send("Error fetching todos");
    }
});

app.get("/todos/new", isLoggedIn, (req, res) => {
    res.render("todos/new");
});

app.post("/todos", isLoggedIn, async (req, res) => {
    try {
        const newTodo = new Todo({ title: req.body.title, user: req.user._id });
        await newTodo.save();
        req.flash("success", "Todo added successfully!");
        res.redirect("/");
    } catch (err) {
        console.log(err);
        res.send("Error creating todo");
    }
});

app.put("/todos/:id", isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;
        const todoItem = await Todo.findById(id);
        todoItem.completed = !todoItem.completed;
        await todoItem.save();
        req.flash("success", "Todo updated successfully!");
        res.redirect("/");
    } catch (err) {
        console.log(err);
        res.send("Error updating todo");
    }
});

app.delete("/todos/:id", isLoggedIn, async (req, res) => {
    try {
        await Todo.findByIdAndDelete(req.params.id);
        req.flash("success", "Todo deleted successfully!");
        res.redirect("/");
    } catch (err) {
        console.log(err);
        res.send("Error deleting todo");
    }
});


app.listen(port, () => {
    console.log(`Listening on PORT ${port}`);
});
