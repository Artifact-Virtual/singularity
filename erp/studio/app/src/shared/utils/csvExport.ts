/**
 * CSV Export Utility
 * Exports data arrays to downloadable CSV files
 */

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
): void {
  if (data.length === 0) return;

  // Determine columns — use provided or auto-detect from first record
  const cols = columns || Object.keys(data[0]).map(key => ({ key: key as keyof T, label: key as string }));

  // Build header row
  const header = cols.map(c => `"${String(c.label).replace(/"/g, '""')}"`).join(',');

  // Build data rows
  const rows = data.map(row =>
    cols.map(col => {
      const val = row[col.key];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'object' && val !== null) {
        if ('toISOString' in val) return `"${(val as any).toISOString()}"`;
        return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      }
      return `"${String(val).replace(/"/g, '""')}"`;

    }).join(',')
  );

  const csv = [header, ...rows].join('\n');

  // Trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
