const tabs = [
  {
    id: 'today',
    label: 'اليوم',
    icon: '☀'
  },
  {
    id: 'progress',
    label: 'تقدمي',
    icon: '▦'
  },
  {
    id: 'community',
    label: 'الرفقة',
    icon: '♡'
  },
  {
    id: 'ranking',
    label: 'الترتيب',
    icon: '♛'
  }
]


export default function BaqarahTabs({
  activeTab,
  currentUser,
  onChange,
  onNeedAuth
}) {
  function choose(tabId) {
    if (
      tabId !== 'today' &&
      !currentUser
    ) {
      onNeedAuth?.()
      return
    }

    onChange?.(tabId)
  }

  return (
    <nav
      className="baqarah-tabs"
      aria-label="أقسام سورة البقرة"
    >
      {tabs.map(
        tab => (
          <button
            type="button"
            key={tab.id}
            className={
              `baqarah-tab ${
                activeTab === tab.id
                  ? 'active'
                  : ''
              }`
            }
            onClick={() =>
              choose(tab.id)
            }
          >
            <span
              aria-hidden="true"
              className="baqarah-tab-icon"
            >
              {tab.icon}
            </span>

            <strong>
              {tab.label}
            </strong>
          </button>
        )
      )}
    </nav>
  )
}
