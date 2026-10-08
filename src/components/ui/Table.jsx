import { Fragment } from 'react'

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
 *
 * `renderExpanded(row, index)` is optional: whatever it returns is placed in a
 * full-width row directly underneath, so a screen can reveal per-row detail
 * (attendance history, …) without owning any markup. Return null to collapse.
 *
 * `stackOnMobile` turns each row into a card below 768px, using a column's
 * `mobile` label as the field name — wide sheets stay readable on a phone
 * instead of scrolling sideways.
 */
export function Table({
  columns,
  rows,
  rowKey,
  rowClassName,
  renderExpanded,
  compact,
  stackOnMobile = false,
  className = '',
  footer,
}) {
  if (!rows?.length) return null

  const expandedFor = (row, i) => renderExpanded?.(row, i) ?? null

  return (
    <div className={`table-wrap ${className}`}>
      <table className={`table ${compact ? 'table--compact' : ''} ${stackOnMobile ? 'table--stack' : ''}`}>
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
          {rows.map((row, i) => {
            const key = rowKey ? rowKey(row, i) : row.id ?? i
            const detail = expandedFor(row, i)

            return (
              <Fragment key={key}>
                <tr className={rowClassName?.(row, i)}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{ textAlign: col.align || 'start' }}
                      data-label={col.mobile}
                    >
                      {col.render ? col.render(row, i) : row[col.key]}
                    </td>
                  ))}
                </tr>
                {detail && (
                  <tr className="table__detail-row">
                    <td colSpan={columns.length}>{detail}</td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
        {footer && <tfoot>{footer}</tfoot>}
      </table>
    </div>
  )
}
