#!/usr/bin/env python3
"""
Servidor HTTP com threading + compressão gzip pra Chronicles of Clivor.

Igual ao "python -m http.server 8000", mas:
1) atende vários arquivos ao mesmo tempo em vez de um por vez (o
   gat-1.html carrega ~29 scripts + várias imagens de uma vez)
2) comprime JS/CSS/HTML/JSON/SVG com gzip antes de enviar, o que
   reduz bastante o tamanho transferido — essencial quando o acesso
   é via túnel/internet (upload do celular servidor costuma ser o
   gargalo, e texto comprime muito bem, geralmente 60-80% menor).

Uso: dentro da pasta do projeto (mesma pasta onde roda o comando de
sempre), execute:
    python serve.py

Aceita porta customizada:
    python serve.py 8080
"""
import sys
import os
import gzip
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

# Extensões que compensam comprimir (texto). Imagens (png/webp/jpg) já
# vêm comprimidas e não se beneficiam de gzip, então não mexemos nelas.
COMPRESSIBLE_EXT = ('.js', '.css', '.html', '.json', '.svg', '.txt')


class Handler(SimpleHTTPRequestHandler):
    # Cache leve pra imagens/JS durante a sessão de teste (evita
    # rebaixar tudo de novo em cada F5 quando nada mudou). Se estiver
    # editando um arquivo e o navegador insistir em mostrar a versão
    # antiga, é só dar um hard refresh (Ctrl+Shift+R no PC).
    def end_headers(self):
        if self.path.endswith(('.js', '.png', '.webp', '.jpg', '.jpeg', '.css')):
            self.send_header('Cache-Control', 'public, max-age=300')
        else:
            self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    # Abre gat-1.html direto ao acessar a raiz ("/"), em vez de
    # mostrar a listagem de arquivos da pasta — assim o jogo abre
    # igual um jogo de verdade, sem precisar clicar em nada.
    def do_GET(self):
        if self.path == '/':
            self.path = '/gat-1.html'

        # Resolve o caminho local do arquivo pedido (sem query string)
        clean_path = self.path.split('?', 1)[0]
        local_path = self.translate_path(clean_path)
        accept_encoding = self.headers.get('Accept-Encoding', '')

        if (os.path.isfile(local_path)
                and local_path.lower().endswith(COMPRESSIBLE_EXT)
                and 'gzip' in accept_encoding):
            try:
                with open(local_path, 'rb') as f:
                    raw = f.read()
                compressed = gzip.compress(raw, compresslevel=6)
                ctype = self.guess_type(local_path)
                self.send_response(200)
                self.send_header('Content-Type', ctype)
                self.send_header('Content-Encoding', 'gzip')
                self.send_header('Content-Length', str(len(compressed)))
                self.end_headers()
                self.wfile.write(compressed)
                return
            except (OSError, BrokenPipeError, ConnectionResetError):
                # Se algo falhar (ex: cliente cancelou), cai pro modo
                # normal de servir arquivo abaixo.
                pass

        return super().do_GET()


if __name__ == '__main__':
    server = ThreadingHTTPServer(('0.0.0.0', port), Handler)
    print(f'Serving HTTP on 0.0.0.0 port {port} (http://0.0.0.0:{port}/) ... [threaded, gzip]')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nKeyboard interrupt received, exiting.')
        server.shutdown()
