[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$files = @("P1_2022.xls", "P1_2025.xls", "P3_2023.xls", "P6_2025.xls")
$output = @()

foreach($file in $files) {
    $srcPath = Join-Path (Get-Location) $file
    $tempPath = Join-Path (Get-Location) "temp_read.xls"
    Copy-Item $srcPath $tempPath -Force
    
    $fullPath = (Get-Item $tempPath).FullName
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $workbook = $excel.Workbooks.Open($fullPath)
    
    $output += "========== FILE: $file =========="
    $output += "Number of sheets: $($workbook.Sheets.Count)"
    
    # Only read first sheet, first 15 rows
    $sheet = $workbook.Sheets.Item(1)
    $sheetName = $sheet.Name
    $usedRange = $sheet.UsedRange
    $rows = $usedRange.Rows.Count
    $cols = $usedRange.Columns.Count
    $output += "Sheet: $sheetName | Rows: $rows | Cols: $cols"
    
    for($r = 1; $r -le [Math]::Min($rows, 15); $r++) {
        $line = @()
        for($c = 1; $c -le $cols; $c++) {
            $val = $sheet.Cells.Item($r, $c).Text
            $line += $val
        }
        $output += ($line -join "`t")
    }
    $output += ""
    
    $workbook.Close($false)
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
    Remove-Item $tempPath -Force
}

$output | Out-File -FilePath ".\output2.txt" -Encoding UTF8
