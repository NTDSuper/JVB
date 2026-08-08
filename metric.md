# Dashboard KPI

## 1. Revenue (Doanh thu)

**Công thức**


Revenue = Σ (Price × Quantity)


**Ý nghĩa**

-   Tổng doanh thu từ các đơn hàng đã thanh toán hoặc hoàn thành.
-   Chỉ số phản ánh quy mô bán hàng.

------------------------------------------------------------------------

## 2. Cost (Giá vốn)

**Công thức**


Cost = Σ (Cost Price × Quantity)


**Ý nghĩa**

-   Tổng chi phí nhập của hàng hóa đã bán.
-   Dùng để tính lợi nhuận và tỷ lệ chi phí.

------------------------------------------------------------------------

## 3. Net Revenue (Doanh thu thuần)

**Công thức**


Net Revenue = Revenue −  Refund − Cancelled Amount



**Ý nghĩa**

-   Doanh thu thực tế sau các khoản giảm trừ.

------------------------------------------------------------------------

## 4. Total Bill (Tổng số hóa đơn)

**Công thức**


Total Bill = COUNT(Order ID)

**Ý nghĩa**

-   Tổng số đơn hàng phát sinh trong khoảng thời gian thống kê.

------------------------------------------------------------------------

## 5. Average Bill (Giá trị hóa đơn trung bình)

**Công thức**


Average Bill = Revenue / Total Bill


**Ý nghĩa**

-   Giá trị trung bình của mỗi hóa đơn.
-   Đánh giá khả năng bán thêm và mức chi tiêu của khách hàng.

------------------------------------------------------------------------

## 6. Growth / Month (Tăng trưởng theo tháng)

**Công thức**


Growth (%) =
((Revenue tháng hiện tại - Revenue tháng trước)
 / Revenue tháng trước) × 100%


**Ý nghĩa**

-   Đánh giá tốc độ tăng hoặc giảm doanh thu theo tháng.

------------------------------------------------------------------------

## 7. % Cost Margin (Tỷ lệ giá vốn)

**Công thức**


% Cost Margin = (Cost / Revenue) × 100%


**Ý nghĩa**

-   Tỷ lệ giá vốn trên doanh thu.
-   Chỉ số càng thấp thì biên lợi nhuận càng cao.

------------------------------------------------------------------------

# Biểu đồ

## 1. Doanh thu theo ngày / tháng / năm

**Tên:** Revenue Trend

### Trục X

-   Theo ngày: Ngày
-   Theo tháng: Tháng
-   Theo năm: Năm

### Trục Y

-   Doanh thu (VNĐ)

**Công thức**


Revenue = Σ (Price × Quantity)
GROUP BY Day / Month / Year


**Ý nghĩa**

-   Theo dõi xu hướng doanh thu.
-   Phân tích mùa vụ.
-   So sánh hiệu quả kinh doanh giữa các giai đoạn.

------------------------------------------------------------------------

## 2. Doanh thu cùng kỳ tháng trước

**Tên:** Revenue Comparison (Current vs Previous Month)

### Series

-   Revenue tháng hiện tại
-   Revenue tháng trước

### Trục X

-   Ngày trong tháng (1--31)

### Trục Y

-   Doanh thu (VNĐ)

**Ý nghĩa**

-   So sánh doanh thu từng ngày với cùng kỳ tháng trước.
-   Đánh giá hiệu quả chương trình khuyến mãi và tăng trưởng.

------------------------------------------------------------------------

## 3. Tổng bill theo ngày

**Tên:** Daily Total Bills

### Trục X

-   Ngày

### Trục Y

-   Số lượng hóa đơn

**Công thức**


Total Bill = COUNT(Order ID)
GROUP BY Date


**Ý nghĩa**

-   Theo dõi lượng khách mua hàng mỗi ngày.
-   Kết hợp với Average Bill để xác định doanh thu tăng do số lượng
    khách hay giá trị đơn hàng.

------------------------------------------------------------------------

# Product Dashboard KPI

## 1. Tổng số sản phẩm

**Công thức**


Total Products = COUNT(Product ID)


**Ý nghĩa** - Tổng số sản phẩm đang được quản lý trong hệ thống.

------------------------------------------------------------------------

## 2. Tổng số sản phẩm Active

**Công thức**


Active Products = COUNT(Product ID WHERE status='ACTIVE')


**Ý nghĩa** - Số sản phẩm đang được phép kinh doanh và hiển thị.

------------------------------------------------------------------------

## 3. Tổng số sản phẩm quá hạn

**Công thức**


Expired Products = COUNT(Product ID WHERE expiry_date < CURRENT_DATE)


**Ý nghĩa** - Số sản phẩm đã hết hạn sử dụng, cần xử lý hoặc loại bỏ.

------------------------------------------------------------------------

