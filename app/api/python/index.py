from http.server import BaseHTTPRequestHandler
import json

def run_python_code(code):
    try:
        # Create a local scope for execution
        local_scope = {}
        
        # Execute the code and capture output
        exec(code, {"__builtins__": __builtins__}, local_scope)
        
        # Return any defined variables
        return {
            "success": True,
            "output": str(local_scope.get('result', 'Code executed successfully'))
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data)
            code = data.get('code', '')
            
            # Execute the code
            result = run_python_code(code)
            
            # Send response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_response = {
                "success": False,
                "error": str(e)
            }
            self.wfile.write(json.dumps(error_response).encode())

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()