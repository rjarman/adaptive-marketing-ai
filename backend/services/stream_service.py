import asyncio
import threading
from datetime import datetime, timezone
from queue import Queue, Empty
from typing import AsyncGenerator, Dict, Any, Optional

from pydantic import BaseModel

from models.schemas import LlmResponseTypes


class StreamMessage(BaseModel):
    response_type: LlmResponseTypes
    content: str
    data: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = datetime.now(tz=timezone.utc)


class StreamService:
    def __init__(self):
        self.message_queue: Queue = Queue()
        self.is_streaming = False
        self._lock = threading.Lock()

    def _start_streaming(self):
        with self._lock:
            if not self.is_streaming:
                self.is_streaming = True
                while not self.message_queue.empty():
                    try:
                        self.message_queue.get_nowait()
                    except Empty:
                        break

    def add_message(self, message: StreamMessage):
        with self._lock:
            if not self.is_streaming and message.response_type != LlmResponseTypes.END_OF_STREAM:
                return
            self.message_queue.put(message)

    def end_streaming(self):
        try:
            with self._lock:
                if self.is_streaming:
                    message = StreamMessage(
                        response_type=LlmResponseTypes.END_OF_STREAM,
                        content="Stream completed",
                        data=None,
                        timestamp=None
                    )
                    self.message_queue.put(message)
                    print(f"🔚 StreamService: Queue size after END_OF_STREAM: {self.message_queue.qsize()}")
                    self.is_streaming = False
                    print(f"🔚 StreamService: Set is_streaming = False")
                else:
                    print(f"⚠️ StreamService: end_streaming() called but not streaming!")
        except Exception as e:
            print(f"❌ StreamService: Exception in end_streaming(): {e}")
            import traceback
            traceback.print_exc()

    async def stream_messages(self) -> AsyncGenerator[str, None]:
        self._start_streaming()

        try:
            while True:
                try:
                    await asyncio.sleep(0.01)

                    try:
                        message = self.message_queue.get_nowait()
                        print(f"🔄 StreamService: Dequeued message: {message}")
                    except Empty:
                        if not self.is_streaming and self.message_queue.empty():
                            print(f"🔄 StreamService: Streaming stopped and queue empty, exiting")
                            break
                        continue

                    message_json = message.model_dump_json()
                    sse_data = f"data: {message_json}\n\n"

                    yield sse_data

                except Exception as e:
                    print(f"❌ StreamService: Exception in stream_messages loop: {e}")
                    break
        finally:
            with self._lock:
                self.is_streaming = False


stream_service = StreamService()
