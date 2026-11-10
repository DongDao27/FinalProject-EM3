require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const helmet = require("helmet");
const path = require("node:path");
const { randomBytes } = require("node:crypto");
const connect = require("./config/database");
const routes = require("./routes");
const { locals } = require("./middleware/common");

const app = express();
const isProduction = process.env.NODE_ENV === "production";
let sessionReady;

if (
  isProduction &&
  (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
) {
  throw new Error("Production cần SESSION_SECRET ít nhất 32 ký tự.");
}

// Kết nối DB và chuẩn bị session một lần, sau đó dùng lại cho các yêu cầu tiếp theo.
function initializeSession() {
  if (!sessionReady) {
    sessionReady = connect()
      .then(() =>
        session({
          name: "thuthanh.sid",
          secret: process.env.SESSION_SECRET || randomBytes(48).toString("hex"),
          resave: false,
          saveUninitialized: false,
          store: MongoStore.create({
            client: mongoose.connection.getClient(),
            collectionName: "sessions",
          }),
          cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: isProduction,
            maxAge: 7 * 24 * 60 * 60 * 1000,
          },
        }),
      )
      .catch((error) => {
        sessionReady = null;
        throw error;
      });
  }
  return sessionReady;
}

app.disable("x-powered-by");
// Nhận đúng giao thức HTTPS khi ứng dụng chạy sau proxy của Vercel.
if (process.env.VERCEL) app.set("trust proxy", 1);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
Object.assign(app.locals, {
  user: null,
  cartCount: 0,
  flash: null,
  csrfToken: "",
  q: "",
  categories: [],
});
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "upgrade-insecure-requests": isProduction ? [] : null,
      },
    },
  }),
);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(async (req, res, next) => {
  const sessionMiddleware = await initializeSession();
  sessionMiddleware(req, res, next);
});
app.use(locals);
app.use(routes);
app.use((req, res) =>
  res.status(404).render("error", {
    title: "Không tìm thấy trang",
    message:
      "Trang bạn tìm không tồn tại. Hãy trở về và chọn một cuốn sách nhé.",
  }),
);
app.use((error, req, res, next) => {
  const status =
    Number.isInteger(error.status) && error.status >= 400 && error.status < 500
      ? error.status
      : 500;
  if (status === 500) console.error(error);
  if (res.headersSent) return next(error);
  res.status(status).render("error", {
    title: "Không thể xử lý yêu cầu",
    message:
      status < 500
        ? "Yêu cầu không hợp lệ. Vui lòng kiểm tra dữ liệu và thử lại."
        : "Đã có lỗi xảy ra. Vui lòng thử lại sau.",
  });
});
async function start() {
  await initializeSession();
  const server = app.listen(process.env.PORT || 3000, () => {
    console.log(
      `ThuThanh Bookstore: http://localhost:${server.address().port}`,
    );
  });
  return server;
}

// Chỉ mở cổng khi chạy trực tiếp file này bằng npm start hoặc npm run dev.
if (require.main === module) {
  start().catch((error) => {
    console.error(
      "Không thể khởi động. Kiểm tra MongoDB Server và MONGODB_URI:",
      error.message,
    );
    process.exit(1);
  });
}

module.exports = app;
