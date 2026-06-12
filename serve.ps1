$port = 8080
$root = Join-Path $PSScriptRoot "FRONTEND"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Servidor en http://localhost:$port  --  Ctrl+C para detener"
Start-Process "http://localhost:$port"

while ($listener.IsListening) {
    try {
        $ctx  = $listener.GetContext()
        $req  = $ctx.Request
        $res  = $ctx.Response
        $path = $req.Url.LocalPath
        if ($path -eq '/') { $path = '/index.html' }
        $file = Join-Path $root ($path.TrimStart('/').Replace('/', '\'))
        try {
            if (Test-Path $file -PathType Leaf) {
                $ext  = [IO.Path]::GetExtension($file)
                $mime = switch ($ext) {
                    '.html' { 'text/html; charset=utf-8' }
                    '.css'  { 'text/css; charset=utf-8' }
                    '.js'   { 'application/javascript; charset=utf-8' }
                    default { 'application/octet-stream' }
                }
                $bytes = [IO.File]::ReadAllBytes($file)
                $res.ContentType     = $mime
                $res.ContentLength64 = $bytes.Length
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $idx   = [IO.File]::ReadAllBytes((Join-Path $root 'index.html'))
                $res.ContentType     = 'text/html; charset=utf-8'
                $res.ContentLength64 = $idx.Length
                $res.OutputStream.Write($idx, 0, $idx.Length)
            }
        } catch {}
        try { $res.Close() } catch {}
    } catch { break }
}
