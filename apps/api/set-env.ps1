# Set Vercel env vars for akij-mms-api from the local .env.local (values piped, not printed).
$envFile = "C:\Abir\Akij Resources\Strategic planning Department\MMS\.env.local"
$vals = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([A-Za-z0-9_]+)=(.*)$') {
    $vals[$matches[1]] = $matches[2]
  }
}

$names = @("DATABASE_URL", "DATABASE_URL_UNPOOLED", "NEON_AUTH_BASE_URL", "NEON_AUTH_JWKS_URL")
foreach ($n in $names) {
  if ($vals.ContainsKey($n)) {
    $v = $vals[$n]
    Write-Host "Setting $n (len $($v.Length))…"
    & vercel env add $n production --value $v --sensitive --yes 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Host "  WARN: vercel env add $n exited $LASTEXITCODE" }
  } else {
    Write-Host "MISSING: $n not in .env.local"
  }
}
Write-Host "Done."
