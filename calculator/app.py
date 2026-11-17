"""
Simple Multi-Number Calculator Web App using Python Flask.

This backend serves the calculator web page and provides a `/calculate`
endpoint that accepts multiple numbers and performs either Addition (+)
or Subtraction (-), returning the result to display on the same page.
"""

from decimal import Decimal, InvalidOperation
from flask import Flask, jsonify, render_template, request

# Initialize the Flask application
app = Flask(__name__)


def format_number(value: Decimal) -> str:
    """
    Format a Decimal cleanly for display:
    - Removes unnecessary trailing zeros (e.g., 175.00 -> 175, 12.50 -> 12.5)
    - Avoids scientific notation for normal numbers
    """
    normalized = value.normalize()
    text = format(normalized, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return "0" if text == "-0" else text


def perform_calculation(raw_numbers: list, operation: str) -> dict:
    """
    Validate a list of raw number inputs and calculate either their sum
    or sequential difference (num1 - num2 - num3 ...).
    """
    # Filter out completely blank inputs while tracking invalid entries
    cleaned_numbers: list[Decimal] = []

    for index, item in enumerate(raw_numbers, start=1):
        text = str(item).strip()
        if text == "":
            continue
        try:
            cleaned_numbers.append(Decimal(text))
        except InvalidOperation:
            return {
                "success": False,
                "error": f"Number {index} ('{text}') is not a valid number.",
            }

    # Ensure at least two numbers are provided for a meaningful calculation
    if len(cleaned_numbers) < 2:
        return {
            "success": False,
            "error": "Please enter at least 2 valid numbers to calculate.",
        }

    # Perform Addition or Subtraction
    if operation == "add":
        result = sum(cleaned_numbers, Decimal("0"))
        symbol = "+"
        operation_label = "Addition"
    elif operation == "subtract":
        # Sequential subtraction: Number 1 - Number 2 - Number 3 ...
        result = cleaned_numbers[0]
        for num in cleaned_numbers[1:]:
            result -= num
        symbol = "-"
        operation_label = "Subtraction"
    else:
        return {
            "success": False,
            "error": "Invalid operation selected. Please choose Add or Subtract.",
        }

    # Build a readable expression string, e.g., "100 - 50 - 25 = 25"
    formatted_inputs = [format_number(n) for n in cleaned_numbers]
    formatted_result = format_number(result)
    expression = f" {symbol} ".join(formatted_inputs)

    return {
        "success": True,
        "operation": operation,
        "operation_label": operation_label,
        "numbers": formatted_inputs,
        "expression": expression,
        "result": formatted_result,
    }


@app.route("/", methods=["GET"])
def index():
    """Render the calculator homepage."""
    return render_template("index.html")


@app.route("/calculate", methods=["POST"])
def calculate():
    """
    Calculate the sum or difference of multiple numbers.
    Supports JSON requests from JavaScript fetch() as well as standard HTML forms.
    """
    if request.is_json:
        data = request.get_json(silent=True) or {}
        raw_numbers = data.get("numbers", [])
        operation = data.get("operation", "")

        if not isinstance(raw_numbers, list):
            return jsonify({"success": False, "error": "Invalid input format."}), 400

        outcome = perform_calculation(raw_numbers, operation)
        status_code = 200 if outcome["success"] else 400
        return jsonify(outcome), status_code

    # Standard HTML form submission fallback (if JavaScript is disabled)
    raw_numbers = request.form.getlist("numbers[]")
    operation = request.form.get("operation", "")
    outcome = perform_calculation(raw_numbers, operation)

    return render_template(
        "index.html",
        outcome=outcome,
        submitted_numbers=raw_numbers or ["", "", ""],
    )


if __name__ == "__main__":
    # Start the Flask development server
    app.run(debug=True, host="127.0.0.1", port=5000)
