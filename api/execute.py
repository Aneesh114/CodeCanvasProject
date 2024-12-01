from http.server import BaseHTTPRequestHandler
import json
import sys
from io import StringIO
import contextlib

def handler(request):
    if request.method == "POST":
        try:
            # Parse request body
            body = json.loads(request.body)
            code = body.get("code", "")
            
            if not code:
                return {
                    "statusCode": 400,
                    "body": json.dumps({"error": "No code provided"})
                }

            # Capture output
            output = StringIO()
            sys.stdout = output
            
            try:
                # Execute the code
                exec(code, {}, {})
                result = output.getvalue()
                
                return {
                    "statusCode": 200,
                    "body": json.dumps({"output": result or "Code executed successfully"})
                }
            except Exception as e:
                return {
                    "statusCode": 400,
                    "body": json.dumps({"error": str(e)})
                }
            finally:
                sys.stdout = sys.__stdout__
                
        except Exception as e:
            return {
                "statusCode": 500,
                "body": json.dumps({"error": str(e)})
            }
    
    return {
        "statusCode": 405,
        "body": json.dumps({"error": "Method not allowed"})
    }