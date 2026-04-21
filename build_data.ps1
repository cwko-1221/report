[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$dir = Get-Location
$xlsFiles = Get-ChildItem -Path $dir -Filter "*.xls" | Where-Object { $_.Name -ne "temp_data.xls" -and $_.Name -ne "temp_read.xls" } | Sort-Object Name

$allData = @()

foreach ($file in $xlsFiles) {
    Write-Host "Processing: $($file.Name)"
    
    $tempPath = Join-Path $dir "temp_read.xls"
    Copy-Item $file.FullName $tempPath -Force
    $fullPath = (Get-Item $tempPath).FullName
    
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $workbook = $excel.Workbooks.Open($fullPath)
    
    $fileData = @{
        filename = $file.Name
        sheets = @()
    }
    
    foreach ($sheet in $workbook.Sheets) {
        $usedRange = $sheet.UsedRange
        $rows = $usedRange.Rows.Count
        $cols = $usedRange.Columns.Count
        
        $sheetRows = @()
        for ($r = 1; $r -le $rows; $r++) {
            $rowData = @()
            for ($c = 1; $c -le $cols; $c++) {
                $cell = $sheet.Cells.Item($r, $c)
                $val = $cell.Text
                if ($val -eq $null) { $val = "" }
                $rowData += $val
            }
            $sheetRows += ,@($rowData)
        }
        
        $fileData.sheets += @{
            name = $sheet.Name
            rows = $sheetRows
        }
    }
    
    $allData += $fileData
    
    $workbook.Close($false)
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
    Start-Sleep -Milliseconds 500
    Remove-Item $tempPath -Force -ErrorAction SilentlyContinue
}

# Convert to JSON
$json = $allData | ConvertTo-Json -Depth 10 -Compress

# Write as a JS file
$jsContent = "const PRELOAD_DATA = " + $json + ";"
$jsPath = Join-Path $dir "js\preloadData.js"
$jsContent | Out-File -FilePath $jsPath -Encoding UTF8

Write-Host ""
Write-Host "Done! Processed $($xlsFiles.Count) files."
Write-Host "Output: $jsPath"
