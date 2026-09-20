Get-ChildItem "lib/data/product-categories" -Filter "*.ts" |
  Where-Object { $_.Name -notmatch "types|index|commonDownloads" } |
  ForEach-Object {
    Write-Host "=== $($_.BaseName) ==="
    Select-String -Path $_.FullName -Pattern "name: loc" |
      ForEach-Object { $_.Line.Trim() }
  }
