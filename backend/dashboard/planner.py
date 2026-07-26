"""
Planner: Decompose user question into SQL tasks.
"""

import json
import logging
import re

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate

from .schemas import PlannerOutput, PlannerTask

logger = logging.getLogger(__name__)

# ── Parser ───────────────────────────────────────────────────────────────────

planner_parser = PydanticOutputParser(pydantic_object=PlannerOutput)

# ── Prompt ───────────────────────────────────────────────────────────────────

planner_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
Bạn là Dashboard Planner AI.

Nhiệm vụ của bạn là phân tích yêu cầu hiện tại của người dùng và chia thành một hoặc nhiều tác vụ SQL độc lập để tạo dashboard.

========================
MỤC TIÊU
========================

Mỗi task phải mô tả chính xác một câu hỏi mà SQL Agent có thể trả lời bằng một truy vấn SQL duy nhất.

Planner KHÔNG tạo SQL.
Planner chỉ tạo kế hoạch.

========================
NGUYÊN TẮC
========================

- Chỉ phân tích câu hỏi hiện tại của người dùng.
- Không sử dụng lịch sử hội thoại.
- Không suy đoán thông tin ngoài yêu cầu.
- Không tự thêm các biểu đồ mà người dùng không yêu cầu.
- Nếu một truy vấn SQL có thể trả lời toàn bộ yêu cầu thì chỉ tạo một task.
- Chỉ chia thành nhiều task khi mỗi phần thể hiện một thông tin độc lập hoặc cần một cách hiển thị khác nhau.

========================
TASK
========================

Mỗi task phải gồm:

tool
- Luôn là "sql"

question
- Là câu hỏi tự nhiên rõ ràng dành cho SQL Agent.
- Không chứa SQL.
- Không chứa tên bảng hoặc cú pháp SQL.
- Phải mô tả đúng dữ liệu cần lấy.

display
Chỉ được là một trong:

- "kpi"
- "chart"
- "table"

chart_type

Chỉ được là một trong:

- "bar"
- "line"
- "pie"
- "none"

Nếu display khác "chart" thì chart_type bắt buộc là "none".

========================
QUY TẮC CHỌN DISPLAY
========================

Chọn display phù hợp nhất với loại dữ liệu.

kpi

Sử dụng khi kết quả chỉ là:

- một giá trị
- một số liệu tổng hợp
- doanh thu
- tổng đơn hàng
- số lượng khách hàng
- tỷ lệ
- giá trị trung bình
- giá trị lớn nhất
- giá trị nhỏ nhất

table

Sử dụng khi:

- người dùng muốn xem danh sách
- cần hiển thị nhiều cột
- dữ liệu chi tiết
- bảng xếp hạng
- lịch sử
- báo cáo dạng bảng

chart

Sử dụng khi:

- cần so sánh
- cần xem xu hướng
- cần xem phân bố
- cần trực quan hóa dữ liệu

========================
QUY TẮC CHỌN CHART
========================

bar

Ưu tiên khi:

- so sánh giữa các nhóm
- top sản phẩm
- top khách hàng
- doanh thu theo danh mục
- số lượng theo nhóm

line

Ưu tiên khi:

- dữ liệu theo thời gian
- doanh thu theo ngày
- doanh thu theo tháng
- tăng trưởng
- xu hướng

pie

Ưu tiên khi:

- tỷ trọng
- cơ cấu
- phần trăm
- phân bố giữa các nhóm

none

Chỉ dùng khi display không phải chart.

========================
TÁCH TASK
========================

Nếu yêu cầu gồm nhiều nội dung độc lập thì tạo nhiều task.

Ví dụ:

"Doanh thu tháng này và top 5 sản phẩm"

↓

Task 1
- KPI doanh thu

Task 2
- Bar chart top 5 sản phẩm

Không gộp hai nội dung khác nhau vào cùng một task.

========================
OUTPUT
========================

BẮT BUỘC:

- Chỉ trả về JSON đúng schema.
- Không giải thích.
- Không markdown.
- Không thêm văn bản.
- Không sinh SQL.
- JSON phải hợp lệ.

{format_instructions}
""",
        ),
        ("human", "{question}"),
    ]
)


def _extract_json(text: str) -> str:
    """Extract JSON array from LLM response (handles markdown fences, extra text)."""
    # Try to find ```json ... ``` block
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        return match.group(1).strip()

    # Try to find [...] array directly
    match = re.search(r"(\[[\s\S]*\])", text)
    if match:
        return match.group(1).strip()

    return text.strip()


def _parse_tasks_fallback(text: str) -> list[PlannerTask]:
    """Fallback: parse JSON manually when PydanticOutputParser fails."""
    cleaned = _extract_json(text)
    data = json.loads(cleaned)

    if isinstance(data, dict):
        # Sometimes LLM wraps in {"tasks": [...]} or similar
        for key in ("tasks", "root", "items"):
            if key in data and isinstance(data[key], list):
                data = data[key]
                break

    if not isinstance(data, list):
        data = [data]

    tasks = []
    for item in data:
        tasks.append(
            PlannerTask(
                tool=item.get("tool", "sql"),
                display=item.get("display", "table"),
                chart_type=item.get("chart_type", "none"),
                question=item.get("question", ""),
            )
        )

    return tasks


def run_planner(llm, question: str) -> list[PlannerTask]:
    """Decompose user question into a list of PlannerTask."""
    logger.info(f"Planner: processing question: {question}")

    chain = (
        planner_prompt.partial(
            format_instructions=planner_parser.get_format_instructions()
        )
        | llm
    )

    response = chain.invoke({"question": question})
    raw = response.content

    # Try Pydantic parser first, fallback to manual JSON
    try:
        tasks = planner_parser.parse(raw).root
    except Exception as e:
        logger.warning(f"Pydantic parser failed: {e}, trying fallback...")
        try:
            tasks = _parse_tasks_fallback(raw)
        except Exception as e2:
            logger.error(f"Fallback also failed: {e2}")
            logger.debug(f"Raw LLM output: {raw}")
            return []

    logger.info(f"Planner: generated {len(tasks)} task(s)")
    for i, task in enumerate(tasks):
        logger.info(
            f"  Task {i+1}: display={task.display}, chart_type={task.chart_type}"
        )

    return tasks
