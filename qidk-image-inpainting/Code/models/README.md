To reconstruct model.so:

```$outputFile = "Code\models\model.so"
$parts = Get-ChildItem "Code\models\model.so.part*" | Sort-Object Name
$writer = [System.IO.File]::Create($outputFile)
foreach ($part in $parts) {
    $bytes = [System.IO.File]::ReadAllBytes($part.FullName)
    $writer.Write($bytes, 0, $bytes.Length)
}
$writer.Close()```