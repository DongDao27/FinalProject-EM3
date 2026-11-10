const User = require("../models/User");

exports.form = (req, res) => {
  if (req.session.user) return res.redirect("/");
  const register = req.path === "/register";
  res.render("auth", {
    title: register ? "Đăng ký" : "Đăng nhập",
    register,
    error: "",
    values: {},
  });
};

exports.submit = async (req, res) => {
  const register = req.path === "/register";
  const title = register ? "Đăng ký" : "Đăng nhập";
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const email =
    typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const password =
    typeof req.body.password === "string" ? req.body.password : "";
  const fail = (error) =>
    res
      .status(400)
      .render("auth", { title, register, error, values: { name, email } });
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    password.length < 8 ||
    password.length > 128
  )
    return fail("Nhập email hợp lệ và mật khẩu từ 8 đến 128 ký tự.");
  let user;
  if (register) {
    if (!name || name.length > 80) return fail("Họ tên cần từ 1 đến 80 ký tự.");
    if (password !== req.body.confirmPassword)
      return fail("Mật khẩu xác nhận chưa khớp.");
    try {
      user = await User.create({
        name,
        email,
        passwordHash: await User.hashPassword(password),
      });
    } catch (error) {
      if (error.code === 11000)
        return fail("Email này đã được đăng ký. Vui lòng đăng nhập.");
      throw error;
    }
  } else {
    user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await user.checkPassword(password)))
      return fail("Email hoặc mật khẩu không đúng.");
  }
  const { cart, buyNow, returnTo } = req.session;
  await new Promise((resolve, reject) =>
    req.session.regenerate((error) => (error ? reject(error) : resolve())),
  );
  req.session.user = { id: user._id.toString(), name: user.name };
  req.session.cart = cart || {};
  if (buyNow) req.session.buyNow = buyNow;
  req.session.flash = {
    type: "success",
    text: register
      ? "Tạo tài khoản thành công. Chào mừng bạn đến với ThuThanh!"
      : "Đăng nhập thành công. Chào mừng bạn trở lại!",
  };
  res.redirect(
    ["/checkout", "/checkout?buyNow=1"].includes(returnTo) ? returnTo : "/",
  );
};

exports.logout = (req, res, next) =>
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("thuthanh.sid");
    res.redirect("/");
  });
