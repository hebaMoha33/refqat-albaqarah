import {
  useEffect,
  useRef,
  useState
} from 'react'

import {
  createPortal
} from 'react-dom'

import './FloatingReminder.css'


function clamp(
  value,
  min,
  max
) {
  return Math.min(
    Math.max(
      value,
      min
    ),
    max
  )
}


function getDefaultPositionStyle(
  positionName
) {
  const edge = 12

  const topValue =
    `calc(env(safe-area-inset-top, 0px) + ${edge}px)`

  const bottomValue =
    `calc(env(safe-area-inset-bottom, 0px) + ${edge}px)`


  switch (positionName) {
    case 'top-left':
      return {
        top: topValue,
        left: `${edge}px`,
        right: 'auto',
        bottom: 'auto'
      }

    case 'bottom-left':
      return {
        top: 'auto',
        left: `${edge}px`,
        right: 'auto',
        bottom: bottomValue
      }

    case 'bottom-right':
      return {
        top: 'auto',
        left: 'auto',
        right: `${edge}px`,
        bottom: bottomValue
      }

    case 'top-right':
    default:
      return {
        top: topValue,
        left: 'auto',
        right: `${edge}px`,
        bottom: 'auto'
      }
  }
}


function normalizeProgress(
  value
) {
  return Math.min(
    Math.max(
      Math.round(
        Number(value) || 0
      ),
      0
    ),
    100
  )
}


