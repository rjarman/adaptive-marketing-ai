import asyncio
import threading
from datetime import datetime, timezone
from queue import Queue, Empty
from typing import AsyncGenerator, Dict, Any, Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from rich import print

from models.schemas import LlmResponseTypes


class StreamMessage(BaseModel):
    response_type: LlmResponseTypes
    content: str
    data: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    model_config = ConfigDict(
        alias_generator=to_camel,
        validate_by_name=True,
        validate_by_alias=True,
    )

    def model_dump(self, *args, **kwargs):
        kwargs.setdefault("by_alias", True)
        return super().model_dump(*args, **kwargs)

    def model_dump_json(self, *args, **kwargs):
        kwargs.setdefault("by_alias", True)
        return super().model_dump_json(*args, **kwargs)


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
                    print(f"[cyan]StreamService: Queue size after END_OF_STREAM: {self.message_queue.qsize()}[/cyan]")
                    self.is_streaming = False
                    print("[cyan]StreamService: Set is_streaming = False[/cyan]")
                else:
                    print("[yellow]StreamService: end_streaming() called but not streaming![/yellow]")
        except Exception as e:
            print(f"[red]StreamService: Exception in end_streaming(): {e}[/red]")
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
                        print(f"[blue]StreamService: Dequeued message: {message}[/blue]")
                    except Empty:
                        if not self.is_streaming and self.message_queue.empty():
                            print("[green]StreamService: Streaming stopped and queue empty, exiting[/green]")
                            break
                        continue

                    message_json = message.model_dump_json()
                    sse_data = f"data: {message_json}\n\n"

                    yield sse_data

                except Exception as e:
                    print(f"[red]StreamService: Exception in stream_messages loop: {e}[/red]")
                    break
        finally:
            with self._lock:
                self.is_streaming = False


stream_service = StreamService()
