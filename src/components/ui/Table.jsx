import { Fragment, useMemo, useState } from 'react'
import { Icon } from './Icon'

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
 *
 * `sortable` turns any column that defines `sortValue(row)` into a click-to-sort
 * header (asc → desc → unsorted). Everything else stays exactly as passed.
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
  sortable = false,
  initialSort = null,
}) {
  const [sort, setSort] = useState(initialSort)

  const sorted = useMemo(() => {
    if (!sortable || !sort?.key) return rows
    const col = columns.find((c) => c.key === sort.key)
    const valueOf = col?.sortValue
    if (!valueOf) return rows
    const dir = sort.dir === 'desc' ? -1 : 1
    return [...rows].sort((a, b) => {
      const va = valueOf(a)
      const vb = valueOf(b)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb), 'ar') * dir
    })
  }, [rows, columns, sort, sortable])

  if (!rows?.length) return null

  const toggleSort = (key) =>
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: 'asc' }
      if (s.dir === 'asc') return { key, dir: 'desc' }
      return null
    })

  const expandedFor = (row, i) => renderExpanded?.(row, i) ?? null

  return (
    <div className={`table-wrap ${className}`}>
      <table className={`table ${compact ? 'table--compact' : ''} ${stackOnMobile ? 'table--stack' : ''}`}>
        <thead>
          <tr>
            {columns.map((col) => {
              const canSort = sortable && Boolean(col.sortValue)
              const active = sort?.key === col.key
              return (
                <th
                  key={col.key}
                  style={{ width: col.width, textAlign: col.align || 'start' }}
                  aria-sort={
                    active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                >
                  {canSort ? (
                    <button
                      type="button"
                      className={`th-sort${active ? ' is-active' : ''}`}
                      onClick={() => toggleSort(col.key)}
                    >
                      <span>{col.label}</span>
                      <span className={`th-sort__icon${active && sort.dir === 'asc' ? ' is-asc' : ''}`}>
                        <Icon name="chevronDown" size={13} />
                      </span>
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
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
