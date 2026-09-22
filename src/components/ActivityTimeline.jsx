import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getActivityRole,
  getActivitySummary,
  getActivityTitle,
  getGroupSummary,
  getGroupTitle,
  yearFromDate,
} from '../lib/activityFormat'
import { formatMonthYearRange } from '../lib/workFormat'
import { useLanguage } from '../i18n/LanguageContext'

const DESKTOP_SLOTS = [
  { left: 3, top: 34, width: 29 },
  { left: 37, top: 126, width: 28 },
  { left: 70, top: 44, width: 27 },
  { left: 13, top: 344, width: 30 },
  { left: 47, top: 414, width: 29 },
  { left: 72, top: 326, width: 25 },
]

const SLOT_BLOCK_HEIGHT = 645
const NOTE_TONES = ['paper', 'blue', 'cream', 'mist']
const FASTENERS = ['pin', 'tape', 'clip']

const RELATION_COPY = {
  id: {
    label: 'Arti garis hubungan',
    group: 'Organisasi / grup → kegiatan',
    parent: 'Aktivitas induk → aktivitas terkait',
  },
  en: {
    label: 'Relationship guide',
    group: 'Organization / group → activity',
    parent: 'Parent activity → related activity',
  },
  ja: {
    label: 'つながりの見方',
    group: '組織・グループ → 活動',
    parent: '親活動 → 関連活動',
  },
}

function stableHash(value) {
  const source = String(value ?? '')
  let hash = 2166136261

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return Math.abs(hash >>> 0)
}

function notePlacement(key, index, year) {
  const yearShift = stableHash(year) % DESKTOP_SLOTS.length
  const slotIndex = (index + yearShift) % DESKTOP_SLOTS.length
  const block = Math.floor(index / DESKTOP_SLOTS.length)
  const slot = DESKTOP_SLOTS[slotIndex]
  const hash = stableHash(`${year}-${key}`)

  const leftNudge = ((hash % 5) - 2) * 0.55
  const topNudge = (((hash >> 3) % 5) - 2) * 5

  const direction = (index + yearShift) % 2 === 0 ? -1 : 1
  const magnitude = 1.05 + (((hash >> 5) % 8) / 7) * 1.85
  const calmNote = (index + yearShift) % 5 === 4
  const tilt = direction * magnitude * (calmNote ? 0.42 : 1)

  const widthNudge = (((hash >> 8) % 3) - 1) * 1.2

  return {
    left: slot.left + leftNudge,
    top: slot.top + (block * SLOT_BLOCK_HEIGHT) + topNudge,
    width: slot.width + widthNudge,
    tilt,
    hoverTilt: tilt * 0.14,
    z: 2 + (hash % 4),
    mobileAlign: index % 2 === 0 ? 'flex-start' : 'flex-end',
    mobileWidth: 82 + (hash % 7),
  }
}

function noteTone(key, isGroup, highlighted) {
  if (isGroup) return 'blue'
  if (highlighted) return 'paper'
  return NOTE_TONES[stableHash(key) % NOTE_TONES.length]
}

function fastenerFor(key, isGroup) {
  if (isGroup) return 'tape'
  return FASTENERS[stableHash(`fastener-${key}`) % FASTENERS.length]
}

function buildConnectorPath(sourceRect, targetRect, boardRect) {
  const sourceCenterY = sourceRect.top + sourceRect.height / 2
  const targetCenterY = targetRect.top + targetRect.height / 2
  const targetIsBelow = targetCenterY > sourceCenterY

  const sx = sourceRect.left + sourceRect.width / 2 - boardRect.left
  const tx = targetRect.left + targetRect.width / 2 - boardRect.left
  const sy = targetIsBelow ? sourceRect.bottom - boardRect.top : sourceRect.top - boardRect.top
  const ty = targetIsBelow ? targetRect.top - boardRect.top : targetRect.bottom - boardRect.top

  const distance = Math.abs(ty - sy)
  const horizontalDistance = Math.abs(tx - sx)
  const bend = Math.max(54, Math.min(220, distance * 0.36 + horizontalDistance * 0.08))
  const direction = ty >= sy ? 1 : -1

  return `M ${sx} ${sy} C ${sx + (tx - sx) * 0.12} ${sy + bend * direction}, ${tx - (tx - sx) * 0.14} ${ty - bend * direction}, ${tx} ${ty}`
}

