/**
 * Table — the shared data table.
 *
 *   <Table
 *     columns={[{ key: 'name', label: 'الاسم', render: (row) => ... }]}
 *     rows={boys}
 *     rowKey={(b) => b.id}
 *     empty={<EmptyState ... />}
 *   />
 *
 * `align` ('start' | 'center' | 'end') and `width` are per-column. Cells are
 * rendered with `render(row, index)` so screens never string-build rows.
 */
export function Table({ columns, rows, rowKey, rowClassName, compact, className = '', footer }) {
  if (!rows?.length) return null

  return (
    <div className={`table-wrap ${className}`}>
      <table className={`table ${compact ? 'table--compact' : ''}`}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width, textAlign: col.align || 'start' }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey ? rowKey(row, i) : row.id ?? i}
              className={rowClassName?.(row, i)}
            >
              {columns.map((col) => (
                <td key={col.key} style={{ textAlign: col.align || 'start' }}>
                  {col.render ? col.render(row, i) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && <tfoot>{footer}</tfoot>}
      </table>
    </div>
  )
}