# Biểu đồ

## 1. Số lượng sản phẩm theo từng Category

**Tên:** Products by Category

### Trục X

-   Danh mục sản phẩm

### Trục Y

-   Số lượng sản phẩm

**Công thức**


COUNT(Product ID)
GROUP BY Category


**Ý nghĩa** - Phân bố sản phẩm giữa các danh mục. - Hỗ trợ đánh giá danh
mục nào có nhiều hoặc ít sản phẩm.

------------------------------------------------------------------------

## 2. Danh sách sản phẩm sắp hết hạn

**Điều kiện**


Expiry Date <= CURRENT_DATE + N ngày


*(Ví dụ N = 7 hoặc 30 ngày)*

**Các cột** - Mã sản phẩm - Tên sản phẩm - Danh mục - Tồn kho - Ngày hết
hạn - Số ngày còn lại

**Ý nghĩa** - Cảnh báo sản phẩm sắp hết hạn. - Hỗ trợ giảm thất thoát
bằng cách ưu tiên bán hoặc xử lý.

------------------------------------------------------------------------

## 3. Top 5 sản phẩm bán chạy (Theo số lượng)

**Công thức**

Quantity Sold = SUM(Order Item Quantity)

ORDER BY Quantity Sold DESC
LIMIT 5


**Ý nghĩa** - Xác định sản phẩm bán nhiều nhất theo số lượng. - Hỗ trợ
quản lý tồn kho và lập kế hoạch nhập hàng.

------------------------------------------------------------------------

## 4. Top 5 sản phẩm bán chạy (Theo giá trị)

**Công thức**

Sales Value = SUM(Unit Price × Quantity)

ORDER BY Sales Value DESC
LIMIT 5


**Ý nghĩa** - Xác định sản phẩm mang lại doanh thu cao nhất. - Hỗ trợ
đánh giá hiệu quả kinh doanh của từng sản phẩm.

------------------------------------------------------------------------
# Customer Dashboard KPI

## 1. Tổng số User đang Active

**Công thức**


Active Users = COUNT(User ID WHERE active = TRUE)



**Ý nghĩa**

- Tổng số người dùng đang hoạt động trên hệ thống.
- Phản ánh lượng truy cập theo thời gian thực.
- Hỗ trợ đánh giá tải hệ thống.

---

## 2. Số lượng khách hàng mới

**Công thức**


New Customers =
COUNT(User ID)

WHERE Created Date BETWEEN Start Date AND End Date


**Ý nghĩa**

- Tổng số khách hàng đăng ký mới trong khoảng thời gian thống kê.
- Đánh giá hiệu quả của hoạt động marketing và thu hút khách hàng.

---

## 3. Trung bình User/Bill

**Công thức**

Average Bills Per Customer =
Total Bill / Total Customers Purchased


Trong đó


Total Customers Purchased =
COUNT(DISTINCT User ID)


**Ý nghĩa**

- Trung bình mỗi khách hàng tạo bao nhiêu hóa đơn.
- Chỉ số đánh giá tỷ lệ khách hàng quay lại mua hàng.

---

# Biểu đồ

## 1. Danh sách User

**Tên:** Customer List

### Các cột

- User ID
- Họ tên
- Email
- Ngày đăng ký
- Tổng số Bill
- Tổng tiền đã chi
- Trạng thái

**Ý nghĩa**

- Hiển thị danh sách khách hàng.
- Hỗ trợ tìm kiếm và theo dõi hoạt động mua sắm của từng khách hàng.

---

## 2. Biểu đồ số lượng Bill và số tiền tiêu theo User

**Tên:** Customer Purchase Summary

### Trục X

- Khách hàng

### Trục Y

- Series 1: Tổng số Bill
- Series 2: Tổng tiền đã chi

**Công thức**


Total Bills =
COUNT(Order ID)

GROUP BY User


Total Spending =
SUM(Order Total Amount)

GROUP BY User


**Ý nghĩa**

- So sánh số lần mua hàng và tổng chi tiêu giữa các khách hàng.
- Xác định khách hàng mua nhiều lần hoặc có giá trị cao.

---

## 3. Top User tiêu nhiều nhất

**Tên:** Top Customers by Spending

### Trục X

- Khách hàng

### Trục Y

- Tổng tiền đã chi

**Công thức**


Total Spending =
SUM(Order Total Amount)

GROUP BY User

ORDER BY Total Spending DESC

LIMIT 10


> Có thể thay LIMIT 10 bằng LIMIT 5 nếu dashboard chỉ hiển thị Top 5.

**Ý nghĩa**

- Xác định khách hàng mang lại doanh thu cao nhất.
- Hỗ trợ xây dựng chương trình khách hàng thân thiết (Loyalty).
- Phục vụ các chiến dịch chăm sóc khách hàng VIP.

---