function yearCanvasHeight(placements) {
  if (!placements.length) return 300
  const lowestTop = Math.max(...placements.map((item) => item.top))
  return Math.max(390, lowestTop + 310)
}

export default function ActivityTimeline({ groups, activities, onSelect, returnTo }) {
  const { language, t, path } = useLanguage()
  const boardRef = useRef(null)
  const nodeRefs = useRef(new Map())
  const [lines, setLines] = useState([])
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 })
  const [activeNodeKey, setActiveNodeKey] = useState(null)

  const relationCopy = RELATION_COPY[language] ?? RELATION_COPY.id

  const years = useMemo(() => {
    const all = new Set()
    groups.forEach((group) => {
      const year = yearFromDate(group.start_date)
      if (year) all.add(year)
    })
    activities.forEach((activity) => {
      const year = yearFromDate(activity.start_date)
      if (year) all.add(year)
    })
    return [...all].sort((a, b) => b - a)
  }, [groups, activities])

  const groupMap = useMemo(
    () => new Map(groups.map((group) => [group.id, group])),
    [groups],
  )

  const activityMap = useMemo(
    () => new Map(activities.map((activity) => [activity.id, activity])),
    [activities],
  )

  const yearLayouts = useMemo(() => {
    return new Map(years.map((year) => {
      const nodes = [
        ...groups
          .filter((group) => yearFromDate(group.start_date) === year)
          .map((group) => ({
            key: `group-${group.id}`,
            kind: 'group',
            date: group.start_date || '',
            data: group,
          })),
        ...activities
          .filter((activity) => yearFromDate(activity.start_date) === year)
          .map((activity) => ({
            key: `activity-${activity.id}`,
            kind: 'activity',
            date: activity.start_date || '',
            data: activity,
          })),
      ].sort((a, b) => b.date.localeCompare(a.date))

      const placed = nodes.map((node, index) => ({
        ...node,
        placement: notePlacement(node.key, index, year),
      }))

      return [
        year,
        {
          nodes: placed,
          height: yearCanvasHeight(placed.map((node) => node.placement)),
        },
      ]
    }))
  }, [years, groups, activities])

  useEffect(() => {
    if (!boardRef.current) return undefined

    let frameId = 0

    const calculate = () => {
      const board = boardRef.current
      if (!board) return

      const boardRect = board.getBoundingClientRect()
      const next = []

      activities.forEach((activity) => {
        const child = nodeRefs.current.get(`activity-${activity.id}`)
        const groupNode = nodeRefs.current.get(`group-${activity.group_id}`)

        if (child && groupNode && !activity.parent_activity_id) {
          next.push({
            key: `g-${activity.group_id}-a-${activity.id}`,
            sourceKey: `group-${activity.group_id}`,
            targetKey: `activity-${activity.id}`,
            d: buildConnectorPath(groupNode.getBoundingClientRect(), child.getBoundingClientRect(), boardRect),
            type: 'group',
          })
        }

        if (activity.parent_activity_id) {
          const parent = nodeRefs.current.get(`activity-${activity.parent_activity_id}`)
          if (child && parent) {
            next.push({
              key: `p-${activity.parent_activity_id}-a-${activity.id}`,
              sourceKey: `activity-${activity.parent_activity_id}`,
              targetKey: `activity-${activity.id}`,
              d: buildConnectorPath(parent.getBoundingClientRect(), child.getBoundingClientRect(), boardRect),
              type: 'parent',
            })
          }
        }
      })

      setLines(next)
      setBoardSize({
        width: Math.max(board.clientWidth, board.scrollWidth),
        height: Math.max(board.clientHeight, board.scrollHeight),
      })
    }

    const scheduleCalculate = () => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(calculate)
    }

    const observer = new ResizeObserver(scheduleCalculate)
    observer.observe(boardRef.current)
    nodeRefs.current.forEach((node) => observer.observe(node))

    const timer = window.setTimeout(scheduleCalculate, 120)
    window.addEventListener('resize', scheduleCalculate)

    if (document.fonts?.ready) {
      document.fonts.ready.then(scheduleCalculate).catch(() => {})
    }

    return () => {
      observer.disconnect()
      window.clearTimeout(timer)
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', scheduleCalculate)
    }
  }, [activities, groups, language, yearLayouts])

  const setNodeRef = (key) => (node) => {
    if (node) nodeRefs.current.set(key, node)
    else nodeRefs.current.delete(key)
  }

  const relatedNodeKeys = useMemo(() => {
    if (!activeNodeKey) return new Set()

    const related = new Set([activeNodeKey])

    lines.forEach((line) => {
      if (line.sourceKey === activeNodeKey) related.add(line.targetKey)
      if (line.targetKey === activeNodeKey) related.add(line.sourceKey)
    })

    return related
  }, [activeNodeKey, lines])

  if (years.length === 0) {
    return <div className="activity-empty">{t('activity.empty')}</div>
  }

  return (
    <div
      className={`activity-board scrapbook-board ${activeNodeKey ? 'has-active-relation' : ''}`}
      ref={boardRef}
      onMouseLeave={() => setActiveNodeKey(null)}
    >
      <div className="activity-relation-legend" aria-label={relationCopy.label}>
        <span>
          <i className="relation-sample relation-sample-group" aria-hidden="true" />
          {relationCopy.group}
        </span>
        <span>
          <i className="relation-sample relation-sample-parent" aria-hidden="true" />
          {relationCopy.parent}
        </span>
      </div>

      <svg
        className="activity-connectors"
        width={boardSize.width}
        height={boardSize.height}
        viewBox={`0 0 ${boardSize.width || 1} ${boardSize.height || 1}`}
        aria-hidden="true"
      >
        <defs>
          <marker
            id="activity-arrow-group"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3976e8" />
          </marker>

          <marker
            id="activity-arrow-parent"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#7b8491" />
          </marker>
        </defs>

        {lines.map((line) => {
          const related = activeNodeKey
            ? line.sourceKey === activeNodeKey || line.targetKey === activeNodeKey
            : false

          return (
            <path
              key={line.key}
              d={line.d}
              markerEnd={`url(#${line.type === 'parent' ? 'activity-arrow-parent' : 'activity-arrow-group'})`}
              className={[
                'connector-line',
                line.type === 'parent' ? 'parent-line' : 'group-line',
                activeNodeKey && related ? 'relation-active' : '',
                activeNodeKey && !related ? 'relation-muted' : '',
              ].filter(Boolean).join(' ')}
            />
          )
        })}
      </svg>

      {years.map((year) => {
        const layout = yearLayouts.get(year) ?? { nodes: [], height: 390 }

        return (
          <section className="activity-year" key={year}>
            <div className="year-divider"><span>{year}</span></div>

            <div
              className="activity-year-canvas"
              style={{ '--year-canvas-height': `${layout.height}px` }}
            >
              {layout.nodes.map((node) => {
                const item = node.data
                const placement = node.placement
                const isGroup = node.kind === 'group'
                const highlighted = !isGroup && Boolean(item.is_highlighted)
                const tone = noteTone(node.key, isGroup, highlighted)
                const fastener = fastenerFor(node.key, isGroup)

                const noteStyle = {
                  '--note-left': `${placement.left}%`,
                  '--note-top': `${placement.top}px`,
                  '--note-width': `${placement.width}%`,
                  '--note-tilt': `${placement.tilt}deg`,
                  '--note-hover-tilt': `${placement.hoverTilt}deg`,
                  '--note-z': placement.z,
                  '--mobile-align': placement.mobileAlign,
                  '--mobile-width': `${placement.mobileWidth}%`,
                }

                if (isGroup) {
                  return (
                    <article
                      key={node.key}
                      ref={setNodeRef(node.key)}
                      className={[
                        `pin-card group-card note-${tone} fastener-${fastener}`,
                        activeNodeKey === node.key ? 'relation-active-node' : '',
                        activeNodeKey && relatedNodeKeys.has(node.key) && activeNodeKey !== node.key ? 'relation-connected-node' : '',
                        activeNodeKey && !relatedNodeKeys.has(node.key) ? 'relation-muted-node' : '',
                      ].filter(Boolean).join(' ')}
                      style={noteStyle}
                      tabIndex={0}
                      onMouseEnter={() => setActiveNodeKey(node.key)}
                      onFocus={() => setActiveNodeKey(node.key)}
                      onBlur={() => setActiveNodeKey(null)}
                    >
                      <span className="note-fastener" aria-hidden="true" />
                      <small>{item.type || 'MAIN GROUP'}</small>
                      <h3>{getGroupTitle(item, language)}</h3>
                      <p>{getGroupSummary(item, language)}</p>
                      <div className="pin-card-date">
                        {formatMonthYearRange(item.start_date, item.end_date, language)}
                      </div>
                    </article>
                  )
                }

                const group = groupMap.get(item.group_id)
                const parent = activityMap.get(item.parent_activity_id)
                const role = getActivityRole(item, language)

                const activityPayload = { ...item, group, parent }
                const className = [
                  `pin-card activity-card note-${tone} fastener-${fastener}`,
                  highlighted ? 'highlighted' : '',
                  activeNodeKey === node.key ? 'relation-active-node' : '',
                  activeNodeKey && relatedNodeKeys.has(node.key) && activeNodeKey !== node.key ? 'relation-connected-node' : '',
                  activeNodeKey && !relatedNodeKeys.has(node.key) ? 'relation-muted-node' : '',
                ].filter(Boolean).join(' ')

                const content = (
                  <>
                    <span className="note-fastener" aria-hidden="true" />
                    <div className="activity-card-badges">
                      <small>{group ? getGroupTitle(group, language) : t('activity.fallback')}</small>
                      {item.activity_type && <em>{item.activity_type}</em>}
                    </div>
                    <h3>{getActivityTitle(item, language)}</h3>
                    {role && <strong>{role}</strong>}
                    <p>{getActivitySummary(item, language)}</p>
                    <div className="pin-card-date">
                      {formatMonthYearRange(item.start_date, item.end_date, language)}
                    </div>
                  </>
                )

                if (item.slug) {
                  return (
                    <Link
                      key={node.key}
                      ref={setNodeRef(node.key)}
                      className={className}
                      style={noteStyle}
                      to={path(`/about/activity/${item.slug}/`)}
                      state={{
                        activity: activityPayload,
                        returnTo,
                        modalRoute: true,
                      }}
                      onMouseEnter={() => setActiveNodeKey(node.key)}
                      onFocus={() => setActiveNodeKey(node.key)}
                      onBlur={() => setActiveNodeKey(null)}
                    >
                      {content}
                    </Link>
                  )
                }

                return (
                  <button
                    type="button"
                    key={node.key}
                    ref={setNodeRef(node.key)}
                    className={className}
                    style={noteStyle}
                    onMouseEnter={() => setActiveNodeKey(node.key)}
                    onFocus={() => setActiveNodeKey(node.key)}
                    onBlur={() => setActiveNodeKey(null)}
                    onClick={() => onSelect?.(activityPayload)}
                  >
                    {content}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
