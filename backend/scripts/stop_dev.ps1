$ports = @(3010, 5173, 4173, 5174)
foreach ($p in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host ("Stopped PID {0} on port {1}" -f $c.OwningProcess, $p)
    }
}
Start-Sleep -Milliseconds 600
foreach ($p in $ports) {
    $left = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    if ($left) { Write-Host ("Port {0} still busy" -f $p) } else { Write-Host ("Port {0} free" -f $p) }
}
