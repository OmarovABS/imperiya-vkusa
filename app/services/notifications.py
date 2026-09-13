async def send_telegram_notification(order_data: dict):
    """Send order notification to Telegram (stub for future implementation)."""
    # TODO: Implement actual Telegram notification
    # Example implementation:
    # import httpx
    # from app.config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
    # message = (
    #     f"New order!\nName: {order_data['customer_name']}\n"
    #     f"Phone: {order_data['phone']}\nAddress: {order_data['address']}\n"
    #     f"Total: {order_data['total_price']}₽"
    # )
    # async with httpx.AsyncClient() as client:
    #     await client.post(
    #         f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
    #         json={"chat_id": TELEGRAM_CHAT_ID, "text": message}
    #     )
    pass