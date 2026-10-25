import {
  useEffect,
  useRef,
  useState
} from 'react'

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
  positionName,
  stackOffset = 0
) {
  const edge = 12

  switch (
    positionName
  ) {
    case 'top-left':
      return {
        top:
          `${edge + stackOffset}px`,

        left:
          `${edge}px`,

        right:
          'auto',

        bottom:
          'auto'
      }


    case 'bottom-right':
      return {
        top:
          'auto',

        left:
          'auto',

        right:
          `${edge}px`,

        bottom:
          `${edge + stackOffset}px`
      }


    case 'bottom-left':
      return {
        top:
          'auto',

        left:
          `${edge}px`,

        right:
          'auto',

        bottom:
          `${edge + stackOffset}px`
      }


    case 'top-right':
    default:
      return {
        top:
          `${edge + stackOffset}px`,

        left:
          'auto',

        right:
          `${edge}px`,

        bottom:
          'auto'
      }
  }
}


export default function FloatingReminder({
  type = 'morning',

  text =
    'أذكار الصباح بانتظارك',

  progress = null,

  visible = true,

  draggable = true,

  showCloseButton = true,

  height = 34,

  opacity = 96,

  defaultPosition =
    'top-right',

  stackOffset = 0,

  positionStorageKey =
    'refqat-floating-reminder-position',

  onOpen,

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
            x:
              saved.x,

            y:
              saved.y
          }
        }
      } catch {
        // ignore
      }


      return null
    })


  useEffect(() => {
    if (!position) {
      return
    }


    localStorage.setItem(
      positionStorageKey,

      JSON.stringify(
        position
      )
    )
  }, [
    position,
    positionStorageKey
  ])


  if (!visible) {
    return null
  }


  function handlePointerDown(
    event
  ) {
    if (
      event.target.closest(
        '.floating-reminder-close'
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


  function handlePointerUp(
    event
  ) {
    if (!draggable) {
      onOpen?.()
      return
    }


    const wasMoved =
      dragRef.current.moved


    dragRef.current.dragging =
      false


    reminderRef.current
      ?.releasePointerCapture?.(
        event.pointerId
      )


    if (!wasMoved) {
      onOpen?.()
    }
  }


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
          defaultPosition,
          stackOffset
        )


  const style = {
    ...positionStyle,

    '--reminder-height':
      `${height}px`,

    '--reminder-opacity':
      opacity / 100
  }


  return (
    <div
      ref={
        reminderRef
      }

      className={
        `floating-reminder floating-reminder-${type}`
      }

      style={
        style
      }

      onPointerDown={
        handlePointerDown
      }

      onPointerMove={
        handlePointerMove
      }

      onPointerUp={
        handlePointerUp
      }

      role="button"

      tabIndex={0}
    >
      <div className="floating-reminder-content">

        <span className="floating-reminder-dot" />


        <span className="floating-reminder-text">
          {text}
        </span>


        {progress !== null && (
          <span className="floating-reminder-progress">
            {progress}%
          </span>
        )}

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
  )
}