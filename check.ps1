$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open("$PSScriptRoot\P4_2025.xls")
$sheet = $wb.Sheets.Item(1)
$maxR = $sheet.UsedRange.Rows.Count
for ($r=$maxR-10; $r -le $maxR; $r++) { 
    $r1=$sheet.Cells.Item($r,1).Text
    $r2=$sheet.Cells.Item($r,2).Text
    Write-Host "Row $r : $r1 , $r2" 
}
$wb.Close($false)
$excel.Quit()
