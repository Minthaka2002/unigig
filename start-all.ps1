$root = "F:\Final Project 2nd Year\Updated Version\UniGig_Project (1)\unigig"
$secret = '$env:JWT_SECRET="unigig_super_secret_dev_key_change_me"; $env:JWT_ALGORITHM="HS256";'

$svcs = @(
  @{n="auth-service";     p=8001; db="auth_db";     extra='$env:ACCESS_TOKEN_EXPIRE_MINUTES="720";'},
  @{n="task-service";     p=8002; db="task_db";     extra='$env:AUTH_SERVICE_URL="http://localhost:8001"; $env:PRICING_SERVICE_URL="http://localhost:8004"; $env:MATCHING_SERVICE_URL="http://localhost:8003";'},
  @{n="matching-service"; p=8003; db="matching_db"; extra='$env:AUTH_SERVICE_URL="http://localhost:8001"; $env:TASK_SERVICE_URL="http://localhost:8002"; $env:PING_TIMEOUT_SECONDS="60";'},
  @{n="pricing-service";  p=8004; db="pricing_db";  extra=''}
)

foreach ($s in $svcs) {
  $cmd = "Set-Location '$root\services\$($s.n)'; .\.venv\Scripts\Activate.ps1; " +
         "`$env:DATABASE_URL='postgresql://unigig:unigig_dev_pw@localhost:5432/$($s.db)'; " +
         "$secret $($s.extra) uvicorn app.main:app --port $($s.p)"
  Start-Process powershell -ArgumentList "-NoExit","-ExecutionPolicy","Bypass","-Command",$cmd
  Start-Sleep -Seconds 2
}

Start-Process powershell -ArgumentList "-NoExit","-Command","Set-Location '$root\frontend'; npm run dev"
