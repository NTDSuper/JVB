"""
Formatter: Convert SQL results into frontend-ready dashboard JSON.
"""

import json
import logging
import re
from typing import Any, Dict, List

from langchain_core.output_parsers import PydanticOutputParser

from .schemas import DashboardOutput, PlannerTask

logger = logging.getLogger(__name__)

# ── Parser ───────────────────────────────────────────────────────────────────

formatter_parser = PydanticOutputParser(pydantic_object=DashboardOutput)


def _extract_json(text: str) -> str:
    """Extract JSON object from LLM response (handles markdown fences, extra text)."""
    # Try to find ```json ... ``` block
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        return match.group(1).strip()

    # Try to find {...} object directly
    match = re.search(r"(\{[\s\S]*\})", text)
    if match:
        return match.group(1).strip()

    return text.strip()


def _parse_dashboard_fallback(text: str) -> DashboardOutput:
    """Fallback: parse JSON manually when PydanticOutputParser fails."""
    cleaned = _extract_json(text)
    data = json.loads(cleaned)

    return DashboardOutput(
        summary=data.get("summary", ""),
        display=data.get("display", "table"),
        table=data.get("table", []),
        chart=data.get("chart"),
    )


def run_formatter(
    llm,
    user_question: str,
    sql_result: str,
    task: PlannerTask,
) -> DashboardOutput:
    """Format SQL result into a DashboardOutput object."""
    logger.info(f"Formatter: formatting result for display={task.display}")

    prompt = f"""
{formatter_parser.get_format_instructions()}

Bạn là Dashboard Formatter AI.

Nhiệm vụ của bạn là chuyển đổi kết quả truy vấn SQL thành dữ liệu dashboard theo đúng định dạng được yêu cầu. Dashboard phải phản ánh chính xác dữ liệu từ cơ sở dữ liệu và phù hợp để hiển thị trên giao diện.

========================
THÔNG TIN ĐẦU VÀO
========================

Câu hỏi của người dùng:
{user_question}

Kiểu hiển thị:
{task.display}

Loại biểu đồ:
{task.chart_type}

Kết quả SQL:
{sql_result}

========================
NGUYÊN TẮC CHUNG
========================

Các quy tắc dưới đây là BẮT BUỘC.

Mức độ ưu tiên khi xử lý:

1. Độ chính xác của dữ liệu
2. Khả năng đọc
3. Tính nhất quán
4. Tính thẩm mỹ

Không được:

- Thêm dữ liệu không có trong kết quả SQL.
- Xóa dữ liệu.
- Thay đổi giá trị dữ liệu.
- Tự suy luận dữ liệu còn thiếu.
- Thay đổi ý nghĩa của dữ liệu.
- Tự ý sắp xếp lại dữ liệu nếu SQL không yêu cầu.

Không sử dụng màu ngẫu nhiên.

Màu sắc phải phản ánh ý nghĩa của dữ liệu khi phù hợp.

Ví dụ:
- Doanh thu, lợi nhuận, tăng trưởng → ưu tiên các tông tích cực.
- Chi phí, lỗ, giảm → ưu tiên các tông cảnh báo.
- Thông tin trung lập → ưu tiên các tông trung tính.

Nếu dữ liệu không mang ý nghĩa đặc biệt, hãy tự động chọn bảng màu hiện đại và dễ đọc.
========================
QUY TẮC THEO DISPLAY
========================

Nếu display là "kpi":

- Chỉ tạo dữ liệu KPI.
- Không sinh labels.
- Không sinh datasets.
- Không sinh bất kỳ style nào của chart.

Nếu display là "table":

- Chỉ tạo dữ liệu bảng.
- Không sinh chart.
- Không sinh style.

Nếu display là "chart":

- Sinh đầy đủ dữ liệu biểu đồ.
- Sinh labels.
- Sinh datasets.
- Sinh đầy đủ style cho biểu đồ.

========================
XỬ LÝ DỮ LIỆU
========================

Nếu kết quả SQL không có dữ liệu:

- Không tạo biểu đồ.
- Trả về trạng thái "Không có dữ liệu".
- Không sinh labels hoặc datasets rỗng.

Nếu dữ liệu quá lớn:

- Chỉ hiển thị lượng dữ liệu phù hợp để biểu đồ dễ đọc.
- Nếu cần, gom các giá trị rất nhỏ thành "Khác".
- Không tạo biểu đồ có quá nhiều nhãn chồng chéo.

========================
QUY TẮC TẠO BIỂU ĐỒ
========================

Chỉ áp dụng khi display = "chart".

Biểu đồ phải:

- Dễ đọc.
- Hiện đại.
- Chuyên nghiệp.
- Giống phong cách Power BI, Tableau hoặc Grafana.
- Ưu tiên tính rõ ràng hơn trang trí.

========================
MÀU SẮC
========================

AI tự lựa chọn bảng màu phù hợp với từng biểu đồ.

Yêu cầu:

- Màu sắc phải hài hòa, hiện đại và chuyên nghiệp.
- Có độ tương phản tốt trên cả giao diện sáng và tối.
- Ưu tiên các màu có độ bão hòa trung bình đến cao.
- Tránh màu quá nhạt, quá sáng, màu neon hoặc khó phân biệt.
- Không sử dụng cùng một bảng màu cho mọi biểu đồ.
- Tự động chọn bảng màu phù hợp với ngữ cảnh và số lượng dữ liệu.
- Ưu tiên các bảng màu dễ phân biệt đối với người mắc các dạng mù màu phổ biến.
- Màu sắc phải giúp người dùng phân biệt dữ liệu nhanh chóng thay vì chỉ mang tính trang trí.
Quy tắc:

- Có độ tương phản tốt trên nền sáng và tối.
- Không dùng màu neon.
- Không dùng màu quá nhạt.
- Không dùng màu khó phân biệt.
- Không dùng cùng một màu cho mọi biểu đồ.
- Tự động chọn bảng màu phù hợp với dữ liệu.

========================
NHIỀU DATASET
========================

Nếu biểu đồ có nhiều dataset:

- Mỗi dataset phải có màu khác biệt rõ ràng.
- Khoảng cách giữa các màu phải đủ lớn để dễ phân biệt.
- Tránh các màu gần giống nhau.
- Giữ tổng thể bảng màu hài hòa.
- Chỉ sử dụng số lượng màu cần thiết.
- Nếu có nhiều dataset, tự động chọn bảng màu có độ tương phản cao.
========================
borderColor
========================

Mỗi dataset phải có:

- borderColor cùng tông với backgroundColor.
- borderColor đậm hơn backgroundColor.
- borderWidth = 2.

========================
backgroundColor
========================

Bar Chart

- Dùng màu đặc.
- Có thể dùng nhiều màu nếu phù hợp.

Line Chart

- Nếu fill = true:
    dùng backgroundColor với opacity khoảng 20%.

- Nếu fill = false:
    có thể bỏ backgroundColor.

Pie / Doughnut

- Mỗi lát có màu khác biệt rõ.
- Hai lát liền kề không được dùng màu gần giống nhau.
- Nếu có trên 10 lát:
    gom các phần rất nhỏ thành "Khác".

========================
BAR CHART
========================

- borderRadius từ 4 đến 8.
- Khoảng cách giữa các cột hợp lý.
- Không để biểu đồ quá dày đặc.

========================
LINE CHART
========================

- tension từ 0.2 đến 0.4.
- fill = false mặc định.
- Chỉ dùng fill = true nếu Area Chart thể hiện dữ liệu tốt hơn.
- Point không quá lớn.

Nếu dữ liệu là chuỗi thời gian:

- Ưu tiên Line Chart.

========================
PIE CHART
========================

- Màu sắc có độ tương phản cao.
- Không có hai lát gần giống nhau.
- Không quá nhiều lát.

========================
LABELS
========================

Axis Label

- #666666

Legend

- #333333

========================
STYLE
========================

Style và dữ liệu phải tách biệt.

Không được:

- Đưa màu vào labels.
- Đưa style vào data.
- Thay đổi dữ liệu để phù hợp với style.

========================
OUTPUT
========================

BẮT BUỘC:

- Chỉ trả về đúng định dạng do formatter_parser yêu cầu.
- Không giải thích.
- Không thêm markdown.
- Không thêm ghi chú.
- Không thêm văn bản ngoài output.
- Output phải hợp lệ để parser có thể parse ngay.
- Mọi giá trị phải tuân thủ đúng schema được yêu cầu.

Bây giờ hãy chuyển đổi kết quả SQL thành dữ liệu dashboard.
"""

    response = llm.invoke(prompt)
    raw = response.content

    # Try Pydantic parser first, fallback to manual JSON
    try:
        dashboard = formatter_parser.parse(raw)
    except Exception as e:
        logger.warning(f"Pydantic formatter failed: {e}, trying fallback...")
        try:
            dashboard = _parse_dashboard_fallback(raw)
        except Exception as e2:
            logger.error(f"Formatter fallback also failed: {e2}")
            logger.debug(f"Raw LLM output: {raw}")
            # Return minimal valid output
            dashboard = DashboardOutput(
                summary="Error formatting result",
                display="table",
                table=[],
                chart=None,
            )

    logger.info(f"Formatter: formatted as {dashboard.display}")
    return dashboard
