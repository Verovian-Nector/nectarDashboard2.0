param(
  [string]$ApiBase = "http://127.0.0.1:8000",
  [string]$Username = "admin",
  [string]$Password = "NectarDev123!",
  [Alias('PropertyTitle')] [string]$Title = "Demo Property (Script)",
  [int]$Beds = 2,
  [int]$Bathrooms = 1,
  [int]$LivingRooms = 1,
  [int]$Parking = 1
)

$ErrorActionPreference = 'Stop'

Write-Host "Authenticating at $ApiBase as '$Username'..." -ForegroundColor Cyan
$token = Invoke-RestMethod -Uri "$ApiBase/token" -Method Post -Body @{ username=$Username; password=$Password } -ContentType 'application/x-www-form-urlencoded'
$headers = @{ Authorization = "Bearer $($token.access_token)" }

$profile = @{ beds = $Beds; bathrooms = $Bathrooms; living_rooms = $LivingRooms; parking = $Parking }
$body = @{
  title = $Title
  content = "Demo content created by create_demo_property.ps1"
  address = "123 Script Lane"
  description = "Created via automation script"
  acf = @{ profilegroup = $profile }
} | ConvertTo-Json -Depth 6

Write-Host "Creating property '$Title' with ACF profile counts..." -ForegroundColor Cyan
$p = Invoke-RestMethod -Uri "$ApiBase/properties" -Method Post -Headers $headers -Body $body -ContentType 'application/json'

Write-Host ("Created Property ID: {0}" -f $p.id) -ForegroundColor Green
Write-Host "Fetching property by ID to verify inventory..." -ForegroundColor Cyan
$propGet = Invoke-RestMethod -Uri ("$ApiBase/properties/" + $p.id) -Method Get -Headers $headers

# Summarize inventory
if ($propGet.inventory) {
  $inv = $propGet.inventory
  Write-Host ("Inventory ID: {0} | Rooms: {1}" -f $inv.id, ($inv.rooms.Count)) -ForegroundColor Green
  foreach ($room in $inv.rooms) {
    $itemCount = if ($room.items) { $room.items.Count } else { 0 }
    Write-Host (" - {0} (items: {1})" -f $room.room_name, $itemCount)
  }
} else {
  Write-Warning "No inventory found on created property."
}

Write-Host "Seeding ACF groups and top-level data via update..." -ForegroundColor Cyan

# Prepare ACF updates (Tenants, Financials, Profile, Inspection)
$acfUpdate = @{
  tenants_group = @{
    tenants_name = "John Doe"
    date_of_birth = "1990-07-12"
    phone = "07123 456789"
    employment_status = "Employed"
    agreement_signed_date = "2025-11-01"
    right_to_rent = @{
      url = "http://localhost:5174/vite.svg"
      filename = "right-to-rent.svg"
      uploaded_at = "2025-11-01T10:00:00Z"
      file_type = "image/svg+xml"
    }
    proof_of_id = @{
      url = "http://localhost:5174/vite.svg"
      filename = "proof-id.svg"
      uploaded_at = "2025-11-01T10:00:00Z"
      file_type = "image/svg+xml"
    }
    emergency_contact = @{ name = "Jane Doe"; phone = "07111 111111" }
    guarantor = @{ name = "Gary Guarant"; email = "gary@example.com"; phone = "07222 222222" }
  }
  financial_group = @{
    rent_to_landord = "£1,200"
    rent_yeild = 5.4
    collection_date = "2025-11-01"
    payment_date = "2025-11-02"
    payment_method = "Standing Order"
  }
  profile_management = @{
    firstname = "Alice"
    lastname = "Landlord"
    email = "alice@example.com"
  }
  inspection_group = @{
    interior_of_property = "Good"
    exterior_of_property = "Good"
    appliance = "Operational"
  }
}

$updatePayload = @{
  acf = $acfUpdate
  financial_info = @{
    rent = 1200
    deposit = 1200
    payment_method = "Standing Order"
    collection_date = "2025-11-01"
  }
  documents = @(
    @{ name = "Assured Shorthold Tenancy Agreement" },
    @{ name = "EPC Certificate" },
    @{ name = "Gas Safety Record" }
  )
  maintenance_records = @(
    @{ title = "Boiler service"; cost = 85; when = "2025-10-15"; status = "Completed" },
    @{ title = "Leak repair"; cost = 120; when = "2025-09-28"; status = "Pending" }
  )
  inspections = @{
    last = "2025-10-20"
    inspector = "QA Bot"
    score = 95
    notes = "Minor scuffs on hallway"
  }
}

$updateJson = $updatePayload | ConvertTo-Json -Depth 8
Write-Host "Updating property with tenants, financials, documents, maintenance, inspections..." -ForegroundColor Cyan
$propUpdated = Invoke-RestMethod -Uri ("$ApiBase/properties/" + $p.id) -Method Put -Headers $headers -Body $updateJson -ContentType 'application/json'

Write-Host "Fetching updated property to verify..." -ForegroundColor Cyan
$propGet2 = Invoke-RestMethod -Uri ("$ApiBase/properties/" + $p.id) -Method Get -Headers $headers

# Summary of seeded data
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host (" - Title: {0}" -f $propGet2.title)
Write-Host (" - Tenant name: {0}" -f ($propGet2.acf.tenants_group.tenants_name))
${finCount} = if ($propGet2.financial_info) { ($propGet2.financial_info.PSObject.Properties).Count } else { 0 }
${docCount} = if ($propGet2.documents) { $propGet2.documents.Count } else { 0 }
${maintCount} = if ($propGet2.maintenance_records) { $propGet2.maintenance_records.Count } else { 0 }
${inspCount} = if ($propGet2.inspections) { ($propGet2.inspections.PSObject.Properties).Count } else { 0 }
Write-Host (" - Financial items: {0}" -f $finCount)
Write-Host (" - Documents: {0}" -f $docCount)
Write-Host (" - Maintenance: {0}" -f $maintCount)
Write-Host (" - Inspections: {0}" -f $inspCount)

Write-Host "Listing properties to confirm presence..." -ForegroundColor Cyan
$props = Invoke-RestMethod -Uri "$ApiBase/properties" -Method Get -Headers $headers
Write-Host ("Total Properties: {0}" -f $props.Count) -ForegroundColor Green

Write-Host "Done." -ForegroundColor Cyan