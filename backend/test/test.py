"""
Test Dashboard Pipeline with keyboard input.

Usage:
    python backend/test/test.py

Type your question and see the dashboard output.
Type 'exit' or 'quit' to stop.
"""

import json
import sys
import os

# Add backend root to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dashboard.pipeline import dashboard_pipeline


def main():
    print("=" * 60)
    print("  DASHBOARD TEST - Keyboard Input")
    print("=" * 60)
    print()
    print("Enter a question to generate a dashboard.")
    print("Examples:")
    print("  - Show monthly revenue")
    print("  - Top 5 products by sales")
    print("  - Revenue per product in June")
    print("  - General report")
    print("  - Customer order statistics")
    print()
    print("Type 'exit' or 'quit' to stop.")
    print()

    while True:
        try:
            question = input(">>> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not question:
            continue

        if question.lower() in ("exit", "quit"):
            print("Goodbye!")
            break

        print()
        print("-" * 60)
        print(f"Question: {question}")
        print("-" * 60)
        print()

        try:
            result = dashboard_pipeline(question)

            print()
            print("=" * 60)
            print("  DASHBOARD OUTPUT")
            print("=" * 60)
            print()

            print(
                json.dumps(
                    result,
                    indent=2,
                    ensure_ascii=False,
                )
            )

            print()
            print(f"=> {len(result)} widget(s) generated")
            print()

        except Exception as e:
            print(f"\n[ERROR] {e}\n", file=sys.stderr)


if __name__ == "__main__":
    main()