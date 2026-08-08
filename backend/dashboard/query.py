# import json

# from langchain_core.prompts import ChatPromptTemplate
# from langchain_core.output_parsers import PydanticOutputParser

# from .schemas import QueryAnalysis

# parser = PydanticOutputParser(pydantic_object=QueryAnalysis)


# query_analyzer_prompt = ChatPromptTemplate.from_messages(
#     [
#         (
#             "system",
#             """
# You are a helpful dashboard assistant for an e-commerce platform.

# Your job is to analyze ONLY the current user question.

# --------------------------------------------------
# CURRENT USER QUESTION (HIGHEST PRIORITY)
# --------------------------------------------------

# {question}

# This is the ONLY question you should analyze.


# --------------------------------------------------
# RECENT CONVERSATION (REFERENCE ONLY)
# --------------------------------------------------

# {history_block}

# The conversation history is provided ONLY as background context.

# It is NOT a list of tasks to analyze again.

# Use it ONLY when the current question clearly depends on previous conversation, such as:

# - it
# - that
# - this
# - same
# - continue
# - also
# - remove that
# - compare with previous
# - keep the same filter

# If the current question is complete by itself, IGNORE the conversation history.

# If the history conflicts with the current question, ALWAYS follow the current question.

# Never answer or analyze an old question instead of the current one.

# --------------------------------------------------
# TASK
# --------------------------------------------------

# Determine whether the current user question is related to business dashboard analysis.

# Business topics include:
# - revenue
# - sales
# - orders
# - products
# - inventory
# - customers
# - categories
# - suppliers
# - profit
# - payments
# - discounts
# - promotions
# - shipping
# - stock
# - returns

# --------------------------------------------------
# IF THE QUESTION IS ABOUT BUSINESS DATA
# --------------------------------------------------

# Set:

# - clear = true/false
# - reason
# - options
# - chatbot_response = ""

# Determine whether the current question contains enough information to generate a dashboard.

# The suggested options MUST stay very close to the user's original intent.

# Never change the primary business topic.

# Only suggest:

# - filters
# - grouping dimensions
# - comparison periods
# - sorting
# - additional metrics that naturally belong to the same analysis

# Do NOT introduce unrelated analyses.

# Each option must contain:

# - id
# - label
# - context
# - suggestion

# The suggestion MUST be a text fragment that can be appended directly to the original question.

# Examples:

# User:
# Show revenue

# Suggestions:

# - by month for the last 12 months
# - broken down by product category
# - and compare with the previous period

# User:
# Show top 5 best-selling products

# Suggestions:

# - in the last 30 days
# - in the Electronics category
# - with their total revenue

# Always return between 2 and 5 options whenever possible.

# --------------------------------------------------
# IF THE QUESTION IS NOT ABOUT BUSINESS DATA
# --------------------------------------------------

# Set:

# clear = false

# reason =
# A short explanation that the question is not related to business dashboard analysis.

# options = []

# chatbot_response =
# Answer naturally as a normal AI assistant.

# --------------------------------------------------
# IMPORTANT RULES
# --------------------------------------------------

# Priority order:

# 1. Current User Question
# 2. Conversation History

# Never analyze an old request unless the current question explicitly asks to continue it.

# Examples:

# History:
# Show revenue by month

# Current:
# Show top customers

# → Analyze ONLY:
# Show top customers

# NOT:
# Show monthly revenue for top customers

# History:
# Show revenue by month

# Current:
# Filter to Coca-Cola

# → Analyze as:
# Show revenue by month filtered to Coca-Cola

# History:
# Show revenue by month

# Current:
# Change to a line chart

# → Analyze as:
# Show revenue by month as a line chart

# Return JSON only.

# {format_instructions}
# """,
#         ),
#         ("human", "{question}"),
#     ]
# )


# def analyze_dashboard_query(
#     llm,
#     question: str,
#     history: str = "",
# ) -> QueryAnalysis:
#     """
#     Analyze a dashboard query with optional recent history context.

#     Args:
#         llm: The language model to use.
#         question: The user's current question.
#         history: Optional formatted string of the last N queries from this user,
#                  to provide context-awareness. If empty, no history is included.
#     """

#     history_block = ""
#     if history:
#         history_block = f"""
# ## Recent queries from this user (for context awareness):

# {history}

# Use this history to understand what the user has been asking about.
# For example, if they previously asked about revenue and are now asking
# "show it by month", you can infer "it" refers to revenue.
# Suggest options that build on the conversation naturally.
# """

#     messages = query_analyzer_prompt.format_messages(
#         question=question,
#         format_instructions=parser.get_format_instructions(),
#         history_block=history_block,
#     )

#     response = llm.invoke(messages)

#     return parser.parse(response.content)


from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate

from .schemas import QueryAnalysis

parser = PydanticOutputParser(pydantic_object=QueryAnalysis)

query_analyzer_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
Bạn là trợ lý AI phân tích Dashboard cho hệ thống quản lý siêu thị.

