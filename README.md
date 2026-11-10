# EM3 Final Project — ThuThanh Bookstore

ThuThanh Bookstore là website nhà sách được xây dựng bằng Node.js và MongoDB. Dự án mô phỏng những thao tác quen thuộc khi mua sách online: xem sản phẩm, tìm một cuốn sách, tạo tài khoản, thêm vào giỏ và đặt hàng thanh toán khi nhận hàng.

Source code được chia theo MVC truyền thống. Mỗi phần phụ trách một công việc để khi cần sửa giao diện, chức năng hay dữ liệu, mình biết nên bắt đầu từ đâu.

## Website có những gì?

- Trang chủ có banner và ba nhóm sản phẩm: Bán chạy nhất, Sản phẩm mới, Gợi ý cho bạn.
- Đăng ký, đăng nhập và đăng xuất. Giỏ hàng được giữ lại khi đăng nhập.
- Tìm sách theo tên, tác giả, mã SKU, thương hiệu hoặc danh mục. Có thể nhập không dấu; gợi ý ưu tiên những sản phẩm khớp tên hơn.
- Trang chi tiết có ảnh, giá, mô tả và thông tin sản phẩm. Các card hiện thông tin ngắn gọn, mô tả nằm ở trang chi tiết.
- Thêm giỏ, đổi số lượng, xóa sản phẩm hoặc Mua ngay. Mua ngay giữ các sản phẩm khác trong giỏ.
- Đặt hàng COD: nhập thông tin nhận hàng, xác nhận đơn rồi quay về trang chủ. Khách trả tiền khi nhận hàng.

Giao diện dành cho máy tính. Dự án tập trung vào việc mua hàng của người dùng; sản phẩm được quản lý trực tiếp bằng MongoDB Compass.

## Công nghệ sử dụng

| Công nghệ                        | Dùng để làm gì?                                                |
| -------------------------------- | -------------------------------------------------------------- |
| Node.js và Express               | Chạy server, nhận yêu cầu và xử lý các chức năng.              |
| EJS                              | Ghép giao diện với dữ liệu để tạo trang HTML.                  |
| MongoDB và Mongoose              | Lưu dữ liệu và giúp code đọc, ghi dữ liệu theo model.          |
| express-session và connect-mongo | Nhớ trạng thái đăng nhập, giỏ hàng và lưu phiên trong MongoDB. |
| HTML, CSS, JavaScript thuần      | Hiển thị giao diện, đóng/mở menu và gợi ý tìm kiếm.            |

MongoDB Server là nơi lưu dữ liệu. Compass là ứng dụng để xem và sửa dữ liệu đó; chỉ cài Compass thì chưa có nghĩa MongoDB Server đã chạy.

## Chạy dự án trên máy

Cần có Node.js 22.x và MongoDB Server đang chạy.

**1. Cài thư viện**

Mở terminal tại thư mục chứa `package.json`:

```powershell
npm install
```

**2. Chuẩn bị file `.env`**

Nếu đã có `.env`, kiểm tra lại thông tin kết nối. Nếu chưa có, tạo file ở thư mục gốc:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/thuthanh_bookstore
SESSION_SECRET=
```

Tạo chuỗi ngẫu nhiên bằng lệnh dưới, rồi dán kết quả sau dấu `=` của `SESSION_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Giữ riêng `.env`, không đưa file này lên GitHub.

**3. Nhập dữ liệu sản phẩm**

`data.json` đi kèm có 137 sản phẩm, gồm thông tin và đường dẫn ảnh. Nhập vào database đang cấu hình trong `.env`:

```powershell
npm run seed -- ./data.json
```

Lệnh nhập nhận biết sản phẩm bằng SKU nên chạy lại không tạo bản sao. Sản phẩm đã sửa giá, tên hoặc mô tả riêng trong DB sẽ được giữ; mô tả trống hoặc chỉ có tên có thể được bổ sung từ file. Nếu database đã có dữ liệu thì không cần nhập lại mỗi lần mở web.

**4. Mở website**

```powershell
npm start
```

Truy cập **http://localhost:3000**. Khi đang sửa code, dùng `npm run dev` để server tự khởi động lại khi file thay đổi.

## Đọc source code từ đâu?

