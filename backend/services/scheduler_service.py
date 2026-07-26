# import logging
# from datetime import datetime, timedelta

# from sqlalchemy import and_

# from database import SessionLocal
# from models.order_model import Order
# from models.payment_model import Payment

# logger = logging.getLogger(__name__)

# Thời gian tối đa order ở trạng thái IN_PROGRESS (phút)
# IN_PROGRESS_TIMEOUT_MINUTES = 5


# def auto_cancel_expired_in_progress_orders():
#     """
#     Tự động hủy đơn hàng và hoàn tiền khi:
#     - Order.status = IN_PROGRESS
#     - Payment.status = "completed" (đã thanh toán)
#     - Thời gian hiện tại > paid_at + IN_PROGRESS_TIMEOUT_MINUTES

#     Xử lý idempotent:
#     - Chỉ xử lý order chưa bị CANCELLED hoặc COMPLETED
#     - Chỉ refund payment chưa bị REFUNDED
#     - restore_stock chỉ chạy 1 lần (dùng check payment.status == "completed")
#     """
#     db = SessionLocal()
#     try:
#         now = datetime.now().replace(tzinfo=None)
#         cutoff_time = now - timedelta(minutes=IN_PROGRESS_TIMEOUT_MINUTES)

#         logger.info(
#             f"[Scheduler] Checking IN_PROGRESS orders paid before {cutoff_time}..."
#         )

#         # Tìm tất cả order đang IN_PROGRESS với payment đã completed và quá hạn
#         expired_orders = (
#             db.query(Order)
#             .join(Payment, Payment.order_id == Order.id)
#             .filter(
#                 Order.status == "in_progress",
#                 Payment.status == "completed",
#                 Payment.paid_at.isnot(None),
#                 Payment.paid_at <= cutoff_time,
#             )
#             .all()
#         )

#         if not expired_orders:
#             logger.info("[Scheduler] No expired IN_PROGRESS orders found.")
#             return

#         logger.info(
#             f"[Scheduler] Found {len(expired_orders)} expired IN_PROGRESS orders to cancel."
#         )

#         for order in expired_orders:
#             try:
#                 # Lấy payment completed gần nhất
#                 payment = (
#                     db.query(Payment)
#                     .filter(
#                         Payment.order_id == order.id,
#                         Payment.status == "completed",
#                     )
#                     .order_by(Payment.id.desc())
#                     .first()
#                 )

#                 if not payment:
#                     logger.warning(
#                         f"[Scheduler] Order #{order.id} has no completed payment, skipping."
#                     )
#                     continue

#                 # Idempotent: nếu payment đã refund rồi thì skip
#                 if payment.refund_at is not None:
#                     logger.info(
#                         f"[Scheduler] Order #{order.id} payment already refunded at {payment.refund_at}, skipping."
#                     )
#                     continue

#                 # Hoàn lại tồn kho
#                 for item in order.items:
#                     product = item.product
#                     product.stock += item.quantity
#                     logger.info(
#                         f"[Scheduler] Restored {item.quantity} to product #{product.id} "
#                         f"- stock now {product.stock}"
#                     )

#                 # Chuyển payment sang REFUNDED
#                 payment.status = "refunded"
#                 payment.refund_at = now

#                 # Chuyển order sang CANCELLED
#                 order.status = "cancelled"

#                 db.commit()

#                 logger.info(
#                     f"[Scheduler] Auto-cancelled Order #{order.id} - "
#                     f"status: in_progress -> cancelled, "
#                     f"payment: completed -> refunded, "
#                     f"refund_at: {payment.refund_at}, "
#                     f"stock restored"
#                 )

#             except Exception as e:
#                 db.rollback()
#                 logger.error(
#                     f"[Scheduler] Failed to auto-cancel Order #{order.id}: {e}"
#                 )
#                 continue

#     except Exception as e:
#         logger.error(f"[Scheduler] Error in auto_cancel_expired_in_progress_orders: {e}")
#         db.rollback()
#     finally:
#         db.close()

#     logger.info("[Scheduler] auto_cancel_expired_in_progress_orders completed.")