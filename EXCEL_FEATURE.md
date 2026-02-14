# Excel Data Extraction Feature

This feature allows you to extract data from Excel files (.xls, .xlsx, .xlsm) via an API endpoint.

## Installation

Install the required dependency:
```bash
npm install xlsx
```

## API Endpoint

### POST `/api/excel/extract`

Extract data from an Excel file.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: FormData with `file` field containing the Excel file

**Response (200):**
```json
{
  "success": true,
  "data": {
    "Sheet1": [
      { "Name": "John Doe", "Age": "30", "Email": "john@example.com" },
      { "Name": "Jane Smith", "Age": "25", "Email": "jane@example.com" }
    ],
    "Sheet2": [...]
  },
  "metadata": {
    "fileName": "example.xlsx",
    "fileSize": 12345,
    "sheetNames": ["Sheet1", "Sheet2"],
    "sheetCount": 2,
    "uploadedAt": "2026-02-14T12:00:00.000Z"
  }
}
```

**Error Response (400/500):**
```json
{
  "error": "Error message"
}
```

### GET `/api/excel/extract`

Check API health and supported formats.

**Response (200):**
```json
{
  "message": "Excel extraction API is ready",
  "supportedFormats": [".xls", ".xlsx", ".xlsm"]
}
```

## Frontend Usage

### Using the API Helper

```typescript
import { excelApi, isValidExcelFile } from '@/lib/excel-api'

// Validate file before upload
if (!isValidExcelFile(file)) {
  console.error('Invalid file type')
  return
}

// Extract data
const result = await excelApi.extractData(file)

if ('error' in result) {
  console.error(result.error)
} else {
  console.log('Sheets:', result.data)
  console.log('Metadata:', result.metadata)
}
```

### Using the Component

Import and use the `ExcelUploader` component:

```tsx
import ExcelUploader from '@/components/ExcelUploader'

export default function Page() {
  return <ExcelUploader />
}
```

### Custom Implementation

```tsx
'use client'

import { useState } from 'react'
import { excelApi } from '@/lib/excel-api'

export default function MyComponent() {
  const [file, setFile] = useState<File | null>(null)

  const handleUpload = async () => {
    if (!file) return

    const result = await excelApi.extractData(file)
    
    if ('error' in result) {
      alert(result.error)
    } else {
      // Process the extracted data
      console.log(result.data)
    }
  }

  return (
    <div>
      <input
        type="file"
        accept=".xls,.xlsx,.xlsm"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button onClick={handleUpload}>Upload</button>
    </div>
  )
}
```

## Data Format

The extracted data is returned as a 2D array for each sheet:
- First row typically contains headn array of objects for each sheet:
- The first row of the Excel sheet is used as column headers (object keys)
- Each subsequent row becomes an object with key-value pairs
- Empty cells are represented as empty strings `""`

Example:
```typescript
{
  "Sheet1": [
    { "Name": "John Doe", "Age": "30", "Email": "john@example.com" },
    { "Name": "Jane Smith", "Age": "25", "Email": "jane@example.com" }
  ]
}
```

If your Excel file looks like this:
```
| Name       | Age | Email              |
|------------|-----|--------------------|
| John Doe   | 30  | john@example.com   |
| Jane Smith | 25  | jane@example.com   |
```

You'll get:
```json
[
  { "Name": "John Doe", "Age": "30", "Email": "john@example.com" },
  { "Name": "Jane Smith", "Age": "25", "Email": "jane@example.com" }
]``

## Features

- ✅ Supports multiple Excel formats (.xls, .xlsx, .xlsm)
- ✅ Extracts all sheets from workbook
- ✅ Preserves data structure (rows and columns)
- ✅ Returns comprehensive metadata
- ✅ File type validation
- ✅ Error handling
- ✅ Type-safe TypeScript implementation

## Project Structure

```
app/
└── api/
    └── excel/
        └── extract/
            └── route.ts         # Excel extraction API endpoint

components/
└── ExcelUploader.tsx           # Example upload component

lib/
└── excel-api.ts                # Frontend API helper

types/
└── excel.ts                    # TypeScript type definitions
```

## Next Steps

Some ideas for extending this feature:

1. **Data Validation**: Add validation for specific data formats
2. **Data Transformation**: Convert data to specific formats (JSON objects, CSV, etc.)
3. **Database Import**: Save extracted data directly to database
4. **File Storage**: Store uploaded files in cloud storage (S3, Supabase Storage)
5. **Batch Processing**: Handle multiple file uploads
6. **Progress Tracking**: Add upload progress indicators
7. **Advanced Parsing**: Handle merged cells, formulas, styling
8. **Export**: Convert extracted data to different formats

## Troubleshooting

**"Invalid file type" error:**
- Ensure the file has a valid Excel extension (.xls, .xlsx, .xlsm)
- Check that the file is not corrupted

**"Failed to extract data" error:**
- Verify the Excel file is not password-protected
- Ensure the file is not corrupted
- Check server logs for detailed error messages

**Empty data returned:**
- Verify the Excel file contains data
- Check if sheets are hidden
- Ensure data starts from the first row/column
