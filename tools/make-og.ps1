Add-Type -AssemblyName System.Drawing

$W = 1200; $H = 630
$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'ClearTypeGridFit'

# background
$bg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(10, 14, 13))
$g.FillRectangle($bg, 0, 0, $W, $H)

# faint grid
$grid = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(26, 31, 42, 40), 1)
for ($x = 0; $x -lt $W; $x += 64) { $g.DrawLine($grid, $x, 0, $x, $H) }
for ($y = 0; $y -lt $H; $y += 64) { $g.DrawLine($grid, 0, $y, $W, $y) }

# accent glow, top-left
$glowRect = New-Object System.Drawing.Rectangle(-260, -320, 900, 900)
$gp = New-Object System.Drawing.Drawing2D.GraphicsPath
$gp.AddEllipse($glowRect)
$glow = New-Object System.Drawing.Drawing2D.PathGradientBrush($gp)
$glow.CenterColor = [System.Drawing.Color]::FromArgb(46, 34, 211, 238)
$glow.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 34, 211, 238))
$g.FillEllipse($glow, $glowRect)

$M = 88
$accent = [System.Drawing.Color]::FromArgb(74, 222, 128)
$cyan    = [System.Drawing.Color]::FromArgb(34, 211, 238)

$fMonoS  = New-Object System.Drawing.Font('Consolas', 20, [System.Drawing.FontStyle]::Regular)
$fName   = New-Object System.Drawing.Font('Consolas', 68, [System.Drawing.FontStyle]::Bold)
$fRole   = New-Object System.Drawing.Font('Consolas', 27, [System.Drawing.FontStyle]::Regular)
$fSmall  = New-Object System.Drawing.Font('Consolas', 17, [System.Drawing.FontStyle]::Regular)
$fMetric = New-Object System.Drawing.Font('Consolas', 34, [System.Drawing.FontStyle]::Bold)
$fLabel  = New-Object System.Drawing.Font('Consolas', 14, [System.Drawing.FontStyle]::Regular)

$bAccent = New-Object System.Drawing.SolidBrush($accent)
$bCyan   = New-Object System.Drawing.SolidBrush($cyan)
$bWhite  = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 229, 225))
$bMuted  = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(120, 138, 133))

# prompt line
$g.DrawString('pavan@portfolio:~$ whoami', $fMonoS, $bMuted, $M, 86)

# name
$g.DrawString('PAVAN DHARMA', $fName, $bWhite, ($M - 8), 132)
$g.DrawString('ADAPA', $fName, $bWhite, ($M - 8), 226)

# role line with caret
$g.DrawString('>', $fRole, $bCyan, ($M - 4), 344)
$g.DrawString('Healthcare Data Analyst  |  Data Analyst', $fRole, $bWhite, ($M + 34), 344)
$g.DrawString('SQL  |  Python  |  Tableau  |  Power BI  |  ETL  |  Epic Clarity & Cogito', $fSmall, $bMuted, $M, 396)

# divider
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(70, 34, 211, 238), 1)
$g.DrawLine($pen, $M, 452, ($W - $M), 452)

# metrics row
$metrics = @(
  @{ v = '900K+'; l = 'records analyzed' },
  @{ v = '95%';   l = 'processing time cut' },
  @{ v = '87%';   l = 'forecast accuracy' },
  @{ v = 'M.S.';  l = 'CSE, Mississippi State' }
)
$x = $M
foreach ($item in $metrics) {
  $g.DrawString($item.v, $fMetric, $bCyan, [float]$x, [float]482)
  $g.DrawString($item.l, $fLabel, $bMuted, [float]($x + 3), [float]538)
  $x += 262
}

# footer url
$g.DrawString('adapapavandharma.github.io', $fSmall, $bAccent, [float]$M, [float]578)

$out = 'D:\Pavan\portfolio\assets\og.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
"wrote $out"