```text
app.js                 Khởi động ứng dụng và nối các phần lại với nhau
config/                Kết nối MongoDB và công cụ nhập sản phẩm
routes/                Ghép địa chỉ truy cập với hàm xử lý
controllers/           Xử lý sách, tài khoản, giỏ hàng và đơn hàng
models/                Mô tả dữ liệu Book, User, Order
middleware/            Chuẩn bị dữ liệu chung và kiểm tra yêu cầu
views/                 Các trang EJS
  partials/            Header, footer, card và ảnh sản phẩm dùng chung
public/                CSS, JavaScript, ảnh và font
data.json              Dữ liệu sản phẩm để nhập khi cài ở máy khác
package.json           Thư viện và các lệnh chạy dự án
```

Ví dụ, khi nhấn ảnh một cuốn sách, trình duyệt mở `/books/<id>`. `routes/index.js` nhận địa chỉ và gọi `detail` trong `bookController.js`. Controller dùng model `Book` tìm sản phẩm trong MongoDB rồi đưa dữ liệu cho `views/detail.ejs` hiển thị.

Luồng thường gặp là: **Trình duyệt → Middleware → Route → Controller → Model → MongoDB → Controller → View → Trình duyệt**. Với chức năng gửi form, controller cũng có thể lưu dữ liệu rồi chuyển sang một trang khác.

`middleware/common.js` có hai việc chính. `locals` chuẩn bị tài khoản, số lượng giỏ, danh mục, thông báo và kiểm tra mã CSRF khi gửi form. `requireAuth` kiểm tra đăng nhập trước thanh toán; nếu khách chưa đăng nhập, nó nhớ bước đang làm rồi chuyển sang trang đăng nhập.

View được tách thành các trang riêng, còn những phần lặp lại đặt trong `views/partials`. Chẳng hạn, `home.ejs` dùng `book.ejs` làm mẫu để tạo nhiều card sản phẩm, còn header và footer được ghép vào các trang bằng `include`.

## Muốn sửa thì tìm ở đâu?

| Muốn sửa                           | Nơi cần xem                               |
| ---------------------------------- | ----------------------------------------- |
| Banner và bố cục trang chủ         | `views/home.ejs`                          |
| Nội dung trên một card sản phẩm    | `views/partials/book.ejs`                 |
| Header, footer                     | `views/partials/header.ejs`, `footer.ejs` |
| Màu sắc, kích thước, khoảng cách   | `public/css/style.css`                    |
| Menu và gợi ý tìm kiếm             | `public/js/storefront.js`                 |
| Cách xử lý một chức năng           | File tương ứng trong `controllers/`       |
| Tên, giá, mô tả, danh mục sản phẩm | Collection `books` trong MongoDB Compass  |

Trong Compass, kết nối cùng URI với `.env`, rồi mở `thuthanh_bookstore` → `books`. Giá lưu bằng số, ví dụ `25000`; nhấn Update và tải lại website để thấy thay đổi. Giữ nguyên `_id` và SKU khi sửa một sản phẩm đã có. Đơn hàng cũ vẫn giữ giá tại thời điểm đặt.

Ảnh nằm trong `public/images`, MongoDB chỉ giữ đường dẫn. Khi đổi ảnh, chép ảnh mới vào thư mục rồi sửa trường `image` của sản phẩm. Banner hiện tại là `public/images/banner-manga-corner.webp`. Hình ảnh, font và dữ liệu ban đầu được lấy từ bộ tài nguyên EM3.

Collection `sessions` giúp website nhớ đăng nhập và giỏ hàng khi chuyển trang. Ứng dụng tự quản lý phần này, không cần sửa thủ công. Tài khoản nằm trong `users`, đơn hàng nằm trong `orders`.

## Gửi dự án cho người khác

Gửi source code kèm `data.json` và thư mục `public`. Người nhận cài thư viện, tạo `.env`, bật MongoDB, nhập dữ liệu rồi chạy web theo các bước ở trên. Không cần gửi `node_modules`; `npm install` sẽ cài lại thư viện.

`data.json` là bản dữ liệu đã xuất để chia sẻ. Khi website chạy, sản phẩm được đọc từ MongoDB; sửa file JSON không tự cập nhật DB và sửa DB cũng không tự cập nhật file JSON.

Nếu gặp lỗi kết nối, kiểm tra MongoDB Server đã chạy và URI đúng. Khi đổi `.env`, khởi động lại server để áp dụng cấu hình mới.
