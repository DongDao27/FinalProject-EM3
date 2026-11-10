const mongoose = require("mongoose");

module.exports = () =>
  mongoose.connect(
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/thuthanh_bookstore",
    { serverSelectionTimeoutMS: 5000 },
  );
