module.exports = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "You must be logged in to access this page");
        return res.redirect("/login");
    }
    next();
};
