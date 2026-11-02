# Auxiliar da atualização do Termix (TASK-056).
# Quando o Termix fecha para se atualizar não sobra nenhum processo dele para avisar a pessoa; este script
# (lançado pelo app antes de fechar, a partir de uma cópia em %TEMP%) mostra uma janelinha sempre no topo com
# "Atualizando o Termix…" e o tempo decorrido, e some sozinho quando o Termix abre de novo. Nunca fica preso:
# passado o limite de tempo avisa que está demorando e se fecha depois de uns minutos.
# O app grava uma cópia deste arquivo em %TEMP% com BOM (o PowerShell 5.1 precisa dele para ler os acentos) e roda a cópia.
param(
  [int]$ParentPid = 0,
  [string]$Version = '',
  [string]$ProcessName = 'Termix',
  [int]$TimeoutSec = 600,
  [string]$Timeline = '',
  [string]$Shot = ''
)
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$epoch = New-Object DateTime 1970, 1, 1, 0, 0, 0, ([DateTimeKind]::Utc)
function Get-NowMs { return [long]((Get-Date).ToUniversalTime() - $epoch).TotalMilliseconds }

$t0 = Get-Date
# espera o Termix fechar (no máximo 60 s) para a janelinha não aparecer por cima do cartão do próprio app
if ($ParentPid -gt 0) {
  for ($i = 0; $i -lt 240; $i++) {
    $pp = Get-Process -Id $ParentPid -ErrorAction SilentlyContinue
    if (-not $pp -or $pp.HasExited) { break }
    Start-Sleep -Milliseconds 250
  }
}
$script:closedAt = Get-Date
$script:closedMs = Get-NowMs

$W = 400; $H = 134
$accent = [System.Drawing.Color]::FromArgb(91, 157, 255)
$muted = [System.Drawing.Color]::FromArgb(169, 179, 196)

function New-RoundPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

$form = New-Object System.Windows.Forms.Form
$form.FormBorderStyle = 'None'
$form.StartPosition = 'Manual'
$form.TopMost = $true
$form.ShowInTaskbar = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(18, 22, 31)
$form.ClientSize = New-Object System.Drawing.Size($W, $H)
$wa = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$form.Location = New-Object System.Drawing.Point(($wa.Right - $W - 24), ($wa.Bottom - $H - 24))
$edge = New-RoundPath 0 0 $W $H 16
$form.Region = New-Object System.Drawing.Region($edge)
$form.Add_Paint({
  param($s, $e)
  $e.Graphics.SmoothingMode = 'AntiAlias'
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(52, 62, 84)), 2
  $e.Graphics.DrawPath($pen, $edge)
  $pen.Dispose()
})

$fTitle = New-Object System.Drawing.Font('Segoe UI Semibold', 11.5)
$fText = New-Object System.Drawing.Font('Segoe UI', 9.5)
$fSmall = New-Object System.Drawing.Font('Segoe UI', 9)

$title = New-Object System.Windows.Forms.Label
$title.AutoSize = $false; $title.Location = New-Object System.Drawing.Point(20, 16); $title.Size = New-Object System.Drawing.Size(340, 24)
$title.Font = $fTitle; $title.ForeColor = [System.Drawing.Color]::White; $title.BackColor = [System.Drawing.Color]::Transparent
if ($Version) { $title.Text = "Atualizando o Termix para a versão $Version" } else { $title.Text = 'Atualizando o Termix' }

$sub = New-Object System.Windows.Forms.Label
$sub.AutoSize = $false; $sub.Location = New-Object System.Drawing.Point(20, 44); $sub.Size = New-Object System.Drawing.Size(364, 38)
$sub.Font = $fText; $sub.ForeColor = $muted; $sub.BackColor = [System.Drawing.Color]::Transparent
$sub.Text = 'O Termix fechou para se atualizar e abre sozinho quando terminar. Pode levar alguns minutos; não precisa fazer nada.'

$bar = New-Object System.Windows.Forms.Panel
$bar.Location = New-Object System.Drawing.Point(20, 92); $bar.Size = New-Object System.Drawing.Size(360, 6); $bar.BackColor = $form.BackColor
$bar.GetType().GetProperty('DoubleBuffered', [Reflection.BindingFlags]'Instance,NonPublic').SetValue($bar, $true, $null)

