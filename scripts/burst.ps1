$env:Path = "C:\Program Files\nodejs;$env:Path"
Set-Location "D:\Home form\ako-light-cline"
# resolveTesting.md step 4/5 — 8 consecutive full-suite runs,
# prefix-count verification query after each.
Remove-Item burst.log -ErrorAction SilentlyContinue
for ($i = 1; $i -le 8; $i++) {
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  node "node_modules/vitest/vitest.mjs" run > ("run$i.log") 2>&1
  $sw.Stop()
  $suite = (Get-Content "run$i.log" | Select-String -Pattern "PASS \(\d+\) FAIL \(\d+\)" | Select-Object -Last 1).Line
  $errs = @((Get-Content "run$i.log" | Select-String -Pattern "Errors|Error:|P2002|Unhandled").Line) -join " | "
  $count = node "node_modules/tsx/dist/cli.mjs" scripts/verify-slug-collision-cleanup.ts
  "RUN $i | $($sw.Elapsed.TotalSeconds.ToString('F0'))s | suite: $suite | $errs | counts: $count" | Add-Content burst.log
}
"BURST-DONE" | Add-Content burst.log
Remove-Item run?.log -ErrorAction SilentlyContinue
