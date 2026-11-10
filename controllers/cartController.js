const { randomBytes } = require("node:crypto");
const mongoose = require("mongoose");
const Book = require("../models/Book");
const Order = require("../models/Order");

async function getCart(req, buyNow = false) {
  let cart = req.session.cart || {};
  if (buyNow) {
    const selection = req.session.buyNow;
    cart = selection ? { [selection.bookId]: selection.quantity } : {};
  }
  const books = await Book.find({ _id: { $in: Object.keys(cart) } }).lean();
  if (!buyNow) {
    const existingIds = new Set(books.map((book) => book._id.toString()));
    for (const id of Object.keys(cart)) {
      if (!existingIds.has(id)) delete cart[id];
    }
  }
  const items = books.map((book) => ({
    book,
    quantity: cart[book._id.toString()],
  }));
  const total = items.reduce(
    (sum, item) => sum + item.book.price * item.quantity,
    0,
  );
  return { items, total };
}

async function readSelection(req) {
  const id = req.body.bookId;
  const quantity =
    req.body.quantity === undefined ? 1 : Number(req.body.quantity);
  if (
    !mongoose.isObjectIdOrHexString(id) ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 99
  )
    return null;
  if (!(await Book.exists({ _id: id }))) return null;
  return { bookId: id, quantity };
}

exports.show = async (req, res) => {
  const cart = await getCart(req);
  res.locals.cartCount = cart.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  res.render("cart", { title: "Giỏ sách của bạn", ...cart });
};

exports.add = async (req, res) => {
  const selection = await readSelection(req);
  if (!selection) {
    return res.status(400).render("error", {
      title: "Không thể thêm sách",
      message: "Sách hoặc số lượng không hợp lệ (từ 1 đến 99).",
    });
  }
  const { bookId: id, quantity } = selection;
  req.session.cart ||= {};
  req.session.cart[id] = Math.min(99, (req.session.cart[id] || 0) + quantity);
  req.session.flash = { type: "success", text: "Đã thêm sách vào giỏ hàng." };
  res.redirect("/cart");
};

exports.buyNow = async (req, res) => {
  const selection = await readSelection(req);
  if (!selection)
    return res.status(400).render("error", {
      title: "Không thể mua sản phẩm",
      message: "Vui lòng chọn sản phẩm có sẵn và số lượng từ 1 đến 99.",
    });
  req.session.buyNow = selection;
  delete req.session.checkoutToken;
  delete req.session.checkoutMode;
  res.redirect("/checkout?buyNow=1");
};

exports.update = (req, res) => {
  const { bookId } = req.body;
  const quantity =
    typeof req.body.quantity === "string" && req.body.quantity.trim()
      ? Number(req.body.quantity)
      : NaN;
  if (
    !mongoose.isObjectIdOrHexString(bookId) ||
    !Number.isInteger(quantity) ||
    quantity < 0 ||
    quantity > 99
  )
    return res.status(400).render("error", {
      title: "Số lượng không hợp lệ",
      message: "Vui lòng chọn số lượng từ 0 đến 99.",
    });
  if (req.session.cart && Object.hasOwn(req.session.cart, bookId)) {
    if (quantity === 0) delete req.session.cart[bookId];
    else req.session.cart[bookId] = quantity;
  }
  res.redirect("/cart");
};

exports.checkout = async (req, res) => {
  const buyNow = req.query.buyNow === "1";
  const cart = await getCart(req, buyNow);
  if (!cart.items.length) return res.redirect("/cart");
  const mode = buyNow ? "buyNow" : "cart";
  if (req.session.checkoutMode !== mode) delete req.session.checkoutToken;
  req.session.checkoutMode = mode;
  req.session.checkoutToken ||= randomBytes(24).toString("hex");
  res.render("checkout", {
    title: "Thông tin nhận hàng",
    ...cart,
    buyNow,
    checkoutToken: req.session.checkoutToken,
    error: "",
    values: { name: req.session.user.name },
  });
};

exports.placeOrder = async (req, res) => {
  const buyNow = req.body.buyNow === "1";
  const cart = await getCart(req, buyNow);
  if (!cart.items.length) return res.redirect("/cart");
  const values = Object.fromEntries(
    ["name", "phone", "address", "note"].map((key) => [
      key,
      typeof req.body[key] === "string" ? req.body[key].trim() : "",
    ]),
  );
  const fail = (error) =>
    res.status(400).render("checkout", {
      title: "Thông tin nhận hàng",
      ...cart,
      buyNow,
      checkoutToken: req.session.checkoutToken,
      error,
      values,
    });
  if (
    !req.session.checkoutToken ||
    req.body.checkoutToken !== req.session.checkoutToken ||
    req.session.checkoutMode !== (buyNow ? "buyNow" : "cart")
  )
    return fail("Biểu mẫu đặt hàng đã hết hạn. Vui lòng tải lại trang.");
  if (
    !values.name ||
    values.name.length > 80 ||
    !/^0\d{9}$/.test(values.phone) ||
    values.address.length < 10 ||
    values.address.length > 300 ||
    values.note.length > 500
  )
    return fail(
      "Vui lòng nhập họ tên, số điện thoại Việt Nam 10 chữ số và địa chỉ từ 10 đến 300 ký tự. Ghi chú tối đa 500 ký tự.",
    );
  try {
    await Order.create({
      user: req.session.user.id,
      checkoutToken: req.session.checkoutToken,
      recipient: values,
      items: cart.items.map(({ book, quantity }) => ({
        book: book._id,
        title: book.title,
        price: book.price,
        quantity,
      })),
      total: cart.total,
      paymentMethod: "COD",
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
  if (buyNow) delete req.session.buyNow;
  else req.session.cart = {};
  delete req.session.checkoutToken;
  delete req.session.checkoutMode;
  req.session.flash = {
    type: "success",
    text: "Đặt hàng thành công! Bạn sẽ thanh toán khi nhận hàng. Cảm ơn bạn đã chọn ThuThanh Bookstore.",
  };
  res.redirect("/");
};
