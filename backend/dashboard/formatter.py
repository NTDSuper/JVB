"""
Formatter: Convert SQL results into frontend-ready dashboard JSON.
"""

import json
import logging
import re
from typing import Any, Dict, List

from langchain_core.output_parsers import PydanticOutputParser

from .schemas import DashboardOutput, PlannerTask, build_dashboard_output

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

    return build_dashboard_output(
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

Nhiệm vụ của bạn là chuyển đổi kết quả truy vấn SQL thành dữ liệu dashboard theo đúng định dạng JSON được yêu cầu.

========================
THÔNG TIN ĐẦU VÀO
========================

Câu hỏi của người dùng:
{user_question}

Kiểu hiển thị: {task.display}

Loại biểu đồ: {task.chart_type}

Kết quả SQL:
{sql_result}

========================
NGUYÊN TẮC CHUNG
========================

1. Độ chính xác của dữ liệu
2. Khả năng đọc
3. Tính nhất quán
4. Tính thẩm mỹ

KHÔNG ĐƯỢC:
- Thêm, xóa, thay đổi giá trị dữ liệu gốc từ SQL.
- Tự suy luận dữ liệu còn thiếu.
- Thay đổi ý nghĩa của dữ liệu.
- Tự ý sắp xếp lại dữ liệu nếu SQL không yêu cầu.

========================
QUY TẮC THEO DISPLAY
========================

Nếu display = "chart":
- Sinh đầy đủ: summary, display="chart", chart (type, data.labels, data.datasets, options)
- KHÔNG sinh table (để mảng rỗng)

Nếu display = "kpi":
- Chỉ sinh summary là chuỗi KPI (vd: "Tổng doanh thu: 1,234,567 VND")
- display="kpi", chart=null, table=[]

Nếu display = "table":
- Chỉ sinh table (mảng các object), summary mô tả bảng, chart=null

========================
QUY TẮC CHI TIẾT CHO TỪNG LOẠI CHART
========================

--- BAR CHART (type: "bar") ---
- Mỗi dataset: backgroundColor là màu đặc (solid), borderColor cùng tông đậm hơn
- borderWidth: 1 hoặc 2 (số nguyên)
- borderRadius: 4 đến 8 (số nguyên)
- fill: false
- tension: 0
- KHÔNG set "type" trong dataset
- KHÔNG set "yAxisID" trong dataset
- KHÔNG set "stack"

--- LINE CHART (type: "line") ---
- Mỗi dataset: borderColor BẮT BUỘC
- backgroundColor: chỉ set khi fill=true, dùng màu cùng tông với borderColor, opacity ~10-20%
- fill: mặc định false, chỉ true nếu là area chart
- tension: 0.2 đến 0.4 (số thực)
- borderWidth: 2 hoặc 3 (số nguyên)
- KHÔNG set "type" trong dataset
- KHÔNG set "yAxisID" trong dataset
- KHÔNG set "borderRadius"

--- PIE CHART (type: "pie") ---
- Mỗi dataset: backgroundColor là MẢNG màu (mỗi slice một màu)
- borderColor là MẢNG màu tương ứng
- Mỗi slice phải có màu khác biệt rõ ràng
- KHÔNG set "type", "yAxisID", "fill", "tension", "borderRadius", "stack"

--- DOUGHNUT CHART (type: "doughnut") ---
- Giống pie chart nhưng type = "doughnut"

--- MIXED CHART (type: "mixed") ---
- MỖI dataset PHẢI có "type": "bar" hoặc "line"
- MỖI dataset PHẢI có "yAxisID": "y" hoặc "y1" hoặc "y2"...
- Nếu 2 metric có cùng đơn vị: dùng chung trục y (yAxisID: "y")
- Nếu 2 metric khác đơn vị: dùng 2 trục y (yAxisID: "y" cho trái, "y1" cho phải)
- Khi dùng 2 trục y: options.scales phải có cả "y" và "y1"
- "y" axis: position "left"
- "y1" axis: position "right", grid.drawOnChartArea: false
- Mỗi axis nên có title hiển thị tên đơn vị

========================
VÍ DỤ CỤ THỂ
========================

--- BAR CHART ---
{{
  "summary": "Doanh thu theo danh mục sản phẩm",
  "display": "chart",
  "table": [],
  "chart": {{
    "type": "bar",
    "data": {{
      "labels": ["Điện tử", "Thời trang", "Thực phẩm"],
      "datasets": [
        {{
          "label": "Doanh thu",
          "data": [150000000, 85000000, 120000000],
          "backgroundColor": "rgba(59, 130, 246, 0.75)",
          "borderColor": "#2563eb",
          "borderWidth": 1,
          "borderRadius": 6,
          "fill": false,
          "tension": 0
        }}
      ]
    }}
  }}
}}

--- LINE CHART ---
{{
  "summary": "Doanh thu theo tháng năm 2024",
  "display": "chart",
  "table": [],
  "chart": {{
    "type": "line",
    "data": {{
      "labels": ["T1", "T2", "T3", "T4", "T5", "T6"],
      "datasets": [
        {{
          "label": "Doanh thu",
          "data": [120000000, 135000000, 110000000, 150000000, 165000000, 142000000],
          "borderColor": "#f97316",
          "backgroundColor": "rgba(249, 115, 22, 0.1)",
          "borderWidth": 2,
          "fill": true,
          "tension": 0.35
        }}
      ]
    }}
  }}
}}

--- PIE CHART ---
{{
  "summary": "Cơ cấu doanh thu theo danh mục",
  "display": "chart",
  "table": [],
  "chart": {{
    "type": "pie",
    "data": {{
      "labels": ["Điện tử", "Thời trang", "Thực phẩm", "Gia dụng"],
      "datasets": [
        {{
          "label": "Doanh thu",
          "data": [150000000, 85000000, 120000000, 65000000],
          "backgroundColor": ["rgba(59,130,246,0.8)", "rgba(245,158,11,0.8)", "rgba(16,185,129,0.8)", "rgba(239,68,68,0.8)"],
          "borderColor": ["#3b82f6", "#f59e0b", "#10b981", "#ef4444"],
          "borderWidth": 1
        }}
      ]
    }}
  }}
}}

--- DOUGHNUT CHART ---
{{
  "summary": "Cơ cấu đơn hàng theo trạng thái",
  "display": "chart",
  "table": [],
  "chart": {{
    "type": "doughnut",
    "data": {{
      "labels": ["Hoàn thành", "Đang xử lý", "Đã hủy", "Trả lại"],
      "datasets": [
        {{
          "label": "Đơn hàng",
          "data": [450, 120, 35, 18],
          "backgroundColor": ["rgba(16,185,129,0.8)", "rgba(59,130,246,0.8)", "rgba(239,68,68,0.8)", "rgba(245,158,11,0.8)"],
          "borderColor": ["#10b981", "#3b82f6", "#ef4444", "#f59e0b"],
          "borderWidth": 1
        }}
      ]
    }}
  }}
}}

--- MIXED CHART (Line + Bar) ---
{{
  "summary": "Doanh thu và số đơn theo tháng",
  "display": "chart",
  "table": [],
  "chart": {{
    "type": "mixed",
    "data": {{
      "labels": ["T1", "T2", "T3", "T4", "T5", "T6"],
      "datasets": [
        {{
          "label": "Doanh thu",
          "data": [120000000, 135000000, 110000000, 150000000, 165000000, 142000000],
          "type": "bar",
          "backgroundColor": "rgba(59, 130, 246, 0.75)",
          "borderColor": "#2563eb",
          "borderWidth": 1,
          "borderRadius": 6,
          "yAxisID": "y",
          "fill": false,
          "tension": 0
        }},
        {{
          "label": "Số đơn hàng",
          "data": [1200, 1350, 1100, 1500, 1650, 1420],
          "type": "line",
          "borderColor": "#f97316",
          "backgroundColor": "rgba(249, 115, 22, 0.1)",
          "borderWidth": 2,
          "fill": true,
          "tension": 0.35,
          "yAxisID": "y1"
        }}
      ]
    }},
    "options": {{
      "scales": {{
        "x": {{ "ticks": {{ "color": "#666666" }}, "grid": {{ "color": "#dddddd", "drawOnChartArea": true }}, "beginAtZero": true }},
        "y": {{ "ticks": {{ "color": "#666666" }}, "grid": {{ "color": "#dddddd", "drawOnChartArea": true }}, "beginAtZero": true, "position": "left", "title": {{ "display": true, "text": "Doanh thu (VND)", "color": "#666666", "font": {{ "size": 11, "weight": "500" }} }} }},
        "y1": {{ "ticks": {{ "color": "#666666" }}, "grid": {{ "color": "#dddddd", "drawOnChartArea": false }}, "beginAtZero": true, "position": "right", "title": {{ "display": true, "text": "Số đơn hàng", "color": "#666666", "font": {{ "size": 11, "weight": "500" }} }} }}
      }}
    }}
  }}
}}

--- MIXED CHART (2 Bar) ---
{{
  "summary": "Doanh thu và lợi nhuận theo tháng",
  "display": "chart",
  "table": [],
  "chart": {{
    "type": "mixed",
    "data": {{
      "labels": ["T1", "T2", "T3", "T4", "T5", "T6"],
      "datasets": [
        {{
          "label": "Doanh thu",
          "data": [120000000, 135000000, 110000000, 150000000, 165000000, 142000000],
          "type": "bar",
          "backgroundColor": "rgba(59, 130, 246, 0.75)",
          "borderColor": "#2563eb",
          "borderWidth": 1,
          "borderRadius": 6,
          "yAxisID": "y",
          "fill": false,
          "tension": 0
        }},
        {{
          "label": "Lợi nhuận",
          "data": [24000000, 27000000, 22000000, 30000000, 33000000, 28400000],
          "type": "bar",
          "backgroundColor": "rgba(16, 185, 129, 0.75)",
          "borderColor": "#10b981",
          "borderWidth": 1,
          "borderRadius": 6,
          "yAxisID": "y",
          "fill": false,
          "tension": 0
        }}
      ]
    }}
  }}
}}

========================
MÀU SẮC
========================

Tự động chọn bảng màu phù hợp:
- Doanh thu, lợi nhuận, tăng trưởng → tông xanh dương, xanh lá
- Chi phí, lỗ, giảm → tông cam, đỏ
- Trung tính → tông xám, tím

Yêu cầu:
- Hài hòa, hiện đại, chuyên nghiệp
- Độ tương phản tốt trên cả sáng và tối
- Độ bão hòa trung bình đến cao
- Không màu neon, quá nhạt, khó phân biệt
- Không dùng cùng một bảng màu cho mọi biểu đồ
- Mỗi dataset phải có màu khác biệt rõ ràng

========================
OUTPUT
========================

BẮT BUỘC:
- Chỉ trả về JSON hợp lệ, đúng schema
- Không giải thích, không markdown, không ghi chú, không văn bản ngoài JSON
- Dữ liệu phải khớp chính xác với kết quả SQL
- KHÔNG thêm dữ liệu không có trong SQL
- borderWidth phải là số nguyên (integer), không được dùng số thập phân

Bây giờ hãy tạo output cho:
- Kiểu hiển thị: {task.display}
- Loại biểu đồ: {task.chart_type}
- Dữ liệu SQL: {sql_result}
"""

    response = llm.invoke(prompt)
    raw = response.content

    logger.debug(f"Raw LLM output: {raw[:500]}...")

    # Try Pydantic parser first, fallback to manual JSON
    try:
        dashboard = formatter_parser.parse(raw)
        logger.info(f"Pydantic parser succeeded for {dashboard.display}")
    except Exception as e:
        logger.warning(f"Pydantic formatter failed: {e}, trying fallback...")
        try:
            dashboard = _parse_dashboard_fallback(raw)
            logger.info(f"Fallback parser succeeded for {dashboard.display}")
            if dashboard.chart:
                logger.info(f"  Chart type: {dashboard.chart.type}, datasets: {len(dashboard.chart.data.datasets)}")
        except Exception as e2:
            logger.error(f"Formatter fallback also failed: {e2}")
            logger.debug(f"Raw LLM output: {raw}")
            # Return minimal valid output with summary
            import json as _json
            try:
                # Try to extract at least the summary
                cleaned = _extract_json(raw)
                data = _json.loads(cleaned)
                summary = data.get("summary", "Error formatting result")
            except Exception:
                summary = "Error formatting result"
            
            dashboard = DashboardOutput(
                summary=summary,
                display="table",
                table=[],
                chart=None,
            )

    logger.info(f"Formatter: formatted as {dashboard.display}")
    return dashboard