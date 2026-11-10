require("dotenv").config();
const mongoose = require("mongoose");
const connect = require("./database");
const Book = require("../models/Book");
const fs = require("node:fs");

async function seedBooks() {
  const file = process.argv[2];
  if (!file)
    throw new Error(
      "Chạy npm run seed -- ./data.json để nhập sản phẩm. Database đã có dữ liệu thì không cần nhập lại.",
    );
  const books = JSON.parse(fs.readFileSync(file, "utf8"));
  if (
    !Array.isArray(books) ||
    !books.length ||
    books.some(
      (book) => !book || typeof book.sku !== "string" || !book.sku.trim(),
    )
  ) {
    throw new Error("File JSON phải là mảng sản phẩm, mỗi sản phẩm có mã SKU.");
  }
  await connect();
  await Book.init();
  const result = await Book.bulkWrite(
    books.map(({ updatedAt, __v, ...book }) => ({
      updateOne: {
        filter: { sku: book.sku },
        update: { $setOnInsert: book },
        upsert: true,
      },
    })),
  );
  // Giữ lựa chọn bán chạy đã sửa trong DB, chỉ bổ sung nhãn còn thiếu.
  await Book.updateMany(
    {
      sku: {
        $in: books.filter((book) => book.bestseller).map((book) => book.sku),
      },
      bestseller: { $exists: false },
    },
    { $set: { bestseller: true } },
  );
  const descriptions = books
    .filter(
      (book) => typeof book.description === "string" && book.description.trim(),
    )
    .map((book) => ({
      updateOne: {
        filter: {
          sku: book.sku,
          $or: [
            ...(book.sourceDescription
              ? [{ description: book.sourceDescription }]
              : []),
            { description: "" },
            { description: book.title },
            { description: { $exists: false } },
          ],
        },
        update: { $set: { description: book.description } },
      },
    }));
  const enriched = descriptions.length
    ? await Book.bulkWrite(descriptions)
    : { modifiedCount: 0 };
  console.log(
    `Đã thêm ${result.upsertedCount} sản phẩm mới; ${result.matchedCount} sản phẩm đã có được giữ nguyên.`,
  );
  console.log(
    `Đã bổ sung ${enriched.modifiedCount} mô tả sách còn sơ lược. Mô tả tự chỉnh được giữ nguyên.`,
  );
}

seedBooks()
  .catch((error) => {
    console.error("Không thể thêm sản phẩm:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
