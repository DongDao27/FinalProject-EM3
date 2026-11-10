const { randomBytes, timingSafeEqual } = require('node:crypto');
const Book = require('../models/Book');

exports.locals = async (req, res, next) => {
  req.session.csrfToken ||= randomBytes(32).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;
  res.locals.user = req.session.user || null;
  res.locals.cartCount = Object.values(req.session.cart || {}).reduce((sum, count) => sum + count, 0);
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  res.locals.q = '';
  res.locals.money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  res.locals.categories = await Book.distinct('category');
  if (req.method === 'POST') {
    const submitted = typeof req.body?._csrf === 'string' ? req.body._csrf : '';
    const expected = req.session.csrfToken;
    if (Buffer.byteLength(submitted) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(submitted), Buffer.from(expected))) {
      return res.status(403).render('error', { title: 'Phiên không hợp lệ', message: 'Phiên gửi biểu mẫu đã hết hạn. Vui lòng tải lại trang và thử lại.' });
    }
  }
  next();
};

exports.requireAuth = (req, res, next) => {
  if (req.session.user) return next();
  req.session.returnTo = req.query.buyNow === '1' ? '/checkout?buyNow=1' : '/checkout';
  req.session.flash = { type: 'info', text: 'Vui lòng đăng nhập để đặt hàng. Giỏ sách của bạn vẫn được giữ lại.' };
  res.redirect('/login');
};
