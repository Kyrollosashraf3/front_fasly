/**
 * Toolbar — the filter/action strip above every list.
 *
 *   <Toolbar>
 *     <SearchInput ... />
 *     <Tabs options={[...]} value={v} onChange={setV} />
 *     <ToolbarSpacer />
 *     <Button ... />
 *   </Toolbar>
 */
import { SearchInput } from './Field'

export function Toolbar({ children, className = '' }) {
  return <div className={`toolbar ${className}`}>{children}</div>
}

/**
 * Mobile-only sticky copy of the toolbar search.
 *
 * On the phone a `toolbar--scroll` toolbar (with its tabs and filters) scrolls
 * away with the page, so this second copy pins under the topbar instead and
 * stays reachable while the list scrolls. Render it right after the toolbar.
 */
export function ToolbarSearch({ value, onChange, placeholder }) {
  return (
    <div className="toolbar-search-sticky">
      <SearchInput value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  )
}

export function ToolbarSpacer() {
  return <div className="toolbar__spacer" />
}

export function ToolbarGroup({ children }) {
  return <div className="toolbar__group">{children}</div>
}

/**
 * Tabs — pill filter (الكل / محتاج متابعة ...). Options:
 *   [{ value, label, count? }]
 */
export function Tabs({ options, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          className={`tabs__btn ${value === opt.value ? 'is-active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
          {opt.count !== undefined && <span className="tabs__count">{opt.count}</span>}
        </button>
      ))}
    </div>
  )
}
