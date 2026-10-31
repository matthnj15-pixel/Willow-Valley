"""Test both Pages scopes from one branch, without changing generated files."""
import http.server
import urllib.parse
class Handler(http.server.SimpleHTTPRequestHandler):
 def translate_path(self,path):
  if urllib.parse.urlsplit(path).path.startswith('/dev/'):
   path=path[4:]
  return super().translate_path(path)
http.server.ThreadingHTTPServer(('127.0.0.1',4173),Handler).serve_forever()
