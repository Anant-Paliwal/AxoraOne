export interface ParsedCSVData {
  columns: Array<{ id: string; name: string; type: 'text' | 'select' | 'date' | 'number' }>;
  rows: Array<{ id: string; [key: string]: any }>;
}

export function parseCSV(csvText: string): ParsedCSVData {
  const lines = csvText.split('\n').filter((line) => line.trim());
  
  if (lines.length === 0) {
    return { columns: [], rows: [] };
  }

  // Parse headers
  const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
  
  // Create columns
  const columns = headers.map((header, index) => ({
    id: `col-${index}`,
    name: header,
    type: detectColumnType(lines.slice(1), index),
  }));

  // Parse rows
  const rows = lines.slice(1).map((line, rowIndex) => {
    const values = line.split(',').map((v) => v.trim().replace(/"/g, ''));
    const row: any = { id: `row-${rowIndex}` };
    
    headers.forEach((header, colIndex) => {
      row[header] = values[colIndex] || '';
    });
    
    return row;
  });

  return { columns, rows };
}

function detectColumnType(dataLines: string[], columnIndex: number): 'text' | 'select' | 'date' | 'number' {
  const values = dataLines
    .map((line) => line.split(',')[columnIndex]?.trim().replace(/"/g, ''))
    .filter(Boolean);

  if (values.length === 0) return 'text';

  // Check if all values are numbers
  const allNumbers = values.every((v) => !isNaN(Number(v)));
  if (allNumbers) return 'number';

  // Check if all values are dates
  const allDates = values.every((v) => !isNaN(Date.parse(v)));
  if (allDates) return 'date';

  // Check if limited unique values (likely a select/category)
  const uniqueValues = new Set(values);
  if (uniqueValues.size <= 10 && uniqueValues.size < values.length * 0.5) {
    return 'select';
  }

  return 'text';
}

export function parseJSON(jsonText: string): ParsedCSVData {
  try {
    const data = JSON.parse(jsonText);
    
    if (!Array.isArray(data) || data.length === 0) {
      return { columns: [], rows: [] };
    }

    // Get all unique keys from all objects
    const allKeys = new Set<string>();
    data.forEach((item) => {
      Object.keys(item).forEach((key) => allKeys.add(key));
    });

    // Create columns
    const columns = Array.from(allKeys).map((key, index) => ({
      id: `col-${index}`,
      name: key,
      type: detectJSONColumnType(data, key),
    }));

    // Create rows
    const rows = data.map((item, index) => ({
      id: `row-${index}`,
      ...item,
    }));

    return { columns, rows };
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return { columns: [], rows: [] };
  }
}

function detectJSONColumnType(data: any[], key: string): 'text' | 'select' | 'date' | 'number' {
  const values = data.map((item) => item[key]).filter((v) => v != null);

  if (values.length === 0) return 'text';

  // Check if all values are numbers
  const allNumbers = values.every((v) => typeof v === 'number');
  if (allNumbers) return 'number';

  // Check if all values are dates
  const allDates = values.every((v) => typeof v === 'string' && !isNaN(Date.parse(v)));
  if (allDates) return 'date';

  // Check if limited unique values
  const uniqueValues = new Set(values);
  if (uniqueValues.size <= 10 && uniqueValues.size < values.length * 0.5) {
    return 'select';
  }

  return 'text';
}