$time = New-Object System.Windows.Forms.Label
$time.AutoSize = $false; $time.Location = New-Object System.Drawing.Point(20, 106); $time.Size = New-Object System.Drawing.Size(360, 18)
$time.Font = $fSmall; $time.ForeColor = [System.Drawing.Color]::FromArgb(111, 122, 142); $time.BackColor = [System.Drawing.Color]::Transparent
$time.Text = 'Decorrido: 0 s'

$x = New-Object System.Windows.Forms.Label
$x.AutoSize = $false; $x.Location = New-Object System.Drawing.Point(($W - 34), 8); $x.Size = New-Object System.Drawing.Size(26, 24)
$x.Font = New-Object System.Drawing.Font('Segoe UI', 12); $x.ForeColor = [System.Drawing.Color]::FromArgb(111, 122, 142); $x.BackColor = [System.Drawing.Color]::Transparent
$x.Text = [string][char]0x00D7; $x.TextAlign = 'MiddleCenter'; $x.Cursor = 'Hand'
$x.Add_Click({ $form.Close() })
$x.Add_MouseEnter({ $x.ForeColor = [System.Drawing.Color]::White })
$x.Add_MouseLeave({ $x.ForeColor = [System.Drawing.Color]::FromArgb(111, 122, 142) })

$script:done = $false
$script:doneAt = $null
$script:late = $false
$script:lateAt = $null
$script:phase = 0
$script:shown = $null

$bar.Add_Paint({
  param($s, $e)
  $g = $e.Graphics
  $g.SmoothingMode = 'AntiAlias'
  $w = $bar.Width; $h = $bar.Height
  $track = New-RoundPath 0 0 $w $h 3
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(36, 44, 62))), $track)
  if ($script:done) {
    $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(74, 222, 128))), $track)
  } else {
    $bw = 110
    $pos = [int](($script:phase * 6) % ($w + $bw)) - $bw
    $g.SetClip($track)
    $g.FillRectangle((New-Object System.Drawing.SolidBrush $accent), $pos, 0, $bw, $h)
    $g.ResetClip()
  }
})

function Get-BackAt {
  try {
    $p = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -gt $t0 -and $_.MainWindowHandle -ne [IntPtr]::Zero }
    return [bool]$p
  } catch { return $false }
}
function Save-Shot([string]$suffix) {
  if (-not $Shot) { return }
  try {
    $bmp = New-Object System.Drawing.Bitmap($W, $H)
    $form.DrawToBitmap($bmp, (New-Object System.Drawing.Rectangle(0, 0, $W, $H)))
    $bmp.Save("$Shot-$suffix.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
  } catch { }
}

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 40
$script:tick = 0
$timer.Add_Tick({
  $script:tick++
  $script:phase++
  $bar.Invalidate()
  if ($script:tick % 12 -ne 0) { return }
  $now = Get-Date
  $el = [int]($now - $script:closedAt).TotalSeconds
  if ($el -lt 60) { $time.Text = "Decorrido: $el s" } else { $time.Text = ('Decorrido: {0} min {1:00} s' -f [math]::Floor($el / 60), ($el % 60)) }
  if ($script:tick -eq 36) { Save-Shot '1' }
  if (-not $script:done -and (Get-BackAt)) {
    $script:done = $true; $script:doneAt = $now
    $title.Text = 'Pronto! Abrindo o Termix…'
    $sub.Text = 'A atualização terminou.'
    $bar.Invalidate()
    if ($Timeline) {
      try {
        $o = '{ "closedAt": ' + $script:closedMs + ', "backAt": ' + (Get-NowMs) + ' }'
        [System.IO.File]::WriteAllText($Timeline, $o)
      } catch { }
    }
    Save-Shot '2'
  }
  if ($script:done -and (($now - $script:doneAt).TotalSeconds -gt 1.5)) { $form.Close(); return }
  if (-not $script:done -and -not $script:late -and $el -gt $TimeoutSec) {
    $script:late = $true; $script:lateAt = $now
    $title.Text = 'Está demorando mais que o normal'
    $sub.Text = 'Se o Termix não abrir sozinho, abra-o pelo atalho da área de trabalho ou do menu Iniciar.'
    Save-Shot '3'
  }
  if ($script:late -and (($now - $script:lateAt).TotalSeconds -gt 180)) { $form.Close() }
})

$form.Controls.AddRange(@($title, $sub, $bar, $time, $x))
$form.Add_Shown({ $timer.Start() })
[System.Windows.Forms.Application]::Run($form)
$timer.Stop()
