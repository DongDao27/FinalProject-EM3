const router = require('express').Router();
const { rateLimit } = require('express-rate-limit');
const book = require('../controllers/bookController');
const auth = require('../controllers/authController');
const cart = require('../controllers/cartController');
const { requireAuth } = require('../middleware/common');

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false,
  handler: (req, res) => res.status(429).render('error', { title: 'Vui lòng thử lại sau', message: 'Bạn đã thử đăng nhập hoặc đăng ký quá nhiều lần. Vui lòng đợi 15 phút.' }) });
router.get('/', book.index);
router.get('/search', book.index);
router.get('/search/suggestions', book.suggestions);
router.get('/books/:id', book.detail);
router.get(['/register', '/login'], auth.form);
router.post(['/register', '/login'], authLimiter, auth.submit);
router.post('/logout', auth.logout);
router.get('/cart', cart.show);
router.post('/cart/add', cart.add);
router.post('/cart/buy-now', cart.buyNow);
router.post('/cart/update', cart.update);
router.get('/checkout', requireAuth, cart.checkout);
router.post('/checkout', requireAuth, cart.placeOrder);

module.exports = router;
