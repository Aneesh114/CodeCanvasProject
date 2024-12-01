from http.server import BaseHTTPRequestHandler
import json
import sys
import io
import contextlib
import traceback

def run_code(code):
    try:
        output_buffer = io.StringIO()
        with contextlib.redirect_stdout(output_buffer):
            try:
                exec(code, {}, {})
                output = output_buffer.getvalue()
                return {
                    "statusCode": 200,
                    "body": {"output": output},
                    "headers": {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "POST, OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type"
                    }
                }
            except Exception as e:
                error_output = f"Error: {str(e)}\n{traceback.format_exc()}"
                return {
                    "statusCode": 400,
                    "body": {"error": error_output},
                    "headers": {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "POST, OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type"
                    }
                }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": {"error": str(e)},
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        }

def handler(request):
    if request.method == "OPTIONS":
        return {
            "statusCode": 204,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        }

    try:
        body = json.loads(request.body)
        code = body.get('code')
        if not code:
            return {
                "statusCode": 400,
                "body": {"error": "No code provided"},
                "headers": {"Content-Type": "application/json"}
            }
        
        result = run_code(code)
        return result

    except Exception as e:
        return {
            "statusCode": 500,
            "body": {"error": str(e)},
            "headers": {"Content-Type": "application/json"}
        }