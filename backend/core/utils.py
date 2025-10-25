import json
import re

from rich import print


def parse_json(text: str):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        json_str = match.group(0)
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            print(f"[red]Failed to parse JSON from string: {e}[/red]")
            raise e
    print("[yellow]No JSON object could be parsed from the input string.[/yellow]")
    raise json.JSONDecodeError(
        "No JSON-like content found in the input string or the input string is not a valid JSON string.",
        "", 0)