export default function FloatingReminder({
  items = [],

  theme = 'morning',

  visible = true,

  draggable = true,

  showCloseButton = true,

  opacity = 96,

  defaultPosition =
    'top-right',

  positionStorageKey =
    'refqat-floating-adhkar-reminder-position',

  onClose
}) {
  const reminderRef =
    useRef(null)


  const dragRef =
    useRef({
      dragging: false,

      moved: false,

      startX: 0,
      startY: 0,

      startLeft: 0,
      startTop: 0
    })


  const [
    position,
    setPosition
  ] =
    useState(() => {
      try {
        const saved =
          JSON.parse(
            localStorage.getItem(
              positionStorageKey
            )
          )


        if (
          Number.isFinite(
            saved?.x
          ) &&
          Number.isFinite(
            saved?.y
          )
        ) {
          return {
            x: saved.x,
            y: saved.y
          }
        }
      } catch {
        /* ignore */
      }


      return null
    })


  const activeTheme =
    theme === 'evening'
      ? 'evening'
      : 'morning'


  /* =====================================
     SAVE POSITION
  ===================================== */

  useEffect(() => {
    if (!position) {
      return
    }


    try {
      localStorage.setItem(
        positionStorageKey,

        JSON.stringify(
          position
        )
      )
    } catch {
      /* ignore */
    }
  }, [
    position,
    positionStorageKey
  ])


  /* =====================================
     KEEP INSIDE SCREEN
  ===================================== */

  useEffect(() => {
    function keepInsideScreen() {
      const element =
        reminderRef.current


      if (
        !element
      ) {
        return
      }


      setPosition(
        previous => {
          if (!previous) {
            return previous
          }


          const maxX =
            Math.max(
              8,

              window.innerWidth -
                element.offsetWidth -
                8
            )


          const maxY =
            Math.max(
              8,

              window.innerHeight -
                element.offsetHeight -
                8
            )


          return {
            x:
              clamp(
                previous.x,
                8,
                maxX
              ),

            y:
              clamp(
                previous.y,
                8,
                maxY
              )
          }
        }
      )
    }


    window.addEventListener(
      'resize',
      keepInsideScreen
    )


    window.addEventListener(
      'orientationchange',
      keepInsideScreen
    )


    return () => {
      window.removeEventListener(
        'resize',
        keepInsideScreen
      )


      window.removeEventListener(
        'orientationchange',
        keepInsideScreen
      )
    }
  }, [])


  /* =====================================
     DRAG START
  ===================================== */

  function handlePointerDown(
    event
  ) {
    if (
      event.target.closest(
        '.floating-reminder-close'
      ) ||
      event.target.closest(
        '.floating-reminder-row'
      )
    ) {
      return
    }


    if (!draggable) {
      return
    }


    const element =
      reminderRef.current


    if (!element) {
      return
    }


    const rect =
      element
        .getBoundingClientRect()


    dragRef.current = {
      dragging: true,

      moved: false,

      startX:
        event.clientX,

      startY:
        event.clientY,

      startLeft:
        rect.left,

      startTop:
        rect.top
    }


    element
      .setPointerCapture?.(
        event.pointerId
      )
  }


  /* =====================================
     DRAG MOVE
  ===================================== */

  function handlePointerMove(
    event
  ) {
    if (
      !draggable ||
      !dragRef.current
        .dragging
    ) {
      return
    }


    const element =
      reminderRef.current


    if (!element) {
      return
    }


    const deltaX =
      event.clientX -
      dragRef.current.startX


    const deltaY =
      event.clientY -
      dragRef.current.startY


    if (
      Math.abs(deltaX) >
        3 ||
      Math.abs(deltaY) >
        3
    ) {
      dragRef.current.moved =
        true
    }


    const maxX =
      Math.max(
        8,

        window.innerWidth -
          element.offsetWidth -
          8
      )


    const maxY =
      Math.max(
        8,

        window.innerHeight -
          element.offsetHeight -
          8
      )


    setPosition({
      x:
        clamp(
          dragRef.current
            .startLeft +
            deltaX,

          8,
          maxX
        ),

      y:
        clamp(
          dragRef.current
            .startTop +
            deltaY,

          8,
          maxY
        )
    })
  }


  /* =====================================
     DRAG END
  ===================================== */

  function handlePointerUp(
    event
  ) {
    dragRef.current.dragging =
      false


    reminderRef.current
      ?.releasePointerCapture?.(
        event.pointerId
      )
  }


  /* =====================================
     POSITION
  ===================================== */

  const positionStyle =
    position
      ? {
          top:
            `${position.y}px`,

          left:
            `${position.x}px`,

          right:
            'auto',

          bottom:
            'auto'
        }

      : getDefaultPositionStyle(
          defaultPosition
        )


  if (
    !visible ||
    !Array.isArray(items) ||
    items.length === 0 ||
    typeof document ===
      'undefined'
  ) {
    return null
  }


  const reminder = (
    <div
      ref={
        reminderRef
      }

      className={`
        floating-reminder
        floating-reminder-theme-${activeTheme}
        ${
          items.length > 1
            ? 'floating-reminder-multiple'
            : 'floating-reminder-single'
        }
      `}

      style={{
        ...positionStyle,

        '--reminder-opacity':
          opacity / 100
      }}

      onPointerDown={
        handlePointerDown
      }

      onPointerMove={
        handlePointerMove
      }

      onPointerUp={
        handlePointerUp
      }
    >

      {/* =================================
          TOP BAR
      ================================= */}

      <div
        className="floating-reminder-top"
      >

        <div
          className="floating-reminder-drag"
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
        </div>


        {showCloseButton && (
          <button
            type="button"

            className="floating-reminder-close"

            aria-label="إخفاء التذكير"

            onPointerDown={
              event =>
                event
                  .stopPropagation()
            }

            onClick={
              event => {
                event
                  .stopPropagation()

                onClose?.()
              }
            }
          >
            ×
          </button>
        )}

      </div>


      {/* =================================
          ITEMS
      ================================= */}

      <div
        className="floating-reminder-list"
      >

        {items.map(
          (
            item,
            index
          ) => {
            const progress =
              normalizeProgress(
                item.progress
              )


            const started =
              Boolean(
                item.started
              ) ||
              progress > 0


            return (
              <button
                key={
                  item.id
                }

                type="button"

                className="
                  floating-reminder-row
                "

                onClick={
                  item.onOpen
                }
              >

                <span
                  className="
                    floating-reminder-dot
                  "
                />


                <span
                  className="
                    floating-reminder-row-main
                  "
                >

                  <span
                    className="
                      floating-reminder-text
                    "
                  >
                    {started
                      ? item.title
                      : item.waitingText}
                  </span>


                  {started && (
                    <span
                      className="
                        floating-reminder-progress-track
                      "
                    >
                      <span
                        className="
                          floating-reminder-progress-fill
                        "

                        style={{
                          width:
                            `${progress}%`
                        }}
                      />
                    </span>
                  )}

                </span>


                {started && (
                  <span
                    className="
                      floating-reminder-progress
                    "
                  >
                    {progress}%
                  </span>
                )}


                {index <
                  items.length -
                    1 && (
                  <span
                    className="
                      floating-reminder-row-divider
                    "
                  />
                )}

              </button>
            )
          }
        )}

      </div>

    </div>
  )


  return createPortal(
    reminder,
    document.body
  )
}