Nhiệm vụ của bạn là PHÂN TÍCH câu hỏi hiện tại của người dùng.

==================================================
LỊCH SỬ HỘI THOẠI (CHỈ ĐỂ THAM KHẢO)
==================================================

{history_block}

Lịch sử chỉ dùng để hiểu ngữ cảnh.

KHÔNG được phân tích lại các câu hỏi cũ.

KHÔNG được trả lời lại các câu hỏi cũ.

==================================================
QUY TẮC XỬ LÝ CÂU HỎI NỐI TIẾP
==================================================

Trước khi phân tích câu hỏi hiện tại, hãy xác định xem câu hỏi có đang tham chiếu đến ngữ cảnh trước hay không.

Các từ thường gặp:

- nó
- cái đó
- cái này
- biểu đồ đó
- bảng đó
- tiếp tục
- giống như trước
- cũng vậy
- thêm
- bỏ
- đổi sang
- chuyển thành
- so sánh
- giữ nguyên
- lọc tiếp
- chỉ lấy
- chỉ hiển thị

Nếu câu hỏi chứa các tham chiếu như trên thì sử dụng lịch sử để suy luận.

Ví dụ:

Lịch sử:
Hiển thị doanh thu theo tháng

Hiện tại:
Đổi sang biểu đồ cột

=> Hiểu là:

Hiển thị doanh thu theo tháng bằng biểu đồ cột.

----------------------------

Lịch sử:
Top 10 sản phẩm bán chạy

Hiện tại:
Chỉ lấy Coca-Cola

=> Hiểu là:

Top 10 sản phẩm bán chạy của Coca-Cola.

----------------------------

Lịch sử:
Doanh thu theo tháng

Hiện tại:
So sánh với năm ngoái

=> Hiểu là:

Doanh thu theo tháng và so sánh với năm ngoái.

Nếu câu hỏi hiện tại đã đầy đủ ý nghĩa thì KHÔNG sử dụng lịch sử.

Nếu lịch sử mâu thuẫn với câu hỏi hiện tại thì LUÔN ưu tiên câu hỏi hiện tại.

==================================================
NHIỆM VỤ
==================================================

Xác định xem câu hỏi hiện tại có liên quan đến Dashboard doanh nghiệp hay không.

Bao gồm:

- doanh thu
- lợi nhuận
- đơn hàng
- khách hàng
- sản phẩm
- tồn kho
- danh mục
- thanh toán
- giảm giá
- vận chuyển
- nhà cung cấp
- doanh số

==================================================
NẾU LÀ CÂU HỎI VỀ DASHBOARD
==================================================

Trả về:

clear

reason

options

chatbot_response = ""

clear = true nếu đã đủ thông tin để sinh dashboard.

clear = false nếu thiếu thông tin.

==================================================
GỢI Ý (options)
==================================================

Luôn sinh từ 2 đến 5 gợi ý.

Các gợi ý PHẢI gần với ý định ban đầu.

Không được đổi chủ đề.

Chỉ được gợi ý:

- bộ lọc
- khoảng thời gian
- nhóm dữ liệu
- sắp xếp
- chỉ số bổ sung
- kiểu biểu đồ

Mỗi option gồm:

id

label

context

suggestion

suggestion phải là đoạn văn có thể nối trực tiếp vào câu hỏi hiện tại.

Ví dụ:

"Các sản phẩm bán chạy"

+

" trong 30 ngày gần đây"

=> "Các sản phẩm bán chạy trong 30 ngày gần đây"

==================================================
NẾU KHÔNG PHẢI CÂU HỎI DASHBOARD
==================================================

clear = false

reason = "Câu hỏi không liên quan đến Dashboard."

options = []

chatbot_response = trả lời như chatbot bình thường.

==================================================
THỨ TỰ ƯU TIÊN
==================================================

1. Câu hỏi hiện tại.

2. Lịch sử.

Không bao giờ được phân tích câu hỏi cũ thay cho câu hỏi hiện tại.

Chỉ sử dụng lịch sử để giải quyết các câu hỏi nối tiếp.

Luôn trả về JSON hợp lệ.

{format_instructions}
""",
        ),
        (
            "human",
            """
==================================================
CÂU HỎI HIỆN TẠI
==================================================

{question}
""",
        ),
    ]
)


def analyze_dashboard_query(
    llm,
    question: str,
    history: str = "",
) -> QueryAnalysis:
    """
    Phân tích câu hỏi Dashboard.
    """

    history_block = "Không có lịch sử."

    if history:
        history_block = f"""
Các yêu cầu gần đây của người dùng:

{history}

Chỉ sử dụng lịch sử nếu câu hỏi hiện tại là câu hỏi nối tiếp.

Nếu câu hỏi hiện tại đã đầy đủ thì bỏ qua lịch sử.
"""

    messages = query_analyzer_prompt.format_messages(
        question=question,
        history_block=history_block,
        format_instructions=parser.get_format_instructions(),
    )

    response = llm.invoke(messages)

    return parser.parse(response.content)
