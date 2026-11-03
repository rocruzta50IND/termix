# Troca os arquivos do Termix pela versão nova já preparada (TASK-069).
# O app prepara a versão nova numa pasta de preparo enquanto está aberto; quando ele fecha, este script (lançado pelo app, a partir de uma
# cópia em %TEMP%) espera o Termix sair, copia a versão nova por cima da instalada e, se pedido, abre o Termix de novo.
# Só copia por cima (não apaga nada da pasta instalada): se algo falhar no meio, o app continua abrindo.
param(
  [int]$ParentPid,
  [string]$Src,
  [string]$Dst,
  [int]$Restart = 0,
  [string]$Log = ''
)
$ErrorActionPreference = 'Continue'
function Log($m) { if ($Log) { try { Add-Content -LiteralPath $Log -Value ("{0:HH:mm:ss} {1}" -f (Get-Date), $m) -Encoding UTF8 } catch {} } }

Log "inicio: pid=$ParentPid src=$Src dst=$Dst restart=$Restart"
try { if ($ParentPid -gt 0) { Wait-Process -Id $ParentPid -Timeout 90 -ErrorAction SilentlyContinue } } catch {}
Start-Sleep -Milliseconds 800

# sobras do Termix (ex.: processos filhos) ainda usando arquivos da pasta instalada
$dstFull = [IO.Path]::GetFullPath($Dst).TrimEnd('\') + '\'
for ($i = 0; $i -lt 3; $i++) {
  Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith($dstFull, [StringComparison]::OrdinalIgnoreCase) } |
    ForEach-Object { Log ("encerrando sobra: " + $_.Id + " " + $_.Path); Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 500
}

$ok = $false
if ((Test-Path -LiteralPath (Join-Path $Src 'Termix.exe')) -and (Test-Path -LiteralPath (Join-Path $Src 'resources\app\package.json'))) {
  # /E subpastas; /IS /IT copia mesmo quando o arquivo parece igual; sem /MIR: nunca apaga nada da pasta instalada
  & robocopy.exe $Src $Dst /E /IS /IT /R:10 /W:2 /NFL /NDL /NJH /NJS /NP | Out-Null
  $code = $LASTEXITCODE
  Log "robocopy saiu com $code"
  if ($code -lt 8) { $ok = $true }
} else { Log "pasta de preparo incompleta: nada foi copiado" }

if ($ok) {
  try { Remove-Item -LiteralPath $Src -Recurse -Force -ErrorAction SilentlyContinue } catch {}
  try { Remove-Item -LiteralPath (Join-Path (Split-Path $Src -Parent) 'staged.json') -Force -ErrorAction SilentlyContinue } catch {}
  Log "troca concluida"
}
if ($Restart -eq 1) {
  Log "abrindo o Termix"
  Start-Process -FilePath (Join-Path $Dst 'Termix.exe')
}
