from http.server import BaseHTTPRequestHandler
import json
import sys
import io
import contextlib
import traceback

def run_code(code):
    try:
        # Create string buffer to capture output
        output_buffer = io.StringIO()
        
        # Redirect stdout to our buffer
        with contextlib.redirect_stdout(output_buffer):
            try:
                # Execute the code and capture its output
                exec(code, {}, {})
                output = output_buffer.getvalue()
                return {
                    "statusCode": 200,
                    "body": json.dumps({"output": output}),
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
                    "body": json.dumps({"error": error_output}),
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
            "body": json.dumps({
                "error": str(e),
                "traceback": traceback.format_exc()
            }),
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
    
    if request.method != "POST":
        return {
            "statusCode": 405,
            "body": json.dumps({"error": "Method not allowed"}),
            "headers": {"Content-Type": "application/json"}
        }
    
    try:
        body = json.loads(request.body)
        if not body or 'code' not in body:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "No code provided"}),
                "headers": {"Content-Type": "application/json"}
            }
        
        return run_code(body['code'])
        
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({
                "error": str(e),
                "traceback": traceback.format_exc()
            }),
            "headers": {"Content-Type": "application/json"}
        }

# Handler for Vercel
class VercelHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        request_body = self.rfile.read(content_length).decode()
        
        request = type('Request', (), {
            'method': 'POST',
            'body': request_body
        })
        
        response = handler(request)
        
        self.send_response(response['statusCode'])
        for key, value in response.get('headers', {}).items():
            self.send_header(key, value)
        self.end_headers()
        
        if 'body' in response:
            self.wfile.write(response['body'].encode())

    def do_OPTIONS(self):
        response = handler(type('Request', (), {'method': 'OPTIONS'}))
        self.send_response(response['statusCode'])
        for key, value in response.get('headers', {}).items():
            self.send_header(key, value)
        self.end_headers()