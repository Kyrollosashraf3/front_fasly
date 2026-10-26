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
 * Sorting is on by default. Any column with a `sortValue(row)` accessor — or a
 * plain `key` that the row data actually carries — becomes a click-to-sort
 * header (asc → desc → unsorted). Blank values always sink to the bottom, and
 * a column can opt out with `sortable: false` (action cells, checkboxes, …).
 */
const COLLATOR = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' })
const isBlank = (value) => value === null || value === undefined || value === ''

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
  sortable = true,
  initialSort = null,
}) {
  const [sort, setSort] = useState(initialSort)

  // Only offer a header control where the column actually has values to sort.
  const sortableKeys = useMemo(() => {
    const keys = new Set()
    for (const col of columns) {
      if (!col.key || col.sortable === false) continue
      if (typeof col.sortValue === 'function') {
        keys.add(col.key)
        continue
      }
      if (rows?.some((row) => !isBlank(row?.[col.key]))) keys.add(col.key)
    }
    return keys
  }, [columns, rows])

  const sorted = useMemo(() => {
    if (!sortable || !sort?.key || !sortableKeys.has(sort.key)) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return rows
    const valueOf = typeof col.sortValue === 'function' ? col.sortValue : (row) => row?.[col.key]
    const dir = sort.dir === 'desc' ? -1 : 1
    return [...rows].sort((a, b) => {
      const va = valueOf(a)
      const vb = valueOf(b)
      if (isBlank(va) && isBlank(vb)) return 0
      if (isBlank(va)) return 1
      if (isBlank(vb)) return -1
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return COLLATOR.compare(String(va), String(vb)) * dir
    })
  }, [rows, columns, sort, sortable, sortableKeys])

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
              const canSort = sortable && sortableKeys.has(col.key)
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
