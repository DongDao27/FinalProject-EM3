const mongoose = require("mongoose");
const Book = require("../models/Book");
// MongoDB là nguồn dữ liệu duy nhất khi website chạy.
const bestsellerFilter = { bestseller: true };

function searchPattern(query) {
  const vowels = {
    a: "[aàáạảãâầấậẩẫăằắặẳẵ]",
    e: "[eèéẹẻẽêềếệểễ]",
    i: "[iìíịỉĩ]",
    o: "[oòóọỏõôồốộổỗơờớợởỡ]",
    u: "[uùúụủũưừứựửữ]",
    y: "[yỳýỵỷỹ]",
    d: "[dđ]",
  };
  const normalized = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
  return Array.from(normalized, (character) =>
    character === " "
      ? "\\s+"
      : vowels[character] || character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("");
}

function searchFilter(query) {
  const pattern = searchPattern(query);
  return {
    $or: ["title", "author", "sku", "publisher", "category"].map((field) => ({
      [field]: { $regex: pattern, $options: "i" },
    })),
  };
}

// Xếp hạng trong MongoDB trước khi giới hạn gợi ý hoặc phân trang.
function rankedBooks(filter, query) {
  const pattern = searchPattern(query);
  const startWord = "(^|[^\\p{L}\\p{N}])";
  const endWord = "($|[^\\p{L}\\p{N}])";
  const match = (field, regex) => ({
    $regexMatch: { input: { $ifNull: ["$" + field, ""] }, regex, options: "i" },
  });
  // Mã chính xác → tên chính xác → đầu tên → từ trong tên → các thông tin phụ.
  const priorities = [
    ["sku", "^" + pattern + "$", 110],
    ["title", "^" + pattern + "$", 100],
    ["title", "^" + pattern + endWord, 95],
    ["title", "^" + pattern, 90],
    ["title", startWord + pattern + endWord, 85],
    ["title", startWord + pattern, 80],
    ["title", pattern, 70],
    ["author", pattern, 60],
    ["publisher", pattern, 50],
    ["category", pattern, 40],
    ["sku", pattern, 30],
  ];
  return Book.aggregate([
    { $match: filter },
    {
      $addFields: {
        relevance: {
          $switch: {
            branches: priorities.map(([field, regex, score]) => ({
              case: match(field, regex),
              then: score,
            })),
            default: 0,
          },
        },
      },
    },
    { $sort: { relevance: -1, title: 1, _id: 1 } },
    { $unset: "relevance" },
  ]).collation({ locale: "vi", strength: 1, numericOrdering: true });
}

exports.suggestions = async (req, res) => {
  const q =
    typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  res.set("Cache-Control", "no-store");
  if (!q) return res.json({ products: [] });
  const books = await rankedBooks(searchFilter(q), q)
    .limit(5)
    .project({ title: 1, price: 1, image: 1, category: 1 });
  res.json({
    products: books.map((book) => ({
      id: book._id.toString(),
      title: book.title,
      price: book.price,
      image: book.image || "",
      category: book.category,
    })),
  });
};

exports.index = async (req, res) => {
  if (req.path === "/") {
    const [bestsellers, newest, recommended] = await Promise.all([
      Book.find(bestsellerFilter)
        .sort({ createdAt: 1, _id: 1 })
        .limit(4)
        .lean(),
      Book.find().sort({ createdAt: -1, _id: -1 }).limit(4).lean(),
      Book.find({ category: { $in: ["Sách văn học", "Truyện tranh"] } })
        .sort({ sku: 1, _id: 1 })
        .limit(4)
        .lean(),
    ]);
    return res.render("home", {
      title: "Trang chủ",
      searching: false,
      groups: [
        {
          title: "Bán chạy nhất",
          href: "/search?section=bestseller",
          books: bestsellers,
        },
        { title: "Sản phẩm mới", href: "/search?sort=newest", books: newest },
        { title: "Gợi ý cho bạn", href: "/search", books: recommended },
      ],
    });
  }
  const q =
    typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  const category =
    typeof req.query.category === "string" ? req.query.category : "";
  const section = req.query.section === "bestseller" ? "bestseller" : "";
  const sort = req.query.sort === "newest" ? "newest" : "";
  const filter = {};
  if (q) Object.assign(filter, searchFilter(q));
  if (category) filter.category = category;
  if (section) filter.$and = [bestsellerFilter];
  const limit = 24;
  const total = await Book.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / limit));
  const requestedPage =
    typeof req.query.page === "string" ? Number(req.query.page) : 1;
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, pages)
      : 1;
  const direction = sort ? -1 : 1;
  const books =
    q && !sort
      ? await rankedBooks(filter, q)
          .skip((page - 1) * limit)
          .limit(limit)
      : await Book.find(filter)
          .sort({ createdAt: direction, _id: direction })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean();
  const pageUrl = (number) =>
    "/search?" +
    new URLSearchParams({ q, category, section, sort, page: String(number) });
  const title = q
    ? `Tìm kiếm: ${q}`
    : section
      ? "Bán chạy nhất"
      : sort
        ? "Sản phẩm mới"
        : "Tất cả sản phẩm";
  res.render("home", {
    title,
    books,
    q,
    category,
    section,
    sort,
    searching: true,
    total,
    page,
    pages,
    pageUrl,
  });
};

exports.detail = async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id))
    return res.status(404).render("error", {
      title: "Không tìm thấy sách",
      message: "Cuốn sách bạn tìm không tồn tại.",
    });
  const book = await Book.findById(req.params.id).lean();
  if (!book)
    return res.status(404).render("error", {
      title: "Không tìm thấy sách",
      message: "Cuốn sách bạn tìm không tồn tại.",
    });
  res.render("detail", { title: book.title, book });
};
